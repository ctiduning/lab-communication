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
        <el-button
          v-if="isAdmin && selectedAnnouncements.length > 0"
          type="danger"
          size="small"
          @click="handleBatchDelete"
        >
          批量删除 ({{ selectedAnnouncements.length }})
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
            <el-form-item label="发送范围">
              <el-radio-group v-model="form.targetRole">
                <el-radio value="all">全部用户</el-radio>
                <el-radio value="business">仅业务端</el-radio>
                <el-radio value="lab">仅实验室端</el-radio>
                <el-radio value="qingdao_business">青岛业务</el-radio>
                <el-radio value="non_qingdao_business">非青岛业务</el-radio>
              </el-radio-group>
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

    <!-- 搜索栏 + 标签切换 -->
    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索标题或内容..."
        clearable
        class="search-input"
        :prefix-icon="Search"
      />
      <el-checkbox v-model="onlyFlagged">仅显示🚩标记</el-checkbox>
      <span class="result-count">
        共 {{ filteredAnnouncements.length }} 条
      </span>
      <el-radio-group v-if="isAdmin" v-model="announcementTab" size="small" class="tab-switch">
        <el-radio-button value="active">已发布</el-radio-button>
        <el-radio-button value="recalled">已撤回</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 表格 -->
    <el-table
      ref="annTableRef"
      :data="filteredAnnouncements"
      stripe
      style="width: 100%; font-size: 14px;"
      class="announcement-table"
      @row-click="handleClickNotice"
      :row-class-name="tableRowClassName"
      :row-style="{ minHeight: '48px' }"
      v-loading="loading"
      empty-text="暂无通知公告"
      @selection-change="handleSelectionChange"
    >
      <el-table-column v-if="isAdmin" type="selection" width="55" />
      <el-table-column type="index" label="序号" width="60" align="center" :resizable="false">
        <template #header>
          <span style="white-space: nowrap;">序号</span>
        </template>
      </el-table-column>
      <el-table-column label="标题" min-width="280" :resizable="true">
        <template #default="scope">
          <span v-if="scope.row.isFlagged" style="color:red;margin-right:4px;">🚩</span>
          <span :class="{ 'is-unread-text': !scope.row.isRead }">{{ scope.row.title }}</span>
          <span v-if="scope.row.attachments && scope.row.attachments.length > 0" class="attach-icon">📎</span>
          <el-tag v-if="scope.row.status === 'recalled'" size="small" type="warning" style="margin-left:6px;">已撤回</el-tag>
          <el-tag v-if="scope.row.republishedAt" size="small" type="success" style="margin-left:4px;">已重发</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="通知内容" min-width="400" show-overflow-tooltip>
        <template #default="scope">
          <span class="content-preview" :class="{ 'is-unread-text': !scope.row.isRead }">
            {{ truncateContent(scope.row.content, 300) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="发布人" width="140" align="center" sortable>
        <template #default="scope">
          <span>{{ scope.row.senderName }}</span>
        </template>
      </el-table-column>
      <el-table-column label="发布时间" width="190" align="center" sortable>
        <template #default="scope">
          <span>{{ formatTime(scope.row.createdAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="已读状态" width="100" align="center">
        <template #default="scope">
          <el-tag v-if="scope.row.isRead" type="info" size="small">已读</el-tag>
          <el-tag v-else type="danger" size="small" effect="dark">未读</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="300" fixed="right" align="center">
        <template #default="scope">
          <div class="action-btns">
            <el-button
              size="small"
              :type="scope.row.isFlagged ? 'warning' : 'default'"
              @click.stop="toggleFlag(scope.row)"
              class="action-btn"
            >
              {{ scope.row.isFlagged ? '🚩 已标记' : '🚩 标记' }}
            </el-button>
            <el-button
              v-if="isAdmin && scope.row.status === 'active'"
              size="small"
              type="warning"
              @click.stop="handleRecall(scope.row)"
              class="action-btn"
            >
              撤回
            </el-button>
            <el-button
              v-if="isAdmin"
              size="small"
              type="primary"
              link
              @click.stop="handleEdit(scope.row)"
              class="action-btn"
            >{{ scope.row.status === 'recalled' ? '修改重发' : '编辑' }}</el-button>
            <el-button
              v-if="isAdmin"
              size="small"
              type="danger"
              link
              @click.stop="handleDelete(scope.row)"
              class="action-btn"
            >删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 通知详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      :title="selectedAnn?.title || '通知详情'"
      width="800px"
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
    <el-dialog v-model="editVisible" title="编辑公告" width="700px" destroy-on-close>
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

    <!-- 点赞/点踩详情弹窗 -->
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
import { Search } from '@element-plus/icons-vue'
import { announcementAPI, storageAPI, reactionAPI, getRoleCategory } from '../api'
import { supabase } from '../utils/supabase'

// 当前用户信息
const currentUser = ref(null)
const isAdmin = computed(() => currentUser.value?.role === 'admin')
const currentUserRole = computed(() => {
  if (!currentUser.value) return 'all'
  return getRoleCategory(currentUser.value.role, currentUser.value.department_level1)
})

// 数据
const announcements = ref([])
const unreadCount = ref(0)
const loading = ref(false)

// 点赞/点踩数据
const reactionStats = ref({})

// 创建表单
const showCreateForm = ref(false)
const sending = ref(false)
const form = reactive({
  title: '',
  content: '',
  targetRole: 'all',
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

// 公告标签页管理（仅管理员）
const announcementTab = ref('active')

// 点赞详情弹窗
const reactionDetailVisible = ref(false)
const reactionDetailList = ref([])

// 实时订阅
let channel = null

// 批量选择
const annTableRef = ref(null)
const selectedAnnouncements = ref([])

const handleSelectionChange = (selection) => {
  selectedAnnouncements.value = selection
}

// 批量删除
const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedAnnouncements.value.length} 条公告吗？此操作不可撤销。`,
      '批量删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
    let successCount = 0
    let failCount = 0
    for (const ann of selectedAnnouncements.value) {
      try {
        await announcementAPI.delete(ann.id)
        successCount++
      } catch (e) {
        failCount++
      }
    }
    if (failCount === 0) {
      ElMessage.success(`成功删除 ${successCount} 条公告`)
    } else {
      ElMessage.warning(`${successCount} 条删除成功，${failCount} 条删除失败`)
    }
    loadAnnouncements()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('批量删除出错:', error)
    }
  }
}

// 搜索与标记
const searchKeyword = ref('')
const onlyFlagged = ref(false)

const fuzzyMatch = (text, query) => {
  if (!query) return true
  if (!text) return false
  const t = text.toLowerCase()
  const q = query.toLowerCase().replace(/\s/g, '')
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  return qi === q.length
}

// 🌟 跟接收消息一样的标记方式：直接更新 is_flagged 字段
const toggleFlag = async (ann) => {
  try {
    const newVal = !ann.isFlagged
    await announcementAPI.toggleAnnouncementFlag(ann.id, newVal)
    ann.isFlagged = newVal
    ElMessage.success(newVal ? '已标记红旗' : '已取消红旗')
  } catch (e) {
    ElMessage.error('操作失败：' + (e.message || '请检查数据库是否已添加 is_flagged 字段'))
  }
}

// 过滤后的列表
const filteredAnnouncements = computed(() => {
  let list = announcements.value.filter(a => {
    // 非管理员看不到已撤回的公告
    if (!isAdmin.value && a.status === 'recalled') return false

    // 管理员标签页过滤
    if (isAdmin.value && announcementTab.value === 'recalled') {
      return a.status === 'recalled'
    }

    // 管理员在active标签页可以看到所有公告
    if (isAdmin.value && announcementTab.value === 'active') return true

    if (a.targetRole === 'all') return true
    if (a.targetRole === currentUserRole.value) return true
    // 青岛业务
    if (a.targetRole === 'qingdao_business') {
      return currentUser.value?.department_level1 === '业务' && currentUser.value?.department_level3 === '青岛'
    }
    // 非青岛业务
    if (a.targetRole === 'non_qingdao_business') {
      return currentUser.value?.department_level1 === '业务' && currentUser.value?.department_level3 !== '青岛'
    }
    return false
  })
  if (searchKeyword.value) {
    const kw = searchKeyword.value
    list = list.filter(a => fuzzyMatch(a.title, kw) || fuzzyMatch(a.content, kw))
  }
  if (onlyFlagged.value) {
    list = list.filter(a => a.isFlagged)
  }
  return list
})

const previewImage = (url) => {
  previewImageUrl.value = url
  showImagePreview.value = true
}

const formatTime = (t) => {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}

const tableRowClassName = ({ row }) => {
  return row.isRead ? '' : 'unread-row'
}

const truncateContent = (content, maxLen) => {
  if (!content) return '-'
  if (content.length <= maxLen) return content
  return content.substring(0, maxLen) + '...'
}

// 点赞/点踩
const getLikeCount = (targetType, targetId) => {
  const key = `${targetType}-${targetId}`
  return reactionStats.value[key]?.likeCount || 0
}

const getDislikeCount = (targetType, targetId) => {
  const key = `${targetType}-${targetId}`
  return reactionStats.value[key]?.dislikeCount || 0
}

const getMyReactionType = (targetType, targetId) => {
  const key = `${targetType}-${targetId}`
  return reactionStats.value[key]?.myReaction || null
}

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

const loadAnnouncements = async () => {
  loading.value = true
  try {
    const { data } = await announcementAPI.list()
    announcements.value = data || []
    unreadCount.value = announcements.value.filter(a => !a.isRead).length
    await loadAnnouncementReactions()
  } catch (error) {
    console.error('加载公告失败:', error)
    ElMessage.error('加载公告失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

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

    reactionStats.value = { ...reactionStats.value, [key]: { ...current } }
  } catch (error) {
    ElMessage.error('操作失败：' + (error.message || '未知错误'))
  }
}

const showReactionDetail = async (targetType, targetId) => {
  try {
    const { data } = await reactionAPI.getDetail(targetType, targetId)
    reactionDetailList.value = data || []
    reactionDetailVisible.value = true
  } catch (error) {
    console.error('加载详情失败:', error)
    ElMessage.error('加载详情失败：' + (error.message || '请检查网络或联系管理员'))
  }
}

// 点击通知 → 标记已读 + 打开详情
const handleClickNotice = async (ann) => {
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
      attachments: form.attachments,
      target_role: form.targetRole
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
  form.targetRole = 'all'
  form.attachments = []
}

// 管理员编辑公告
const handleEdit = (ann) => {
  editForm.id = ann.id
  editForm.title = ann.title
  editForm.content = ann.content
  editForm.attachments = JSON.parse(JSON.stringify(ann.attachments || []))
  editForm.isRecalled = ann.status === 'recalled'
  editVisible.value = true
}

const handleUpdateAnnouncement = async () => {
  if (!editForm.title || !editForm.content) {
    ElMessage.error('请填写标题和内容')
    return
  }
  editLoading.value = true
  try {
    if (editForm.isRecalled) {
      await announcementAPI.republish(editForm.id, {
        title: editForm.title,
        content: editForm.content,
        attachments: editForm.attachments
      })
      ElMessage.success('修改并重发成功')
    } else {
      await announcementAPI.update(editForm.id, {
        title: editForm.title,
        content: editForm.content,
        attachments: editForm.attachments
      })
      ElMessage.success('修改成功')
    }
    editVisible.value = false
    loadAnnouncements()
  } catch (error) {
    ElMessage.error('操作失败：' + (error.message || '未知错误'))
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
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error('删除失败：' + (error.message || '未知错误'))
    }
  }
}

// 管理员撤回公告
const handleRecall = async (ann) => {
  try {
    await ElMessageBox.confirm(
      `确定要撤回公告「${ann.title}」吗？撤回后业务和实验室端将看不到此公告。`,
      '撤回确认',
      { confirmButtonText: '确定撤回', cancelButtonText: '取消', type: 'warning' }
    )
    await announcementAPI.recall(ann.id)
    ElMessage.success('已撤回')
    loadAnnouncements()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('撤回失败：' + (error.message || '未知错误'))
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
      () => { loadAnnouncements() }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'announcements' },
      () => { loadAnnouncements() }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'announcements' },
      () => { loadAnnouncements() }
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
.notice-board { padding: 32px 36px; max-width: 1800px; margin: 0 auto; }
.board-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.board-header h2 { margin: 0; font-size: 22px; color: #333; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.create-section { margin-bottom: 20px; }
:deep(.unread-row) { background: #fef0f0 !important; font-weight: 500; }
:deep(.unread-row td) { color: #f56c6c; }
.is-unread-text { font-weight: 700; color: #f56c6c; }
.content-preview { color: #606266; font-size: 13px; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; }
.attach-icon { margin-left: 6px; color: #409eff; }
.detail-reactions { margin-top: 16px; padding-top: 12px; border-top: 1px solid #e8e8e8; display: flex; align-items: center; gap: 8px; }
.detail-meta { display: flex; gap: 20px; color: #999; font-size: 13px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e8e8e8; }
.detail-body { font-size: 14px; color: #333; line-height: 1.8; background: #f9f9f9; padding: 16px; border-radius: 8px; }
.detail-attachments { margin-top: 16px; }
.detail-attachments h4 { margin-bottom: 10px; font-size: 14px; color: #666; }
.attachments-grid { display: flex; gap: 10px; flex-wrap: wrap; }
.attachment-item { width: 120px; height: 120px; border-radius: 8px; overflow: hidden; border: 1px solid #e8e8e8; cursor: pointer; transition: transform 0.2s; }
.attachment-item:hover { transform: scale(1.05); }
.attachment-img { width: 100%; height: 100%; object-fit: cover; }
.upload-preview { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.upload-thumb { position: relative; width: 80px; height: 80px; border-radius: 6px; overflow: hidden; border: 1px solid #e8e8e8; }
.upload-thumb img { width: 100%; height: 100%; object-fit: cover; cursor: pointer; }
.upload-thumb .el-button { position: absolute; top: 2px; right: 2px; min-width: 20px; min-height: 20px; width: 20px; height: 20px; padding: 0; font-size: 12px; }
:deep(.el-table .cell) { padding-left: 14px; padding-right: 14px; line-height: 1.6; }
:deep(.el-dialog__body) { padding: 24px 28px; }

/* 搜索栏布局 */
.search-bar { margin-bottom: 16px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.search-input { width: 400px; }
.result-count { font-size: 13px; color: #909399; white-space: nowrap; }
.tab-switch { margin-left: auto; }

/* 操作列按钮 */
.action-btns { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
.action-btns .action-btn { margin: 0; padding: 5px 10px; font-size: 12px; white-space: nowrap; }

/* 表格横向滚动 + 固定列阴影 */
:deep(.announcement-table .el-table__body-wrapper) { overflow-x: auto; }
.announcement-table { width: 100%; }
</style>
