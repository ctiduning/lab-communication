# 实验室沟通系统 — 4项功能开发文档（供审查）

## 概述

在已有 Vue 3 + Element Plus + Supabase 前端 SPA 基础上，实现以下4项功能：

1. **角色体系扩展** — 报告组专属角色（报告组长/报告组长助理/数据二审/报告编制）
2. **追加对所有人发送消息** — 已发送消息列表行快捷键
3. **撤回编辑退出按钮** — 编辑重发页面退出功能
4. **部门选择提示文字修改** — 红色加粗警告

---

## 涉及文件（8个）

| # | 文件 | 修改类型 | 作用 |
|---|------|---------|------|
| 1 | `src/utils/departmentConfig.js` | 修改 | `LAB_ROLES` 追加4个角色 |
| 2 | `src/api/index.js` | 修改 | 角色映射 + `appendResend` API + `isAppendForward` 字段映射 |
| 3 | `src/pages/Admin.vue` | 修改 | Excel 导入角色映射添加报告组长助理 |
| 4 | `src/pages/Organization.vue` | 修改 | 角色名映射 + tag/avatar CSS |
| 5 | `src/pages/SentMessages.vue` | 修改 | 追加按钮（行+详情弹窗） + 系统通知卡片 + `handleAppendResend` |
| 6 | `src/pages/BusinessInitiate.vue` | 修改 | 退出编辑横幅 + 提示文字 |
| 7 | `src/pages/LabInitiate.vue` | 修改 | 同上（与Business完全一致） |
| 8 | `src/pages/Home.vue` | 修改 | 监听 `switch-to-sent` / `switch-to-initiate` 事件 |
| 9 | `supabase_add_append_forward.sql` | **新增** | 数据库迁移：加 `is_append_forward` 列 |

---

## 各功能详细说明

### 功能1：角色体系扩展

**文件**：`departmentConfig.js`、`api/index.js`、`Admin.vue`、`Organization.vue`

**目的**：当管理员在 `实验室 → 食品实验室/食品大客户实验室 → 报告组` 路径下创建用户时，角色下拉框提供以下4个选项：

| 角色 | 英文 Key | 状态 |
|------|----------|------|
| 报告组长 | `report_leader` | 已有，但不在 LAB_ROLES 中 |
| 报告组长助理 | `report_leader_assistant` | **新增** |
| 数据二审 | `data_review` | 已有，但不在 LAB_ROLES 中 |
| 报告编制 | `report_compiler` | 已有，但不在 LAB_ROLES 中 |

**改动**：
- `departmentConfig.js:56-59` — LAB_ROLES 追加4条
- `api/index.js:2142` — ROLE_OPTIONS 加 `report_leader_assistant`
- `api/index.js:2203` — `getRoleCardColor` 加 `report_leader_assistant`
- `api/index.js:2229` — `getRoleTagClass` 加 `report_leader_assistant`
- `Admin.vue:1075` — Excel导入映射加 `'报告组长助理': 'report_leader_assistant'`
- `Organization.vue:500,526,549` — 角色显示名 + tag-amber + avatar-amber

---

### 功能2：追加对所有人发送消息

**文件**：`SentMessages.vue`、`api/index.js`

**UI**：
- 主表格操作列第2位（紧跟"查看"后）增加浅绿色按钮
- 详情弹窗底部操作区增加同款按钮
- 按钮样式：`background:#E1F5EE; color:#000; border-color:#B2DFDB; font-weight:500`
- 显示条件：`!scope.row.isRecalled`（只要不是已撤回消息都显示）
- 操作列 CSS：`min-width:520`

**交互流程**：
```
点击"追加对所有人发送消息"
  → ElMessageBox.confirm 确认
  → loadingMsg = ElMessage.info('正在发送...')
  → communicationAPI.appendResend(comm.id)
  → loadingMsg.close()
  → ElMessage.success('追加发送成功，收件人状态已重置')
  → detailVisible.value = false
  → loadCommunications()
  → catch: 显示错误信息（含数据库字段缺失引导）
```

**appendResend API**（api/index.js:1462-1543）：
```javascript
async appendResend(communicationId) {
  // 1. 获取原沟通记录及收件人
  const { data: original } = await supabase
    .from('communications')
    .select('*, communication_recipients(recipient_id, has_replied, is_completed)')
    .eq('id', communicationId).single();
  
  // 2. 创建新沟通记录
  const { data: newComm } = await supabase
    .from('communications').insert({
      ...original 字段复制,
      is_append_forward: true,       // ← 新增列，需先跑SQL
      forwarded_from: communicationId
    }).select().single();
  
  // 3. 创建新收件人记录（状态全部重置）
  const newRecipients = recipientIds.map(rid => ({
    communication_id: newComm.id,
    recipient_id: rid,
    has_replied: false,    // ← 重置
    is_completed: false,   // ← 重置
    is_read: false,
    has_new_reply: false
  }));
  await supabase.from('communication_recipients').insert(newRecipients);
  
  // 4. 创建通知
  await supabase.from('notifications').insert(notifications);
}
```

**详情弹窗系统通知卡片**（SentMessages.vue:239-248）：
- 条件：`v-if="selectedComm.isAppendForward"`
- 样式：红色粗边框 + 红色左侧边框 + 浅红背景
- 标题："沟通发起人对所有人追加发送了消息"
- 正文：重置说明

**字段映射**（api/index.js:453,810）：
```javascript
isAppendForward: c.is_append_forward || false,
forwardedFrom: c.forwarded_from || null,
```

---

### 功能3：撤回编辑退出按钮

**文件**：`BusinessInitiate.vue`、`LabInitiate.vue`、`Home.vue`、`SentMessages.vue`

**触发流程**：
1. 用户在"已发送消息"页点击"编辑重发"（SentMessages.vue:1425-1456）
2. 数据存入 `localStorage.recalledMessageEdit`
3. 派发 `window.dispatchEvent(new CustomEvent('switch-to-initiate'))`
4. Home.vue 监听器 `handleSwitchToInitiate` 设置 `activeMenu`
5. 组件切换到 `BusinessInitiate` 或 `LabInitiate`
6. `onMounted` 读取 localStorage，设置 `isRecalledEditMode = true`
7. 表单顶部显示黄色横幅 + "退出编辑"按钮

**退出编辑逻辑**（BusinessInitiate.vue:604-613 / LabInitiate.vue:385-394）：
```javascript
const exitRecalledEdit = () => {
  localStorage.removeItem('recalledMessageEdit');
  isRecalledEditMode.value = false;
  resetForm();
  clearAutoSave();
  localStorage.removeItem('biz_auto_draft'); // 或 lab_auto_draft
  window.dispatchEvent(new CustomEvent('switch-to-sent'));
};
```

**Home.vue 改动**（:474-476, :502-503, :514-515）：
- 新增 `handleSwitchToSent()` — 设置 `activeMenu.value = 'sent'`
- `onMounted` — `window.addEventListener('switch-to-sent', ...)`
- `onUnmounted` — `window.removeEventListener(...)`
- 修复 `handleSwitchToInitiate`（:456-471）：移除 `if(preselect)` 守卫

**关键 bug 修复**：
- 原 `editAndResend` 用 `window.location.href = '#/...'` 导航但项目无 Vue Router → 改为 `dispatchEvent` 自定义事件
- 原 `handleSwitchToInitiate` 被 `if(preselect)` 守卫阻断 → 移除守卫

---

### 功能4：部门选择提示文字修改

**文件**：`BusinessInitiate.vue`、`LabInitiate.vue`

**修改前**（灰色提示）：
```
选择部门后，消息将发送给该部门的负责人（组长+组长助理），同组任意一人回复即为该组已处理
```

**修改后**（红色加粗）：
```
⚠️ 注意：选择部门后，消息将发送给该部门的负责人（检测组长+检测组长助理），同组任意一人回复即为该组已处理。报告组和客服组请直接选择个人名片，不要选择部门名片。
```

**CSS**：`font-size:12px; font-weight:500; color:#A32D2D; line-height:1.6`；`注意` 标签背景 `#FCEBEB`

---

## 部署问题记录

### 问题1：部署分支错误

**现象**：代码推送到 `main` 分支，但 GitHub Pages 从 `gh-pages` 分支提供服务。

**修复**：切换到 `gh-pages` 分支，用 `dist/` 构建产物覆盖根目录文件后推送。

### 问题2：Service Worker 缓存

**现象**：浏览器 Service Worker 使用 cache-first 策略缓存旧 JS，导致用户看不到新功能。

**修复**：将 sw.js 从 cache-first 改为 network-first 策略，缓存版本提升至 v3。

**当前状态**：策略已更新并推送。但用户仍报告无法看到"追加对所有人发送消息"按钮。由于网络优先策略已生效，理论上用户刷新页面即可获取最新文件。

### 问题3：数据库字段缺失

**现象**：`appendResend` API 插入 `is_append_forward: true` 时，数据库 `communications` 表无此列。

**修复**：提供 SQL 迁移脚本 `supabase_add_append_forward.sql`，需在 Supabase SQL Editor 手动执行。

---

## 当前状态

| 功能 | 代码状态 | 部署状态 | 用户可见 |
|------|---------|---------|---------|
| 角色体系扩展 | ✅ 已实现 | ✅ 已部署 | 需管理员验证 |
| 追加对所有人发送消息 | ✅ 已实现 | ✅ 已部署 | ❌ 用户看不到按钮 |
| 撤回编辑退出按钮 | ✅ 已实现（含bug修复） | ✅ 已部署 | 需用户验证 |
| 部门提示文字 | ✅ 已实现 | ✅ 已部署 | 需用户验证 |

**待解决的疑问**：
用户从 GitHub Pages (`https://ctiduning.github.io/lab-communication/`) 访问时，在"已发送消息"页面操作列只能看到"查看"和"红旗"两个按钮，其余按钮（追加对所有人发送消息、追加回复、转发）均不可见。通过提取线上JS文件确认，按钮代码已包含在编译产物中。已排除 Service Worker 缓存原因（已改为 network-first）。仍需进一步排查。
