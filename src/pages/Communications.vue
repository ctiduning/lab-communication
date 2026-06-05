<template>
  <div class="communications-container">
    <header class="header">
      <div class="header-left">
        <h1>沟通中心</h1>
      </div>
    </header>
    
    <aside class="sidebar">
      <el-menu :default-active="'communications'" class="sidebar-menu">
        <el-menu-item index="home" @click="goToHome">
          <template #icon><el-icon><House /></el-icon></template>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="orders" @click="goToOrders">
          <template #icon><el-icon><Document /></el-icon></template>
          <span>订单管理</span>
        </el-menu-item>
        <el-menu-item index="communications" @click="goToCommunications">
          <template #icon><el-icon><ChatDotRound /></el-icon></template>
          <span>沟通中心</span>
        </el-menu-item>
        <el-menu-item index="notifications" @click="goToNotifications">
          <template #icon><el-icon><Bell /></el-icon></template>
          <span>通知消息</span>
        </el-menu-item>
        <el-menu-item v-if="user.role === 'admin'" index="admin" @click="goToAdmin">
          <template #icon><el-icon><Setting /></el-icon></template>
          <span>系统管理</span>
        </el-menu-item>
      </el-menu>
    </aside>
    
    <main class="main-content">
      <div class="comms-list">
        <div class="comms-header">
          <el-select v-model="filterType" placeholder="类型筛选" size="small">
            <el-option label="全部" value="all"></el-option>
            <el-option label="加急" value="urgent"></el-option>
            <el-option label="延迟沟通" value="delay"></el-option>
            <el-option label="提前出报告" value="report"></el-option>
            <el-option label="不合格确认" value="unqualified"></el-option>
            <el-option label="其他" value="other"></el-option>
          </el-select>
          <el-select v-model="filterStatus" placeholder="状态筛选" size="small">
            <el-option label="全部" value="all"></el-option>
            <el-option label="待回复" value="pending"></el-option>
            <el-option label="已回复" value="replied"></el-option>
            <el-option label="已解决" value="resolved"></el-option>
          </el-select>
          <el-select v-model="filterFlagged" placeholder="红旗筛选" size="small" style="margin-left:8px">
            <el-option label="全部" value="all"></el-option>
            <el-option label="🚩 红旗" value="flagged"></el-option>
            <el-option label="未红旗" value="unflagged"></el-option>
          </el-select>
          <el-select v-model="filterCompleted" placeholder="完结筛选" size="small" style="margin-left:8px">
            <el-option label="全部" value="all"></el-option>
            <el-option label="✅ 完结" value="completed"></el-option>
            <el-option label="未完结" value="uncompleted"></el-option>
          </el-select>
        </div>
        
        <div class="comms-grid">
          <div v-for="comm in filteredComms" :key="comm.id" class="comm-card" @click="selectComm(comm)">
            <div class="comm-header">
              <el-tag :type="getTypeTag(comm.type)" size="small">{{ getTypeName(comm.type) }}</el-tag>
              <el-tag :type="getStatusTag(comm.status)" size="small">{{ getStatusName(comm.status) }}</el-tag>
              <el-tag v-if="comm.attachments && comm.attachments.length > 0" type="info" size="small">📎 {{ comm.attachments.length }}</el-tag>
              <el-tag v-if="comm.isFlagged" type="danger" size="small" effect="dark">🚩 红旗</el-tag>
              <el-tag v-if="comm.isCompleted" type="success" size="small" effect="dark">✅ 完结</el-tag>
            </div>
            <div class="comm-content">
              <p class="order-no">订单号: {{ getOrderNo(comm.order_id) }}</p>
              <p class="content-text">{{ comm.content }}</p>
            </div>
            <div class="comm-footer">
              <span>{{ comm.createdAt }}</span>
              <div class="comm-actions" @click.stop>
                <el-button
                  :type="comm.isFlagged ? 'danger' : 'default'"
                  size="small"
                  @click="toggleFlag(comm)"
                >{{ comm.isFlagged ? '🚩 取消红旗' : '🚩 红旗' }}</el-button>
                <el-button
                  :type="comm.isCompleted ? 'success' : 'default'"
                  size="small"
                  @click="toggleComplete(comm)"
                >{{ comm.isCompleted ? '✅ 取消完结' : '✅ 完结' }}</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="comms-detail" v-if="selectedComm">
        <div class="detail-header">
          <h3>沟通详情</h3>
          <el-button @click="selectedComm = null" icon="close" circle></el-button>
        </div>
        
        <div class="detail-info">
          <div class="info-row">
            <span class="label">订单号:</span>
            <span>{{ getOrderNo(selectedComm.order_id) }}</span>
          </div>
          <div class="info-row">
            <span class="label">类型:</span>
            <el-tag :type="getTypeTag(selectedComm.type)" size="small">{{ getTypeName(selectedComm.type) }}</el-tag>
          </div>
          <div class="info-row">
            <span class="label">状态:</span>
            <el-tag :type="getStatusTag(selectedComm.status)" size="small">{{ getStatusName(selectedComm.status) }}</el-tag>
          </div>
          <div class="info-row">
            <span class="label">发送时间:</span>
            <span>{{ selectedComm.createdAt }}</span>
          </div>
        </div>
        
        <div class="detail-content">
          <h4>沟通内容</h4>
          <p>{{ selectedComm.content }}</p>
          <!-- 显示附件图片 -->
          <div v-if="selectedComm.attachments && selectedComm.attachments.length > 0" class="attachments-preview">
            <div v-for="(att, idx) in selectedComm.attachments" :key="idx" class="attachment-item">
              <img :src="att.url" @click="previewImage(att.url)" class="attachment-img" />
            </div>
          </div>
        </div>
        
        <div class="replies-section">
          <h4>回复记录</h4>
          <div v-if="replies.length === 0" class="no-replies">暂无回复</div>
          <div v-else class="replies-list">
            <div v-for="reply in replies" :key="reply.id" class="reply-item">
              <div class="reply-header">{{ getSenderName(reply.senderId) }} - {{ reply.createdAt }}</div>
              <div class="reply-content">{{ reply.content }}</div>
              <!-- 回复附件 -->
              <div v-if="reply.attachments && reply.attachments.length > 0" class="attachments-preview">
                <div v-for="(att, idx) in reply.attachments" :key="idx" class="attachment-item">
                  <img :src="att.url" @click="previewImage(att.url)" class="attachment-img" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="reply-input">
          <el-input type="textarea" v-model="replyContent" placeholder="请输入回复内容" :rows="3"></el-input>
          <!-- 回复图片上传 -->
          <div class="reply-upload-row">
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept="image/*"
              :on-change="handleUploadReply"
            >
              <el-button type="default" size="small">📎 上传图片</el-button>
            </el-upload>
            <div v-if="replyAttachments.length > 0" class="upload-preview-inline">
              <div v-for="(att, idx) in replyAttachments" :key="idx" class="upload-thumb">
                <img :src="att.url" @click="previewImage(att.url)" />
                <el-button type="danger" size="small" circle @click="replyAttachments.splice(idx, 1)">×</el-button>
              </div>
            </div>
          </div>
          <el-button type="primary" @click="handleReply" style="margin-top: 8px;">发送回复</el-button>
        </div>
      </div>
    </main>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="showImagePreview" width="80%" :show-close="true" destroy-on-close>
      <img :src="previewImageUrl" style="width: 100%;" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { House, Document, ChatDotRound, Bell, Setting, Flag, CircleCheck } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { communicationAPI, userAPI, storageAPI } from '../api';
import { supabase } from '../utils/supabase';

const router = useRouter();
const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
const communications = ref([]);
const users = ref([]);
const selectedComm = ref(null);
const replies = ref([]);
const replyContent = ref('');
const replyAttachments = ref([]);
const filterType = ref('all');
const filterStatus = ref('all');
const filterFlagged = ref('all');
const filterCompleted = ref('all');

// 图片预览
const showImagePreview = ref(false);
const previewImageUrl = ref('');
const previewImage = (url) => {
  previewImageUrl.value = url;
  showImagePreview.value = true;
};

const filteredComms = computed(() => {
  let result = communications.value;
  if (filterType.value !== 'all') {
    result = result.filter(c => c.type === filterType.value);
  }
  if (filterStatus.value !== 'all') {
    result = result.filter(c => c.status === filterStatus.value);
  }
  if (filterFlagged.value !== 'all') {
    result = result.filter(c => filterFlagged.value === 'flagged' ? c.isFlagged : !c.isFlagged);
  }
  if (filterCompleted.value !== 'all') {
    result = result.filter(c => filterCompleted.value === 'completed' ? c.isCompleted : !c.isCompleted);
  }
  return result;
});

const goToHome = () => { router.push('/'); };
const goToOrders = () => { router.push('/orders'); };
const goToCommunications = () => { router.push('/communications'); };
const goToNotifications = () => { router.push('/notifications'); };
const goToAdmin = () => { router.push('/admin'); };

const getTypeTag = (type) => {
  const tags = { urgent: 'danger', delay: 'warning', report: 'info', unqualified: 'danger', other: 'default' };
  return tags[type] || 'default';
};
const getTypeName = (type) => {
  const names = { urgent: '加急', delay: '延迟沟通', report: '提前出报告', unqualified: '不合格确认', other: '其他' };
  return names[type] || type;
};
const getStatusTag = (status) => {
  const tags = { pending: 'warning', replied: 'info', resolved: 'success' };
  return tags[status] || 'default';
};
const getStatusName = (status) => {
  const names = { pending: '待回复', replied: '已回复', resolved: '已解决' };
  return names[status] || status;
};
const getOrderNo = (orderId) => {
  return orderId || '-';
};
const getSenderName = (senderId) => {
  const sender = users.value.find(u => u.id === senderId);
  return sender ? sender.name : '-';
};

const selectComm = async (comm) => {
  selectedComm.value = comm;
  try {
    const response = await communicationAPI.getReplies(comm.id);
    replies.value = response.data.map(r => ({
      ...r,
      createdAt: new Date(r.createdAt).toLocaleString()
    }));
  } catch (error) {
    console.error(error);
  }
};

const handleReply = async () => {
  if (!replyContent.value && replyAttachments.value.length === 0) {
    ElMessage.error('请输入回复内容或上传图片');
    return;
  }
  try {
    await communicationAPI.createReply(selectedComm.value.id, {
      content: replyContent.value,
      attachments: replyAttachments.value
    });
    ElMessage.success('回复成功');
    replyContent.value = '';
    replyAttachments.value = [];
    await selectComm(selectedComm.value);
  } catch (error) {
    ElMessage.error(error.message || '回复失败');
  }
};

const handleUploadReply = async (file) => {
  try {
    const result = await storageAPI.upload(file.raw || file, 'replies');
    replyAttachments.value.push(result);
    ElMessage.success('图片上传成功');
  } catch (error) {
    ElMessage.error('上传失败: ' + error.message);
  }
  return false;
};

// 切换红旗标记
const toggleFlag = async (comm) => {
  try {
    await communicationAPI.toggleCommFlag(comm.id, !comm.isFlagged);
    comm.isFlagged = !comm.isFlagged;
    ElMessage.success(comm.isFlagged ? '已标记红旗' : '已取消红旗');
  } catch (error) {
    ElMessage.error('操作失败: ' + error.message);
  }
};

// 切换完结状态
const toggleComplete = async (comm) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await communicationAPI.toggleCompleted(comm.id, user.id, !comm.isCompleted);
    comm.isCompleted = !comm.isCompleted;
    ElMessage.success(comm.isCompleted ? '已标记完结' : '已取消完结');
  } catch (error) {
    ElMessage.error('操作失败: ' + error.message);
  }
};

const loadComms = async () => {
  try {
    const response = await communicationAPI.getAll();
    communications.value = response.data.map(c => ({
      ...c,
      createdAt: new Date(c.createdAt).toLocaleString()
    }));
  } catch (error) {
    console.error(error);
  }
};

const loadUsers = async () => {
  try {
    const response = await userAPI.getAll();
    users.value = response.data;
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => {
  loadComms();
  loadUsers();
});
</script>

<style scoped>
.communications-container {
  display: flex;
  min-height: 100vh;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  color: white;
  z-index: 100;
}

.header-left h1 {
  font-size: 18px;
  font-weight: 600;
}

.sidebar {
  margin-top: 60px;
  width: 200px;
  background: #f5f5f5;
  min-height: calc(100vh - 60px);
  padding-top: 20px;
}

.sidebar-menu {
  border-right: none;
}

.main-content {
  margin-top: 60px;
  flex: 1;
  display: flex;
  padding: 20px;
  gap: 20px;
}

.comms-list {
  width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
}

.comms-header {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.comms-grid {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.comm-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  cursor: pointer;
  transition: all 0.3s;
}

.comm-card:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.comm-header {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.order-no {
  font-size: 13px;
  color: #666;
  margin-bottom: 5px;
}

.content-text {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.comm-footer {
  margin-top: 10px;
  font-size: 12px;
  color: #999;
}

.comms-detail {
  flex: 1;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
  overflow-y: auto;
  max-height: calc(100vh - 100px);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.detail-info {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 500;
  color: #666;
  width: 80px;
}

.detail-content {
  margin-bottom: 20px;
}

.detail-content h4 {
  margin-bottom: 10px;
}

.detail-content p {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  line-height: 1.6;
}

/* 附件预览 */
.attachments-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
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

.replies-section {
  margin-bottom: 20px;
}

.replies-section h4 {
  margin-bottom: 15px;
}

.no-replies {
  text-align: center;
  color: #999;
  padding: 30px;
}

.replies-list {
  border-top: 1px solid #e8e8e8;
}

.reply-item {
  padding: 15px 0;
  border-bottom: 1px solid #e8e8e8;
}

.reply-item:last-child {
  border-bottom: none;
}

.reply-header {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.reply-content {
  font-size: 14px;
  color: #333;
  background: #f9f9f9;
  padding: 10px;
  border-radius: 6px;
}

.reply-input {
  border-top: 1px solid #e8e8e8;
  padding-top: 20px;
}

.reply-upload-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.upload-preview-inline {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.upload-thumb {
  position: relative;
  width: 60px;
  height: 60px;
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
