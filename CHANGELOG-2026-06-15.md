# 更新日志 v2.5.0 — 2026-06-15

> **QDCTI 实验室沟通系统** | 前端 Vue 3 + Supabase 全栈 SPA

---

## TL;DR

本次更新新增 3 项功能 + 1 项 Bug 修复，涉及 7 个文件，净增 273 行代码。

---

## 功能一：已发送消息增加红旗标记（快捷快捷键）

> **涉及文件**：`src/pages/SentMessages.vue`

### 背景
收件页面（BusinessReceive.vue）已有红旗标记功能，但已发送页面（SentMessages.vue）一直缺失此功能。本次为其补全。

### 改动内容

| 位置 | 改动 |
|------|------|
| 主表格操作列 | 新增「红旗 / 取消红旗」按钮，操作列宽度 160 → **260** |
| 已撤回表格操作列 | 新增同款按钮，操作列宽度 200 → **290** |
| 详情弹窗底部 footer | 新增「标记红旗 / 取消红旗」按钮 |
| 数据展示 | `loadCommunications` 改为读取 `communications.is_flagged` 字段（通讯级别标记），而非从接收人聚合 |

### 设计决策
- **发送人端使用 `communications.is_flagged`（通讯级标记）**，而非 `communication_recipients.is_flagged`（接收人级标记）
- 理由：发送人不是接收人，对接收人级别的旗帜无操作权限
- API 调用：`communicationAPI.toggleCommFlag(msgId, newVal)`，而非 `toggleRecipientFlag`

---

## 功能二：公告发送范围增加「青岛业务 / 非青岛业务」

> **涉及文件**：`src/pages/Announcements.vue`、`src/api/index.js`

### 背景
原有公告发送范围仅支持「全部用户 / 仅业务端 / 仅实验室端」。业务端分为青岛业务和非青岛业务两类，需要精准推送。

### 前端改动（Announcements.vue）

| 区域 | 改动 |
|------|------|
| 发送弹窗 radio | 新增两个选项：「**青岛业务**」「**非青岛业务**」 |
| 原选项重命名 | 「仅业务端」→「全部业务」，「仅实验室端」→「全部实验室」 |
| `filteredAnnouncements` | 新增 `qingdao_business` / `non_qingdao_business` 过滤逻辑 |
| `handleSend` | 根据 `targetRole` 自动设置 `target_regions` 参数（`'qingdao'` / `'non_qingdao'`） |

### 后端改动（api/index.js）

| 函数 | 改动 |
|------|------|
| `announcementAPI.create` | 新增 `target_regions` 参数解构与写入（原硬编码 `null`） |
| `getUnreadCount` | 新增 `profile.department_level3` 查询；新增 `qingdao_business` / `non_qingdao_business` 公告可见性过滤 |

### 筛选逻辑

```
用户角色 → target_role 匹配规则

qingdao_business  → department_level1 === '业务' && department_level3 === '青岛'
non_qingdao_business → department_level1 === '业务' && department_level3 !== '青岛'
```

---

## 功能三：回复记录快捷追加回复（Inline Reply）

> **涉及文件**：`src/pages/SentMessages.vue`、`src/pages/BusinessReceive.vue`

### 背景
原有详情弹窗已有「回复全部接收人」功能，但无法针对某一条具体的回复记录进行定向回复。本次在每个回复记录旁增加 💬 按钮，点击后展开行内输入框，可快捷回复该回复的发送者。

### 交互流程

```
每条回复旁边 → 💬 按钮
  ↓ 点击
展开 [input 输入框] [发送] [取消]
  ↓ 填写内容 + 回车/点击发送
调用 createReply({ content, targetRecipientId: reply.senderId })
  ↓ 成功后
重新加载详情，inline 收起
```

### 改动内容

| 文件 | 区域 |
|------|------|
| SentMessages.vue | 部门卡片分组的「回复记录」列、「全部回复」thread、每人 thread → 均增加 💬 按钮 + inline 输入 |
| BusinessReceive.vue | 部门卡片分组的「回复记录」列、「全部回复」thread、每人 thread → 均增加 💬 按钮 + inline 输入 |
| 新增响应式数据 | `activeReplyId`、`inlineReplyContent`、`inlineReplyLoading` |
| 新增方法 | `submitInlineReply(reply)`、`cancelInlineReply()` |

### 技术要点
- 调用 `communicationAPI.createReply` 时传入 `targetRecipientId: reply.senderId`，实现**定向追回复**（对应数据库 `replies.target_recipient_id` 字段，该字段此前已存在）
- 无需数据库 schema 变更
- 发送后自动重新加载详情，保持视图同步

---

## Bug 修复

### 1. `createReply` 中 `.single()` 改为 `.maybeSingle()`

> **文件**：`src/api/index.js` 第 523 行

**问题**：当发送人（非接收人）调用 inline reply 时，`createReply` 查询 `communication_recipients` 用 `recipient_id = userId` 搭配 `.single()`，但发送人不在接收人表中，导致「no rows found」报错。

**修复**：`.single()` → `.maybeSingle()`，返回 `null` 而非抛出异常。

### 2. Admin.vue 中 `profiles` 关联修正

> **文件**：`src/pages/Admin.vue` 第 1279 行

**问题**：`recipientNames` 拼接使用了 `r.profiles?.name`，但 Supabase 关联名称实际为 `r.recipient?.name`（旧版代码未对齐）。

**修复**：`r.profiles?.name` → `r.recipient?.name`。

---

## 文件变更总览

| 文件 | 状态 | 变更类型 |
|------|------|----------|
| `src/pages/SentMessages.vue` | 📝 修改 | 功能一 + 功能三 |
| `src/pages/BusinessReceive.vue` | 📝 修改 | 功能三 |
| `src/pages/Announcements.vue` | 📝 修改 | 功能二 |
| `src/api/index.js` | 📝 修改 | 功能二 + Bug 修复 |
| `src/pages/Admin.vue` | 📝 修改 | Bug 修复 |
| `src/pages/Home.vue` | 📝 修改 | 代码顺序调整（无功能变化） |
| `.workbuddy/memory/2026-06-11.md` | 📝 修改 | 增量开发记录 |

**总计**：7 文件变更，+273 行 / -69 行

---

## 数据库变更

本次更新 **无需** 数据库 schema 变更，所有功能基于已有字段实现：
- `communications.is_flagged` — 通讯级红旗标记
- `announcements.target_regions` — 公告推送区域
- `replies.target_recipient_id` — 回复的目标接收人

---

## 已知问题

- 暂无已知问题

---

## 提交记录

```
4d0ca7f feat: 已发送页面红旗 + 公告青岛/非青岛筛选 + 回复记录inline追加回复
```
