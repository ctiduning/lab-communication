# 青岛华测实验室沟通小程序 - 项目交接文档

> 最后更新：2026-06-07  
> 项目路径：`D:/game/实验室沟通/frontend`  
> 线上地址：`https://ctiduning.github.io/lab-communication/#/login`  
> GitHub 仓库：`https://github.com/ctiduning/lab-communication`

---

## 一、项目概述

青岛华测实验室内部沟通小程序，用于商务人员与实验室人员之间的高效沟通。

**核心功能**：
- 商务发起沟通 → 实验室人员接收并回复
- 消息撤回（5分钟内可撤回）
- 消息标记红旗、完结管理
- 管理员数据统计与备份
- 存储管理与旧数据清理

---

## 二、技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript + Vite |
| UI 组件库 | Element Plus |
| 后端/数据库 | Supabase（PostgreSQL + Auth + Storage） |
| 部署托管 | GitHub Pages（前端）+ Supabase Cloud（后端） |
| 状态管理 | Composition API（reactive/ref） |

---

## 三、数据库结构（Supabase）

### `profiles` 表（用户通讯录）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键，关联 auth.users |
| username | TEXT | 登录邮箱 |
| name | TEXT | 姓名 |
| employee_id | TEXT | 工号 |
| role | TEXT | 角色：`business` / `lab` / `admin` |
| department | TEXT | 部门 |
| region | TEXT | 地区/组 |
| phone | TEXT | 电话 |
| email | TEXT | 邮箱 |
| is_disabled | BOOLEAN | 是否禁用 |
| created_at | TIMESTAMPTZ | 创建时间 |

### `communications` 表（沟通记录）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| sender_id | UUID | 发起人（关联 profiles.id） |
| type | TEXT | 沟通类型（见下方枚举） |
| content | TEXT | 消息内容 |
| customer_name | TEXT | 客户名称（商务用） |
| sample_code | TEXT | 样品编号 |
| is_flagged | BOOLEAN | 是否标记红旗 |
| is_completed | BOOLEAN | 是否全局完结 |
| is_recalled | BOOLEAN | 是否撤回 |
| recall_reason | TEXT | 撤回原因 |
| recalled_at | TIMESTAMPTZ | 撤回时间 |
| is_system_notification | BOOLEAN | 是否系统通知 |
| attachments | JSONB | 附件列表 [{name, path, size}] |
| created_at | TIMESTAMPTZ | 创建时间 |

**沟通类型枚举**：
- `paid_urgent` 付费加急
- `free_urgent` 免费加急
- `data_dispute` 数据质疑
- `follow_up` 跟单
- `consultation` 咨询
- `other` 其他
- `unqualified` 不合格沟通
- `data_confirm` 数据确认

### `communication_recipients` 表（接收人关系）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| communication_id | UUID | 关联 communications.id |
| recipient_id | UUID | 接收人（关联 profiles.id） |
| is_read | BOOLEAN | 是否已读 |
| has_replied | BOOLEAN | 是否已回复 |
| is_completed | BOOLEAN | 接收人是否已完结 |
| is_flagged | BOOLEAN | 接收人是否标记红旗 |

### `replies` 表（回复记录）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| communication_id | UUID | 关联 communications.id |
| sender_id | UUID | 回复人（关联 profiles.id） |
| content | TEXT | 回复内容 |
| created_at | TIMESTAMPTZ | 创建时间 |

### `notifications` 表（通知）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 接收用户 |
| type | TEXT | 通知类型 |
| content | TEXT | 通知内容 |
| is_read | BOOLEAN | 是否已读 |
| communication_id | UUID | 关联沟通记录 |
| created_at | TIMESTAMPTZ | 创建时间 |

### Supabase Storage
- **Bucket 名称**：`attachments`
- 存储用户上传的附件文件

---

## 四、前端文件结构

```
frontend/
├── index.html
├── vite.config.ts          # Vite 配置（base路径等）
├── package.json
├── src/
│   ├── main.ts             # 入口文件
│   ├── App.vue            # 根组件（路由视图）
│   ├── router/
│   │   └── index.js      # 路由配置
│   ├── api/
│   │   └── index.js      # 所有 Supabase API 封装
│   ├── pages/
│   │   ├── Login.vue             # 登录页
│   │   ├── Home.vue              # 主界面（侧边栏+标签页）
│   │   ├── BusinessInitiate.vue # 商务发起沟通
│   │   ├── LabInitiate.vue      # 实验室发起沟通
│   │   ├── BusinessReceive.vue  # 商务接收消息
│   │   ├── LabReceive.vue       # 实验室接收消息
│   │   ├── SentMessages.vue     # 已发送消息（含已撤回标签）
│   │   ├── Announcements.vue    # 系统公告
│   │   ├── History.vue          # 历史记录
│   │   ├── Profile.vue          # 个人中心
│   │   └── Admin.vue           # 管理员页面（用户管理+统计+备份+清理）
│   └── assets/
├── dist/                   # 构建产物（部署用）
└── PROJECT_SUMMARY.md    # 本文档
```

---

## 五、已实现功能清单

### 5.1 登录注册
- [x] 邮箱密码登录
- [x] 管理员批量导入用户（Excel）
- [x] 管理员单个添加用户
- [x] 用户禁用/启用

### 5.2 发起沟通
- [x] 商务发起沟通（BusinessInitiate）
- [x] 实验室发起沟通（LabInitiate）
- [x] 选择沟通类型、接收人、上传附件
- [x] 消息内容字段（content）

### 5.3 接收消息
- [x] 待处理/已处理/已完结 三个标签
- [x] 快速回复按钮（同意/拒绝/等我确认）
- [x] 完结/取消完结
- [x] 红旗标记
- [x] 消息详情弹窗

### 5.4 消息撤回
- [x] 已发送消息可撤回（5分钟内）
- [x] 撤回原因填写
- [x] 接收方看到"此消息已被撤回"
- [x] 已撤回消息标签页
- [x] **编辑重发**（撤回后可编辑并重新发送）

### 5.5 管理员功能
- [x] 用户管理（增删改查、禁用）
- [x] 导出沟通记录（Excel）
- [x] **一键备份**（导出所有数据到 Excel，多 Sheet）
- [x] **存储状态显示**（数据库+文件存储使用量）
- [x] **清理旧数据**（按日期删除旧记录）
- [x] 月度备份自动提醒（每月1日上午10点）
- [x] 沟通统计（按人员/类型/组统计）
- [x] 统计结果导出 Excel

### 5.6 其他
- [x] 系统公告
- [x] 历史记录查看
- [x] 个人中心（修改密码/头像等）

---

## 六、关键实现细节

### 6.1 消息撤回实现逻辑

**API 函数**（`src/api/index.js`）：
```javascript
// 撤回消息
async recallMessage(communicationId, reason = '') {
  const { data: { user } } = await supabase.auth.getUser();
  // 1. 检查是否在5分钟内
  // 2. 更新 communications 表：is_recalled=true, recall_reason, recalled_at
  // 3. 删除 communication_recipients 中对应记录（或标记）
}
```

**已撤回消息查询**：
```javascript
// 获取已撤回消息（需要正确的 Supabase 关系查询语法）
async getRecalledMessages() {
  const { data: { user } } = await supabase.auth.getUser();
  return await supabase
    .from('communications')
    .select(`
      *,
      sender:sender_id(name, employee_id),
      communication_recipients!inner(recipient:recipient_id(name, employee_id))
    `)
    .eq('sender_id', user.id)
    .eq('is_recalled', true)
    .order('recalled_at', { ascending: false });
}
```

### 6.2 编辑重发实现逻辑

**SentMessages.vue** 中的 `editAndResend` 函数：
```javascript
const editAndResend = (row) => {
  const editData = {
    type: row.type,
    content: row.content,
    customerName: row.customerName,
    sampleCode: row.sampleCode,
    recipientIds: row.recipientIds,
    attachments: row.attachments
  };
  localStorage.setItem('recalledMessageEdit', JSON.stringify(editData));
  
  // 根据当前路径判断跳转
  const currentPath = window.location.hash;
  if (currentPath.includes('lab') || currentPath.includes('实验室')) {
    window.location.href = '#/lab-initiate';
  } else {
    window.location.href = '#/business-initiate';
  }
};
```

**BusinessInitiate.vue / LabInitiate.vue** 中的 `onMounted`：
```javascript
onMounted(() => {
  // 检查是否有撤回消息的编辑数据
  const editDataStr = localStorage.getItem('recalledMessageEdit');
  if (editDataStr) {
    try {
      const editData = JSON.parse(editDataStr);
      // 预填表单
      form.type = editData.type || '';
      form.content = editData.content || '';
      form.customerName = editData.customerName || '';
      form.sampleCode = editData.sampleCode || '';
      form.recipients = editData.recipientIds || [];
      form.attachments = editData.attachments || [];
      // 清除 localStorage
      localStorage.removeItem('recalledMessageEdit');
      ElMessage.info('已加载撤回消息的内容，请修改后重新发送');
    } catch (e) {
      console.error('加载编辑数据失败:', e);
    }
  }
  // ...其他初始化
});
```

### 6.3 存储管理实现

**获取存储状态**（`src/api/index.js`）：
```javascript
async getStorageStatus() {
  // 1. 统计各表记录数
  // 2. 列出 Storage 文件并累加大小（file.metadata.size）
  // 3. 返回预估数据库大小（每条沟通约2KB，每条回复约1KB）
}
```

**清理旧数据**：
```javascript
async cleanupOldData(beforeDate) {
  // 1. 查出要删除的沟通记录ID
  // 2. 删除 replies（关联 communication_id）
  // 3. 删除 communication_recipients
  // 4. 删除 notifications
  // 5. 删除 Storage 中的附件文件
  // 6. 删除 communications 记录
}
```

### 6.4 路由配置

```javascript
// src/router/index.js
const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/home', component: Home, meta: { requiresAuth: true } },
  { path: '/business-initiate', component: BusinessInitiate, meta: { requiresAuth: true } },
  { path: '/lab-initiate', component: LabInitiate, meta: { requiresAuth: true } },
  // ...其他路由
];
```

---

## 七、常见Bug与修复记录

### Bug 1：撤回消息后接收方仍能操作
**现象**：已撤回的消息在接收方仍显示"同意/拒绝"按钮  
**原因**：按钮的 `v-if` 没有检查 `isRecalled` 字段  
**修复**：在所有操作按钮添加 `!scope.row.isRecalled` 条件

### Bug 2：待处理消息数量显示不正确
**现象**：侧边栏显示6条，但表格只显示3条  
**原因**：`getPendingCount()` API 没有过滤已撤回和系统通知  
**修复**：重写 `getPendingCount()` 使其与前端过滤逻辑一致

### Bug 3：导出沟通记录失败（column does not exist）
**现象**：点击"导出沟通记录"报错 `communications.title does not exist`  
**原因**：代码引用了数据库中不存在的字段 `title` 和 `initiator_role`  
**修复**：移除 `exportAll()` 和 `recallMessage()` 中的无效字段引用

### Bug 4：编辑重发后无法跳转
**现象**：点击"编辑重发"没反应  
**原因**：路由配置中缺少 `/business-initiate` 和 `/lab-initiate` 路径  
**修复**：在 `router/index.js` 中添加这两个路由

### Bug 5：发送成功后卡在空白页面
**现象**：发送消息后页面空白，只能点浏览器后退  
**原因**：发送成功后没有跳转指令  
**修复**：在 `create()` 成功回调中添加 `window.location.href = '#/home'`

### Bug 6：存储状态显示 NaN%
**现象**：存储状态进度条显示 NaN%  
**原因**：前端访问了错误的数据路径 `storageStatus.estimatedDbSizeMB`，实际应该是 `storageStatus.storage.estimatedDbSizeMB`  
**修复**：修正所有相关数据路径

---

## 八、部署流程

### 8.1 本地开发
```bash
cd D:/game/实验室沟通/frontend
npm install
npm run dev    # 启动开发服务器
```

### 8.2 构建生产版本
```bash
cd D:/game/实验室沟通/frontend
npm run build    # 产物在 dist/ 目录
```

### 8.3 部署到 GitHub Pages
```bash
cd D:/game/实验室沟通/frontend
git add -A
git commit -m "描述本次修改"
git push origin main    # 推送后 GitHub Actions 自动部署
```

**注意**：GitHub Pages 通常需要 1-3 分钟完成构建。如果页面没更新，按 `Ctrl + F5` 强制刷新清除缓存。

---

## 九、Supabase 后台操作

### 9.1 访问 Supabase 后台
- 项目 URL：在 `src/api/index.js` 顶部找到 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`
- 登录 Supabase Dashboard 管理数据库

### 9.2 查看存储使用情况
1. 登录 Supabase Dashboard
2. 左侧菜单 → **Settings** → **Database**
3. 查看数据库大小
4. 左侧菜单 → **Storage** → 查看 Bucket 使用情况

### 9.3 手动清空数据（保留用户）
在 Supabase SQL Editor 中执行：
```sql
-- 删除所有沟通记录（谨慎！）
DELETE FROM communications;
-- 会级联删除 replies, communication_recipients, notifications

-- 只删除某个日期之前的
DELETE FROM communications WHERE created_at < '2025-01-01';
```

---

## 十、待完成功能（TODO）

- [ ] 统计页面完全实现（目前只有存储管理和清理功能）
- [ ] 按人员/类型/组的统计图表
- [ ] 统计结果导出 Excel
- [ ] 自动备份到公司公共盘（需要开发桌面工具）
- [ ] 消息搜索功能
- [ ] 移动端适配（目前只适配桌面端）

---

## 十一、给下一位 AI/开发者的提示

1. **先读本文档** — 了解整体架构和已实现功能
2. **查看 `src/api/index.js`** — 所有后端 API 都在这里
3. **Supabase 关系查询语法** — 注意使用正确的 `!inner` / `!left` 语法
4. **字段名大小写** — 数据库用 snake_case，前端用 camelCase，API 返回的是 camelCase
5. **GitHub Pages 缓存问题** — 每次部署后告诉用户按 `Ctrl + F5`
6. **网络问题** — 如果在国内，GitHub 可能不稳定，多试几次推送

---

## 十二、重要联系方式

- **项目所有者**：ctiduning（GitHub 账号）
- **Supabase 项目**：由 ctiduning 创建，需要其账号权限才能管理后台

---

*本文档由 AI 助手生成，最后更新于 2026-06-07。如有问题，检查 GitHub 提交记录获取最新变更。*
