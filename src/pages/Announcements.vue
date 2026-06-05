<template>
  <div class="notice-board">
    <div class="board-header">
      <h2>📢 通知公告</h2>
      <div class="header-actions">
        <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
          <el-button @click="markAllRead" :disabled="unreadCount === 0" size="small">
            全部已读
          </el-button>
        </el-badge>
        <el-button
          v-if="isAdmin"
          type="primary"
          size="small"
          @click="showCreateForm = !showCreateForm"
        >
          {{ showCreateForm ? '收起发布' : '+ 发布通知' }}
        </el-button>
      </div>
    </div>

    <!-- 管理员发布区域 -->
    <el-collapse-transition>
      <div v-if="showCreateForm && isAdmin" class="create-section">
        <el-card shadow="never">
          <el-form :model="form" label-width="80px" size="default">
            <el-form-item label="标题" required>
              <el-input v-model="form.title" placeholder="通知标题" maxlength="100" show-word-limit></el-input>
            </el-form-item>
            <el-form-item label="内容" required>
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="4"
                placeholder="通知内容"
                maxlength="2000"
                show-word-limit
              ></el-input>
            </el-form-item>
            <el-form-item label="附件图片">
              <el-upload
                :auto-upload="false"
                :show-file-list="false"
                accept="image/*"
                :on-change="handleUploadImage"
                multiple
              >
                <el-button type="default" size="small">📎 上传图片</el-button>
              </el-upload>
              <div v-if="form.attachments.length > 0" class="upload-preview">
                <div v-for="(att, idx) in form.attachments" :key="idx" class="upload-thumb">
                  <img :src="att.url" @click="previewImage(att.url)" />
                  <el-button type="danger" size="small" circle @click="form.attachments.splice(idx, 1)">&times;</el-button>
                </div>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSend" :loading="sending">发布通知</el-button>
              <el-button @click="resetForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>
    </el-collapse-transition>

    <!-- 收件箱表格 -->
    <el-table
      :data="filteredAnnouncements"
      stripe
      style="width: 100%"
      @row-click="handleClickNotice"
      :row-class-name="tableRowClassName"
      v-loading="loading"
      empty-text="暂无通知公告"
    >
      <el-table-column width="50" align="center">
        <template #default="scope">
          <div class="unread-dot" v-if="!scope.row.isRead"></div>
        </template>
      </el-table-column>
      <el-table-column label="标题" min-width="300">
        <template #default="scope">
          <span :class="{ 'is-unread-text': !scope.row.isRead }">{{ scope.row.title }}</span>
          <span v-if="scope.row.attachments && scope.row.attachments.length > 0" class="attach-icon">📎</span>
        </template>
      </el-table-column>
      <el-table-column label="发布人" width="120" align="center">
        <template #default="scope">
          <span>{{ scope.row.senderName }}</span>
        </template>
      </el-table-column>
      <el-table-column label="发布时间" width="170" align="center">
        <template #default="scope">
          <span>{{ formatTime(scope.row.createdAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="👍" width="70" align="center">
        <template #default="scope">
          <span class="reaction-num" @click.stop="handleReaction('announcement', scope.row.id, 'like')">
            {{ getLikeCount('announcement', scope.row.id) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="👎" width="70" align="center">
        <template #default="scope">
          <span class="reaction-num" @click.stop="handleReaction('announcement', scope.row.id, 'dislike')">
            {{ getDislikeCount('announcement', scope.row.id) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="scope">
          <el-tag v-if="scope.row.isRead" type="info" size="small">已读</el-tag>
          <el-tag v-else type="danger" size="small" effect="dark">未读</el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="isAdmin" label="操作" width="140" align="center">
        <template #default="scope">
          <el-button size="small" type="primary" link @click.stop="handleEdit(scope.row)">编辑</el-button>
          <el-button size="small" type="danger" link @click.stop="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 通知详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      :title="selectedAnn?.title || '通知详情'"
      width="700px"
      destroy-on-close
    >
      <div v-if="selectedAnn" class="detail-content">
        <div class="detail-meta">
          <span>发布人：{{ selectedAnn.senderName }}</span>
          <span>发布时间：{{ formatTime(selectedAnn.createdAt) }}</span>
        </div>
        <div class="detail-body" style="white-space: pre-wrap;">{{ selectedAnn.content }}</div>
        <div v-if="selectedAnn.attachments && selectedAnn.attachments.length > 0" class="detail-attachments">
          <h4>附件</h4>
          <div class="attachments-grid">
            <div v-for="(att, idx) in selectedAnn.attachments" :key="idx" class="attachment-item">
              <img :src="att.url" @click="previewImage(att.url)" class="attachment-img" />
            </div>
          </div>
        </div>
        <!-- 详情中的点赞/点踩 -->
        <div class="detail-reactions">
          <el-button
            :type="getMyReactionType('announcement', selectedAnn.id) === 'like' ? 'primary' : 'default'"
            size="small"
            @click="handleReaction('announcement', selectedAnn.id, 'like')"
          >
            👍 赞 {{ getLikeCount('announcement', selectedAnn.id) }}
          </el-button>
          <el-button
            :type="getMyReactionType('announcement', selectedAnn.id) === 'dislike' ? 'danger' : 'default'"
            size="small"
            @click="handleReaction('announcement', selectedAnn.id, 'dislike')"
          >
            👎 踩 {{ getDislikeCount('announcement', selectedAnn.id) }}
          </el-button>
          <!-- 管理员查看点赞详情 -->
          <el-button
            v-if="isAdmin"
            size="small"
            type="info"
            @click="showReactionDetail('announcement', selectedAnn.id)"
          >
            查看详情
          </el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 编辑公告弹窗 -->
    <el-dialog v-model="editVisible" title="编辑公告" width="600px" destroy-on-close>
      <el-form :model="editForm" label-width="80px" size="default">
        <el-form-item label="标题" required>
          <el-input v-model="editForm.title" placeholder="通知标题" maxlength="100" show-word-limit></el-input>
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input
            v-model="editForm.content"
            type="textarea"
            :rows="4"
            placeholder="通知内容"
            maxlength="2000"
            show-word-limit
          ></el-input>
        </el-form-item>
        <el-form-item label="附件图片">
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            :on-change="handleEditUploadImage"
            multiple
          >
            <el-button type="default" size="small">📎 上传图片</el-button>
          </el-upload>
          <div v-if="editForm.attachments.length > 0" class="upload-preview">
            <div v-for="(att, idx) in editForm.attachments" :key="idx" class="upload-thumb">
              <img :src="att.url" @click="previewImage(att.url)" />
              <el-button type="danger" size="small" circle @click="editForm.attachments.splice(idx, 1)">&times;</el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateAnnouncement" :loading="editLoading">保存</el-button>
      </template>
    </el-dialog>

    <!-- 点赞详情弹窗（管理员） -->
    <el-dialog v-model="reactionDetailVisible" title="点赞/点踩详情" width="600px" destroy-on-close>
      <el-table :data="reactionDetailList" border stripe size="small">
        <el-table-column label="用户" width="120">
          <template #default="scope">
            {{ scope.row.user?.name || '未知' }}
          </template>
        </el-table-column>
        <el-table-column label="工号" width="100">
          <template #default="scope">
            {{ scope.row.user?.employee_id || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="角色" width="100">
          <template #default="scope">
            {{ scope.row.user?.role || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="80" align="center">
          <template #default="scope">
            <span v-if="scope.row.reaction_type === 'like'">👍 赞</span>
            <span v-else>👎 踩</span>
          </template>
        </el-table-column>
        <el-table-column label="时间">
          <template #default="scope">
            {{ formatTime(scope.row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
      <div v-if="reactionDetailList.length === 0" style="text-align:center;color:#999;padding:20px;">
        暂无点赞/点踩记录
      </div>
    </el-dialog>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="showImagePreview" width="80%" :show-close="true" destroy-on-close>
      <img :src="previewImageUrl" style="width: 100%;" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell } from '@element-plus/icons-vue'
import { announcementAPI, storageAPI, reactionAPI } from '../api'
import { supabase } from '../utils/supabase'

// 当前用户信息
const currentUser = ref(null)
const isAdmin = computed(() => currentUser.value?.role === 'admin')

// 数据
const announcements = ref([])
const unreadCount = ref(0)
const loading = ref(false)

// 点赞/点踩数据 { 'announcement-uuid': { likeCount, dislikeCount, myReaction, reactions } }
const reactionStats = ref({})

// 创建表单
const showCreateForm = ref(false)
const sending = ref(false)
const form = reactive({
  title: '',
  content: '',
  attachments: []
})

// 编辑表单
const editVisible = ref(false)
const editLoading = ref(false)
const editForm = reactive({
  id: '',
  title: '',
  content: '',
  attachments: []
})

// 详情
const detailVisible = ref(false)
const selectedAnn = ref(null)

// 图片预览
const showImagePreview = ref(false)
const previewImageUrl = ref('')

// 点赞详情弹窗（管理员）
const reactionDetailVisible = ref(false)
const reactionDetailList = ref([])

// 实时订阅
let channel = null

// 过滤后的列表
const filteredAnnouncements = computed(() => announcements.value)

const previewImage = (url) => {
  previewImageUrl.value = url
  showImagePreview.value = true
}

const formatTime = (t) => {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}

// 表格行样式
const tableRowClassName = ({ row }) => {
  return row.isRead ? '' : 'unread-row'
}

// 获取点赞数
const getLikeCount = (targetType, targetId) => {
  const key = `${targetType}-${targetId}`
  return reactionStats.value[key]?.likeCount || 0
}

// 获取点踩数
const getDislikeCount = (targetType, targetId) => {
  const key = `${targetType}-${targetId}`
  return reactionStats.value[key]?.dislikeCount || 0
}

// 获取当前用户的反应类型
const getMyReactionType = (targetType, targetId) => {
  const key = `${targetType}-${targetId}`
  return reactionStats.value[key]?.myReaction || null
}

// 加载当前用户
const loadUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (profile) {
    currentUser.value = profile
  }
}

// 加载公告列表
const loadAnnouncements = async () => {
  loading.value = true
  try {
    const { data } = await announcementAPI.list()
    announcements.value = data || []
    // 计算未读数
    unreadCount.value = announcements.value.filter(a => !a.isRead).length
    // 加载所有公告的点赞统计
    await loadAnnouncementReactions()
  } catch (error) {
    console.error('加载公告失败:', error)
    ElMessage.error('加载公告失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

// 批量加载公告的点赞统计
const loadAnnouncementReactions = async () => {
  try {
    const annIds = announcements.value.map(a => a.id)
    if (annIds.length === 0) return
    const { data } = await reactionAPI.getStatsBatch('announcement', annIds)
    const userId = currentUser.value?.id
    const newStats = {}
    for (const [tid, stats] of Object.entries(data || {})) {
      const myReaction = stats.reactions?.find(r => r.user_id === userId)?.reaction_type || null
      newStats[`announcement-${tid}`] = {
        likeCount: stats.likeCount,
        dislikeCount: stats.dislikeCount,
        myReaction,
        reactions: stats.reactions
      }
    }
    reactionStats.value = { ...reactionStats.value, ...newStats }
  } catch (error) {
    console.error('加载点赞统计失败:', error)
  }
}

// 点赞/点踩操作
const handleReaction = async (targetType, targetId, reactionType) => {
  try {
    const result = await reactionAPI.toggle(targetType, targetId, reactionType)
    const key = `${targetType}-${targetId}`
    const current = reactionStats.value[key] || { likeCount: 0, dislikeCount: 0, myReaction: null }

    if (result.data.action === 'added') {
      if (reactionType === 'like') current.likeCount++
      else current.dislikeCount++
      current.myReaction = reactionType
    } else if (result.data.action === 'removed') {
      if (reactionType === 'like') current.likeCount = Math.max(0, current.likeCount - 1)
      else current.dislikeCount = Math.max(0, current.dislikeCount - 1)
      current.myReaction = null
    } else if (result.data.action === 'updated') {
      if (result.data.reaction_type === 'like') {
        current.likeCount++
        current.dislikeCount = Math.max(0, current.dislikeCount - 1)
      } else {
        current.dislikeCount++
        current.likeCount = Math.max(0, current.likeCount - 1)
      }
      current.myReaction = result.data.reaction_type
    }

    // 强制触发 Vue 响应式更新
    reactionStats.value = { ...reactionStats.value, [key]: { ...current } }
  } catch (error) {
    ElMessage.error('操作失败：' + (error.message || '未知错误'))
  }
}

// 管理员查看点赞详情
const showReactionDetail = async (targetType, targetId) => {
  try {
    const { data } = await reactionAPI.getDetail(targetType, targetId)
    reactionDetailList.value = data || []
    reactionDetailVisible.value = true
  } catch (error) {
    ElMessage.error('加载详情失败')
  }
}

// 点击通知 → 标记已读 + 打开详情
const handleClickNotice = async (ann) => {
  // 如果未读，先标记已读
  if (!ann.isRead) {
    try {
      await announcementAPI.markAsRead(ann.id)
      ann.isRead = true
      ann.readAt = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch (e) {
      console.error('标记已读失败:', e)
    }
  }
  // 打开详情
  selectedAnn.value = ann
  detailVisible.value = true
}

// 全部标记已读
const markAllRead = async () => {
  try {
    await announcementAPI.markAllAsRead()
    announcements.value.forEach(a => {
      if (!a.isRead) {
        a.isRead = true
        a.readAt = new Date().toISOString()
      }
    })
    unreadCount.value = 0
    ElMessage.success('已全部标为已读')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

// 上传图片
const handleUploadImage = async (file) => {
  try {
    const result = await storageAPI.upload(file.raw || file, 'announcements')
    form.attachments.push(result)
    ElMessage.success('图片上传成功')
  } catch (error) {
    ElMessage.error('上传失败: ' + error.message)
  }
  return false
}

// 编辑时上传图片
const handleEditUploadImage = async (file) => {
  try {
    const result = await storageAPI.upload(file.raw || file, 'announcements')
    editForm.attachments.push(result)
    ElMessage.success('图片上传成功')
  } catch (error) {
    ElMessage.error('上传失败: ' + error.message)
  }
  return false
}

// 发布通知
const handleSend = async () => {
  if (!form.title || !form.content) {
    ElMessage.error('请填写标题和内容')
    return
  }
  sending.value = true
  try {
    await announcementAPI.create({
      title: form.title,
      content: form.content,
      attachments: form.attachments
    })
    ElMessage.success('发布成功')
    resetForm()
    showCreateForm.value = false
    loadAnnouncements()
  } catch (error) {
    ElMessage.error('发布失败：' + (error.message || '未知错误'))
  } finally {
    sending.value = false
  }
}

const resetForm = () => {
  form.title = ''
  form.content = ''
  form.attachments = []
}

// 管理员编辑公告
const handleEdit = (ann) => {
  editForm.id = ann.id
  editForm.title = ann.title
  editForm.content = ann.content
  editForm.attachments = JSON.parse(JSON.stringify(ann.attachments || []))
  editVisible.value = true
}

const handleUpdateAnnouncement = async () => {
  if (!editForm.title || !editForm.content) {
    ElMessage.error('请填写标题和内容')
    return
  }
  editLoading.value = true
  try {
    await announcementAPI.update(editForm.id, {
      title: editForm.title,
      content: editForm.content,
      attachments: editForm.attachments
    })
    ElMessage.success('修改成功')
    editVisible.value = false
    loadAnnouncements()
  } catch (error) {
    ElMessage.error('修改失败：' + (error.message || '未知错误'))
  } finally {
    editLoading.value = false
  }
}

// 管理员删除公告
const handleDelete = async (ann) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除公告「${ann.title}」吗？此操作不可撤销。`,
      '确认删除',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
    await announcementAPI.delete(ann.id)
    ElMessage.success('删除成功')
    loadAnnouncements()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + (error.message || '未知错误'))
    }
  }
}

// 实时订阅新公告
const subscribeAnnouncements = () => {
  channel = supabase
    .channel('announcements-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'announcements' },
      () => {
        loadAnnouncements()
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'announcements' },
      () => {
        loadAnnouncements()
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'announcements' },
      () => {
        loadAnnouncements()
      }
    )
    .subscribe()
}

onMounted(async () => {
  await loadUser()
  loadAnnouncements()
  subscribeAnnouncements()
})

onUnmounted(() => {
  if (channel) {
    supabase.removeChannel(channel)
  }
})
</script>

<style scoped>
.notice-board {
  padding: 20px;
  max-width: 1100px;
  margin: 0 auto;
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.board-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.create-section {
  margin-bottom: 20px;
}

/* 未读红点 */
.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f56c6c;
  margin: 0 auto;
}

/* 未读行高亮 */
:deep(.unread-row) {
  background: #fffcf5 !important;
  font-weight: 500;
}

.is-unread-text {
  font-weight: 700;
  color: #f56c6c;
}

.attach-icon {
  margin-left: 6px;
  color: #409eff;
}

/* 点赞数字可点击 */
.reaction-num {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 0.2s;
  user-select: none;
}

.reaction-num:hover {
  background: #f0f0f0;
}

/* 详情中的点赞区 */
.detail-reactions {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 详情弹窗 */
.detail-meta {
  display: flex;
  gap: 20px;
  color: #999;
  font-size: 13px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
}

.detail-body {
  font-size: 14px;
  color: #333;
  line-height: 1.8;
  background: #f9f9f9;
  padding: 16px;
  border-radius: 8px;
}

.detail-attachments {
  margin-top: 16px;
}

.detail-attachments h4 {
  margin-bottom: 10px;
  font-size: 14px;
  color: #666;
}

.attachments-grid {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.attachment-item {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  cursor: pointer;
  transition: transform 0.2s;
}

.attachment-item:hover {
  transform: scale(1.05);
}

.attachment-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 上传预览 */
.upload-preview {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.upload-thumb {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.upload-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.upload-thumb .el-button {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 20px;
  min-height: 20px;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 12px;
}
</style>
