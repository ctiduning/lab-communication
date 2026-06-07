<template>
  <div class="business-initiate">
    <h2 class="page-title">发起沟通</h2>
    
    <el-form :model="form" label-width="120px" class="communication-form">
      <el-form-item label="沟通类型" prop="type">
        <el-select v-model="form.type" placeholder="请选择沟通类型">
          <el-option label="付费加急" value="paid_urgent"></el-option>
          <el-option label="免费加急" value="free_urgent"></el-option>
          <el-option label="数据质疑" value="data_dispute"></el-option>
          <el-option label="跟单" value="follow_up"></el-option>
          <el-option label="咨询" value="consultation"></el-option>
          <el-option label="其他" value="other"></el-option>
        </el-select>
      </el-form-item>
      
      <el-form-item label="消息内容" prop="content">
        <el-input type="textarea" v-model="form.content" placeholder="请输入消息内容" :rows="4"></el-input>
      </el-form-item>
      
      <el-form-item label="是否为V1V2客户" prop="vip">
        <el-select v-model="form.vip" placeholder="请选择">
          <el-option label="是" value="yes"></el-option>
          <el-option label="否" value="no"></el-option>
        </el-select>
      </el-form-item>
      
      <el-form-item label="客户名称" prop="customerName">
        <el-input v-model="form.customerName" placeholder="请输入客户名称"></el-input>
      </el-form-item>
      
      <el-form-item label="样品短号" prop="sampleCode">
        <el-input v-model="form.sampleCode" placeholder="未进单可空"></el-input>
      </el-form-item>
      
      <el-form-item label="样品基质" prop="sampleMatrix">
        <el-input v-model="form.sampleMatrix" placeholder="请输入样品基质"></el-input>
      </el-form-item>
      
      <el-form-item label="样品数量" prop="sampleCount">
        <el-input type="number" v-model="form.sampleCount" placeholder="请输入样品数量"></el-input>
      </el-form-item>
      
      <el-form-item label="测试项目" prop="testItems">
        <el-input v-model="form.testItems" placeholder="请输入测试项目"></el-input>
      </el-form-item>
      
      <el-form-item label="到样日期" prop="sampleDate">
        <el-date-picker v-model="form.sampleDate" type="date" placeholder="选择到样日期"></el-date-picker>
      </el-form-item>
      
      <el-form-item label="想要的测试周期" prop="requestedCycle">
        <el-input v-model="form.requestedCycle" placeholder="请输入想要的测试周期"></el-input>
      </el-form-item>
      
      <el-form-item label="测试费用" prop="chargeStatus">
        <el-input v-model="form.chargeStatus" placeholder="请输入收取的测试费用金额"></el-input>
      </el-form-item>
      
      <el-form-item label="收取的加急费用" prop="urgentFee">
        <el-input type="number" v-model="form.urgentFee" placeholder="请输入加急费用"></el-input>
      </el-form-item>
      
      <el-form-item label="备注" prop="remark">
        <el-input type="textarea" v-model="form.remark" placeholder="请输入备注信息" :rows="3"></el-input>
        <div style="margin-top:8px;">
          <!-- 标准上传（兼容所有浏览器） -->
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            :on-change="handleUpload"
            multiple
          >
            <el-button size="small" type="default">📎 选择图片</el-button>
          </el-upload>
          
          <!-- 高级上传（支持任意位置，仅 Chrome/Edge） -->
          <el-button 
            v-if="supportsFileSystemAPI" 
            size="small" 
            type="primary" 
            style="margin-left:8px;"
            @click="pickFilesWithAPI"
          >
            📂 从任意位置选择
          </el-button>
          
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
          reserve-keyword
          :filter-method="filterRecipient"
          placeholder="输入姓名/拼音/部门/角色搜索..."
          style="width: 100%; min-width: 600px;"
          :teleported="false"
          :popper-append-to-body="false"
          :max-collapse-tags="0"
          class="recipient-select"
        >
          <el-option-group v-for="group in filteredGroups" :key="group.label" :label="group.label">
            <el-option
              v-for="u in group.users"
              :key="u.id"
              :label="u.name"
              :value="u.id"
            >
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-weight:500;">{{ u.name }}</span>
                <span style="color:#999;font-size:12px;">{{ u.department || '-' }} · {{ u._roleName || '-' }}</span>
              </div>
            </el-option>
          </el-option-group>
        </el-select>
        <div style="color: #999; font-size: 12px; margin-top: 4px;">
          已选择 {{ form.recipients.length }} 人（支持拼音首字母/全拼/部门/角色搜索）
        </div>
        <!-- 已选人员名片展示 -->
        <div v-if="form.recipients.length > 0" class="selected-recipient-cards">
          <div v-for="uid in form.recipients" :key="uid" class="recipient-card">
            <span class="recipient-card-name">{{ getUserName(uid) }}</span>
            <span class="recipient-card-dept">{{ getUserDept(uid) }}</span>
            <span class="recipient-card-role">{{ getUserRoleName(uid) }}</span>
            <span class="recipient-card-remove" @click="removeRecipient(uid)">×</span>
          </div>
        </div>
      </el-form-item>
      
      <el-form-item>
        <el-button type="primary" @click="submitForm">发送</el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue';
import { ElMessage } from 'element-plus';
import { communicationAPI, storageAPI, ROLE_OPTIONS, getRoleDisplayName } from '../api';
import { supabase } from '../utils/supabase';
import { buildSearchKeys, filterGroups } from '../utils/pinyinSearch';

const form = reactive({
  type: '',
  vip: '',
  customerName: '',
  sampleCode: '',
  sampleMatrix: '',
  sampleCount: '',
  testItems: '',
  sampleDate: '',
  requestedCycle: '',
  chargeStatus: '',
  urgentFee: '',
  remark: '',
  content: '',
  recipients: [],
  attachments: []
});

const allUsers = ref([]);
const recipientGroups = ref([]);
const searchQuery = ref('');

const filteredGroups = computed(() => {
  return filterGroups(searchQuery.value, recipientGroups.value);
});

const filterRecipient = (query) => {
  searchQuery.value = query;
};

const handleUpload = async (file) => {
  try {
    console.log('正在上传文件:', file.name, '大小:', file.size, '类型:', file.type)
    const result = await storageAPI.upload(file.raw || file, 'communications');
    form.attachments.push(result);
    ElMessage.success('图片上传成功');
  } catch (error) {
    console.error('上传失败，详细错误:', error);
    const errMsg = error.message || error.error_description || '未知错误';
    ElMessage.error('上传失败: ' + errMsg);
  }
  return false;
};

const typeMap = {
  paid_urgent: '付费加急',
  free_urgent: '免费加急',
  data_dispute: '数据质疑',
  follow_up: '跟单',
  consultation: '咨询',
  other: '其他'
};

// 从所有选项中查找用户信息
const findUserById = (uid) => {
  for (const group of recipientGroups.value) {
    const user = group.users.find(u => u.id === uid);
    if (user) return user;
  }
  return null;
};

const getUserName = (uid) => findUserById(uid)?.name || uid;
const getUserDept = (uid) => findUserById(uid)?.department || '-';
const getUserRoleName = (uid) => findUserById(uid)?._roleName || '-';

const removeRecipient = (uid) => {
  const idx = form.recipients.indexOf(uid);
  if (idx >= 0) form.recipients.splice(idx, 1);
};

const submitForm = async () => {
  if (!form.type || !form.recipients.length) {
    ElMessage.error('请选择沟通类型和消息接收人');
    return;
  }
  
  try {
    await communicationAPI.create({
      ...form,
      senderRole: 'business',
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
  form.vip = '';
  form.customerName = '';
  form.sampleCode = '';
  form.sampleMatrix = '';
  form.sampleCount = '';
  form.testItems = '';
  form.sampleDate = '';
  form.requestedCycle = '';
  form.chargeStatus = '';
  form.urgentFee = '';
  form.remark = '';
  form.recipients = [];
  form.attachments = [];
};

// 加载所有用户（发起沟通时可选择任何人，除自己外）
const loadAllUsers = async () => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', authUser?.id || '')
      .eq('is_disabled', false)
      .order('role')
      .order('department')
      .order('name')
    if (error) throw error
    allUsers.value = data || []

    // 按角色分组（使用统一的 ROLE_OPTIONS）
    const groups = {}
    const roleNameMap = {}
    const roleOrder = []
    ROLE_OPTIONS.filter(r => r.value !== 'admin').forEach(r => {
      roleNameMap[r.value] = r.label
      roleOrder.push(r.value)
    })

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
    ElMessage.error('加载用户失败');
  }
};

const preselectRecipients = inject('preselectRecipients', ref([]));

// 是否支持 File System Access API
const supportsFileSystemAPI = ref(typeof window !== 'undefined' && !!window.showOpenFilePicker);

// 使用 File System Access API 选择并上传文件
const pickFilesWithAPI = async () => {
  try {
    const handles = await window.showOpenFilePicker({
      multiple: true,
      types: [
        {
          description: '图片文件',
          accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }
        }
      ]
    });
    
    for (const handle of handles) {
      const file = await handle.getFile();
      console.log('通过 File System API 选择文件:', file.name, '大小:', file.size);
      const result = await storageAPI.upload(file, 'communications');
      form.attachments.push(result);
      ElMessage.success(`已上传: ${file.name}`);
    }
  } catch (err) {
    if (err.name === 'AbortError') return; // 用户取消了选择
    console.error('File System API 上传失败:', err);
    ElMessage.error('选择文件失败: ' + (err.message || '未知错误'));
  }
};

onMounted(() => {
  loadAllUsers().then(() => {
    // 如果有预选中用户（从组织架构页面跳转过来），自动填充
    if (preselectRecipients.value && preselectRecipients.value.length > 0) {
      form.recipients = [...preselectRecipients.value];
      preselectRecipients.value = [];
      ElMessage.success(`已自动选中 ${form.recipients.length} 位接收人`);
    }
    
    // 检查是否有已撤回消息需要编辑重发
    const recalledEditData = localStorage.getItem('recalledMessageEdit');
    if (recalledEditData) {
      try {
        const editData = JSON.parse(recalledEditData);
        form.type = editData.type || '';
        form.customerName = editData.customerName || '';
        form.sampleCode = editData.sampleCode || '';
        form.content = editData.content || '';
        form.recipients = editData.recipientIds || [];
        ElMessage.info('已加载撤回消息的内容，请编辑后重新发送');
        // 清除 localStorage，避免刷新后重复加载
        localStorage.removeItem('recalledMessageEdit');
      } catch (e) {
        console.error('解析撤回消息数据失败:', e);
        localStorage.removeItem('recalledMessageEdit');
      }
    }
  });
});
</script>

<style scoped>
.business-initiate {
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

/* 已选人员名片 */
.selected-recipient-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.recipient-card {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
}

.recipient-card-name {
  font-weight: 600;
  color: #303133;
}

.recipient-card-dept {
  color: #606266;
  font-size: 11px;
}

.recipient-card-role {
  color: #909399;
  font-size: 11px;
  background: #f0f0f0;
  padding: 1px 5px;
  border-radius: 3px;
}

.recipient-card-remove {
  color: #f56c6c;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  margin-left: 4px;
  line-height: 1;
}

.recipient-card-remove:hover {
  color: #c45656;
}

/* 让el-select的标签也显示正确 */
:deep(.recipient-select .el-select__tags) {
  max-width: 100% !important;
}
</style>
