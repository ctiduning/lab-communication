/**
 * QA 独立验证 V3：describeAdminLogError 真实报文分类回归
 * 严过关(QA) 编写。只验证，不修改业务源码。
 * 运行：npx vitest run qa-verify/adminLogError.v3.spec.js
 *
 * 【报文来源】以下标记 [REAL] 的用例，报文取自 2026-08-05 对线上
 * https://qgoqhjwekairknkuqisi.supabase.co/rest/v1 的真实 curl 抓包，非臆造。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- supabase mock（避免真实网络与 import.meta.env 依赖）----
const state = {
  userId: 'admin-uuid-1',
  authThrows: false,
  insertResults: [],
  insertPayloads: [],
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

const elMessageError = vi.fn();
vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, ElMessage: { ...actual.ElMessage, error: elMessageError } };
});

const { describeAdminLogError, adminLogAPI } = await import('../src/api/index.js');

// ============ 真实抓包报文 ============
const REAL_GET_42501 = {
  code: '42501',
  details: null,
  hint: 'Grant the required privileges to the current role with: GRANT SELECT ON public.admin_logs TO anon;',
  message: 'permission denied for table admin_logs',
};
const REAL_POST_REPR_42501 = {
  code: '42501',
  details: null,
  hint: 'Grant the required privileges to the current role with: GRANT SELECT, INSERT ON public.admin_logs TO anon;',
  message: 'permission denied for table admin_logs',
};
const REAL_PGRST205 = {
  code: 'PGRST205',
  details: null,
  hint: null,
  message: "Could not find the table 'public.zzz_qa_not_exist' in the schema cache",
};
const REAL_PGRST205_ADMINLOGS = {
  code: 'PGRST205',
  details: null,
  hint: null,
  message: "Could not find the table 'public.admin_logs' in the schema cache",
};

describe('V3-A 表级/序列级权限缺失（本次根因形态）', () => {
  it('[REAL] GET 42501 permission denied for table → 判为表级权限缺失，且必须透出 hint', () => {
    const out = describeAdminLogError(REAL_GET_42501);
    expect(out).toContain('表级权限缺失');
    expect(out).toContain('不是 RLS 问题');
    // hint 必须原样出现，这是本次修复的核心价值
    expect(out).toContain('GRANT SELECT ON public.admin_logs TO anon;');
    // 绝不能被误判成 RLS
    expect(out).not.toContain('RLS 策略拒绝');
  });

  it('[REAL] POST+representation 42501 → hint 含 SELECT, INSERT 合并语句', () => {
    const out = describeAdminLogError(REAL_POST_REPR_42501);
    expect(out).toContain('表级权限缺失');
    expect(out).toContain('GRANT SELECT, INSERT ON public.admin_logs TO anon;');
  });

  it('序列权限缺失 → 判为「序列级」而非「表级」', () => {
    const out = describeAdminLogError({
      code: '42501',
      message: 'permission denied for sequence admin_logs_id_seq',
    });
    expect(out).toContain('序列级权限缺失');
    expect(out).not.toContain('表级权限缺失');
  });

  it('无 hint 的 42501 表权限报文 → 不应输出空的「修复提示：」尾巴', () => {
    const out = describeAdminLogError({ code: '42501', message: 'permission denied for table admin_logs' });
    expect(out).toContain('表级权限缺失');
    expect(out).not.toContain('Supabase 给出的修复提示：');
  });
});

describe('V3-B RLS 策略拒绝（收紧 INSERT 策略后最可能出现的新报文）', () => {
  it('new row violates row-level security policy → 判为 RLS，不得判成表级 GRANT', () => {
    const out = describeAdminLogError({
      code: '42501',
      message: 'new row violates row-level security policy for table "admin_logs"',
    });
    expect(out).toContain('RLS 策略拒绝');
    expect(out).toContain('admin_id');
    expect(out).not.toContain('表级权限缺失');
  });
});

describe('V3-C PGRST205 必须独立成支，不能被「列缺失」正则误吞', () => {
  it('[REAL] PGRST205 → 判为缓存找不到表', () => {
    const out = describeAdminLogError(REAL_PGRST205);
    expect(out).toContain('缓存里找不到 admin_logs 表');
    expect(out).not.toContain('列缺失');
  });

  it('[REAL] PGRST205(admin_logs) → 同样不得落入列缺失分支', () => {
    const out = describeAdminLogError(REAL_PGRST205_ADMINLOGS);
    expect(out).toContain('缓存里找不到 admin_logs 表');
    expect(out).not.toContain('列缺失');
  });

  it('正则层面自证：PGRST205 报文不匹配「列缺失」正则', () => {
    const columnRe = /could not find the .+ column|^column .+ does not exist/i;
    expect(columnRe.test(REAL_PGRST205_ADMINLOGS.message)).toBe(false);
  });

  it('去掉 code 只留报文时，仍靠正则判为「表不在缓存」', () => {
    const out = describeAdminLogError({ message: REAL_PGRST205_ADMINLOGS.message });
    expect(out).toContain('缓存里找不到 admin_logs 表');
  });
});

describe('V3-D 列缺失 / 表不存在', () => {
  it('PGRST204 列缺失 → 判为列缺失并透出原文', () => {
    const msg = "Could not find the 'admin_name' column of 'admin_logs' in the schema cache";
    const out = describeAdminLogError({ code: 'PGRST204', message: msg });
    expect(out).toContain('列缺失');
    expect(out).toContain(msg);
  });

  it('42703 column does not exist → 判为列缺失', () => {
    const out = describeAdminLogError({ code: '42703', message: 'column "target_type" does not exist' });
    expect(out).toContain('列缺失');
    expect(out).not.toContain('表不存在');
  });

  it('42P01 relation does not exist → 判为表不存在', () => {
    const out = describeAdminLogError({ code: '42P01', message: 'relation "public.admin_logs" does not exist' });
    expect(out).toContain('表不存在');
  });

  it('42703 的 relation 变体文案不得被「表不存在」抢走', () => {
    const out = describeAdminLogError({
      code: '42703',
      message: 'column "admin_name" of relation "admin_logs" does not exist',
    });
    expect(out).toContain('列缺失');
    expect(out).not.toContain('表不存在');
  });
});

describe('V3-E 未知错误码必须原样透出，不得被自编文案覆盖', () => {
  it('未知码 + 有 message → 原文出现在结果里', () => {
    const out = describeAdminLogError({ code: 'XX999', message: 'some brand new failure from postgrest' });
    expect(out).toContain('some brand new failure from postgrest');
    expect(out).not.toContain('数据库返回错误，Supabase 原文：数据库返回错误');
  });

  it('未知码 + hint → hint 也要透出', () => {
    const out = describeAdminLogError({ code: 'XX999', message: 'weird', hint: 'try this instead' });
    expect(out).toContain('weird');
    expect(out).toContain('try this instead');
  });

  it('42501 但报文既非 permission denied 也非 RLS → 原样透出，不猜原因', () => {
    const out = describeAdminLogError({ code: '42501', message: 'must be owner of table admin_logs' });
    expect(out).toContain('42501');
    expect(out).toContain('must be owner of table admin_logs');
  });

  it('空对象 / null 不崩溃', () => {
    expect(() => describeAdminLogError(null)).not.toThrow();
    expect(() => describeAdminLogError(undefined)).not.toThrow();
    expect(describeAdminLogError({})).toContain('未知错误');
  });

  it('登录态 / 网络 分支', () => {
    expect(describeAdminLogError({ code: 'PGRST301', message: 'JWT expired' })).toContain('登录态');
    expect(describeAdminLogError({ code: 'NO_AUTH_USER', message: 'x' })).toContain('未获取到当前登录用户');
    expect(describeAdminLogError({ message: 'Failed to fetch' })).toContain('网络异常');
  });
});

describe('V2 adminLogAPI.log 与 RLS 策略 admin_id = auth.uid() 的契合度', () => {
  beforeEach(() => {
    state.userId = 'admin-uuid-1';
    state.authThrows = false;
    state.insertResults = [];
    state.insertPayloads = [];
    elMessageError.mockClear();
  });

  it('正常写入时 admin_id 必须等于当前登录用户 id（否则会被新 RLS 策略拒绝）', async () => {
    await adminLogAPI.log('create_user', null, '张三(001)', '创建用户');
    expect(state.insertPayloads.length).toBe(1);
    expect(state.insertPayloads[0].admin_id).toBe('admin-uuid-1');
  });

  it('拿不到登录用户时：绝不发起 INSERT（避免 admin_id=null 触发 RLS 报错误导客户）', async () => {
    // 注意：index.js 内 cachedUserId 是模块级缓存，必须重置模块才能模拟「全新会话且未登录」
    vi.resetModules();
    state.userId = null;
    const fresh = await import('../src/api/index.js');
    await fresh.adminLogAPI.log('create_user', null, '张三(001)', '创建用户');
    expect(state.insertPayloads.length).toBe(0);
    expect(elMessageError).toHaveBeenCalled();
    const text = elMessageError.mock.calls[0][0].message;
    expect(text).toContain('未获取到当前登录用户');
  });

  // ---- 特征化测试：记录 cachedUserId 陈旧时的真实行为（QA 发现的隐患）----
  // 说明：底层缓存行为本身【未改】——修的是"报错文案会不会把人带偏"。
  //      彻底修 cachedUserId 需要改动 getCurrentUserId 的失效策略，
  //      影响全站 30+ 处调用，超出本次 BugFix 范围，已单列风险上报。
  it('[隐患特征化] 登录态已失效但 onAuthStateChange 未触发时，仍会带着旧 admin_id 发起 INSERT', async () => {
    // 先正常写一次，让 cachedUserId 被填充
    await adminLogAPI.log('warmup', null, '', '');
    state.insertPayloads = [];
    // 模拟：会话已失效（getUser 已拿不到用户），但缓存未被清除
    state.userId = null;
    await adminLogAPI.log('create_user', null, '张三(001)', '创建用户');
    // 现状（未改）：仍然发起了 INSERT，且 admin_id 用的是旧缓存值
    expect(state.insertPayloads.length).toBe(1);
    expect(state.insertPayloads[0].admin_id).toBe('admin-uuid-1');
  });

  // ---- 上面那个隐患的"止损"验证：文案必须同时给出登录过期这条线索 ----
  it('[隐患止损] 陈旧会话导致的 42501，文案要同时提示「表级权限」和「登录可能过期」', () => {
    // 线上后果：role 退化为 anon → 42501 permission denied for table。
    // 若文案只说"去补 GRANT"，客户补完发现还是不行，就会绕回原地——
    // 因此表级权限分支必须附带"确认登录是否已过期"这条线索。
    const out = describeAdminLogError(REAL_GET_42501);
    expect(out).toContain('表级权限缺失');
    expect(out).toContain('登录是否已过期');
    // 原始 hint 仍必须透出，不能被新增提示挤掉
    expect(out).toContain('GRANT SELECT ON public.admin_logs TO anon;');
  });

  it('降级写入（列缺失重试）时 admin_id 仍必须保持为当前用户', async () => {
    state.insertResults = [
      { error: { code: 'PGRST204', message: "Could not find the 'target_user_name' column of 'admin_logs' in the schema cache" } },
      { error: null },
    ];
    await adminLogAPI.log('create_user', 'target-1', '张三(001)', '创建用户');
    expect(state.insertPayloads.length).toBe(2);
    expect(state.insertPayloads[1].admin_id).toBe('admin-uuid-1');
  });

  it('42501 权限错误不触发降级重试（避免重复刷错误提示）', async () => {
    state.insertResults = [{ error: REAL_POST_REPR_42501 }];
    await adminLogAPI.log('create_user', null, '张三(001)', '创建用户');
    expect(state.insertPayloads.length).toBe(1);
    expect(elMessageError).toHaveBeenCalledTimes(1);
    const text = elMessageError.mock.calls[0][0].message;
    expect(text).toContain('GRANT SELECT, INSERT ON public.admin_logs TO anon;');
  });

  it('PGRST205 不触发降级重试', async () => {
    state.insertResults = [{ error: REAL_PGRST205_ADMINLOGS }];
    await adminLogAPI.log('create_user', null, '张三(001)', '创建用户');
    expect(state.insertPayloads.length).toBe(1);
  });
});
