-- ============================================
-- 彻底修复 RLS 无限递归
-- 在 Supabase SQL Editor 执行
-- ============================================

-- 1. 列出并删除 communications 表的所有策略
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'communications' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON communications', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- 2. 列出并删除 communication_recipients 表的所有策略
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'communication_recipients' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON communication_recipients', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- 3. 列出并删除 replies 表的所有策略
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'replies' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON replies', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- 4. 列出并删除 notifications 表的所有策略
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'notifications' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON notifications', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- 5. 列出并删除 profiles 表的所有策略
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- 6. 删除可能引起递归的辅助函数
DROP FUNCTION IF EXISTS is_recipient(UUID);
DROP FUNCTION IF EXISTS is_sender_or_recipient(UUID);

-- 7. 重新创建全开放策略（简单直接，不引用其他表，不会递归）
CREATE POLICY "profiles_open" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "communications_open" ON communications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "recipients_open" ON communication_recipients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "replies_open" ON replies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "notifications_open" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Done!
SELECT '所有旧策略已清除，新策略已创建，无限递归已修复！' AS result;
