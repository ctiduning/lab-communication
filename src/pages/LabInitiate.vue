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
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <el-button size="small" type="default" @click="showTemplateSelector = !showTemplateSelector">
            从模板
          </el-button>
          <el-button size="small" type="primary" @click="showTemplateManager = true">
            管理模板
          </el-button>
          <template v-if="showTemplateSelector && myTemplates.length > 0">
            <el-select v-model="selectedTemplateId" placeholder="选择模板..." size="small" style="width:200px;" @change="applyTemplate" clearable>
              <el-option v-for="tpl in myTemplates" :key="tpl.id" :label="tpl.name" :value="tpl.id" />
            </el-select>
          </template>
        </div>
        <el-input type="textarea" v-model="form.content" placeholder="请输入沟通内容" :rows="3"></el-input>
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
      
      <!-- 直接显示消息接收人选择（去掉部门筛选） -->
      <el-form-item label="消息接收人" prop="recipients">
        <el-select
          v-model="form.recipients"
          multiple
          filterable
          reserve-keyword
          :filter-method="filterRecipient"
          placeholder="输入姓名/拼音/部门搜索..."
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
                <span style="color:#999;font-size:12px;">{{ u.departmentLevel3 || u.departmentLevel2 || u.departmentLevel1 || '-' }} · {{ u._roleName || '-' }}</span>
              </div>
            </el-option>
          </el-option-group>
        </el-select>
        <div style="color: #999; font-size: 12px; margin-top: 4px;">
          已选择 {{ form.recipients.length }} 人（支持拼音首字母/全拼/部门搜索）
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
      
      <!-- 按部门发起沟通（多选 + 模糊搜索） -->
      <el-form-item label="按部门发起沟通" v-if="departmentCards.length > 0">
        <el-select
          v-model="form.departmentCards"
          multiple
          filterable
          placeholder="搜索或选择检测部门（可多选）"
          style="width: 100%;"
          popper-class="dept-card-popper"
          @change="onDepartmentCardsChange"
          clearable
        >
          <el-option
            v-for="card in departmentCards"
            :key="card.departmentLevel3"
            :label="(card.departmentLevel2 || '') + ' · ' + (card.departmentLevel3 || '')"
            :value="card.departmentLevel3"
          >
            <div style="padding: 6px 0;">
              <div style="font-weight: 600; font-size: 14px; color: #303133;">
                {{ card.departmentLevel2 }} · {{ card.departmentLevel3 }}
              </div>
              <div style="font-size: 12px; color: #606266; margin-top: 4px; line-height: 1.6;">
                <span style="display: inline-flex; align-items: center; gap: 4px;">
                  🧑 检测组长：{{ card.leader?.name || '-' }}
                </span>
                <template v-if="card.assistants && card.assistants.length > 0">
                  <span v-for="(a, i) in card.assistants" :key="a.id" style="margin-left: 12px; display: inline-flex; align-items: center; gap: 4px;">
                    👤 检测组长助理{{ card.assistants.length > 1 ? (i + 1) : '' }}：{{ a.name }}
                  </span>
                </template>
              </div>
            </div>
          </el-option>
        </el-select>
        <div style="font-size: 12px; color: #909399; margin-top: 4px;">
          选择部门后，消息将发送给该部门的负责人（组长+组长助理），同组任意一人回复即为该组已处理
        </div>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="submitForm">发送</el-button>
        <el-button @click="saveDraft">保存草稿</el-button>
        <el-button @click="resetForm">重置</el-button>
        <el-button v-if="drafts.length > 0" type="info" @click="showDraftBox = !showDraftBox">
          草稿箱 ({{ drafts.length }})
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 草稿箱抽屉 -->
    <el-drawer v-model="showDraftBox" title="草稿箱" size="400px" direction="rtl">
      <div v-if="drafts.length === 0" style="text-align:center;color:#999;padding:40px;">
        暂无草稿
      </div>
      <div v-else class="draft-list">
        <div v-for="(d, idx) in drafts" :key="idx" class="draft-item">
          <div class="draft-header">
            <span class="draft-time">{{ formatDraftTime(d.savedAt) }}</span>
            <el-tag size="small" type="info">{{ d.type || '未选' }}</el-tag>
          </div>
          <div class="draft-preview">{{ d.content || '(空)' }}</div>
          <div class="draft-actions">
            <el-button size="small" type="primary" @click="loadDraft(idx)">继续编辑</el-button>
            <el-button size="small" type="danger" @click="deleteDraft(idx)">删除</el-button>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="showImagePreview" width="80%" :show-close="true" destroy-on-close>
      <img :src="previewImageUrl" style="width: 100%;" />
    </el-dialog>

    <!-- 模板管理弹窗 -->
    <el-dialog title="管理模板" v-model="showTemplateManager" width="600px" :close-on-click-modal="false">
      <div style="margin-bottom:12px;">
        <el-button type="primary" size="small" @click="openTemplateEditor(null)">新建模板</el-button>
      </div>
      <el-table :data="myTemplates" border stripe size="small" empty-text="暂无模板">
        <el-table-column prop="name" label="名称" min-width="120"></el-table-column>
        <el-table-column prop="title" label="标题" min-width="120" show-overflow-tooltip></el-table-column>
        <el-table-column label="内容预览" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            {{ scope.row.content || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="usage_count" label="使用次数" width="80" align="center"></el-table-column>
        <el-table-column label="操作" width="140" align="center">
          <template #default="scope">
            <el-button size="small" @click="openTemplateEditor(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteTemplate(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 新建/编辑模板弹窗 -->
    <el-dialog :title="editingTemplate ? '编辑模板' : '新建模板'" v-model="templateEditorVisible" width="500px" :close-on-click-modal="false">
      <el-form label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="templateForm.name" placeholder="模板名称" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="templateForm.title" placeholder="模板标题（可选）" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="templateForm.content" type="textarea" :rows="4" placeholder="模板内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateEditorVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate" :loading="templateSaving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { communicationAPI, storageAPI, departmentCardAPI, templateAPI, ROLE_OPTIONS, getRoleDisplayName } from '../api';
import { supabase } from '../utils/supabase';
import { buildSearchKeys, filterGroups } from '../utils/pinyinSearch';
import { getLevel2Options, getLevel3Options } from '../utils/departmentConfig';

const router = useRouter();

// 草稿箱
const showDraftBox = ref(false);
const drafts = ref([]);
const loadDraftsFromStorage = () => {
  try {
    const saved = localStorage.getItem('lab_initiate_draft');
    drafts.value = saved ? JSON.parse(saved) : [];
  } catch { drafts.value = []; }
};
const saveDraft = () => {
  const draftData = { ...form, savedAt: new Date().toISOString() };
  const current = [...drafts.value, draftData];
  localStorage.setItem('lab_initiate_draft', JSON.stringify(current));
  drafts.value = current;
  ElMessage.success('草稿已保存');
};
const loadDraft = (idx) => {
  const d = drafts.value[idx];
  if (!d) return;
  Object.keys(form).forEach(key => { if (key in d) form[key] = d[key]; });
  showDraftBox.value = false;
  ElMessage.success('已加载草稿');
};
const deleteDraft = (idx) => {
  drafts.value.splice(idx, 1);
  localStorage.setItem('lab_initiate_draft', JSON.stringify(drafts.value));
};
const formatDraftTime = (t) => t ? new Date(t).toLocaleString('zh-CN') : '';

// 模板相关
const showTemplateSelector = ref(false);
const selectedTemplateId = ref(null);
const myTemplates = ref([]);
const showTemplateManager = ref(false)
const templateEditorVisible = ref(false)
const editingTemplate = ref(null)
const templateSaving = ref(false)
const templateForm = reactive({
  name: '',
  title: '',
  content: ''
})

const loadMyTemplates = async () => {
  try {
    const { data } = await templateAPI.getMyTemplates()
    myTemplates.value = data || []
  } catch (e) {
    console.warn('加载模板失败:', e)
  }
}

const applyTemplate = (id) => {
  if (!id) return
  const tpl = myTemplates.value.find(t => t.id === id)
  if (!tpl) return
  if (tpl.title) form.content = tpl.title + '\n' + tpl.content
  else form.content = tpl.content
  form.templateId = id
}

const openTemplateEditor = (tpl) => {
  if (tpl) {
    editingTemplate.value = tpl
    templateForm.name = tpl.name || ''
    templateForm.title = tpl.title || ''
    templateForm.content = tpl.content || ''
  } else {
    editingTemplate.value = null
    templateForm.name = ''
    templateForm.title = ''
    templateForm.content = ''
  }
  templateEditorVisible.value = true
}

const saveTemplate = async () => {
  templateSaving.value = true
  try {
    if (editingTemplate.value) {
      await templateAPI.update(editingTemplate.value.id, {
        name: templateForm.name.trim(),
        title: templateForm.title.trim(),
        content: templateForm.content.trim()
      })
      ElMessage.success('模板已更新')
    } else {
      await templateAPI.create({
        name: templateForm.name.trim(),
        title: templateForm.title.trim(),
        content: templateForm.content.trim()
      })
      ElMessage.success('模板已创建')
    }
    templateEditorVisible.value = false
    await loadMyTemplates()
  } catch (e) {
    ElMessage.error('保存失败：' + (e.message || '未知错误'))
  } finally {
    templateSaving.value = false
  }
}

const deleteTemplate = async (tpl) => {
  try {
    await ElMessageBox.confirm(`确定要删除模板「${tpl.name}」吗？删除后无法恢复。`, '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await templateAPI.remove(tpl.id)
    ElMessage.success('模板已删除')
    await loadMyTemplates()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败：' + (e.message || '未知错误'))
    }
  }
}

const form = reactive({
  type: '',
  sampleCode: '',
  content: '',
  recipients: [],
  departmentCards: [],
  attachments: [],
  templateId: null
});

// 部门名片数据
const departmentCards = ref([]);
// 当前部门名片映射：{ cardKey: [holderIds] }
let currentCardMap = {};

// 三级部门选择
const selectedLevel1 = ref('');
const selectedLevel2 = ref('');
const selectedLevel3 = ref('');
const userRole = ref(''); // 当前用户角色

// 部门选项（根据一级部门动态计算）
const level2Options = computed(() => {
  if (!selectedLevel1.value) return [];
  return getLevel2Options(selectedLevel1.value);
});

const level3Options = computed(() => {
  return getLevel3Options(selectedLevel1.value);
});

// 一级部门变化
const onLevel1Change = () => {
  selectedLevel2.value = '';
  selectedLevel3.value = '';
  filterByDepartment();
};

// 二级部门变化
const onLevel2Change = () => {
  selectedLevel3.value = '';
  filterByDepartment();
};

// 三级部门变化
const onLevel3Change = () => {
  filterByDepartment();
};

// 按部门过滤接收人列表
const filterByDepartment = () => {
  if (!selectedLevel1.value) {
    loadAllUsers();
    return;
  }
  const filtered = allUsers.value.filter(u => {
    if (selectedLevel3.value) {
      return u.departmentLevel3 === selectedLevel3.value;
    }
    if (selectedLevel2.value) {
      return u.departmentLevel2 === selectedLevel2.value;
    }
    if (selectedLevel1.value) {
      return u.departmentLevel1 === selectedLevel1.value;
    }
    return true;
  });
  buildRecipientGroups(filtered);
};

const buildRecipientGroups = (users) => {
  const groups = {};
  const roleNameMap = {};
  const roleOrder = [];
  ROLE_OPTIONS.filter(r => r.value !== 'admin').forEach(r => {
    roleNameMap[r.value] = r.label;
    roleOrder.push(r.value);
  });

  users.forEach(u => {
    const label = roleNameMap[u.role] || u.role;
    const userWithKeys = buildSearchKeys(u, roleNameMap);
    userWithKeys._roleName = label;
    if (!groups[label]) groups[label] = { label, users: [] };
    groups[label].users.push(userWithKeys);
  });

  recipientGroups.value = roleOrder
    .map(r => roleNameMap[r])
    .filter(label => groups[label])
    .map(label => groups[label]);
};

// 部门名片选择变化（多选）
const onDepartmentCardsChange = (newSelection) => {
  const prev = { ...currentCardMap }
  const current = {}

  newSelection.forEach(cardKey => {
    if (!prev[cardKey]) {
      const holders = departmentCardAPI.getHolderIds(cardKey, departmentCards.value)
      current[cardKey] = holders
      holders.forEach(id => {
        if (!form.recipients.includes(id)) {
          form.recipients.push(id)
        }
      })
    } else {
      current[cardKey] = prev[cardKey]
    }
  })

  Object.keys(prev).forEach(cardKey => {
    if (!newSelection.includes(cardKey)) {
      const holders = prev[cardKey]
      form.recipients = form.recipients.filter(id => !holders.includes(id))
    }
  })

  currentCardMap = current
}

const findCardKeyByHolderId = (uid) => {
  for (const [cardKey, holderIds] of Object.entries(currentCardMap)) {
    if (holderIds.includes(uid)) return cardKey
  }
  return null
}

const showImagePreview = ref(false);
const previewImageUrl = ref('');
const allUsers = ref([]);
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
    console.log('正在上传文件:', file.name, '大小:', file.size, '类型:', file.type);
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
    if (err.name === 'AbortError') return;
    console.error('File System API 上传失败:', err);
    ElMessage.error('选择文件失败: ' + (err.message || '未知错误'));
  }
};

const submitForm = async () => {
  if (!form.type || !form.content.trim()) {
    ElMessage.error('请选择沟通类型并填写沟通内容');
    return;
  }
  
  try {
    const payload = {
      ...form,
      senderRole: 'lab',
      attachments: form.attachments
    };
    if (form.departmentCards.length > 0) {
      const allCardIds = []
      form.departmentCards.forEach(cardKey => {
        const ids = departmentCardAPI.getHolderIds(cardKey, departmentCards.value)
        allCardIds.push(...ids)
      })
      payload.department_card_ids = allCardIds
    }
    await communicationAPI.create(payload);
    ElMessage.success('发送成功');
    if (form.templateId) {
      templateAPI.incrementUsage(form.templateId).catch(e => console.warn('更新模板使用次数失败:', e))
    }
    // 清除匹配的草稿
    const draftIdx = drafts.value.findIndex(d => d.content === form.content && d.sampleCode === form.sampleCode);
    if (draftIdx >= 0) deleteDraft(draftIdx);
    resetForm();
    router.push('/');
  } catch (error) {
    ElMessage.error('发送失败：' + (error.message || '未知错误'));
  }
};

const resetForm = () => {
  form.type = '';
  form.sampleCode = '';
  form.content = '';
  form.recipients = [];
  form.departmentCards = [];
  form.attachments = [];
  form.templateId = null;
  currentCardMap = {};
  selectedLevel1.value = '';
  selectedLevel2.value = '';
  selectedLevel3.value = '';
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
const getUserDept = (uid) => {
  const u = findUserById(uid);
  if (!u) return '-';
  return u.departmentLevel3 || u.departmentLevel2 || u.departmentLevel1 || '-';
};
const getUserRoleName = (uid) => findUserById(uid)?._roleName || '-';

const removeRecipient = (uid) => {
  form.recipients = form.recipients.filter(id => id !== uid);
  // 检查是否属于某张部门名片
  const cardKey = findCardKeyByHolderId(uid)
  if (cardKey && form.departmentCards.includes(cardKey)) {
    form.departmentCards = form.departmentCards.filter(k => k !== cardKey)
    delete currentCardMap[cardKey]
    ElMessage.info('已同步取消部门名片')
  }
};

// 加载所有用户（发起沟通时可选择任何人，除自己外）
const loadAllUsers = async () => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', authUser?.id || '')
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
const preselectDeptCards = inject('preselectDeptCards', ref([]));

onMounted(() => {
  loadDraftsFromStorage();
  loadMyTemplates();
  
  // 获取当前用户角色
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) {
      supabase.from('profiles').select('role, department_level1').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          userRole.value = data.role;
          // 自动识别一级部门（去掉一级部门下拉后，根据用户所属部门自动设置）
          selectedLevel1.value = data.department_level1 || (data.role?.startsWith('business') ? '业务' : '实验室');
        }
      });
    }
  });

  // 并行加载用户和部门名片数据
  Promise.all([
    loadAllUsers(),
    departmentCardAPI.getDepartmentCards().then(({ data }) => {
      departmentCards.value = data || [];
    }).catch(err => {
      console.error('加载部门名片失败:', err);
    })
  ]).then(() => {
    // 所有数据加载完成后，处理预选和撤回编辑恢复
    // 如果有预选中用户（从组织架构页面跳转过来），自动填充
    if (preselectRecipients.value && preselectRecipients.value.length > 0) {
      form.recipients = [...preselectRecipients.value];
      preselectRecipients.value = [];
    }
    // 如果有预选中的部门名片
    if (preselectDeptCards.value && preselectDeptCards.value.length > 0) {
      form.departmentCards = [...preselectDeptCards.value];
      preselectDeptCards.value = [];
      form.departmentCards.forEach(cardKey => {
        const holders = departmentCardAPI.getHolderIds(cardKey, departmentCards.value)
        holders.forEach(id => {
          if (!form.recipients.includes(id)) {
            form.recipients.push(id)
          }
        })
      })
    }
    if (form.recipients.length > 0) {
      ElMessage.success(`已自动选中 ${form.recipients.length} 位接收人`);
    }
    
    // 检查是否有已撤回消息需要编辑重发
    const recalledEditData = localStorage.getItem('recalledMessageEdit');
    if (recalledEditData) {
      try {
        const editData = JSON.parse(recalledEditData);
        form.type = editData.type || '';
        form.sampleCode = editData.sampleCode || '';
        form.content = editData.content || '';
        form.attachments = editData.attachments || [];
        form.recipients = editData.recipientIds || [];
        // 将 holder ID 转换为部门名片 key（departmentLevel3 名称）
        if (editData.departmentCardIds && editData.departmentCardIds.length > 0) {
          const cardKeys = departmentCardAPI.getCardKeysByHolderIds(editData.departmentCardIds, departmentCards.value);
          form.departmentCards = cardKeys;
          // 同步添加 holders 到接收人列表
          cardKeys.forEach(cardKey => {
            const holders = departmentCardAPI.getHolderIds(cardKey, departmentCards.value);
            holders.forEach(id => {
              if (!form.recipients.includes(id)) {
                form.recipients.push(id);
              }
            });
          });
          // 重建 currentCardMap
          cardKeys.forEach(cardKey => {
            currentCardMap[cardKey] = departmentCardAPI.getHolderIds(cardKey, departmentCards.value);
          });
        } else {
          form.departmentCards = editData.departmentCardIds || [];
        }
        ElMessage.info('已加载撤回消息的内容，请编辑后重新发送');
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

<!-- 部门名片下拉框全局样式 -->
<style>
.dept-card-popper {
  width: 480px !important;
}
.dept-card-popper .el-select-dropdown__item {
  height: auto !important;
  padding: 6px 16px !important;
}
.dept-card-popper .el-select-dropdown__item:hover {
  background: #ecf5ff;
}

/* 草稿箱样式 */
.draft-list { padding: 0 16px; }
.draft-item {
  border: 1px solid #ebeef5; border-radius: 6px; padding: 12px; margin-bottom: 10px; background: #fafafa;
}
.draft-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;
}
.draft-time { font-size: 12px; color: #909399; }
.draft-preview { font-size: 13px; color: #606266; margin-bottom: 8px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.draft-actions { display: flex; gap: 8px; }
</style>
