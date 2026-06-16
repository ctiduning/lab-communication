-- 消息标签表
CREATE TABLE IF NOT EXISTS message_tags (
  id BIGSERIAL PRIMARY KEY,
  communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_tags_comm ON message_tags(communication_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_name ON message_tags(tag_name);

-- 查询标签用 RLS
ALTER TABLE message_tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_tags' AND policyname = '用户可以查看包含自己的消息的标签') THEN
    CREATE POLICY "用户可以查看包含自己的消息的标签"
      ON message_tags FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM communication_recipients
          WHERE communication_recipients.communication_id = message_tags.communication_id
            AND communication_recipients.recipient_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM communications
          WHERE communications.id = message_tags.communication_id
            AND communications.sender_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_tags' AND policyname = '发送人可以添加标签') THEN
    CREATE POLICY "发送人可以添加标签"
      ON message_tags FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM communications
          WHERE communications.id = communication_id
            AND communications.sender_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_tags' AND policyname = '发送人可以删除标签') THEN
    CREATE POLICY "发送人可以删除标签"
      ON message_tags FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM communications
          WHERE communications.id = communication_id
            AND communications.sender_id = auth.uid()
        )
      );
  END IF;
END $$;
