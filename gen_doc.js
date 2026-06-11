const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat,
        HeadingLevel, BorderStyle, WidthType, ShadingType,
        PageNumber, PageBreak, TableOfContents } = require("docx");

// ===== Constants =====
const C = {
  primary: "1A5276", secondary: "2E86C1", light: "D6EAF8",
  border: "BDC3C7", text: "2C3E50", green: "27AE60"
};
const border = { style: BorderStyle.SINGLE, size: 1, color: C.border };
const borders = { top: border, bottom: border, left: border, right: border };
const thinBorders = { top: border, bottom: border, left: border, right: border };

function cell(text, opts = {}) {
  const { bold, width, shading, align, fontSize } = opts;
  return new TableCell({
    borders,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: shading ? { fill: shading, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: align || AlignmentType.LEFT,
      children: [new TextRun({ text: String(text), bold: bold || false, font: "Arial", size: fontSize || 22, color: C.text })]
    })]
  });
}
function headerCell(text, width) {
  return cell(text, { bold: true, width, shading: C.primary, fontSize: 22, align: AlignmentType.CENTER });
}

// ===== Data =====
const timeline = [
  ["2026-06-05 11:44", "系统初始化", "实验室沟通系统初始版本搭建"],
  ["2026-06-05 13:22", "部署配置", "适配 GitHub Pages 部署（hash路由 + GitHub Actions）"],
  ["2026-06-05 14:02", "公告管理", "管理员批量选择删除公告"],
  ["2026-06-05 15:10", "组织架构", "组织架构分栏 + 接收人分组搜索 + 已发送消息页面"],
  ["2026-06-05 15:24", "搜索优化", "接收人选择器支持拼音搜索 + 模糊搜索"],
  ["2026-06-05 16:08", "登录修复", "修复登录串号（清旧session + localStorage + auth状态监听）"],
  ["2026-06-06 11:37", "注册修复", "修复删除用户后无法重新注册的问题"],
  ["2026-06-06 12:11", "Excel导入", "添加Excel拖拽上传批量注册用户"],
  ["2026-06-06 12:41", "注册函数", "使用 admin_create_user 数据库函数注册用户"],
  ["2026-06-06 13:07", "UI美化", "优化界面UI，添加现代化美观样式设计"],
  ["2026-06-06 14:33", "通讯录", "组织架构多选 + 快捷沟通 + 用户管理表格优化"],
  ["2026-06-06 15:36", "角色切换", "管理员角色切换功能"],
  ["2026-06-06 17:14", "搜索增强", "已发送消息添加模糊搜索"],
  ["2026-06-06 19:56", "三级体系", "重构人员架构三级体系 + 名片背景色"],
  ["2026-06-06 20:26", "待处理计数", "菜单中添加待处理消息数量提示"],
  ["2026-06-06 20:55", "公告已读表", "新增 announcement_reads 表"],
  ["2026-06-06 21:05", "项目文档", "添加完整项目复现文档"],
  ["2026-06-06 21:28", "附件下载", "消息详情展示附件列表 + 支持下载"],
  ["2026-06-06 21:40", "移动适配", "汉堡菜单 + 侧边抽屉 + 响应式布局"],
  ["2026-06-06 21:50", "实时订阅", "接收消息页面增加 Realtime 实时订阅"],
  ["2026-06-06 22:23", "日志导出", "管理员操作日志 + 数据导出Excel + 消息撤回编辑"],
  ["2026-06-07 06:13", "撤回功能", "完整实现5分钟内消息撤回功能"],
  ["2026-06-07 07:07", "通知系统", "新增系统通知页面 + 撤回重编跳转"],
  ["2026-06-07 15:19", "点赞系统", "公告/回复点赞点踩 + 公告已读系统"],
  ["2026-06-08 14:58", "批量Bug修复", "批量修复4项Bug"],
  ["2026-06-08 16:55", "四项功能", "草稿暂存/通知模糊搜索+红旗/全站模糊搜索/发起人追加回复"],
  ["2026-06-11 01:39", "回退重构", "回退到V1重新实现三项需求"],
  ["2026-06-11 01:40", "三项需求", "公告标记/点击行查看详情/邮件式Thread回复"],
  ["2026-06-11 05:40", "模式重写", "按接收消息模式重写公告标记（update announcement_reads）"]
];

const adminModules = [
  { name: "仪表盘（Home）", path: "Home.vue", features: ["显示系统概览统计信息","角色切换按钮（管理员可切换视图）","实时数据刷新"], instructions: ["登录后默认进入仪表盘","顶部导航栏可切换不同模块"] },
  { name: "用户管理（Admin）", path: "Admin.vue", features: ["用户注册：创建新用户","批量导入：Excel拖拽上传批量创建","用户编辑与重置密码","用户禁用/启用"], instructions: ["【注册用户】填写表单后提交","【批量导入】点击Excel导入按钮","【编辑用户】点击用户行右侧编辑按钮"] },
  { name: "公告管理（Announcements）", path: "Announcements.vue", features: ["发布、编辑、删除公告","已读状态追踪","红旗标记（每用户独立）","点赞/点踩反馈","模糊搜索"], instructions: ["【发布公告】点击+发布通知按钮","【红旗标记】每行右侧按钮","【筛选】勾选仅显示标记","【详情】点击行任意位置"] },
  { name: "通知管理（Notifications）", path: "Notifications.vue", features: ["系统通知列表查看","全部标记为已读"], instructions: ["查看系统通知列表","点击全部已读忽略通知"] },
  { name: "操作日志（History）", path: "History.vue", features: ["管理员操作日志","按时间过滤查看","导出Excel"], instructions: ["进入历史记录页面","选择日期范围查看","点击导出按钮"] },
  { name: "通讯录（Organization）", path: "Organization.vue", features: ["按部门层级展示用户","多选用户快捷沟通","模糊搜索和拼音搜索"], instructions: ["选择用户后点击快捷沟通跳转"] },
  { name: "个人设置（Profile）", path: "Profile.vue", features: ["修改个人信息","修改密码"], instructions: ["进入个人设置维护信息"] },
];

const businessModules = [
  { name: "发起沟通（BusinessInitiate）", path: "BusinessInitiate.vue", features: ["选择沟通类型","填写客户/样品信息","选择接收人（多人+部门名片）","上传附件","草稿暂存"], instructions: ["选择类型→填写信息→选择接收人→发送","中途可暂存为草稿","已撤回消息可编辑重发"] },
  { name: "接收消息（BusinessReceive）", path: "BusinessReceive.vue", features: ["标签页分类（待处理/已处理/已完结/已撤回/全部）","红旗标记","快捷回复（同意/拒绝/等我确认后回复）","关键词搜索","点击行查看详情","附件下载"], instructions: ["【查看】点击表格任意位置打开详情","【快捷回复】列表行中点击同意/拒绝按钮","【回复】详情底部输入框填写","【红旗】行上按钮标记/取消","【附件】详情中下载"] },
  { name: "已发送消息（SentMessages）", path: "SentMessages.vue", features: ["查看已发送消息","状态筛选（未回复/已回复/已完结/已撤回）","标记整体完结","追加回复","撤回消息（5分钟内）","编辑重发","模糊搜索"], instructions: ["【完结】详情中标记整体完结","【追加回复】列表右侧按钮","【撤回】详情中点击撤回消息"] },
  { name: "通讯录（Organization）", path: "Organization.vue", features: ["查看所有用户","按部门层级展示","搜索"], instructions: ["查看团队通讯录"] },
  { name: "个人设置（Profile）", path: "Profile.vue", features: ["修改个人信息","修改密码"], instructions: ["维护个人信息"] },
];

const labModules = [
  { name: "发起沟通（LabInitiate）", path: "LabInitiate.vue", features: ["选择沟通类型","填写样品信息","选择接收人","上传附件","草稿暂存"], instructions: ["与业务端发起沟通功能一致","实验室端专用入口"] },
  { name: "接收消息（LabReceive）", path: "LabReceive.vue", features: ["标签页分类","红旗标记","快捷回复","关键词搜索","点击行查看详情","附件下载"], instructions: ["【查看】点击表格任意位置","【快捷回复】列表行点击按钮","【红旗】行上按钮标记/取消","【附件】详情中下载"] },
  { name: "已发送消息（SentMessages）", path: "SentMessages.vue", features: ["查看已发送消息","状态筛选","标记完结","追加回复","撤回消息（5分钟内）","编辑重发"], instructions: ["【筛选】顶部标签切换","【完结】详情中标记整体完结","【撤回】详情中点击撤回消息"] },
  { name: "通讯录（Organization）", path: "Organization.vue", features: ["查看所有用户","按部门层级展示","搜索"], instructions: ["查看团队通讯录"] },
  { name: "个人设置（Profile）", path: "Profile.vue", features: ["修改个人信息","修改密码"], instructions: ["维护个人信息"] },
];

// ===== Helpers =====
const B = { style: BorderStyle.SINGLE, size: 1, color: "BDC3C7" };
const TB = { top: B, bottom: B, left: B, right: B };
const NB = { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } };

function md(text, bold, color) {
  return new TextRun({ text, font: "Arial", size: 22, color: color || C.text, bold: bold || false });
}
function p(text) {
  return new Paragraph({ spacing: { after: 80 }, children: [md(text)] });
}
function bullet(text) {
  return new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 40 }, children: [md(text)] });
}
function num(text) {
  return new Paragraph({ numbering: { reference: "n", level: 0 }, spacing: { after: 40 }, children: [md(text)] });
}
function sectionH(text, level) {
  return new Paragraph({ heading: level, children: [new TextRun({ text, bold: true, font: "Arial", color: level === HeadingLevel.HEADING_1 ? "1A5276" : "2E86C1" })], spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 240, after: 200 } });
}
function empty() { return new Paragraph({ spacing: { after: 60 } }); }

function moduleCard(mod) {
  const rows = [];
  rows.push(new TableRow({ children: [new TableCell({ borders: TB, width: { size: 9360, type: WidthType.DXA }, shading: { fill: "1A5276", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "\uD83D\uDCCC " + mod.name, bold: true, font: "Arial", size: 26, color: "FFFFFF" })] })] })] }));
  rows.push(new TableRow({ children: [new TableCell({ borders: TB, width: { size: 9360, type: WidthType.DXA }, shading: { fill: "EBF5FB", type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "\uD83D\uDCC1 源文件: " + mod.path, font: "Arial", size: 20, color: "2E86C1", italics: true })] })] })] }));
  const featChildren = [new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "功能说明：", bold: true, font: "Arial", size: 22, color: "2C3E50" })] }),
    ...mod.features.map(f => new Paragraph({ numbering: { reference: "mb", level: 0 }, spacing: { after: 40 }, children: [md(f)] }))];
  rows.push(new TableRow({ children: [new TableCell({ borders: TB, width: { size: 9360, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: featChildren })] }));
  const instChildren = [new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "使用说明：", bold: true, font: "Arial", size: 22, color: "27AE60" })] }),
    ...mod.instructions.map(i => new Paragraph({ numbering: { reference: "mn", level: 0 }, spacing: { after: 40 }, children: [md(i)] }))];
  rows.push(new TableRow({ children: [new TableCell({ borders: TB, width: { size: 9360, type: WidthType.DXA }, margins: { top: 60, bottom: 80, left: 120, right: 120 }, children: instChildren })] }));
  return rows;
}

async function main() {
  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, font: "Arial", color: "1A5276" }, paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 30, bold: true, font: "Arial", color: "2E86C1" }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 26, bold: true, font: "Arial", color: "2C3E50" }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
      ]
    },
    numbering: {
      config: [
        { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u25CF", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "mb", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "mn", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ]
    },
    // ===========================
    // SECTION 1: COVER
    // ===========================
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        empty(), empty(), empty(), empty(), empty(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "QDCTI", font: "Arial", size: 72, bold: true, color: "1A5276" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "\u5B9E\u9A8C\u5BA4\u6C9F\u901A\u7BA1\u7406\u7CFB\u7EDF", font: "Arial", size: 52, bold: true, color: "2E86C1" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "\u2500 \u2500 \u2500 \u2500 \u2500 \u2500 \u2500 \u2500 \u2500 \u2500 \u2500 \u2500", font: "Arial", size: 28, color: "BDC3C7" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "\u5B8C\u6574\u4EE3\u7801\u4EA4\u4ED8 & \u529F\u80FD\u4F7F\u7528\u624B\u518C", font: "Arial", size: 32, color: "2C3E50" })] }),
        empty(), empty(),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "\u7248\u672C 1.0", font: "Arial", size: 24, color: "1A5276", bold: true })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "\u4EA4\u4ED8\u65E5\u671F: 2026\u5E746\u670811\u65E5", font: "Arial", size: 24, color: "2C3E50" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "\u524D\u7AEF\u6846\u67B6: Vue 3 + Element Plus + Supabase", font: "Arial", size: 22, color: "BDC3C7" })] }),
        empty(), empty(), empty(), empty(),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "\u2500 \u672C\u6587\u6863\u5305\u542B\u5B8C\u6574\u6E90\u4EE3\u7801\u3001\u5F00\u53D1\u65F6\u95F4\u7EBF\u53CA\u5404\u89D2\u8272\u529F\u80FD\u8BF4\u660E \u2500", font: "Arial", size: 20, color: "BDC3C7", italics: true })] }),
      ]
    }],
  });

  // We'll create a simpler approach: write the doc in multiple sections
  // Actually let's just add more sections
  
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("C:/Users/大腚使者/Desktop/QDCTI交付资料/QDCTI_完整交付文档.docx", buffer);
  console.log("\u2705 \u6587\u6863\u751F\u6210\u5B8C\u6210");
}
main().catch(e => { console.error(e); process.exit(1); });
