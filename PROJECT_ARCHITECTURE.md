# 青岛华测实验室沟通小程序 - 项目架构文档

> **文档目的**：本文档详细描述项目的技术架构、数据库设计、前端结构、角色权限体系等，确保任何AI或开发者都能基于此文档重现项目。
>
> **最后更新**：2026-06-06
>
> **项目地址**：https://ctiduning.github.io/lab-communication/#/login

---

## 一、项目概述

### 1.1 项目背景
青岛华测实验室沟通小程序是一个面向检测实验室的内部沟通协作平台，支持业务端和实验室端的多角色协同工作。

### 1.2 核心功能
- **即时沟通**：业务端与实验室端之间的消息发送与接收
- **公告管理**：管理员发布公告，支持点赞和查看已读状态
- **订单管理**：实验室订单的创建与跟踪
- **通讯录**：按部门/属地/角色三级架构展示人员信息
- **历史记录**：查看历史沟通记录

### 1.3 技术选型

| 层级 | 技术栈 | 版本 |
|------|---------|------|
| **前端框架** | Vue 3 | ^3.3.13 |
| **构建工具** | Vite | ^5.0.10 |
| **UI组件库** | Element Plus | ^2.5.1 |
| **路由管理** | Vue Router | ^4.2.5 |
| **后端服务** | Supabase (BaaS) | ^2.107.0 |
| **日期处理** | Moment.js | ^2.29.4 |
| **拼音搜索** | pinyin-pro | ^3.28.1 |
| **Excel导出** | xlsx | ^0.18.5 |

---

## 二、项目结构

```
D:/game/实验室沟通/frontend/
├── index.html                  # 入口HTML（标题：青岛华测实验室沟通小程序）
├── package.json               # 项目依赖配置
├── vite.config.js            # Vite配置（base: '/lab-communication/'）
├── src/
│   ├── main.js              # Vue应用入口
│   ├── App.vue             # 根组件（路由视图 + 过渡动画）
│   ├── style.css           # 全局样式
│   ├── router/
│   │   └── index.js       # 路由配置（Hash模式）
│   ├── utils/
│   │   ├── supabase.js    # Supabase客户端初始化
│   │   └── pinyinSearch.js # 拼音搜索工具
│   ├── api/
│   │   └── index.js       # API层（所有数据库操作）
│   └── pages/
│       ├── Login.vue        # 登录页
│       ├── Home.vue         # 主布局（侧边栏 + 顶部导航）
│       ├── Admin.vue        # 管理员页面（用户管理）
│       ├── Organization.vue # 通讯录页面
│       ├── BusinessInitiate.vue  # 业务端发起沟通
│       ├── BusinessReceive.vue   # 业务端接收消息
│       ├── LabInitiate.vue      # 实验室端发起沟通
│       ├── LabReceive.vue       # 实验室端接收消息
│       ├── Communications.vue    # 沟通记录查看
│       ├── Announcements.vue    # 公告管理
│       ├── Notifications.vue    # 通知中心
│       ├── Orders.vue          # 订单管理
│       ├── History.vue         # 历史记录
│       ├── Profile.vue         # 个人资料编辑
│       └── SentMessages.vue   # 已发送消息
└── dist/                   # 构建输出目录（部署到GitHub Pages）
```

---

## 三、数据库设计（Supabase）

### 3.1 环境配置

**Supabase项目URL**：`https://qgoqhjwekairknkuqisi.supabase.co`

**Anon Key**（前端公开密钥）：
```
sb_publishable_rWISgrBqXWH0qeCnCzYCWQ_atG0teni
```

**环境变量**（`.env` 或 Vite 配置）：
```env
VITE_SUPABASE_URL=https://qgoqhjwekairknkuqisi.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_rWISgrBqXWH0qeCnCzYCWQ_atG0teni
```

### 3.2 数据表结构

#### **表1：profiles（用户资料表）**

| 字段名 | 类型 | 说明 | 备注 |
|--------|------|------|------|
| id | uuid | 主键（关联auth.users.id） | Supabase Auth自动生成 |
| username | text | 登录用户名 | 唯一约束 |
| name | text | 用户真实姓名 | |
| role | text | 角色 | 见"角色权限体系"章节 |
| employee_id | text | 工号 | |
| phone | text | 手机号 | |
| email | text | 邮箱 | |
| region | text | 属地/检测组 | 业务端填属地，实验室端填检测组 |
| department | text | 部门/组别备注 | 补充信息 |
| priority | integer | 优先级 | 1=高，2=中，3=低 |
| is_disabled | boolean | 是否禁用 | 默认false |
| must_change_password | boolean | 是否必须修改密码 | 默认false |
| created_at | timestamp | 创建时间 | |

**索引**：
- `username` 唯一索引
- `email` 唯一索引
- `role` 索引（用于按角色查询）

---

#### **表2：communications（沟通记录表）**

| 字段名 | 类型 | 说明 | 备注 |
|--------|------|------|------|
| id | uuid | 主键 | 默认生成 |
| sender_id | uuid | 发送者ID | 外键→profiles.id |
| title | text | 沟通标题 | |
| content | text | 沟通内容 | |
| type | text | 沟通类型 | 如：常规、紧急、审批等 |
| status | text | 状态 | pending/approved/rejected |
| created_at | timestamp | 创建时间 | |
| updated_at | timestamp | 更新时间 | |

**RLS策略**：
- 发送者可以读写自己的沟通记录
- 接收者可以读取发给自己的沟通记录

---

#### **表3：communication_recipients（沟通接收人表）**

| 字段名 | 类型 | 说明 | 备注 |
|--------|------|------|------|
| id | uuid | 主键 | 默认生成 |
| communication_id | uuid | 沟通记录ID | 外键→communications.id |
| recipient_id | uuid | 接收者ID | 外键→profiles.id |
| is_read | boolean | 是否已读 | 默认false |
| is_flagged | boolean | 是否标记 | 默认false |
| is_completed | boolean | 是否完成 | 默认false |
| has_replied | boolean | 是否已回复 | 默认false |
| created_at | timestamp | 创建时间 | |

**复合索引**：
- `(communication_id, recipient_id)` 联合唯一索引（防止重复发送）

---

#### **表4：replies（回复表）**

| 字段名 | 类型 | 说明 | 备注 |
|--------|------|------|------|
| id | uuid | 主键 | 默认生成 |
| communication_id | uuid | 沟通记录ID | 外键→communications.id |
| sender_id | uuid | 回复者ID | 外键→profiles.id |
| content | text | 回复内容 | |
| created_at | timestamp | 创建时间 | |

---

#### **表5：announcements（公告表）**

| 字段名 | 类型 | 说明 | 备注 |
|--------|------|------|------|
| id | uuid | 主键 | 默认生成 |
| title | text | 公告标题 | |
| content | text | 公告内容 | |
| publisher_id | uuid | 发布者ID | 外键→profiles.id |
| is_pinned | boolean | 是否置顶 | 默认false |
| allow_reaction | boolean | 是否允许点赞 | 默认true |
| reaction_type | text | 点赞类型 | like/heart等 |
| created_at | timestamp | 创建时间 | |
| updated_at | timestamp | 更新时间 | |

---

#### **表6：announcement_reads（公告已读表）**

| 字段名 | 类型 | 说明 | 备注 |
|--------|------|------|------|
| id | uuid | 主键 | 默认生成 |
| announcement_id | uuid | 公告ID | 外键→announcements.id |
| user_id | uuid | 用户ID | 外键→profiles.id |
| read_at | timestamp | 阅读时间 | |

---

#### **表7：notifications（通知表）**

| 字段名 | 类型 | 说明 | 备注 |
|--------|------|------|------|
| id | uuid | 主键 | 默认生成 |
| user_id | uuid | 接收用户ID | 外键→profiles.id |
| type | text | 通知类型 | message/announcement/system等 |
| title | text | 通知标题 | |
| content | text | 通知内容 | |
| is_read | boolean | 是否已读 | 默认false |
| created_at | timestamp | 创建时间 | |

---

#### **表8：orders（订单表）**

| 字段名 | 类型 | 说明 | 备注 |
|--------|------|------|------|
| id | uuid | 主键 | 默认生成 |
| order_no | text | 订单编号 | 唯一约束 |
| customer_name | text | 客户名称 | |
| sample_name | text | 样品名称 | |
| test_items | text | 检测项目 | |
| status | text | 订单状态 | pending/in_progress/completed |
| created_by | uuid | 创建者ID | 外键→profiles.id |
| assigned_to | uuid | 分配给 | 外键→profiles.id |
| created_at | timestamp | 创建时间 | |
| updated_at | timestamp | 更新时间 | |

---

#### **表9：actions（点赞/反应表）**

| 字段名 | 类型 | 说明 | 备注 |
|--------|------|------|------|
| id | uuid | 主键 | 默认生成 |
| user_id | uuid | 用户ID | 外键→profiles.id |
| target_type | text | 目标类型 | announcement/communication等 |
| target_id | uuid | 目标ID | |
| action_type | text | 操作类型 | like/heart等 |
| created_at | timestamp | 创建时间 | |

**复合索引**：
- `(target_type, target_id)` 用于快速查询某目标的点赞列表

---

### 3.3 数据库函数（RPC）

项目中使用了以下数据库函数（需要在Supabase SQL编辑器中创建）：

#### **函数1：admin_create_user**

**用途**：管理员注册新用户（不影响当前管理员session）

**参数**：
- `p_email` (text)
- `p_password` (text)
- `p_username` (text)
- `p_name` (text)
- `p_role` (text)
- `p_employee_id` (text)
- `p_phone` (text)
- `p_region` (text)
- `p_department` (text)
- `p_must_change_pwd` (boolean)

**返回值**：新创建的user对象

---

#### **函数2：delete_user_and_release_email**

**用途**：删除用户并释放邮箱（允许重新注册）

**参数**：
- `target_user_id` (uuid)

**功能**：
1. 更新`auth.users`表中对应用户的email为`deleted_{id}@deleted.local`
2. 更新`profiles`表中对应用户的邮箱和用户名
3. 设置`is_disabled = true`

---

#### **函数3：reset_user_password**

**用途**：管理员重置用户密码为`cti123`

**参数**：
- `target_user_id` (uuid)
- `new_password` (text)

---

### 3.4 数据库迁移文件

项目包含以下SQL迁移文件（位于`frontend/`目录）：

1. **migration_20260605.sql** - 初始数据库结构
2. **fix_recursion.sql** - 修复RLS递归策略
3. **fix_announcement_reads.sql** - 修复公告已读表
4. **supabase_fix_delete_user.sql** - 删除用户函数

**⚠️ 重要**：部署时需要先在Supabase SQL编辑器中运行这些SQL文件！

---

## 四、前端架构

### 4.1 路由设计

| 路径 | 页面组件 | 认证要求 | 说明 |
|------|-----------|----------|------|
| `/login` | Login.vue | 否 | 登录页 |
| `/` | Home.vue | 是 | 主布局（根据角色显示不同菜单） |
| `/admin` | Admin.vue | 是（仅管理员） | 用户管理 |
| `/announcements` | Announcements.vue | 是 | 公告管理 |
| `/profile` | Profile.vue | 是 | 个人资料编辑 |
| `/history` | History.vue | 是 | 历史记录 |
| `/:pathMatch(.*)*` | - | - | 兜底重定向到首页 |

**路由守卫**（`router.beforeEach`）：
1. 检查`supabase.auth.getSession()`是否有效
2. 需要认证的页面未登录→重定向到`/login`
3. 已登录用户访问`/login`→重定向到`/`

---

### 4.2 页面组件详解

#### **4.2.1 Login.vue（登录页）**

**功能**：
- 邮箱+密码登录
- 调用`authAPI.login()`
- 登录成功后将token和user存入localStorage
- 检查`mustChangePassword`标志，强制修改密码

**关键代码**：
```javascript
const { data } = await authAPI.login({ email, password })
localStorage.setItem('token', data.token)
localStorage.setItem('user', JSON.stringify(data.user))
if (data.user.mustChangePassword) {
  router.push('/profile?changePwd=1')
} else {
  router.push('/')
}
```

---

#### **4.2.2 Home.vue（主布局）**

**功能**：
- 左侧菜单栏（根据角色动态显示）
- 顶部导航栏（显示当前用户、切换角色、退出登录）
- 主内容区（`<router-view>`）

**菜单配置**（按角色分类）：

| 角色分类 | 可见菜单 |
|----------|----------|
| 业务端 | 发起沟通、接收消息、通讯录、历史记录 |
| 实验室端 | 发起沟通、接收消息、订单管理、通讯录、历史记录 |
| 管理员 | 用户管理、所有菜单 |

**关键逻辑**：
- `loadUser()` - 加载用户信息（不从菜单修改activeMenu）
- `initMenu()` - 初始化菜单（只在首次挂载时调用）
- `onAuthStateChange` - 监听Token刷新事件（只更新用户信息，不修改菜单）

---

#### **4.2.3 Admin.vue（管理员页面）**

**功能**：
- 用户列表展示（支持搜索、筛选）
- 创建新用户（调用`authAPI.register()`）
- 禁用/启用用户
- 删除用户（调用`userAPI.deleteAccount()`）
- 重置密码为`cti123`

**表单字段**：
- 邮箱（必填）
- 用户名（必填）
- 密码（必填）
- 姓名（必填）
- 角色（必选）
- 工号、手机号、属地/检测组、部门备注（选填）
- 首次登录必须修改密码（复选框）

**角色标签颜色**：
- 业务/业务助理 → `warning`（黄色）
- 实验室端角色 → `success`（绿色）
- 管理员 → `danger`（红色）

---

#### **4.2.4 Organization.vue（通讯录）**

**功能**：
- 按三级架构展示人员：
  - **第一级**：部门（业务/实验室）
  - **第二级**：业务端按属地分组，实验室端按检测组分组
  - **第三级**：个人角色
- 支持搜索（姓名/拼音/部门/角色）
- 点击人员卡片查看详情
- 多选人员后批量发起沟通

**角色名片背景色**：

| 角色 | 背景色 |
|------|--------|
| 业务 | 金色（#FFD700） |
| 业务助理 | 浅金黄色（#FFF8DC） |
| 实验室主管 | 棕色（#8B4513） |
| 实验室主管助理 | 浅棕色（#D2B48C） |
| 客服组长/检测组长/制样组组长/报告组组长 | 蓝色（#409EFF） |
| 组长助理 | 浅蓝色（#87CEEB） |
| 检测工程师/数据二审/报告编制/技术支持 | 浅绿色（#90EE90） |
| 客服 | 淡紫色（#E6E6FA） |

---

#### **4.2.5 BusinessInitiate.vue / LabInitiate.vue（发起沟通）**

**功能**：
- 选择接收人（现在可以选择**任何人**，除自己外）
- 输入标题和内容
- 上传附件（可选）
- 发送沟通记录

**接收人选择优化**（最新版本）：
- 选择框宽度加宽到**600px**
- 移除`collapse-tags`，显示所有已选人员
- 在输入框下方显示**已选人员名片**（姓名+部门+角色+删除按钮）

**关键逻辑**：
- `loadAllUsers()` - 加载所有用户（除自己外）
- `buildSearchKeys()` - 构建搜索关键词（姓名/拼音/部门/角色）
- `filterRecipient()` - 过滤接收人（支持拼音搜索）

---

#### **4.2.6 BusinessReceive.vue / LabReceive.vue（接收消息）**

**功能**：
- 查看收到的沟通消息
- 三个标签页：待处理、已处理、已标记
- 行上快捷按钮：同意/拒绝/标记/完成
- 点击查看详情（弹窗）
- 回复消息

**关键修复**（2026-06-06）：
- 修复了`loadMessages()`中`has_replied`字段漏选的问题
- 现在点击行上快捷按钮后，消息能正确移动到"已处理"标签页

**本地状态更新优化**：
```javascript
// 立即在本地更新状态（不等待服务器同步）
const idx = messages.value.findIndex(m => m.id === msg.id)
if (idx >= 0) {
  messages.value[idx].hasReplied = true
}
Object.assign(msg, { hasReplied: true })

// 延迟刷新列表（给服务器时间同步）
setTimeout(() => loadMessages(), 300)
```

---

#### **4.2.7 Announcements.vue（公告管理）**

**功能**：
- 发布公告（标题+内容+是否允许点赞+是否置顶）
- 查看公告列表（支持置顶、分页）
- 查看公告详情（阅读人数、点赞详情）
- 点赞/取消点赞

**已知问题**：
- 查看点赞详情时可能显示"加载详情失败"（可能是`actions`表结构问题）

---

#### **4.2.8 Profile.vue（个人资料）**

**功能**：
- 查看和编辑个人资料
- 修改密码（首次登录强制修改）
- 属地/检测组字段根据角色动态显示

---

### 4.3 API层设计（src/api/index.js）

**设计模式**：所有数据库操作集中在`api/index.js`中，按功能模块导出：

```javascript
export const authAPI = { ... }       // 认证相关
export const userAPI = { ... }        // 用户管理
export const communicationAPI = { ... } // 沟通记录
export const replyAPI = { ... }       // 回复
export const announcementAPI = { ... } // 公告
export const notificationAPI = { ... }  // 通知
export const orderAPI = { ... }       // 订单
export const reactionAPI = { ... }     // 点赞/反应
export const uploadAPI = { ... }      // 文件上传
```

**关键函数**：

| 函数名 | 用途 | 所在模块 |
|--------|------|----------|
| `authAPI.login()` | 登录 | authAPI |
| `authAPI.register()` | 注册（管理员） | authAPI |
| `userAPI.getAll()` | 获取所有用户 | userAPI |
| `communicationAPI.create()` | 创建沟通记录 | communicationAPI |
| `communicationAPI.getAll()` | 获取沟通记录（含接收人） | communicationAPI |
| `reactionAPI.getDetail()` | 获取点赞详情 | reactionAPI |
| `uploadAPI.upload()` | 上传文件到Supabase Storage | uploadAPI |

---

## 五、角色权限体系

### 5.1 角色分类（三级架构）

#### **第一级：部门**
- **业务端**（business）
- **实验室端**（lab）
- **管理员**（admin）

#### **第二级：属地/检测组**
- **业务端**：属地（如：青岛、哈尔滨等，用户自由填写）
- **实验室端**：检测组（如：有机检测组、无机检测组等，用户自由填写）

#### **第三级：个人角色**

| 角色值 | 角色名称 | 所属部门 | 名片背景色 |
|--------|----------|----------|------------|
| `business` | 业务 | 业务端 | 金色 |
| `business_assistant` | 业务助理 | 业务端 | 浅金黄色 |
| `supervisor` | 实验室主管 | 实验室端 | 棕色 |
| `supervisor_assistant` | 实验室主管助理 | 实验室端 | 浅棕色 |
| `customer_service` | 客服 | 实验室端 | 淡紫色 |
| `cs_leader` | 客服组长 | 实验室端 | 蓝色 |
| `cs_leader_assistant` | 客服组长助理 | 实验室端 | 浅蓝色 |
| `inspection_leader` | 检测组长 | 实验室端 | 蓝色 |
| `inspection_leader_assistant` | 检测组长助理 | 实验室端 | 浅蓝色 |
| `inspection_engineer` | 检测工程师 | 实验室端 | 浅绿色 |
| `sample_prep_leader` | 制样组组长 | 实验室端 | 蓝色 |
| `report_leader` | 报告组组长 | 实验室端 | 蓝色 |
| `data_review` | 数据二审 | 实验室端 | 浅绿色 |
| `report_compiler` | 报告编制 | 实验室端 | 浅绿色 |
| `tech_support` | 技术支持 | 实验室端 | 浅绿色 |
| `admin` | 管理员 | 管理员 | 红色 |

### 5.2 角色辅助函数（api/index.js）

```javascript
// 获取角色显示名
export function getRoleDisplayName(role)

// 获取角色所属部门分类
export function getRoleCategory(role)  // 返回 'business' / 'lab' / 'admin'

// 获取角色名片背景色
export function getRoleCardColor(role)  // 返回 { bg: '#xxx', text: '#xxx' }

// 获取角色标签CSS类名
export function getRoleTagClass(role)

// 角色选项列表（用于下拉框）
export const ROLE_OPTIONS = [ ... ]
```

### 5.3 权限控制

**页面级权限**：
- 使用Vue Router的`meta.requiresAuth`字段
- 管理员页面（`/admin`）在页面内额外检查`user.role === 'admin'`

**功能级权限**：
- 业务端角色只能看到业务端相关菜单
- 实验室端角色只能看到实验室端相关菜单
- 管理员可以看到所有菜单

**数据级权限**（通过Supabase RLS实现）：
- 用户只能读取自己的资料和接收的消息
- 用户只能修改自己的资料
- 管理员通过数据库函数（`admin_create_user`等）绕过RLS进行用户管理

---

## 六、部署方案

### 6.1 GitHub Pages部署

**仓库地址**：`https://github.com/ctiduning/lab-communication`

**部署流程**：
1. 代码推送到`main`分支
2. GitHub Actions自动触发构建
3. 构建输出（`dist/`目录）部署到GitHub Pages
4. 访问地址：`https://ctiduning.github.io/lab-communication/#/login`

**Vite配置**（`vite.config.js`）：
```javascript
export default defineConfig({
  base: '/lab-communication/',  // GitHub Pages仓库名
  // ...
})
```

**GitHub Actions配置**（`.github/workflows/deploy.yml`）：
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 6.2 本地开发

**启动开发服务器**：
```bash
cd D:/game/实验室沟通/frontend
npm run dev
```

**构建生产版本**：
```bash
npm run build   # 输出到 dist/ 目录
```

**预览生产版本**：
```bash
npm run preview
```

---

## 七、关键配置和注意事项

### 7.1 Supabase Storage配置

**Bucket名称**：`attachments`

**公开访问**：需要确保bucket设置为公开读取（或配置适当的访问策略）

**文件上传路径**：`attachments/{timestamp}_{random}.{ext}`

### 7.2 环境变量

**前端（Vite）**：
```env
# .env
VITE_SUPABASE_URL=https://qgoqhjwekairknkuqisi.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_rWISgrBqXWH0qeCnCzYCWQ_atG0teni
```

**⚠️ 注意**：Anon Key是公开的，没问题。但不要在前端使用Service Role Key！

### 7.3 常见问题和解决方案

#### **问题1：登录后菜单自动跳转到"发起沟通"**

**原因**：`supabase.auth.onAuthStateChange`的`TOKEN_REFRESHED`事件会调用`loadUser()`，而`loadUser()`会覆盖`activeMenu`。

**解决方案**：将菜单初始化逻辑从`loadUser()`中拆出为独立的`initMenu()`函数。`onAuthStateChange`只调用`loadUser()`更新用户信息，不再修改菜单。

---

#### **问题2：点击"同意"按钮后，消息仍然留在"待处理"列表中**

**原因**：`api/index.js`的`getAll()`函数在查询`communication_recipients`时，漏选了`has_replied`字段。导致`loadMessages()`从服务器获取数据时，`hasReplied`永远是`false`，覆盖了本地临时设置的状态。

**解决方案**：在`api/index.js`第342行添加`has_replied`字段到查询中。

---

#### **问题3：GitHub Pages 404错误**

**原因**：Vue Router使用Hash模式（`createWebHashHistory`），但GitHub Pages可能尝试读取实际文件路径。

**解决方案**：确保`vite.config.js`中`base`配置正确，并使用Hash路由（已经在用）。

---

#### **问题4：切换程序后回来，页面自动跳转**

**原因**：见问题1。

**解决方案**：见问题1。

---

## 八、重现项目步骤

如果你需要在一个新环境中重现这个项目，请按以下步骤操作：

### 步骤1：创建Supabase项目

1. 访问 https://supabase.com 并登录
2. 创建新项目（项目名称：lab-communication）
3. 记录项目的URL和Anon Key

### 步骤2：运行数据库迁移SQL

1. 打开Supabase控制台的"SQL Editor"
2. 依次运行以下SQL文件（位于`frontend/`目录）：
   - `migration_20260605.sql`
   - `fix_recursion.sql`
   - `fix_announcement_reads.sql`
   - `supabase_fix_delete_user.sql`
3. 手动创建以下数据库函数（如果SQL文件中没有）：
   - `admin_create_user`
   - `delete_user_and_release_email`
   - `reset_user_password`

### 步骤3：配置Supabase Storage

1. 打开Supabase控制台的"Storage"
2. 创建名为`attachments`的bucket
3. 设置bucket为公开读取（或配置RLS策略）

### 步骤4：克隆前端代码

```bash
git clone https://github.com/ctiduning/lab-communication.git
cd lab-communication/frontend
```

### 步骤5：安装依赖

```bash
npm install
```

### 步骤6：配置环境变量

创建`.env`文件：

```env
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_ANON_KEY=你的Supabase Anon Key
```

### 步骤7：构建并部署

**本地测试**：
```bash
npm run dev
```

**部署到GitHub Pages**：
1. 修改`vite.config.js`中的`base`为你的仓库名
2. 推送代码到GitHub的`main`分支
3. 等待GitHub Actions自动构建和部署

---

## 九、未来改进建议

1. **后端API**：目前所有数据库操作都在前端通过Supabase JS客户端完成，建议后续增加后端API层（如Node.js + Express）以提高安全性。

2. **类型安全**：引入TypeScript（已经完成）和类型定义文件，减少运行时错误。

3. **测试**：增加单元测试（Jest）和E2E测试（Cypress）。

4. **性能优化**：
   - 图片懒加载
   - 虚拟滚动（长列表）
   - 代码分割（按需加载）

5. **PWA支持**：添加Service Worker，支持离线访问。

6. **国际化**：如果未来有外部客户使用，增加英文语言包。

---

## 十、附录

### 附录A：常用Git命令

```bash
# 查看状态
git status

# 添加所有修改
git add -A

# 提交
git commit -m "feat: 描述本次修改"

# 推送到远程
git push origin HEAD:main

# 查看历史提交
git log --oneline
```

### 附录B：Supabase CLI（可选）

如果需要本地开发Supabase，可以安装Supabase CLI：

```bash
# 安装Supabase CLI
npm install -g supabase

# 初始化Supabase（在项目根目录）
supabase init

# 启动本地Supabase
supabase start

# 停止本地Supabase
supabase stop
```

### 附录C：联系人信息

如有问题，可以联系项目维护者：
- **GitHub**：ctiduning
- **仓库**：https://github.com/ctiduning/lab-communication

---

**文档结束**

> **最后更新**：2026-06-06
>
> **文档版本**：v1.0
>
> 如果任何AI或开发者阅读此文档后无法重现项目，请更新此文档以补充遗漏的信息。
