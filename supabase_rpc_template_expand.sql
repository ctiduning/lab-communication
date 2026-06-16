-- ==========================================
-- 扩展 message_templates 表：添加完整表单字段
-- ==========================================

ALTER TABLE message_templates
  ADD COLUMN IF NOT EXISTS type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS vip text DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS sample_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS sample_matrix text DEFAULT '',
  ADD COLUMN IF NOT EXISTS sample_count text DEFAULT '',
  ADD COLUMN IF NOT EXISTS test_items text DEFAULT '',
  ADD COLUMN IF NOT EXISTS sample_date text DEFAULT '',
  ADD COLUMN IF NOT EXISTS requested_cycle text DEFAULT '',
  ADD COLUMN IF NOT EXISTS charge_status text DEFAULT '',
  ADD COLUMN IF NOT EXISTS urgent_fee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS remark text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
