<template>
  <div class="business-receive">
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
          <el-table-column label="状态" width="100" align="center" fixed="left">
            <template #default="scope">
              <el-tag v-if="scope.row.myCompleted || scope.row.isCompleted" size="small" type="info">已完结</el-tag>
              <el-tag v-else-if="scope.row.hasReplied" size="small" type="success">已回复</el-tag>
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

          <el-table-column label="沟通内容" min-width="200" show-overflow-tooltip>
            <template #default="scope">
              {{ scope.row.content || '-' }}
            </template>
          </el-table-column>

          <el-table-column label="发送人" width="100">
            <template #default="scope">
              {{ getSenderName(scope.row.senderId) }}
            </template>
          </el-table-column>

          <el-table-column label="发送时间" width="160">
            <template #default="scope">
              {{ formatTime(scope.row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="280" align="center" fixed="right">
            <template #default="scope">
              <div class="row-op-btns">
                <el-button size="small" @click="viewDetail(scope.row)">查看</el-button>
                <el-button 
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small" 
                  class="quick-btn agree-btn"
                  @click="sendQuickReplyFromRow(scope.row, '同意')"
                  :loading="scope.row._replyLoading"
                >同意</el-button>
                <el-button
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small"
                  class="quick-btn reject-btn"
                  @click="sendQuickReplyFromRow(scope.row, '拒绝')"
                  :loading="scope.row._replyLoading"
                >拒绝</el-button>
                <el-button
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small"
                  class="quick-btn pending-btn"
                  @click="sendQuickReplyFromRow(scope.row, '等我确认后回复')"
                  :loading="scope.row._replyLoading"
                >等我确认</el-button>
                <el-button 
                  size="small" 
                  :type="scope.row.hasFlagged ? 'warning' : 'default'"
                  @click="toggleFlag(scope.row)"
                >
                  {{ scope.row.hasFlagged ? '取消红旗' : '红旗' }}
                </el-button>
                <el-button 
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small" 
                  type="success"
                  @click="toggleMyCompleted(scope.row, true)"
                >
                  完结
                </el-button>
                <el-button 
                  v-if="scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small" 
                  type="info"
                  @click="toggleMyCompleted(scope.row, false)"
                >
                  取消完结
                </el-button>
              </div>
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
          <el-table-column label="状态" width="100" align="center" fixed="left">
            <template #default="scope">
              <el-tag v-if="scope.row.myCompleted || scope.row.isCompleted" size="small" type="info">已完结</el-tag>
              <el-tag v-else-if="scope.row.hasReplied" size="small" type="success">已回复</el-tag>
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

          <el-table-column label="沟通内容" min-width="200" show-overflow-tooltip>
            <template #default="scope">
              {{ scope.row.content || '-' }}
            </template>
          </el-table-column>

          <el-table-column label="发送人" width="100">
            <template #default="scope">
              {{ getSenderName(scope.row.senderId) }}
            </template>
          </el-table-column>

          <el-table-column label="发送时间" width="160">
            <template #default="scope">
              {{ formatTime(scope.row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="280" align="center" fixed="right">
            <template #default="scope">
              <div class="row-op-btns">
                <el-button size="small" @click="viewDetail(scope.row)">查看</el-button>
                <el-button 
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small" 
                  class="quick-btn agree-btn"
                  @click="sendQuickReplyFromRow(scope.row, '同意')"
                  :loading="scope.row._replyLoading"
                >同意</el-button>
                <el-button
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small"
                  class="quick-btn reject-btn"
                  @click="sendQuickReplyFromRow(scope.row, '拒绝')"
                  :loading="scope.row._replyLoading"
                >拒绝</el-button>
                <el-button
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small"
                  class="quick-btn pending-btn"
                  @click="sendQuickReplyFromRow(scope.row, '等我确认后回复')"
                  :loading="scope.row._replyLoading"
                >等我确认</el-button>
                <el-button 
                  size="small" 
                  :type="scope.row.hasFlagged ? 'warning' : 'default'"
                  @click="toggleFlag(scope.row)"
                >
                  {{ scope.row.hasFlagged ? '取消红旗' : '红旗' }}
                </el-button>
                <el-button 
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small" 
                  type="success"
                  @click="toggleMyCompleted(scope.row, true)"
                >
                  完结
                </el-button>
                <el-button 
                  v-if="scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small" 
                  type="info"
                  @click="toggleMyCompleted(scope.row, false)"
                >
                  取消完结
                </el-button>
              </div>
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

          <el-table-column label="沟通内容" min-width="200" show-overflow-tooltip>
            <template #default="scope">
              {{ scope.row.content || '-' }}
            </template>
          </el-table-column>

          <el-table-column label="发送人" width="100">
            <template #default="scope">
              {{ getSenderName(scope.row.senderId) }}
            </template>
          </el-table-column>

          <el-table-column label="发送时间" width="160">
            <template #default="scope">
              {{ formatTime(scope.row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="240" align="center" fixed="right">
            <template #default="scope">
              <div class="row-op-btns">
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
                  @click="toggleMyCompleted(scope.row, false)"
                >
                  取消完结
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="completedMessages.length === 0 && !loading" class="empty-state">
          暂无已完结消息
        </div>
      </el-tab-pane>

      <!-- 已被撤回标签页 -->
      <el-tab-pane label="已被撤回" name="recalled">
        <div class="table-toolbar">
          <div class="toolbar-left">
            <el-input
              v-model="searchKeywordRecalled"
              placeholder="搜索..."
              clearable
              style="width: 300px;"
              :prefix-icon="Search"
            />
          </div>
        </div>

        <el-table :data="recalledMessages" border stripe v-loading="loading">
          <el-table-column label="撤回原因" min-width="150" show-overflow-tooltip>
            <template #default="scope">
              {{ scope.row.recallReason || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="沟通类型" width="110">
            <template #default="scope">
              <el-tag size="small" :type="getTypeTag(scope.row.type)">
                {{ getTypeName(scope.row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="沟通内容" min-width="200" show-overflow-tooltip>
            <template #default="scope">
              {{ scope.row.content || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="发送人" width="100">
            <template #default="scope">
              {{ getSenderName(scope.row.senderId) }}
            </template>
          </el-table-column>
          <el-table-column label="撤回时间" width="160">
            <template #default="scope">
              {{ formatTime(scope.row.recalledAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template #default="scope">
              <el-button size="small" @click="viewDetail(scope.row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="recalledMessages.length === 0 && !loading" class="empty-state">
          暂无已被撤回的消息
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
        
        <!-- 撤回信息（仅撤回消息显示） -->
        <h4 v-if="selectedMessage?.isRecalled" style="margin-top: 20px; color: #e6a23c;">撤回信息</h4>
        <el-descriptions v-if="selectedMessage?.isRecalled" :column="2" border>
          <el-descriptions-item label="撤回原因">{{ selectedMessage.recallReason || '无' }}</el-descriptions-item>
          <el-descriptions-item label="撤回时间">{{ formatTime(selectedMessage.recalledAt) }}</el-descriptions-item>
        </el-descriptions>
        
        <h4 style="margin-top: 20px;">附件</h4>
        <div v-if="selectedMessage.attachments && selectedMessage.attachments.length > 0" class="attachment-list">
          <div v-for="(file, idx) in selectedMessage.attachments" :key="idx" class="attachment-item">
            <el-icon :size="16"><Document /></el-icon>
            <a href="javascript:void(0)" @click.prevent="downloadFile(file)">{{ file.name }}</a>
          </div>
        </div>
        <div v-else class="no-attachment">暂无附件</div>

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
        
        <h4 v-if="!selectedMessage?.isRecalled" style="margin-top: 20px;">回复记录</h4>
        <div v-if="!selectedMessage?.isRecalled && selectedMessage.replies && selectedMessage.replies.length > 0">
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
        <div v-if="!selectedMessage?.isRecalled" class="no-reply">暂无回复</div>
        
        <h4 v-if="!selectedMessage?.isRecalled" style="margin-top: 20px;">回复</h4>
        <el-input v-if="!selectedMessage?.isRecalled" type="textarea" v-model="replyContent" placeholder="请输入回复内容" :rows="3"></el-input>
      </div>
      <template #footer>
        <div class="detail-footer-btns">
          <!-- 快捷回复按钮 -->
          <el-button 
            v-if="!selectedMessage?.myCompleted && !selectedMessage?.isCompleted && !selectedMessage?.isRecalled"
            type="success" 
            class="quick-btn agree-btn"
            @click="sendQuickReply('同意')"
            :loading="replyLoading"
          >同意</el-button>
          <el-button 
            v-if="!selectedMessage?.myCompleted && !selectedMessage?.isCompleted"
            type="danger" 
            class="quick-btn reject-btn"
            @click="sendQuickReply('拒绝')"
            :loading="replyLoading"
          >拒绝</el-button>
          <el-button 
            v-if="!selectedMessage?.myCompleted && !selectedMessage?.isCompleted"
            class="quick-btn pending-btn"
            @click="sendQuickReply('等我确认后回复')"
            :loading="replyLoading"
          >等我确认后回复</el-button>
          <el-button 
            v-if="myRecipient"
            :type="myRecipient.is_flagged ? 'warning' : 'default'"
            @click="toggleFlagFromDetail"
          >
            {{ myRecipient.is_flagged ? '取消红旗' : '标记红旗' }}
          </el-button>
          <el-button 
            v-if="!selectedMessage?.myCompleted && !selectedMessage?.isCompleted"
            type="success" 
            @click="toggleMyCompletedFromDetail(true)"
          >
            标记完结
          </el-button>
          <el-button 
            v-if="selectedMessage?.myCompleted && !selectedMessage?.isCompleted"
            type="info" 
            @click="toggleMyCompletedFromDetail(false)"
          >
            取消完结
          </el-button>
          <el-button type="primary" v-if="!selectedMessage?.isRecalled" @click="submitReplyFromDetail" :loading="replyLoading">发送回复</el-button>
          <el-button type="info" plain @click="detailVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, CircleCheck, CircleClose, Document } from '@element-plus/icons-vue';
import { communicationAPI, userAPI, reactionAPI } from '../api';
import { supabase } from '../utils/supabase';

const activeTab = ref('pending');
const messages = ref([]);
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
const searchKeywordRecalled = ref('');
const showFlaggedOnly = ref(false);

// 点赞/点踩数据 { 'reply-uuid': { likeCount, dislikeCount, myReaction } }
const reactionStats = ref({});
let messageChannel = null;

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

const getDownloadUrl = (file) => {
  if (!file) return '#';
  // 如果 file 是字符串（旧数据兼容），直接返回
  if (typeof file === 'string') return file;
  // 优先用 url，其次用 path 生成签名 URL（暂时用 public URL）
  return file.url || '#';
};

// 下载文件（使用签名 URL）
const downloadFile = async (file) => {
  if (!file) return;
  try {
    let filePath = '';
    if (typeof file === 'string') {
      filePath = file;
    } else {
      filePath = file.path || file.name || '';
    }
    
    if (!filePath) {
      ElMessage.error('文件路径为空');
      return;
    }
    
    // 创建签名 URL（有效期 60 分钟）
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(filePath, 60 * 60);
    
    if (error) {
      console.error('创建签名 URL 失败:', error);
      ElMessage.error('下载失败：' + (error.message || '未知错误'));
      return;
    }
    
    // 打开签名 URL
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      ElMessage.error('获取下载链接失败');
    }
  } catch (e) {
    console.error('下载文件异常:', e);
    ElMessage.error('下载失败：' + (e.message || '未知错误'));
  }
};

const loadCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) currentUserId.value = user.id;
};

const loadUsers = async () => {
  try {
    const [labRes, allRes] = await Promise.all([
      userAPI.getByRole('lab'),
      userAPI.getAll()
    ]);
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
          myCompleted: myRec?.is_completed || false,  // 我个人已完结
          isCompleted: c.isCompleted || false,  // 沟通记录已完结（全局或全部人完结）
          hasFlagged: myRec?.is_flagged || false,
          replyCount: c.replies?.length || 0,
          allRecipientsCompleted: recipients.every(r => r.is_completed)  // 所有人都已完结
        };
      });
    }
  } catch (error) {
    ElMessage.error('加载消息失败');
  } finally {
    loading.value = false;
  }
};

// 待处理消息：未回复 且 我个人未完结 且 全局未完结 且 未撤回
const pendingMessages = computed(() => {
  let result = messages.value.filter(m => 
    !m.hasReplied && !m.myCompleted && !m.isCompleted && !m.isRecalled
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

// 已处理消息：已回复 且 我个人未完结 且 全局未完结 且 未撤回
const processedMessages = computed(() => {
  let result = messages.value.filter(m => 
    m.hasReplied && !m.myCompleted && !m.isCompleted && !m.isRecalled
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

// 已完结消息：我个人已完结 或 全局已完结 且 未撤回
const completedMessages = computed(() => {
  let result = messages.value.filter(m => 
    (m.myCompleted || m.isCompleted) && !m.isRecalled
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

// 已被撤回消息：isRecalled === true
const recalledMessages = computed(() => {
  let result = messages.value.filter(m => m.isRecalled);

  // 模糊搜索
  const kw = searchKeywordRecalled.value.trim().toLowerCase();
  if (kw) {
    result = result.filter(r => {
      const replyTexts = (r.replies || []).map(rp => rp.content || '').join(' ');
      const fields = [
        r.customerName, r.sampleCode, r.sampleMatrix,
        r.testItems, r.content, r.remark,
        r.recallReason || '',
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
  myRecipient.value = (message.recipientDetails || []).find(r => r.recipient_id === currentUserId.value) || null;
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

// 切换我个人完结状态
const toggleMyCompleted = async (msg, isCompleted) => {
  try {
    await communicationAPI.toggleRecipientCompleted(msg.id, currentUserId.value, isCompleted);
    msg.myCompleted = isCompleted;
    // 检查是否所有人都完结了
    const allDone = msg.recipientDetails?.every(r => 
      r.recipient_id === currentUserId.value ? isCompleted : r.is_completed
    );
    if (allDone) {
      // 所有人都完结了，标记全局完结
      await communicationAPI.toggleCommCompleted(msg.id, true);
      msg.isCompleted = true;
      msg.allRecipientsCompleted = true;
    }
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

// 从列表行发送快捷回复
const sendQuickReplyFromRow = async (msg, content) => {
  // 设置当前行的 loading 状态
  msg._replyLoading = true;
  try {
    await communicationAPI.createReply(msg.id, { content });
    ElMessage.success('回复成功');
    // 立即在本地更新状态（不等待服务器同步，避免延迟）
    const idx = messages.value.findIndex(m => m.id === msg.id);
    if (idx >= 0) {
      messages.value[idx].hasReplied = true;
    }
    Object.assign(msg, { hasReplied: true });
    // 延迟刷新列表（给服务器时间同步，但不阻塞UI）
    setTimeout(() => loadMessages(), 300);
    // 如果点了同意或拒绝，自动切换到已处理标签页
    if (content === '同意' || content === '拒绝') {
      activeTab.value = 'processed';
    }
    // 如果点了待确认，保持在待处理标签页（不需要切换）
  } catch (error) {
    ElMessage.error('回复失败：' + (error.message || '未知错误'));
  } finally {
    msg._replyLoading = false;
  }
};

// 从详情弹窗标记我个人完结
const toggleMyCompletedFromDetail = async (isCompleted) => {
  if (!selectedMessage.value) return;
  try {
    await communicationAPI.toggleRecipientCompleted(selectedMessage.value.id, currentUserId.value, isCompleted);
    selectedMessage.value.myCompleted = isCompleted;
    if (myRecipient.value) myRecipient.value.is_completed = isCompleted;
    // 检查是否所有人都完结了
    const allRecipients = selectedMessage.value.recipientDetails || [];
    const allDone = allRecipients.every(r => 
      r.recipient_id === currentUserId.value ? isCompleted : r.is_completed
    );
    if (allDone) {
      await communicationAPI.toggleCommCompleted(selectedMessage.value.id, true);
      selectedMessage.value.isCompleted = true;
      selectedMessage.value.allRecipientsCompleted = true;
    }
    ElMessage.success(isCompleted ? '已标记完结' : '已取消完结');
    loadMessages(); // 刷新列表
  } catch (e) {
    ElMessage.error('操作失败');
  }
};

const submitReplyFromDetail = async () => {
  if (!replyContent.value.trim()) {
    ElMessage.error('请输入回复内容');
    return;
  }
  await doSendReply(replyContent.value);
};

// 发送快捷回复
const sendQuickReply = async (content) => {
  await doSendReply(content);
};

// 实际发送回复
const doSendReply = async (content) => {
  replyLoading.value = true;
  try {
    await communicationAPI.createReply(selectedMessage.value.id, {
      content: content
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

// 实时订阅消息变化，立即刷新 UI
const subscribeMessages = () => {
  // 先清理旧订阅
  if (messageChannel) {
    supabase.removeChannel(messageChannel);
    messageChannel = null;
  }
  messageChannel = supabase
    .channel('business-receive-messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'communications' },
      () => { loadMessages(); }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'communications' },
      () => { loadMessages(); }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'communication_recipients' },
      () => { loadMessages(); }
    )
    .subscribe();
};

onMounted(() => {
  loadCurrentUser();
  loadUsers();
  loadMessages();
  subscribeMessages();
});

onUnmounted(() => {
  if (messageChannel) {
    supabase.removeChannel(messageChannel);
    messageChannel = null;
  }
});
</script>

<style scoped>
.business-receive {
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
  gap: 10px;
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

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 6px;
  transition: background 0.2s;
}

.attachment-item:hover {
  background: #e8e8e8;
}

.attachment-item a {
  color: #409eff;
  text-decoration: none;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-item a:hover {
  text-decoration: underline;
}

.no-attachment {
  color: #999;
  font-size: 14px;
  padding: 8px 0;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 60px 20px;
}

/* 待处理消息 - 淡蓝色底色 */
:deep(.pending-row) {
  background-color: #ecf5ff !important;
}

:deep(.pending-row:hover) {
  background-color: #d9ecff !important;
}

/* 详情弹窗底部按钮 */
.detail-footer-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.quick-btn {
  font-weight: 600;
}
.agree-btn {
  background: #67c23a !important;
  border-color: #67c23a !important;
  color: white !important;
}
.reject-btn {
  background: #f56c6c !important;
  border-color: #f56c6c !important;
  color: white !important;
}
.pending-btn {
  background: #d4a574 !important;
  border-color: #d4a574 !important;
  color: white !important;
}

/* 列表行操作按钮 */
.row-op-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}
.row-op-btns .el-button {
  padding: 2px 6px !important;
  height: 24px !important;
  font-size: 12px !important;
  min-height: 24px !important;
}
</style>
