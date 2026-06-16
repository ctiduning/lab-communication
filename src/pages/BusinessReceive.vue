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

        <el-table :data="pendingMessages" border stripe v-loading="loading" :row-class-name="tableRowClassName" @row-click="viewDetail">
          <!-- 状态列 - 移到最前面 -->
          <el-table-column label="状态" width="100" align="center" fixed="left">
            <template #default="scope">
              <el-tag v-if="scope.row.myCompleted || scope.row.isCompleted" size="small" type="info">已完结</el-tag>
              <el-tag v-else-if="scope.row.isRecalled && !scope.row.hasReplied" size="small" type="warning">已撤回</el-tag>
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
                <el-button size="small" @click.stop="viewDetail(scope.row)">查看</el-button>
                <el-button 
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small" 
                  class="quick-btn agree-btn"
                  @click.stop="sendQuickReplyFromRow(scope.row, '同意')"
                  :loading="scope.row._replyLoading"
                >同意</el-button>
                <el-button
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small"
                  class="quick-btn reject-btn"
                  @click.stop="sendQuickReplyFromRow(scope.row, '拒绝')"
                  :loading="scope.row._replyLoading"
                >拒绝</el-button>
                <el-button
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small"
                  class="quick-btn pending-btn"
                  @click.stop="sendQuickReplyFromRow(scope.row, '等我确认后回复')"
                  :loading="scope.row._replyLoading"
                >等我确认</el-button>
                <el-button 
                  size="small" 
                  :type="scope.row.hasFlagged ? 'warning' : 'default'"
                  @click.stop="toggleFlag(scope.row)"
                >
                  {{ scope.row.hasFlagged ? '取消红旗' : '红旗' }}
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="pendingMessages.length === 0 && !loading" class="empty-state">
          暂无待处理消息
        </div>
        <div v-if="hasMore && !loading" class="load-more-wrapper" style="text-align: center; margin: 16px 0;">
          <el-button type="primary" plain :loading="loadingMore" @click="loadMore">
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </el-button>
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

        <el-table :data="processedMessages" border stripe v-loading="loading" @row-click="viewDetail">
          <!-- 状态列 - 移到最前面 -->
          <el-table-column label="状态" width="100" align="center" fixed="left">
            <template #default="scope">
              <el-tag v-if="scope.row.myCompleted || scope.row.isCompleted" size="small" type="info">已完结</el-tag>
              <el-tag v-else-if="scope.row.isRecalled && !scope.row.hasReplied" size="small" type="warning">已撤回</el-tag>
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
                <el-button size="small" @click.stop="viewDetail(scope.row)">查看</el-button>
                <el-button 
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small" 
                  class="quick-btn agree-btn"
                  @click.stop="sendQuickReplyFromRow(scope.row, '同意')"
                  :loading="scope.row._replyLoading"
                >同意</el-button>
                <el-button
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small"
                  class="quick-btn reject-btn"
                  @click.stop="sendQuickReplyFromRow(scope.row, '拒绝')"
                  :loading="scope.row._replyLoading"
                >拒绝</el-button>
                <el-button
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small"
                  class="quick-btn pending-btn"
                  @click.stop="sendQuickReplyFromRow(scope.row, '等我确认后回复')"
                  :loading="scope.row._replyLoading"
                >等我确认</el-button>
                <el-button 
                  size="small" 
                  :type="scope.row.hasFlagged ? 'warning' : 'default'"
                  @click.stop="toggleFlag(scope.row)"
                >
                  {{ scope.row.hasFlagged ? '取消红旗' : '红旗' }}
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="processedMessages.length === 0 && !loading" class="empty-state">
          暂无已处理消息
        </div>
        <div v-if="hasMore && !loading" class="load-more-wrapper" style="text-align: center; margin: 16px 0;">
          <el-button type="primary" plain :loading="loadingMore" @click="loadMore">
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </el-button>
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

        <el-table :data="completedMessages" border stripe v-loading="loading" @row-click="viewDetail">
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
                <el-button size="small" @click.stop="viewDetail(scope.row)">查看</el-button>
                <el-button 
                  size="small" 
                  :type="scope.row.hasFlagged ? 'warning' : 'default'"
                  @click.stop="toggleFlag(scope.row)"
                >
                  {{ scope.row.hasFlagged ? '取消红旗' : '红旗' }}
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="completedMessages.length === 0 && !loading" class="empty-state">
          暂无已完结消息
        </div>
        <div v-if="hasMore && !loading" class="load-more-wrapper" style="text-align: center; margin: 16px 0;">
          <el-button type="primary" plain :loading="loadingMore" @click="loadMore">
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </el-button>
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

        <el-table :data="recalledMessages" border stripe v-loading="loading" @row-click="viewDetail">
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
          <el-table-column label="操作" width="150" align="center">
            <template #default="scope">
              <el-button size="small" @click.stop="viewDetail(scope.row)">查看</el-button>
              <el-button 
                size="small" 
                :type="scope.row.hasFlagged ? 'warning' : 'default'"
                @click.stop="toggleFlag(scope.row)"
              >
                {{ scope.row.hasFlagged ? '取消红旗' : '红旗' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="recalledMessages.length === 0 && !loading" class="empty-state">
          暂无已被撤回的消息
        </div>
      </el-tab-pane>
      <!-- 全部 -->
      <el-tab-pane label="全部" name="all">
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

        <el-table :data="allMessages" border stripe v-loading="loading" :row-class-name="tableRowClassName" @row-click="viewDetail">
          <el-table-column label="状态" width="100" align="center" fixed="left">
            <template #default="scope">
              <el-tag v-if="scope.row.myCompleted || scope.row.isCompleted" size="small" type="info">已完结</el-tag>
              <el-tag v-else-if="scope.row.isRecalled && !scope.row.hasReplied" size="small" type="warning">已撤回</el-tag>
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
                  v-if="!scope.row.isCompleted && !scope.row.isRecalled && !scope.row.myCompleted"
                  size="small"
                  type="warning"
                  @click="showActionDialog(scope.row)"
                >处理</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="allMessages.length === 0 && !loading" class="empty-tip">
          {{ showFlaggedOnly ? '暂无带红旗的消息' : '暂无消息' }}
        </div>
      </el-tab-pane>

      <!-- 红旗标签页 -->
      <el-tab-pane label="红旗" name="flagged">
        <div class="table-toolbar">
          <div class="toolbar-left">
            <el-input
              v-model="searchKeywordFlagged"
              placeholder="搜索全部内容（含回复）..."
              clearable
              style="width: 300px;"
              :prefix-icon="Search"
            />
          </div>
        </div>

        <el-table :data="flaggedMessages" border stripe v-loading="loading" :row-class-name="tableRowClassName" @row-click="viewDetail">
          <el-table-column label="状态" width="100" align="center" fixed="left">
            <template #default="scope">
              <el-tag v-if="scope.row.myCompleted || scope.row.isCompleted" size="small" type="info">已完结</el-tag>
              <el-tag v-else-if="scope.row.isRecalled && !scope.row.hasReplied" size="small" type="warning">已撤回</el-tag>
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
                <el-button size="small" @click.stop="viewDetail(scope.row)">查看</el-button>
                <el-button 
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small" 
                  class="quick-btn agree-btn"
                  @click.stop="sendQuickReplyFromRow(scope.row, '同意')"
                  :loading="scope.row._replyLoading"
                >同意</el-button>
                <el-button
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small"
                  class="quick-btn reject-btn"
                  @click.stop="sendQuickReplyFromRow(scope.row, '拒绝')"
                  :loading="scope.row._replyLoading"
                >拒绝</el-button>
                <el-button
                  v-if="!scope.row.myCompleted && !scope.row.isCompleted && !scope.row.isRecalled"
                  size="small"
                  class="quick-btn pending-btn"
                  @click.stop="sendQuickReplyFromRow(scope.row, '等我确认后回复')"
                  :loading="scope.row._replyLoading"
                >等我确认</el-button>
                <el-button 
                  size="small" 
                  :type="scope.row.hasFlagged ? 'warning' : 'default'"
                  @click.stop="toggleFlag(scope.row)"
                >
                  {{ scope.row.hasFlagged ? '取消红旗' : '红旗' }}
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="flaggedMessages.length === 0 && !loading" class="empty-tip">
          暂无带红旗的消息
        </div>
        <div v-if="hasMore && !loading" class="load-more-wrapper" style="text-align: center; margin: 16px 0;">
          <el-button type="primary" plain :loading="loadingMore" @click="loadMore">
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </el-button>
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

        <h4 style="margin-top: 20px;">接收人状态</h4>
        <!-- 所有接收人按部门分组展示（新旧消息均适用） -->
        <div v-if="!selectedMessage?.isRecalled" style="margin-bottom: 4px;">
          <div v-for="(group, gIdx) in getAllDeptGroups(selectedMessage)" :key="gIdx" style="margin-bottom: 12px; border: 1px solid #ebeef5; border-radius: 4px; padding: 0;">
            <div style="background: #f0f5ff; padding: 8px 12px; border-radius: 4px 4px 0 0; font-weight: bold; font-size: 13px; display: flex; align-items: center; gap: 8px;">
              <span>{{ group.deptName }}</span>
              <el-tag v-if="group.hasReplied" size="small" type="success">已处理{{ group.repliedByName ? '（' + group.repliedByName + '）' : '' }}</el-tag>
              <el-tag v-else size="small" type="danger">待处理</el-tag>
            </div>
            <div style="padding: 8px;">
              <el-table :data="group.recipients" border size="small" style="width: 100%;">
                <el-table-column prop="name" label="姓名" width="80"></el-table-column>
                <el-table-column label="角色" width="100">
                  <template #default="scope">
                    <el-tag size="small" :color="getRoleTagColor(getEffectiveRole(scope.row))" style="color:#fff;border:none;">
                      {{ getRoleDisplayName(getEffectiveRole(scope.row)) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="回复记录" min-width="220">
                  <template #default="scope">
                    <div v-if="getRecipientReplies(scope.row.recipient_id).length > 0">
                      <div v-for="(reply, idx) in getRecipientReplies(scope.row.recipient_id)" :key="idx">
                        <div class="recipient-reply-line">
                          <span :class="getReplyClass(reply)">
                            <strong>{{ getReceiverDisplayName(reply.senderId) }}</strong>
                            <span v-if="reply.targetRecipientId"> → {{ getReceiverDisplayName(reply.targetRecipientId) }}</span>
                            ：{{ reply.content }}
                          </span>
                          <span class="reply-time-mini">{{ formatTime(reply.createdAt) }}</span>
                          <el-button size="small" circle @click.stop="activeReplyId = reply.id; inlineReplyContent = ''" style="flex-shrink:0;padding:0 4px;min-width:auto;height:auto;font-size:13px;border:none;">💬</el-button>
                        </div>
                        <div v-if="activeReplyId === reply.id" style="display:flex;gap:4px;margin:4px 0 4px 0;align-items:center;flex-wrap:wrap;">
                          <el-input v-model="inlineReplyContent" size="small" placeholder="回复..." style="flex:1;" @keyup.enter="submitInlineReply(reply)" />
                          <el-button size="small" type="primary" @click="submitInlineReply(reply)" :loading="inlineReplyLoading">发送</el-button>
                          <el-button size="small" @click="cancelInlineReply">取消</el-button>
                          <div style="width:100%;display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
                            <el-tag v-for="(qr, qi) in quickReplies" :key="qi" size="small" style="cursor:pointer;margin:2px;" @click="inlineReplyContent = qr">{{ qr }}</el-tag>
                          </div>
                        </div>
                      </div>
                    </div>
                    <span v-else style="color:#999;">-</span>
                  </template>
                </el-table-column>
                <el-table-column label="已读" width="72" align="center">
                  <template #default="scope">
                    <el-tag v-if="scope.row.has_new_reply" size="small" type="warning" style="border:none;">新回复</el-tag>
                    <el-tag v-else-if="scope.row.is_read" size="small" type="success" style="border:none;">已读</el-tag>
                    <el-tag v-else size="small" type="info" style="border:none;">未读</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="红旗" width="50" align="center">
                  <template #default="scope">
                    <span v-if="scope.row.is_flagged" style="color:#f56c6c;font-size:14px;">🚩</span>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="72" align="center">
                  <template #default="scope">
                    <el-tag v-if="scope.row.is_completed" size="small" type="success">完结</el-tag>
                    <el-tag v-else-if="scope.row.has_replied" size="small" type="success">已回复</el-tag>
                    <el-tag v-else size="small" type="danger">未回复</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </div>
        <!-- 已撤回消息显示传统表格 -->
        <el-table v-else :data="selectedMessage.recipientDetails || []" border size="small" style="width: 100%;">
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
          <!-- 回复全部的 Thread -->
          <div v-if="buildThreads(selectedMessage).all.length > 0" class="thread-card" style="border: 1px solid #ebeef5; border-radius: 6px; margin-bottom: 12px;">
            <div class="thread-header" style="background: #f0f9eb; padding: 8px 12px; border-radius: 6px 6px 0 0; font-weight: bold; font-size: 13px;">
              📢 回复全部接收人
            </div>
            <div class="thread-body" style="padding: 8px 12px;">
              <div v-for="(reply, idx) in buildThreads(selectedMessage).all" :key="idx">
                <div class="reply-item" style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                  <div class="reply-content" style="flex:1;">
                    <p><strong>{{ getUserDisplayName(reply.senderId) }}：</strong>{{ reply.content }}</p>
                    <p class="reply-time">{{ formatTime(reply.createdAt) }}</p>
                  </div>
                  <div class="reply-reactions" style="flex-shrink:0; display:flex; gap:4px;">
                    <el-button :type="getMyReactionType('reply', reply.id) === 'like' ? 'primary' : 'default'" size="small" @click="handleReaction('reply', reply.id, 'like')">👍 {{ getLikeCount('reply', reply.id) }}</el-button>
                    <el-button :type="getMyReactionType('reply', reply.id) === 'dislike' ? 'danger' : 'default'" size="small" @click="handleReaction('reply', reply.id, 'dislike')">👎 {{ getDislikeCount('reply', reply.id) }}</el-button>
                    <el-button size="small" circle @click.stop="activeReplyId = reply.id; inlineReplyContent = ''" style="padding:0 4px;min-width:auto;height:auto;font-size:13px;border:none;">💬</el-button>
                  </div>
                </div>
                <div v-if="activeReplyId === reply.id" style="display:flex;gap:4px;margin:4px 0 8px 0;align-items:center;flex-wrap:wrap;">
                  <el-input v-model="inlineReplyContent" size="small" placeholder="回复..." style="flex:1;" @keyup.enter="submitInlineReply(reply)" />
                  <el-button size="small" type="primary" @click="submitInlineReply(reply)" :loading="inlineReplyLoading">发送</el-button>
                  <el-button size="small" @click="cancelInlineReply">取消</el-button>
                  <div style="width:100%;display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
                    <el-tag v-for="(qr, qi) in quickReplies" :key="qi" size="small" style="cursor:pointer;margin:2px;" @click="inlineReplyContent = qr">{{ qr }}</el-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- 按接收人分组的 Thread -->
          <div v-for="(thread, tIdx) in buildThreads(selectedMessage).threads" :key="tIdx" class="thread-card" style="border: 1px solid #ebeef5; border-radius: 6px; margin-bottom: 12px;">
            <div class="thread-header" 
              style="background: #ecf5ff; padding: 8px 12px; border-radius: 6px 6px 0 0; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
              @click="toggleCollapsed(thread.recipient.recipient_id)"
            >
              <span style="font-weight: bold; font-size: 13px;">
                💬 与 {{ thread.recipient.name || '未知' }} 的对话
                <el-tag v-if="thread.recipient.has_replied" size="small" type="success" style="margin-left: 6px;">已回复</el-tag>
                <el-tag v-else size="small" type="danger" style="margin-left: 6px;">未回复</el-tag>
              </span>
              <span>{{ threadCollapsed[thread.recipient.recipient_id] ? '▸' : '▾' }}</span>
            </div>
            <div v-show="!threadCollapsed[thread.recipient.recipient_id]" class="thread-body" style="padding: 8px 12px;">
              <div v-for="(reply, idx) in thread.replies" :key="idx">
                <div class="reply-item" style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px;">
                  <div class="reply-content" style="flex:1;">
                    <p><strong>{{ getUserDisplayName(reply.senderId) }}：</strong>{{ reply.content }}</p>
                    <p class="reply-time">{{ formatTime(reply.createdAt) }}</p>
                  </div>
                  <div class="reply-reactions" style="flex-shrink:0; display:flex; gap:4px;">
                    <el-button :type="getMyReactionType('reply', reply.id) === 'like' ? 'primary' : 'default'" size="small" @click="handleReaction('reply', reply.id, 'like')">👍 {{ getLikeCount('reply', reply.id) }}</el-button>
                    <el-button :type="getMyReactionType('reply', reply.id) === 'dislike' ? 'danger' : 'default'" size="small" @click="handleReaction('reply', reply.id, 'dislike')">👎 {{ getDislikeCount('reply', reply.id) }}</el-button>
                    <el-button size="small" circle @click.stop="activeReplyId = reply.id; inlineReplyContent = ''" style="padding:0 4px;min-width:auto;height:auto;font-size:13px;border:none;">💬</el-button>
                  </div>
                </div>
                <div v-if="activeReplyId === reply.id" style="display:flex;gap:4px;margin:4px 0 8px 0;align-items:center;flex-wrap:wrap;">
                  <el-input v-model="inlineReplyContent" size="small" placeholder="回复..." style="flex:1;" @keyup.enter="submitInlineReply(reply)" />
                  <el-button size="small" type="primary" @click="submitInlineReply(reply)" :loading="inlineReplyLoading">发送</el-button>
                  <el-button size="small" @click="cancelInlineReply">取消</el-button>
                  <div style="width:100%;display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
                    <el-tag v-for="(qr, qi) in quickReplies" :key="qi" size="small" style="cursor:pointer;margin:2px;" @click="inlineReplyContent = qr">{{ qr }}</el-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!selectedMessage?.isRecalled && (!selectedMessage.replies || selectedMessage.replies.length === 0)" class="no-reply">暂无回复</div>
        
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
            style="min-width:110px"
          >同意</el-button>
          <el-button 
            v-if="!selectedMessage?.myCompleted && !selectedMessage?.isCompleted"
            type="danger" 
            class="quick-btn reject-btn"
            @click="sendQuickReply('拒绝')"
            :loading="replyLoading"
            style="min-width:110px"
          >拒绝</el-button>
          <el-button 
            v-if="!selectedMessage?.myCompleted && !selectedMessage?.isCompleted"
            type="info"
            class="quick-btn pending-btn"
            @click="sendQuickReply('等我确认后回复')"
            :loading="replyLoading"
            style="min-width:110px"
          >等我确认后回复</el-button>
          <el-button 
            v-if="myRecipient"
            :type="myRecipient.is_flagged ? 'warning' : 'default'"
            @click="toggleFlagFromDetail"
          >
            {{ myRecipient.is_flagged ? '取消红旗' : '标记红旗' }}
          </el-button>
          <el-button type="primary" v-if="!selectedMessage?.isRecalled" @click="submitReplyFromDetail" :loading="replyLoading">发送回复</el-button>
          <el-button type="primary" size="small" @click="showForwardDialog(selectedMessage)" v-if="!selectedMessage?.isRecalled">转发</el-button>
          <el-button type="info" plain @click="detailVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 转发弹窗 -->
    <el-dialog title="转发消息" v-model="forwardDialogVisible" width="600px" :close-on-click-modal="false">
      <div v-if="forwardTarget">
        <div style="margin-bottom: 16px; padding: 12px; background: #f5f7fa; border-radius: 6px;">
          <div style="font-weight: 600; margin-bottom: 8px;">原消息摘要</div>
          <div style="font-size: 13px; color: #606266;">
            <div>发送人：{{ getSenderName(forwardTarget.senderId) }}</div>
            <div>类型：{{ getTypeName(forwardTarget.type) }}</div>
            <div v-if="forwardTarget.content" style="margin-top: 4px;">内容：{{ forwardTarget.content }}</div>
          </div>
        </div>
        <el-form>
          <el-form-item label="转发附言">
            <el-input v-model="forwardNote" type="textarea" :rows="2" placeholder="添加转发附言（可选）" />
          </el-form-item>
          <el-form-item label="接收人" prop="recipients">
            <el-select
              v-model="forwardRecipients"
              multiple
              filterable
              reserve-keyword
              placeholder="搜索选择接收人..."
              style="width: 100%;"
              :teleported="false"
            >
              <el-option
                v-for="u in allUsers"
                :key="u.id"
                :label="u.name"
                :value="u.id"
              >
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-weight:500;">{{ u.name }}</span>
                  <span style="color:#999;font-size:12px;">{{ u.department || '-' }}</span>
                </div>
              </el-option>
            </el-select>
            <div style="color: #999; font-size: 12px; margin-top: 4px;">
              已选择 {{ forwardRecipients.length }} 人
            </div>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="forwardDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmForward" :loading="forwardLoading" :disabled="forwardRecipients.length === 0">确认转发</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, CircleCheck, CircleClose, Document } from '@element-plus/icons-vue';
import { communicationAPI, userAPI, reactionAPI, getRoleDisplayName, ROLE_OPTIONS } from '../api';
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
const threadCollapsed = ref({});
// inline 回复（回复记录中追加回复）
const activeReplyId = ref(null);
const inlineReplyContent = ref('');
const inlineReplyLoading = ref(false);

// 转发相关
const forwardDialogVisible = ref(false);
const forwardTarget = ref(null);
const forwardRecipients = ref([]);
const forwardNote = ref('');
const forwardLoading = ref(false);

// 快捷回复预设
const quickReplies = ['收到，已安排', '样品已收到，正在检测', '报告已出具，请查收', '预计 X 个工作日出报告', '数据确认中，稍后回复'];

function toggleCollapsed(recipientId) {
  threadCollapsed.value = { ...threadCollapsed.value, [recipientId]: !threadCollapsed.value[recipientId] };
}

const buildThreads = (comm) => {
  return communicationAPI.buildThreads ? communicationAPI.buildThreads(comm) : { all: comm.replies || [], threads: [] };
};

// ===== 接收人部门分组（与已发送详情样式一致） =====

// 获取某个接收人的所有回复
const getRecipientReplies = (recipientId) => {
  if (!selectedMessage.value || !selectedMessage.value.replies) return [];
  return selectedMessage.value.replies.filter(r =>
    r.senderId === recipientId || r.targetRecipientId === recipientId
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// 所有接收人按部门分组（不依赖 departmentCardIds，新旧消息均适用）
const getAllDeptGroups = (comm) => {
  if (!comm) return [];
  const recipients = comm.recipientDetails || [];
  const groups = {};
  recipients.forEach(r => {
    const dept = r.department_level3 || r.department || '未分组';
    if (!groups[dept]) {
      groups[dept] = { deptName: dept, recipients: [], hasReplied: false, repliedByName: '' };
    }
    groups[dept].recipients.push(r);
    if (r.has_replied) {
      groups[dept].hasReplied = true;
      if (r.replied_by) groups[dept].repliedByName = r.replied_by;
    }
  });
  return Object.values(groups);
};

// 获取回复内容的样式类
const getReplyClass = (reply) => {
  if (!reply || !reply.content) return '';
  if (reply.content === '同意') return 'reply-agree';
  if (reply.content === '拒绝') return 'reply-reject';
  if (reply.targetRecipientId) return 'reply-follow-up';
  return 'reply-normal';
};

// 在接收人状态卡片中显示名字（优先从 recipientDetails 查找，回退到 allUsers）
const getReceiverDisplayName = (userId) => {
  if (!selectedMessage.value) return '未知';
  const recipient = selectedMessage.value.recipientDetails?.find(r => r.recipient_id === userId);
  if (recipient) return recipient.name || '未知';
  if (userId === selectedMessage.value.senderId) return selectedMessage.value.senderName || '发起人';
  const user = allUsers.value.find(u => u.id === userId);
  return user ? (user.name || user.username) : '未知';
};

// 获取有效角色：如果 row.role 为 null，从 allUsers 中查找
const getEffectiveRole = (row) => {
  if (row.role) return row.role;
  const user = allUsers.value.find(u => u.id === row.recipient_id);
  return user?.role || null;
};

// 角色标签颜色映射
const roleTagColors = {
  business: '#9b59b6',
  business_assistant: '#d4a574',
  inspection_leader: '#67c23a',
  inspection_leader_assistant: '#ff69b4'
};
const colorCycle = ['#409eff', '#e6a23c', '#f56c6c', '#00BCD4', '#FF9800', '#795548', '#607D8B', '#E91E63'];
let roleColorIndex = {};

const getRoleTagColor = (role) => {
  if (!role) return '#909399';
  if (roleTagColors[role]) return roleTagColors[role];
  if (roleColorIndex[role] === undefined) {
    roleColorIndex[role] = Object.keys(roleColorIndex).length % colorCycle.length;
  }
  return colorCycle[roleColorIndex[role]];
};

const searchKeyword = ref('');
const searchKeywordProcessed = ref('');
const searchKeywordCompleted = ref('');
const searchKeywordRecalled = ref('');
const searchKeywordFlagged = ref('');
const showFlaggedOnly = ref(false);

// 分页状态
const currentPage = ref(1);
const pageSize = 50;
const totalMessages = ref(0);
const loadingMore = ref(false);
const hasMore = computed(() => currentPage.value * pageSize < totalMessages.value);

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

const loadMessages = async (page = 1, append = false) => {
  loading.value = !append;
  loadingMore.value = append;
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const response = await communicationAPI.getAll(authUser.id, page, pageSize);
      totalMessages.value = response.total || 0;
      currentPage.value = page;
      
      const newMessages = (response.data || []).map(c => {
        const recipients = c.recipientDetails || [];
        const myRec = recipients.find(r => r.recipient_id === authUser.id);
        return {
          ...c,
          myRead: myRec?.is_read || false,
          hasReplied: myRec?.has_replied || false,
          myCompleted: myRec?.is_completed || false,
          isCompleted: c.isCompleted || false,
          hasFlagged: myRec?.is_flagged || false,
          replyCount: c.replies?.length || 0,
          allRecipientsCompleted: recipients.every(r => r.is_completed)
        };
      });

      if (append) {
        // 追加模式：去重合并
        const existingIds = new Set(messages.value.map(m => m.id));
        const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
        messages.value = [...messages.value, ...uniqueNew];
      } else {
        messages.value = newMessages;
      }
    }
  } catch (error) {
    ElMessage.error('加载消息失败');
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const loadMore = () => {
  if (loadingMore.value || !hasMore.value) return;
  loadMessages(currentPage.value + 1, true);
};

// 全部消息：所有未撤回且非系统通知的消息
const allMessages = computed(() => {
  let result = messages.value.filter(m => !m.isSystemNotification);

  // 红旗过滤
  if (showFlaggedOnly.value) {
    result = result.filter(r => r.hasFlagged);
  }

  // 模糊搜索
  const kw = searchKeyword.value.trim().toLowerCase();
  if (kw) {
    result = result.filter(r => {
      const senderName = (getSenderName(r.senderId) || '').toLowerCase();
      return (r.content || '').toLowerCase().includes(kw) ||
             senderName.includes(kw) ||
             (r.type || '').toLowerCase().includes(kw);
    });
  }

  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
});

// 待处理消息：未回复 且 我个人未完结 且 全局未完结 且 未撤回 且 非系统通知
const pendingMessages = computed(() => {
  let result = messages.value.filter(m => 
    !m.hasReplied && !m.myCompleted && !m.isCompleted && !m.isRecalled && !m.isSystemNotification
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

// 已处理消息：已回复 且 我个人未完结 且 全局未完结 且 未撤回 且 非系统通知
const processedMessages = computed(() => {
  let result = messages.value.filter(m => 
    m.hasReplied && !m.myCompleted && !m.isCompleted && !m.isSystemNotification
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

// 已完结消息：我个人已完结 或 全局已完结 且 未撤回 且 非系统通知
const completedMessages = computed(() => {
  let result = messages.value.filter(m => 
    (m.myCompleted || m.isCompleted) && !m.isSystemNotification
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

// 红旗消息：所有标记红旗的消息
const flaggedMessages = computed(() => {
  let result = messages.value.filter(m => !m.isSystemNotification && m.hasFlagged);

  // 模糊搜索
  const kw = searchKeywordFlagged.value.trim().toLowerCase();
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

  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
});

// 表格行样式：待处理消息显示淡蓝色底色
const tableRowClassName = ({ row }) => {
  if (row.isRecalled) return 'recalled-row'
  if (!row.hasReplied && !row.isCompleted) return 'pending-row'
  return ''
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
  // 重新获取完整的消息详情（包含所有接收人）
  const response = await communicationAPI.getById(message.id);
  selectedMessage.value = JSON.parse(JSON.stringify(response.data));
  replyContent.value = '';
  // 获取发送人详情
  senderDetail.value = allUsers.value.find(u => u.id === response.data.senderId) || null;
  // 获取我的接收人记录
  myRecipient.value = (response.data.recipientDetails || []).find(r => r.recipient_id === currentUserId.value) || null;
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

// 提交 inline 回复（回复记录中的追加回复）
const submitInlineReply = async (reply) => {
  const content = inlineReplyContent.value.trim();
  if (!content) {
    ElMessage.warning('请输入回复内容');
    return;
  }
  inlineReplyLoading.value = true;
  try {
    await communicationAPI.createReply(selectedMessage.value.id, {
      content,
      targetRecipientId: reply.senderId
    }, true);
    ElMessage.success('回复成功');
    inlineReplyContent.value = '';
    activeReplyId.value = null;
    // 重新加载详情
    const { data } = await communicationAPI.getById(selectedMessage.value.id);
    selectedMessage.value = data;
  } catch (error) {
    ElMessage.error('回复失败：' + (error.message || '未知错误'));
  } finally {
    inlineReplyLoading.value = false;
  }
};

const cancelInlineReply = () => {
  activeReplyId.value = null;
  inlineReplyContent.value = '';
};

// 转发相关
const showForwardDialog = (comm) => {
  if (!comm) return;
  forwardTarget.value = comm;
  forwardRecipients.value = [];
  forwardNote.value = '';
  forwardDialogVisible.value = true;
  loadForwardUsers();
};

const loadForwardUsers = async () => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('profiles')
      .select('id, name, department, role')
      .neq('id', authUser?.id || '')
      .order('name');
    if (data) allUsers.value = data;
  } catch (e) {
    console.error('加载用户列表失败:', e);
  }
};

const confirmForward = async () => {
  if (!forwardTarget.value || forwardRecipients.value.length === 0) {
    ElMessage.warning('请选择接收人');
    return;
  }
  forwardLoading.value = true;
  try {
    await communicationAPI.forwardMessage(forwardTarget.value.id, {
      recipientIds: forwardRecipients.value,
      note: forwardNote.value
    });
    ElMessage.success('转发成功');
    forwardDialogVisible.value = false;
  } catch (e) {
    ElMessage.error('转发失败：' + (e.message || '未知错误'));
  } finally {
    forwardLoading.value = false;
  }
};


const submitReplyFromDetail = async () => {
  if (!replyContent.value.trim()) {
    ElMessage.error('请输入回复内容');
    return;
  }
  const skipReplied = replyContent.value.trim() === '等我确认后回复';
  await doSendReply(replyContent.value, skipReplied);
};

// 发送快捷回复
const sendQuickReply = async (content) => {
  const skipReplied = content === '等我确认后回复';
  await doSendReply(content, skipReplied);
};

// 从表格行发送快捷回复
const sendQuickReplyFromRow = async (row, content) => {
  const skipReplied = content === '等我确认后回复';
  replyLoading.value = true;
  try {
    await communicationAPI.createReply(row.id, { content }, skipReplied);
    ElMessage.success('回复成功');
    // 更新本地状态
    const idx = messages.value.findIndex(m => m.id === row.id);
    if (idx >= 0) {
      messages.value[idx].hasReplied = !skipReplied;
      if (content === '同意') {
        messages.value[idx].myCompleted = true;
      }
    }
  } catch (error) {
    ElMessage.error('回复失败：' + (error.message || '未知错误'));
  } finally {
    replyLoading.value = false;
  }
};

// 实际发送回复
const doSendReply = async (content, skipReplied = false) => {
  replyLoading.value = true;
  try {
    await communicationAPI.createReply(selectedMessage.value.id, {
      content: content
    }, skipReplied);
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
      (payload) => handleNewMessage(payload.new)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'communication_recipients' },
      (payload) => handleRecipientUpdate(payload.new)
    )
    .subscribe();
};

const handleNewMessage = async (newComm) => {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return;
  
  // 实时订阅返回的是原始数据，检查 communication_recipients 或 recipient_ids
  const recipientIds = newComm.recipient_ids || 
    (newComm.communication_recipients ? newComm.communication_recipients.map(r => r.recipient_id) : []);
  if (!recipientIds.includes(authUser.id)) return;
  
  const response = await communicationAPI.getById(newComm.id);
  if (response.data) {
    const recipients = response.data.recipientDetails || [];
    const myRec = recipients.find(r => r.recipient_id === authUser.id);
    const formatted = {
      ...response.data,
      myRead: myRec?.is_read || false,
      hasReplied: myRec?.has_replied || false,
      myCompleted: myRec?.is_completed || false,
      isCompleted: response.data.isCompleted || false,
      hasFlagged: myRec?.is_flagged || false,
      replyCount: response.data.replies?.length || 0,
      allRecipientsCompleted: recipients.every(r => r.is_completed)
    };
    messages.value.unshift(formatted);
    ElMessage.info('收到新消息');
  }
};

const handleRecipientUpdate = async (updatedRecipient) => {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser || updatedRecipient.recipient_id !== authUser.id) return;
  
  const idx = messages.value.findIndex(m => m.id === updatedRecipient.communication_id);
  if (idx >= 0) {
    messages.value[idx] = {
      ...messages.value[idx],
      myRead: updatedRecipient.is_read,
      hasReplied: updatedRecipient.has_replied,
      myCompleted: updatedRecipient.is_completed,
      hasFlagged: updatedRecipient.is_flagged
    };
  }
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

/* 已撤回行 - 淡红色底色 */
:deep(.recalled-row) {
  background-color: #fff0f0 !important;
}

:deep(.recalled-row:hover) {
  background-color: #ffe0e0 !important;
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

/* 接收人状态卡片中的回复记录样式 */
.recipient-reply-line {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: 2px 0;
  font-size: 12px;
  line-height: 1.5;
}
.recipient-reply-line + .recipient-reply-line {
  border-top: 1px dashed #eee;
  margin-top: 2px;
  padding-top: 4px;
}
.reply-time-mini {
  white-space: nowrap;
  color: #999;
  font-size: 11px;
  flex-shrink: 0;
}
.reply-agree { color: #67c23a; }
.reply-reject { color: #f56c6c; }
.reply-follow-up { color: #2b579a; font-style: italic; }
.reply-normal { color: #333; }
</style>
