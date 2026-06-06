<template>
  <div class="sent-page">
    <div class="page-header">
      <h2>📤 已发送消息</h2>
      <p class="page-desc">查看历史上主动发出的沟通记录及回复状态</p>
    </div>

    <!-- 筛选标签 + 刷新按钮 -->
    <div class="filter-bar">
      <el-radio-group v-model="activeFilter" @change="filterList">
        <el-radio-button label="all">全部 ({{ communications.length + recalledMessages.length }})</el-radio-button>
        <el-radio-button label="unreplied">未回复 ({{ unrepliedCount }})</el-radio-button>
        <el-radio-button label="partial">部分回复 ({{ partialCount }})</el-radio-button>
        <el-radio-button label="replied">全部已回复 ({{ repliedCount }})</el-radio-button>
        <el-radio-button label="partialCompleted">部分完结 ({{ partialCompletedCount }})</el-radio-button>
        <el-radio-button label="allCompleted">全部完结 ({{ allCompletedCount }})</el-radio-button>
        <el-radio-button label="recalled">已撤回 ({{ recalledCount }})</el-radio-button>
      </el-radio-group>
      <el-button 
        size="small" 
        :icon="Refresh" 
        @click="loadCommunications"
        :loading="loading"
        style="margin-left: 12px;"
      >
        刷新
      </el-button>
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

    <el-table :data="filteredCommunications" border stripe v-loading="loading" empty-text="暂无发送记录" v-if="activeFilter !== 'recalled'">
      <el-table-column label="状态" width="110" align="center">
        <template #default="scope">
          <el-tag v-if="scope.row.isRecalled" size="small" type="warning">已撤回</el-tag>
          <el-tag v-else-if="computeReplyStatus(scope.row) === 'unreplied'" size="small" type="danger">未回复</el-tag>
          <el-tag v-else-if="computeReplyStatus(scope.row) === 'partial'" size="small" type="warning">部分回复</el-tag>
          <el-tag v-else-if="computeReplyStatus(scope.row) === 'replied'" size="small" type="success">全部已回复</el-tag>
          <el-tag v-else-if="computeReplyStatus(scope.row) === 'partialCompleted'" size="small" type="info">部分完结</el-tag>
          <el-tag v-else-if="computeReplyStatus(scope.row) === 'allCompleted'" size="small" type="success">全部完结</el-tag>
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

    <!-- 已撤回消息表格 -->
    <el-table 
      v-if="activeFilter === 'recalled'" 
      :data="recalledMessages" 
      border 
      stripe 
      v-loading="recalledLoading"
      empty-text="暂无已撤回消息"
      style="margin-top: 16px;"
    >
      <el-table-column label="撤回时间" width="160">
        <template #default="scope">
          {{ formatTime(scope.row.recalled_at) }}
        </template>
      </el-table-column>
      <el-table-column label="原发送时间" width="160">
        <template #default="scope">
          {{ formatTime(scope.row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="沟通类型" width="110">
        <template #default="scope">
          {{ getTypeName(scope.row.type) }}
        </template>
      </el-table-column>
      <el-table-column label="内容预览" min-width="200" show-overflow-tooltip>
        <template #default="scope">
          {{ scope.row.content || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="撤回原因" min-width="150" show-overflow-tooltip>
        <template #default="scope">
          {{ scope.row.recall_reason || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="接收人" min-width="150">
        <template #default="scope">
          {{ (scope.row.recipientDetails || []).map(r => r.name || '').join('、') || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="scope">
          <el-button size="small" type="primary" @click="editAndResend(scope.row)">编辑重发</el-button>
          <el-button size="small" type="danger" @click="deleteRecalled(scope.row)">删除</el-button>
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
          <el-table-column label="回复记录" min-width="280">
            <template #default="scope">
              <div v-if="getRecipientReplies(scope.row.recipient_id).length > 0">
                <div v-for="(reply, idx) in getRecipientReplies(scope.row.recipient_id)" :key="idx" class="recipient-reply-line">
                  <span :class="getReplyClass(reply.content)">{{ reply.content }}</span>
                  <span class="reply-time-mini">{{ formatTime(reply.createdAt) }}</span>
                </div>
              </div>
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
          
          <!-- 撤回按钮：仅发送人可见，且5分钟内可撤回 -->
          <el-button
            v-if="canRecall(selectedComm)"
            type="warning"
            size="small"
            @click="showRecallDialog(selectedComm)"
            style="margin-left: 8px;"
          >
            撤回消息
          </el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 撤回原因弹窗 -->
    <el-dialog title="撤回消息" v-model="recallDialogVisible" width="500px" :close-on-click-modal="false">
      <div>
        <p>请输入撤回原因（可选）：</p>
        <el-input
          v-model="recallReason"
          type="textarea"
          :rows="3"
          placeholder="例如：发错人了、内容有误、需要补充信息等"
          maxlength="200"
          show-word-limit
        />
        <p style="font-size: 12px; color: #999; margin-top: 8px;">
          注意：撤回后，发件人和所有收件人将收到系统通知。
        </p>
      </div>
      <template #footer>
        <el-button @click="recallDialogVisible = false">取消</el-button>
        <el-button type="warning" @click="confirmRecall()" :loading="recallLoading">确认撤回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { communicationAPI } from '../api'
import { supabase } from '../utils/supabase'

const communications = ref([])
const recalledMessages = ref([])
const recalledLoading = ref(false)
const loading = ref(false)
const activeFilter = ref('all')
const detailVisible = ref(false)
const selectedComm = ref(null)
const searchKeyword = ref('')  // 搜索关键词
const refreshTimer = ref(null)  // 自动刷新定时器

// 撤回相关
const recallDialogVisible = ref(false)
const recallReason = ref('')
const recallLoading = ref(false)
const currentRecallingMsg = ref(null)

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

// 计算回复状态（发件人视角，考虑多个收件人）
// 状态定义：
//   - recalled: 已撤回
//   - unreplied: 未回复（所有收件人都未回复）
//   - partial: 部分回复（部分收件人已回复，部分未回复）
//   - replied: 全部已回复（所有收件人都已回复，但都未完结）
//   - partialCompleted: 部分完结（所有收件人都已回复，部分已完结，部分未完结）
//   - allCompleted: 全部完结（所有收件人都已回复且都已完结）
const computeReplyStatus = (comm) => {
  // 优先检查是否已撤回
  if (comm.isRecalled) return 'recalled'
  
  const recipients = comm.recipientDetails || []
  const total = recipients.length
  if (total === 0) return 'replied' // 没有收件人，视为已回复
  
  const repliedCount = recipients.filter(r => r.has_replied).length
  const completedCount = recipients.filter(r => r.is_completed).length
  
  // 未回复：所有收件人都未回复
  if (repliedCount === 0) return 'unreplied'
  
  // 部分回复：部分收件人已回复，部分未回复
  if (repliedCount < total) return 'partial'
  
  // 到此，所有收件人都已回复（repliedCount === total）
  // 全部完结：所有收件人都已完结
  if (completedCount === total) return 'allCompleted'
  
  // 部分完结：所有收件人都已回复，部分已完结，部分未完结
  if (completedCount > 0) return 'partialCompleted'
  
  // 全部已回复：所有收件人都已回复，但都未完结
  return 'replied'
}

// 各状态计数
const unrepliedCount = computed(() => communications.value.filter(c => computeReplyStatus(c) === 'unreplied').length)
const partialCount = computed(() => communications.value.filter(c => computeReplyStatus(c) === 'partial').length)
const repliedCount = computed(() => communications.value.filter(c => computeReplyStatus(c) === 'replied').length)
const partialCompletedCount = computed(() => communications.value.filter(c => computeReplyStatus(c) === 'partialCompleted').length)
const allCompletedCount = computed(() => communications.value.filter(c => computeReplyStatus(c) === 'allCompleted').length)
const recalledCount = computed(() => recalledMessages.value.length)

// 判断消息是否在5分钟撤回窗口内
const canRecall = (comm) => {
  if (!comm || !comm.createdAt) return false
  const now = new Date()
  const createdAt = new Date(comm.createdAt)
  const diffMinutes = (now - createdAt) / (1000 * 60)
  return diffMinutes <= 5 && !comm.isRecalled
}

// 筛选（支持模糊搜索 + 状态过滤）
const filteredCommunications = computed(() => {
  // 如果当前在"已撤回"标签，直接返回已撤回消息
  if (activeFilter.value === 'recalled') {
    return recalledMessages.value
  }
  
  // 过滤掉已撤回的消息（它们应该在"已撤回"标签页中）
  let result = communications.value.filter(c => !c.isRecalled)
  
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
// 获取某个接收人的所有回复（按时间倒序）
const getRecipientReplies = (recipientId) => {
  if (!selectedComm.value || !selectedComm.value.replies) return []
  const recipientReplies = selectedComm.value.replies.filter(r => r.senderId === recipientId)
  return recipientReplies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

const getLatestReply = (recipientId) => {
  const replies = getRecipientReplies(recipientId)
  return replies.length > 0 ? replies[0].content : null
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
  
  // 设置自动刷新（每30秒）
  refreshTimer.value = setInterval(() => {
    loadCommunications()
  }, 30000)
})

onUnmounted(() => {
  // 清理定时器
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }
})

// 加载已撤回的消息
const loadRecalledMessages = async () => {
  recalledLoading.value = true
  try {
    const { data } = await communicationAPI.getRecalledMessages()
    recalledMessages.value = data || []
  } catch (error) {
    console.error('加载已撤回消息失败:', error)
    recalledMessages.value = []
    ElMessage.error('加载已撤回消息失败')
  } finally {
    recalledLoading.value = false
  }
}

// 显示撤回原因弹窗
const showRecallDialog = (msg) => {
  currentRecallingMsg.value = msg
  recallReason.value = ''
  recallDialogVisible.value = true
}

// 确认撤回
const confirmRecall = async () => {
  if (!currentRecallingMsg.value) return
  
  recallLoading.value = true
  try {
    await communicationAPI.recallMessage(currentRecallingMsg.value.id, recallReason.value)
    ElMessage.success('消息已撤回')
    recallDialogVisible.value = false
    detailVisible.value = false
    // 刷新两个列表
    await Promise.all([
      loadCommunications(),
      loadRecalledMessages()
    ])
  } catch (error) {
    ElMessage.error('撤回失败：' + (error.message || '未知错误'))
  } finally {
    recallLoading.value = false
  }
}

// 编辑并重发已撤回的消息
const editAndResend = (msg) => {
  // 将消息数据存储到 localStorage，然后跳转到发起沟通页面
  const editData = {
    type: msg.type,
    customerName: msg.customerName || '',
    sampleCode: msg.sampleCode || '',
    content: msg.content || '',
    recipientIds: (msg.recipientDetails || []).map(r => r.recipient_id || r.id),
    isRecalledEdit: true,
    recalledId: msg.id
  }
  
  localStorage.setItem('recalledMessageEdit', JSON.stringify(editData))
  // 跳转到发起沟通页面（根据当前路由判断是商务还是实验室）
  const currentPath = window.location.hash
  if (currentPath.includes('lab')) {
    window.location.href = '#/lab-communicate'
  } else {
    window.location.href = '#/business-communicate'
  }
}

// 删除已撤回的消息
const deleteRecalled = async (msg) => {
  try {
    await ElMessageBox.confirm('确定要删除这条已撤回的消息吗？删除后无法恢复。', '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const { error } = await supabase
      .from('communications')
      .delete()
      .eq('id', msg.id)
    
    if (error) throw error
    
    ElMessage.success('已删除')
    await loadRecalledMessages()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + (error.message || '未知错误'))
    }
  }
}

// 监听标签页切换，加载已撤回消息
const filterList = () => {
  if (activeFilter.value === 'recalled') {
    loadRecalledMessages()
  }
}
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

.recipient-reply-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
  border-bottom: 1px dashed #eee;
}

.recipient-reply-line:last-child {
  border-bottom: none;
}

.reply-time-mini {
  color: #999;
  font-size: 11px;
  white-space: nowrap;
}
</style>
