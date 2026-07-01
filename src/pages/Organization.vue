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
      <div class="selected-title">已选人员与部门 ({{ totalSelected }})：</div>
      <div class="selected-persons-list">
        <!-- 部门名片 -->
        <div v-for="card in selectedDeptCardValues" :key="card.departmentLevel3" class="selected-deptcard-chip">
          <span class="deptcard-icon">🏢</span>
          <span class="selected-deptname">{{ card.departmentLevel3 }}</span>
          <span class="deptcard-count">({{ card.holders.length }}人)</span>
          <span class="remove-btn" @click="removeDeptCard(card.departmentLevel3)">×</span>
        </div>
        <!-- 个人 -->
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

    <!-- 搜索结果（大卡片，充分展示信息） -->
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
            <div class="person-dept">
              <template v-if="p.department_level1 === '业务'">
                {{ p.department_level3 || p.department_level2 || p.department_level1 || '-' }}
              </template>
              <template v-else>
                {{ [p.department_level2, p.department_level3].filter(Boolean).join(' · ') || p.department_level1 || '-' }}
              </template>
            </div>
            <div class="person-contact-detail">
              <span v-if="p.phone" class="contact-detail-item">📞 {{ p.phone }}</span>
              <span v-if="p.email" class="contact-detail-item">📧 {{ p.email }}</span>
              <span v-if="p.employee_id" class="contact-detail-item">🆔 {{ p.employee_id }}</span>
            </div>
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
            <span class="dept-title">业务</span>
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
                      <div class="person-dept">{{ p.department_level3 || p.department_level2 || '-' }}</div>
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
            <span class="dept-title">实验室</span>
            <span class="dept-count">{{ labUsersTotal }}人</span>
          </div>
        </div>
          <div class="dept-body">

            <!-- 实验室端按二级部门 → 三级部门两级分组 -->
            <div v-for="(l3groups, l2) in labLevel2Groups" :key="l2" class="level2-section">
              <div class="level2-header">
                <span class="level2-title">🏢 {{ l2 }}</span>
                <span class="level2-count">
                  {{ Object.values(l3groups).reduce((sum, g) => sum + g.length, 0) }}人
                </span>
              </div>
              <div class="level2-body">
                <div v-for="(group, l3) in l3groups" :key="l3" class="sub-section">
                  <div class="sub-header" @click="toggleSection('lab_' + l2 + '_' + l3)">
                    <span class="sub-title">🧪 {{ l3 }}</span>
                    <span class="sub-count">{{ group.length }}人</span>
                    <span class="sub-arrow">{{ expandedSections['lab_' + l2 + '_' + l3] ? '▲' : '▼' }}</span>
                  </div>
                  <div v-show="expandedSections['lab_' + l2 + '_' + l3]" class="sub-body">
                    <div class="person-grid">
                      <!-- 部门名片卡片（跟个人名片一样大） -->
                      <div
                        v-if="hasDeptCard(l3)"
                        class="person-card dept-card"
                        :class="{ 'dept-card-selected': isDeptCardSelected(l3) }"
                      >
                        <div class="select-btn" @click.stop="toggleDeptCard(l3)">
                          <span v-if="isDeptCardSelected(l3)" class="check-icon">✓</span>
                          <span v-else class="plus-icon">+</span>
                        </div>
                        <div class="person-avatar dept-card-avatar">🏢</div>
                        <div class="person-info">
                          <div class="person-name">
                            {{ l3 }}
                            <span class="role-tag tag-dept-card">部门名片</span>
                          </div>
                          <div class="person-dept">{{ getDeptCardSubtitle(l3) }}</div>
                        </div>
                      </div>
                      <!-- 个人名片（按检测组长→检测组长助理→检测工程师排序） -->
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
                          <div class="person-dept">{{ (p.department_level2 || '') + ' · ' + (p.department_level3 || '') || '-' }}</div>
                        </div>
                      </div>
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
            <span class="detail-value">
              <template v-if="selectedPerson.department_level1 === '业务'">
                {{ selectedPerson.department_level1 }} · {{ selectedPerson.department_level3 || selectedPerson.department_level2 || '-' }}
              </template>
              <template v-else>
                {{ selectedPerson.department_level1 }} · {{ selectedPerson.department_level2 || '' }}{{ selectedPerson.department_level3 ? ' · ' + selectedPerson.department_level3 : '' }}
              </template>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">邮箱</span>
            <span class="detail-value">
              <a v-if="selectedPerson.email" :href="'mailto:' + selectedPerson.email">{{ selectedPerson.email }}</a>
              <span v-else>-</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">电话</span>
            <span class="detail-value">
              <a v-if="selectedPerson.phone" :href="'tel:' + selectedPerson.phone">{{ selectedPerson.phone }}</a>
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
import { departmentCardAPI } from '../api'
import { buildSearchKeys, matchUser } from '../utils/pinyinSearch'

const router = useRouter()

const users = ref([])
const searchText = ref('')
const detailVisible = ref(false)
const selectedPerson = ref(null)

// 部门名片数据
const departmentCards = ref([])

// 多选状态（个人）
const selectedBizIds = ref([])
const selectedLabIds = ref([])
// 多选状态（部门名片，存 departmentLevel3 key）
const selectedDeptCardKeys = ref([])

// 总选择人数（含部门名片涉及的人数）
const totalSelected = computed(() => {
  const personCount = selectedBizIds.value.length + selectedLabIds.value.length
  const deptCardCount = selectedDeptCardValues.value.length
  return personCount + deptCardCount
})

// 选中部门名片展开的持有人ID（用于合并到总选择列表）
const selectedDeptCardHolderIds = computed(() => {
  const ids = []
  selectedDeptCardKeys.value.forEach(key => {
    const card = departmentCards.value.find(c => c.departmentLevel3 === key)
    if (card) {
      card.holders.forEach(h => {
        if (!ids.includes(h.id)) ids.push(h.id)
      })
    }
  })
  return ids
})

// 已选部门名片展示用数据
const selectedDeptCardValues = computed(() => {
  return selectedDeptCardKeys.value.map(key => {
    const card = departmentCards.value.find(c => c.departmentLevel3 === key)
    return card || { departmentLevel3: key, holders: [] }
  })
})

// 总已选（个人ID + 部门名片持有人ID，用于去重）
const allSelectedIds = computed(() => {
  const ids = [...selectedBizIds.value, ...selectedLabIds.value]
  selectedDeptCardHolderIds.value.forEach(id => {
    if (!ids.includes(id)) ids.push(id)
  })
  return ids
})

// 已选人员列表（展示用，不含部门名片）
const selectedPersons = computed(() => {
  const ids = [...selectedBizIds.value, ...selectedLabIds.value]
  return users.value.filter(u => ids.includes(u.id))
})

// 部门名片切换选择
const toggleDeptCard = (deptKey) => {
  const idx = selectedDeptCardKeys.value.indexOf(deptKey)
  if (idx > -1) {
    selectedDeptCardKeys.value.splice(idx, 1)
  } else {
    // 如果已选中了该部门的个人，不能同时选部门名片
    const card = departmentCards.value.find(c => c.departmentLevel3 === deptKey)
    if (card) {
      const conflict = card.holders.some(h => allSelectedIds.value.includes(h.id) 
        && !selectedDeptCardHolderIds.value.includes(h.id))
      if (conflict) {
        ElMessage.warning('已选择该部门的人员，不能同时选择部门名片')
        return
      }
    }
    selectedDeptCardKeys.value.push(deptKey)
  }
}

// 判断部门名片是否被选中
const isDeptCardSelected = (deptKey) => {
  return selectedDeptCardKeys.value.includes(deptKey)
}

// 判断某个ID是否被选中（含部门名片持有人）
const isIdSelected = (userId) => {
  return allSelectedIds.value.includes(userId)
}

const toggleSelect = (userId, side) => {
  // 如果该用户是某张已选部门名片的持有人，阻止操作
  if (selectedDeptCardHolderIds.value.includes(userId)) {
    ElMessage.warning('该人员已被部门名片覆盖，请取消部门名片后再操作')
    return
  }
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

// 判断人员是否被选中（含部门名片持有人）
const isSelected = (userId) => {
  return isIdSelected(userId)
}

// 从搜索结果中切换选择状态
const toggleSelectFromSearch = (person) => {
  const userId = person.id
  // 如果是部门名片持有人，引导用户使用部门名片
  if (selectedDeptCardHolderIds.value.includes(userId)) {
    ElMessage.warning('该人员已被部门名片覆盖')
    return
  }
  const role = person.role
  // 判断属于业务端还是实验室端（按一级部门划分）
  if (person.department_level1 === '业务') {
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

// 移除已选人员或部门名片
const removeSelected = (person) => {
  const userId = person.id
  const bizIdx = selectedBizIds.value.indexOf(userId)
  if (bizIdx > -1) {
    selectedBizIds.value.splice(bizIdx, 1)
    return
  }
  const labIdx = selectedLabIds.value.indexOf(userId)
  if (labIdx > -1) {
    selectedLabIds.value.splice(labIdx, 1)
    return
  }
}
// 移除部门名片
const removeDeptCard = (deptKey) => {
  const idx = selectedDeptCardKeys.value.indexOf(deptKey)
  if (idx > -1) {
    selectedDeptCardKeys.value.splice(idx, 1)
  }
}

// 快捷发起沟通
const startCommunication = () => {
  const allIds = [...selectedBizIds.value, ...selectedLabIds.value]
  const deptCardIds = selectedDeptCardHolderIds.value
  // 合并个人和部门名片持有人，去重
  const merged = [...allIds]
  deptCardIds.forEach(id => {
    if (!merged.includes(id)) merged.push(id)
  })
  
  if (merged.length === 0) {
    ElMessage.warning('请先选择要沟通的人员或部门名片')
    return
  }
  // 存储选中的用户ID和部门名片
  sessionStorage.setItem('preselectRecipients', JSON.stringify(merged))
  sessionStorage.setItem('preselectDeptCards', JSON.stringify(selectedDeptCardKeys.value))
  // 派发事件通知父组件Home.vue立即切换
  window.dispatchEvent(new CustomEvent('switch-to-initiate'))
  ElMessage.success(`已选择 ${merged.length} 人，正在跳转...`)
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
  '业务': '业务',
  business_assistant: '业务助理',
  '业务助理': '业务助理',
  supervisor: '实验室主管',
  '实验室主管': '实验室主管',
  supervisor_assistant: '实验室主管助理',
  '实验室主管助理': '实验室主管助理',
  customer_service: '客服',
  '客服': '客服',
  cs_leader: '客服组长',
  '客服组长': '客服组长',
  cs_leader_assistant: '客服组长助理',
  '客服组长助理': '客服组长助理',
  inspection_leader: '检测组长',
  '检测组长': '检测组长',
  inspection_leader_assistant: '检测组长助理',
  '检测组长助理': '检测组长助理',
  inspection_engineer: '检测工程师',
  '检测工程师': '检测工程师',
  sample_prep_leader: '制样组组长',
  '制样组组长': '制样组组长',
  report_leader: '报告组组长',
  '报告组组长': '报告组组长',
  report_leader_assistant: '报告组长助理',
  '报告组长助理': '报告组长助理',
  data_review: '数据二审',
  '数据二审': '数据二审',
  report_compiler: '报告编制',
  '报告编制': '报告编制',
  tech_support: '技术支持',
  '技术支持': '技术支持',
  lab: '实验室人员'
}

const getRoleName = (role) => ROLE_MAP[role] || role || '-'

// 角色标签颜色映射
const getRoleTagClass = (role) => {
  const map = {
    business: 'tag-gold', '业务': 'tag-gold',
    business_assistant: 'tag-light-gold', '业务助理': 'tag-light-gold',
    supervisor: 'tag-brown', '实验室主管': 'tag-brown',
    supervisor_assistant: 'tag-light-brown', '实验室主管助理': 'tag-light-brown',
    cs_leader: 'tag-blue', '客服组长': 'tag-blue',
    inspection_leader: 'tag-blue', '检测组长': 'tag-blue',
    sample_prep_leader: 'tag-blue', '制样组组长': 'tag-blue',
    report_leader: 'tag-blue', '报告组组长': 'tag-blue',
    cs_leader_assistant: 'tag-light-blue', '客服组长助理': 'tag-light-blue',
    inspection_leader_assistant: 'tag-light-blue', '检测组长助理': 'tag-light-blue',
    report_leader_assistant: 'tag-amber', '报告组长助理': 'tag-amber',
    inspection_engineer: 'tag-light-green', '检测工程师': 'tag-light-green',
    data_review: 'tag-light-green', '数据二审': 'tag-light-green',
    report_compiler: 'tag-light-green', '报告编制': 'tag-light-green',
    tech_support: 'tag-light-green', '技术支持': 'tag-light-green',
    customer_service: 'tag-purple', '客服': 'tag-purple',
    admin: 'tag-red'
  }
  return map[role] || 'tag-gray'
}

const getAvatarClass = (role) => {
  const map = {
    business: 'avatar-gold', '业务': 'avatar-gold',
    business_assistant: 'avatar-light-gold', '业务助理': 'avatar-light-gold',
    supervisor: 'avatar-brown', '实验室主管': 'avatar-brown',
    supervisor_assistant: 'avatar-light-brown', '实验室主管助理': 'avatar-light-brown',
    cs_leader: 'avatar-blue', '客服组长': 'avatar-blue',
    inspection_leader: 'avatar-blue', '检测组长': 'avatar-blue',
    sample_prep_leader: 'avatar-blue', '制样组组长': 'avatar-blue',
    report_leader: 'avatar-blue', '报告组组长': 'avatar-blue',
    cs_leader_assistant: 'avatar-light-blue', '客服组长助理': 'avatar-light-blue',
    inspection_leader_assistant: 'avatar-light-blue', '检测组长助理': 'avatar-light-blue',
    report_leader_assistant: 'avatar-amber', '报告组长助理': 'avatar-amber',
    inspection_engineer: 'avatar-light-green', '检测工程师': 'avatar-light-green',
    data_review: 'avatar-light-green', '数据二审': 'avatar-light-green',
    report_compiler: 'avatar-light-green', '报告编制': 'avatar-light-green',
    tech_support: 'avatar-light-green', '技术支持': 'avatar-light-green',
    customer_service: 'avatar-purple', '客服': 'avatar-purple',
    admin: 'avatar-red'
  }
  return map[role] || 'avatar-default'
}

// 按角色分组
const activeUsers = computed(() => users.value.filter(u => !u.is_disabled && u.name !== '已删除用户'))

// 预计算拼音搜索关键词
const usersWithKeys = computed(() => activeUsers.value.map(u => buildSearchKeys(u, ROLE_MAP)))

// 按一级部门划分用户（最准确的分类方式）
const isBizUser = (u) => u.department_level1 === '业务'
const isLabUser = (u) => u.department_level1 === '实验室'

// 业务端（按属地分组 - 使用三级部门字段）
const businessRegionGroups = computed(() => {
  const bizUsers = usersWithKeys.value.filter(u => isBizUser(u))
  const groups = {}
  bizUsers.forEach(u => {
    const region = u.department_level3 || u.department_level2 || u.department_level1 || '未分配属地'
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

const businessUsers = computed(() => usersWithKeys.value.filter(u => isBizUser(u)))

// 实验室端（按二级部门→三级部门两级分组，角色排序）
const labLevel2Groups = computed(() => {
  const labUsers = usersWithKeys.value.filter(u => isLabUser(u))
  const groups = {}
  labUsers.forEach(u => {
    const l2 = u.department_level2 || '未分配实验室'
    const l3 = u.department_level3 || '未分配检测组'
    if (!groups[l2]) groups[l2] = {}
    if (!groups[l2][l3]) groups[l2][l3] = []
    groups[l2][l3].push(u)
  })
  // 每个三级组内按角色排序：检测组长→检测组长助理→检测工程师
  for (const l2 of Object.keys(groups)) {
    for (const l3 of Object.keys(groups[l2])) {
      groups[l2][l3].sort((a, b) => {
        const roleOrder = { inspection_leader: 0, inspection_leader_assistant: 1, inspection_engineer: 2 }
        return (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99)
      })
      const key = 'lab_' + l2 + '_' + l3
      if (expandedSections[key] === undefined) {
        expandedSections[key] = true
      }
    }
  }
  return groups
})

const supervisors = computed(() => usersWithKeys.value.filter(u => u.role === 'supervisor'))

const inspectionGroups = computed(() => {
  const inspUsers = usersWithKeys.value.filter(u => u.role === 'inspection_leader' || u.role === 'inspection_engineer' || u.role === 'inspection_leader_assistant')
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

const csUsers = computed(() => usersWithKeys.value.filter(u => u.role === 'customer_service' || u.role === 'cs_leader' || u.role === 'cs_leader_assistant'))

const techSupports = computed(() => usersWithKeys.value.filter(u => u.role === 'tech_support'))

const labUsersTotal = computed(() => usersWithKeys.value.filter(u => isLabUser(u)).length)

// 搜索（使用拼音模糊搜索）
const filteredAll = computed(() => {
  if (!searchText.value) return []
  return usersWithKeys.value.filter(u => matchUser(searchText.value, u._searchKeys))
})

const showDetail = (person) => {
  selectedPerson.value = person
  detailVisible.value = true
}

// 判断某部门是否有部门名片
const hasDeptCard = (deptKey) => {
  return departmentCards.value.some(c => c.departmentLevel3 === deptKey)
}

// 部门名片显示名：二级部门·三级部门
const getDeptCardLabel = (deptKey) => {
  const card = departmentCards.value.find(c => c.departmentLevel3 === deptKey)
  if (!card) return deptKey
  return (card.departmentLevel2 || '') + '·' + deptKey
}

// 部门名片副标题：显示持有人数量
const getDeptCardSubtitle = (deptKey) => {
  const card = departmentCards.value.find(c => c.departmentLevel3 === deptKey)
  if (!card) return ''
  const names = card.holders.map(h => h.name).join('、')
  return `负责人：${names}`
}

const loadUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
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
  // 加载部门名片数据
  departmentCardAPI.getDepartmentCards().then(({ data }) => {
    departmentCards.value = data || []
  }).catch(err => {
    console.error('加载部门名片失败:', err)
  })
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

/* 部门名片选中标签 */
.selected-deptcard-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px 4px 4px;
  background: #f0fff0;
  border: 1px solid #67c23a;
  border-radius: 20px;
  font-size: 12px;
  transition: all 0.2s;
}

.selected-deptcard-chip:hover {
  background: #e0ffe0;
  box-shadow: 0 2px 6px rgba(103, 194, 58, 0.2);
}

.deptcard-icon {
  font-size: 14px;
}

.selected-deptname {
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.deptcard-count {
  font-size: 10px;
  color: #67c23a;
  white-space: nowrap;
}

/* 部门名片卡片 - 跟个人名片一模一样大 */
/* 二级部门分组 */
.level2-section {
  margin-bottom: 4px;
}

.level2-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fef0f0;
  border-radius: 8px;
  margin-bottom: 6px;
  border-left: 4px solid #f56c6c;
}

.level2-title {
  font-size: 16px;
  font-weight: 700;
  font-family: 'SimHei', 'Heiti SC', 'Microsoft YaHei', sans-serif;
  color: #303133;
}

.level2-count {
  font-size: 13px;
  font-weight: 600;
  font-family: 'SimHei', 'Heiti SC', 'Microsoft YaHei', sans-serif;
  color: #909399;
}

.level2-body {
  padding-left: 4px;
}

.person-card.dept-card {
  background: #ecf5ff;
  border-color: #b3d8ff;
  transition: all 0.2s;
}

.person-card.dept-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
  background: #d9ecff;
}

.person-card.dept-card.dept-card-selected {
  border-color: #409eff;
  background: #b3d8ff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.25);
}

.dept-card-avatar {
  background: linear-gradient(135deg, #409EFF, #79bbff) !important;
  color: #fff !important;
  font-size: 16px !important;
}

.tag-dept-card {
  background: #ecf5ff;
  color: #409eff;
  border: 1px solid #b3d8ff;
}

.search-bar {
  margin-bottom: 20px;
}

.search-results h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

/* 搜索结果网格 - 扩大2倍 */
.person-grid-search {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(460px, 1fr));
  gap: 14px;
}

.person-card-search {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid #eee;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  min-height: 90px;
}

.person-card-search:hover {
  border-color: #667eea;
  box-shadow: 0 3px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.person-card-search .person-avatar {
  width: 44px;
  height: 44px;
  font-size: 18px;
  flex-shrink: 0;
}

.person-card-search .person-info {
  flex: 1;
  min-width: 0;
}

.person-card-search .person-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.person-card-search .person-dept {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.person-card-search .person-contact-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.person-card-search .contact-detail-item {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
}

.person-card-search .role-tag {
  font-size: 10px;
  padding: 1px 6px;
}

.person-card-search.selected {
  border-color: #409eff;
  background: #f0f7ff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}
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

/* 非搜索模式下的名片 */
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

.select-btn {
  width: 22px;
  height: 22px;
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
  margin-top: -1px;
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
.avatar-amber {
  background: linear-gradient(135deg, #FF8F00, #FFB300);
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
.tag-amber {
  background: #FFF3E0;
  color: #E65100;
  border: 1px solid #FFB74D;
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
