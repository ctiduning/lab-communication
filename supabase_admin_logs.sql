-- ============================================================
-- 管理员操作日志表 admin_logs —— 修复 / 建表脚本（幂等，可反复执行）
-- ============================================================
-- 【本次根因（2026-08-05 实证确认）】
--   报错 [42501] permission denied for table admin_logs
--   ↑ 这不是 RLS 策略问题，也不是 PostgREST schema 缓存问题，而是【表级 GRANT 缺失】。
--
--   证据：用 anon key 直接打 REST API，PostgREST 返回的 hint 字段原文就是——
--     "Grant the required privileges to the current role with:
--      GRANT SELECT, INSERT ON public.admin_logs TO anon;"
--
--   为什么改 RLS 策略永远修不好：
--     PostgreSQL 的权限检查是两层，顺序是 【表级 ACL (GRANT)】→ 【行级安全 (RLS)】。
--     表级 ACL 没过，请求在到达 RLS 之前就被拒了，所以策略改成 USING(true) 也没用。
--     两者的报错文案完全不同，可据此秒判：
--       表级 GRANT 缺失  → permission denied for table xxx        （本次就是这个）
--       RLS 策略拒绝     → new row violates row-level security policy for table "xxx"
--       RLS 只过滤行     → SELECT 返回空数组 []，不会报任何错
--     缓存里没这张表    → PGRST205 Could not find the table 'public.xxx' in the schema cache
--
--   为什么"schema 缓存"理论是错的：
--     缓存缺表的报文是 PGRST205，不是 42501。错误从 PGRST204 变成 42501，
--     恰恰证明缓存【已经刷新过了】——PostgREST 已经能看到这张表，只是没权限读。
--
--   诱因：DROP TABLE ... CASCADE 重建后，新表 owner 是 postgres，
--         anon / authenticated 角色对新表是零权限；若项目的 ALTER DEFAULT PRIVILEGES
--         没覆盖到（或历史上被 REVOKE 过），就会出现本次故障。
-- ============================================================
-- 【怎么用】
--   场景 A（推荐，99% 的情况选这个）：表已存在，只补权限/补列，【不丢数据】
--       → 直接全选执行本文件即可。CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS
--         保证表在/表不在、列全/列缺 都能正确收敛，且不会清空已有日志。
--   场景 B（仅在确实要清空重来时）：全新重建
--       → 先手动取消下面【场景 B】那一行 DROP TABLE 的注释，再全选执行。
--         ⚠️ DROP TABLE 会永久删除已有日志，非必要不要用。
-- ============================================================
-- 【本脚本不使用 DO 块】—— 历史上用 DO 块查 pg_policies 撞过 40P01 deadlock，
--   这里全部改用 DROP POLICY IF EXISTS + CREATE POLICY 的单条 DDL，锁粒度更小。
-- ============================================================

-- 锁超时保护：宁可快速失败，也不要卡死成 40P01 deadlock。
-- 若执行时提示 lock_timeout，请关闭正在打开该表的前端页面/其他 SQL 窗口后重跑。
SET lock_timeout = '10s';

-- ------------------------------------------------------------
-- 【场景 B 专用】全新重建：默认注释掉，需要清空重来时才取消注释
-- ------------------------------------------------------------
-- DROP TABLE IF EXISTS public.admin_logs CASCADE;

-- ------------------------------------------------------------
-- 1. 建表（表已存在则自动跳过，不影响已有数据）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id               BIGSERIAL PRIMARY KEY,
  admin_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_name       TEXT,
  action           TEXT NOT NULL,
  target_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_name TEXT,
  detail           TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. 补列（修复历史遗留的旧表结构，解决 PGRST204 "找不到 admin_name 列"）
--    全部按 nullable 补，表里已有数据也能安全执行，不需要 DROP TABLE。
--    ⚠️ admin_id / action 也必须列在这里：若历史遗留表恰好缺 admin_id，
--       后面第 6.1 步 WITH CHECK (admin_id = auth.uid()) 会直接报错中止，
--       而此时 GRANT 已生效、RLS 已开启、INSERT 策略却没建成，
--       客户会卡在"所有写入被拒"的半执行状态，比原故障更难查。
--    注意：这里补出来的 admin_id / action 是 nullable，与第 1 步 CREATE TABLE
--       里的 NOT NULL 不同——对已有数据的表无法直接加 NOT NULL 约束，
--       但不影响功能（前端始终会写这两个字段，RLS 策略也会校验 admin_id）。
-- ------------------------------------------------------------
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS admin_id         UUID;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS action           TEXT;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS admin_name       TEXT;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS target_user_id   UUID;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS target_user_name TEXT;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS detail           TEXT;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------
-- 3. 索引（幂等）
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id   ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);

-- ------------------------------------------------------------
-- 4. ★★★ 核心修复：表级 GRANT ★★★
--    这是本次 42501 的真正解药，前面所有 RLS 折腾都绕过了这一层。
-- ------------------------------------------------------------

-- 4.1 schema 使用权（没有它，schema 下所有对象都访问不了）
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 4.2 表权限：按前端实际需要的动作精确授予，不滥给 UPDATE / DELETE
--     前端行为：登录后的管理员 写日志(INSERT) + 看日志(SELECT)，日志不可改不可删。
GRANT SELECT, INSERT ON TABLE public.admin_logs TO authenticated;

-- 4.3 ⚠️ anon（未登录）默认【不授予】任何权限——这一行是故意注释掉的，不要随手打开。
--
--     为什么不能默认放开：
--       anon 用的 publishable key 就明文打包在前端 JS 里，等于对全互联网公开。
--       本项目历史上反复手改过 RLS，库里可能残留【本脚本没覆盖到的、别的名字的】
--       SELECT 策略（例如 FOR SELECT TO public USING (true)）。第 6 步只 DROP 了
--       6 个写死名字的策略，兜不住未知命名的残留。一旦给 anon 放开 SELECT，
--       只要有任何一条对 anon 生效的宽松策略，全部管理员操作日志就对外裸奔。
--       这不是理论风险：本项目 profiles 表当前就是 anon 可读全表（已另案上报）。
--
--     那怎么验证"权限修好了"？→ 用第 8 步的 has_table_privilege 自检，
--       它查的是系统目录，不需要给 anon 任何权限，比打 REST API 更准也更安全。
--
--     仅当你确实想用浏览器地址栏那种方式自证时，才临时取消下面这行注释，
--     并在验证完【立刻】执行 REVOKE 收回：
--       REVOKE SELECT ON TABLE public.admin_logs FROM anon;
-- GRANT SELECT ON TABLE public.admin_logs TO anon;

-- 4.4 序列权限：id 是 BIGSERIAL，背后有序列 admin_logs_id_seq。
--     只补表权限而漏掉序列的话，INSERT 会继续报
--     "permission denied for sequence admin_logs_id_seq"。
--     只授给 authenticated：anon 不写日志，不需要序列权限。
--     只针对本表这一条序列，不用 ALL SEQUENCES 波及 schema 下其他表。
--     （若这句报"relation does not exist"，说明表不是用 BIGSERIAL 建的，
--       用 SELECT pg_get_serial_sequence('public.admin_logs','id'); 查出真实序列名再替换。）
GRANT USAGE, SELECT ON SEQUENCE public.admin_logs_id_seq TO authenticated;

-- 4.5 防复发：让后续新建的表/序列自动带上权限。
--
--     ⚠️ 适用范围有限，别当成万能保险：
--       ALTER DEFAULT PRIVILEGES 不写 FOR ROLE 时，【只对当前执行角色以后新建的对象生效】。
--       换个角色建表（或用 Dashboard 图形界面建表）不一定继承，届时仍需手工补 GRANT。
--
--     ⚠️ 这里【只给 SELECT, INSERT】，绝不给 UPDATE / DELETE：
--       用裸 SQL CREATE TABLE 建的表【默认不开 RLS】，如果默认权限里带了 UPDATE/DELETE，
--       那么以后在 public 下新建的任何表，任何登录用户都能改写/删除全表数据。
--       与 4.2 "不滥给 UPDATE/DELETE" 的原则保持一致。
--
--     ⚠️ 同理，这里【不给 anon 任何默认权限】：
--       给 anon 配默认 SELECT，等于以后新建的每张表都自动对未登录访客可读，
--       而新表默认不开 RLS —— 这正是本项目 profiles 表被 anon 读走全表的成因。
--       以后确实需要某张表公开只读时，再对那一张表单独 GRANT，保持"显式授权"。
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- ------------------------------------------------------------
-- 5. 启用 RLS（行级安全，负责"能看到哪些行"，与上面的"能不能碰这张表"是两回事）
-- ------------------------------------------------------------
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 6. RLS 策略（DROP + CREATE 保证幂等，且不使用 DO 块）
--    连同历史遗留的各种命名残留一起清掉，避免多条策略互相干扰。
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "admin_logs_insert_self"   ON public.admin_logs;
DROP POLICY IF EXISTS "admin_logs_select_admin"  ON public.admin_logs;
DROP POLICY IF EXISTS "admin_logs_insert_policy" ON public.admin_logs;
DROP POLICY IF EXISTS "admin_logs_select_policy" ON public.admin_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.admin_logs;
DROP POLICY IF EXISTS "Enable read access for all users"           ON public.admin_logs;

-- 6.1 写入：只能以自己的身份写日志，杜绝伪造他人操作记录
CREATE POLICY "admin_logs_insert_self"
  ON public.admin_logs FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

-- 6.2 读取：已登录即可读。
--     选择这个而不是 role='admin' 判定，是因为后台入口本身已有路由守卫，
--     再叠一层 role 依赖只会把"读不到日志"变成又一个难排查的问题（历史上已经踩过）。
--
--     关于未登录(anon)为什么读不到：注意上面两条策略都写了 TO authenticated，
--     它们对 anon【根本不适用】。RLS 开启后若没有任何一条适用的策略，
--     Postgres 默认拒绝（default deny），anon 因此拿不到任何行。
--     ——不是"被 auth.uid() IS NOT NULL 这个条件过滤掉"，机制不同，别记混：
--       条件过滤的前提是策略先适用；策略压根不适用时，走的是默认拒绝。
--     这也说明：安全的根基是"不给 anon 表级 GRANT"（见 4.3），
--     而不是指望策略条件去兜底。
CREATE POLICY "admin_logs_select_admin"
  ON public.admin_logs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------
-- 7. 刷新 PostgREST schema 缓存
--    ⚠️ 新版 Supabase Dashboard 已经没有 "Reload schema" 按钮了，
--       不用再去界面上找——下面这一句 SQL 就完全等价，跑一次即可。
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 8. 保留：update_last_active RPC（与本表无关，原样保留）
--    ⚠️ 位置说明：这段 DDL 必须放在最后那条自检查询【之前】。
--       Supabase SQL Editor 只展示最后一条语句的结果，DDL 不返回行，
--       若放在自检之后，你看到的就只会是 "Success. No rows returned"，
--       真正要看的自检表反而被顶掉了。
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_last_active()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET last_active_at = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_last_active() TO authenticated;

-- ============================================================
-- 9. 怎么确认真的修好了
--
--    ✅ 首选：看下面第 10 步那张自检表，"实际结果"与"期望值"逐行一致即为成功。
--       它直接查系统目录，不依赖 anon 权限，最准也最安全。
--
--    ✅ 终验：回到系统后台【管理员后台 → 操作日志 Tab】，
--       能正常加载列表、且做一次管理操作后能看到新日志条目，即为真正打通。
--
--    ❌ 不要再用"浏览器地址栏打 REST API"那招了：
--       本脚本已【默认不给 anon 任何权限】（见 4.3），未登录访问必然继续报 42501，
--       那是预期内的正确行为，不代表没修好，别被它带偏。
--       非要用的话，得先临时打开 4.3 那行 GRANT，且验证完立刻 REVOKE。
-- ============================================================

-- ============================================================
-- 【已移除的历史无效语句 —— 记录在此避免有人再加回来】
--   曾经的第 6 步：UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
--   这句在 Supabase SQL Editor 里【永远匹配 0 行】，是无效语句。
--   原因：SQL Editor 以 postgres 角色执行，请求里没有用户 JWT，
--         因此 auth.uid() 恒为 NULL，WHERE id = NULL 匹配不到任何行。
--   它曾让人误以为"已经把自己设成 admin 了"，从而把排查方向带偏。
--   如需手工设管理员，请显式写明账号，例如：
--     UPDATE public.profiles SET role = 'admin' WHERE employee_id = '13168';
-- ============================================================

-- ============================================================
-- 10. 自检（本文件最后一条语句，全选执行后你看到的就是它）
--
--    ⚠️ 合并成【一条】查询、并且放在文件最末尾，是刻意为之：
--       Supabase SQL Editor 全选执行时只显示【最后一条语句】的结果集。
--       拆成多段的话你只会看到最后一段，真正判断"修好没有"的权限检查反而看不到；
--       后面若再跟 DDL，则会显示 "Success. No rows returned" 把结果顶掉。
--       ——以后往本文件追加语句，请一律加在这条查询【上面】。
--
--    看法：只要"实际结果"这一列和"期望值"这一列【逐行一致】，就算修复成功。
-- ============================================================
SELECT '① authenticated 可读 (SELECT)'::text AS 检查项,
       has_table_privilege('authenticated', 'public.admin_logs', 'SELECT')::text AS 实际结果,
       'true'::text AS 期望值
UNION ALL SELECT '② authenticated 可写 (INSERT)',
       has_table_privilege('authenticated', 'public.admin_logs', 'INSERT')::text,
       'true'
UNION ALL SELECT '③ authenticated 可用序列 (USAGE)',
       -- 用 pg_get_serial_sequence 动态取序列名，序列名与默认不同也能正确检出
       has_sequence_privilege('authenticated',
         pg_get_serial_sequence('public.admin_logs', 'id'), 'USAGE')::text,
       'true'
UNION ALL SELECT '④ RLS 已启用',
       (SELECT relrowsecurity::text FROM pg_class
         WHERE oid = 'public.admin_logs'::regclass),
       'true'
UNION ALL SELECT '⑤ INSERT 策略条数',
       (SELECT count(*)::text FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'admin_logs' AND cmd = 'INSERT'),
       '1'
UNION ALL SELECT '⑥ SELECT 策略条数',
       (SELECT count(*)::text FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'admin_logs' AND cmd = 'SELECT'),
       '1'
UNION ALL SELECT '⑦ anon 可读（必须为 false，否则日志对全网公开）',
       has_table_privilege('anon', 'public.admin_logs', 'SELECT')::text,
       'false'
UNION ALL SELECT '⑧ authenticated 表级授权明细',
       (SELECT string_agg(privilege_type, ', ' ORDER BY privilege_type)
          FROM information_schema.role_table_grants
         WHERE table_schema = 'public' AND table_name = 'admin_logs'
           AND grantee = 'authenticated'),
       'INSERT, SELECT'
UNION ALL SELECT '⑨ 现存策略清单（有多余策略要警惕）',
       (SELECT string_agg(policyname || '(' || cmd || ')', ', ' ORDER BY policyname)
          FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'admin_logs'),
       'admin_logs_insert_self(INSERT), admin_logs_select_admin(SELECT)'
UNION ALL SELECT '⑩ 对 anon 生效的策略条数（必须为 0）',
       (SELECT count(*)::text FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'admin_logs'
           AND ('anon' = ANY(roles) OR 'public' = ANY(roles))),
       '0';
