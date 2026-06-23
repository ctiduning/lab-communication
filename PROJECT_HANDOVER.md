# 实验室沟通系统 — 项目交接文档

> 最后更新：2026-06-23 21:52
> 仓库：`https://github.com/ctiduning/lab-communication.git`
> 前端路径：`D:\game\实验室沟通\frontend`
> 分支：`master`（推送需 `master:main`）

---

## 一、项目概况

**技术栈**：Vue 3 (Composition API + script setup) + Element Plus + Vite + Supabase

### 版本变更历史

| 版本 | 维护者 | 范围 |
|------|--------|------|
| **V1** | 工（本 AI） | 通知公告、UI 放大×1.5、Bug 修复 |
| **V2** | Trae（另一 AI） | CC抄送功能、追加发送、标签修复、抄送人预设 |

---

## 二、V2 新增功能（Trae 开发）

最近 15 个 commit 覆盖以下功能：

| 功能 | 相关文件 | 数据库 SQL |
|------|----------|-----------|
| 消息抄送人(CC) | `fcc6627` + 后续修复 | `supabase_add_cc.sql` |
| 常用抄送人管理 | `9157331` + 重构 `3b8a1c1` | 同上 |
| 追加发送/重发 | `5204a77`, `519532c` | `supabase_add_append_forward.sql` |
| 标签颜色修复 | `276f607` | 无 |
| 抄送人预设 RPC | `fcbc3b6` | 需 RPC 函数 |

---

## 三、当前状态

### Build: ✅ 通过
- `npm run build` 成功，dist 目录所有 chunk 已生成

### Tests: ⚠️ 188 passed / 1 failed
**失败测试**：`bugfixes.test.js > Bug 1 > Admin.vue 中 filteredUsers 应包含 email 和 phone 字段`
- **原因**：测试检查 `u.email` / `u.phone` 直接引用，但 V2 重构为 `buildSearchKeys(u, ROLE_OPTIONS)` + `matchUser(kw, keys._searchKeys)` 
- **结论**：**代码正确**，`pinyinSearch.js` 已覆盖 email/phone/employeeId 所有字段。测试断言过时，需更新

### GitHub 推送：❌ 失败
- `git push origin master:main` → 连接 `github.com:443` 超时（网络问题）
- **远程仓库**：`https://github.com/ctiduning/lab-communication.git`

---

## 四、待执行事项

### 待确认：数据库 SQL 是否已执行

| SQL 文件 | 变更内容 | 是否已执行？ |
|----------|---------|------------|
| `supabase_add_cc.sql` | 加 `is_cc` 列 + `user_cc_favorites` 表 | ❓ 需要你在 Supabase 确认 |
| `supabase_add_append_forward.sql` | 加 `is_append_forward` 列 + 索引 | ❓ 需要你在 Supabase 确认 |
| `supabase-changes.sql` | `is_flagged` 列 + 唯一约束 | ❓ 需要你在 Supabase 确认 |

### 待修复：测试更新
修复 `src/__tests__/bugfixes.test.js` 第 96-107 行断言：
- 将 `toContain('u.email')` / `toContain('u.phone')` 改为检查 `buildSearchKeys` 和 `matchUser` 调用

---

## 五、启动命令

```bash
cd D:\game\实验室沟通\frontend
npm run dev         # 开发
npm run build       # 构建
npx vitest run      # 测试
git push origin master:main   # 推送到 GitHub
```

---

## 六、项目二：HOI4 舰队改造 MOD

**路径**：`D:\game\HOR4\舰队改造MOD`

6 国海军 AI 优化已完成（统一舰队模板、装备 priority、造价/油耗调整）。

---

## 七、已清理的项目

| 项目 | 操作 |
|------|------|
| 中世纪王朝游戏 `D:\game\trea\game` | 🗑️ 已删除到回收站 |
| 赛博朋克RPG `D:\game\trea\src` | 🗑️ 已删除到回收站 |
| 游戏数据 `D:\game\trea\data` | 🗑️ 已删除到回收站 |

---

*用于跨会话任务交接，新 AI 先读此文件。*

## 八、V2 Bug 修复记录（2026-06-23）

### Bug 1：按钮背景色/字体颜色冲突
- **症状**：「管理」「设置常用抄送人」按钮文字看不清楚
- **原因**：`text type="primary"` 按钮用蓝色文字，背景对比度不足
- **修复**：改为 `type="primary" plain`，增加浅蓝背景+蓝色边框
- **文件**：`BusinessInitiate.vue`、`LabInitiate.vue`

### Bug 2：保存抄送人预设报错 404
- **症状**：`POST /rpc/save_cc_presets 404` → `relation "user_cc_presets" does not exist`
- **原因**：Trae 代码用 RPC 函数 `get_cc_presets`/`save_cc_presets`，但 Supabase 上未创建
- **修复**：API 改用直接查询 `user_cc_favorites` 表（`select`/`delete`+`insert`），不再依赖 RPC
- **文件**：`api/index.js`
