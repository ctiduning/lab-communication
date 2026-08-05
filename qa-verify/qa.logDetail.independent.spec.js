/**
 * QA 独立验证（严过关）—— 操作日志 detail 结构化契约
 * 本文件与工程师自带的 logDetailContract.spec.js 相互独立，用于交叉验证，
 * 覆盖 team-lead 指定的 V2 全量边界 + QA 自行追加的对抗性输入。
 *
 * 运行：npx vitest run qa-verify/qa.logDetail.independent.spec.js
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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
      auth: { onAuthStateChange: vi.fn(), getUser: () => Promise.resolve({ data: { user: null } }) },
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

const ADMIN_VUE = fs.readFileSync(path.resolve(__dirname, '../src/pages/Admin.vue'), 'utf8');

// ============================================================
// V2 —— 向后兼容：旧日志必须原文展示，绝不误判、绝不抛异常
// ============================================================
describe('[QA-V2] parseLogDetail 向后兼容：必须返回 ok:false', () => {
  const legacyAndDirty = [
    ['null', null],
    ['undefined', undefined],
    ['空字符串', ''],
    ['纯空格', '   '],
    ['制表/换行空白', '\t\n  \r'],
    ['全角空格 U+3000', '\u3000'],
    ['数字入参 12345', 12345],
    ['对象入参', { success: ['x'] }],
    ['数组入参', [1, 2]],
    ['布尔入参', true],
    ['函数入参', () => {}],
    ['Symbol 入参', Symbol('x')],
    ['String 包装对象', new String('{"success":[]}')],
    ['旧单注册文本', '创建用户'],
    ['旧导入文本', '成功创建 5 个，更新 1 个，失败 2 个；失败名单：张三(1001): 邮箱已被注册'],
    ['旧删除文本', '删除用户；目标用户: 张三(1001)'],
    ['旧导出文本', '导出沟通记录，共 128 条'],
    ['数字字符串', '123'],
    ['空数组字面量', '[]'],
    ['非空数组字面量', '[{"success":[]}]'],
    ['null 字面量', 'null'],
    ['true 字面量', 'true'],
    ['JSON 字符串字面量', '"abc"'],
    ['无契约字段的对象', '{"foo":1}'],
    ['空对象', '{}'],
    ['截断的 JSON', '{"success":['],
    ['半个花括号', '{'],
    ['疑似 JSON 的中文文本', '{创建用户}'],
  ];

  it.each(legacyAndDirty)('%s → ok:false 且不含 data', (_label, input) => {
    const r = parseLogDetail(input);
    expect(r.ok).toBe(false);
    expect(r.data).toBeUndefined();
  });

  it('对上述所有输入均不抛异常（永不 throw）', () => {
    legacyAndDirty.forEach(([label, input]) => {
      expect(() => parseLogDetail(input), `输入「${label}」抛异常了`).not.toThrow();
    });
  });

  it('极端脏输入同样不抛异常', () => {
    const extreme = [NaN, Infinity, -0, 0n, new Date(), /re/g, new Map(), new Set(), Object.create(null)];
    extreme.forEach((d) => expect(() => parseLogDetail(d)).not.toThrow());
  });
});

describe('[QA-V2] parseLogDetail 正向识别与字段补全', () => {
  const FULL = '{"v":1,"summary":"x","success":["张三(1001)"],"updated":[],"failed":[{"name":"王五(1003)","reason":"邮箱已被注册"}]}';

  it('team-lead 指定的合法对象 → ok:true 且字段完整', () => {
    const r = parseLogDetail(FULL);
    expect(r.ok).toBe(true);
    expect(r.data.v).toBe(1);
    expect(r.data.summary).toBe('x');
    expect(r.data.success).toEqual(['张三(1001)']);
    expect(r.data.updated).toEqual([]);
    expect(r.data.failed).toEqual([{ name: '王五(1003)', reason: '邮箱已被注册' }]);
  });

  it.each([
    ['只有 success', '{"success":["a"]}'],
    ['只有 updated', '{"updated":["a"]}'],
    ['只有 failed', '{"failed":[]}'],
  ])('%s → ok:true，缺失字段补空数组，summary 补空串', (_l, input) => {
    const r = parseLogDetail(input);
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.success)).toBe(true);
    expect(Array.isArray(r.data.updated)).toBe(true);
    expect(Array.isArray(r.data.failed)).toBe(true);
    expect(typeof r.data.summary).toBe('string');
  });

  it('三组全空 → 仍是结构化（展示层负责显示「无明细」）', () => {
    const r = parseLogDetail('{"success":[],"updated":[],"failed":[]}');
    expect(r.ok).toBe(true);
    expect(r.data.success.length + r.data.updated.length + r.data.failed.length).toBe(0);
  });

  it('脏字段类型不崩：success 为字符串 / failed 为数字 / summary 为对象', () => {
    const r = parseLogDetail('{"success":"张三","updated":123,"failed":{"a":1},"summary":{"b":2}}');
    expect(r.ok).toBe(true);
    expect(r.data.success).toEqual([]);
    expect(r.data.updated).toEqual([]);
    expect(r.data.failed).toEqual([]);
    expect(r.data.summary).toBe('');
  });

  it('failed 元素为字符串 / 数字 / null 时被安全归一化', () => {
    const r = parseLogDetail('{"failed":["王五(1003)",42,null,{"name":"赵六"},{"name":"钱七","reason":""}]}');
    expect(r.ok).toBe(true);
    expect(r.data.failed).toEqual([
      { name: '王五(1003)', reason: '未知错误' },
      { name: '42', reason: '未知错误' },
      { name: '赵六', reason: '未知错误' },
      { name: '钱七', reason: '未知错误' },
    ]);
    expect(JSON.stringify(r.data.failed)).not.toContain('undefined');
  });

  it('__proto__ 注入不会污染 Object.prototype', () => {
    expect(() => parseLogDetail('{"__proto__":{"polluted":1},"success":[]}')).not.toThrow();
    expect({}.polluted).toBeUndefined();
  });

  it('大体量名单（1000 人）可正常解析，不超时不崩溃', () => {
    const big = buildLogDetail({
      summary: '批量导入 1000 人',
      success: Array.from({ length: 600 }, (_, i) => `员工${i}(E${i})`),
      failed: Array.from({ length: 400 }, (_, i) => ({ name: `员工F${i}`, reason: '邮箱已被注册' })),
    });
    const r = parseLogDetail(big);
    expect(r.ok).toBe(true);
    expect(r.data.success).toHaveLength(600);
    expect(r.data.failed).toHaveLength(400);
  });
});

describe('[QA-V2] buildLogDetail 归一化', () => {
  it('产物永不含 undefined / [object Object]', () => {
    const s = buildLogDetail({
      summary: '批量导入',
      success: ['张三(1001)', null, undefined],
      updated: 'not-array',
      failed: [{ name: '王五' }, '李四', null, { name: '孙八', reason: null }],
    });
    expect(s).not.toContain('undefined');
    expect(s).not.toContain('[object Object]');
    const o = JSON.parse(s);
    expect(o.success).toEqual(['张三(1001)']);
    expect(o.updated).toEqual([]);
    expect(o.failed).toEqual([
      { name: '王五', reason: '未知错误' },
      { name: '李四', reason: '未知错误' },
      { name: '孙八', reason: '未知错误' },
    ]);
  });

  it('build → parse 往返幂等', () => {
    const src = { summary: 'S', success: ['a'], updated: ['b'], failed: [{ name: 'c', reason: 'r' }] };
    const once = parseLogDetail(buildLogDetail(src)).data;
    const twice = parseLogDetail(buildLogDetail(once)).data;
    expect(twice.success).toEqual(once.success);
    expect(twice.updated).toEqual(once.updated);
    expect(twice.failed).toEqual(once.failed);
  });

  it('无参 / 传 undefined 均不抛错', () => {
    expect(() => buildLogDetail()).not.toThrow();
    expect(() => buildLogDetail(undefined)).not.toThrow();
    expect(JSON.parse(buildLogDetail()).v).toBe(1);
  });
});

describe('[QA-V2] buildMergedDetail 降级路径不撑坏 JSON', () => {
  it('结构化 detail + target 仍可被识别', () => {
    const merged = buildMergedDetail(buildLogDetail({ success: ['张三(1001)'] }), '张三(1001)');
    const r = parseLogDetail(merged);
    expect(r.ok).toBe(true);
    expect(r.data.target).toBe('张三(1001)');
  });

  it('纯文本 detail 保持历史拼接行为（旧日志格式不变）', () => {
    expect(buildMergedDetail('创建用户', '张三(1001)')).toBe('创建用户；目标用户: 张三(1001)');
    expect(buildMergedDetail('', '张三')).toBe('目标用户: 张三');
    expect(buildMergedDetail('创建用户', '')).toBe('创建用户');
  });

  it('脏入参不抛异常', () => {
    [null, undefined, 0, [], {}, '[]', '{'].forEach((d) => {
      expect(() => buildMergedDetail(d, '张三')).not.toThrow();
      expect(() => buildMergedDetail(d, '')).not.toThrow();
    });
  });
});

// ============================================================
// V3/V4 —— 源码级静态断言（防回归）
// ============================================================
describe('[QA-V3] 写入侧源码审计', () => {
  it('handleExcelImport 的所有 failList.push 均为对象形态，无残留字符串 push', () => {
    const pushes = ADMIN_VUE.match(/failList\.push\([^\n]*/g) || [];
    expect(pushes.length).toBeGreaterThanOrEqual(2);
    pushes.forEach((p) => {
      expect(p, `发现非对象形态 push: ${p}`).toMatch(/failList\.push\(\{\s*name:/);
      expect(p).toMatch(/reason:/);
    });
  });

  it('结果弹窗显式拼 name/reason，不会输出 [object Object]', () => {
    expect(ADMIN_VUE).toMatch(/failList\.slice\(0,\s*5\)\.map\(f\s*=>\s*`\$\{f\.name\}:\s*\$\{f\.reason\}`\)/);
  });

  it('落库的失败名单未被截断（buildLogDetail 传的是完整 failList）', () => {
    expect(ADMIN_VUE).toMatch(/failed:\s*failList\s*$/m);
    expect(ADMIN_VUE).not.toMatch(/failed:\s*failList\.slice/);
    expect(ADMIN_VUE).not.toMatch(/failList\.slice\(0,\s*10\)/);
  });

  it('successList / updatedList 分别在 successCount++ / updateCount++ 之后 push', () => {
    expect(ADMIN_VUE).toMatch(/successCount\+\+;\s*\n\s*successList\.push\(userLabel\);/);
    expect(ADMIN_VUE).toMatch(/updateCount\+\+;\s*\n\s*updatedList\.push\(userLabel\);/);
  });

  it('handleCreateUser 失败分支补写了日志，且被 try/catch 兜住', () => {
    // 注意：'// ==================== 编辑用户' 在文件里有多处（1002 行的「编辑用户弹窗」更靠前），
    // 必须从 handleCreateUser 起点往后找结束标记，否则切出空串。
    const start = ADMIN_VUE.indexOf('const handleCreateUser');
    expect(start).toBeGreaterThan(-1);
    const end = ADMIN_VUE.indexOf('// ==================== 编辑用户 ====================', start);
    expect(end).toBeGreaterThan(start);
    const seg = ADMIN_VUE.slice(start, end);
    expect(seg).toMatch(/catch \(error\) \{[\s\S]*ElMessage\.error/);
    expect(seg).toMatch(/summary: '创建用户失败'/);
    expect(seg).toMatch(/failed: \[\{ name: failedLabel, reason: error\.message \|\| '未知错误' \}\]/);
    // 写日志失败不得冒泡盖掉原始提示
    expect(seg).toMatch(/catch \(logErr\)[\s\S]*console\.warn/);
    // ElMessage.error 必须在写日志之前，保证原始「创建失败」先弹出
    expect(seg.indexOf('ElMessage.error(error.message')).toBeLessThan(seg.indexOf("summary: '创建用户失败'"));
  });
});

describe('[QA-V4] 展示侧与红线', () => {
  it('表格 :data 使用 parsedLogs 派生数据', () => {
    expect(ADMIN_VUE).toMatch(/<el-table :data="parsedLogs"/);
  });

  it('「共 X 条操作记录」保持使用 adminLogs.length（未被改成 parsedLogs）', () => {
    expect(ADMIN_VUE).toMatch(/共 \{\{ adminLogs\.length \}\} 条操作记录/);
  });

  it('loadAdminLogs 的查询语句一行未动（红线）', () => {
    expect(ADMIN_VUE).toMatch(/supabase\.from\('admin_logs'\)\.select\('\*'\)\.order\('created_at', \{ ascending: false \}\)\.limit\(200\)/);
  });

  it('详情列：结构化走摘要按钮，否则原文回退', () => {
    expect(ADMIN_VUE).toMatch(/v-if="scope\.row\._structured"/);
    expect(ADMIN_VUE).toMatch(/<span v-else>\{\{ scope\.row\.detail \|\| '-' \}\}<\/span>/);
  });

  it('Drawer 三组卡片均带 v-if 长度判断（空组不渲染）', () => {
    expect(ADMIN_VUE).toMatch(/v-if="currentDetail\.success\.length"/);
    expect(ADMIN_VUE).toMatch(/v-if="currentDetail\.updated\.length"/);
    expect(ADMIN_VUE).toMatch(/v-if="currentDetail\.failed\.length"/);
    expect(ADMIN_VUE).toMatch(/log-detail-fail-name[\s\S]{0,200}log-detail-fail-reason/);
  });

  it('openLogDetail 对非结构化行直接 return，不会打开空抽屉', () => {
    expect(ADMIN_VUE).toMatch(/const openLogDetail = \(row\) => \{\s*\n\s*if \(!row \|\| !row\._structured\) return;/);
  });
});

describe('[QA-V4] buildDetailSummary 摘要文案（行为等价实现校验）', () => {
  // 与 Admin.vue 中同名函数保持一致的纯逻辑复刻，用于验证分组显示规则
  const buildDetailSummary = (parsed) => {
    if (!parsed) return '无明细';
    const parts = [];
    if (parsed.success.length) parts.push(`成功 ${parsed.success.length}`);
    if (parsed.updated.length) parts.push(`更新 ${parsed.updated.length}`);
    if (parsed.failed.length) parts.push(`失败 ${parsed.failed.length}`);
    return parts.length ? parts.join(' · ') : '无明细';
  };

  it.each([
    [{ success: ['a'], updated: ['b'], failed: [{ name: 'c', reason: 'r' }] }, '成功 1 · 更新 1 · 失败 1'],
    [{ success: ['a', 'b'], updated: [], failed: [] }, '成功 2'],
    [{ success: [], updated: [], failed: [{ name: 'c', reason: 'r' }] }, '失败 1'],
    [{ success: [], updated: [], failed: [] }, '无明细'],
  ])('%o → %s', (parsed, expected) => {
    expect(buildDetailSummary(parsed)).toBe(expected);
  });

  it('parsed 为 null 时返回「无明细」，不抛异常', () => {
    expect(buildDetailSummary(null)).toBe('无明细');
  });

  it('源码中的实现与本处复刻逻辑一致', () => {
    expect(ADMIN_VUE).toMatch(/if \(parsed\.success\.length\) parts\.push\(`成功 \$\{parsed\.success\.length\}`\);/);
    expect(ADMIN_VUE).toMatch(/return parts\.length \? parts\.join\(' · '\) : '无明细';/);
  });
});
