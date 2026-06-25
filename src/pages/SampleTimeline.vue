<template>
  <div class="sample-timeline-page">
    <div class="page-header">
      <el-button size="small" @click="$router.back()" :icon="ArrowLeft">返回</el-button>
      <h2>样品时间线</h2>
      <p class="page-desc" v-if="sampleCode">样品短号：<strong>{{ sampleCode }}</strong></p>
    </div>

    <div class="timeline-container" v-loading="loading">
      <div v-if="timelineItems.length === 0 && !loading" class="empty-state">
        暂无该样品的沟通记录
      </div>

      <div class="timeline">
        <div
          v-for="(item, idx) in timelineItems"
          :key="idx"
          class="timeline-item"
          :class="item.type"
        >
          <!-- 时间轴左侧：日期 + 圆点 -->
          <div class="timeline-left">
            <div class="timeline-date">{{ formatDate(item.createdAt) }}</div>
            <div class="timeline-time">{{ formatTime(item.createdAt) }}</div>
          </div>

          <!-- 竖线 + 圆点 -->
          <div class="timeline-dot-wrapper">
            <div class="timeline-dot" :class="item.type"></div>
            <div class="timeline-line"></div>
          </div>

          <!-- 右侧：气泡卡片 -->
          <div class="timeline-card" :class="item.type">
            <!-- 消息类型标签 -->
            <div class="card-header">
              <el-tag size="small" :type="getCardTagType(item.type)">
                {{ getCardLabel(item.type) }}
              </el-tag>
              <span class="card-sender">{{ item.senderName }}</span>
            </div>

            <!-- 消息内容 -->
            <div class="card-body">
              <div class="card-content">{{ item.content || '(无内容)' }}</div>

              <!-- 沟通详情（仅原始消息） -->
              <template v-if="item.type === 'original'">
                <el-descriptions :column="2" border size="small" style="margin-top: 10px;">
                  <el-descriptions-item label="沟通类型">{{ getTypeName(item.raw.type) }}</el-descriptions-item>
                  <el-descriptions-item label="客户名称">{{ item.raw.customerName || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="样品基质">{{ item.raw.sampleMatrix || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="测试项目">{{ item.raw.testItems || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="周期">{{ item.raw.requestedCycle || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="费用">{{ item.raw.chargeStatus || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="加急费">{{ item.raw.urgentFee || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="备注" :span="2">{{ item.raw.remark || '-' }}</el-descriptions-item>
                </el-descriptions>
              </template>
            </div>

            <!-- 目标接收人（仅回复） -->
            <div v-if="item.type === 'reply' && item.raw.targetRecipientName" class="card-footer">
              <span class="reply-target">回复 → {{ item.raw.targetRecipientName }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';
import { supabase } from '../utils/supabase';

const route = useRoute();
const sampleCode = computed(() => route.query.sampleCode || '');

const loading = ref(false);
const timelineItems = ref([]);
const allUsers = ref([]);

const typeMap = {
  paid_urgent: '付费加急',
  free_urgent: '免费加急',
  data_dispute: '数据质疑',
  follow_up: '跟单',
  consultation: '咨询',
  other: '其他',
  unqualified: '不合格沟通',
  data_confirm: '数据确认'
};
const getTypeName = (type) => typeMap[type] || type || '-';

const formatDate = (t) => {
  if (!t) return '-';
  const d = new Date(t);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  const dateStr = d.toDateString();
  if (dateStr === today) return '今天';
  if (dateStr === yesterday) return '昨天';
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
};

const formatTime = (t) => {
  if (!t) return '-';
  return new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const getCardTagType = (type) => {
  if (type === 'original') return 'primary';
  if (type === 'append') return 'warning';
  if (type === 'reply') return 'success';
  return 'info';
};

const getCardLabel = (type) => {
  if (type === 'original') return '原始消息';
  if (type === 'append') return '追加发送';
  if (type === 'reply') return '回复';
  return '消息';
};

const getUserName = (userId) => {
  const u = allUsers.value.find(u => u.id === userId);
  return u ? (u.name || u.username || '未知') : '未知';
};

const loadData = async () => {
  if (!sampleCode.value) return;
  loading.value = true;
  try {
    // 加载所有用户
    const { data: users } = await supabase.from('profiles').select('id, name, username');
    allUsers.value = users || [];

    // 查询该样品短号的所有沟通记录（含 replies）
    const { data: comms } = await supabase
      .from('communications')
      .select(`
        *,
        sender:sender_id(id, name),
        replies(
          id, content, sender_id, created_at,
          sender:sender_id(name),
          target_recipient_id
        )
      `)
      .eq('sample_code', sampleCode.value)
      .order('created_at', { ascending: true });

    if (!comms || comms.length === 0) {
      timelineItems.value = [];
      return;
    }

    // 构建时间线
    const items = [];
    comms.forEach(comm => {
      const senderName = comm.sender?.name || getUserName(comm.sender_id);

      // 原始消息
      items.push({
        type: comm.is_append_forward ? 'append' : 'original',
        senderName,
        content: comm.content || '',
        createdAt: comm.created_at,
        raw: {
          type: comm.type,
          customerName: comm.customer_name,
          sampleMatrix: comm.sample_matrix,
          testItems: comm.test_items,
          requestedCycle: comm.requested_cycle,
          chargeStatus: comm.charge_status,
          urgentFee: comm.urgent_fee,
          remark: comm.remark
        }
      });

      // 回复
      if (comm.replies && comm.replies.length > 0) {
        comm.replies
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          .forEach(reply => {
            const replySenderName = reply.sender?.name || getUserName(reply.sender_id);
            const targetName = reply.target_recipient_id ? getUserName(reply.target_recipient_id) : '';
            items.push({
              type: 'reply',
              senderName: replySenderName,
              content: reply.content || '',
              createdAt: reply.created_at,
              raw: {
                targetRecipientName: targetName
              }
            });
          });
      }
    });

    // 按时间排序
    items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    timelineItems.value = items;
  } catch (e) {
    console.error('加载样品时间线失败:', e);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.sample-timeline-page {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
}

.page-desc {
  color: #888;
  font-size: 14px;
  margin: 4px 0 0 0;
  width: 100%;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 80px 20px;
  font-size: 15px;
}

/* 时间轴容器 */
.timeline-container {
  min-height: 300px;
}

.timeline {
  position: relative;
  padding-left: 0;
}

/* 每条时间线项目 */
.timeline-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 0;
  position: relative;
}

/* 左侧日期时间 */
.timeline-left {
  width: 70px;
  flex-shrink: 0;
  text-align: right;
  padding-right: 16px;
  padding-top: 2px;
}

.timeline-date {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.timeline-time {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

/* 圆点 + 竖线 */
.timeline-dot-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
  flex-shrink: 0;
  position: relative;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
  z-index: 1;
}

.timeline-dot.original {
  background: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
}

.timeline-dot.append {
  background: #e6a23c;
  box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.2);
}

.timeline-dot.reply {
  background: #67c23a;
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2);
}

.timeline-line {
  width: 2px;
  flex: 1;
  min-height: 20px;
  background: #e4e7ed;
  margin-top: 4px;
}

.timeline-item:last-child .timeline-line {
  display: none;
}

/* 气泡卡片 */
.timeline-card {
  flex: 1;
  margin-left: 16px;
  margin-bottom: 20px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.timeline-card.original {
  border-left: 4px solid #409eff;
}

.timeline-card.append {
  border-left: 4px solid #e6a23c;
}

.timeline-card.reply {
  border-left: 4px solid #67c23a;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.card-sender {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.card-body {
  padding: 14px;
}

.card-content {
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: #333;
}

.card-footer {
  padding: 8px 14px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.reply-target {
  font-size: 12px;
  color: #909399;
  font-style: italic;
}

@media screen and (max-width: 768px) {
  .sample-timeline-page {
    padding: 10px;
  }
  .timeline-left {
    width: 55px;
    padding-right: 8px;
  }
  .timeline-left .timeline-date {
    font-size: 11px;
  }
  .timeline-left .timeline-time {
    font-size: 10px;
  }
  .timeline-card {
    margin-left: 8px;
  }
}
</style>