# QDCTI 实验室沟通管理系统 — 项目备份

> 最后更新：2026-06-11
> 版本：v2（git tag）

## 一、项目简介

实验室与业务端之间的企业级沟通平台。基于 Vue 3 + Element Plus + Supabase 构建。

### 核心业务流程
```
业务端发起沟通 → 实验室端接收并回复 → 发起人追踪回复状态 → 完结
管理员发布公告 → 全员接收 → 点赞/红旗标记
```

### 系统角色
| 角色 | 权限 |
|------|------|
| 管理员 | 全部页面 + 用户管理 + 公告管理 + 日志 + 角色切换 |
| 业务端 | 发起沟通/接收消息/已发送/通讯录/个人设置 |
| 实验室端 | 发起沟通/接收消息/已发送/通讯录/个人设置 |

## 二、技术架构

| 层次 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Vue 3 (Composition API) | SPA 应用 |
| UI 组件 | Element Plus | 企业级桌面UI |
| 构建工具 | Vite 5 | 快速构建 |
| 后端/BaaS | Supabase | PostgreSQL + Auth + Storage + Realtime |
| 路由 | Vue Router (Hash模式) | GitHub Pages 适配 |
| 部署 | GitHub Pages | 自动构建部署 |

## 三、项目目录结构

```
frontend/
├── src/
│   ├── api/index.js       # API层（所有数据库操作）
│   ├── pages/             # 页面组件
│   │   ├── Login.vue      # 登录页
│   │   ├── Home.vue       # 仪表盘（导航布局）
│   │   ├── Admin.vue      # 用户管理
│   │   ├── Announcements.vue  # 通知公告
│   │   ├── BusinessInitiate.vue  # 业务端发起沟通
│   │   ├── BusinessReceive.vue   # 业务端接收消息
│   │   ├── LabInitiate.vue      # 实验室端发起沟通
│   │   ├── LabReceive.vue       # 实验室端接收消息
│   │   ├── SentMessages.vue     # 已发送消息
│   │   ├── Organization.vue     # 通讯录
│   │   ├── Profile.vue          # 个人设置
│   │   └── History.vue          # 操作日志
│   ├── composables/        # 组合函数
│   │   ├── useApi.js       # 全局API错误处理
│   │   └── useDebounce.js  # 搜索防抖
│   ├── utils/supabase.js   # Supabase客户端
│   └── router/index.js     # 路由配置
├── supabase-changes.sql    # 数据库变更SQL（部署必跑）
├── package.json            # 依赖配置
└── vite.config.js          # Vite构建配置
```

### 已删除的废弃文件
- `backend/` — Express 后端（未使用）
- `src/pages/Orders.vue` — 早期原型
- `src/pages/Notifications.vue` — 功能被 Announcements 覆盖
- `src/pages/Communications.vue` — 功能与 SentMessages 重叠

## 四、数据库变更部署

项目部署后，需要去 Supabase SQL Editor 执行以下 SQL：

```sql
-- 1. 公告红旗标记字段
ALTER TABLE announcement_reads ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;

-- 2. Thread回复目标接收人字段
ALTER TABLE replies ADD COLUMN IF NOT EXISTS target_recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

## 五、Git 标签

| 标签 | 提交 | 说明 |
|------|------|------|
| `v1` | 5472561 | 初始稳定版 |
| `v2` | 01be945 | 当前版本（所有改进已合并） |

回退命令：`git reset --hard v1` 或 `git reset --hard v2`

## 六、改进历史（v1 → v2 变更）

### 2026-06-11 三项需求
1. **公告 🚩 手动标记** — 每个人可对自己看到的公告打红旗，仅自己可见
2. **表格行点击查看详情** — BusinessReceive/LabReceive/SentMessages 全部支持
3. **状态简化** — SentMessages 从7种状态精简为4种

### 2026-06-11 五项改进（经 tera 评审）
1. **Thread 回复** — 追加回复可选"回复全部"或"仅回复某人"，详情按人分组展示
2. **删死代码** — backend/ + 3个废弃页面
3. **全局错误处理** — `composables/useApi.js`
4. **搜索防抖** — `composables/useDebounce.js`
5. **懒加载** — Home.vue 子页面按需加载

### 关键文件改动
- `src/api/index.js` — createReply加targetRecipientId参数、getAll/getById select加target_recipient_id、buildThreads()
- `src/pages/SentMessages.vue` — 追加回复弹窗加选人
- `src/pages/BusinessReceive.vue` — 详情弹窗Thread视图
- `src/pages/LabReceive.vue` — 详情弹窗Thread视图
- `src/pages/Home.vue` — defineAsyncComponent懒加载

## 七、使用注意事项

⚠️ **每次登录前按 Ctrl+F5 强制刷新**（清除浏览器缓存）

### 角色功能速查
- **管理员**：仪表盘 → 用户管理 → 公告管理 → 操作日志 → 通讯录 → 个人设置
- **业务端**：发起沟通 → 接收消息 → 已发送消息 → 通讯录 → 个人设置
- **实验室端**：发起沟通 → 接收消息 → 已发送消息 → 通讯录 → 个人设置

### 关键功能入口
| 功能 | 位置 |
|------|------|
| 公告 🚩 标记 | 公告列表每行右侧操作栏 |
| Thread 回复 | 已发送消息 → 追加回复 → 选"仅回复某人" |
| 消息撤回 | 已发送消息详情（5分钟内） |
| 红旗筛选 | 公告/接收消息列表顶部复选框 |
| 草稿暂存 | 发起沟通页面自动保存 |

## 八、备份内容清单

```
QDCTI项目备份/
├── README.md              ← 本文档
├── QDCTI_使用说明书.docx   ← 用户操作手册
├── QDCTI_完整交付文档.docx  ← 完整代码+功能说明
├── src/                   ← 完整源代码
├── supabase-changes.sql   ← 数据库变更SQL
├── package.json           ← 项目依赖
└── vite.config.js         ← 构建配置
```
