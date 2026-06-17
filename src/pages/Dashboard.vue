<template>
  <div class="dashboard-page">
    <div class="page-header">
      <h2>数据看板</h2>
      <p>沟通数据统计与分析</p>
    </div>

    <!-- 日期筛选 -->
    <div class="date-filter">
      <span class="filter-label">统计周期</span>
      <input type="date" v-model="startDate" class="date-input" />
      <span class="date-sep">~</span>
      <input type="date" v-model="endDate" class="date-input" />
      <button class="query-btn" @click="loadData" :disabled="loading">{{ loading ? '查询中...' : '查询' }}</button>
      <span v-if="lastUpdated" class="update-time">最后更新：{{ lastUpdated }}</span>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>

    <template v-if="!loading && dataLoaded">
      <!-- 概要指标 -->
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-label">沟通总数</div>
          <div class="metric-value">{{ overview.total }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">付费加急</div>
          <div class="metric-value metric-danger">{{ overview.paidUrgent }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">免费加急</div>
          <div class="metric-value metric-warning">{{ overview.freeUrgent }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">平均回复时长</div>
          <div class="metric-value">{{ overview.avgResponseTime }}</div>
        </div>
      </div>

      <!-- 排名区域 -->
      <div class="rankings-grid">
        <div class="rank-card">
          <div class="rank-title">回复最快 TOP10</div>
          <div v-if="rankings.fastest.length === 0" class="rank-empty">暂无数据</div>
          <div v-for="(item, i) in rankings.fastest" :key="i" class="rank-item">
            <span class="rank-num" :class="'rank-' + (i + 1)">{{ i + 1 }}</span>
            <span class="rank-name">{{ item.name }}</span>
            <span class="rank-value rank-fast">{{ item.value }}</span>
          </div>
        </div>
        <div class="rank-card">
          <div class="rank-title">回复最慢 TOP10</div>
          <div v-if="rankings.slowest.length === 0" class="rank-empty">暂无数据</div>
          <div v-for="(item, i) in rankings.slowest" :key="i" class="rank-item">
            <span class="rank-num" :class="'rank-' + (i + 1)">{{ i + 1 }}</span>
            <span class="rank-name">{{ item.name }}</span>
            <span class="rank-value rank-slow">{{ item.value }}</span>
          </div>
        </div>
        <div class="rank-card">
          <div class="rank-title">收到消息最多 TOP10</div>
          <div v-if="rankings.mostReceived.length === 0" class="rank-empty">暂无数据</div>
          <div v-for="(item, i) in rankings.mostReceived" :key="i" class="rank-item">
            <span class="rank-num" :class="'rank-' + (i + 1)">{{ i + 1 }}</span>
            <span class="rank-name">{{ item.name }}</span>
            <span class="rank-value">{{ item.value }}</span>
          </div>
        </div>
        <div class="rank-card">
          <div class="rank-title">回复消息最多 TOP10</div>
          <div v-if="rankings.mostReplies.length === 0" class="rank-empty">暂无数据</div>
          <div v-for="(item, i) in rankings.mostReplies" :key="i" class="rank-item">
            <span class="rank-num" :class="'rank-' + (i + 1)">{{ i + 1 }}</span>
            <span class="rank-name">{{ item.name }}</span>
            <span class="rank-value">{{ item.value }}</span>
          </div>
        </div>
      </div>

      <!-- 类型分布 + 加急统计 -->
      <div class="stats-grid">
        <div class="stats-card">
          <div class="stats-card-title">沟通类型分布</div>
          <div v-if="typeDistribution.length === 0" class="rank-empty">暂无数据</div>
          <div v-for="item in typeDistribution" :key="item.type" class="bar-item">
            <div class="bar-label">
              <span>{{ item.type }}</span>
              <span>{{ item.count }} <span class="bar-pct">{{ item.pct }}</span></span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: item.pct, background: item.color }"></div>
            </div>
          </div>
        </div>
        <div class="stats-card">
          <div class="stats-card-title">加急统计</div>
          <div class="urgent-summary">
            <div class="urgent-box">
              <div class="urgent-label urgent-paid">付费加急</div>
              <div class="urgent-num">{{ urgentStats.paidUrgent }}</div>
            </div>
            <div class="urgent-box">
              <div class="urgent-label urgent-free">免费加急</div>
              <div class="urgent-num">{{ urgentStats.freeUrgent }}</div>
            </div>
            <div class="urgent-box">
              <div class="urgent-label urgent-normal">普通</div>
              <div class="urgent-num">{{ urgentStats.normal }}</div>
            </div>
          </div>
          <div class="urgent-sub-title">发起加急 TOP5</div>
          <div class="tag-list">
            <span v-for="item in urgentStats.initiators" :key="item.id" class="tag-item tag-info">{{ item.name }} {{ item.count }}次</span>
            <span v-if="urgentStats.initiators.length === 0" class="no-data">暂无数据</span>
          </div>
          <div class="urgent-sub-title">同意加急 TOP5</div>
          <div class="tag-list">
            <span v-for="item in urgentStats.approvers" :key="item.id" class="tag-item tag-success">{{ item.name }} {{ item.count }}次</span>
            <span v-if="urgentStats.approvers.length === 0" class="no-data">暂无数据</span>
          </div>
        </div>
      </div>

      <!-- 7天趋势 -->
      <div class="trend-card">
        <div class="trend-header">
          <span class="trend-title">近7天沟通趋势</span>
          <span class="trend-legend">蓝色=普通 红色=加急</span>
        </div>
        <div class="trend-chart">
          <div v-for="(day, i) in trend" :key="i" class="trend-bar-col">
            <div class="trend-bars">
              <div class="trend-bar-urgent" :style="{ height: day.urgentPx + 'px' }"></div>
              <div class="trend-bar-normal" :style="{ height: day.normalPx + 'px' }"></div>
            </div>
            <div class="trend-label">{{ day.label }}</div>
          </div>
        </div>
      </div>
    </template>

    <div v-if="!loading && !dataLoaded" class="empty-state">请选择时间范围并点击查询</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { statisticsAPI } from '../api'

const startDate = ref('')
const endDate = ref('')
const loading = ref(false)
const dataLoaded = ref(false)
const lastUpdated = ref('')
const rawData = ref(null)

onMounted(() => {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  startDate.value = formatDateInput(thirtyDaysAgo)
  endDate.value = formatDateInput(today)
  loadData()
})

function formatDateInput(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTimeDisplay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 格式化时长
function formatDuration(minutes) {
  if (minutes < 60) return `${Math.round(minutes)}min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h${m}min`
}

// 构建用户ID到名字的映射
function buildUserMap(profiles) {
  const map = {}
  profiles.forEach(p => { map[p.id] = p.name })
  return map
}

// ====== 计算属性 ======

const overview = computed(() => {
  if (!rawData.value) return { total: 0, paidUrgent: 0, freeUrgent: 0, avgResponseTime: '-' }
  const { communications, replies } = rawData.value
  const total = communications.length
  const paidUrgent = communications.filter(c => c.vip === '付费加急').length
  const freeUrgent = communications.filter(c => c.vip === '免费加急').length

  // 平均回复时长：每个沟通的第一条回复时间 - 发送时间
  const replyTimes = []
  const commMap = {}
  communications.forEach(c => { commMap[c.id] = c })
  const firstReplies = {}
  replies.forEach(r => {
    if (!firstReplies[r.communication_id]) {
      firstReplies[r.communication_id] = r
    }
  })
  Object.entries(firstReplies).forEach(([commId, reply]) => {
    const comm = commMap[commId]
    if (comm) {
      const diff = new Date(reply.created_at) - new Date(comm.created_at)
      if (diff > 0) replyTimes.push(diff / 60000)
    }
  })
  const avg = replyTimes.length > 0
    ? replyTimes.reduce((a, b) => a + b, 0) / replyTimes.length
    : 0

  return {
    total,
    paidUrgent,
    freeUrgent,
    avgResponseTime: avg > 0 ? formatDuration(avg) : '-'
  }
})

const rankings = computed(() => {
  if (!rawData.value) return { fastest: [], slowest: [], mostReceived: [], mostReplies: [] }
  const { communications, replies, recipients, profiles } = rawData.value
  const userMap = buildUserMap(profiles)

  // 1. 回复最快/最慢：每人平均回复耗时
  const userReplyTimes = {}
  const commMap = {}
  communications.forEach(c => { commMap[c.id] = c })

  replies.forEach(r => {
    const comm = commMap[r.communication_id]
    if (!comm) return
    const diff = new Date(r.created_at) - new Date(comm.created_at)
    if (diff <= 0) return
    if (!userReplyTimes[r.sender_id]) userReplyTimes[r.sender_id] = []
    userReplyTimes[r.sender_id].push(diff / 60000)
  })

  const avgTimes = Object.entries(userReplyTimes).map(([id, times]) => ({
    id,
    name: userMap[id] || '未知',
    value: formatDuration(times.reduce((a, b) => a + b, 0) / times.length),
    raw: times.reduce((a, b) => a + b, 0) / times.length
  })).filter(i => i.name !== '未知').sort((a, b) => a.raw - b.raw)

  // 2. 收到消息最多
  const receiveCount = {}
  recipients.forEach(r => {
    if (!receiveCount[r.recipient_id]) receiveCount[r.recipient_id] = 0
    receiveCount[r.recipient_id]++
  })

  const mostReceived = Object.entries(receiveCount)
    .map(([id, count]) => ({ id, name: userMap[id] || '未知', value: count + '条' }))
    .filter(i => i.name !== '未知')
    .sort((a, b) => parseInt(b.value) - parseInt(a.value))
    .slice(0, 10)

  // 3. 回复消息最多
  const replyCount = {}
  replies.forEach(r => {
    if (!replyCount[r.sender_id]) replyCount[r.sender_id] = 0
    replyCount[r.sender_id]++
  })

  const mostReplies = Object.entries(replyCount)
    .map(([id, count]) => ({ id, name: userMap[id] || '未知', value: count + '次' }))
    .filter(i => i.name !== '未知')
    .sort((a, b) => parseInt(b.value) - parseInt(a.value))
    .slice(0, 10)

  return {
    fastest: avgTimes.slice(0, 10),
    slowest: [...avgTimes].reverse().slice(0, 10),
    mostReceived,
    mostReplies
  }
})

const typeDistribution = computed(() => {
  if (!rawData.value) return []
  const { communications } = rawData.value
  const typeCount = {}
  communications.forEach(c => {
    const type = c.type || '未分类'
    if (!typeCount[type]) typeCount[type] = 0
    typeCount[type]++
  })

  const total = communications.length
  const colors = ['#378ADD', '#D85A30', '#EF9F27', '#639922', '#7F77DD', '#D4537E', '#888780']
  let ci = 0

  return Object.entries(typeCount)
    .map(([type, count]) => ({
      type,
      count,
      pct: (count / total * 100).toFixed(0) + '%',
      color: colors[ci++ % colors.length]
    }))
    .sort((a, b) => b.count - a.count)
})

const urgentStats = computed(() => {
  if (!rawData.value) return { paidUrgent: 0, freeUrgent: 0, normal: 0, initiators: [], approvers: [] }
  const { communications, replies, profiles } = rawData.value
  const userMap = buildUserMap(profiles)

  const paidUrgent = communications.filter(c => c.vip === '付费加急').length
  const freeUrgent = communications.filter(c => c.vip === '免费加急').length
  const normal = communications.filter(c => !c.vip || c.vip === '').length

  // 发起加急TOP5：谁发起的加急沟通最多
  const initiatorCount = {}
  communications.filter(c => c.vip === '付费加急' || c.vip === '免费加急').forEach(c => {
    if (!initiatorCount[c.sender_id]) initiatorCount[c.sender_id] = 0
    initiatorCount[c.sender_id]++
  })

  const initiators = Object.entries(initiatorCount)
    .map(([id, count]) => ({ id, name: userMap[id] || '未知', count }))
    .filter(i => i.name !== '未知')
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 同意加急TOP5：加急沟通中回复"同意"的人
  const urgentCommIds = new Set(communications.filter(c => c.vip === '付费加急' || c.vip === '免费加急').map(c => c.id))
  const approverCount = {}
  replies.filter(r => urgentCommIds.has(r.communication_id) && r.content === '同意').forEach(r => {
    if (!approverCount[r.sender_id]) approverCount[r.sender_id] = 0
    approverCount[r.sender_id]++
  })

  const approvers = Object.entries(approverCount)
    .map(([id, count]) => ({ id, name: userMap[id] || '未知', count }))
    .filter(i => i.name !== '未知')
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return { paidUrgent, freeUrgent, normal, initiators, approvers }
})

const trend = computed(() => {
  if (!rawData.value) return []
  const { communications } = rawData.value

  // 生成最近7天日期
  const days = []
  const today = new Date()
  // 使用 endDate 作为基准日期
  const baseDate = endDate.value ? new Date(endDate.value + 'T23:59:59') : today

  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      dateStr,
      normal: 0,
      urgent: 0
    })
  }

  // 统计每天数据
  communications.forEach(c => {
    const day = c.created_at.substring(0, 10)
    const dayData = days.find(d => d.dateStr === day)
    if (dayData) {
      if (c.vip === '付费加急' || c.vip === '免费加急') {
        dayData.urgent++
      } else {
        dayData.normal++
      }
    }
  })

  // 计算柱状图高度
  const maxVal = Math.max(...days.map(d => d.normal + d.urgent), 1)
  const maxPx = 70

  return days.map(d => ({
    ...d,
    normalPx: Math.round((d.normal / maxVal) * maxPx),
    urgentPx: Math.round((d.urgent / maxVal) * maxPx)
  }))
})

// ====== 加载数据 ======
async function loadData() {
  if (!startDate.value || !endDate.value) return
  loading.value = true
  dataLoaded.value = false
  try {
    const result = await statisticsAPI.getDashboardData(
      startDate.value + 'T00:00:00',
      endDate.value + 'T23:59:59'
    )
    rawData.value = result
    dataLoaded.value = true
    lastUpdated.value = formatTimeDisplay(new Date().toISOString())
  } catch (e) {
    console.error('Dashboard data load error:', e)
    alert('数据加载失败：' + (e.message || '未知错误'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.dashboard-page {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header h2 {
  margin: 0 0 4px;
  font-size: 20px;
}

.page-header p {
  margin: 0 0 20px;
  color: #888;
  font-size: 13px;
}

/* 日期筛选 */
.date-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: white;
  border-radius: 10px;
  border: 1px solid #eee;
}

.filter-label {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
}

.date-input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

.date-input:focus {
  border-color: #667eea;
}

.date-sep {
  color: #999;
}

.query-btn {
  padding: 6px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.query-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.update-time {
  font-size: 11px;
  color: #999;
  margin-left: auto;
}

/* 加载中 */
.loading-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 14px;
}

/* 指标卡 */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.metric-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
}

.metric-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
}

.metric-value {
  font-size: 26px;
  font-weight: 600;
  color: #333;
}

.metric-danger { color: #e74c3c; }
.metric-warning { color: #e67e22; }

/* 排名区域 */
.rankings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.rank-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 14px;
}

.rank-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #333;
}

.rank-empty {
  color: #bbb;
  font-size: 12px;
  text-align: center;
  padding: 16px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
  border-bottom: 1px solid #f5f5f5;
}

.rank-item:last-child {
  border-bottom: none;
}

.rank-num {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  background: #f0f0f0;
  color: #888;
  flex-shrink: 0;
}

.rank-1 { background: #27ae60; color: white; }
.rank-2 { background: #1abc9c; color: white; }
.rank-3 { background: #f0f0f0; color: #666; }

.rank-name {
  flex: 1;
  color: #333;
}

.rank-value {
  color: #888;
  font-size: 11px;
}

.rank-fast { color: #27ae60; font-weight: 600; }
.rank-slow { color: #e74c3c; font-weight: 600; }

/* 统计区域 */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.stats-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 16px;
}

.stats-card-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

.bar-item {
  margin-bottom: 10px;
}

.bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 3px;
  color: #555;
}

.bar-pct {
  color: #999;
}

.bar-track {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.urgent-summary {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.urgent-box {
  flex: 1;
  text-align: center;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
}

.urgent-label {
  font-size: 11px;
  margin-bottom: 4px;
}

.urgent-paid { color: #e74c3c; }
.urgent-free { color: #e67e22; }
.urgent-normal { color: #888; }

.urgent-num {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.urgent-sub-title {
  font-size: 12px;
  font-weight: 600;
  color: #555;
  margin: 10px 0 6px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 12px;
}

.tag-info {
  background: #e8f4fd;
  color: #378ADD;
}

.tag-success {
  background: #e8f8e8;
  color: #27ae60;
}

.no-data {
  color: #bbb;
  font-size: 11px;
}

/* 趋势图 */
.trend-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 16px;
}

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.trend-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.trend-legend {
  font-size: 11px;
  color: #999;
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 100px;
}

.trend-bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}

.trend-bars {
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
}

.trend-bar-urgent {
  width: 70%;
  background: #e74c3c;
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height 0.3s;
}

.trend-bar-normal {
  width: 70%;
  background: #378ADD;
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height 0.3s;
}

.trend-label {
  font-size: 10px;
  color: #999;
  margin-top: 4px;
}
</style>
