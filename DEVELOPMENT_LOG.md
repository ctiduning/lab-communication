# 青岛华测实验室沟通系统 - 开发日志

> 最后更新：2026-06-17

---

## 一、项目概述

| 项目 | 内容 |
|------|------|
| **项目名称** | 青岛华测实验室沟通系统 |
| **英文名称** | QDCTI Laboratory Communication System |
| **技术栈** | Vue 3 + Vite + Element Plus + Supabase |
| **部署方式** | GitHub Pages |
| **后端服务** | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| **代码仓库** | `https://github.com/ctiduning/lab-communication` |
| **目标用户** | 青岛华测食品检测实验室内部员工 |

### 系统定位

实验室内部沟通协作平台，替代传统邮件/微信等非正式沟通渠道，实现检测业务中"付费加急、数据质疑、不合格沟通、数据确认"等场景的结构化沟通流程管理。

---

## 二、技术架构

### 2.1 前端架构

```
┌─────────────────────────────────────────────────────────────┐
│  Vue 3 (Composition API + <script setup>)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Element Plus UI 组件库                                │   │
│  │  ┌───────┐ ┌──────────┐ ┌────────┐ ┌───────────┐   │   │
│  │  │ 路由   │ │ API 层   │ │ 工具集  │ │ 页面组件  │   │   │
│  │  │router/ │ │api/     │ │utils/  │ │pages/    │   │   │
│  │  └───────┘ └──────────┘ └────────┘ └───────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│  Supabase JS SDK (直接操作数据库，无独立后端)                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 核心依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `vue` | ^3.3.13 | 前端框架 |
| `vue-router` | ^4.2.5 | Hash 路由 |
| `element-plus` | ^2.5.1 | UI 组件库 |
| `@supabase/supabase-js` | ^2.107.0 | 数据库 + Auth + Storage |
| `pinyin-pro` | ^3.28.1 | 拼音模糊搜索 |
| `xlsx` | ^0.18.5 | Excel 导入导出 |

### 2.3 文件结构

```
frontend/
├── src/
│   ├── api/
│   │   └── index.js              # 所有 API 调用（~2400行）
│   ├── pages/
│   │   ├── Login.vue             # 登录页
│   │   ├── Home.vue              # 首页/导航框架
│   │   ├── Announcements.vue     # 通知公告
│   │   ├── BusinessInitiate.vue  # 业务端发起沟通
│   │   ├── BusinessReceive.vue   # 业务端接收消息
│   │   ├── LabInitiate.vue       # 实验室端发起沟通
│   │   ├── LabReceive.vue        # 实验室端接收消息
│   │   ├── SentMessages.vue      # 已发送消息
│   │   ├── Organization.vue      # 通讯录
│   │   ├── Admin.vue             # 管理员控制台
│   │   ├── Profile.vue           # 个人设置
│   │   └── History.vue           # 历史消息
│   ├── utils/
│   │   ├── supabase.js           # Supabase 客户端
│   │   ├── pinyinSearch.js       # 拼音搜索工具
│   │   └── departmentConfig.js   # 部门架构配置
│   ├── router/
│   │   └── index.js              # 路由配置
│   ├── composables/
│   │   ├── useApi.js             # API 安全调用
│   │   └── useDebounce.js        # 输入防抖
│   ├── App.vue
│   └── main.js
├── supabase/
│   └── migrations/
├── migrations/                   # 数据库迁移脚本
├── .github/workflows/
│   └── deploy.yml                # GitHub Actions 部署
├── PROJECT_HANDOVER.md
├── DEVELOPMENT_LOG.md            # 本文件
└── supabase*.sql                 # SQL 脚本合集
```

---

## 三、数据库设计

### 3.1 核心表结构

#### profiles — 用户资料

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键，与 auth.users 一致 |
| `name` | TEXT | 姓名 |
| `username` | TEXT | 用户名 |
| `role` | TEXT | 角色（详见 3.3） |
| `employee_id` | TEXT | 工号 |
| `phone` | TEXT | 电话 |
| `email` | TEXT | 邮箱 |
| `department_level1` | TEXT | 一级部门（业务/实验室） |
| `department_level2` | TEXT | 二级部门（产品线） |
| `department_level3` | TEXT | 三级部门（属地/检测组） |
| `region` | TEXT | 地区 |
| `department` | TEXT | 旧字段，部门 |
| `is_disabled` | BOOLEAN | 是否禁用 |
| `must_change_password` | BOOLEAN | 首次登录需改密 |
| `last_active_at` | TIMESTAMPTZ | 最后活跃时间 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

#### communications — 沟通记录

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `sender_id` | UUID | 发送人 ID |
| `type` | TEXT | 沟通类型 |
| `content` | TEXT | 消息内容 |
| `customer_name` | TEXT | 客户名称 |
| `sample_code` | TEXT | 样品短号 |
| `sample_matrix` | TEXT | 样品基质 |
| `sample_count` | TEXT | 样品数量 |
| `test_items` | TEXT | 测试项目 |
| `sample_date` | TEXT | 到样日期 |
| `requested_cycle` | TEXT | 想要的测试周期 |
| `charge_status` | TEXT | 测试费用 |
| `urgent_fee` | TEXT | 加急费用 |
| `remark` | TEXT | 备注 |
| `vip` | TEXT | V1V2客户 |
| `attachments` | JSONB | 附件列表 |
| `status` | TEXT | 状态 |
| `is_completed` | BOOLEAN | 全局是否完结 |
| `is_recalled` | BOOLEAN | 是否已撤回 |
| `recalled_at` | TIMESTAMPTZ | 撤回时间 |
| `recall_reason` | TEXT | 撤回原因 |
| `department_card_ids` | JSONB | 部门名片 ID |
| `forwarded_from` | UUID | 转发来源 |
| `forward_note` | TEXT | 转发说明 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

#### communication_recipients — 沟通接收人

| 字段 | 类型 | 说明 |
|------|------|------|
| `communication_id` | UUID | 沟通记录 ID |
| `recipient_id` | UUID | 接收人 ID |
| `is_read` | BOOLEAN | 是否已读 |
| `is_flagged` | BOOLEAN | 是否标记红旗 |
| `is_completed` | BOOLEAN | 个人是否完结 |
| `has_replied` | BOOLEAN | 是否已回复 |
| `replied_by` | TEXT | 回复人姓名 |
| `has_new_reply` | BOOLEAN | 是否有新回复 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

#### replies — 回复记录

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `communication_id` | UUID | 沟通记录 ID |
| `sender_id` | UUID | 回复人 ID |
| `content` | TEXT | 回复内容 |
| `target_recipient_id` | UUID | 目标接收人 ID（用于 Thread） |
| `created_at` | TIMESTAMPTZ | 创建时间 |

#### announcements — 通知公告

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `title` | TEXT | 标题 |
| `content` | TEXT | 内容 |
| `sender_id` | UUID | 发布人 ID |
| `target_role` | TEXT | 发送范围（all/business/lab/qingdao_business/non_qingdao_business） |
| `attachments` | JSONB | 附件 |
| `status` | TEXT | 状态（active/recalled） |
| `recalled_at` | TIMESTAMPTZ | 撤回时间 |
| `is_deleted` | BOOLEAN | 是否已删除 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

#### announcement_reads — 公告已读

| 字段 | 类型 | 说明 |
|------|------|------|
| `announcement_id` | UUID | 公告 ID |
| `user_id` | UUID | 用户 ID |
| `is_flagged` | BOOLEAN | 是否标记红旗 |
| `read_at` | TIMESTAMPTZ | 阅读时间 |

#### reactions — 点赞/点踩

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `user_id` | UUID | 用户 ID |
| `target_type` | TEXT | 目标类型（reply/announcement） |
| `target_id` | UUID | 目标 ID |
| `reaction_type` | TEXT | 反应类型（like/dislike） |
| `created_at` | TIMESTAMPTZ | 创建时间 |

#### notifications — 系统通知

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `user_id` | UUID | 用户 ID |
| `type` | TEXT | 通知类型 |
| `content` | TEXT | 内容 |
| `communication_id` | UUID | 关联沟通记录 ID |
| `is_read` | BOOLEAN | 是否已读 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

#### message_templates — 消息模板

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `user_id` | UUID | 所属用户 ID |
| `name` | TEXT | 模板名称 |
| `title` | TEXT | 标题 |
| `content` | TEXT | 内容 |
| `type` | TEXT | 沟通类型 |
| `vip` | TEXT | V1V2客户 |
| `customer_name` | TEXT | 客户名称 |
| `sample_code` | TEXT | 样品短号 |
| `sample_matrix` | TEXT | 样品基质 |
| `sample_count` | TEXT | 样品数量 |
| `test_items` | TEXT | 测试项目 |
| `sample_date` | TEXT | 到样日期 |
| `requested_cycle` | TEXT | 测试周期 |
| `charge_status` | TEXT | 测试费用 |
| `urgent_fee` | TEXT | 加急费用 |
| `remark` | TEXT | 备注 |
| `usage_count` | INTEGER | 使用次数 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

### 3.2 沟通类型枚举

| 值 | 中文 | 使用端 |
|----|------|--------|
| `paid_urgent` | 付费加急 | 业务 |
| `free_urgent` | 免费加急 | 业务 |
| `data_dispute` | 数据质疑 | 业务 |
| `follow_up` | 跟单 | 业务 |
| `consultation` | 咨询 | 业务 |
| `other` | 其他 | 业务/实验室 |
| `unqualified` | 不合格沟通 | 实验室 |
| `data_confirm` | 数据确认 | 实验室 |

### 3.3 角色系统

| 角色值 | 中文名 | 所属端 | 导航分类 |
|--------|--------|--------|----------|
| `admin` | 管理员 | 管理员 | admin |
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

### 3.4 RLS 策略

所有表均开启 Row Level Security，策略均为 `auth.uid() = user_id` 或等价条件。

---

## 四、路由设计

| 路径 | 组件 | 说明 | 需登录 |
|------|------|------|--------|
| `/login` | Login.vue | 登录页 | 否 |
| `/` | Home.vue | 首页仪表盘 | 是 |
| `/admin` | Admin.vue | 管理员控制台 | 是 |
| `/announcements` | Announcements.vue | 通知公告 | 是 |
| `/profile` | Profile.vue | 个人设置 | 是 |
| `/history` | History.vue | 历史消息 | 是 |
| `/business-initiate` | BusinessInitiate.vue | 业务发起沟通 | 是 |
| `/lab-initiate` | LabInitiate.vue | 实验室发起沟通 | 是 |

路由守卫逻辑：先检查 localStorage token，再用 `supabase.auth.getSession()` 验证，未认证重定向到 `/login`。

---

## 五、API 层设计

所有 API 集中在 `src/api/index.js`（约 2400 行），以对象模块形式导出：

| 模块 | 说明 |
|------|------|
| `authAPI` | 登录/注册/登出/会话管理 |
| `userAPI` | 用户 CRUD/禁用/重置密码/活跃时间 |
| `communicationAPI` | 沟通记录 CRUD/回复/红旗/完结/撤回/转发 |
| `announcementAPI` | 公告 CRUD/已读/红旗 |
| `notificationAPI` | 系统通知管理 |
| `storageAPI` | 文件上传/删除 |
| `reactionAPI` | 点赞点踩 |
| `departmentCardAPI` | 部门名片管理 |
| `templateAPI` | 消息模板 CRUD |

数据流：前端 → Supabase JS SDK → Supabase REST API → PostgreSQL（无独立后端服务器）。

---

## 六、开发阶段与提交历史

### 阶段一：基础框架搭建

| 日期 | 描述 |
|------|------|
| 2026-06 | 项目初始化，Vite + Vue 3 + Element Plus 搭建 |
| 2026-06 | Supabase Auth 集成，登录/注册 |
| 2026-06 | 路由配置 + 导航守卫 |

### 阶段二：核心沟通功能

| 提交 | 说明 |
|------|------|
| `a5cf7b1` | 已撤回消息展示逻辑优化 |

**改动**：
- SentMessages.vue: 移除 5 分钟撤回限制，已撤回消息显示在各标签页
- BusinessReceive.vue/LabReceive.vue: 已撤回消息不隐藏，浅红底色标识
- api/index.js: 移除后端撤回时间检查
- 添加 recalled-row CSS 类

### 阶段三：UI 优化与 Bug 修复

| 提交 | 说明 |
|------|------|
| `4c8af06` | 通讯录搜索增强 + 拼音模糊搜索 + 名片扩大两倍 |
| `27ff9e4` | 修复 LabInitiate.vue 多余 `</el-form-item>` 构建失败 |

**核心改动**：
- `pinyinSearch.js`：扩展 `buildSearchKeys`/`matchUser` 支持 employee_id/phone/email/department_level1/2/3
- `Organization.vue`：搜索结果卡片扩大到 460px，改用拼音搜索
- `Profile.vue`：修复 department 字段 camelCase→snake_case 保存错误
- `BusinessReceive.vue`：修复撤回消息详情弹窗按钮缺少 isRecalled 判断
- `LabReceive.vue`：修复 CSS `::deep`→`:deep`
- `Admin.vue`：用户查询补上 `last_active_at` 字段

### 阶段四：模板管理 + SQL 策略

| 改动 | 说明 |
|------|------|
| SQL | `message_templates` 表 RLS 策略创建 |
| 代码 | 移除模板必填校验（名称/内容非必须） |

### 阶段五：Admin 与 LabReceive 修复

| 提交 | 说明 |
|------|------|
| `ef6d56b` | Admin 沟通记录显示已撤回状态 |
| `e152e71` | LabReceive 详情改为部门卡片分组 |

**核心改动**：
- `Admin.vue`：状态列增加 is_recalled 判断
- `LabReceive.vue`：接收人状态改为部门分组卡片+内联回复表格
- 新增：`getRecipientReplies`/`getAllDeptGroups`/`getReplyClass`/`getReceiverDisplayName`/`getEffectiveRole`/`getRoleTagColor`

### 阶段六：撤回消息统一处理 + UI 优化

| 提交 | 说明 |
|------|------|
| `c667531` | 补全 LabReceive 内联回复函数+导入 getRoleDisplayName |
| `277905b` | 撤回消息浅紫色背景+模板按钮白色字体+部门分组修复 |

**核心改动**：
- 所有 `recalled-row` CSS 从浅红(#fff0f0)改为浅紫(#f5f0ff)
- `LabInitiate` 管理模板按钮移除 `plain` 属性
- `api/index.js` `getById` 补充 `department_level3` 字段
- `getAllDeptGroups` 增加 `department_level2` 后备分组

### 阶段七：公告发送范围修复

| 提交 | 说明 |
|------|------|
| `1953fee` | 移除 target_regions 字段，修复公告青岛业务报错 |

**核心改动**：
- `Announcements.vue`：移除 target_regions 逻辑
- `api/index.js`：`announcementAPI.create` 移除 target_regions 参数

---

## 七、关键业务逻辑

### 7.1 沟通流程

```
发起人填写表单 → 选择接收人/部门名片 → 发送
    ↓
接收人收到消息 → 查看详情 → 回复/完结
    ↓
发起人可追加回复、标记整体完结、撤回消息
```

### 7.2 撤回逻辑

1. 任何时间可撤回（不限5分钟）
2. 撤回后消息在发送方和接收方均可见，但仅可点击"完结"
3. 撤回后按钮（同意/拒绝/回复）自动隐藏
4. 撤回消息背景色为浅紫色

### 7.3 部门名片机制

部门名片 = 检测组长 + 检测组长助理的集合。选择部门名片相当于选择该组所有负责人，任意一人回复即视为该组已处理。

### 7.4 公告发送范围

| 选项 | 过滤条件 |
|------|----------|
| 全部用户 | 所有启用用户 |
| 仅业务端 | department_level1 = '业务' |
| 仅实验室端 | department_level1 = '实验室' |
| 青岛业务 | department_level1 = '业务' AND department_level3 = '青岛' |
| 非青岛业务 | department_level1 = '业务' AND department_level3 != '青岛' |

### 7.5 拼音搜索

使用 `pinyin-pro` 库，支持：
- 中文包含匹配
- 拼音首字母（"jw" → "姜伟"）
- 拼音全拼（"jiangwei" → "姜伟"）
- 部门拼音
- 角色拼音
- 工号/电话/邮箱匹配

---

## 八、数据库迁移脚本清单

| 文件 | 说明 |
|------|------|
| `migrations/003_unify_role_values.sql` | 统一角色值 |
| `migrations/004_update_lab_level2.sql` | 更新实验室二级部门 |
| `migrations/005_fix_role_values_and_rpc.sql` | 修复角色值 + 重建 admin_create_user RPC |
| `migrations/006_reactivate_disabled_users.sql` | 用户注册完整修复 |
| `supabase/migrations/20260612000001_add_performance_indexes.sql` | 性能索引 |
| `supabase_add_last_active.sql` | 添加 last_active_at 字段 |
| `supabase_add_system_notification.sql` | 系统通知表 |
| `supabase_admin_logs.sql` | 管理员日志表 |
| `supabase-changes.sql` | 公告红旗 + 唯一约束 |
| `supabase_fix_announcement_reads_and_is_deleted.sql` | 公告已读修复 |
| `supabase_fix_rls_security.sql` | RLS 安全修复 |
| `supabase_message_recall_fields.sql` | 撤回字段 |
| `supabase_message_recall_edit.sql` | 撤回编辑 |
| `supabase_message_templates.sql` | 消息模板表 |
| `supabase_rpc_increment_template_usage.sql` | 模板使用次数 RPC |

---

## 九、部署说明

### 9.1 GitHub Pages 部署

项目配置了 GitHub Actions 自动部署：

```yaml
# .github/workflows/deploy.yml
# 触发条件：push 到 main 分支
# 步骤：npm ci → vite build → upload artifact → deploy to Pages
```

环境变量通过 GitHub Secrets 注入：
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SERVICE_ROLE_KEY`

### 9.2 本地开发

```bash
cd frontend
npm install
npm run dev     # 开发服务器
npm run build   # 生产构建
npm run preview # 预览构建结果
```

---

## 十、常见问题排查

### 10.1 登录提示"邮箱或密码错误"

排查 SQL：
```sql
SELECT id, name, email, username, is_disabled FROM profiles WHERE name LIKE '%于丹%';
SELECT id, email, encrypted_password FROM auth.users WHERE id = '<user_id>';
```

修复 SQL：
```sql
UPDATE auth.users 
SET email = '正确邮箱', 
    encrypted_password = extensions.crypt('cti123', extensions.gen_salt('bf', 10)),
    updated_at = now()
WHERE id = '<user_id>';
```

### 10.2 管理员所有用户离线

需要运行 `supabase_add_last_active.sql` 添加 `last_active_at` 字段。

### 10.3 模板保存提示"permission denied"

需要运行 message_templates 的 RLS 策略 SQL：
```sql
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "用户管理自己的模板" ON public.message_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### 10.4 公告发布提示"malformed array literal"

前端已修复，不再传递 `target_regions` 字段。如需清理数据库：
```sql
ALTER TABLE announcements DROP COLUMN IF EXISTS target_regions;
```

---

## 十一、关于此文档

本开发日志记录了从项目搭建到当前版本的全部开发过程、技术决策和关键业务逻辑。配合以下文件可完整理解项目：

| 文件 | 用途 |
|------|------|
| `DEVELOPMENT_LOG.md` | 本文件，项目全貌 |
| `PROJECT_HANDOVER.md` | 跨会话交接文档 |
| `src/project-docs/codebase-analysis.md` | 代码库详细分析 |
| 各 `.sql` 文件 | 数据库迁移脚本 |
