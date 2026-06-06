# 青岛华测实验室沟通小程序 - 完整复现文档

> **文档用途**：任何 AI 或开发者阅读本文档，都能完整复现该项目。
> **最后更新**：2026-06-06
> **在线地址**：https://ctiduning.github.io/lab-communication/#/login
> **GitHub 仓库**：https://github.com/ctiduning/lab-communication

---

## 一、项目概述

### 1.1 功能清单

| 模块 | 功能 |
|------|------|
| 登录注册 | 邮箱密码登录、首次登录强制改密码、管理员注册用户 |
| 发起沟通 | 选择接收人（所有人，除自己）、输入标题内容、上传附件、发送 |
| 接收消息 | 待处理/已处理/已标记三个标签页、行上快捷同意/拒绝、查看详情、回复 |
| 公告管理 | 发布公告、置顶、允许点赞、查看已读详情 |
| 通讯录 | 三级架构展示（部门→属地/检测组→角色）、搜索、批量发起沟通 |
| 管理员后台 | 用户增删改查、禁用/启用、重置密码、Excel 批量导入 |
| 个人资料 | 编辑资料、修改密码 |

### 1.2 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue 3 + TypeScript | ^3.3.13 |
| 构建工具 | Vite | ^5.0.10 |
| UI 组件库 | Element Plus | ^2.5.1 |
| 路由 | Vue Router | ^4.2.5 |
| 后端 BaaS | Supabase | ^2.107.0 |
| 日期处理 | Moment.js | ^2.29.4 |
| 拼音搜索 | pinyin-pro | ^3.28.1 |
| Excel 导出 | xlsx | ^0.18.5 |
| 部署 | GitHub Pages | - |

---

## 二、Supabase 后端配置

### 2.1 创建 Supabase 项目

1. 访问 https://supabase.com 注册/登录
2. 点击 "New Project"
3. 填写项目名称：`lab-communication`
4. 记录以下信息（后续前端需要）：
   - **Project URL**：`https://xxxx.supabase.co`
   - **Anon Key**（公开密钥，前端用）

### 2.2 完整数据库 SQL（一次性运行）

**⚠️ 在 Supabase SQL 编辑器中，复制以下全部内容，一次性运行：**

```sql
-- ==========================================
-- 青岛华测实验室沟通小程序 - 完整数据库初始化 SQL
-- 适用 Supabase (PostgreSQL)
-- 最后更新：2026-06-06
-- ==========================================

-- ==========================================
-- 1. profiles 表（用户资料）
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'business',
  employee_id TEXT,
  phone TEXT,
  email TEXT,
  region TEXT,
  department TEXT,
  priority INTEGER DEFAULT 2,
  is_disabled BOOLEAN DEFAULT FALSE,
  must_change_password BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at 
  ON public.profiles(last_active_at) WHERE last_active_at IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "允许读取所有用户资料" ON public.profiles;
CREATE POLICY "允许读取所有用户资料" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "用户只能修改自己的资料" ON public.profiles;
CREATE POLICY "用户只能修改自己的资料" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "只允许管理员管理用户" ON public.profiles;
CREATE POLICY "只允许管理员管理用户" ON public.profiles 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==========================================
-- 2. communications 表（沟通记录）
-- ==========================================
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT '常规',
  is_completed BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communications_sender_id ON public.communications(sender_id);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON public.communications(created_at DESC);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "发送者管理自己的沟通记录" ON public.communications;
CREATE POLICY "发送者管理自己的沟通记录" ON public.communications 
  FOR ALL USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "接收者可以读取发给自己的沟通记录" ON public.communications;
CREATE POLICY "接收者可以读取发给自己的沟通记录" ON public.communications 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.communication_recipients 
      WHERE communication_id = id AND recipient_id = auth.uid()
    )
  );

-- ==========================================
-- 3. communication_recipients 表（沟通接收人）
-- ==========================================
CREATE TABLE IF NOT EXISTS public.communication_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  has_replied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(communication_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_cr_communication_id ON public.communication_recipients(communication_id);
CREATE INDEX IF NOT EXISTS idx_cr_recipient_id ON public.communication_recipients(recipient_id);

ALTER TABLE public.communication_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "接收人管理自己的接收记录" ON public.communication_recipients;
CREATE POLICY "接收人管理自己的接收记录" ON public.communication_recipients 
  FOR ALL USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "发送者读取自己沟通的接收人" ON public.communication_recipients;
CREATE POLICY "发送者读取自己沟通的接收人" ON public.communication_recipients 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.communications 
      WHERE id = communication_id AND sender_id = auth.uid()
    )
  );

-- ==========================================
-- 4. replies 表（回复）
-- ==========================================
CREATE TABLE IF NOT EXISTS public.replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_communication_id ON public.replies(communication_id);

ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "沟通参与方可以读取回复" ON public.replies;
CREATE POLICY "沟通参与方可以读取回复" ON public.replies 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.communications c WHERE c.id = communication_id AND c.sender_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.communication_recipients cr WHERE cr.communication_id = communication_id AND cr.recipient_id = auth.uid())
  );

DROP POLICY IF EXISTS "参与方可以回复" ON public.replies;
CREATE POLICY "参与方可以回复" ON public.replies 
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (SELECT 1 FROM public.communications c WHERE c.id = communication_id AND c.sender_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.communication_recipients cr WHERE cr.communication_id = communication_id AND cr.recipient_id = auth.uid())
    )
  );

-- ==========================================
-- 5. announcements 表（公告）
-- ==========================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  publisher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  allow_reaction BOOLEAN DEFAULT TRUE,
  reaction_type TEXT DEFAULT 'like',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_publisher_id ON public.announcements(publisher_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "所有人可以读取公告" ON public.announcements;
CREATE POLICY "所有人可以读取公告" ON public.announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "管理员可以管理公告" ON public.announcements;
CREATE POLICY "管理员可以管理公告" ON public.announcements 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==========================================
-- 6. announcement_reads 表（公告已读记录）
-- ==========================================
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id BIGSERIAL PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id ON public.announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id ON public.announcement_reads(user_id);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可以读取自己的已读记录" ON public.announcement_reads;
CREATE POLICY "用户可以读取自己的已读记录" ON public.announcement_reads 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户可以标记公告已读" ON public.announcement_reads;
CREATE POLICY "用户可以标记公告已读" ON public.announcement_reads 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "管理员可以读取所有已读记录" ON public.announcement_reads;
CREATE POLICY "管理员可以读取所有已读记录" ON public.announcement_reads 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==========================================
-- 7. actions 表（点赞/反应）
-- ==========================================
CREATE TABLE IF NOT EXISTS public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id, action_type)
);

CREATE INDEX IF NOT EXISTS idx_actions_target ON public.actions(target_type, target_id);

ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "所有人可以读取点赞" ON public.actions;
CREATE POLICY "所有人可以读取点赞" ON public.actions FOR SELECT USING (true);

DROP POLICY IF EXISTS "用户可以管理自己的点赞" ON public.actions;
CREATE POLICY "用户可以管理自己的点赞" ON public.actions 
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 8. orders 表（订单管理）
-- ==========================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  sample_name TEXT,
  test_items TEXT,
  status TEXT DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "实验室端可以管理订单" ON public.orders;
CREATE POLICY "实验室端可以管理订单" ON public.orders 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('supervisor','inspection_leader','report_leader','admin')
    )
  );

-- ==========================================
-- 9. 删除用户函数
-- ==========================================
CREATE OR REPLACE FUNCTION public.delete_user_and_release_email(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users 
  SET email = 'deleted_' || target_user_id || '@deleted.local',
      email_confirmed_at = NULL
  WHERE id = target_user_id;
  
  UPDATE public.profiles 
  SET email = 'deleted_' || target_user_id || '@deleted.local',
      username = 'deleted_' || target_user_id,
      is_disabled = TRUE
  WHERE id = target_user_id;
END;
$$;

SELECT '数据库初始化完成！' as result;
```

---

## 三、角色体系（15 个角色）

### 3.1 角色列表

| 角色值 | 角色名称 | 所属部门 | 名片背景色 |
|---------|----------|----------|------------|
| `business` | 业务 | 业务端 | 金色 `#FFD700` |
| `business_assistant` | 业务助理 | 业务端 | 浅金黄 `#FFF8DC` |
| `supervisor` | 实验室主管 | 实验室端 | 棕色 `#8B4513` |
| `supervisor_assistant` | 实验室主管助理 | 实验室端 | 浅棕色 `#D2B48C` |
| `customer_service` | 客服 | 实验室端 | 淡紫色 `#E6E6FA` |
| `cs_leader` | 客服组长 | 实验室端 | 蓝色 `#409EFF` |
| `cs_leader_assistant` | 客服组长助理 | 实验室端 | 浅蓝色 `#87CEEB` |
| `inspection_leader` | 检测组长 | 实验室端 | 蓝色 `#409EFF` |
| `inspection_leader_assistant` | 检测组长助理 | 实验室端 | 浅蓝色 `#87CEEB` |
| `sample_prep_leader` | 制样组组长 | 实验室端 | 蓝色 `#409EFF` |
| `report_leader` | 报告组组长 | 实验室端 | 蓝色 `#409EFF` |
| `inspection_engineer` | 检测工程师 | 实验室端 | 浅绿色 `#90EE90` |
| `data_review` | 数据二审 | 实验室端 | 浅绿色 `#90EE90` |
| `report_compiler` | 报告编制 | 实验室端 | 浅绿色 `#90EE90` |
| `tech_support` | 技术支持 | 实验室端 | 浅绿色 `#90EE90` |
| `admin` | 管理员 | 管理员 | 红色 `#F56C6C` |

---

## 四、前端项目结构

```
lab-communication/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── .env
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── style.css
│   │   ├── router/index.js
│   │   ├── utils/
│   │   │   ├── supabase.js
│   │   │   └── pinyinSearch.js
│   │   ├── api/index.js
│   │   └── pages/
│   │       ├── Login.vue
│   │       ├── Home.vue
│   │       ├── Admin.vue
│   │       ├── Organization.vue
│   │       ├── BusinessInitiate.vue
│   │       ├── BusinessReceive.vue
│   │       ├── LabInitiate.vue
│   │       ├── LabReceive.vue
│   │       ├── Communications.vue
│   │       ├── Announcements.vue
│   │       ├── Profile.vue
│   │       ├── SentMessages.vue
│   │       ├── Notifications.vue
│   │       ├── Orders.vue
│   │       └── History.vue
│   └── dist/
└── .github/workflows/deploy.yml
```

---

## 五、完整复现步骤

### 步骤 1：创建 Supabase 项目

1. 访问 https://supabase.com
2. 点击 "New Project"
3. 填写项目名称：`lab-communication`
4. 等待项目创建完成

### 步骤 2：运行数据库 SQL

1. 打开 Supabase Dashboard
2. 左侧菜单 → "SQL Editor"
3. 点击 "New Query"
4. 复制**第二节**中的完整 SQL，粘贴进去
5. 点击 "Run" 执行

### 步骤 3：创建 Storage Bucket

1. 左侧菜单 → "Storage"
2. 点击 "Create Bucket"
3. 名称填：`attachments`
4. 勾选 "Public Bucket"
5. 点击 "Create Bucket"

### 步骤 4：配置 Bucket RLS 策略

在 Storage 页面，点击 `attachments` bucket：

- **SELECT**：`true`
- **INSERT**：`auth.role() = 'authenticated'`
- **DELETE**：`EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`

### 步骤 5：创建第一个管理员账号

1. Supabase Dashboard → "Authentication" → "Users"
2. 点击 "Add User"
3. 填写邮箱和密码，勾选 "Auto Confirm Email"
4. 记录用户的 UUID
5. "Table Editor" → "profiles" 表
6. 插入一行：
   - `id`：刚才记录的 UUID
   - `username`：`admin`
   - `name`：`管理员`
   - `role`：`admin`

### 步骤 6：配置前端环境变量

创建 `frontend/.env`：

```env
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_ANON_KEY=你的AnonKey
```

获取方式：Supabase Dashboard → "Project Settings" → "API"

### 步骤 7：运行前端

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173/lab-communication/#/login`

### 步骤 8：构建并部署到 GitHub Pages

1. 修改 `vite.config.js` 中的 `base` 为你的仓库名
2. 推送代码到 GitHub 的 `main` 分支
3. GitHub Actions 自动构建部署

---

## 六、package.json 依赖

```json
{
  "name": "lab-communication",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.3.13",
    "vue-router": "^4.2.5",
    "@supabase/supabase-js": "^2.107.0",
    "element-plus": "^2.5.1",
    "moment": "^2.29.4",
    "pinyin-pro": "^3.28.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.10",
    "vite": "^5.0.10"
  }
}
```

---

## 七、常见问题修复记录

### 问题 1：待处理消息数量不更新

**原因**：`getPendingCount()` 使用了错误的字段名。
**修复**：改为先查 `communication_recipients` 表获取相关沟通 ID。

### 问题 2：点击同意/拒绝按钮后状态不更新

**原因**：`getAll()` 查询时漏选了 `has_replied` 字段。
**修复**：在查询中添加 `has_replied` 字段。

### 问题 3：公告未读数始终为 0

**原因**：`announcement_reads` 表不存在。
**修复**：运行完整 SQL 创建该表。

### 问题 4：在线状态显示不正确

**原因**：`profiles` 表缺少 `last_active_at` 字段。
**修复**：运行 SQL 添加该字段，前端定期更新。

---

**文档结束**

> 任何 AI 阅读本文档后，应能完整复现该项目。
> 如有遗漏，请补充到对应章节。
