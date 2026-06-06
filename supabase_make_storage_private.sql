-- ==========================================
-- 将 attachments bucket 改为 Private
-- 在 Supabase SQL 编辑器中运行
-- ==========================================

-- 方法1：通过 UPDATE 语句修改（需要 service_role key）
-- 注意：通常需要通过 Supabase Dashboard 手动操作
-- Storage → Buckets → attachments → 取消勾选 "Public Bucket"

-- 方法2：通过 SQL 修改（如果有权限）
-- 注意：这个方法可能不工作，因为.storage.buckets 是系统表
UPDATE storage.buckets 
SET public = false 
WHERE id = 'attachments';

-- 验证
SELECT id, name, public FROM storage.buckets WHERE id = 'attachments';
