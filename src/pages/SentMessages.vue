<template>
  <div class="sent-page">
    <div class="page-header">
      <h2>📤 已发送消息</h2>
      <p class="page-desc">查看历史上主动发出的沟通记录及回复状态</p>
    </div>

    <!-- 筛选标签 -->
    <div class="filter-bar">
      <el-radio-group v-model="activeFilter" @change="filterList">
        <el-radio-button label="all">全部 ({{ communications.length }})</el-radio-button>
        <el-radio-button label="unreplied">未回复 ({{ unrepliedCount }})</el-radio-button>
        <el-radio-button label="partial">部分回复 ({{ partialCount }})</el-radio-button>
        <el-radio-button label="replied">已回复 ({{ repliedCount }})</el-radio-button>
        <el-radio-button label="allCompleted">全部完结 ({{ allCompletedCount }})</el-radio-button>
        <el-radio-button label="completed">发起人完结 ({{ completedCount }})</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索沟通内容、客户名称、样品短号..."
        clearable
        style="width: 300px;"
        :prefix-icon="Search"
      />
    </div>

    <el-table :data="filteredCommunications" border stripe v-loading="loading" empty-text="暂无发送记录">
      <el-table-column label="状态" width="110" align="center">
        <template #default="scope">
          <el-tag v-if="scope.row.isCompleted" size="small" type="info">发起人完结</el-tag>
          <el-tag v-else-if="scope.row.replyStatus === 'allCompleted'" size="small" type="info">全部完结</el-tag>
          <el-tag v-else-if="scope.row.replyStatus === 'unreplied'" size="small" type="danger">未回复</el-tag>
          <el-tag v-else-if="scope.row.replyStatus === 'partial'" size="small" type="warning">部分回复</el-tag>
          <el-tag v-else size="small" type="success">已回复</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="沟通类型" width="110">
        <template #default="scope">
          {{ getTypeName(scope.row.type) }}
        </template>
      </el-table-column>
      <el-table-column label="客户/样品" min-width="140">
        <template #default="scope">
          <div>{{ scope.row.customerName || '-' }}</div>
          <div style="font-size:11px;color:#999;">{{ scope.row.sampleCode || scope.row.content?.substring(0, 20) || '' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="接收人" min-width="220">
        <template #default="scope">
          <div v-for="(r, idx) in (scope.row.recipientDetails || [])" :key="idx" class="recipient-row">
            <span class="recipient-name">{{ r.name || '-' }}</span>
            <el-tag v-if="r.has_replied" size="small" type="success" style="margin-left:4px;">已回复</el-tag>
            <el-tag v-else size="small" type="danger" style="margin-left:4px;">未回复</el-tag>
            <el-tag v-if="r.is_completed" size="small" type="info" style="margin-left:4px;">已完结</el-tag>
            <el-tag v-else size="small" type="warning" style="margin-left:4px;">未完结</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="发送时间" width="160">
        <template #default="scope">
          {{ formatTime(scope.row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" align="center">
        <template #default="scope">
          <el-button size="small" @click="viewDetail(scope.row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 沟通详情弹窗 -->
    <el-dialog title="沟通详情" v-model="detailVisible" width="750px" destroy-on-close>
      <div v-if="selectedComm">
        <h4>基本信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="沟通类型">{{ getTypeName(selectedComm.type) }}</el-descriptions-item>
          <el-descriptions-item label="客户名称">{{ selectedComm.customerName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="样品短号">{{ selectedComm.sampleCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="发送时间">{{ formatTime(selectedComm.createdAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="selectedComm.remark" label="备注" :span="2">{{ selectedComm.remark }}</el-descriptions-item>
          <el-descriptions-item v-if="selectedComm.content" label="内容" :span="2">{{ selectedComm.content }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-top: 20px;">接收人状态</h4>
        <el-table :data="selectedComm.recipientDetails || []" border size="small">
          <el-table-column prop="name" label="接收人" width="100"></el-table-column>
          <el-table-column prop="department" label="部门" width="120"></el-table-column>
          <el-table-column label="最新回复" min-width="200">
            <template #default="scope">
              <span v-if="getLatestReply(scope.row.recipient_id)" 
                :class="getReplyClass(getLatestReply(scope.row.recipient_id))">
                {{ getLatestReply(scope.row.recipient_id) }}
              </span>
              <span v-else style="color:#999;">-</span>
            </template>
          </el-table-column>
          <el-table-column label="回复状态" width="90" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.has_replied" size="small" type="success">已回复</el-tag>
              <el-tag v-else size="small" type="danger">未回复</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="已读" width="60" align="center">
            <template #default="scope">
              <span v-if="scope.row.is_read" style="color:#67c23a;">✓</span>
              <span v-else style="color:#f56c6c;">✗</span>
            </template>
          </el-table-column>
          <el-table-column label="个人完结" width="90" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.is_completed" size="small" type="info">已完结</el-tag>
              <el-tag v-else size="small" type="warning">未完结</el-tag>
            </template>
          </el-table-column>
        </el-table>
        
        <div style="margin-top: 12px;">
          <el-button 
            v-if="!selectedComm.isCompleted" 
            type="success" 
            size="small"
            @click="toggleGlobalCompleted(selectedComm, true)"
          >
            标记整体完结
          </el-button>
          <el-button 
            v-if="selectedComm.isCompleted" 
            type="info" 
            size="small"
            @click="toggleGlobalCompleted(selectedComm, false)"
          >
            取消整体完结
          </el-button>
        </div>

        <h4 style="margin-top: 20px;">回复记录</h4>
        <div v-if="selectedComm.replies && selectedComm.replies.length > 0">
          <div v-for="(reply, index) in selectedComm.replies" :key="index" class="reply-item">
            <p><strong>{{ reply.senderName || '未知' }}：</strong>{{ reply.content }}</p>
            <p class="reply-time">{{ formatTime(reply.createdAt) }}</p>
          </div>
        </div>
        <div v-else class="no-reply">暂无回复</div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { communicationAPI } from '../api'
import { supabase } from '../utils/supabase'

const communications = ref([])
const loading = ref(false)
const activeFilter = ref('all')
const detailVisible = ref(false)
const selectedComm = ref(null)
const searchKeyword = ref('')  // 搜索关键词

const typeMap = {
  paid_urgent: '付费加急',
  free_urgent: '免费加急',
  data_dispute: '数据质疑',
  follow_up: '跟单',
  consultation: '咨询',
  other: '其他',
  unqualified: '不合格沟通',
  data_confirm: '数据确认'
}

const getTypeName = (type) => typeMap[type] || type || '-'

const formatTime = (t) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

// 计算回复状态
const computeReplyStatus = (comm) => {
  const recipients = comm.recipientDetails || []
  const total = recipients.length
  const replied = recipients.filter(r => r.has_replied).length
  const allCompleted = recipients.every(r => r.is_completed)
  
  if (comm.isCompleted) return 'completed'
  if (allCompleted) return 'allCompleted'
  if (replied === 0) return 'unreplied'
  if (replied < total) return 'partial'
  return 'replied'
}

// 各状态计数
const unrepliedCount = computed(() => communications.value.filter(c => computeReplyStatus(c) === 'unreplied').length)
const partialCount = computed(() => communications.value.filter(c => computeReplyStatus(c) === 'partial').length)
const repliedCount = computed(() => communications.value.filter(c => computeReplyStatus(c) === 'replied').length)
const completedCount = computed(() => communications.value.filter(c => computeReplyStatus(c) === 'completed').length)
const allCompletedCount = computed(() => communications.value.filter(c => computeReplyStatus(c) === 'allCompleted').length)

// 筛选（支持模糊搜索 + 状态过滤）
const filteredCommunications = computed(() => {
  let result = communications.value

  // 状态过滤
  if (activeFilter.value !== 'all') {
    result = result.filter(c => computeReplyStatus(c) === activeFilter.value)
  }

  // 模糊搜索
  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) {
    result = result.filter(c => {
      // 搜索字段：沟通内容、客户名称、样品短号、沟通类型、回复内容
      const replyTexts = (c.replies || []).map(r => r.content || '').join(' ')
      const fields = [
        c.content || '',
        c.customerName || '',
        c.sampleCode || '',
        getTypeName(c.type),
        replyTexts
      ].map(f => f.toLowerCase())
      return fields.some(f => f.includes(kw))
    })
  }

  return result
})

const filterList = () => {
  // 筛选由 computed 自动处理
}

const viewDetail = (comm) => {
  selectedComm.value = comm
  detailVisible.value = true
}

// 发起人标记整体完结
const toggleGlobalCompleted = async (comm, isCompleted) => {
  try {
    await communicationAPI.toggleCommCompleted(comm.id, isCompleted);
    comm.isCompleted = isCompleted;
    ElMessage.success(isCompleted ? '已标记整体完结' : '已取消整体完结');
    loadCommunications(); // 刷新列表
  } catch (e) {
    ElMessage.error('操作失败');
  }
}

// 获取某个接收人的最新回复
const getLatestReply = (recipientId) => {
  if (!selectedComm.value || !selectedComm.value.replies) return null
  const recipientReplies = selectedComm.value.replies.filter(r => r.senderId === recipientId)
  if (recipientReplies.length === 0) return null
  // 按时间排序，取最新的
  const latest = recipientReplies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
  return latest.content
}

// 获取回复内容的样式类
const getReplyClass = (content) => {
  if (!content) return ''
  if (content === '同意') return 'reply-agree'
  if (content === '拒绝') return 'reply-reject'
  return 'reply-normal'
}

const loadCommunications = async () => {
  loading.value = true
  try {
    const response = await communicationAPI.getAll()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const mine = response.data.filter(c => c.senderId === authUser.id)
      communications.value = mine
    }
  } catch (error) {
    ElMessage.error('加载发送记录失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCommunications()
})
</script>

<style scoped>
.sent-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 6px 0;
  font-size: 22px;
}

.page-desc {
  color: #888;
  font-size: 14px;
  margin: 0;
}

.filter-bar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-bar {
  margin-bottom: 16px;
}

.recipient-row {
  display: flex;
  align-items: center;
  margin-bottom: 2px;
  font-size: 13px;
}

.recipient-name {
  font-weight: 500;
}

.reply-item {
  background: #f5f5f5;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 6px;
}

.reply-item p {
  margin: 0;
}

.reply-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px !important;
}

.no-reply {
  text-align: center;
  color: #999;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.reply-agree {
  color: #67c23a;
  font-weight: 600;
}

.reply-reject {
  color: #f56c6c;
  font-weight: 600;
}

.reply-normal {
  color: #606266;
}
</style>
