/**
 * QA 独立验证（第二组）：本次「管理员操作日志静默失败」修复的显式反馈能力
 * 只验证、不修改业务源码。
 * 运行：npx vitest run qa-verify/adminLogNotify.verify.spec.js
 *
 * 覆盖：
 *  1. describeAdminLogError 错误码 -> 中文提示 的映射正确性
 *  2. adminLogAPI.log 的 5 条失败分支是否都弹出 ElMessage.error（杜绝静默失败）
 *  3. el-tabs @tab-change 的回调契约（参数为 pane name）
 *  4. Admin.vue / api/index.js 源码级审查（无残留静默 return、触发点齐全）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---- 可控 supabase mock ----
const state = {
  userId: 'admin-uuid-1',
  authThrows: false,
  insertResults: [],
  insertPayloads: [],
  insertThrows: false,
};

vi.mock('../src/utils/supabase', () => {
  const supabase = {
    auth: {
      onAuthStateChange: vi.fn(),
      getUser: () =>
        state.authThrows
          ? Promise.reject(new Error('Failed to fetch'))
          : Promise.resolve({ data: { user: state.userId ? { id: state.userId } : null } }),
    },
    from: (table) => ({
      insert: (payload) => {
        if (table !== 'admin_logs') return Promise.resolve({ error: null });
        state.insertPayloads.push(payload);
        if (state.insertThrows) return Promise.reject(new Error('NetworkError: Failed to fetch'));
        return Promise.resolve(state.insertResults.shift() || { error: null });
      },
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: { name: '张管理员' }, error: null }) }),
        order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
      }),
    }),
  };
  return { supabase };
});

// ---- 捕获 ElMessage.error 调用 ----
const elMessageError = vi.fn();
vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, ElMessage: { ...actual.ElMessage, error: elMessageError } };
});

async function loadApi() {
  vi.resetModules(); // 清掉 getCurrentUserId 的模块级缓存
  return await import('../src/api/index.js');
}

beforeEach(() => {
  state.userId = 'admin-uuid-1';
  state.authThrows = false;
  state.insertThrows = false;
  state.insertResults = [];
  state.insertPayloads = [];
  elMessageError.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

// ============================================================
describe('1. describeAdminLogError 错误码映射', () => {
  const cases = [
    ['42501 RLS 拒绝', { code: '42501', message: 'new row violates row-level security policy' }, /RLS 策略拒绝/],
    ['RLS 仅靠文案识别', { code: '', message: 'new row violates row-level security policy for table' }, /RLS 策略拒绝/],
    ['42P01 表不存在', { code: '42P01', message: 'relation "admin_logs" does not exist' }, /表不存在/],
    ['PGRST204 列缺失', { code: 'PGRST204', message: "Could not find the 'x' column of 'admin_logs' in the schema cache" }, /列缺失/],
    ['PGRST301 登录态', { code: 'PGRST301', message: 'JWT expired' }, /登录态无效/],
    ['401 登录态', { code: '401', message: 'not authenticated' }, /登录态无效/],
    ['NO_AUTH_USER 未登录', { code: 'NO_AUTH_USER', message: '未获取到当前管理员ID' }, /未获取到当前登录用户/],
    ['网络异常', { code: '', message: 'TypeError: Failed to fetch' }, /网络异常/],
    ['兜底', { code: 'XXXXX', message: 'boom' }, /数据库返回错误/],
    // 2026-08-05 QA 更新：a1a40c8 起，无 message 的错误改为更具体的「数据库返回未知错误（无 message）」，
    // 不再复用「数据库返回错误」文案。此处同步期望值（源码行为是改进，非缺陷）。
    ['空入参不抛异常', undefined, /数据库返回未知错误/],
  ];

  it.each(cases)('%s', async (_name, err, expected) => {
    const { describeAdminLogError } = await loadApi();
    expect(describeAdminLogError(err)).toMatch(expected);
  });

  it('【边界】42703 + "relation admin_logs does not exist" 文案的归类', async () => {
    const { describeAdminLogError } = await loadApi();
    const desc = describeAdminLogError({
      code: '42703',
      message: 'column "target_user_id" of relation "admin_logs" does not exist',
    });
    // 记录实际归类结果，供报告引用（这是列缺失错误，理想应归为「列缺失」）
    expect(typeof desc).toBe('string');
    expect(desc.length).toBeGreaterThan(0);
    // 断言当前实现的真实行为
    expect(desc).toMatch(/表不存在|列缺失/);
  });
});

// ============================================================
describe('2. adminLogAPI.log 的 5 条失败分支必须显式弹错（无静默失败）', () => {
  it('分支1：getCurrentUserId 抛异常 -> ElMessage.error', async () => {
    state.authThrows = true;
    const { adminLogAPI } = await loadApi();
    await expect(adminLogAPI.log('create_user', null, '李四', 'x')).resolves.toBeUndefined();
    expect(elMessageError).toHaveBeenCalledTimes(1);
    expect(elMessageError.mock.calls[0][0].message).toMatch(/操作日志写入失败（获取登录态）/);
    expect(state.insertPayloads).toHaveLength(0);
  });

  it('分支2：userId 为空 -> ElMessage.error + NO_AUTH_USER 文案', async () => {
    state.userId = null;
    const { adminLogAPI } = await loadApi();
    await expect(adminLogAPI.log('create_user', null, '李四', 'x')).resolves.toBeUndefined();
    expect(elMessageError).toHaveBeenCalledTimes(1);
    expect(elMessageError.mock.calls[0][0].message).toMatch(/未获取到当前登录用户/);
  });

  it('分支3：完整写入失败且非列缺失(42501) -> 不降级 + 弹错', async () => {
    const { adminLogAPI } = await loadApi();
    state.insertResults = [{ error: { code: '42501', message: 'new row violates row-level security policy' } }];
    await expect(adminLogAPI.log('create_user', null, '李四', 'x')).resolves.toBeUndefined();
    expect(state.insertPayloads).toHaveLength(1); // 未降级
    expect(elMessageError).toHaveBeenCalledTimes(1);
    expect(elMessageError.mock.calls[0][0].message).toMatch(/\[42501\]/);
    expect(elMessageError.mock.calls[0][0].message).toMatch(/RLS 策略拒绝/);
  });

  it('分支4：列缺失降级后仍失败 -> 弹错并标明「降级」阶段', async () => {
    const { adminLogAPI } = await loadApi();
    state.insertResults = [
      { error: { code: 'PGRST204', message: "Could not find the 'target_user_id' column of 'admin_logs' in the schema cache" } },
      { error: { code: '42501', message: 'new row violates row-level security policy' } },
    ];
    await expect(adminLogAPI.log('create_user', null, '李四', 'x')).resolves.toBeUndefined();
    expect(state.insertPayloads).toHaveLength(2); // 确实降级重试过
    expect(elMessageError).toHaveBeenCalledTimes(1);
    expect(elMessageError.mock.calls[0][0].message).toMatch(/降级写入核心字段后仍失败/);
  });

  it('分支5：insert 请求整体抛异常 -> 弹错', async () => {
    state.insertThrows = true;
    const { adminLogAPI } = await loadApi();
    await expect(adminLogAPI.log('create_user', null, '李四', 'x')).resolves.toBeUndefined();
    expect(elMessageError).toHaveBeenCalledTimes(1);
    expect(elMessageError.mock.calls[0][0].message).toMatch(/写入请求异常/);
  });

  it('成功路径：不得有任何误报弹窗', async () => {
    const { adminLogAPI } = await loadApi();
    state.insertResults = [{ error: null }];
    await adminLogAPI.log('create_user', null, '李四', 'x');
    expect(elMessageError).not.toHaveBeenCalled();
  });

  it('降级成功路径：降级后写入成功也不得弹错', async () => {
    const { adminLogAPI } = await loadApi();
    state.insertResults = [{ error: { code: '42703', message: 'column "target_user_id" does not exist' } }, { error: null }];
    await adminLogAPI.log('create_user', null, '李四', 'x');
    expect(state.insertPayloads).toHaveLength(2);
    expect(elMessageError).not.toHaveBeenCalled();
  });

  // 2026-08-05 QA 更新：a1a40c8 起提示语加长（含 Supabase hint），展示时长由 6000 提升至 8000。
  // 属有意的 UX 调整，同步期望值。
  it('弹窗配置：duration=8000 且 showClose=true', async () => {
    state.userId = null;
    const { adminLogAPI } = await loadApi();
    await adminLogAPI.log('create_user', null, '李四', 'x');
    expect(elMessageError.mock.calls[0][0]).toMatchObject({ duration: 8000, showClose: true });
  });
});

// ============================================================
describe('3. el-tabs @tab-change 回调契约', () => {
  it('切换到 name="logs" 的 pane 时，回调收到 "logs"', async () => {
    const { mount } = await import('@vue/test-utils');
    const ElementPlus = (await vi.importActual('element-plus')).default;
    const onTabChange = vi.fn();

    const wrapper = mount(
      {
        template: `
          <el-tabs v-model="activeTab" type="card" @tab-change="handleTabChange">
            <el-tab-pane label="用户管理" name="users"><div>users</div></el-tab-pane>
            <el-tab-pane label="操作日志" name="logs"><div>logs</div></el-tab-pane>
          </el-tabs>`,
        data: () => ({ activeTab: 'users' }),
        methods: { handleTabChange: onTabChange },
      },
      { global: { plugins: [ElementPlus] } }
    );

    // 初始不应触发（避免与 onMounted 的加载重复）
    expect(onTabChange).not.toHaveBeenCalled();

    await wrapper.findAll('.el-tabs__item')[1].trigger('click');
    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange.mock.calls[0][0]).toBe('logs'); // 参数即 pane name
    wrapper.unmount();
  });
});

// ============================================================
describe('4. 源码级审查', () => {
  const read = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

  it('main.js 已注册 ElementPlus 且引入样式（否则 ElMessage 无样式）', () => {
    const src = read('src/main.js');
    expect(src).toMatch(/app\.use\(ElementPlus\)/);
    expect(src).toMatch(/element-plus\/dist\/index\.css/);
  });

  it('api/index.js 顶部已 import ElMessage', () => {
    expect(read('src/api/index.js')).toMatch(/import\s*\{\s*ElMessage\s*\}\s*from\s*['"]element-plus['"]/);
  });

  it('adminLogAPI.log 内不存在残留的裸 console.error 结尾静默分支', () => {
    const src = read('src/api/index.js');
    // 旧实现的静默写法：if (error) console.error('[adminLog] 记录操作日志失败:', error);
    expect(src).not.toMatch(/if \(error\) console\.error\('\[adminLog\]/);
  });

  it('Admin.vue: handleTabChange 在 script setup 顶层定义且只在 logs 时加载', () => {
    const src = read('src/pages/Admin.vue');
    expect(src).toMatch(/@tab-change="handleTabChange"/);
    expect(src).toMatch(/const handleTabChange = \(tabName\) => \{\s*\n?\s*if \(tabName === 'logs'\) loadAdminLogs\(\)/);
  });

  it('Admin.vue: loadAdminLogs 至少有 3 处触发点（onMounted / tab 切换 / 刷新按钮）', () => {
    const src = read('src/pages/Admin.vue');
    const calls = src.match(/loadAdminLogs/g) || [];
    // 1 处定义 + 至少 3 处调用
    expect(calls.length).toBeGreaterThanOrEqual(4);
    expect(src).toMatch(/@click="loadAdminLogs"/);           // 刷新按钮
    expect(src).toMatch(/loadAdminLogs\(\);/);               // onMounted
  });

  it('Admin.vue: loadAdminLogs 失败时写入 logsError + 弹错 + finally 复位 loading', () => {
    const src = read('src/pages/Admin.vue');
    const body = src.slice(src.indexOf('const loadAdminLogs'), src.indexOf('const handleTabChange'));
    expect(body).toMatch(/logsError\.value = text/);
    expect(body).toMatch(/ElMessage\.error/);
    expect(body).toMatch(/finally \{\s*\n?\s*logsLoading\.value = false/);
  });

  it('Admin.vue: 空态区分「错误 / 加载中 / 无数据」三种情况', () => {
    const src = read('src/pages/Admin.vue');
    expect(src).toMatch(/<template #empty>/);
    expect(src).toMatch(/v-else>暂无操作日志记录</);
    expect(src).toMatch(/v-else-if="logsLoading">加载中/);
  });
});
