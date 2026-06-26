-- ==========================================
-- RLS 策略修复（合并版）
-- 解决换电脑/手机登录时大量 403 Forbidden 的问题
-- 在 Supabase SQL Editor 中执行一次即可
-- ==========================================

-- ========== 1. user_cc_favorites ==========
ALTER TABLE user_cc_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可以查看自己的抄送人预设" ON user_cc_favorites;
DROP POLICY IF EXISTS "用户可以添加自己的抄送人预设" ON user_cc_favorites;
DROP POLICY IF EXISTS "用户可以删除自己的抄送人预设" ON user_cc_favorites;

CREATE POLICY "用户可以查看自己的抄送人预设"
  ON user_cc_favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "用户可以添加自己的抄送人预设"
  ON user_cc_favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "用户可以删除自己的抄送人预设"
  ON user_cc_favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ========== 2. user_quick_replies ==========
ALTER TABLE user_quick_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户管理自己的快捷回复" ON user_quick_replies;
CREATE POLICY "用户管理自己的快捷回复"
  ON user_quick_replies FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ========== 3. message_templates ==========
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户只能管理自己的模板" ON message_templates;
CREATE POLICY "用户只能管理自己的模板"
  ON message_templates FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========== 4. message_tags ==========
ALTER TABLE message_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可以查看包含自己的消息的标签" ON message_tags;
DROP POLICY IF EXISTS "发送人可以添加标签" ON message_tags;
DROP POLICY IF EXISTS "发送人可以删除标签" ON message_tags;

CREATE POLICY "用户可以查看包含自己的消息的标签"
  ON message_tags FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM communication_recipients WHERE communication_recipients.communication_id = message_tags.communication_id AND communication_recipients.recipient_id = auth.uid())
    OR EXISTS (SELECT 1 FROM communications WHERE communications.id = message_tags.communication_id AND communications.sender_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "发送人可以添加标签"
  ON message_tags FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM communications WHERE communications.id = communication_id AND communications.sender_id = auth.uid())
  );

CREATE POLICY "发送人可以删除标签"
  ON message_tags FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM communications WHERE communications.id = communication_id AND communications.sender_id = auth.uid())
  );
