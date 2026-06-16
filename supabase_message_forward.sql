-- communications 表增加 forwarded_from 字段
ALTER TABLE communications ADD COLUMN IF NOT EXISTS forwarded_from UUID REFERENCES communications(id) ON DELETE SET NULL;
-- 增加转发附言字段
ALTER TABLE communications ADD COLUMN IF NOT EXISTS forward_note TEXT;
