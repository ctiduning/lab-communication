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
          :filter-method="filterRecipient"
          placeholder="输入姓名/拼音/地区搜索..."
          style="width: 100%;"
          :teleported="false"
          :popper-append-to-body="false"
        >
          <el-option-group v-for="group in filteredGroups" :key="group.label" :label="group.label">
            <el-option 
              v-for="u in group.users" 
              :key="u.id" 
              :label="u.name + ' (' + (u.region || '-') + ')'" 
              :value="u.id"
            >
              <span>{{ u.name }}</span>
              <span style="color:#999;font-size:12px;margin-left:8px;">{{ u.region || '-' }} · {{ u._roleName || '-' }}</span>
            </el-option>
          </el-option-group>
        </el-select>
        <div style="color: #999; font-size: 12px; margin-top: 4px;">
          已选择 {{ form.recipients.length }} 人（支持拼音首字母/全拼/地区搜索）
        </div>
      </el-form-item>
      
      <el-form-item>
        <el-button type="primary" @click="submitForm">发送</el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="showImagePreview" width="80%" :show-close="true" destroy-on-close>
      <img :src="previewImageUrl" style="width: 100%;" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue';
import { ElMessage } from 'element-plus';
import { communicationAPI, storageAPI } from '../api';
import { supabase } from '../utils/supabase';
import { buildSearchKeys, filterGroups } from '../utils/pinyinSearch';

const form = reactive({
  type: '',
  sampleCode: '',
  content: '',
  recipients: [],
  attachments: []
});
const showImagePreview = ref(false);
const previewImageUrl = ref('');
const businessUsers = ref([]);
const recipientGroups = ref([]);
const searchQuery = ref('');

const filteredGroups = computed(() => {
  return filterGroups(searchQuery.value, recipientGroups.value);
});

const filterRecipient = (query) => {
  searchQuery.value = query;
};

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
  } catch (error) {
    ElMessage.error('发送失败：' + (error.message || '未知错误'));
  }
};

const resetForm = () => {
  form.type = '';
  form.sampleCode = '';
  form.content = '';
  form.recipients = [];
  form.attachments = [];
};

const loadBusinessUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['business', 'business_assistant'])
      .eq('is_disabled', false)
      .order('role')
      .order('name')
    if (error) throw error
    businessUsers.value = data || []

    // 按角色分组，构建搜索关键词
    const roleNameMap = { business: '业务', business_assistant: '业务助理' }
    const groups = {}
    const roleOrder = ['business', 'business_assistant']
    data.forEach(u => {
      const label = roleNameMap[u.role] || u.role
      const userWithKeys = buildSearchKeys(u, roleNameMap)
      userWithKeys._roleName = label
      if (!groups[label]) groups[label] = { label, users: [] }
      groups[label].users.push(userWithKeys)
    })
    recipientGroups.value = roleOrder
      .map(r => roleNameMap[r])
      .filter(label => groups[label])
      .map(label => groups[label])
  } catch (error) {
    ElMessage.error('加载业务用户失败');
  }
};

const preselectRecipients = inject('preselectRecipients', ref([]));

onMounted(() => {
  loadBusinessUsers().then(() => {
    // 如果有预选中用户（从组织架构页面跳转过来），自动填充
    if (preselectRecipients.value && preselectRecipients.value.length > 0) {
      form.recipients = [...preselectRecipients.value];
      preselectRecipients.value = [];
      ElMessage.success(`已自动选中 ${form.recipients.length} 位接收人`);
    }
  });
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
