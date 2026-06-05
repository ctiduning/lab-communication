<template>
  <div class="lab-initiate">
    <h2 class="page-title">发起沟通</h2>
    
    <el-form :model="form" label-width="120px" class="communication-form">
      <el-form-item label="沟通类型" prop="type">
        <el-select v-model="form.type" placeholder="请选择沟通类型">
          <el-option label="不合格沟通" value="unqualified"></el-option>
          <el-option label="数据确认" value="data_confirm"></el-option>
          <el-option label="其他沟通" value="other"></el-option>
        </el-select>
      </el-form-item>
      
      <el-form-item label="样品短号" prop="sampleCode">
        <el-input v-model="form.sampleCode" placeholder="请输入样品短号"></el-input>
      </el-form-item>
      
      <el-form-item label="沟通内容" prop="content">
        <el-input type="textarea" v-model="form.content" placeholder="请输入沟通内容" :rows="3"></el-input>
        <div style="margin-top:8px;">
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            :on-change="handleUpload"
            multiple
          >
            <el-button size="small" type="default">📎 上传图片</el-button>
          </el-upload>
          <div v-if="form.attachments.length > 0" style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
            <div v-for="(att, idx) in form.attachments" :key="idx" style="position:relative;width:80px;height:80px;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">
              <img :src="att.url" style="width:100%;height:100%;object-fit:cover;cursor:pointer;" @click="previewImage(att.url)" />
              <el-button size="small" style="position:absolute;top:2px;right:2px;min-width:20px;min-height:20px;padding:0;" type="danger" circle @click="form.attachments.splice(idx, 1)">×</el-button>
            </div>
          </div>
        </div>
      </el-form-item>
      
      <el-form-item label="消息接收人" prop="recipients">
        <el-select 
          v-model="form.recipients" 
          multiple 
          filterable
          placeholder="搜索并选择消息接收人"
          style="width: 100%;"
        >
          <el-option 
            v-for="businessUser in businessUsers" 
            :key="businessUser.id" 
            :label="`${businessUser.name} (${businessUser.region})`" 
            :value="businessUser.id"
          ></el-option>
        </el-select>
        <div style="color: #999; font-size: 12px; margin-top: 4px;">
          已选择 {{ form.recipients.length }} 人（可输入姓名/地区搜索）
        </div>
      </el-form-item>
      
      <el-form-item>
        <el-button type="primary" @click="submitForm">发送</el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-form-item>
    </el-form>
    
    <h3 class="section-title">已发送的沟通记录</h3>
    <el-table :data="communications" border stripe>
      <el-table-column label="" width="40" align="center">
        <template #default="scope">
          <span v-if="scope.row.hasFlagged" style="color: #f56c6c; font-size: 16px;">🚩</span>
          <span v-if="scope.row.allCompleted" style="color: #67c23a; font-size: 12px; margin-left: 2px;">✓全完结</span>
        </template>
      </el-table-column>
      <el-table-column label="沟通类型" width="120">
        <template #default="scope">
          {{ getTypeName(scope.row.type) }}
        </template>
      </el-table-column>
      <el-table-column prop="sampleCode" label="样品短号" width="120"></el-table-column>
      <el-table-column prop="content" label="内容" min-width="200" :show-overflow-tooltip="true"></el-table-column>
      <el-table-column label="接收人状态" width="120">
        <template #default="scope">
          <span>{{ scope.row.completedCount }}/{{ scope.row.recipientCount }} 完结</span>
        </template>
      </el-table-column>
      <el-table-column label="已读" width="70" align="center">
        <template #default="scope">
          <el-icon v-if="scope.row.allRead" color="#67c23a"><CircleCheck /></el-icon>
          <el-icon v-else color="#f56c6c"><CircleClose /></el-icon>
        </template>
      </el-table-column>
      <el-table-column label="发送时间" width="160">
        <template #default="scope">
          {{ formatTime(scope.row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="scope">
          <el-tag v-if="scope.row.allCompleted" size="small" type="success">全完结</el-tag>
          <el-tag v-else size="small" :type="scope.row.replyCount > 0 ? 'success' : 'warning'">
            {{ scope.row.replyCount > 0 ? '有回复' : '待回复' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" align="center">
        <template #default="scope">
          <el-button size="small" @click="viewDetail(scope.row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <el-dialog title="沟通详情" v-model="detailVisible" width="750px">
      <div v-if="selectedCommunication">
        <h4>基本信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="沟通类型">{{ getTypeName(selectedCommunication.type) }}</el-descriptions-item>
          <el-descriptions-item label="样品短号">{{ selectedCommunication.sampleCode }}</el-descriptions-item>
          <el-descriptions-item label="发送时间">{{ formatTime(selectedCommunication.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-top: 20px;">接收人状态</h4>
        <el-table :data="selectedCommunication.recipientDetails || []" border size="small">
          <el-table-column prop="name" label="接收人" width="100"></el-table-column>
          <el-table-column prop="region" label="地区" width="100"></el-table-column>
          <el-table-column label="已读" width="70" align="center">
            <template #default="scope">
              <el-icon v-if="scope.row.is_read" color="#67c23a"><CircleCheck /></el-icon>
              <el-icon v-else color="#f56c6c"><CircleClose /></el-icon>
            </template>
          </el-table-column>
          <el-table-column label="红旗" width="70" align="center">
            <template #default="scope">
              <el-button 
                v-if="scope.row.recipient_id !== currentUserId"
                size="small" 
                :type="scope.row.is_flagged ? 'warning' : 'default'"
                @click="toggleFlagForRecipient(scope.row)"
              >
                {{ scope.row.is_flagged ? '取消' : '红旗' }}
              </el-button>
              <span v-else>{{ scope.row.is_flagged ? '🚩' : '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="完结" width="90" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.is_completed" size="small" type="success">已完结</el-tag>
              <el-tag v-else size="small" type="warning">进行中</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="scope">
              <el-button 
                v-if="scope.row.recipient_id === currentUserId || selectedCommunication.senderId === currentUserId"
                size="small" 
                :type="scope.row.is_completed ? 'info' : 'success'"
                @click="toggleCompletedForRecipient(scope.row)"
              >
                {{ scope.row.is_completed ? '取消完结' : '标记完结' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <h4 style="margin-top: 20px;">沟通内容</h4>
        <p>{{ selectedCommunication.content }}</p>
        
        <h4 style="margin-top: 20px;">回复记录</h4>
        <div v-if="selectedCommunication.replies && selectedCommunication.replies.length > 0">
          <div v-for="(reply, index) in selectedCommunication.replies" :key="index" class="reply-item">
            <p><strong>{{ getUserDisplayName(reply.senderId) }}：</strong>{{ reply.content }}</p>
            <p class="reply-time">{{ formatTime(reply.createdAt) }}</p>
          </div>
        </div>
        <div v-else class="no-reply">暂无回复</div>

        <h4 style="margin-top: 20px;">回复</h4>
        <el-input type="textarea" v-model="replyContent" placeholder="请输入回复内容" :rows="3"></el-input>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" @click="submitReplyFromDetail" :loading="replyLoading">发送回复</el-button>
      </template>
    </el-dialog>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="showImagePreview" width="80%" :show-close="true" destroy-on-close>
      <img :src="previewImageUrl" style="width: 100%;" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { CircleCheck, CircleClose } from '@element-plus/icons-vue';
import { communicationAPI, userAPI, storageAPI } from '../api';
import { supabase } from '../utils/supabase';

const form = reactive({
  type: '',
  sampleCode: '',
  content: '',
  recipients: [],
  attachments: []
});
const showImagePreview = ref(false);
const previewImageUrl = ref('');

const previewImage = (url) => {
  previewImageUrl.value = url;
  showImagePreview.value = true;
};

const handleUpload = async (file) => {
  try {
    const result = await storageAPI.upload(file.raw || file, 'communications');
    form.attachments.push(result);
    ElMessage.success('图片上传成功');
  } catch (error) {
    ElMessage.error('上传失败: ' + error.message);
  }
  return false;
};

const businessUsers = ref([]);
const allUsers = ref([]);
const communications = ref([]);
const detailVisible = ref(false);
const selectedCommunication = ref(null);
const replyContent = ref('');
const replyLoading = ref(false);
const currentUserId = ref('');

const typeMap = {
  unqualified: '不合格沟通',
  data_confirm: '数据确认',
  other: '其他沟通'
};

const getTypeName = (type) => typeMap[type] || type;

const getUserDisplayName = (userId) => {
  const all = [...businessUsers.value, ...(allUsers.value || [])];
  const u = all.find(u => u.id === userId);
  return u ? (u.name || u.username) : '未知';
};

const formatTime = (t) => {
  if (!t) return '-';
  return new Date(t).toLocaleString('zh-CN');
};

const loadCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) currentUserId.value = user.id;
};

const loadBusinessUsers = async () => {
  try {
    const response = await userAPI.getByRole('business');
    businessUsers.value = response.data;
  } catch (error) {
    ElMessage.error('加载业务用户失败');
  }
};

const loadAllUsers = async () => {
  try {
    const response = await userAPI.getAll();
    allUsers.value = response.data;
  } catch (error) {
    // 静默
  }
};

const loadCommunications = async () => {
  try {
    const response = await communicationAPI.getAll();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const mine = response.data.filter(c => c.senderId === authUser.id);
      communications.value = mine.map(c => {
        const recipients = c.recipientDetails || [];
        return {
          ...c,
          recipientCount: recipients.length,
          completedCount: recipients.filter(r => r.is_completed).length,
          allCompleted: recipients.length > 0 && recipients.every(r => r.is_completed),
          allRead: recipients.length > 0 && recipients.every(r => r.is_read),
          hasFlagged: recipients.some(r => r.is_flagged),
          replyCount: c.replies?.length || 0
        };
      });
    }
  } catch (error) {
    ElMessage.error('加载沟通记录失败');
  }
};

const submitForm = async () => {
  if (!form.type || !form.content.trim()) {
    ElMessage.error('请选择沟通类型并填写沟通内容');
    return;
  }
  
  try {
    await communicationAPI.create({
      ...form,
      senderRole: 'lab',
      attachments: form.attachments
    });
    ElMessage.success('发送成功');
    resetForm();
    loadCommunications();
  } catch (error) {
    ElMessage.error('发送失败：' + (error.message || '未知错误'));
  }
};

const resetForm = () => {
  form.type = '';
  form.sampleCode = '';
  form.content = '';
  form.recipients = [];
};

const viewDetail = (communication) => {
  selectedCommunication.value = JSON.parse(JSON.stringify(communication));
  replyContent.value = '';
  detailVisible.value = true;
  communicationAPI.markAsRead(communication.id).catch(() => {});
};

const toggleFlagForRecipient = async (recipient) => {
  try {
    const newVal = !recipient.is_flagged;
    await communicationAPI.toggleFlag(selectedCommunication.value.id, recipient.recipient_id, newVal);
    recipient.is_flagged = newVal;
    ElMessage.success(newVal ? '已标记红旗' : '已取消红旗');
  } catch (e) {
    ElMessage.error('操作失败');
  }
};

const toggleCompletedForRecipient = async (recipient) => {
  try {
    const newVal = !recipient.is_completed;
    await communicationAPI.toggleCompleted(selectedCommunication.value.id, recipient.recipient_id, newVal);
    recipient.is_completed = newVal;
    ElMessage.success(newVal ? '已标记完结' : '已取消完结');
    loadCommunications(); // 刷新列表
  } catch (e) {
    ElMessage.error('操作失败');
  }
};

const submitReplyFromDetail = async () => {
  if (!replyContent.value.trim()) {
    ElMessage.error('请输入回复内容');
    return;
  }
  replyLoading.value = true;
  try {
    await communicationAPI.createReply(selectedCommunication.value.id, {
      content: replyContent.value
    });
    ElMessage.success('回复成功');
    replyContent.value = '';
    // 重新加载详情
    const { data } = await communicationAPI.getById(selectedCommunication.value.id);
    selectedCommunication.value = data;
  } catch (error) {
    ElMessage.error('回复失败：' + (error.message || '未知错误'));
  } finally {
    replyLoading.value = false;
  }
};

onMounted(() => {
  loadCurrentUser();
  loadBusinessUsers();
  loadAllUsers();
  loadCommunications();
});
</script>

<style scoped>
.lab-initiate {
  padding: 20px;
}

.page-title {
  margin-bottom: 20px;
  font-size: 20px;
  color: #333;
}

.section-title {
  margin: 30px 0 15px 0;
  font-size: 16px;
  color: #333;
}

.communication-form {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
}

.el-form-item {
  margin-bottom: 15px;
}

.reply-item {
  background: #f5f5f5;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
}

.reply-time {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.no-reply {
  text-align: center;
  color: #999;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}
</style>
