<template>
  <div class="org-page">
    <div class="page-header">
      <div class="header-left">
        <h2>🏗️ 通讯录</h2>
        <p class="page-desc">查找人员联系方式，了解组织结构</p>
      </div>
      <el-button
        v-if="totalSelected > 0"
        type="primary"
        @click="startCommunication"
        class="header-comm-btn"
      >
        💬 快捷发起沟通 ({{ totalSelected }})
      </el-button>
    </div>

    <!-- 已选人员展示 -->
    <div v-if="totalSelected > 0" class="selected-persons-bar">
      <div class="selected-title">已选人员 ({{ totalSelected }})：</div>
      <div class="selected-persons-list">
        <div v-for="p in selectedPersons" :key="p.id" class="selected-person-card">
          <div class="selected-avatar" :class="getAvatarClass(p.role)">{{ (p.name || '?')[0] }}</div>
          <div class="selected-info">
            <span class="selected-name">{{ p.name }}</span>
            <span class="selected-role">{{ getRoleName(p.role) }}</span>
          </div>
          <span class="remove-btn" @click="removeSelected(p)">×</span>
        </div>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchText"
        placeholder="搜索姓名、工号、部门、电话..."
        clearable
        prefix-icon="Search"
        style="width: 360px;"
      />
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchText" class="search-results">
      <h3>搜索结果（{{ filteredAll.length }}人）</h3>
      <div class="person-grid-search">
        <div v-for="p in filteredAll" :key="p.id" class="person-card-search" :class="{ selected: isSelected(p.id) }">
          <div class="select-btn" @click.stop="toggleSelectFromSearch(p)">
            <span v-if="isSelected(p.id)" class="check-icon">✓</span>
            <span v-else class="plus-icon">+</span>
          </div>
          <div class="person-avatar" :class="getAvatarClass(p.role)" @click="showDetail(p)">{{ (p.name || '?')[0] }}</div>
          <div class="person-info">
            <div class="person-name">
              {{ p.name || '-' }}
              <span class="role-tag" :class="getRoleTagClass(p.role)">{{ getRoleName(p.role) }}</span>
            </div>
            <div class="person-dept">{{ p.department || '-' }} · {{ p.region || '-' }}</div>
          </div>
          <div class="person-contact">
            <div v-if="p.phone" class="contact-item">📞 {{ p.phone }}</div>
            <div v-if="p.email" class="contact-item">📧 {{ p.email }}</div>
          </div>
        </div>
      </div>
      <div v-if="filteredAll.length === 0" class="empty-tip">未找到匹配的人员</div>
    </div>

    <!-- 通讯录 - 左右固定两栏 -->
    <div v-else class="org-layout">
      <!-- 业务端 -->
      <div class="org-column">
        <div class="org-dept business-dept">
        <div class="dept-header">
          <div class="dept-header-left">
            <span class="dept-icon">💼</span>
            <span class="dept-title">业务端</span>
            <span class="dept-count">{{ businessUsers.length }}人</span>
          </div>
        </div>
          <div class="dept-body">
            <!-- 业务端按属地分组 -->
            <div v-for="(group, region) in businessRegionGroups" :key="region" class="sub-section">
              <div class="sub-header" @click="toggleSection('biz_' + region)">
                <span class="sub-title">📍 {{ region }}</span>
                <span class="sub-count">{{ group.length }}人</span>
                <span class="sub-arrow">{{ expandedSections['biz_' + region] ? '▲' : '▼' }}</span>
              </div>
              <div v-show="expandedSections['biz_' + region]" class="sub-body">
                <div class="person-grid">
                  <div
                    v-for="p in group"
                    :key="p.id"
                    class="person-card"
                    :class="{ selected: selectedBizIds.includes(p.id) }"
                  >
                    <div class="select-btn" @click.stop="toggleSelect(p.id, 'business')">
                      <span v-if="selectedBizIds.includes(p.id)" class="check-icon">✓</span>
                      <span v-else class="plus-icon">+</span>
                    </div>
                    <div class="person-avatar" :class="getAvatarClass(p.role)" @click="showDetail(p)">{{ (p.name || '?')[0] }}</div>
                    <div class="person-info" @click="showDetail(p)">
                      <div class="person-name">
                        {{ p.name || '-' }}
                        <span class="role-tag" :class="getRoleTagClass(p.role)">{{ getRoleName(p.role) }}</span>
                      </div>
                      <div class="person-dept">{{ p.region || '-' }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="businessUsers.length === 0" class="empty-tip">暂无业务端人员</div>
          </div>
        </div>
      </div>

      <!-- 实验室端 -->
      <div class="org-column">
        <div class="org-dept lab-dept">
        <div class="dept-header">
          <div class="dept-header-left">
            <span class="dept-icon">🔬</span>
            <span class="dept-title">实验室端</span>
            <span class="dept-count">{{ labUsersTotal }}人</span>
          </div>
        </div>
          <div class="dept-body">

            <!-- 实验室端按检测组分组 -->
            <div v-for="(group, dept) in labDeptGroups" :key="dept" class="sub-section">
              <div class="sub-header" @click="toggleSection('lab_' + dept)">
                <span class="sub-title">🧪 {{ dept }}</span>
                <span class="sub-count">{{ group.length }}人</span>
                <span class="sub-arrow">{{ expandedSections['lab_' + dept] ? '▲' : '▼' }}</span>
              </div>
              <div v-show="expandedSections['lab_' + dept]" class="sub-body">
                <div class="person-grid">
                  <div
                    v-for="p in group"
                    :key="p.id"
                    class="person-card"
                    :class="{ selected: selectedLabIds.includes(p.id) }"
                  >
                    <div class="select-btn" @click.stop="toggleSelect(p.id, 'lab')">
                      <span v-if="selectedLabIds.includes(p.id)" class="check-icon">✓</span>
                      <span v-else class="plus-icon">+</span>
                    </div>
                    <div class="person-avatar" :class="getAvatarClass(p.role)" @click="showDetail(p)">{{ (p.name || '?')[0] }}</div>
                    <div class="person-info" @click="showDetail(p)">
                      <div class="person-name">
                        {{ p.name || '-' }}
                        <span class="role-tag" :class="getRoleTagClass(p.role)">{{ getRoleName(p.role) }}</span>
                      </div>
                      <div class="person-dept">{{ p.department || '-' }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- 人员详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="selectedPerson?.name || '人员详情'" width="450px" destroy-on-close>
      <div v-if="selectedPerson" class="detail-card">
        <div class="detail-avatar" :class="getAvatarClass(selectedPerson.role)">{{ (selectedPerson.name || '?')[0] }}</div>
        <div class="detail-fields">
          <div class="detail-row">
            <span class="detail-label">姓名</span>
            <span class="detail-value">{{ selectedPerson.name || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">工号</span>
            <span class="detail-value">{{ selectedPerson.employee_id || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">角色</span>
            <span class="detail-value"><span class="role-tag" :class="getRoleTagClass(selectedPerson.role)">{{ getRoleName(selectedPerson.role) }}</span></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">部门</span>
            <span class="detail-value">{{ selectedPerson.department || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">地区</span>
            <span class="detail-value">{{ selectedPerson.region || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">电话</span>
            <span class="detail-value">
              <a v-if="selectedPerson.phone" :href="'tel:' + selectedPerson.phone">{{ selectedPerson.phone }}</a>
              <span v-else>-</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">邮箱</span>
            <span class="detail-value">
              <a v-if="selectedPerson.email" :href="'mailto:' + selectedPerson.email">{{ selectedPerson.email }}</a>
              <span v-else>-</span>
            </span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { supabase } from '../utils/supabase'

const router = useRouter()

const users = ref([])
const searchText = ref('')
const detailVisible = ref(false)
const selectedPerson = ref(null)

// 多选状态
const selectedBizIds = ref([])
const selectedLabIds = ref([])

// 总选择人数
const totalSelected = computed(() => selectedBizIds.value.length + selectedLabIds.value.length)

// 已选人员列表
const selectedPersons = computed(() => {
  const ids = [...selectedBizIds.value, ...selectedLabIds.value]
  return users.value.filter(u => ids.includes(u.id))
})

const toggleSelect = (userId, side) => {
  if (side === 'business') {
    const idx = selectedBizIds.value.indexOf(userId)
    if (idx > -1) {
      selectedBizIds.value.splice(idx, 1)
    } else {
      selectedBizIds.value.push(userId)
    }
  } else {
    const idx = selectedLabIds.value.indexOf(userId)
    if (idx > -1) {
      selectedLabIds.value.splice(idx, 1)
    } else {
      selectedLabIds.value.push(userId)
    }
  }
}

// 判断人员是否被选中
const isSelected = (userId) => {
  return selectedBizIds.value.includes(userId) || selectedLabIds.value.includes(userId)
}

// 从搜索结果中切换选择状态
const toggleSelectFromSearch = (person) => {
  const userId = person.id
  const role = person.role
  // 判断属于业务端还是实验室端
  if (BIZ_ROLE_VALUES.includes(role)) {
    const idx = selectedBizIds.value.indexOf(userId)
    if (idx > -1) {
      selectedBizIds.value.splice(idx, 1)
    } else {
      selectedBizIds.value.push(userId)
    }
  } else {
    // 实验室端
    const idx = selectedLabIds.value.indexOf(userId)
    if (idx > -1) {
      selectedLabIds.value.splice(idx, 1)
    } else {
      selectedLabIds.value.push(userId)
    }
  }
}

// 移除已选人员
const removeSelected = (person) => {
  const userId = person.id
  const bizIdx = selectedBizIds.value.indexOf(userId)
  if (bizIdx > -1) {
    selectedBizIds.value.splice(bizIdx, 1)
  }
  const labIdx = selectedLabIds.value.indexOf(userId)
  if (labIdx > -1) {
    selectedLabIds.value.splice(labIdx, 1)
  }
}

// 快捷发起沟通
const startCommunication = () => {
  const allIds = [...selectedBizIds.value, ...selectedLabIds.value]
  if (allIds.length === 0) {
    ElMessage.warning('请先选择要沟通的人员')
    return
  }
  // 存储选中的用户ID
  sessionStorage.setItem('preselectRecipients', JSON.stringify(allIds))
  // 派发事件通知父组件Home.vue立即切换
  window.dispatchEvent(new CustomEvent('switch-to-initiate'))
  ElMessage.success(`已选择 ${allIds.length} 人，正在跳转...`)
}

const expandedSections = reactive({
  supervisor: true,
  cs: true,
  tech: true
})

const toggleSection = (key) => {
  expandedSections[key] = !expandedSections[key]
}

// 角色名映射（使用 api/index.js 的 ROLE_OPTIONS 同步）
const ROLE_MAP = {
  admin: '管理员',
  business: '业务',
  business_assistant: '业务助理',
  supervisor: '实验室主管',
  supervisor_assistant: '实验室主管助理',
  customer_service: '客服',
  cs_leader: '客服组长',
  cs_leader_assistant: '客服组长助理',
  inspection_leader: '检测组长',
  inspection_leader_assistant: '检测组长助理',
  inspection_engineer: '检测工程师',
  sample_prep_leader: '制样组组长',
  report_leader: '报告组组长',
  data_review: '数据二审',
  report_compiler: '报告编制',
  tech_support: '技术支持',
  lab: '实验室人员'
}

const getRoleName = (role) => ROLE_MAP[role] || role || '-'

// 角色标签颜色映射
const getRoleTagClass = (role) => {
  const map = {
    business: 'tag-gold',
    business_assistant: 'tag-light-gold',
    supervisor: 'tag-brown',
    supervisor_assistant: 'tag-light-brown',
    cs_leader: 'tag-blue',
    inspection_leader: 'tag-blue',
    sample_prep_leader: 'tag-blue',
    report_leader: 'tag-blue',
    cs_leader_assistant: 'tag-light-blue',
    inspection_leader_assistant: 'tag-light-blue',
    inspection_engineer: 'tag-light-green',
    data_review: 'tag-light-green',
    report_compiler: 'tag-light-green',
    tech_support: 'tag-light-green',
    customer_service: 'tag-purple',
    admin: 'tag-red'
  }
  return map[role] || 'tag-gray'
}

const getAvatarClass = (role) => {
  const map = {
    business: 'avatar-gold',
    business_assistant: 'avatar-light-gold',
    supervisor: 'avatar-brown',
    supervisor_assistant: 'avatar-light-brown',
    cs_leader: 'avatar-blue',
    inspection_leader: 'avatar-blue',
    sample_prep_leader: 'avatar-blue',
    report_leader: 'avatar-blue',
    cs_leader_assistant: 'avatar-light-blue',
    inspection_leader_assistant: 'avatar-light-blue',
    inspection_engineer: 'avatar-light-green',
    data_review: 'avatar-light-green',
    report_compiler: 'avatar-light-green',
    tech_support: 'avatar-light-green',
    customer_service: 'avatar-purple',
    admin: 'avatar-red'
  }
  return map[role] || 'avatar-default'
}

// 按角色分组
const activeUsers = computed(() => users.value.filter(u => !u.is_disabled && u.name !== '已删除用户'))

// 业务端角色
const BIZ_ROLE_VALUES = ['business', 'business_assistant']
// 实验室端角色
const LAB_ROLE_VALUES = ['supervisor', 'supervisor_assistant', 'customer_service', 'cs_leader', 'cs_leader_assistant', 'inspection_leader', 'inspection_leader_assistant', 'inspection_engineer', 'sample_prep_leader', 'report_leader', 'data_review', 'report_compiler', 'tech_support']

// 业务端（按属地分组）
const businessRegionGroups = computed(() => {
  const bizUsers = activeUsers.value.filter(u => BIZ_ROLE_VALUES.includes(u.role))
  const groups = {}
  bizUsers.forEach(u => {
    const region = u.region || '未分配属地'
    if (!groups[region]) groups[region] = []
    groups[region].push(u)
  })
  for (const region in groups) {
    if (expandedSections['biz_' + region] === undefined) {
      expandedSections['biz_' + region] = true
    }
  }
  return groups
})

const businessUsers = computed(() => activeUsers.value.filter(u => BIZ_ROLE_VALUES.includes(u.role)))

// 实验室端（按检测组/部门分组）
const labDeptGroups = computed(() => {
  const labUsers = activeUsers.value.filter(u => LAB_ROLE_VALUES.includes(u.role))
  const groups = {}
  labUsers.forEach(u => {
    const dept = u.department || '未分配检测组'
    if (!groups[dept]) groups[dept] = []
    groups[dept].push(u)
  })
  for (const dept in groups) {
    if (expandedSections['lab_' + dept] === undefined) {
      expandedSections['lab_' + dept] = true
    }
  }
  return groups
})

const supervisors = computed(() => activeUsers.value.filter(u => u.role === 'supervisor'))

const inspectionGroups = computed(() => {
  const inspUsers = activeUsers.value.filter(u => u.role === 'inspection_leader' || u.role === 'inspection_engineer' || u.role === 'inspection_leader_assistant')
  const groups = {}
  inspUsers.forEach(u => {
    const dept = u.department || '未分组'
    if (!groups[dept]) groups[dept] = []
    groups[dept].push(u)
  })
  for (const dept in groups) {
    groups[dept].sort((a, b) => {
      const roleOrder = { inspection_leader: 0, inspection_leader_assistant: 1, inspection_engineer: 2 }
      return (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99)
    })
    if (expandedSections['insp_' + dept] === undefined) {
      expandedSections['insp_' + dept] = true
    }
  }
  return groups
})

const csUsers = computed(() => activeUsers.value.filter(u => u.role === 'customer_service' || u.role === 'cs_leader' || u.role === 'cs_leader_assistant'))

const techSupports = computed(() => activeUsers.value.filter(u => u.role === 'tech_support'))

const labUsersTotal = computed(() => activeUsers.value.filter(u => LAB_ROLE_VALUES.includes(u.role)).length)

// 搜索
const filteredAll = computed(() => {
  if (!searchText.value) return []
  const kw = searchText.value.toLowerCase()
  return activeUsers.value.filter(u =>
    (u.name && u.name.toLowerCase().includes(kw)) ||
    (u.employee_id && u.employee_id.toLowerCase().includes(kw)) ||
    (u.department && u.department.toLowerCase().includes(kw)) ||
    (u.phone && u.phone.includes(kw)) ||
    (u.email && u.email.toLowerCase().includes(kw)) ||
    (getRoleName(u.role).includes(kw))
  )
})

const showDetail = (person) => {
  selectedPerson.value = person
  detailVisible.value = true
}

const loadUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('role')
      .order('department')
      .order('name')

    if (error) throw error
    users.value = data || []
  } catch (error) {
    console.error('加载用户失败:', error)
    ElMessage.error('加载通讯录失败')
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.org-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
}

.header-left {
  flex: 1;
}

.header-left h2 {
  margin: 0 0 6px 0;
  font-size: 22px;
}

.page-desc {
  color: #888;
  font-size: 14px;
  margin: 0;
}

.header-comm-btn {
  flex-shrink: 0;
  height: 40px;
  font-size: 14px;
  font-weight: 600;
}

/* 已选人员展示栏 */
.selected-persons-bar {
  background: white;
  border: 1px solid #409eff;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.selected-title {
  font-size: 13px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 10px;
}

.selected-persons-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-person-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 4px;
  background: #f0f7ff;
  border: 1px solid #b3d8ff;
  border-radius: 20px;
  font-size: 12px;
  transition: all 0.2s;
}

.selected-person-card:hover {
  background: #e0efff;
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.2);
}

.selected-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.selected-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.selected-name {
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.selected-role {
  font-size: 10px;
  color: #909399;
  white-space: nowrap;
}

.remove-btn {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #f56c6c;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  line-height: 1;
}

.remove-btn:hover {
  background: #e44d4d;
  transform: scale(1.1);
}

.search-bar {
  margin-bottom: 20px;
}

.search-results h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

/* 左右固定两栏布局 */
.org-layout {
  display: flex;
  gap: 20px;
  height: calc(100vh - 200px);
  min-height: 500px;
}

.org-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 部门块 */
.org-dept {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  background: white;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.business-dept {
  border-top: 3px solid #409eff;
}

.lab-dept {
  border-top: 3px solid #67c23a;
}

.dept-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: #f8f9fa;
  gap: 8px;
  flex-shrink: 0;
}

.dept-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dept-icon {
  font-size: 20px;
}

.dept-title {
  font-size: 17px;
  font-weight: 700;
  color: #333;
}

.dept-count {
  font-size: 12px;
  color: #999;
}

.dept-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

/* 子区域 */
.sub-section {
  margin-bottom: 6px;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}

.sub-header {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: #fafafa;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
  position: sticky;
  top: 0;
  z-index: 1;
}

.sub-header:hover {
  background: #f0f2f5;
}

.sub-title {
  font-size: 14px;
  font-weight: 600;
  color: #444;
  flex: 1;
}

.sub-count {
  font-size: 12px;
  color: #999;
  margin-right: 8px;
}

.sub-arrow {
  font-size: 12px;
  color: #999;
}

.sub-body {
  padding: 10px 14px;
}

/* 人员网格 - 扩大150% */
.person-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.person-grid-search {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.person-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  height: 52px;
  overflow: hidden;
  background: white;
}

.person-card:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.12);
  transform: translateY(-1px);
}

.person-card.selected {
  border-color: #409eff;
  background: #f0f7ff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.person-card-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.person-card-search:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.12);
}

/* 选择按钮 */
.select-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  font-weight: 700;
}

.select-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.person-card.selected .select-btn {
  border-color: #409eff;
  background: #409eff;
  color: white;
}

.plus-icon {
  color: #999;
  font-size: 14px;
  line-height: 1;
}

.check-icon {
  color: white;
  font-size: 12px;
  line-height: 1;
}

/* 头像颜色 - 扩大 */
.person-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

/* 头像背景色 - 按角色 */
.avatar-gold {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #333;
}
.avatar-light-gold {
  background: linear-gradient(135deg, #FFF8DC, #F0E68C);
  color: #333;
}
.avatar-brown {
  background: linear-gradient(135deg, #8B4513, #A0522D);
  color: #fff;
}
.avatar-light-brown {
  background: linear-gradient(135deg, #D2B48C, #DEB887);
  color: #333;
}
.avatar-blue {
  background: linear-gradient(135deg, #409EFF, #66b1ff);
  color: #fff;
}
.avatar-light-blue {
  background: linear-gradient(135deg, #87CEEB, #ADD8E6);
  color: #333;
}
.avatar-light-green {
  background: linear-gradient(135deg, #90EE90, #98FB98);
  color: #333;
}
.avatar-purple {
  background: linear-gradient(135deg, #9370DB, #B19CD9);
  color: #fff;
}
.avatar-red {
  background: linear-gradient(135deg, #DC143C, #FF6B6B);
  color: #fff;
}
.avatar-default {
  background: linear-gradient(135deg, #909399, #C0C4CC);
  color: #fff;
}

.person-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.person-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.person-dept {
  font-size: 10px;
  color: #aaa;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.person-contact {
  flex-shrink: 0;
  text-align: right;
}

.contact-item {
  font-size: 11px;
  color: #888;
  white-space: nowrap;
}

/* 角色标签颜色 */
.role-tag {
  font-size: 9px;
  padding: 0px 5px;
  border-radius: 3px;
  white-space: nowrap;
  font-weight: 500;
  flex-shrink: 0;
}

.tag-gold {
  background: #FFF8DC;
  color: #B8860B;
  border: 1px solid #FFD700;
}
.tag-light-gold {
  background: #FFFAF0;
  color: #DAA520;
  border: 1px solid #F0E68C;
}
.tag-brown {
  background: #f5e6d0;
  color: #8b5e2b;
}
.tag-light-brown {
  background: #FAF0E6;
  color: #A0522D;
}
.tag-blue {
  background: #d9ecff;
  color: #3375b9;
}
.tag-light-blue {
  background: #E6F7FF;
  color: #1890FF;
}
.tag-light-green {
  background: #e1f3d8;
  color: #4a8c32;
}
.tag-purple {
  background: #f0e6ff;
  color: #722ed1;
}
.tag-red {
  background: #ffe6e6;
  color: #cf1322;
}
.tag-gray {
  background: #f5f5f5;
  color: #666;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 30px 0;
  font-size: 13px;
}

/* 详情弹窗 */
.detail-card {
  text-align: center;
}

.detail-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
}

.detail-fields {
  text-align: left;
}

.detail-row {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  width: 60px;
  font-weight: 500;
  color: #888;
  font-size: 13px;
  flex-shrink: 0;
}

.detail-value {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.detail-value a {
  color: #409eff;
  text-decoration: none;
}

.detail-value a:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .org-layout {
    flex-direction: column;
    height: auto;
  }
  .org-column {
    height: auto;
  }
  .org-dept {
    height: auto;
    max-height: 600px;
  }
}
</style>
