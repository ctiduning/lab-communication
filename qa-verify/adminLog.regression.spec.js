/**
 * QA 回归验证脚本（仅验证，不修改业务源码）
 * 目标：adminLogAPI.log 的「自适应降级写入」是否在真实 Supabase/PostgREST 报错文案下生效。
 * 运行：npx vitest run qa-verify/adminLog.regression.spec.js
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- 可控的 supabase mock ----
const state = {
  userId: 'admin-uuid-1',
  profileName: '张管理员',
  insertResults: [],   // 每次 insert 依次返回的结果
  insertPayloads: [],  // 记录每次 insert 的实际入参
};

vi.mock('../src/utils/supabase', () => {
  const makeInsert = (table) => (payload) => {
    if (table === 'admin_logs') {
      state.insertPayloads.push(payload);
      const r = state.insertResults.shift();
      return Promise.resolve(r || { error: null });
    }
    return Promise.resolve({ error: null });
  };
  const supabase = {
    auth: {
      onAuthStateChange: vi.fn(),
      getUser: () => Promise.resolve({ data: { user: state.userId ? { id: state.userId } : null } }),
    },
    from: (table) => ({
      insert: makeInsert(table),
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { name: state.profileName }, error: null }),
        }),
        order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
      }),
    }),
  };
  return { supabase };
});

// 真实世界报错文案样本
const ERR_LEGACY_PG = {
  code: '42703',
  message: 'column "target_user_id" of relation "admin_logs" does not exist',
};
const ERR_POSTGREST_OLD = {
  code: 'PGRST204',
  message: "Column 'target_user_id' of relation 'admin_logs' does not exist",
};
const ERR_POSTGREST_CURRENT = {
  code: 'PGRST204',
  message: "Could not find the 'target_user_id' column of 'admin_logs' in the schema cache",
};

async function loadApi() {
  vi.resetModules();               // 清掉 getCurrentUserId 的模块级缓存
  return (await import('../src/api/index.js')).adminLogAPI;
}

beforeEach(() => {
  state.userId = 'admin-uuid-1';
  state.insertResults = [];
  state.insertPayloads = [];
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('adminLogAPI.log 回归验证', () => {
  it('A. 正常表结构：一次写入成功，不触发降级', async () => {
    const adminLogAPI = await loadApi();
    state.insertResults = [{ error: null }];
    await adminLogAPI.log('create_user', null, '李四(CTI002)', '创建用户');

    expect(state.insertPayloads).toHaveLength(1);
    expect(state.insertPayloads[0]).toMatchObject({
      admin_id: 'admin-uuid-1',
      admin_name: '张管理员',
      action: 'create_user',
      target_user_name: '李四(CTI002)',
      detail: '创建用户',
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('B. 旧版 Postgres 文案(42703, 含 does not exist)：降级触发，日志落库', async () => {
    const adminLogAPI = await loadApi();
    state.insertResults = [{ error: ERR_LEGACY_PG }, { error: null }];
    await adminLogAPI.log('create_user', null, '李四(CTI002)', '创建用户');

    expect(state.insertPayloads).toHaveLength(2);           // 发生了降级重写
    const fallback = state.insertPayloads[1];
    expect(fallback).not.toHaveProperty('target_user_id');  // 只写核心列
    expect(fallback).not.toHaveProperty('target_user_name');
    expect(fallback.detail).toBe('创建用户；目标用户: 李四(CTI002)'); // 审计信息未丢
    expect(console.error).not.toHaveBeenCalled();
  });

  it('C. PostgREST v12.0 旧文案(PGRST204, 含 does not exist)：降级触发', async () => {
    const adminLogAPI = await loadApi();
    state.insertResults = [{ error: ERR_POSTGREST_OLD }, { error: null }];
    await adminLogAPI.log('import_users', null, '批量导入 5 人', '成功 5 个');

    expect(state.insertPayloads).toHaveLength(2);
    expect(state.insertPayloads[1].detail).toBe('成功 5 个；目标用户: 批量导入 5 人');
  });

  it('D. 【关键】PostgREST 现行文案(PGRST204, schema cache)：降级是否触发？', async () => {
    const adminLogAPI = await loadApi();
    state.insertResults = [{ error: ERR_POSTGREST_CURRENT }, { error: null }];
    await adminLogAPI.log('create_user', null, '李四(CTI002)', '创建用户');

    // 期望：应当降级并落库（验收标准要求「日志必能落库」）
    expect(state.insertPayloads).toHaveLength(2);
  });

  it('E. detail 为空时，mergedDetail 不应出现前导分隔符', async () => {
    const adminLogAPI = await loadApi();
    state.insertResults = [{ error: ERR_LEGACY_PG }, { error: null }];
    await adminLogAPI.log('export_communications', null, '张三', '');

    expect(state.insertPayloads[1].detail).toBe('目标用户: 张三');
  });

  it('F. 未取到管理员ID：不写库、有 console.warn 痕迹、不抛异常', async () => {
    state.userId = null;
    const adminLogAPI = await loadApi();
    await expect(adminLogAPI.log('create_user', null, '李四', '创建用户')).resolves.toBeUndefined();

    expect(state.insertPayloads).toHaveLength(0);
    expect(console.warn).toHaveBeenCalled();
  });

  it('G. 非列缺失错误(如 RLS 42501)：不降级，仅 console.error，不向调用方抛异常', async () => {
    const adminLogAPI = await loadApi();
    state.insertResults = [{ error: { code: '42501', message: 'new row violates row-level security policy' } }];
    await expect(adminLogAPI.log('create_user', null, '李四', '创建用户')).resolves.toBeUndefined();

    expect(state.insertPayloads).toHaveLength(1);
    expect(console.error).toHaveBeenCalled();
  });
});
