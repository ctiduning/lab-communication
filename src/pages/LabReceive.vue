<template>
  <div class="lab-receive">
    <h2 class="page-title">接收消息</h2>

    <el-tabs v-model="activeTab" class="message-tabs">
      <!-- 待处理标签页 -->
      <el-tab-pane label="待处理" name="pending">
        <div class="table-toolbar">
          <div class="toolbar-left">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索全部内容（含回复）..."
              clearable
              style="width: 300px;"
              :prefix-icon="Search"
            />
            <el-checkbox v-model="showFlaggedOnly" style="margin-left: 12px;">
              仅红旗
            </el-checkbox>
          </div>
        </div>

        <el-table :data="pendingMessages" border stripe v-loading="loading" :row-class-name="tableRowClassName">
          <!-- 状态列 - 移到最前面 -->
          <el-table-column label="状态" width="90" align="center" fixed="left">
            <template #default="scope">
              <el-tag v-if="scope.row.isCompleted" size="small" type="info">已完结</el-tag>
              <el-tag v-else-if="scope.row.hasReplied" size="small" type="success">已处理</el-tag>
              <el-tag v-else size="small" type="warning">待处理</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="" width="40" align="center">
            <template #default="scope">
              <span v-if="scope.row.hasFlagged" style="color: #f56c6c; font-size: 16px;">🚩</span>
            </template>
          </el-table-column>

          <el-table-column label="沟通类型" width="110">
            <template #default="scope">
              <el-tag size="small" :type="getTypeTag(scope.row.type)">
                {{ getTypeName(scope.row.type) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="发送人">
            <template #default="scope">
              {{ getSenderName(scope.row.senderId) }}
            </template>
          </el-table-column>

          <el-table-column label="是否已读" width="90" align="center">
            <template #default="scope">
              <el-icon v-if="scope.row.myRead" color="#67c23a"><CircleCheck /></el-icon>
              <el-icon v-else color="#f56c6c"><CircleClose /></el-icon>
            </template>
          </el-table-column>

          <el-table-column label="发送时间" width="160">
            <template #default="scope">
              {{ formatTime(scope.row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="240" align="center">
            <template #default="scope">
              <el-button size="small" @click="viewDetail(scope.row)">查看</el-button>
              <el-button 
                size="small" 
                type="primary"
                @click="replyFromTable(scope.row)"
              >
                回复
              </el-button>
              <el-button 
                size="small" 
                :type="scope.row.hasFlagged ? 'warning' : 'default'"
                @click="toggleFlag(scope.row)"
              >
                {{ scope.row.hasFlagged ? '取消红旗' : '红旗' }}
              </el-button>
              <el-button 
                v-if="!scope.row.isCompleted"
                size="small" 
                type="success"
                @click="toggleCompleted(scope.row, true)"
              >
                完结
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="pendingMessages.length === 0 && !loading" class="empty-state">
          暂无待处理消息
        </div>
      </el-tab-pane>

      <!-- 已处理标签页 -->
      <el-tab-pane label="已处理" name="processed">
        <div class="table-toolbar">
          <div class="toolbar-left">
            <el-input
              v-model="searchKeywordProcessed"
              placeholder="搜索全部内容（含回复）..."
              clearable
              style="width: 300px;"
              :prefix-icon="Search"
            />
          </div>
        </div>

        <el-table :data="processedMessages" border stripe v-loading="loading">
          <!-- 状态列 - 移到最前面 -->
          <el-table-column label="状态" width="90" align="center" fixed="left">
            <template #default="scope">
              <el-tag v-if="scope.row.isCompleted" size="small" type="info">已完结</el-tag>
              <el-tag v-else-if="scope.row.hasReplied" size="small" type="success">已处理</el-tag>
              <el-tag v-else size="small" type="warning">待处理</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="" width="40" align="center">
            <template #default="scope">
              <span v-if="scope.row.hasFlagged" style="color: #f56c6c; font-size: 16px;">🚩</span>
            </template>
          </el-table-column>

          <el-table-column label="沟通类型" width="110">
            <template #default="scope">
              <el-tag size="small" :type="getTypeTag(scope.row.type)">
                {{ getTypeName(scope.row.type) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="发送人">
            <template #default="scope">
              {{ getSenderName(scope.row.senderId) }}
            </template>
          </el-table-column>

          <el-table-column label="是否已读" width="90" align="center">
            <template #default="scope">
              <el-icon v-if="scope.row.myRead" color="#67c23a"><CircleCheck /></el-icon>
              <el-icon v-else color="#f56c6c"><CircleClose /></el-icon>
            </template>
          </el-table-column>

          <el-table-column label="发送时间" width="160">
            <template #default="scope">
              {{ formatTime(scope.row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="240" align="center">
            <template #default="scope">
              <el-button size="small" @click="viewDetail(scope.row)">查看</el-button>
              <el-button 
                size="small" 
                type="primary"
                @click="replyFromTable(scope.row)"
              >
                回复
              </el-button>
              <el-button 
                size="small" 
                :type="scope.row.hasFlagged ? 'warning' : 'default'"
                @click="toggleFlag(scope.row)"
              >
                {{ scope.row.hasFlagged ? '取消红旗' : '红旗' }}
              </el-button>
              <el-button 
                v-if="!scope.row.isCompleted"
                size="small" 
                type="success"
                @click="toggleCompleted(scope.row, true)"
              >
                完结
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="processedMessages.length === 0 && !loading" class="empty-state">
          暂无已处理消息
        </div>
      </el-tab-pane>

      <!-- 已完结标签页 -->
      <el-tab-pane label="已完结" name="completed">
        <div class="table-toolbar">
          <div class="toolbar-left">
            <el-input
              v-model="searchKeywordCompleted"
              placeholder="搜索全部内容（含回复）..."
              clearable
              style="width: 300px;"
              :prefix-icon="Search"
            />
          </div>
        </div>

        <el-table :data="completedMessages" border stripe v-loading="loading">
          <!-- 状态列 - 移到最前面 -->
          <el-table-column label="状态" width="90" align="center" fixed="left">
            <template #default="scope">
              <el-tag size="small" type="info">已完结</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="" width="40" align="center">
            <template #default="scope">
              <span v-if="scope.row.hasFlagged" style="color: #f56c6c; font-size: 16px;">🚩</span>
            </template>
          </el-table-column>

          <el-table-column label="沟通类型" width="110">
            <template #default="scope">
              <el-tag size="small" :type="getTypeTag(scope.row.type)">
                {{ getTypeName(scope.row.type) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="发送人">
            <template #default="scope">
              {{ getSenderName(scope.row.senderId) }}
            </template>
          </el-table-column>

          <el-table-column label="是否已读" width="90" align="center">
            <template #default="scope">
              <el-icon v-if="scope.row.myRead" color="#67c23a"><CircleCheck /></el-icon>
              <el-icon v-else color="#f56c6c"><CircleClose /></el-icon>
            </template>
          </el-table-column>

          <el-table-column label="发送时间" width="160">
            <template #default="scope">
              {{ formatTime(scope.row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="240" align="center">
            <template #default="scope">
              <el-button size="small" @click="viewDetail(scope.row)">查看</el-button>
              <el-button 
                size="small" 
                :type="scope.row.hasFlagged ? 'warning' : 'default'"
                @click="toggleFlag(scope.row)"
              >
                {{ scope.row.hasFlagged ? '取消红旗' : '红旗' }}
              </el-button>
              <el-button 
                size="small" 
                type="info"
                @click="toggleCompleted(scope.row, false)"
              >
                取消完结
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="completedMessages.length === 0 && !loading" class="empty-state">
          暂无已完结消息
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 详情弹窗 -->
    <el-dialog title="消息详情" v-model="detailVisible" width="750px">
      <div v-if="selectedMessage">
        <h4>发送人信息</h4>
        <el-descriptions :column="2" border v-if="senderDetail">
          <el-descriptions-item label="姓名">{{ senderDetail.name }}</el-descriptions-item>
          <el-descriptions-item label="工号">{{ senderDetail.employeeId }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ senderDetail.phone }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ senderDetail.email }}</el-descriptions-item>
          <el-descriptions-item label="所属地区">{{ senderDetail.region }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ senderDetail.department }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-top: 20px;">沟通信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="沟通类型">{{ getTypeName(selectedMessage.type) }}</el-descriptions-item>
          <el-descriptions-item label="是否V1V2客户">{{ selectedMessage.vip === 'yes' ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="客户名称">{{ selectedMessage.customerName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="样品短号">{{ selectedMessage.sampleCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="样品基质">{{ selectedMessage.sampleMatrix || '-' }}</el-descriptions-item>
          <el-descriptions-item label="样品数量">{{ selectedMessage.sampleCount || '-' }}</el-descriptions-item>
          <el-descriptions-item label="测试项目">{{ selectedMessage.testItems || '-' }}</el-descriptions-item>
          <el-descriptions-item label="到样日期">{{ selectedMessage.sampleDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="想要的测试周期">{{ selectedMessage.requestedCycle || '-' }}</el-descriptions-item>
          <el-descriptions-item label="测试费用">{{ selectedMessage.chargeStatus || '-' }}</el-descriptions-item>
          <el-descriptions-item label="加急费用">{{ selectedMessage.urgentFee || '-' }}</el-descriptions-item>
          <el-descriptions-item label="发送时间">{{ formatTime(selectedMessage.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ selectedMessage.remark || '-' }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-top: 20px;">所有接收人状态</h4>
        <el-table :data="selectedMessage.recipientDetails || []" border size="small">
          <el-table-column prop="name" label="接收人" width="100"></el-table-column>
          <el-table-column prop="department" label="部门" width="120"></el-table-column>
          <el-table-column label="已读" width="70" align="center">
            <template #default="scope">
              <el-icon v-if="scope.row.is_read" color="#67c23a"><CircleCheck /></el-icon>
              <el-icon v-else color="#f56c6c"><CircleClose /></el-icon>
            </template>
          </el-table-column>
          <el-table-column label="红旗" width="70" align="center">
            <template #default="scope">
              <span v-if="scope.row.is_flagged" style="color: #f56c6c;">🚩</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="已回复" width="80" align="center">
            <template #default="scope">
              <el-icon v-if="scope.row.has_replied" color="#67c23a"><CircleCheck /></el-icon>
              <el-icon v-else color="#f56c6c"><CircleClose /></el-icon>
            </template>
          </el-table-column>
          <el-table-column label="完结" width="90" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.is_completed" size="small" type="success">已完结</el-tag>
              <el-tag v-else size="small" type="warning">进行中</el-tag>
            </template>
          </el-table-column>
        </el-table>
        
        <h4 style="margin-top: 20px;">回复记录</h4>
        <div v-if="selectedMessage.replies && selectedMessage.replies.length > 0">
          <div v-for="(reply, index) in selectedMessage.replies" :key="index" class="reply-item">
            <div class="reply-content">
              <p><strong>{{ getUserDisplayName(reply.senderId) }}：</strong>{{ reply.content }}</p>
              <p class="reply-time">{{ formatTime(reply.createdAt) }}</p>
            </div>
            <div class="reply-reactions">
              <el-button
                :type="getMyReactionType('reply', reply.id) === 'like' ? 'primary' : 'default'"
                size="small"
                @click="handleReaction('reply', reply.id, 'like')"
              >
                👍 {{ getLikeCount('reply', reply.id) }}
              </el-button>
              <el-button
                :type="getMyReactionType('reply', reply.id) === 'dislike' ? 'danger' : 'default'"
                size="small"
                @click="handleReaction('reply', reply.id, 'dislike')"
              >
                👎 {{ getDislikeCount('reply', reply.id) }}
              </el-button>
            </div>
          </div>
        </div>
        <div v-else class="no-reply">暂无回复</div>

        <h4 style="margin-top: 20px;">回复</h4>
        <el-input type="textarea" v-model="replyContent" placeholder="请输入回复内容" :rows="3"></el-input>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button 
          v-if="myRecipient"
          :type="myRecipient.is_flagged ? 'warning' : 'default'"
          @click="toggleFlagFromDetail"
        >
          {{ myRecipient.is_flagged ? '取消红旗' : '标记红旗' }}
        </el-button>
        <el-button 
          v-if="!selectedMessage?.isCompleted"
          type="success" 
          @click="toggleCompletedFromDetail(true)"
        >
          标记完结
        </el-button>
        <el-button 
          v-if="selectedMessage?.isCompleted"
          type="info" 
          @click="toggleCompletedFromDetail(false)"
        >
          取消完结
        </el-button>
        <el-button type="primary" @click="submitReplyFromDetail" :loading="replyLoading">发送回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, CircleCheck, CircleClose } from '@element-plus/icons-vue';
import { communicationAPI, userAPI, reactionAPI } from '../api';
import { supabase } from '../utils/supabase';

const activeTab = ref('pending');
const messages = ref([]);
const businessUsers = ref([]);
const labUsers = ref([]);
const allUsers = ref([]);
const loading = ref(false);
const currentUserId = ref('');

const detailVisible = ref(false);
const selectedMessage = ref(null);
const senderDetail = ref(null);
const replyContent = ref('');
const replyLoading = ref(false);
const myRecipient = ref(null);

const searchKeyword = ref('');
const searchKeywordProcessed = ref('');
const searchKeywordCompleted = ref('');
const showFlaggedOnly = ref(false);

// 点赞/点踩数据
const reactionStats = ref({});

const typeMap = {
  paid_urgent: '付费加急',
  free_urgent: '免费加急',
  data_dispute: '数据质疑',
  follow_up: '跟单',
  consultation: '咨询',
  other: '其他',
  unqualified: '不合格沟通',
  data_confirm: '数据确认'
};

const typeTagMap = {
  paid_urgent: 'danger',
  free_urgent: 'warning',
  data_dispute: 'danger',
  follow_up: 'info',
  consultation: 'info',
  other: '',
  unqualified: 'danger',
  data_confirm: 'success'
};

const getTypeName = (type) => typeMap[type] || type;
const getTypeTag = (type) => typeTagMap[type] || '';

const formatTime = (t) => {
  if (!t) return '-';
  return new Date(t).toLocaleString('zh-CN');
};

const getSenderName = (senderId) => {
  const user = allUsers.value.find(u => u.id === senderId);
  return user ? user.name : '未知';
};

const getUserDisplayName = (userId) => {
  const user = allUsers.value.find(u => u.id === userId);
  return user ? (user.name || user.username) : '未知';
};

const loadCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) currentUserId.value = user.id;
};

const loadUsers = async () => {
  try {
    const [businessRes, labRes, allRes] = await Promise.all([
      userAPI.getByRole('business'),
      userAPI.getByRole('lab'),
      userAPI.getAll()
    ]);
    businessUsers.value = businessRes.data;
    labUsers.value = labRes.data;
    allUsers.value = allRes.data;
  } catch (error) {
    ElMessage.error('加载用户信息失败');
  }
};

const loadMessages = async () => {
  loading.value = true;
  try {
    const response = await communicationAPI.getAll();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const mine = response.data.filter(c => 
        c.recipients && c.recipients.includes(authUser.id)
      );
      // 为每个沟通添加我的状态
      messages.value = mine.map(c => {
        const recipients = c.recipientDetails || [];
        const myRec = recipients.find(r => r.recipient_id === authUser.id);
        return {
          ...c,
          myRead: myRec?.is_read || false,
          hasReplied: myRec?.has_replied || false,  // 我已回复
          isCompleted: c.isCompleted || false,  // 沟通记录已完结（全局）
          hasFlagged: myRec?.is_flagged || false,
          replyCount: c.replies?.length || 0
        };
      });
    }
  } catch (error) {
    ElMessage.error('加载消息失败');
  } finally {
    loading.value = false;
  }
};

// 待处理消息：未回复 且 未完结
const pendingMessages = computed(() => {
  let result = messages.value.filter(m => 
    !m.hasReplied && !m.isCompleted
  );

  // 红旗过滤
  if (showFlaggedOnly.value) {
    result = result.filter(r => r.hasFlagged);
  }

  // 模糊搜索
  const kw = searchKeyword.value.trim().toLowerCase();
  if (kw) {
    result = result.filter(r => {
      const replyTexts = (r.replies || []).map(rp => rp.content || '').join(' ');
      const fields = [
        r.customerName, r.sampleCode, r.sampleMatrix,
        r.testItems, r.content, r.remark,
        getTypeName(r.type), getSenderName(r.senderId),
        r.requestedCycle, r.chargeStatus,
        r.urgentFee, replyTexts
      ].map(f => (f || '').toLowerCase());
      return fields.some(f => f.includes(kw));
    });
  }

  return result;
});

// 已处理消息：已回复 且 未完结
const processedMessages = computed(() => {
  let result = messages.value.filter(m => 
    m.hasReplied && !m.isCompleted
  );

  // 模糊搜索
  const kw = searchKeywordProcessed.value.trim().toLowerCase();
  if (kw) {
    result = result.filter(r => {
      const replyTexts = (r.replies || []).map(rp => rp.content || '').join(' ');
      const fields = [
        r.customerName, r.sampleCode, r.sampleMatrix,
        r.testItems, r.content, r.remark,
        getTypeName(r.type), getSenderName(r.senderId),
        r.requestedCycle, r.chargeStatus,
        r.urgentFee, replyTexts
      ].map(f => (f || '').toLowerCase());
      return fields.some(f => f.includes(kw));
    });
  }

  return result;
});

// 已完结消息：沟通记录已完结（任何人标记完结，所有人都看到已完结）
const completedMessages = computed(() => {
  let result = messages.value.filter(m => 
    m.isCompleted
  );

  // 模糊搜索
  const kw = searchKeywordCompleted.value.trim().toLowerCase();
  if (kw) {
    result = result.filter(r => {
      const replyTexts = (r.replies || []).map(rp => rp.content || '').join(' ');
      const fields = [
        r.customerName, r.sampleCode, r.sampleMatrix,
        r.testItems, r.content, r.remark,
        getTypeName(r.type), getSenderName(r.senderId),
        r.requestedCycle, r.chargeStatus,
        r.urgentFee, replyTexts
      ].map(f => (f || '').toLowerCase());
      return fields.some(f => f.includes(kw));
    });
  }

  return result;
});

// 表格行样式：待处理消息显示淡蓝色底色
const tableRowClassName = ({ row }) => {
  if (!row.hasReplied && !row.isCompleted) {
    return 'pending-row';
  }
  return '';
};

// 点赞/点踩相关函数
const getLikeCount = (targetType, targetId) => {
  const key = `${targetType}-${targetId}`;
  return reactionStats.value[key]?.likeCount || 0;
};

const getDislikeCount = (targetType, targetId) => {
  const key = `${targetType}-${targetId}`;
  return reactionStats.value[key]?.dislikeCount || 0;
};

const getMyReactionType = (targetType, targetId) => {
  const key = `${targetType}-${targetId}`;
  return reactionStats.value[key]?.myReaction || null;
};

const handleReaction = async (targetType, targetId, reactionType) => {
  try {
    const result = await reactionAPI.toggle(targetType, targetId, reactionType);
    const key = `${targetType}-${targetId}`;
    const current = reactionStats.value[key] || { likeCount: 0, dislikeCount: 0, myReaction: null };

    if (result.data.action === 'added') {
      if (reactionType === 'like') current.likeCount++;
      else current.dislikeCount++;
      current.myReaction = reactionType;
    } else if (result.data.action === 'removed') {
      if (reactionType === 'like') current.likeCount = Math.max(0, current.likeCount - 1);
      else current.dislikeCount = Math.max(0, current.dislikeCount - 1);
      current.myReaction = null;
    } else if (result.data.action === 'updated') {
      if (result.data.reaction_type === 'like') {
        current.likeCount++;
        current.dislikeCount = Math.max(0, current.dislikeCount - 1);
      } else {
        current.dislikeCount++;
        current.likeCount = Math.max(0, current.likeCount - 1);
      }
      current.myReaction = result.data.reaction_type;
    }

    reactionStats.value[key] = current;
  } catch (error) {
    ElMessage.error('操作失败：' + (error.message || '未知错误'));
  }
};

// 加载回复的点赞统计
const loadReplyReactions = async (replies) => {
  try {
    const replyIds = replies.map(r => r.id);
    if (replyIds.length === 0) return;
    const { data } = await reactionAPI.getStatsBatch('reply', replyIds);
    const userId = currentUserId.value;
    const newStats = {};
    for (const [tid, stats] of Object.entries(data || {})) {
      const myReaction = stats.reactions?.find(r => r.user_id === userId)?.reaction_type || null;
      newStats[`reply-${tid}`] = {
        likeCount: stats.likeCount,
        dislikeCount: stats.dislikeCount,
        myReaction,
        reactions: stats.reactions
      };
    }
    reactionStats.value = { ...reactionStats.value, ...newStats };
  } catch (error) {
    console.error('加载回复点赞统计失败:', error);
  }
};

const viewDetail = async (message) => {
  selectedMessage.value = JSON.parse(JSON.stringify(message));
  replyContent.value = '';
  
  // 获取发送人详情
  senderDetail.value = allUsers.value.find(u => u.id === message.senderId) || null;
  
  // 获取我的接收人记录
  myRecipient.value = (message?.recipientDetails || []).find(r => r.recipient_id === currentUserId.value) || null;
  
  // 标记已读
  try {
    await communicationAPI.markAsRead(message.id);
    // 更新本地状态
    const idx = messages.value.findIndex(m => m.id === message.id);
    if (idx >= 0) messages.value[idx].myRead = true;
  } catch (e) { /* 静默 */ }
  
  // 加载回复的点赞统计
  if (selectedMessage.value.replies && selectedMessage.value.replies.length > 0) {
    await loadReplyReactions(selectedMessage.value.replies);
  }
  
  detailVisible.value = true;
};

const toggleFlag = async (msg) => {
  try {
    const newVal = !msg.hasFlagged;
    await communicationAPI.toggleRecipientFlag(msg.id, currentUserId.value, newVal);
    msg.hasFlagged = newVal;
    if (myRecipient.value) myRecipient.value.is_flagged = newVal;
    ElMessage.success(newVal ? '已标记红旗' : '已取消红旗');
  } catch (e) {
    ElMessage.error('操作失败');
  }
};

const toggleFlagFromDetail = async () => {
  if (!selectedMessage.value || !myRecipient.value) return;
  try {
    const newVal = !myRecipient.value.is_flagged;
    await communicationAPI.toggleRecipientFlag(selectedMessage.value.id, currentUserId.value, newVal);
    myRecipient.value.is_flagged = newVal;
    selectedMessage.value.hasFlagged = newVal;
    ElMessage.success(newVal ? '已标记红旗' : '已取消红旗');
  } catch (e) {
    ElMessage.error('操作失败');
  }
};

// 标记完结（全局，更新 communications 表）
const toggleCompleted = async (msg, isCompleted) => {
  try {
    await communicationAPI.toggleCommCompleted(msg.id, isCompleted);
    msg.isCompleted = isCompleted;
    ElMessage.success(isCompleted ? '已标记完结' : '已取消完结');
    loadMessages(); // 刷新列表
  } catch (e) {
    ElMessage.error('操作失败');
  }
};

// 从详情弹窗标记完结
const toggleCompletedFromDetail = async (isCompleted) => {
  if (!selectedMessage.value) return;
  try {
    await communicationAPI.toggleCommCompleted(selectedMessage.value.id, isCompleted);
    selectedMessage.value.isCompleted = isCompleted;
    ElMessage.success(isCompleted ? '已标记完结' : '已取消完结');
    loadMessages(); // 刷新列表
  } catch (e) {
    ElMessage.error('操作失败');
  }
};

// 从表格中直接回复
const replyFromTable = (msg) => {
  viewDetail(msg);
};

const submitReplyFromDetail = async () => {
  if (!replyContent.value.trim()) {
    ElMessage.error('请输入回复内容');
    return;
  }
  replyLoading.value = true;
  try {
    await communicationAPI.createReply(selectedMessage.value.id, {
      content: replyContent.value
    });
    ElMessage.success('回复成功');
    replyContent.value = '';
    // 重新加载详情
    const { data } = await communicationAPI.getById(selectedMessage.value.id);
    selectedMessage.value = data;
    // 更新本地 hasReplied 状态
    const idx = messages.value.findIndex(m => m.id === selectedMessage.value.id);
    if (idx >= 0) messages.value[idx].hasReplied = true;
  } catch (error) {
    ElMessage.error('回复失败：' + (error.message || '未知错误'));
  } finally {
    replyLoading.value = false;
  }
};

onMounted(() => {
  loadCurrentUser();
  loadUsers();
  loadMessages();
});
</script>

<style scoped>
.lab-receive {
  padding: 20px;
}

.page-title {
  margin-bottom: 20px;
  font-size: 20px;
  color: #333;
}

.message-tabs {
  margin-top: 20px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.reply-item {
  background: #f5f5f5;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.reply-content {
  flex: 1;
}

.reply-reactions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  align-items: center;
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

.empty-state {
  text-align: center;
  color: #999;
  padding: 60px 20px;
}

/* 待处理消息 - 淡蓝色底色 */
::deep(.pending-row) {
  background-color: #ecf5ff !important;
}

::deep(.pending-row:hover) {
  background-color: #d9ecff !important;
}
</style>
