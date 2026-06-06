<template>
  <div class="admin-page">
    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="用户管理" name="users">
        <div class="tab-content">
          <div class="tab-header">
            <el-button type="primary" @click="showCreateModal = true">单个添加</el-button>
            <div
              style="display: inline-block; margin-left: 10px;"
              @dragover.prevent
              @drop.prevent="handleExcelDrop"
            >
              <el-button type="success" @click="handlePickExcel">导入Excel批量注册</el-button>
            </div>
            <el-button type="text" @click="downloadTemplate" style="margin-left: 8px; color: #888; font-size: 12px;">下载模板</el-button>
            <div class="search-box">
              <el-input v-model="searchKeyword" placeholder="搜索姓名、工号、部门..." clearable @clear="loadUsers"></el-input>
              <el-button type="primary" @click="handleSearch">搜索</el-button>
            </div>
          </div>
          <el-table :data="filteredUsers" border stripe>
            <el-table-column prop="username" label="用户名" width="100"></el-table-column>
            <el-table-column label="姓名(工号)" width="140">
              <template #default="scope">
                {{ scope.row.name }}({{ scope.row.employeeId }})
              </template>
            </el-table-column>
            <el-table-column prop="role" label="角色" width="120">
              <template #default="scope">
                <el-tag :type="getRoleTag(scope.row.role)">{{ getRoleName(scope.row.role) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="department" label="部门" width="120"></el-table-column>
            <el-table-column prop="region" label="地区" width="100"></el-table-column>
            <el-table-column prop="phone" label="电话" width="130"></el-table-column>
            <el-table-column prop="email" label="邮箱" min-width="160"></el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default="scope">
                <el-tag v-if="scope.row.isDisabled" type="info" size="small">已禁用</el-tag>
                <el-tag v-else type="success" size="small">正常</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="scope">
                <el-button
                  v-if="!scope.row.isDisabled && scope.row.role !== 'admin'"
                  size="small"
                  type="warning"
                  @click="handleDisable(scope.row)"
                >禁用</el-button>
                <el-button
                  v-if="scope.row.isDisabled"
                  size="small"
                  type="success"
                  @click="handleEnable(scope.row)"
                >启用</el-button>
                <el-button
                  v-if="scope.row.role !== 'admin'"
                  size="small"
                  type="info"
                  @click="handleResetPassword(scope.row)"
                >重置密码</el-button>
                <el-button
                  v-if="scope.row.role !== 'admin'"
                  size="small"
                  type="danger"
                  @click="handleDeleteAccount(scope.row)"
                >删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="沟通记录" name="communications">
        <div class="tab-content">
          <div class="tab-header">
            <span class="record-count">共 {{ communications.length }} 条记录</span>
            <el-input v-model="commSearchKeyword" placeholder="搜索内容、客户、发起人..." clearable style="width: 250px; margin-left: auto;" />
          </div>
          <el-table :data="filteredCommunications" border stripe max-height="600">
            <el-table-column label="时间" width="160">
              <template #default="scope">
                {{ formatTime(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="类型" width="100">
              <template #default="scope">
                <el-tag size="small">{{ getTypeLabel(scope.row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="发起人" width="100">
              <template #default="scope">
                {{ scope.row.senderName }}
              </template>
            </el-table-column>
            <el-table-column prop="customerName" label="客户名称" width="120"></el-table-column>
            <el-table-column prop="sampleCode" label="样品编号" width="120"></el-table-column>
            <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip></el-table-column>
            <el-table-column label="接收人" width="120" show-overflow-tooltip>
              <template #default="scope">
                {{ scope.row.recipientNames }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="scope">
                <el-tag :type="scope.row.replyCount > 0 ? 'success' : 'warning'" size="small">
                  {{ scope.row.replyCount > 0 ? '有回复' : '待回复' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="回复" width="60">
              <template #default="scope">
                {{ scope.row.replyCount || 0 }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="通知管理" name="notifications">
        <div class="tab-content">
          <div class="tab-header">
            <span class="record-count">共 {{ allNotifications.length }} 条通知</span>
          </div>
          <el-table :data="allNotifications" border stripe max-height="600">
            <el-table-column label="时间" width="160">
              <template #default="scope">
                {{ formatTime(scope.row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="类型" width="100">
              <template #default="scope">
                <el-tag size="small" :type="getNotifTypeTag(scope.row.type)">{{ scope.row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="content" label="内容" min-width="250" show-overflow-tooltip></el-table-column>
            <el-table-column label="已读" width="70" align="center">
              <template #default="scope">
                <el-tag :type="scope.row.is_read ? 'success' : 'warning'" size="small">
                  {{ scope.row.is_read ? '已读' : '未读' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" align="center">
              <template #default="scope">
                <el-button v-if="scope.row.announcement_id" size="small" type="info" @click="viewAnnouncementReactions(scope.row.announcement_id)">点赞详情</el-button>
                <el-button size="small" type="danger" @click="handleDeleteNotification(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="统计" name="stats">
        <div class="stats-content">
          <div class="stats-cards">
            <div class="stat-card">
              <div class="stat-info">
                <p class="stat-value">{{ totalUsers }}</p>
                <p class="stat-label">总用户数</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-info">
                <p class="stat-value">{{ businessUserCount }}</p>
                <p class="stat-label">业务人员</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-info">
                <p class="stat-value">{{ labUserCount }}</p>
                <p class="stat-label">实验室人员</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-info">
                <p class="stat-value">{{ communications.length }}</p>
                <p class="stat-label">沟通记录</p>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 添加用户弹窗 -->
    <el-dialog title="添加用户" v-model="showCreateModal">
      <el-form :model="userForm" label-width="100px">
        <el-form-item label="邮箱">
          <el-input v-model="userForm.email" placeholder="登录邮箱（企业邮箱）"></el-input>
        </el-form-item>
        <el-form-item label="密码">
          <el-input type="password" v-model="userForm.password" show-password placeholder="不少于6位"></el-input>
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="userForm.username"></el-input>
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="userForm.name"></el-input>
        </el-form-item>
        <el-form-item label="工号">
          <el-input v-model="userForm.employeeId" placeholder="唯一标识，不可重复"></el-input>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.role" placeholder="请选择角色" style="width: 100%;">
            <el-option
              v-for="opt in allRoleOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="userForm.department" placeholder="请输入所属部门"></el-input>
        </el-form-item>
        <el-form-item label="地区">
          <el-input v-model="userForm.region" placeholder="请输入所在地区"></el-input>
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="userForm.phone"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateModal = false">取消</el-button>
        <el-button type="primary" @click="handleCreateUser">确认创建</el-button>
      </template>
    </el-dialog>

    <!-- 点赞/点踩详情弹窗（管理员） -->
    <el-dialog v-model="reactionDetailVisible" :title="reactionDetailTitle" width="600px" destroy-on-close>
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
            {{ getRoleName(scope.row.user?.role || '') }}
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { userAPI, authAPI, communicationAPI, notificationAPI, reactionAPI, ROLE_OPTIONS, getRoleDisplayName } from '../api';
import { supabase } from '../utils/supabase';
import * as XLSX from 'xlsx';

const activeTab = ref('users');
const users = ref([]);
const communications = ref([]);
const allNotifications = ref([]);
const searchKeyword = ref('');
const showCreateModal = ref(false);
const saving = ref(false);

const allRoleOptions = ROLE_OPTIONS;

const userForm = reactive({
  username: '',
  password: '',
  name: '',
  employeeId: '',
  role: 'business',
  department: '',
  region: '',
  phone: '',
  email: ''
});

const commSearchKeyword = ref('');

const filteredUsers = computed(() => {
  if (!searchKeyword.value) return users.value;
  const kw = searchKeyword.value.toLowerCase();
  return users.value.filter(u =>
    u.name?.toLowerCase().includes(kw) ||
    u.employeeId?.toLowerCase().includes(kw) ||
    u.department?.toLowerCase().includes(kw) ||
    u.region?.toLowerCase().includes(kw)
  );
});

const totalUsers = computed(() => users.value.length);
const businessUserCount = computed(() => users.value.filter(u => 
  ['business', 'business_assistant', 'supervisor', 'customer_service', 'cs_leader'].includes(u.role)
).length);
const labUserCount = computed(() => users.value.filter(u => 
  ['tech_support', 'inspection_leader', 'inspection_engineer', 'lab'].includes(u.role)
).length);

const filteredCommunications = computed(() => {
  if (!commSearchKeyword.value) return communications.value;
  const kw = commSearchKeyword.value.toLowerCase();
  return communications.value.filter(c =>
    c.content?.toLowerCase().includes(kw) ||
    c.customerName?.toLowerCase().includes(kw) ||
    c.senderName?.toLowerCase().includes(kw) ||
    c.sampleCode?.toLowerCase().includes(kw) ||
    c.recipientNames?.toLowerCase().includes(kw)
  );
});

const getRoleTag = (role) => {
  const labRoles = ['tech_support', 'inspection_leader', 'inspection_engineer', 'lab'];
  if (role === 'admin') return 'warning';
  if (labRoles.includes(role)) return 'success';
  return 'info';
};

const getRoleName = (role) => getRoleDisplayName(role);

const getTypeLabel = (type) => {
  const labels = {
    paid_urgent: '付费加急',
    free_urgent: '免费加急',
    data_dispute: '数据质疑',
    follow_up: '跟单',
    consultation: '咨询',
    other: '其他',
    unqualified: '不合格沟通',
    data_confirm: '数据确认'
  };
  return labels[type] || type;
};

const getNotifTypeTag = (type) => {
  const tags = { urgent: 'danger', reply: '', announcement: 'warning', communication: 'info' };
  return tags[type] || '';
};

const formatTime = (t) => {
  if (!t) return '';
  return new Date(t).toLocaleString('zh-CN');
};

const handleSearch = () => {};

const handleCreateUser = async () => {
  if (!userForm.email || !userForm.password || !userForm.name || !userForm.employeeId) {
    ElMessage.error('请填写必填项（邮箱、密码、姓名、工号）');
    return;
  }
  if (userForm.password.length < 6) {
    ElMessage.error('密码不能少于6位');
    return;
  }
  if (!userForm.email.includes('@')) {
    ElMessage.error('请输入有效的邮箱地址');
    return;
  }

  try {
    await authAPI.register({
      ...userForm,
      priority: 'member',
      mustChangePwd: true
    });
    ElMessage.success('用户创建成功，初始密码：' + userForm.password);
    showCreateModal.value = false;
    Object.keys(userForm).forEach(key => {
      if (key === 'role') userForm[key] = 'business';
      else userForm[key] = '';
    });
    loadUsers();
  } catch (error) {
    ElMessage.error(error.message || '创建失败');
  }
};

const handleDisable = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要禁用用户「${user.name}(${user.employeeId})」吗？\n禁用后该用户将无法登录，但数据会保留。`,
      '确认禁用',
      { confirmButtonText: '确定禁用', cancelButtonText: '取消', type: 'warning' }
    );
    await userAPI.disable(user.id);
    ElMessage.success('已禁用该用户');
    loadUsers();
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('操作失败：' + (error.message || '未知错误'));
  }
};

const handleEnable = async (user) => {
  try {
    await userAPI.enable(user.id);
    ElMessage.success('已启用该用户');
    loadUsers();
  } catch (error) {
    ElMessage.error('操作失败：' + (error.message || '未知错误'));
  }
};

// 删除用户账号（清除注册信息，保留沟通记录）
const handleDeleteAccount = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户「${user.name}(${user.employeeId})」的账号吗？\n\n⚠️ 此操作将清除该用户的所有注册信息（姓名、电话、邮箱等），该用户将无法登录。但该用户的历史沟通记录会保留。\n\n删除后该邮箱可以重新注册。`,
      '确认删除账号',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'error', confirmButtonClass: 'el-button--danger' }
    );
    await userAPI.deleteAccount(user.id);
    ElMessage.success('用户账号已删除，沟通记录已保留，该邮箱可重新注册');
    loadUsers();
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败：' + (error.message || '未知错误'));
  }
};

// 重置用户密码
const handleResetPassword = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要重置用户「${user.name}(${user.employeeId})」的密码吗？\n\n密码将被重置为：cti123\n该用户下次登录后需要修改密码。`,
      '确认重置密码',
      { confirmButtonText: '确定重置', cancelButtonText: '取消', type: 'warning' }
    );
    await userAPI.resetPassword(user.id);
    ElMessage.success('密码已重置为 cti123，用户下次登录需修改密码');
    loadUsers();
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('重置失败：' + (error.message || '未知错误'));
  }
};

// 删除通知
const handleDeleteNotification = async (notif) => {
  try {
    await ElMessageBox.confirm('确定要删除这条通知吗？', '确认删除', { type: 'warning' });
    await notificationAPI.delete(notif.id);
    ElMessage.success('通知已删除');
    loadNotifications();
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败：' + (error.message || '未知错误'));
  }
};

// 用 File System Access API 打开文件选择器（支持桌面等任意路径）
const handlePickExcel = async () => {
  try {
    if (!window.showOpenFilePicker) {
      ElMessage.warning('当前浏览器不支持高级文件选择，请拖拽文件到按钮上，或复制文件到项目目录后重试');
      return;
    }
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        { description: 'Excel 文件', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] } }
      ],
      excludeAcceptAllOption: false,
      multiple: false
    });
    const file = await fileHandle.getFile();
    handleExcelImport({ raw: file, name: file.name });
  } catch (err) {
    if (err.name !== 'AbortError') ElMessage.error('选择文件失败：' + err.message);
  }
};

// Excel 拖拽导入
const handleExcelDrop = (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      handleExcelImport({ raw: file, name: file.name });
    } else {
      ElMessage.error('请上传 .xlsx 或 .xls 格式的 Excel 文件');
    }
  }
};

// Excel 导入
const handleExcelImport = async (file) => {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        ElMessage.error('Excel 文件为空或格式不正确');
        return;
      }

      const firstRow = rows[0];
      const requiredFields = ['姓名', '工号', '角色'];
      const missing = requiredFields.filter(f => !(f in firstRow));
      if (missing.length > 0) {
        ElMessage.error(`Excel 缺少必要列：${missing.join('、')}。请下载模板对照填写`);
        return;
      }

      const roleMap = {
        '业务': 'business',
        '业务助理': 'business_assistant',
        '技术支持': 'tech_support',
        '主管': 'supervisor',
        '检测组长': 'inspection_leader',
        '检测工程师': 'inspection_engineer',
        '客服': 'customer_service',
        '客服组长': 'cs_leader',
        '管理员': 'admin',
        '实验室': 'lab'
      };

      const usersToCreate = rows.map(row => ({
        name: String(row['姓名'] || '').trim(),
        employeeId: String(row['工号'] || '').trim(),
        role: String(row['角色'] || '').trim(),
        department: String(row['部门'] || '').trim(),
        region: String(row['地区'] || '').trim(),
        phone: String(row['电话'] || '').trim(),
        email: String(row['邮箱'] || '').trim()
      })).filter(u => u.name && u.employeeId && u.role);

      if (usersToCreate.length === 0) {
        ElMessage.error('没有有效的用户数据（需要姓名、工号、角色）');
        return;
      }

      let previewMsg = `即将创建 ${usersToCreate.length} 个账号：\n`;
      usersToCreate.slice(0, 10).forEach(u => {
        previewMsg += `  - ${u.name}(${u.employeeId}) [${u.role}]\n`;
      });
      if (usersToCreate.length > 10) previewMsg += `  ... 共 ${usersToCreate.length} 人`;

      await ElMessageBox.confirm(previewMsg, '确认批量注册', {
        confirmButtonText: '确认注册', cancelButtonText: '取消', type: 'info'
      });

      let successCount = 0;
      let failList = [];
      for (const u of usersToCreate) {
        try {
          const defaultPwd = 'Ct1@2026';
          const email = u.email || `${u.employeeId}@cti-cert.com`;
          const mappedRole = roleMap[u.role] || u.role;
          await authAPI.register({
            email,
            password: defaultPwd,
            username: `${u.name}${u.employeeId}`,
            name: u.name,
            employeeId: u.employeeId,
            role: mappedRole,
            department: u.department,
            region: u.region,
            phone: u.phone,
            priority: 'member',
            mustChangePwd: true
          });
          successCount++;
        } catch (err) {
          failList.push(`${u.name}(${u.employeeId}): ${err.message || '未知错误'}`);
        }
      }

      let resultMsg = `成功创建 ${successCount} 个账号`;
      if (failList.length > 0) {
        resultMsg += `\n失败 ${failList.length} 个：\n${failList.slice(0, 5).join('\n')}`;
        if (failList.length > 5) resultMsg += `\n... 共 ${failList.length} 个失败`;
      }
      ElMessage.success(resultMsg);
      loadUsers();
    } catch (err) {
      if (err !== 'cancel') ElMessage.error('导入失败：' + (err.message || err));
    }
  };
  reader.readAsArrayBuffer(file.raw);
};

// 下载 Excel 模板（新8角色）
const downloadTemplate = () => {
  const templateData = [
    {
      '姓名': '张三',
      '工号': 'CTI001',
      '角色': '业务（可选：业务/业务助理/技术支持/主管/检测组长/检测工程师/客服/客服组长/管理员）',
      '部门': '理化检测组',
      '地区': '青岛',
      '电话': '13800138000',
      '邮箱': 'zhangsan@cti-cert.com'
    }
  ];
  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '用户注册模板');
  XLSX.writeFile(wb, '用户注册模板.xlsx');
};

const loadUsers = async () => {
  try {
    const response = await userAPI.getAll();
    users.value = response.data;
  } catch (error) {
    console.error(error);
  }
};

const loadCommunications = async () => {
  try {
    const { data, error } = await supabase
      .from('communications')
      .select(`
        *,
        sender:sender_id(name, employee_id),
        communication_recipients(recipient_id, profiles(name)),
        replies(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    communications.value = (data || []).map(c => ({
      id: c.id,
      type: c.type,
      content: c.content,
      customerName: c.customer_name,
      sampleCode: c.sample_code,
      senderName: c.sender?.name || '-',
      senderEmployeeId: c.sender?.employee_id || '-',
      recipientNames: (c.communication_recipients || []).map(r => r.profiles?.name || '-').join(', '),
      replyCount: c.replies?.[0]?.count || 0,
      status: c.status,
      createdAt: c.created_at
    }));
  } catch (error) {
    console.error('加载沟通记录失败:', error);
  }
};

const loadNotifications = async () => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    allNotifications.value = data || [];
  } catch (error) {
    console.error('加载通知失败:', error);
  }
};

// 点赞详情弹窗
const reactionDetailVisible = ref(false);
const reactionDetailList = ref([]);
const reactionDetailTitle = ref('');

const viewAnnouncementReactions = async (announcementId) => {
  try {
    const { data } = await reactionAPI.getDetail('announcement', announcementId);
    reactionDetailList.value = data || [];
    reactionDetailTitle.value = '公告点赞/点踩详情';
    reactionDetailVisible.value = true;
  } catch (error) {
    ElMessage.error('加载点赞详情失败');
  }
};

const viewReplyReactions = async (replyId) => {
  try {
    const { data } = await reactionAPI.getDetail('reply', replyId);
    reactionDetailList.value = data || [];
    reactionDetailTitle.value = '回复点赞/点踩详情';
    reactionDetailVisible.value = true;
  } catch (error) {
    ElMessage.error('加载点赞详情失败');
  }
};

onMounted(() => {
  loadUsers();
  loadCommunications();
  loadNotifications();
});
</script>

<style scoped>
.admin-page {
  padding: 0;
}

.tab-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
}

.tab-header {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-box {
  margin-left: auto;
  display: flex;
  gap: 10px;
}

.search-box .el-input {
  width: 250px;
}

.record-count {
  color: #666;
  font-size: 14px;
}

.stats-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #999;
}
</style>
