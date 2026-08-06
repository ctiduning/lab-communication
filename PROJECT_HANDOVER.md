# QDCTI 实验室沟通系统 — 项目理解文档（PROJECT_HANDOVER）

> 目的：让 AI / 接手者无需重新通读全仓即可精准定位、修改、排障。
> 覆盖范围：前端 `D:\game\实验室沟通\frontend`（Vue 3 + Vite + Element Plus + Supabase）。
> 生成方式：5 路并行通读（基础设施 / API 层 / 大页面 / 其余页面 / 组件·类型·样式），逐行 + grep 验证，所有结论带 `file:line`。
> 行号为生成时的近似值，改代码前以实际为准。
> 生成日期：2026-08-05

---

## 0. 一句话定位

青岛华测检测（QDCTI）食品样品沟通工作流数字化平台。**纯前端直连 Supabase（anon/publishable key，无 BFF/后端）**，所有鉴权 100% 依赖 Postgres RLS。前端任何"权限判断"都只是 UI 提示，可被 devtools 绕过。部署：GitHub Pages，`base: /lab-communication/`，仓库 `https://github.com/ctiduning/lab-communication`。

---

## 1. 技术栈与入口

| 项 | 事实 | 备注 |
|---|---|---|
| 真实入口 | `index.html` → `src/main.js` | **无 Pinia** |
| 死入口 | `src/main.ts` | import pinia + pinia-plugin-persistedstate（未安装）+ 注册全部图标；若被用会构建失败 |
| 真实 Supabase 客户端 | `src/utils/supabase.js` | `createClient(url, anonKey)`，**未设 auth 选项**（走默认 persistSession/autoRefreshToken） |
| 死客户端（高危） | `src/utils/supabase.ts` | import 不存在的 `@/types/database`；`getServiceSupabase()` 读 `VITE_SUPABASE_SERVICE_ROLE_KEY` 建 **绕过 RLS** 的客户端。一旦被 import 即等于把数据库交给前端。**目前无人 import，但必须保持为死代码** |
| 构建配置 | `vite.config.js` 生效 / `vite.config.ts` 死 | 只认 `.js` |
| 路由 | `src/router/index.js`，`createWebHashHistory` | 10 条路由，但 14 个页面里有 4 个**内嵌在 Home**（Business*/Lab*/Admin/Org/Sent 通过异步组件 + 事件切换，不在路由表） |
| `/admin` 守卫 | **无角色检查**，仅查 `profiles.is_disabled` | 角色在 Home 内判定 |
| 类型 | `src/types/*.ts` 共 5 个 + `types/index.ts` | 全部 0 引用，`types/index.ts:1` 再导出的 `database.ts` 不存在 → 断裂导出；`types/api.ts` 有 7 个 TS2304 |
| CI | `.github/workflows/deploy.yml` | **注入 `VITE_SUPABASE_SERVICE_ROLE_KEY` 到前端构建**（安全炸弹，见 §6-P0） |
| PWA | `public/sw.js` + `public/manifest.json` | sw 缓存 Supabase GET 响应（部署后旧数据残留源）；manifest 图标路径缺 base 前缀 |
| 测试 | package.json **无 test 脚本** | `src/__tests__/` 与 `qa-verify/` 只能手动 `node` 跑；前者是文本正则假阳性测试 |

依赖坑：`@element-plus/icons-vue` 被 import 但未声明（ghost dependency）；`axios`/`moment`/`docx` 已装未用。

---

## 2. 目录骨架

```
src/
  main.js                  # 真实入口
  api/index.js             # 唯一数据层，3170 行，31 个导出（详见 §5）
  router/index.js          # hash 路由 + beforeEach 守卫
  utils/
    supabase.js            # 真实客户端
    supabase.ts            # 死代码 / RLS 绕过（危险）
    pinyinSearch.js        # 拼音/部门搜索（snake_case 字段）
    departmentConfig.js    # 部门配置（camelCase 字段，与 pinyinSearch 命名冲突）
    atMention.js           # 孤儿，0 引用
    autoSave.js            # 草稿自动保存（watch 的 stop handle 未留存）
  composables/
    useDebounce.js         # 防抖（timer 卸载未清）
    useApi.js              # 死代码，0 引用
  pages/                   # 14 个页面（见 §3）
  components/              # 不存在！全站无组件层（0 defineProps/defineEmits）
  types/                   # 死/断裂类型
  __tests__/               # 假阳性文本测试
qa-verify/                 # 5 个 spec，只覆盖 adminLog JSON 契约三件套
```

---

## 3. 页面职责速查（file → responsibility）

| 页面 | 行数(~) | 职责 | 关键 Supabase / 坑 |
|---|---|---|---|
| `Home.vue` | 650 | 主框架：侧边栏 + 动态主组件 + 实时通道 + 桌面通知 + 心跳 | `messages-pending-count` + `announcements-changes` 两个 channel；与内嵌页**多重订阅**；桌面通知未授权无降级 |
| `Login.vue` | 214 | 登录、记住我 | ⚠️ 明文密码存 `localStorage`(:108)；`setTimeout(800)` 跳转(:115) |
| `Profile.vue` | 280 | 个人信息 + 改密 | ⚠️ 改密不校验原密码，直接 `updateUser`(:240) |
| `Admin.vue` | 2832 | 管理员控制台（用户/沟通/通知/看板/日志/存储） | 操作日志仅 `limit(200)` 无分页；`calculateStats` 全量 `exportAll` 算统计；`handleBackup` pageSize=500 循环导出；多处死代码导入 |
| `BusinessReceive.vue` | 2035 | 业务端收件箱（6 tab + 详情/转发/回复/红旗/点赞 + 实时 + 加载更多分页） | 分页正确（pageSize=50） |
| `LabReceive.vue` | 1751 | 实验室端收件箱（≈95% 克隆 BusinessReceive） | ⚠️ `:468` 引用未定义 `showActionDialog`（运行报错）；⚠️ 一次性全量拉取无分页；通知深链 tab 参数不一致 |
| `BusinessInitiate.vue` | 1349 | 业务端发起沟通（6 类/全字段/附件/抄送/模板/草稿） | ⚠️ `:110` 调用未定义 `previewImage`（无图片预览）；撤回重发回填 localStorage |
| `LabInitiate.vue` | 1095 | 实验室端发起（≈90% 克隆，字段精简） | 含图片预览（Business 缺失该功能） |
| `History.vue` | 225 | 已完结沟通 | ⚠️ `getAll()` 全量 + 前端 filter `status==='resolved'||isCompleted`(:165)，受默认分页影响可能漏数据 |
| `SentMessages.vue` | 1965 | 已发送（回复/撤回/转发/追加/红旗/快捷回复/跟进） | ⚠️ `getAll()` 全量 + 前端 filter `senderId===me`(:1236)，近期别人消息多时"已发送"可能空白；`submitFollowUp` 裸插 replies/notifications(:1626-1654) 绕开 api 层；与 Home 多重订阅 |
| `Organization.vue` | 1510 | 通讯录（多维模糊搜索 + 部门名片 + 快捷发起） | ⚠️ `profiles` 全量拉取无分页(:724)；`buildSearchKeys` 每次输入全量重算 |
| `Announcements.vue` | 862 | 公告（发布/撤回/编辑/点赞/红旗/搜索） | ⚠️ 全量 `announcementAPI.list()` 无分页(:545)；与 Home 多重订阅 |
| `Dashboard.vue` | 900 | 数据看板（区间统计/排名/分布/趋势 + 导出） | ⚠️ 统计量前端计算；`getDashboardData` **零分页**，PostgREST 默认上限静默截断 → 数字错得无征兆（最该先修） |
| `SampleTimeline.vue` | 419 | 按样品短号的时间线 | ⚠️ 裸 `supabase.from` 绕过 api 层；缺 `sampleCode` 时 `eq(undefined)` 拉全表 |

**孪生页面（改一处须同步另一处）**：
- `BusinessReceive ↔ LabReceive` ≈95% 克隆；差异见 §6。
- `BusinessInitiate ↔ LabInitiate` ≈90% 克隆；差异见 §6。
- 建议抽 `useReceivePage` / `useInitiateForm` composable，以配置（channel 名 / 分页策略 / 类型枚举 / 字段 schema / 是否含预览）区分。

---

## 4. Supabase 数据模型（前端可见表 + RPC）

**表**：`profiles`、`communications`、`communication_recipients`、`replies`、`notifications`、`announcements`、`announcement_reads`、`reactions`、`message_tags`、`department_cards`、`admin_logs`、`message_reads`(僵尸表，只写不读)、`user_cc_favorites`、`message_templates`、`user_quick_replies`。Storage bucket：`attachments`。

**RPC**：`admin_create_user`、`reset_user_password`(硬编码 `'cti123'`)、`increment_template_usage`、`admin_update_user_email`。

**前端隐式 RLS 假设**（后端必须核实，前端零服务端校验）：
1. `communications` SELECT 必须是 `sender_id=auth.uid() OR EXISTS(recipients WHERE recipient_id=auth.uid())`，否则 `getAll(null)` 泄露全公司正文。
2. `profiles` SELECT 不能全开，否则普通用户收件箱首屏就拉到全员手机号/邮箱。
3. `userAPI.update` 无字段白名单 + 无 `id===me` 校验 → 若 UPDATE policy 未限列，传 `{role:'admin'}` 即提权。
4. 三个管理 RPC **必须是 `SECURITY DEFINER` 且函数体内自校验 `auth.uid()` 对应 role**；前端只做了按钮隐藏。
5. Realtime 依赖 `communications`/`communication_recipients`/`announcements` 已开启发布且 RLS 对订阅生效。

---

## 5. API 层调用面（`src/api/index.js`，31 导出）

| 分组 | 导出 | 状态 | 关键风险 |
|---|---|---|---|
| `authAPI` | register/login/logout/getSession/getCurrentUser | login 在用；getSession/getCurrentUser 死 | `login` `must_change_password` 恒 false（:159 vs :164）；`register` priority 丢失 + PostgREST 过滤器注入(:86) |
| `userAPI` | getAll/getByRole/getById/disable/enable/deleteById/deleteAccount/resetPassword/update/deleteAccount/updateLastActive/adminUpdate/batchDisable/batchEnable/batchUpdate | 大部分在用；deleteById/batchUpdate 死 | `getAll` 全表 15 列（含 phone/email），6 调用点含普通用户首屏；`update` 无白名单无 `id===me`；`resetPassword` RPC 硬编码 `'cti123'` |
| `communicationAPI` | getAll/create/createReply/updateStatus/getById/getReplies/markAsRead/toggleCommFlag/toggleRecipientFlag/toggleRecipientCompleted/toggleCommCompleted/getPendingCount/getSentNewReplyCount/exportAll/getStorageStatus/getOldCommunications/cleanupOldData/recallMessage/getRecalledMessages/forwardMessage/editMessage/appendResend/getCCPresets/saveCCPresets/buildThreads | 核心；updateStatus/editMessage 死 | 分页不一致（4 调用方 3 种用法）；`getAll(null)` 全表越权；`createReply` 无事务 + `:778` TypeError（唯一会崩点）；`appendResend` `is_cc` 丢失（抄送升收件人）；`recallMessage` 无 5 分钟窗口校验；4 个 toggle 越权外包 RLS；`exportAll` 返回体无 `error` 键 |
| `announcementAPI` | create/list/getUnreadCount/markAsRead/markAllAsRead/update/delete/recall/republish/toggleAnnouncementFlag | 在用 | `list` 无参调用恒前 50；`getUnreadCount` 全表 + 前端过滤 + 吞错归零；update/delete/recall/republish 零权限校验 |
| `notificationAPI` | getAll/getUnreadCount/markAsRead/markAllAsRead/delete/deleteAnnouncement | 6 个死 5 | `delete` 无 `user_id` 条件（同组 markAsRead 有）→ 可删他人通知；`deleteAnnouncement` 与 announcementAPI 重复 |
| `storageAPI` | upload/remove | upload 在用；remove 死 | 删除消息/附件时 Storage 文件永不回收；bucket 硬编码 |
| `reactionAPI` | toggle/getStats/getStatsBatch/getDetail | toggle/getStatsBatch/getDetail 在用；getStats 死 | `toggle` 首赞留 406 噪声（应 maybeSingle）；三个写分支不接 error；`getStatsBatch` O(n×m) |
| `departmentCardAPI` | getDepartmentCards/validateCardHolders/getHolderIds/getCardKeysByHolderIds | 除 validateCardHolders 外在用 | 角色值中英混杂（4 中文+2 英文）；leader 判定需手工同步 3 处；validateCardHolders 死 → 发消息不校验负责人在职 |
| `templateAPI` | getMyTemplates/create/update/incrementUsage/remove | 在用 | update/remove 只按 id 无 user_id；incrementUsage fallback 竞态 |
| `tagAPI` | getAvailableTags/getByCommunication/setTags | **整组死** | 标签只能显示不能写入（无入口）；setTags 越权且无事务 |
| `quickReplyAPI` | getMyQuickReplies/create/update/remove | 在用 | update/remove 只按 id 无 user_id |
| `adminLogAPI` | log/getAll | log 在用；getAll 死（且被 Admin.vue 复制绕过） | 唯一 import `ElMessage`（分层污染）；所有路径无返回值；`describeAdminLogError` 错误模式顺序不可乱 |
| `statisticsAPI` | getDashboardData | 在用（Dashboard 独占） | 零分页 + 全表 + 前端聚合，静默截断（§6） |
| `backupAPI` | backupAll | **死但危险** | 8 张表 `select('*')` 全量无 limit，误用会备份不全 |
| `messageReadsAPI` | markAsRead/getReads | **整组死** | onConflict 带空格；与 communication_recipients 双套已读机制 |
| `departmentAPI` | getStats/updateProfile | **整组死** | `getStats` 查全表但**无 return**（白扫） |
| `uploadAPI` | upload/uploadMultiple | **整组死** | 路径桶名重复一层；串行无并发 |
| `readReceiptAPI` | markAsRead | **死** | 实现比 communicationAPI.markAsRead 更好（写 read_at），但未被接 → `read_at` 永不写入 |
| `subscribeToTable` | (fn) | **死** | 各页裸 channel 绕过它，且无统一 removeChannel 点 |

**JSON 日志契约**（全仓质量最高）：`buildLogDetail`/`parseLogDetail`/`buildMergedDetail`/`describeAdminLogError`（api:2387-2573）。全文件仅 2 处 `JSON.parse` 均有 try/catch。`describeAdminLogError` 判定顺序（表级 GRANT → RLS → PGRST205 → 列缺失 → 42P01 → jwt → 兜底）**不可调换、不可改写文案**。

---

## 6. 已知问题清单（按严重度）

### P0 — 安全 / 数据泄露
1. **CI 注入 service_role key 进前端构建**（`.github/workflows/deploy.yml`）——等于把整库交给浏览器，最高优先核查并移除。
2. **anon key 硬编码 fallback**（`utils/supabase.js`）已打进 `dist`——public 项目可接受，但意味着前端无任何秘密可言，一切靠 RLS。
3. **`communications.getAll(null)` 全表**——RLS 不严则泄露全公司沟通正文/客户名/样品号/附件 URL（api:391）。
4. **`profiles` 全表拉取**（含 phone/email），普通用户收件箱首屏即触发（api:236）。
5. **`getDashboardData` 跨用户全量读** + `Dashboard.vue` 无角色守卫（api:3049）。
6. **`reset_user_password` RPC 硬编码 `'cti123'`**（api:329）+ `rpc('admin_create_user')`/`increment_template_usage`——3 个 RPC 必须 `SECURITY DEFINER` 且自校验 role。
7. **`userAPI.update` 无字段白名单 / 无 `id===me`**（api:300）→ 提权。
8. **Login 明文密码存 localStorage**（Login.vue:108）。
9. **Profile 改密不校验原密码**（Profile.vue:240）。

### P0/P1 — 数据正确 / 确定性功能 bug
10. **`login` 的 `must_change_password` 恒 false**（api:159 select 漏字段 vs :164 读取）→ 强制改密永远不生效。
11. **`getDashboardData` 静默截断**（无 `.range()`，api:3049-3092）→ 30 天内沟通 >1000 看板数字全错且无征兆；`.in()` 超长 URL 还可能 414。
12. **`SentMessages`/`History` 用 `getAll()` 全量 + 前端 filter**（SentMessages:1236 / History:165）→ 近期别人消息多时"已发送"空白 / 已完结漏显。
13. **`LabReceive` 一次性全量拉取无分页**（LabReceive:1212），与 Business 不对等。
14. **`appendResend` `is_cc` 丢失**（api:1539 子查询漏 select `is_cc` vs :1581 使用）→ 抄送人升为收件人（确定功能 bug）。
15. **`createReply` 可能 TypeError**（api:648 查 `replierProfile` error 未接 → :778 `replierProfile.name` 无可选链）→ 全仓唯一会崩点。
16. **`LabReceive:468` 引用未定义 `showActionDialog`** → 全部 tab"处理"按钮运行报错。
17. **`BusinessInitiate:110` 调用未定义 `previewImage`** → 点击缩略图无预览。
18. **`read_at` 永不写入**（communicationAPI.markAsRead:918 只写 `is_read`，readReceiptAPI:3109 才是正确实现但死）→ "已读时间"展示恒空。
19. **`recallMessage` 无 5 分钟窗口校验**（api:1247 注释写 5 分钟，函数体无校验）。
20. **`register` priority 丢失**（api:80 解构但未传给 RPC）+ **PostgREST 过滤器注入**（api:86 模板字符串拼 `.or()`）。
21. **`ccDeptCardIds` 永不落库**（api:1657-1674 只写 ccUserIds）。

### P1 — 重复 / 维护债
22. **Business/Lab 孪生页 ~2700 行重复**（95%/90% 克隆），改一处须同步另一处。
23. **角色配置三处重复**：`api:2307` vs `utils/departmentConfig.js:50` vs `Organization.vue:514`，内容不一致，改配色/分类须改 2~3 处。
24. **20 个死导出**（见 §5）+ 死/断裂 `types/` + 死 `useApi.js` + 90 行死 CSS + 16 个 0% 使用 CSS 变量。
25. **`App.vue` 4 个 bug**：通知 timer 需刷新才启动、`.limit(1)` 丢通知、客户端 vs 服务端时钟错位、未 scoped 的 `<style>` 覆盖全局中文字体。
26. **无组件层**（0 defineProps/defineEmits）→ 复用度 0/5。
27. **Realtime 多重订阅**（Home 与内嵌 Announcements/SentMessages 各自建 channel）→ 事件可能重复触发。
28. **`useDebounce` timer 卸载未清**；`autoSave` watch stop handle 未留存。

> 注：用户在前期评审中明确表态"这些优化都不必改"。以上清单为**理解性档案**，非待办。改代码前先回看此处，避免踩已知雷。

---

## 7. 排障协议（必读）

- **"RLS 拒绝 = 显示 0/空"模式遍布全仓**：`getPendingCount`/`getUnreadCount`/各种吞错返回 0。排障时**看 Network 面板，不只看 UI**。
- **anon key 直连**：任何前端权限判断都能被 devtools 改 UUID 绕过，除非 RLS 兜底。涉及越权的需求，先问"RLS 策略是什么"。
- **`public/sw.js` 缓存 GET**：部署后旧数据残留 → 排"数据没更新"先清 Service Worker / 硬刷。
- **`service_role` key 在 CI 注入前端**：若有人从构建产物提取，等于获得整库写权限。最高优先从 CI 移除。
- **`describeAdminLogError` 错误模式顺序不可乱**：新增分支必须插在正确顺序位，且**不得**把 Supabase 原文替换成自编文案。
- **孪生页**：改 Business 端的逻辑要同步检查 Lab 端（反之亦然），尤其分页、深链 tab 参数、typeMap 枚举。
- **裸 `supabase.from` 散落**：SampleTimeline / Organization(部分) / SentMessages(部分)。RLS 或字段变更时这些点最易漏改。

---

## 8. 快速索引

| 想做的事 | 看哪里 |
|---|---|
| 改登录/会话/强制改密 | `src/api/index.js` authAPI + `Login.vue` + `Profile.vue` |
| 改收件箱/回复/转发/红旗 | `BusinessReceive.vue` / `LabReceive.vue`（先确认是否同步 Lab/Business） |
| 改发起沟通/模板/草稿 | `BusinessInitiate.vue` / `LabInitiate.vue` |
| 改已发送/撤回/追加 | `SentMessages.vue` + `communicationAPI.recallMessage/appendResend/forwardMessage` |
| 改公告 | `Announcements.vue` + `announcementAPI` |
| 改看板数字 | `Dashboard.vue` + `statisticsAPI.getDashboardData`（先查 §6-#11 截断） |
| 改通讯录搜索 | `Organization.vue` + `utils/pinyinSearch.js` + `departmentCardAPI` |
| 改管理员/日志/备份 | `Admin.vue` + `adminLogAPI` + `userAPI` |
| 改实时通知 | `Home.vue`(messages/announcements channel) + 各页 `supabase.channel` |
| 改角色/部门配色 | `api:2307` + `utils/departmentConfig.js:50` + `Organization.vue:514`（三处同步） |
| 改权限边界 | 先确认对应表 RLS policy，再看 §4 / §6-P0 |

---

## 9. 维护优先级 Top 10（若未来要修）

| P | 项 | 位置 |
|---|---|---|
| 1 | 核查 3 个管理 RPC 的 `SECURITY DEFINER` 鉴权（尤其 `reset_user_password`） | api:99/327/2967 |
| 2 | 核查 `communications` 与 `profiles` 的 SELECT policy | api:391/236 |
| 3 | 修 `login` 的 `must_change_password` | api:159 vs :164 |
| 4 | 修 `getDashboardData` 静默截断 | api:3049-3092 |
| 5 | 统一 `communicationAPI.getAll` 调用方式 | SentMessages:1236 / History:165 / LabReceive:1217 |
| 6 | 修 `appendResend` 的 `is_cc` 丢失 | api:1539 vs :1581 |
| 7 | 修 `createReply` 的 TypeError | api:648/778 |
| 8 | 修 `read_at` 永不写入 | api:918 vs :3109 |
| 9 | 收敛角色配置三处重复 | api:2307 / departmentConfig:50 / Organization:514 |
| 10 | 修 `register` 的 PostgREST 过滤器注入 | api:86 |

---

*文档结束。本文件为理解性档案，不替代源码；改代码前以实际 `file:line` 为准。*
