# 实验室沟通系统 — 项目交接文档

> 最后更新：2026-06-16 15:12
> 仓库：https://github.com/ctiduning/lab-communication.git
> 前端路径：`D:\game\实验室沟通\frontend`

---

## 一、项目概况

**技术栈**：Vue 3 (Composition API + script setup) + Element Plus + Vite + Supabase (PostgreSQL)
**部署**：GitHub Pages（前端 SPA）
**认证**：Supabase Auth（邮箱密码登录）

### 关键文件

```
src/
├── pages/
│   ├── Announcements.vue    # 通知公告（最近修改）
│   ├── SentMessages.vue     
│   ├── BusinessReceive.vue  
│   ├── LabReceive.vue       
│   ├── Admin.vue            
│   └── ...
├── api/index.js             # Supabase API 封装
├── __tests__/
│   ├── announcements.test.js  # 161 条测试
│   └── bugfixes.test.js       # 26 条测试
supabase-changes.sql         # 最新 SQL 变更
CHANGELOG-2026-06-15.md      # 更新日志 v2.5.0
项目架构文档.md               # 完整文档
```

---

## 二、本次已完成（2026-06-16）

### UI 放大 1.5 倍
标题 600px / 内容 800~1100px / 操作 360px / 发布人 200px / 时间 280px / 已读 140px
搜索框 400px (class)，容器 padding 32px 36px / max 1800px
操作按钮 flex-wrap wrap gap:6px
Search 图标导入修复

### Bug 修复（4个）
A: unreadCount 基于过滤结果 → 改用 announcements.value
B: Admin 看不到全部公告 → 跳过 targetRole 过滤
C: 遮罩关闭误报错 → catch 排除 'close'
D: 标记红旗静默失败 → update→upsert

### SQL
`supabase-changes.sql` → 加 is_flagged 列 + 唯一约束

### 测试
**187 passed** / build 成功

---

## 三、启动与测试

```bash
cd D:\game\实验室沟通\frontend
npm run dev        # 开发
npm run build      # 构建
npx vitest run     # 所有测试
git push origin main
```

---

## 四、待确认
- [ ] Supabase SQL 执行了吗？（supabase-changes.sql）
- [ ] GitHub 推送了吗？（git push origin main）
- [ ] Admin 能看到所有公告？
- [ ] 搜索时未读数量正确？

---

*用于跨会话任务交接，新 AI 先读此文件。*
