<template>
  <div class="history-page">
    <div class="page-header">
      <h2>历史消息</h2>
      <p class="page-desc">查看已完结或已解决的沟通记录</p>
    </div>

    <div class="filter-bar">
      <el-select v-model="filterType" placeholder="类型筛选" size="small" style="width:120px;">
        <el-option label="全部" value="all"></el-option>
        <el-option label="加急" value="urgent"></el-option>
        <el-option label="延迟沟通" value="delay"></el-option>
        <el-option label="提前出报告" value="report"></el-option>
        <el-option label="不合格确认" value="unqualified"></el-option>
        <el-option label="其他" value="other"></el-option>
      </el-select>
      <el-select v-model="filterStatus" placeholder="状态筛选" size="small" style="width:120px;margin-left:8px;">
        <el-option label="全部" value="all"></el-option>
        <el-option label="已解决" value="resolved"></el-option>
        <el-option label="已回复" value="replied"></el-option>
      </el-select>
      <el-input v-model="searchText" placeholder="搜索内容或客户..." size="small" style="width:200px;margin-left:8px;" clearable></el-input>
    </div>

    <div class="comms-grid">
      <div v-for="comm in filteredComms" :key="comm.id" class="comm-card" @click="selectComm(comm)">
        <div class="comm-header">
          <el-tag :type="getTypeTag(comm.type)" size="small">{{ getTypeName(comm.type) }}</el-tag>
          <el-tag :type="getStatusTag(comm.status)" size="small">{{ getStatusName(comm.status) }}</el-tag>
          <el-tag v-if="comm.isFlagged" type="danger" size="small" effect="dark">🚩 红旗</el-tag>
          <el-tag v-if="comm.isCompleted" type="success" size="small" effect="dark">✅ 完结</el-tag>
        </div>
        <div class="comm-content">
          <p class="content-text">{{ comm.content }}</p>
        </div>
        <div class="comm-footer">
          <span>{{ comm.createdAt }}</span>
          <span>{{ getSenderName(comm.senderId) }}</span>
        </div>
      </div>
      <div v-if="filteredComms.length === 0" class="empty-tip">暂无历史消息</div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" width="700px" destroy-on-close>
      <template #header>
        <div style="display:flex;align-items:center;gap:8px;">
          <el-tag :type="getTypeTag(selectedComm?.type)" size="small">{{ getTypeName(selectedComm?.type) }}</el-tag>
          <el-tag :type="getStatusTag(selectedComm?.status)" size="small">{{ getStatusName(selectedComm?.status) }}</el-tag>
        </div>
      </template>
      <div v-if="selectedComm">
        <div class="detail-info">
          <div class="info-row"><span class="label">发送人:</span><span>{{ getSenderName(selectedComm.senderId) }}</span></div>
          <div class="info-row"><span class="label">状态:</span><el-tag :type="getStatusTag(selectedComm.status)" size="small">{{ getStatusName(selectedComm.status) }}</el-tag></div>
          <div class="info-row"><span class="label">发送时间:</span><span>{{ selectedComm.createdAt }}</span></div>
        </div>
        <div class="detail-content">
          <h4>沟通内容</h4>
          <p>{{ selectedComm.content }}</p>
          <div v-if="selectedComm.attachments && selectedComm.attachments.length > 0" class="attachments-preview">
            <img v-for="(att, idx) in selectedComm.attachments" :key="idx" :src="att.url" class="attachment-img" @click="previewImage(att.url)" />
          </div>
        </div>
        <div class="replies-section">
          <h4>回复记录 ({{ replies.length }})</h4>
          <div v-if="replies.length === 0" class="no-replies">暂无回复</div>
          <div v-for="reply in replies" :key="reply.id" class="reply-item">
            <div class="reply-header">{{ getSenderName(reply.senderId) }} - {{ reply.createdAt }}</div>
            <div class="reply-content">{{ reply.content }}</div>
            <div v-if="reply.attachments && reply.attachments.length > 0" class="attachments-preview">
              <img v-for="(att, idx) in reply.attachments" :key="idx" :src="att.url" class="attachment-img-sm" @click="previewImage(att.url)" />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="showImagePreview" width="80%" :show-close="true" destroy-on-close>
      <img :src="previewImageUrl" style="width:100%;" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { communicationAPI, userAPI } from '../api'

const communications = ref([])
const users = ref([])
const selectedComm = ref(null)
const replies = ref([])
const detailVisible = ref(false)
const filterType = ref('all')
const filterStatus = ref('all')
const searchText = ref('')

const showImagePreview = ref(false)
const previewImageUrl = ref('')
const previewImage = (url) => {
  previewImageUrl.value = url
  showImagePreview.value = true
}

const filteredComms = computed(() => {
  let result = communications.value
  if (filterType.value !== 'all') {
    result = result.filter(c => c.type === filterType.value)
  }
  if (filterStatus.value !== 'all') {
    result = result.filter(c => c.status === filterStatus.value)
  }
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    result = result.filter(c =>
      (c.content && c.content.toLowerCase().includes(kw)) ||
      (getSenderName(c.senderId) && getSenderName(c.senderId).toLowerCase().includes(kw))
    )
  }
  return result
})

const getTypeTag = (type) => {
  const tags = { urgent: 'danger', delay: 'warning', report: 'info', unqualified: 'danger', other: 'default' }
  return tags[type] || 'default'
}
const getTypeName = (type) => {
  const names = { urgent: '加急', delay: '延迟沟通', report: '提前出报告', unqualified: '不合格确认', other: '其他' }
  return names[type] || type
}
const getStatusTag = (status) => {
  const tags = { pending: 'warning', replied: 'info', resolved: 'success' }
  return tags[status] || 'default'
}
const getStatusName = (status) => {
  const names = { pending: '待回复', replied: '已回复', resolved: '已解决' }
  return names[status] || status
}
const getSenderName = (senderId) => {
  const sender = users.value.find(u => u.id === senderId)
  return sender ? sender.name : '-'
}

const selectComm = async (comm) => {
  selectedComm.value = comm
  detailVisible.value = true
  try {
    const response = await communicationAPI.getReplies(comm.id)
    replies.value = response.data.map(r => ({
      ...r,
      createdAt: new Date(r.createdAt).toLocaleString()
    }))
  } catch (error) {
    console.error(error)
  }
}

const loadComms = async () => {
  try {
    const response = await communicationAPI.getAll()
    // 历史消息：已解决 或 已完结的
    communications.value = (response.data || [])
      .filter(c => c.status === 'resolved' || c.isCompleted)
      .map(c => ({
        ...c,
        createdAt: new Date(c.createdAt).toLocaleString()
      }))
  } catch (error) {
    console.error(error)
  }
}

const loadUsers = async () => {
  try {
    const response = await userAPI.getAll()
    users.value = response.data
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  loadComms()
  loadUsers()
})
</script>

<style scoped>
.history-page { padding: 24px; max-width: 1100px; margin: 0 auto; }
.page-header { margin-bottom: 20px; }
.page-header h2 { margin: 0 0 6px 0; font-size: 22px; }
.page-desc { color: #888; font-size: 14px; margin: 0; }
.filter-bar { display: flex; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 8px; }
.comms-grid { display: flex; flex-direction: column; gap: 12px; }
.comm-card { border: 1px solid #e8e8e8; border-radius: 8px; padding: 15px; cursor: pointer; transition: all 0.3s; }
.comm-card:hover { border-color: #667eea; box-shadow: 0 2px 8px rgba(102,126,234,0.2); }
.comm-header { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
.comm-content { font-size: 14px; color: #333; line-height: 1.5; }
.content-text { margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.comm-footer { margin-top: 8px; font-size: 12px; color: #999; display: flex; gap: 12px; }
.empty-tip { text-align: center; color: #999; padding: 40px 0; }
.detail-info { background: #f5f5f5; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
.info-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.info-row:last-child { margin-bottom: 0; }
.label { font-weight: 500; color: #666; width: 80px; }
.detail-content { margin-bottom: 20px; }
.detail-content h4 { margin-bottom: 10px; }
.detail-content p { background: #f9f9f9; padding: 15px; border-radius: 8px; line-height: 1.6; white-space: pre-wrap; }
.attachments-preview { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.attachment-img { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 1px solid #e8e8e8; }
.attachment-img-sm { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 1px solid #e8e8e8; }
.replies-section { margin-top: 20px; }
.replies-section h4 { margin-bottom: 15px; }
.no-replies { text-align: center; color: #999; padding: 30px; }
.reply-item { padding: 15px 0; border-bottom: 1px solid #e8e8e8; }
.reply-item:last-child { border-bottom: none; }
.reply-header { font-size: 12px; color: #999; margin-bottom: 8px; }
.reply-content { font-size: 14px; color: #333; background: #f9f9f9; padding: 10px; border-radius: 6px; white-space: pre-wrap; }
</style>
