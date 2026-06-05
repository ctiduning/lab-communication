<template>
  <div class="org-page">
    <div class="page-header">
      <h2>🏗️ 组织架构</h2>
      <p class="page-desc">查找人员联系方式，了解实验室组织结构</p>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchText"
        placeholder="搜索姓名、工号、部门、电话..."
        clearable
        prefix-icon="Search"
        style="width: 300px;"
      />
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchText" class="search-results">
      <h3>搜索结果（{{ filteredAll.length }}人）</h3>
      <div class="person-grid">
        <div v-for="p in filteredAll" :key="p.id" class="person-card" @click="showDetail(p)">
          <div class="person-avatar">{{ (p.name || '?')[0] }}</div>
          <div class="person-info">
            <div class="person-name">{{ p.name || '-' }}</div>
            <div class="person-role">{{ getRoleName(p.role) }}</div>
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

    <!-- 组织架构树 -->
    <div v-else class="org-tree">
      <!-- 管理层 -->
      <div class="org-section" v-if="supervisors.length > 0">
        <div class="section-header" @click="toggleSection('supervisor')">
          <span class="section-icon">📋</span>
          <span class="section-title">主管</span>
          <span class="section-count">{{ supervisors.length }}人</span>
          <span class="section-arrow">{{ expandedSections.supervisor ? '▲' : '▼' }}</span>
        </div>
        <div v-show="expandedSections.supervisor" class="section-body">
          <div class="person-grid">
            <div v-for="p in supervisors" :key="p.id" class="person-card highlight" @click="showDetail(p)">
              <div class="person-avatar supervisor-avatar">{{ (p.name || '?')[0] }}</div>
              <div class="person-info">
                <div class="person-name">{{ p.name || '-' }}</div>
                <div class="person-role">{{ getRoleName(p.role) }}</div>
                <div class="person-dept">{{ p.department || '-' }}</div>
              </div>
              <div class="person-contact">
                <div v-if="p.phone" class="contact-item">📞 {{ p.phone }}</div>
                <div v-if="p.email" class="contact-item">📧 {{ p.email }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 检测组（按部门分组） -->
      <div v-for="(group, dept) in inspectionGroups" :key="dept" class="org-section">
        <div class="section-header" @click="toggleSection('insp_' + dept)">
          <span class="section-icon">🔬</span>
          <span class="section-title">检测组 - {{ dept || '未分组' }}</span>
          <span class="section-count">{{ group.length }}人</span>
          <span class="section-arrow">{{ expandedSections['insp_' + dept] ? '▲' : '▼' }}</span>
        </div>
        <div v-show="expandedSections['insp_' + dept]" class="section-body">
          <div class="person-grid">
            <div v-for="p in group" :key="p.id" class="person-card" :class="{ 'leader-card': p.role === 'inspection_leader' }" @click="showDetail(p)">
              <div class="person-avatar" :class="{ 'leader-avatar': p.role === 'inspection_leader' }">{{ (p.name || '?')[0] }}</div>
              <div class="person-info">
                <div class="person-name">
                  {{ p.name || '-' }}
                  <el-tag v-if="p.role === 'inspection_leader'" type="warning" size="small" style="margin-left:4px;">组长</el-tag>
                </div>
                <div class="person-role">{{ getRoleName(p.role) }}</div>
                <div class="person-dept">{{ p.department || '-' }}</div>
              </div>
              <div class="person-contact">
                <div v-if="p.phone" class="contact-item">📞 {{ p.phone }}</div>
                <div v-if="p.email" class="contact-item">📧 {{ p.email }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 技术支持 -->
      <div class="org-section" v-if="techSupports.length > 0">
        <div class="section-header" @click="toggleSection('tech')">
          <span class="section-icon">🛠️</span>
          <span class="section-title">技术支持</span>
          <span class="section-count">{{ techSupports.length }}人</span>
          <span class="section-arrow">{{ expandedSections.tech ? '▲' : '▼' }}</span>
        </div>
        <div v-show="expandedSections.tech" class="section-body">
          <div class="person-grid">
            <div v-for="p in techSupports" :key="p.id" class="person-card" @click="showDetail(p)">
              <div class="person-avatar">{{ (p.name || '?')[0] }}</div>
              <div class="person-info">
                <div class="person-name">{{ p.name || '-' }}</div>
                <div class="person-role">{{ getRoleName(p.role) }}</div>
                <div class="person-dept">{{ p.department || '-' }}</div>
              </div>
              <div class="person-contact">
                <div v-if="p.phone" class="contact-item">📞 {{ p.phone }}</div>
                <div v-if="p.email" class="contact-item">📧 {{ p.email }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 客服组 -->
      <div class="org-section" v-if="customerServices.length > 0">
        <div class="section-header" @click="toggleSection('cs')">
          <span class="section-icon">📞</span>
          <span class="section-title">客服组</span>
          <span class="section-count">{{ customerServices.length }}人</span>
          <span class="section-arrow">{{ expandedSections.cs ? '▲' : '▼' }}</span>
        </div>
        <div v-show="expandedSections.cs" class="section-body">
          <div class="person-grid">
            <div v-for="p in customerServices" :key="p.id" class="person-card" :class="{ 'leader-card': p.role === 'cs_leader' }" @click="showDetail(p)">
              <div class="person-avatar" :class="{ 'leader-avatar': p.role === 'cs_leader' }">{{ (p.name || '?')[0] }}</div>
              <div class="person-info">
                <div class="person-name">
                  {{ p.name || '-' }}
                  <el-tag v-if="p.role === 'cs_leader'" type="warning" size="small" style="margin-left:4px;">组长</el-tag>
                </div>
                <div class="person-role">{{ getRoleName(p.role) }}</div>
                <div class="person-dept">{{ p.department || '-' }}</div>
              </div>
              <div class="person-contact">
                <div v-if="p.phone" class="contact-item">📞 {{ p.phone }}</div>
                <div v-if="p.email" class="contact-item">📧 {{ p.email }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 业务组 -->
      <div class="org-section" v-if="businessUsers.length > 0">
        <div class="section-header" @click="toggleSection('biz')">
          <span class="section-icon">💼</span>
          <span class="section-title">业务组</span>
          <span class="section-count">{{ businessUsers.length }}人</span>
          <span class="section-arrow">{{ expandedSections.biz ? '▲' : '▼' }}</span>
        </div>
        <div v-show="expandedSections.biz" class="section-body">
          <div class="person-grid">
            <div v-for="p in businessUsers" :key="p.id" class="person-card" @click="showDetail(p)">
              <div class="person-avatar">{{ (p.name || '?')[0] }}</div>
              <div class="person-info">
                <div class="person-name">{{ p.name || '-' }}</div>
                <div class="person-role">{{ getRoleName(p.role) }}</div>
                <div class="person-dept">{{ p.department || '-' }} · {{ p.region || '-' }}</div>
              </div>
              <div class="person-contact">
                <div v-if="p.phone" class="contact-item">📞 {{ p.phone }}</div>
                <div v-if="p.email" class="contact-item">📧 {{ p.email }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 其他 -->
      <div class="org-section" v-if="otherUsers.length > 0">
        <div class="section-header" @click="toggleSection('other')">
          <span class="section-icon">👥</span>
          <span class="section-title">其他</span>
          <span class="section-count">{{ otherUsers.length }}人</span>
          <span class="section-arrow">{{ expandedSections.other ? '▲' : '▼' }}</span>
        </div>
        <div v-show="expandedSections.other" class="section-body">
          <div class="person-grid">
            <div v-for="p in otherUsers" :key="p.id" class="person-card" @click="showDetail(p)">
              <div class="person-avatar">{{ (p.name || '?')[0] }}</div>
              <div class="person-info">
                <div class="person-name">{{ p.name || '-' }}</div>
                <div class="person-role">{{ getRoleName(p.role) }}</div>
                <div class="person-dept">{{ p.department || '-' }}</div>
              </div>
              <div class="person-contact">
                <div v-if="p.phone" class="contact-item">📞 {{ p.phone }}</div>
                <div v-if="p.email" class="contact-item">📧 {{ p.email }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 人员详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="selectedPerson?.name || '人员详情'" width="450px" destroy-on-close>
      <div v-if="selectedPerson" class="detail-card">
        <div class="detail-avatar">{{ (selectedPerson.name || '?')[0] }}</div>
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
            <span class="detail-value"><el-tag size="small">{{ getRoleName(selectedPerson.role) }}</el-tag></span>
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
import { ElMessage } from 'element-plus'
import { supabase } from '../utils/supabase'

const users = ref([])
const searchText = ref('')
const detailVisible = ref(false)
const selectedPerson = ref(null)

// 展开状态
const expandedSections = reactive({
  supervisor: true,
  tech: true,
  cs: true,
  biz: true,
  other: true
})

const toggleSection = (key) => {
  expandedSections[key] = !expandedSections[key]
}

// 角色名映射
const ROLE_MAP = {
  admin: '管理员',
  supervisor: '主管',
  inspection_leader: '检测组长',
  inspection_engineer: '检测工程师',
  tech_support: '技术支持',
  customer_service: '客服',
  cs_leader: '客服组长',
  business: '业务',
  business_assistant: '业务助理',
  lab: '实验室人员'
}

const getRoleName = (role) => ROLE_MAP[role] || role || '-'

// 按角色分组
const activeUsers = computed(() => users.value.filter(u => !u.is_disabled && u.name !== '已删除用户'))

const supervisors = computed(() => activeUsers.value.filter(u => u.role === 'supervisor'))

const inspectionGroups = computed(() => {
  const inspUsers = activeUsers.value.filter(u => u.role === 'inspection_leader' || u.role === 'inspection_engineer')
  // 组长排前面
  const groups = {}
  inspUsers.forEach(u => {
    const dept = u.department || '未分组'
    if (!groups[dept]) groups[dept] = []
    groups[dept].push(u)
  })
  // 每个组内组长排前面
  for (const dept in groups) {
    groups[dept].sort((a, b) => {
      if (a.role === 'inspection_leader' && b.role !== 'inspection_leader') return -1
      if (a.role !== 'inspection_leader' && b.role === 'inspection_leader') return 1
      return 0
    })
    // 展开该组
    if (expandedSections['insp_' + dept] === undefined) {
      expandedSections['insp_' + dept] = true
    }
  }
  return groups
})

const techSupports = computed(() => activeUsers.value.filter(u => u.role === 'tech_support'))

const customerServices = computed(() => activeUsers.value.filter(u => u.role === 'customer_service' || u.role === 'cs_leader'))

const businessUsers = computed(() => activeUsers.value.filter(u => u.role === 'business' || u.role === 'business_assistant'))

const otherUsers = computed(() => {
  const knownRoles = ['admin', 'supervisor', 'inspection_leader', 'inspection_engineer', 'tech_support', 'customer_service', 'cs_leader', 'business', 'business_assistant']
  return activeUsers.value.filter(u => !knownRoles.includes(u.role))
})

// 搜索过滤
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

// 显示详情
const showDetail = (person) => {
  selectedPerson.value = person
  detailVisible.value = true
}

// 加载用户列表
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
    ElMessage.error('加载组织架构失败')
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.org-page {
  padding: 20px;
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 6px 0;
  font-size: 22px;
}

.page-desc {
  color: #888;
  font-size: 14px;
  margin: 0;
}

.search-bar {
  margin-bottom: 20px;
}

.search-results h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

/* 组织架构区段 */
.org-section {
  margin-bottom: 8px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.section-header:hover {
  background: #eef0f3;
}

.section-icon {
  font-size: 18px;
  margin-right: 8px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.section-count {
  font-size: 12px;
  color: #999;
  margin-right: 8px;
}

.section-arrow {
  font-size: 12px;
  color: #999;
}

.section-body {
  padding: 12px 16px;
}

/* 人员网格 */
.person-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.person-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.person-card:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
  transform: translateY(-1px);
}

.person-card.highlight {
  border-color: #e6a23c;
  background: #fffcf5;
}

.person-card.leader-card {
  border-left: 3px solid #e6a23c;
}

.person-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.person-avatar.supervisor-avatar {
  background: linear-gradient(135deg, #e6a23c, #f56c6c);
}

.person-avatar.leader-avatar {
  background: linear-gradient(135deg, #e6a23c, #f5c86c);
}

.person-info {
  flex: 1;
  min-width: 0;
}

.person-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
}

.person-role {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}

.person-dept {
  font-size: 11px;
  color: #aaa;
  margin-top: 2px;
}

.person-contact {
  flex-shrink: 0;
  text-align: right;
}

.contact-item {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

/* 详情弹窗 */
.detail-card {
  text-align: center;
}

.detail-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
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
</style>
