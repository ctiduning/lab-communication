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
--    全部 nullable，表里已有数据也能安全执行，不需要 DROP TABLE。
-- ------------------------------------------------------------
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

-- 4.3 anon 只给 SELECT —— 目的是让你能用一条 curl 立刻验证"权限已修好"。
--     安全性由 RLS 兜底：anon 的 auth.uid() 为 NULL，下面的 SELECT 策略会过滤掉全部行，
--     未登录访问只会拿到空数组 []，不会泄露任何日志内容。
--     若你要更严格，执行完并验证通过后可以收紧：
--       REVOKE SELECT ON TABLE public.admin_logs FROM anon;
GRANT SELECT ON TABLE public.admin_logs TO anon;

-- 4.4 序列权限：id 是 BIGSERIAL，背后有 admin_logs_id_seq。
--     只补表权限而漏掉序列的话，INSERT 会继续报
--     "permission denied for sequence admin_logs_id_seq"。
--     用 ALL SEQUENCES 兜底，避免序列名不一致时脚本中断。
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 4.5 防复发：以后在 public 下新建的表/序列自动带上权限，
--     不用再为"新建表又 42501"重走一遍这个坑。
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;

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
-- 8. 自检：跑完上面所有语句后，下面三条查询会直接告诉你修好没有
-- ============================================================

-- 8.1 权限总览：四个字段必须【全部为 true】，否则说明上面某条 GRANT 没执行成功
SELECT
  has_table_privilege('authenticated', 'public.admin_logs', 'SELECT')          AS authenticated_可读,
  has_table_privilege('authenticated', 'public.admin_logs', 'INSERT')          AS authenticated_可写,
  has_sequence_privilege('authenticated', 'public.admin_logs_id_seq', 'USAGE') AS authenticated_可用序列,
  has_table_privilege('anon',           'public.admin_logs', 'SELECT')         AS anon_可读;

-- 8.2 明细：应至少看到 authenticated 的 SELECT 和 INSERT 两行
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'admin_logs'
ORDER BY grantee, privilege_type;

-- 8.3 策略确认：应看到 admin_logs_insert_self(INSERT) 与 admin_logs_select_admin(SELECT) 两条
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'admin_logs'
ORDER BY policyname;

-- ============================================================
-- 9. 【可选】浏览器端零成本验证：把下面网址粘进浏览器地址栏回车
--    （anon key 是前端公开密钥，可以直接放 URL）
--
--    https://qgoqhjwekairknkuqisi.supabase.co/rest/v1/admin_logs?select=*&limit=1&apikey=<你的_anon_key>
--
--    修复前：{"code":"42501","message":"permission denied for table admin_logs"}
--    修复后：[]        ← 空数组就是成功！RLS 把未登录用户的行全过滤掉了，这是正确行为
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
-- 保留：update_last_active RPC（与本表无关，原样保留）
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
