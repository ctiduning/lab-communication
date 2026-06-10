# 三项需求实现 - 交付总结

## TL;DR
实现了公告手动 🚩 标记、表格行点击查看详情、以及邮件式 Thread 回复简化三项需求。

## 具体变更

### 1️⃣ 公告手动 🚩 标记
- 创建 `announcement_flags` 表（每用户独立标记）
- 新增 `announcementAPI.toggleFlag()` / `announcementAPI.getMyFlaggedIds()`
- 删除旧的关键词自动标记（"重要""紧急""系统"关键字检测）
- 公告列表新增「操作」列，每行显示「🚩 标记/已标记」按钮
- 筛选改为「仅显示🚩标记」

### 2️⃣ 表格行点击查看详情
- BusinessReceive.vue / LabReceive.vue / SentMessages.vue 全部 `<el-table>` 添加 `@row-click="viewDetail"`
- 所有表格内按钮添加 `.stop` 修饰符防止事件冒泡

### 3️⃣ 邮件式 Thread 回复（并发状态简化）
- SentMessages 筛选栏从 7 种状态简化为 4 种：全部/未回复/已回复/已完结/已撤回
- 取消接收人级个人完结（`is_completed`），完结权统一归发起人
- 所有接收端页面移除「完结」「取消完结」按钮
- 数据库 `replies` 表新增 `target_recipient_id` 字段（用于后续精确指向回复）

### 数据库变更
- 新表 `announcement_flags`（需在 Supabase SQL Editor 执行）
- `replies` 表新增 `target_recipient_id` 字段
- SQL 脚本见 `supabase-changes.sql`

## 部署
- GitHub: `https://github.com/ctiduning/lab-communication`
- GitHub Pages: 已强制推送更新
