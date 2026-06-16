# 青岛华测实验室沟通系统 - 前端代码库分析

> 分析日期：2026-06-12

---

## 1. 项目总览

| 项目 | 说明 |
|------|------|
| **项目名称** | 青岛华测实验室沟通系统 (QDCTI Laboratory Communication System) |
| **技术栈** | Vue 3 + Vite + Element Plus + Supabase |
| **部署方式** | GitHub Pages (Hash 路由) |
| **后端** | Supabase (PostgreSQL + Auth + Storage + Realtime) |

---

## 2. 文件详细分析

### 2.1 `router/index.js` — 路由配置

**路径**: `src/router/index.js`  
**用途**: 定义所有前端路由及导航守卫

**关键导出**:
- `default`: Vue Router 实例

**路由表**:

| 路径 | 名称 | 组件 | 需要认证 |
|------|------|------|----------|
| `/login` | Login | `Login.vue` | 否 |
| `/` | Home | `Home.vue` | 是 |
| `/admin` | Admin | `Admin.vue` | 是 |
| `/announcements` | Announcements | `Announcements.vue` | 是 |
| `/profile` | Profile | `Profile.vue` | 是 |
| `/history` | History | `History.vue` | 是 |
| `/business-initiate` | BusinessInitiate | `BusinessInitiate.vue` | 是 |
| `/lab-initiate` | LabInitiate | `LabInitiate.vue` | 是 |
| `/:pathMatch(.*)*` | — | 重定向到 `/` | — |

**导航守卫逻辑**:
1. 先检查 `localStorage` 中是否有 Supabase token (`sb-qgoqhjwekairknkuqisi-auth-token`)
2. 再用 `supabase.auth.getSession()` 服务端验证 session
3. 未认证用户重定向到 `/login`
4. 已登录用户访问 `/login` 时重定向到首页

**关键依赖**: `vue-router`, `supabase`

---

### 2.2 `main.js` — 应用入口

**路径**: `src/main.js`  
**用途**: Vue 应用初始化入口点

**关键操作**:
1. 创建 Vue 应用实例
2. 注册 Element Plus 插件（含 CSS）
3. 注册 Vue Router
4. 挂载到 `#app` DOM 元素

**关键依赖**: `vue`, `element-plus`, `vue-router`

---

### 2.3 `App.vue` — 根组件

**路径**: `src/App.vue`  
**用途**: 应用根组件，提供路由视图容器

**模板结构**:
- `<router-view>` 配合 `<transition name="fade">` 实现页面切换淡入淡出动画

**全局样式**:
- 重置 `margin/padding/box-sizing`
- 字体栈: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`

**关键依赖**: `vue-router`

---

### 2.4 `utils/supabase.js` — Supabase 客户端

**路径**: `src/utils/supabase.js`  
**用途**: 初始化 Supabase 客户端实例

**关键导出**:
- `supabase`: Supabase 客户端实例

**配置**:
- URL: `import.meta.env.VITE_SUPABASE_URL` (默认: `https://qgoqhjwekairknkuqisi.supabase.co`)
- Anon Key: `import.meta.env.VITE_SUPABASE_ANON_KEY` (默认: `sb_publishable_rWISgrBqXWH0qeCnCzYCWQ_atG0teni`)

**关键依赖**: `@supabase/supabase-js`

---

### 2.5 `api/index.js` — API 层 (单文件，~2200+ 行)

**路径**: `src/api/index.js`  
**用途**: 所有后端 API 调用的封装层，涵盖认证、用户、沟通、通知、反应等模块

**关键导出**:

| 导出 | 用途 |
|------|------|
| `authAPI` | 注册、登录、登出、获取会话、获取当前用户 |
| `userAPI` | 获取/更新用户、禁用/启用、删除、重置密码、更新活跃时间 |
| `communicationAPI` | 沟通记录 CRUD、回复、红旗、完结、撤回、编辑、分页、存储管理 |
| `announcementAPI` | 公告 CRUD、已读/未读状态、红旗标记 |
| `notificationAPI` | 通知获取、已读标记、删除 |
| `storageAPI` | 文件上传/删除 (Supabase Storage) |
| `reactionAPI` | 点赞/点踩 toggle、批量获取统计、管理员查看详情 |
| `departmentCardAPI` | 部门名片获取、验证、持有人查询、CardKey 映射 |
| `adminLogAPI` | 管理员操作日志记录/查询 |
| `backupAPI` | 全数据备份 |
| `messageReadsAPI` | 消息已读回执 |
| `departmentAPI` | 三级部门架构管理 |
| `ROLE_OPTIONS` | 角色定义数组 (`business`, `supervisor`, `inspection_leader`, 等) |
| `getRoleDisplayName()` | 角色 value → 中文 label |
| `getRoleCategory()` | 角色/departmentLevel1 → 导航分类 (`admin`/`business`/`lab`) |
| `subscribeToTable()` | 通用 Supabase Realtime 订阅 |

**数据流模式**:
- 所有 API 模块使用 Supabase JS SDK 直接操作数据库（**无需独立后端服务器**）
- 采用单文件 API 组织模式（约 2200 行），未拆分模块
- 内置 `cachedUserId` 缓存机制，避免重复调用 `supabase.auth.getUser()`
- 使用 `formatProfile()` 辅助函数将数据库 snake_case 字段转为 camelCase

**关键依赖**: `@supabase/supabase-js`

---

### 2.6 `pages/Login.vue` — 登录页

**路径**: `src/pages/Login.vue`  
**用途**: 用户登录界面

**模板结构**:
- 渐变背景 (`#667eea → #764ba2`)
- 白色卡片，内含表单：邮箱输入、密码输入（可切换明文）、记住我复选框、登录按钮
- "首次登录请联系管理员获取初始密码" 提示

**脚本逻辑**:
- 使用 `authAPI.login()` 调用 Supabase 认证
- 登录前先清除旧 session 防止串号
- 检查用户是否被禁用（`isDisabled`）
- 检查是否需要强制修改密码（`mustChangePassword`）
- "记住我" 功能：存储邮箱和密码到 localStorage
- 登录成功后延迟 800ms 跳转到首页

**关键依赖**: `ElementPlus`, `@element-plus/icons-vue`, `authAPI`

---

### 2.7 `pages/Home.vue` — 首页/仪表盘 (~605 行)

**路径**: `src/pages/Home.vue`  
**用途**: 应用主框架，包含顶部导航栏、侧边栏、内容区域

**模板结构**:
- `<el-header>`: 渐变背景，显示标题、用户欢迎信息、角色切换器（管理员专用）、退出按钮
- `<el-aside>` (桌面端) / `<el-drawer>` (移动端): 侧边栏菜单
- `<el-main>`: 通过 `<component :is="currentComponent">` 动态渲染子页面

**侧边栏菜单项 (按角色)**:

| 角色分类 | 菜单项 |
|----------|--------|
| 业务端 (business) | 通知公告、发起沟通、接收消息、已发送消息、通讯录、个人设置 |
| 实验室端 (lab) | 通知公告、发起沟通、接收消息、已发送消息、通讯录、个人设置 |
| 管理员 (admin) | 通知公告、用户管理、通讯录、个人设置 |

**关键功能**:
- **角色切换器**: 管理员可在"管理员视图/业务端视图/实验室视图"间切换，视图角色保存在 `localStorage`
- **未读计数**: 实时显示未读公告数、待处理消息数、新回复数
- **Realtime 订阅**: 监听 `communications` 表和 `communication_recipients` 表变更
- **preselectRecipients**: 通过 `provide/inject` 向子页面传递预选接收人数据（从通讯录跳转）
- **用户缓存**: 使用 `sessionStorage.getItem('cachedUser')` 缓存用户信息，减少服务端请求
- **5分钟心跳**: 每 5 分钟调用 `userAPI.updateLastActive()` 更新用户活跃时间
- **异步组件加载**: 所有子页面使用 `defineAsyncComponent` 按需加载

**关键依赖**: `ElementPlus`, `vue-router`, `@element-plus/icons-vue`, `supabase`

---

### 2.8 `pages/BusinessInitiate.vue` — 业务端发起沟通 (~862 行)

**路径**: `src/pages/BusinessInitiate.vue`  
**用途**: 业务端人员发起沟通请求的表单页面

**表单字段**:

| 字段 | 类型 | 说明 |
|------|------|------|
| 沟通类型 | select | 付费加急/免费加急/数据质疑/跟单/咨询/其他 |
| 消息内容 | textarea | 沟通正文 |
| 是否为V1V2客户 | select | 是/否 |
| 客户名称 | input | — |
| 样品短号 | input | 未进单可空 |
| 样品基质 | input | — |
| 样品数量 | number | — |
| 测试项目 | input | — |
| 到样日期 | date | — |
| 想要的测试周期 | input | — |
| 测试费用 | input | — |
| 收取的加急费用 | number | — |
| 备注 | textarea + 图片上传 | 支持图片附件 |
| 消息接收人 | select 多选 (拼音搜索) | 按角色分组 |
| 按部门发起沟通 | select 多选 | 部门名片，发至组长+组长助理 |

**脚本逻辑**:
- **拼音搜索**: 使用 `buildSearchKeys` 预计算拼音首字母/全拼，支持 "jw→姜伟" 式搜索
- **部门名片**: 选择部门后自动添加组长和组长助理为接收人；取消部门名片时同步移除
- **草稿箱**: 保存/加载/删除草稿（localStorage，key: `biz_initiate_draft`）
- **撤回编辑**: 检测 `localStorage` 中的 `recalledMessageEdit`，加载撤回消息重发
- **双重上传**: 标准 `<el-upload>` + Chrome 专用 File System Access API (`showOpenFilePicker`)
- **预选接收人**: 通过 `inject('preselectRecipients')` 从通讯录页面接收预选数据

**关键依赖**: `ElementPlus`, `communicationAPI`, `storageAPI`, `departmentCardAPI`, `departmentConfig`, `pinyinSearch`

---

### 2.9 `pages/BusinessReceive.vue` — 业务端接收消息 (~1362 行)

**路径**: `src/pages/BusinessReceive.vue`  
**用途**: 业务端人员的消息收件箱

**模板结构**:
- 5 个标签页: 待处理 / 已处理 / 已完结 / 已被撤回 / 全部
- 搜索栏 + 仅红旗过滤
- 表格支持行点击查看详情、快捷回复按钮
- 详情弹窗显示发送人信息、沟通信息、附件、接收人状态、回复 Thread

**脚本逻辑**:
- **状态计算**: 每个消息通过 computed 判断 `myRead`, `hasReplied`, `myCompleted`, `isCompleted`, `hasFlagged`
- **分页**: 每页 50 条，支持"加载更多"
- **快捷回复**: "同意"/"拒绝"/"等我确认后回复" 三键快速回复
- **回复 Thread 视图**: 区分"回复全部接收人"和"按接收人分组的 Thread"
- **点赞/点踩**: 回复内容支持 👍/👎（toggle 逻辑）
- **文件下载**: 使用 Supabase Storage 签名 URL（60 分钟有效期）
- **Realtime 订阅**: 监听 `communications` 和 `communication_recipients` 表变化

**关键依赖**: `communicationAPI`, `userAPI`, `reactionAPI`, `supabase`

---

### 2.10 `pages/LabInitiate.vue` — 实验室端发起沟通 (~735 行)

**路径**: `src/pages/LabInitiate.vue`  
**用途**: 实验室端人员发起沟通的表单页面

**与业务端差异**:
- 沟通类型仅三种: 不合格沟通 / 数据确认 / 其他沟通
- 表单字段较少: 样品短号 + 沟通内容（含附件） + 消息接收人 + 部门名片
- 独立的草稿箱 localStorage key: `lab_initiate_draft`
- 有图片预览弹窗（业务端无此功能）

**其余逻辑与 `BusinessInitiate.vue` 高度相似**: 拼音搜索、部门名片管理、撤回编辑恢复、预选接收人、File System Access API 等

**关键依赖**: `ElementPlus`, `communicationAPI`, `storageAPI`, `departmentCardAPI`, `pinyinSearch`, `departmentConfig`

---

### 2.11 `pages/LabReceive.vue` — 实验室端接收消息 (~1249 行)

**路径**: `src/pages/LabReceive.vue`  
**用途**: 实验室端人员的消息收件箱

**与业务端差异**:
- 同样 5 个标签页: 待处理 / 已处理 / 已完结 / 已被撤回 / 全部
- 已处理和已完结标签页多一列"是否已读"
- 无分页（全部加载）
- 快捷回复逻辑与业务端相同

**关键依赖**: `communicationAPI`, `userAPI`, `reactionAPI`, `supabase`

---

### 2.12 `pages/SentMessages.vue` — 已发送消息 (~989 行)

**路径**: `src/pages/SentMessages.vue`  
**用途**: 查看已发出的沟通记录、回复状态、撤回消息

**模板结构**:
- 筛选标签: 全部/未回复/已回复/已完结/已撤回
- 搜索栏 + 表格
- 详情弹窗: 基本信息、接收人状态（含部门名片分组）、回复记录
- 撤回原因弹窗、追加回复弹窗

**脚本逻辑**:
- **按部门分组展示**: 部门名片的接收人按 `department_level3` 分组显示
- **撤回功能**: 5 分钟内可撤回，需填写原因，撤回后发系统通知给所有相关人
- **编辑重发**: 撤回的消息可点击"编辑重发"，跳转到发起沟通页面并填充原数据
- **追加回复**: 已回复且未完结的消息，发件人可追加回复，并重置所有接收人的完结状态
- **Realtime 订阅**: 监听 `communications` 和 `communication_recipients` 表更新

**关键依赖**: `communicationAPI`, `supabase`

---

### 2.13 `pages/Admin.vue` — 管理员页面 (~1900 行)

**路径**: `src/pages/Admin.vue`  
**用途**: 系统管理控制台

**标签页**:
1. **用户管理**: 添加用户（单个/Excel批量导入）、搜索、禁用/启用、重置密码、删除账号
2. **沟通记录**: 分页查看所有沟通记录
3. **通知管理**: 分页查看所有通知
4. **统计**: 多维度统计（发起人/接收人/按组/同意），可导出Excel
5. **存储管理**: 数据库和文件存储状态监控、旧数据清理、一键备份

**脚本逻辑**:
- **Excel 批量注册**: 使用 `xlsx` 库解析 Excel，支持用户已存在时自动更新 profile
- **统计功能**: 按时间范围/人员/沟通类型过滤，生成 4 张统计表格
- **一键备份**: 导出所有用户、沟通记录、回复、通知为多 Sheet Excel
- **存储监控**: 实时显示 Supabase 数据库和存储空间的用量和限制

**关键依赖**: `ElementPlus`, `xlsx`, `communicationAPI`, `userAPI`, `authAPI`, `departmentConfig`, `adminLogAPI`

---

### 2.14 `pages/Announcements.vue` — 通知公告 (~762 行)

**路径**: `src/pages/Announcements.vue`  
**用途**: 查看和管理系统通知公告

**功能**:
- 管理员可发布/编辑/删除公告
- 支持发送范围选择（全部/仅业务端/仅实验室端）
- 公告可附带图片附件
- 点赞/点踩（👍/👎），管理员可查看详情
- 红旗标记、已读/未读状态
- 搜索过滤、批量删除
- 实时订阅新增/修改/删除公告

**关键依赖**: `announcementAPI`, `reactionAPI`, `storageAPI`, `supabase`

---

### 2.15 `pages/Profile.vue` — 个人设置 (~280 行)

**路径**: `src/pages/Profile.vue`  
**用途**: 用户修改个人资料和密码

**左右两栏布局**:
- **基本信息**: 姓名（只读）、工号（只读）、一级部门/二级部门/三级部门/角色（联动选择+手动输入）、电话、邮箱（只读）、创建时间（只读）
- **修改密码**: 当前密码、新密码、确认新密码（含验证规则）

**脚本逻辑**:
- 从 localStorage 读取 user 缓存
- 调用 `userAPI.getById()` 获取完整资料
- 支持 `allow-create` 方式手动输入二级/三级部门
- 密码修改直接调用 `supabase.auth.updateUser()`

**关键依赖**: `ElementPlus`, `userAPI`, `supabase`, `departmentConfig`

---

### 2.16 `pages/Organization.vue` — 通讯录 (~1376 行)

**路径**: `src/pages/Organization.vue`  
**用途**: 组织架构查看和人员多选发起沟通

**布局**:
- 左右固定两栏：左侧"业务端" + 右侧"实验室端"
- 业务端按属地（三级部门）分组，实验室端按二级→三级两级分组
- 支持搜索（姓名、工号、部门、电话）
- 人员卡片可点击选中，已选人员展示栏实时更新
- 实验室端显示"部门名片"卡片（组长+组长助理）

**功能**:
- **多选模式**: 可同时选择业务人员、实验室人员、部门名片
- **快捷发起沟通**: 点击按钮后跳转到发起沟通页面，自动填充选中人员
- **角色头像颜色**: 不同角色有专属头像/标签颜色配置（金色/棕色/蓝色/绿色/紫色/红色）
- **详情弹窗**: 查看人员姓名、工号、角色、部门、邮箱、电话

**关键依赖**: `ElementPlus`, `vue-router`, `supabase`, `departmentCardAPI`

---

### 2.17 `pages/History.vue` — 历史消息 (~225 行)

**路径**: `src/pages/History.vue`  
**用途**: 查看已解决或已完结的沟通记录

**功能**:
- 类型筛选（全部/加急/延迟沟通/提前出报告/不合格确认/其他）
- 状态筛选（全部/已解决/已回复）
- 搜索（内容或客户）
- 卡片列表显示，点击查看详情
- 详情弹窗显示沟通内容、附件、回复记录

**关键依赖**: `communicationAPI`, `userAPI`

---

### 2.18 `composables/useApi.js` — API 安全调用

**路径**: `src/composables/useApi.js`  
**用途**: 提供 `safeCall` 和 `safeCallWithResult` 工具函数

**函数**:
- `safeCall(apiCall, options)`: 捕获异常，自动显示 Element Plus 错误提示
- `safeCallWithResult(apiCall, options)`: 返回标准化 `{ data, error }` 对象

**关键依赖**: `ElementPlus`

---

### 2.19 `composables/useDebounce.js` — 防抖搜索

**路径**: `src/composables/useDebounce.js`  
**用途**: 输入防抖工具函数

**导出**:
- `useDebouncedSearch(delay)`: 返回 `{ input, debouncedValue }`

**逻辑**: 在输入变化后延迟指定毫秒（默认 300ms）更新防抖值

**关键依赖**: `vue`

---

### 2.20 `utils/departmentConfig.js` — 部门架构配置

**路径**: `src/utils/departmentConfig.js`  
**用途**: 三级部门架构的静态配置数据

**数据**:
- `DEPARTMENT_LEVEL1`: `['业务', '实验室']`
- `BUSINESS_LEVEL2`: 食品产品线、特食及日化产品线、饲料产品线、农产品产品线、其他产品线
- `LAB_LEVEL2`: 青岛食品实验室、青岛食品大客户实验室
- `LAB_LEVEL3`: 企业气相组、企业液相组、政府气相组、政府液相组、综合组、理化组、营养标签组、包材组、分子生物组、元素组、微生物组、标签审核组、放射性检测组、客服组、制样组、报告组
- `BUSINESS_ROLES`: 业务、业务助理
- `LAB_ROLES`: 实验室主管、实验室主管助理、检测组长、检测组长助理、检测工程师

**函数**:
- `getLevel2Options(level1)`: 根据一级部门返回二级部门选项
- `getLevel3Options(level1)`: 根据一级部门返回三级部门选项（业务端返回空数组，允许手动输入）
- `getRoleOptions(level1)`: 根据一级部门返回角色选项
- `isLevel3ManualInput(level1)`: 判断三级部门是否为手动输入（业务端）
- `isDepartmentCardRole(role)`: 判断是否为部门名片角色（检测组长/检测组长助理）
- `getDepartmentCardHolders(level3, allUsers)`: 获取某三级部门的所有名片持有人

---

### 2.21 `utils/pinyinSearch.js` — 拼音搜索工具

**路径**: `src/utils/pinyinSearch.js`  
**用途**: 实现中文拼音模糊搜索

**引用库**: `pinyin-pro` (v3.28.1)

**函数**:
- `buildSearchKeys(user, roleNameMap)`: 为用户对象预计算搜索关键词（姓名拼音首字母、全拼、部门拼音、角色拼音、地区拼音）
- `matchUser(query, searchKeys)`: 模糊+拼音匹配（5 种匹配策略）
- `filterUsers(query, users)`: 按搜索词过滤用户列表
- `filterGroups(query, groups)`: 按搜索词过滤分组用户列表（空组自动移除）

**支持场景**:
- 输入 "jw" 匹配 "姜伟"
- 输入 "jiang" 匹配 "姜伟"
- 输入 "wei" 匹配 "姜伟"
- 输入 "液相" 匹配液相组所有人
- 输入 "检测组长" 匹配角色

---

### 2.22 `vite.config.js` — Vite 构建配置

**路径**: `frontend/vite.config.js`  
**用途**: Vite 构建工具配置

**配置项**:
- `base`: `/lab-communication/`（GitHub Pages 部署）
- `plugins`: Vue 插件
- `build.rollupOptions.output.manualChunks`: 代码分割（vendor-vue, vendor-element, vendor-supabase, page-admin）
- `build.minify`: terser（压缩）
- `build.terserOptions`: 压缩时移除 `console.log` 和 `debugger`
- `resolve.alias`: `@` 指向 `./src`

---

### 2.23 `package.json` — 项目依赖

**路径**: `frontend/package.json`  
**名称**: `lab-approval-frontend`（实际是沟通系统）

**脚本**:
- `dev`: `vite`（开发服务器）
- `build`: `vite build`（生产构建）
- `preview`: `vite preview`（预览构建结果）

**核心依赖**:
| 包名 | 版本 | 用途 |
|------|------|------|
| `vue` | ^3.3.13 | 前端框架 |
| `vue-router` | ^4.2.5 | 路由 |
| `element-plus` | ^2.5.1 | UI 组件库 |
| `@supabase/supabase-js` | ^2.107.0 | Supabase 后端 |
| `axios` | ^1.6.5 | HTTP 请求（备用） |
| `pinyin-pro` | ^3.28.1 | 拼音搜索 |
| `xlsx` | ^0.18.5 | Excel 导入导出 |
| `moment` | ^2.29.4 | 时间处理 |

**开发依赖**:
| 包名 | 用途 |
|------|------|
| `vite` | 构建工具 |
| `@vitejs/plugin-vue` | Vue 支持 |
| `terser` | 代码压缩 |
| `vitest` | 测试框架 |
| `happy-dom` / `jsdom` | 测试 DOM 环境 |
| `@vue/test-utils` | Vue 组件测试工具 |

---

### 2.24 `.github/workflows/deploy.yml` — CI/CD

**路径**: `frontend/.github/workflows/deploy.yml`  
**用途**: GitHub Actions 自动部署到 GitHub Pages

**触发条件**: 推送 `main` 分支

**作业流水**:
1. **Build**: 使用 Node 22，安装依赖、构建、上传 Pages artifact
2. **Deploy**: 依赖 Build，部署到 GitHub Pages

**环境变量**: 通过 GitHub Secrets 注入 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY`

---

### 2.25 数据库迁移脚本

**路径**: `supabase/migrations/20260612000001_add_performance_indexes.sql`  
**用途**: 性能优化，添加数据库索引

**索引列表**:

| 表 | 索引名 | 列 | 用途 |
|----|--------|----|------|
| `communications` | `idx_communications_sender_id` | `sender_id` | 按发送人过滤 |
| `communications` | `idx_communications_is_recalled` | `is_recalled` | 撤回消息过滤 |
| `communication_recipients` | `idx_comm_recipients_comm_id_recipient_id` | `(communication_id, recipient_id)` | 最频繁 JOIN/过滤 |
| `replies` | `idx_replies_communication_id` | `communication_id` | 按沟通ID查回复 |
| `notifications` | `idx_notifications_user_id_is_read` | `(user_id, is_read)` | 按用户+已读状态 |
| `reactions` | `idx_reactions_target` | `(target_type, target_id)` | 按目标类型+ID组合查询 |
| `announcement_reads` | `idx_announcement_reads_user_id_announcement_id` | `(user_id, announcement_id)` | 用户公告已读状态 |

---

## 3. 数据模型概览

### 3.1 核心数据库表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `profiles` | 用户资料 | id, name, role, employee_id, department_level1/2/3, email, phone, is_disabled, last_active_at |
| `communications` | 沟通记录 | id, sender_id, type, content, customer_name, sample_code, attachments, is_completed, is_recalled, recall_reason, has_new_reply |
| `communication_recipients` | 沟通接收人 | communication_id, recipient_id, is_read, has_replied, is_completed, is_flagged, replied_by, has_new_reply |
| `replies` | 回复记录 | id, communication_id, sender_id, content, target_recipient_id, created_at |
| `announcements` | 通知公告 | id, title, content, sender_id, target_role, attachments |
| `announcement_reads` | 公告已读 | announcement_id, user_id, read_at, is_flagged |
| `notifications` | 系统通知 | id, user_id, type, content, is_read, communication_id |
| `reactions` | 点赞/点踩 | id, user_id, target_type, target_id, reaction_type |
| `admin_logs` | 管理员日志 | id, admin_id, action, target_user_id, target_user_name, detail |

### 3.2 沟通类型枚举

| 英文值 | 中文名 | 发送端 |
|--------|--------|--------|
| `paid_urgent` | 付费加急 | 业务端 |
| `free_urgent` | 免费加急 | 业务端 |
| `data_dispute` | 数据质疑 | 业务端 |
| `follow_up` | 跟单 | 业务端 |
| `consultation` | 咨询 | 业务端 |
| `other` | 其他 | 业务端/实验室端 |
| `unqualified` | 不合格沟通 | 实验室端 |
| `data_confirm` | 数据确认 | 实验室端 |

### 3.3 角色系统

| 英文值 | 中文名 | 所属端 | 导航分类 |
|--------|--------|--------|----------|
| `admin` | 管理员 | admin | admin |
| `business` | 业务 | 业务 | business |
| `business_assistant` | 业务助理 | 业务 | business |
| `supervisor` | 实验室主管 | 实验室 | lab |
| `supervisor_assistant` | 实验室主管助理 | 实验室 | lab |
| `inspection_leader` | 检测组长 | 实验室 | lab |
| `inspection_leader_assistant` | 检测组长助理 | 实验室 | lab |
| `inspection_engineer` | 检测工程师 | 实验室 | lab |
| `customer_service` | 客服 | 实验室 | lab |
| `cs_leader` | 客服组长 | 实验室 | lab |
| `cs_leader_assistant` | 客服组长助理 | 实验室 | lab |
| `sample_prep_leader` | 制样组组长 | 实验室 | lab |
| `report_leader` | 报告组组长 | 实验室 | lab |
| `data_review` | 数据二审 | 实验室 | lab |
| `report_compiler` | 报告编制 | 实验室 | lab |
| `tech_support` | 技术支持 | 实验室 | lab |

---

## 4. 架构特点与模式

### 4.1 架构模式
- **无独立后端**: 前端直接通过 Supabase JS SDK 操作数据库（BaaS 模式）
- **单文件 API**: 所有 API 调用集中在 `api/index.js`（2200+ 行），未按模块拆分
- **Hash 路由**: 使用 `createWebHashHistory()`，兼容 GitHub Pages 静态部署

### 4.2 通信模式
- **实时推送**: 使用 Supabase Realtime 订阅（PostgreSQL 逻辑复制），多个频道独立运行
- **缓存策略**: 两层缓存（localStorage 持久 + sessionStorage 会话）减少 Supabase 请求

### 4.3 认证与授权
- **Supabase Auth**: 邮箱+密码认证
- **前端授权**: 通过 `getRoleCategory()` 函数的 role + departmentLevel1 判断分类
- **视图角色**: 管理员可切换为业务端/实验室端视图（虚拟角色）

### 4.4 搜索实现
- **拼音搜索**: 使用 `pinyin-pro` 库预计算拼音首字母和全拼，5 种匹配策略
- **模糊搜索**: 多字段（内容、客户名称、样品短号、回复内容等）模糊匹配

### 4.5 文件处理
- **上传**: `<el-upload>` 标准上传 + Chrome File System Access API 增强
- **存储**: Supabase Storage (`attachments` 桶)
- **下载**: 生成 60 分钟有效期的签名 URL，确保安全性
- **导出**: 使用 `xlsx` 库导出 Excel（沟通记录、统计、备份）

---

## 5. 未包含在分析范围中的文件

以下文件也被频繁引用但不在本次分析范围内：
- `src/api/index.js` — 已包含在上述分析中（2.5 节）
- `src/style.css` — 全局样式文件（未读取）
- `src/pages/` 下其他 Vue 组件（已全量读取）

---

## 6. 建议

1. **API 文件拆分**: `api/index.js` 2200+ 行建议按模块拆分为 `auth.js`、`communications.js`、`users.js`、`announcements.js` 等独立文件
2. **路由守卫优化**: 双重 token 检查可优化为单次检查
3. **TypeScript 迁移**: 当前全项目为 JS，引入 TypeScript 可大幅提升可维护性
4. **组件抽象**: `BusinessReceive.vue` 和 `LabReceive.vue` 大量重复代码，可抽象为共享组件
5. **测试覆盖**: 项目中测试框架（vitest）已配置但未见实际测试用例
