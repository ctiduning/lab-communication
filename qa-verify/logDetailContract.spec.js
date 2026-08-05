/**
 * 操作日志 detail 结构化契约（v1）边界测试
 * 覆盖：buildLogDetail 归一化、parseLogDetail 识别规则、buildMergedDetail 降级路径不污染 JSON
 * 运行：npx vitest run qa-verify/logDetailContract.spec.js
 */
import { describe, it, expect, vi } from 'vitest';

// api/index.js 顶层会 import supabase 客户端并注册 onAuthStateChange，
// 这里给一个最小可用的 mock，避免测试环境缺少 env 变量而报错。
vi.mock('../src/utils/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: [], error: null }),
    single: () => Promise.resolve({ data: null, error: null }),
    insert: () => Promise.resolve({ error: null }),
    update: () => chain,
  };
  return {
    supabase: {
      auth: {
        onAuthStateChange: vi.fn(),
        getUser: () => Promise.resolve({ data: { user: null } }),
      },
      from: () => chain,
      rpc: () => Promise.resolve({ data: null, error: null }),
      storage: { from: () => ({ list: () => Promise.resolve({ data: [], error: null }) }) },
    },
  };
});

vi.mock('element-plus', () => ({
  ElMessage: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), warning: vi.fn() }),
  ElMessageBox: { confirm: vi.fn() },
}));

const { buildLogDetail, parseLogDetail, buildMergedDetail } = await import('../src/api/index.js');

describe('buildLogDetail', () => {
  it('产出 v1 契约 JSON，字段齐全', () => {
    const s = buildLogDetail({
      summary: '批量导入 3 人',
      success: ['张三(1001)'],
      updated: ['李四(1002)'],
      failed: [{ name: '王五(1003)', reason: '邮箱已被注册' }],
    });
    expect(JSON.parse(s)).toEqual({
      v: 1,
      summary: '批量导入 3 人',
      success: ['张三(1001)'],
      updated: ['李四(1002)'],
      failed: [{ name: '王五(1003)', reason: '邮箱已被注册' }],
    });
  });

  it('无参调用不抛错，三组名单为空数组', () => {
    expect(JSON.parse(buildLogDetail())).toEqual({
      v: 1, summary: '', success: [], updated: [], failed: [],
    });
  });

  it('failed 项缺 reason 时兜底为「未知错误」，不出现 undefined', () => {
    const parsed = JSON.parse(buildLogDetail({ failed: [{ name: '赵六(1004)' }] }));
    expect(parsed.failed[0]).toEqual({ name: '赵六(1004)', reason: '未知错误' });
    expect(buildLogDetail({ failed: [{ name: 'x' }] })).not.toContain('undefined');
  });

  it('名单传入非数组 / 含 null 时被安全归一化', () => {
    const parsed = JSON.parse(buildLogDetail({
      success: null,
      updated: ['李四(1002)', null, undefined],
      failed: 'not-an-array',
    }));
    expect(parsed.success).toEqual([]);
    expect(parsed.updated).toEqual(['李四(1002)']);
    expect(parsed.failed).toEqual([]);
  });
});

describe('parseLogDetail —— 应判定为结构化', () => {
  it('buildLogDetail 的产物可被回读', () => {
    const r = parseLogDetail(buildLogDetail({
      summary: '创建用户',
      success: ['张三(1001)'],
    }));
    expect(r.ok).toBe(true);
    expect(r.data.success).toEqual(['张三(1001)']);
    expect(r.data.updated).toEqual([]);
    expect(r.data.failed).toEqual([]);
    expect(r.data.summary).toBe('创建用户');
  });

  it('只含 failed 字段也算结构化，缺失字段补空数组', () => {
    const r = parseLogDetail('{"failed":[{"name":"王五(1003)","reason":"邮箱已被注册"}]}');
    expect(r.ok).toBe(true);
    expect(r.data.success).toEqual([]);
    expect(r.data.updated).toEqual([]);
    expect(r.data.failed).toEqual([{ name: '王五(1003)', reason: '邮箱已被注册' }]);
    expect(r.data.summary).toBe('');
  });

  it('failed 里缺 reason 时读出来也有兜底', () => {
    const r = parseLogDetail('{"failed":[{"name":"赵六"}]}');
    expect(r.ok).toBe(true);
    expect(r.data.failed[0]).toEqual({ name: '赵六', reason: '未知错误' });
  });
});

describe('parseLogDetail —— 应判定为非结构化（回退原文展示）', () => {
  const cases = [
    ['纯文本「创建用户」', '创建用户'],
    ['旧导入日志文本', '成功创建 5 个，更新 0 个，失败 1 个；失败名单：王五(1003): 邮箱已被注册'],
    ['数字字符串 123', '123'],
    ['空数组字面量 []', '[]'],
    ['null 字面量', 'null'],
    ['布尔字面量 true', 'true'],
    ['带引号的字符串 "abc"', '"abc"'],
    ['空字符串', ''],
    ['纯空格', '   '],
    ['null 值', null],
    ['undefined 值', undefined],
    ['非字符串入参（对象）', { success: [] }],
    ['合法 JSON 对象但无契约字段', '{"foo":1}'],
    ['导出日志文本', '导出沟通记录，共 128 条'],
  ];

  it.each(cases)('%s → ok:false', (_label, input) => {
    const r = parseLogDetail(input);
    expect(r.ok).toBe(false);
    expect(r.data).toBeUndefined();
  });

  it('对任意脏输入都不抛异常', () => {
    const dirty = ['{', '{"a":', '[1,2,3]', '{}', 0, false, NaN, [], {}];
    dirty.forEach((d) => expect(() => parseLogDetail(d)).not.toThrow());
  });
});

describe('buildMergedDetail —— 降级写入不污染 JSON', () => {
  it('结构化 detail 挂 target 字段后仍可被 parseLogDetail 识别', () => {
    const detail = buildLogDetail({ summary: '创建用户', success: ['张三(1001)'] });
    const merged = buildMergedDetail(detail, '张三(1001)');
    const r = parseLogDetail(merged);
    expect(r.ok).toBe(true);
    expect(r.data.target).toBe('张三(1001)');
    expect(r.data.success).toEqual(['张三(1001)']);
  });

  it('纯文本 detail 维持原有「；目标用户: xxx」拼接', () => {
    expect(buildMergedDetail('创建用户', '张三(1001)')).toBe('创建用户；目标用户: 张三(1001)');
  });

  it('targetUserName 为空时原样返回 detail', () => {
    const detail = buildLogDetail({ summary: '批量导入 2 人' });
    expect(buildMergedDetail(detail, '')).toBe(detail);
    expect(buildMergedDetail('导出沟通记录', '')).toBe('导出沟通记录');
  });

  it('detail 为空文本时只保留目标用户片段（与历史行为一致）', () => {
    expect(buildMergedDetail('', '张三(1001)')).toBe('目标用户: 张三(1001)');
  });

  it('detail 是 JSON 数组时不当作对象处理，走文本拼接', () => {
    expect(buildMergedDetail('[]', '张三')).toBe('[]；目标用户: 张三');
  });
});
