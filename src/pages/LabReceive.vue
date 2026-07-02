<template>
  <div class="lab-receive">
    <h2 class="page-title">接收消息</h2>

    <el-tabs v-model="activeTab" class="message-tabs">
      <!-- 待处理标签页 -->
      <el-tab-pane name="pending">
        <template #label>
          <span>待处理 ({{ pendingMessages.length }})</span>
        </template>
        <div class="table-toolbar">
          <div class="toolbar-left">
            <el-input
              v-model="searchInput"
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

        <template v-for="(msgs, label) in groupedPendingMessages" :key="label">
        <div class="date-group-header">{{ label }}</div>
        <el-table :data="msgs" border stripe v-loading="loading" :row-class-name="tableRowClassName" @row-click="viewDetail">
          <!-- 状态列 - 移到最前面 -->
          <el-table-column label="状态" width="120" align="center" fixed="left">
            <template #default="scope">
              <template v-if="scope.row.isCC">
                <el-tag size="small" type="info">抄送</el-tag>
              </template>
              <template v-else>
                <el-tag v-if="scope.row.myCompleted || scope.row.isCompleted" size="small" type="info">已完结</el-tag>
                <el-tag v-if="scope.row.isRecalled" size="small" type="warning">已撤回</el-tag>
                <el-tag v-else-if="scope.row.hasReplied" size="small" type="success">已回复</el-tag>
                <el-tag v-else size="small" type="warning">待处理</el-tag>
              </template>
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

          <el-table-column label="沟通内容" min-width="220" show-overflow-tooltip>
            <template #default="scope">
              <div style="display:flex;align-items:center;gap:4px;">
                <el-tag v-if="scope.row.forwardedFrom" size="small" type="warning" effect="dark" style="font-size:10px;height:20px;line-height:18px;flex-shrink:0;">转发</el-tag>
                <span>{{ scope.row.content || '-' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="发送人">
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
                <el-button size="small" @click.stop="$router.push('/sample-timeline?sampleCode='+scope.row.sampleCode)">时间线</el-button>
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
        </template>

        <div v-if="pendingMessages.length === 0 && !loading" class="empty-state">
          暂无待处理消息
        </div>
      </el-tab-pane>

      <!-- 已处理标签页 -->
      <el-tab-pane name="processed">
        <template #label>
          <span>已处理 ({{ processedMessages.length }})</span>
        </template>
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

        <template v-for="(msgs, label) in groupedProcessedMessages" :key="label">
        <div class="date-group-header">{{ label }}</div>
        <el-table :data="msgs" border stripe v-loading="loading" :row-class-name="tableRowClassName" @row-click="viewDetail">
          <!-- 状态列 - 移到最前面 -->
          <el-table-column label="状态" width="120" align="center" fixed="left">
            <template #default="scope">
              <template v-if="scope.row.isCC">
                <el-tag size="small" type="info">抄送</el-tag>
              </template>
              <template v-else>
                <el-tag v-if="scope.row.myCompleted || scope.row.isCompleted" size="small" type="info">已完结</el-tag>
                <el-tag v-if="scope.row.isRecalled" size="small" type="warning">已撤回</el-tag>
                <el-tag v-else-if="scope.row.hasReplied" size="small" type="success">已回复</el-tag>
                <el-tag v-else size="small" type="warning">待处理</el-tag>
              </template>
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
              <el-button size="small" @click.stop="viewDetail(scope.row)">查看</el-button>
              <el-button size="small" @click.stop="$router.push('/sample-timeline?sampleCode='+scope.row.sampleCode)">时间线</el-button>
              <el-button 
                size="small" 
                type="primary"
                @click.stop="replyFromTable(scope.row)"
              >
                回复
              </el-button>
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
        </template>

        <div v-if="processedMessages.length === 0 && !loading" class="empty-state">
          暂无已处理消息
        </div>
      </el-tab-pane>

      <!-- 已完结标签页 -->
      <el-tab-pane name="completed">
        <template #label>
          <span>已完结 ({{ completedMessages.length }})</span>
        </template>
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

        <template v-for="(msgs, label) in groupedCompletedMessages" :key="label">
        <div class="date-group-header">{{ label }}</div>
        <el-table :data="msgs" border stripe v-loading="loading" :row-class-name="tableRowClassName" @row-click="viewDetail">
          <!-- 状态列 - 移到最前面 -->
          <el-table-column label="状态" width="120" align="center" fixed="left">
            <template #default="scope">
              <template v-if="scope.row.isCC">
                <el-tag size="small" type="info">抄送</el-tag>
              </template>
              <template v-else>
                <el-tag size="small" type="info">已完结</el-tag>
              </template>
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
              <el-button size="small" @click.stop="viewDetail(scope.row)">查看</el-button>
              <el-button size="small" @click.stop="$router.push('/sample-timeline?sampleCode='+scope.row.sampleCode)">时间线</el-button>
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
        </template>

        <div v-if="completedMessages.length === 0 && !loading" class="empty-state">
          暂无已完结消息
        </div>
      </el-tab-pane>

      <!-- 已被撤回标签页 -->
      <el-tab-pane name="recalled">
        <template #label>
          <span>已被撤回 ({{ recalledMessages.length }})</span>
        </template>
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

        <template v-for="(msgs, label) in groupedRecalledMessages" :key="label">
        <div class="date-group-header">{{ label }}</div>
        <el-table :data="msgs" border stripe v-loading="loading" @row-click="viewDetail">
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
          <el-table-column label="沟通内容" min-width="220" show-overflow-tooltip>
            <template #default="scope">
              <div style="display:flex;align-items:center;gap:4px;">
                <el-tag v-if="scope.row.forwardedFrom" size="small" type="warning" effect="dark" style="font-size:10px;height:20px;line-height:18px;flex-shrink:0;">转发</el-tag>
                <span>{{ scope.row.content || '-' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="发送人">
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
        </template>

        <div v-if="recalledMessages.length === 0 && !loading" class="empty-state">
          暂无已被撤回的消息
        </div>
      </el-tab-pane>
      <!-- 全部 -->
      <el-tab-pane name="all">
        <template #label>
          <span>全部 ({{ allMessages.length }})</span>
        </template>
        <div class="table-toolbar">
          <div class="toolbar-left">
            <el-input
              v-model="searchInput"
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

        <template v-for="(msgs, label) in groupedAllMessages" :key="label">
        <div class="date-group-header">{{ label }}</div>
        <el-table :data="msgs" border stripe v-loading="loading" :row-class-name="tableRowClassName" @row-click="viewDetail">
          <el-table-column label="状态" width="120" align="center" fixed="left">
            <template #default="scope">
              <template v-if="scope.row.isCC">
                <el-tag size="small" type="info">抄送</el-tag>
              </template>
              <template v-else>
                <el-tag v-if="scope.row.myCompleted || scope.row.isCompleted" size="small" type="info">已完结</el-tag>
                <el-tag v-if="scope.row.isRecalled" size="small" type="warning">已撤回</el-tag>
                <el-tag v-else-if="scope.row.hasReplied" size="small" type="success">已回复</el-tag>
                <el-tag v-else size="small" type="warning">待处理</el-tag>
              </template>
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

          <el-table-column label="沟通内容" min-width="220" show-overflow-tooltip>
            <template #default="scope">
              <div style="display:flex;align-items:center;gap:4px;">
                <el-tag v-if="scope.row.forwardedFrom" size="small" type="warning" effect="dark" style="font-size:10px;height:20px;line-height:18px;flex-shrink:0;">转发</el-tag>
                <span>{{ scope.row.content || '-' }}</span>
              </div>
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
                  v-if="!scope.row.isCompleted && !scope.row.isRecalled && !scope.row.myCompleted"
                  size="small"
                  type="warning"
                  @click.stop="showActionDialog(scope.row)"
                >处理</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        </template>
        <div v-if="allMessages.length === 0 && !loading" class="empty-tip">
          {{ showFlaggedOnly ? '暂无带红旗的消息' : '暂无消息' }}
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 详情弹窗 -->
    <el-dialog title="消息详情" v-model="detailVisible" width="1125px">
      <div v-if="selectedMessage" class="detail-content-wrapper" :style="getDetailStyle(selectedMessage.type)">
        <!-- ===== 追加转发消息 ===== -->
        <template v-if="selectedMessage?.isAppendForward">
          <!-- ① 系统通知卡片（最上方） -->
          <div style="background:#FCEBEB;border:2px solid #A32D2D;border-left:6px solid #A32D2D;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="background:#A32D2D;color:white;font-size:11px;padding:2px 8px;border-radius:4px;font-weight:500;">系统通知</span>
              <span style="font-weight:500;font-size:14px;color:#A32D2D;">沟通发起人对所有人追加发送了消息</span>
            </div>
            <div style="font-size:13px;color:#791F1F;line-height:1.5;">
              此消息为沟通发起人对历史消息的追加回复，所有收件人的回复状态已重置为"待处理"，请重新回复确认。
            </div>
          </div>

          <!-- ② 追加消息内容展示 -->
          <div style="background:#FFFBE6;border:1px solid #FFE58F;border-left:4px solid #FAAD14;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
            <div style="font-size:14px;color:#8C6E00;margin-bottom:8px;">追加对所有人发送的消息：</div>
            <div style="font-size:14px;font-weight:700;color:#000;line-height:1.6;white-space:pre-wrap;">{{ selectedMessage.content }}</div>
          </div>

          <!-- ③ 原消息引用卡片 -->
          <div v-if="forwardedOriginalMsg" class="forward-reference-card" style="margin-bottom: 20px; border: 4px solid #409eff; border-left: 8px solid #409eff; background: #dceefb; border-radius: 10px; padding: 18px;">
            <div class="fwd-badge" style="display:inline-block;background:#409eff;color:#fff;padding:4px 14px;border-radius:6px;font-size:14px;font-weight:700;margin-bottom:10px;">转发</div>
            <div class="fwd-title" style="font-size:16px;font-weight:700;margin-bottom:12px;">以下为 {{ forwardedOriginalMsg.senderName }} 发送的原消息</div>
            <el-descriptions :column="2" border size="small" class="fwd-descriptions">
              <el-descriptions-item label="沟通类型">{{ getTypeName(forwardedOriginalMsg.type) }}</el-descriptions-item>
              <el-descriptions-item label="是否V1V2客户">{{ forwardedOriginalMsg.vip === 'yes' ? '是' : '否' }}</el-descriptions-item>
              <el-descriptions-item label="客户名称">{{ forwardedOriginalMsg.customerName || '-' }}</el-descriptions-item>
              <el-descriptions-item label="样品短号">{{ forwardedOriginalMsg.sampleCode || '-' }}</el-descriptions-item>
              <el-descriptions-item label="样品基质">{{ forwardedOriginalMsg.sampleMatrix || '-' }}</el-descriptions-item>
              <el-descriptions-item label="样品数量">{{ forwardedOriginalMsg.sampleCount || '-' }}</el-descriptions-item>
              <el-descriptions-item label="测试项目">{{ forwardedOriginalMsg.testItems || '-' }}</el-descriptions-item>
              <el-descriptions-item label="到样日期">{{ forwardedOriginalMsg.sampleDate || '-' }}</el-descriptions-item>
              <el-descriptions-item label="测试费用">{{ forwardedOriginalMsg.chargeStatus || '-' }}</el-descriptions-item>
              <el-descriptions-item label="加急费用">{{ forwardedOriginalMsg.urgentFee || '-' }}</el-descriptions-item>
              <el-descriptions-item label="发送时间">{{ formatTime(forwardedOriginalMsg.createdAt) }}</el-descriptions-item>
              <el-descriptions-item v-if="forwardedOriginalMsg.remark" label="备注" :span="2">{{ forwardedOriginalMsg.remark }}</el-descriptions-item>
              <el-descriptions-item label="沟通内容" :span="2">{{ forwardedOriginalMsg.content || '-' }}</el-descriptions-item>
            </el-descriptions>
            <div style="font-size: 12px; color: #909399; margin-top: 8px;">
              原接收人：{{ (forwardedOriginalMsg.recipientDetails || []).map(r => r.name || '').join('、') || '-' }}
            </div>
          </div>
        </template>

        <!-- ===== 普通转发消息：原消息引用卡片（非追加转发时） ===== -->
        <div v-else-if="selectedMessage?.forwardedFrom && forwardedOriginalMsg" class="forward-reference-card" style="margin-bottom: 20px; border: 4px solid #409eff; border-left: 8px solid #409eff; background: #dceefb; border-radius: 10px; padding: 18px;">
          <div class="fwd-badge" style="display:inline-block;background:#409eff;color:#fff;padding:4px 14px;border-radius:6px;font-size:14px;font-weight:700;margin-bottom:10px;">转发</div>
          <div class="fwd-title" style="font-size:16px;font-weight:700;margin-bottom:12px;">以下为 {{ forwardedOriginalMsg.senderName }} 发送的原消息</div>
          <el-descriptions :column="2" border size="small" class="fwd-descriptions">
            <el-descriptions-item label="沟通类型">{{ getTypeName(forwardedOriginalMsg.type) }}</el-descriptions-item>
            <el-descriptions-item label="是否V1V2客户">{{ forwardedOriginalMsg.vip === 'yes' ? '是' : '否' }}</el-descriptions-item>
            <el-descriptions-item label="客户名称">{{ forwardedOriginalMsg.customerName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="样品短号">{{ forwardedOriginalMsg.sampleCode || '-' }}</el-descriptions-item>
            <el-descriptions-item label="样品基质">{{ forwardedOriginalMsg.sampleMatrix || '-' }}</el-descriptions-item>
            <el-descriptions-item label="样品数量">{{ forwardedOriginalMsg.sampleCount || '-' }}</el-descriptions-item>
            <el-descriptions-item label="测试项目">{{ forwardedOriginalMsg.testItems || '-' }}</el-descriptions-item>
            <el-descriptions-item label="到样日期">{{ forwardedOriginalMsg.sampleDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="测试费用">{{ forwardedOriginalMsg.chargeStatus || '-' }}</el-descriptions-item>
            <el-descriptions-item label="加急费用">{{ forwardedOriginalMsg.urgentFee || '-' }}</el-descriptions-item>
            <el-descriptions-item label="发送时间">{{ formatTime(forwardedOriginalMsg.createdAt) }}</el-descriptions-item>
            <el-descriptions-item v-if="forwardedOriginalMsg.remark" label="备注" :span="2">{{ forwardedOriginalMsg.remark }}</el-descriptions-item>
            <el-descriptions-item label="沟通内容" :span="2">{{ forwardedOriginalMsg.content || '-' }}</el-descriptions-item>
          </el-descriptions>
          <div style="font-size: 12px; color: #909399; margin-top: 8px;">
            原接收人：{{ (forwardedOriginalMsg.recipientDetails || []).map(r => r.name || '').join('、') || '-' }}
          </div>
        </div>

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
          <el-descriptions-item label="沟通内容" :span="2">{{ selectedMessage.content || '-' }}</el-descriptions-item>
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

        <h4 style="margin-top: 20px;">{{ forwardedOriginalMsg ? '原接收人状态' : '接收人状态' }}</h4>
        <div v-if="!selectedMessage?.isRecalled">
          <div v-for="(group, gIdx) in getAllDeptGroups(statusMessage)" :key="gIdx" style="margin-bottom: 12px; border: 1px solid #ebeef5; border-radius: 4px; padding: 0;">
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
        <el-table v-else :data="statusMessage.recipientDetails || []" border size="small" style="width: 100%;">
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
        
        <!-- 抄送人展示区 -->
        <template v-if="statusMessage.recipientDetails && statusMessage.recipientDetails.filter(r => r.is_cc).length > 0">
          <h4 style="margin-top: 20px;">抄送人</h4>
          <div style="margin-bottom: 12px;">
            <div v-for="(r, idx) in statusMessage.recipientDetails.filter(r => r.is_cc)" :key="idx" style="display:flex;align-items:center;gap:8px;padding:4px 0;">
              <el-tag size="small" type="info" style="flex-shrink:0;">抄送</el-tag>
              <span style="font-weight:500;">{{ r.name || '-' }}</span>
              <span style="color:#999;font-size:12px;">{{ r.department || '-' }}</span>
            </div>
          </div>
        </template>

        <h4 v-if="!selectedMessage?.isRecalled" style="margin-top: 20px;">回复记录</h4>
        <div v-if="!selectedMessage?.isRecalled && selectedMessage.replies && selectedMessage.replies.length > 0">
          <!-- 回复全部的 Thread -->
          <div v-if="buildThreads(selectedMessage).all.length > 0" class="thread-card" style="border: 1px solid #ebeef5; border-radius: 6px; margin-bottom: 12px;">
            <div class="thread-header" style="background: #f0f9eb; padding: 8px 12px; border-radius: 6px 6px 0 0; font-weight: bold; font-size: 13px;">📢 回复全部接收人</div>
            <div class="thread-body" style="padding: 8px 12px;">
              <div v-for="(reply, idx) in buildThreads(selectedMessage).all" :key="idx" class="reply-item" style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                <div class="reply-content" style="flex:1;"><p><strong>{{ getUserDisplayName(reply.senderId) }}：</strong>{{ reply.content }}</p><p class="reply-time">{{ formatTime(reply.createdAt) }}</p></div>
                <div class="reply-reactions" style="flex-shrink:0; display:flex; gap:4px;">
                  <el-button :type="getMyReactionType('reply', reply.id) === 'like' ? 'primary' : 'default'" size="small" @click="handleReaction('reply', reply.id, 'like')">👍 {{ getLikeCount('reply', reply.id) }}</el-button>
                  <el-button :type="getMyReactionType('reply', reply.id) === 'dislike' ? 'danger' : 'default'" size="small" @click="handleReaction('reply', reply.id, 'dislike')">👎 {{ getDislikeCount('reply', reply.id) }}</el-button>
                </div>
              </div>
            </div>
          </div>
          <!-- 按接收人分组的 Thread -->
          <div v-for="(thread, tIdx) in buildThreads(selectedMessage).threads" :key="tIdx" class="thread-card" style="border: 1px solid #ebeef5; border-radius: 6px; margin-bottom: 12px;">
            <div class="thread-header" style="background:#ecf5ff; padding:8px 12px; border-radius:6px 6px 0 0; cursor:pointer; display:flex; justify-content:space-between; align-items:center;" @click="toggleCollapsed(thread.recipient.recipient_id)">
              <span style="font-weight:bold; font-size:13px;">
                💬 与 {{ thread.recipient.name || '未知' }} 的对话
                <el-tag v-if="thread.recipient.has_replied" size="small" type="success" style="margin-left:6px;">已回复</el-tag>
                <el-tag v-else size="small" type="danger" style="margin-left:6px;">未回复</el-tag>
              </span>
              <span>{{ threadCollapsed[thread.recipient.recipient_id] ? '▸' : '▾' }}</span>
            </div>
            <div v-show="!threadCollapsed[thread.recipient.recipient_id]" class="thread-body" style="padding:8px 12px;">
              <div v-for="(reply, idx) in thread.replies" :key="idx" class="reply-item" style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px;">
                <div class="reply-content" style="flex:1;"><p><strong>{{ getUserDisplayName(reply.senderId) }}：</strong>{{ reply.content }}</p><p class="reply-time">{{ formatTime(reply.createdAt) }}</p></div>
                <div class="reply-reactions" style="flex-shrink:0; display:flex; gap:4px;">
                  <el-button :type="getMyReactionType('reply', reply.id) === 'like' ? 'primary' : 'default'" size="small" @click="handleReaction('reply', reply.id, 'like')">👍 {{ getLikeCount('reply', reply.id) }}</el-button>
                  <el-button :type="getMyReactionType('reply', reply.id) === 'dislike' ? 'danger' : 'default'" size="small" @click="handleReaction('reply', reply.id, 'dislike')">👎 {{ getDislikeCount('reply', reply.id) }}</el-button>
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
          >同意</el-button>
          <el-button 
            v-if="!selectedMessage?.myCompleted && !selectedMessage?.isCompleted && !selectedMessage?.isRecalled"
            type="danger" 
            class="quick-btn reject-btn"
            @click="sendQuickReply('拒绝')"
            :loading="replyLoading"
          >拒绝</el-button>
          <el-button 
            v-if="!selectedMessage?.myCompleted && !selectedMessage?.isCompleted && !selectedMessage?.isRecalled"
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
          <el-button type="primary" v-if="!selectedMessage?.isRecalled" @click="submitReplyFromDetail" :loading="replyLoading">发送回复</el-button>
          <el-button type="primary" size="small" @click="showForwardDialog(selectedMessage)" v-if="!selectedMessage?.isRecalled">转发</el-button>
          <el-button type="info" plain @click="detailVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 转发弹窗 -->
    <el-dialog title="转发消息" v-model="forwardDialogVisible" width="750px" :close-on-click-modal="false" destroy-on-close>
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
              :filter-method="filterForwardRecipient"
              placeholder="输入姓名/拼音/部门搜索..."
              style="width: 100%;"
              :teleported="false"
            >
              <el-option
                v-for="u in filteredForwardUsers"
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
              已选择 {{ forwardRecipients.length }} 人（支持拼音首字母/全拼/部门搜索）
            </div>
            <!-- 已选人员名片展示 -->
            <div v-if="forwardRecipients.length > 0" class="forward-recipient-cards">
              <div v-for="uid in forwardRecipients" :key="uid" class="fwd-recipient-card">
                <span class="fwd-card-name">{{ getForwardUserName(uid) }}</span>
                <span class="fwd-card-dept">{{ getForwardUserDept(uid) }}</span>
                <span class="fwd-card-role">{{ getForwardUserRoleName(uid) }}</span>
                <span class="fwd-card-remove" @click="removeForwardRecipient(uid)">×</span>
              </div>
            </div>
          </el-form-item>
          <el-form-item label="按部门转发" v-if="forwardDepartmentCards.length > 0">
            <el-select v-model="forwardDepartmentCardIds" multiple filterable placeholder="搜索或选择检测部门（可多选）" style="width:100%;" popper-class="dept-card-popper" @change="onForwardDepartmentCardsChange" clearable>
              <el-option
                v-for="card in forwardDepartmentCards"
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
            <div style="font-size:12px;color:#909399;margin-top:4px;">选择部门后，消息将发送给该部门的负责人（组长+组长助理），同组任意一人回复即为该组已处理</div>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="forwardDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmForward" :loading="forwardLoading" :disabled="forwardRecipients.length === 0 && forwardDepartmentCardIds.length === 0">确认转发</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, CircleCheck, CircleClose, Document } from '@element-plus/icons-vue';
import { communicationAPI, userAPI, reactionAPI, getRoleDisplayName, ROLE_OPTIONS, departmentCardAPI } from '../api';
import { supabase } from '../utils/supabase';
import { buildSearchKeys, matchUser } from '../utils/pinyinSearch';
import { useDebouncedSearch } from '../composables/useDebounce';

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
const threadCollapsed = ref({});

function toggleCollapsed(recipientId) {
  threadCollapsed.value = { ...threadCollapsed.value, [recipientId]: !threadCollapsed.value[recipientId] };
}

const buildThreads = (comm) => {
  return communicationAPI.buildThreads ? communicationAPI.buildThreads(comm) : { all: comm.replies || [], threads: [] };
};

// 获取某个接收人的回复
const getRecipientReplies = (recipientId) => {
  if (!selectedMessage.value || !selectedMessage.value.replies) return [];
  return selectedMessage.value.replies.filter(r =>
    r.senderId === recipientId || r.targetRecipientId === recipientId
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// 所有接收人按部门分组（排除抄送人）
const getAllDeptGroups = (comm) => {
  if (!comm) return [];
  const recipients = (comm.recipientDetails || []).filter(r => !r.is_cc);
  const groups = {};
  recipients.forEach(r => {
    const dept = r.department_level3 || r.department_level2 || r.department || '未分组';
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

// 回复内容样式
const getReplyClass = (reply) => {
  if (!reply || !reply.content) return '';
  if (reply.content === '同意') return 'reply-agree';
  if (reply.content === '拒绝') return 'reply-reject';
  if (reply.targetRecipientId) return 'reply-follow-up';
  return 'reply-normal';
};

// 在接收人状态卡片中显示名字
const getReceiverDisplayName = (userId) => {
  if (!selectedMessage.value) return '未知';
  const recipient = selectedMessage.value.recipientDetails?.find(r => r.recipient_id === userId);
  if (recipient) return recipient.name || '未知';
  if (userId === selectedMessage.value.senderId) return selectedMessage.value.senderName || '发起人';
  const user = allUsers.value.find(u => u.id === userId);
  return user ? (user.name || user.username) : '未知';
};

// 获取原始消息的接收人名称列表（用于转发引用卡片）
const getOriginalRecipientNames = (originalMsg) => {
  if (!originalMsg || !originalMsg.recipientDetails) return '-';
  return originalMsg.recipientDetails.map(r => r.name).join('、');
};

// 沟通类型背景色映射
const typeBgColors = {
  paid_urgent: '#e1f3d8',   // 付费加急 - 浅绿色
  free_urgent: '#fde2e2',   // 免费加急 - 浅粉色
  data_dispute: '#fef0f0',  // 数据质疑 - 浅红色
  follow_up: '#f0e6ff'      // 跟单 - 淡紫色
};
// 获取详情弹窗背景样式（其他类型无特殊背景色）
const getDetailStyle = (type) => {
  const bg = typeBgColors[type] || '';
  return {
    '--detail-bg': bg,
    background: bg,
    borderRadius: '8px',
    padding: '16px'
  };
};

// 获取有效角色
const getEffectiveRole = (row) => {
  if (row.role) return row.role;
  const user = allUsers.value.find(u => u.id === row.recipient_id);
  return user?.role || null;
};

// 角色标签颜色
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

// 内联回复相关
const quickReplies = ['同意', '拒绝', '等我确认后回复', '已收到，正在处理', '请补充信息', '已提交审批'];
const activeReplyId = ref(null);
const inlineReplyContent = ref('');
const inlineReplyLoading = ref(false);

// 转发相关
const forwardDialogVisible = ref(false);
const forwardTarget = ref(null);
const forwardRecipients = ref([]);
const forwardNote = ref('');
const forwardLoading = ref(false);
const forwardDepartmentCards = ref([]);
const forwardDepartmentCardIds = ref([]);
const forwardSearchQuery = ref('');
let forwardDeptCardMap = {};  // { cardKey: [holderId, ...] }

// 根据持有人ID查找所属部门名片key
const findForwardCardKeyByHolderId = (uid) => {
  for (const [cardKey, holderIds] of Object.entries(forwardDeptCardMap)) {
    if (holderIds.includes(uid)) return cardKey
  }
  return null
}

// 部门名片选择变化
const onForwardDepartmentCardsChange = (newSelection) => {
  const prev = { ...forwardDeptCardMap }
  const current = {}
  // 新增的卡片 → 加入接收人
  newSelection.forEach(cardKey => {
    if (!prev[cardKey]) {
      const holders = departmentCardAPI.getHolderIds(cardKey, forwardDepartmentCards.value)
      current[cardKey] = holders
      holders.forEach(id => {
        if (!forwardRecipients.value.includes(id)) {
          forwardRecipients.value.push(id)
        }
      })
    } else {
      current[cardKey] = prev[cardKey]
    }
  })
  // 移除的卡片 → 移除接收人
  Object.keys(prev).forEach(cardKey => {
    if (!newSelection.includes(cardKey)) {
      const holders = prev[cardKey]
      forwardRecipients.value = forwardRecipients.value.filter(id => !holders.includes(id))
    }
  })
  forwardDeptCardMap = current
}

// 移除转发收件人（同步取消部门名片）
const removeForwardRecipient = (uid) => {
  forwardRecipients.value = forwardRecipients.value.filter(id => id !== uid)
  const cardKey = findForwardCardKeyByHolderId(uid)
  if (cardKey && forwardDepartmentCardIds.value.includes(cardKey)) {
    forwardDepartmentCardIds.value = forwardDepartmentCardIds.value.filter(k => k !== cardKey)
    delete forwardDeptCardMap[cardKey]
  }
}

// 转发收件人显示辅助
const getForwardUserName = (uid) => {
  const u = allUsers.value.find(u => u.id === uid)
  return u?.name || uid
}
const getForwardUserDept = (uid) => {
  const u = allUsers.value.find(u => u.id === uid)
  return u?.department || '-'
}
const getForwardUserRoleName = (uid) => {
  const u = allUsers.value.find(u => u.id === uid)
  return u?.role ? getRoleDisplayName(u.role) : '-'
}

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
  inlineReplyContent.value = '';
  activeReplyId.value = null;
};

// 搜索关键词（带 300ms 防抖）
const { input: searchInput, debouncedValue: searchKeyword } = useDebouncedSearch(300);
const searchKeywordProcessed = ref('');
const searchKeywordCompleted = ref('');
const searchKeywordRecalled = ref('');
const showFlaggedOnly = ref(false);

// 点赞/点踩数据
const reactionStats = ref({});
const forwardedOriginalMsg = ref(null);
const statusMessage = computed(() => forwardedOriginalMsg.value || selectedMessage.value);
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
  if (typeof file === 'string') return file;
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
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const response = await communicationAPI.getAll(authUser.id);
      // 为每个沟通添加我的状态
      messages.value = response.data.map(c => {
        const recipients = c.recipientDetails || [];
        const myRec = recipients.find(r => r.recipient_id === authUser.id);
        return {
          ...c,
          myRead: myRec?.is_read || false,
          hasReplied: myRec?.has_replied || false,  // 我已回复
          myCompleted: myRec?.is_completed || false,  // 我个人已完结
          isCompleted: c.isCompleted || false,  // 沟通记录已完结（全局）
          hasFlagged: myRec?.is_flagged || false,
          isCC: myRec?.is_cc || false,
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

// 全部消息：所有非系统通知的消息（包含已撤回）
const allMessages = computed(() => {
  let result = messages.value.filter(m => !m.isSystemNotification);

  if (showFlaggedOnly.value) {
    result = result.filter(r => r.hasFlagged);
  }

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

// 已处理消息：已回复 且 我个人未完结 且 全局未完结 且 非系统通知（包含已撤回）
const processedMessages = computed(() => {
  let result = messages.value.filter(m => 
    m.hasReplied && !m.myCompleted && !m.isCompleted && !m.isRecalled && !m.isSystemNotification
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

// 已完结消息：我个人已完结 或 全局已完结 且 非系统通知（包含已撤回）
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

// 消息按天分组辅助函数
const groupMessagesByDate = (msgs) => {
  const groups = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  msgs.forEach(m => {
    const d = new Date(m.createdAt).toDateString();
    const label = d === today ? '今天' : d === yesterday ? '昨天' : d;
    if (!groups[label]) groups[label] = [];
    groups[label].push(m);
  });
  return groups;
};

const groupedPendingMessages = computed(() => groupMessagesByDate(pendingMessages.value));
const groupedProcessedMessages = computed(() => groupMessagesByDate(processedMessages.value));
const groupedCompletedMessages = computed(() => groupMessagesByDate(completedMessages.value));
const groupedRecalledMessages = computed(() => groupMessagesByDate(recalledMessages.value));
const groupedAllMessages = computed(() => groupMessagesByDate(allMessages.value));

// 表格行样式：待处理消息显示淡蓝色底色，已撤回显示浅红底色
const tableRowClassName = ({ row }) => {
  if (row.isRecalled) return 'recalled-row'
  if (!row.hasReplied && !row.myCompleted && !row.isCompleted) {
    return 'pending-row';
  }
  // 根据沟通类型添加背景色
  if (row.type) return 'type-' + row.type
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
  // 重新获取完整的消息详情（包含所有接收人）
  const response = await communicationAPI.getById(message.id);
  selectedMessage.value = JSON.parse(JSON.stringify(response.data));
  forwardedOriginalMsg.value = null;
  
  // 如果是转发消息，获取原消息
  if (response.data.forwardedFrom) {
    try {
      const origRes = await communicationAPI.getById(response.data.forwardedFrom);
      forwardedOriginalMsg.value = origRes.data;
    } catch (e) {
      console.error('加载原消息失败:', e);
    }
  }
  
  replyContent.value = '';
  
  // 获取发送人详情
  senderDetail.value = allUsers.value.find(u => u.id === response.data.senderId) || null;
  
  // 获取我的接收人记录
  myRecipient.value = (response.data?.recipientDetails || []).find(r => r.recipient_id === currentUserId.value) || null;
  
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

// 从表格行直接发送快捷回复
const sendQuickReplyFromRow = async (msg, content) => {
  msg._replyLoading = true;
  try {
    await communicationAPI.createReply(msg.id, { content }, content === '等我确认后回复');
    ElMessage.success('回复成功');
    // 立即在本地更新状态（不等待服务器同步，避免延迟）
    const idx = messages.value.findIndex(m => m.id === msg.id);
    if (idx >= 0) {
      messages.value[idx].hasReplied = true;
    }
    Object.assign(msg, { hasReplied: true });
    // 延迟刷新列表（给服务器时间同步，但不阻塞UI）
    setTimeout(() => loadMessages(), 300);
    if (content === '同意' || content === '拒绝') {
      activeTab.value = 'processed';
    }
  } catch (error) {
    ElMessage.error('回复失败：' + (error.message || '未知错误'));
  } finally {
    msg._replyLoading = false;
  }
};

// 从表格中直接回复
const replyFromTable = (msg) => {
  viewDetail(msg);
};

// ===== 转发功能 =====
const showForwardDialog = (comm) => {
  if (!comm) return;
  forwardTarget.value = comm;
  forwardRecipients.value = [];
  forwardNote.value = '';
  forwardDepartmentCardIds.value = [];
  forwardDeptCardMap = {};
  forwardDialogVisible.value = true;
  // 加载部门名片
  departmentCardAPI.getDepartmentCards().then(res => {
    forwardDepartmentCards.value = res.data || [];
  }).catch(() => {});
  // 加载用户列表
  loadForwardUsers();
};

const loadForwardUsers = async () => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('profiles')
      .select('id, name, department, role, department_level1, department_level2, department_level3')
      .neq('id', authUser?.id || '')
    if (data) allUsers.value = data;
  } catch {}
};

const filteredForwardUsers = computed(() => {
  if (!forwardSearchQuery.value) return allUsers.value;
  return allUsers.value.filter(u => matchUser(forwardSearchQuery.value, buildSearchKeys(u, ROLE_OPTIONS || {})._searchKeys));
});

const filterForwardRecipient = (query) => {
  forwardSearchQuery.value = query;
};

const confirmForward = async () => {
  if (!forwardTarget.value || (forwardRecipients.value.length === 0 && forwardDepartmentCardIds.value.length === 0)) {
    ElMessage.warning('请选择个人接收人或部门名片');
    return;
  }
  forwardLoading.value = true;
  try {
    // 获取部门名片持有人ID
    let deptHolderIds = []
    if (forwardDepartmentCardIds.value.length > 0 && forwardDepartmentCards.value.length > 0) {
      forwardDepartmentCardIds.value.forEach(cardKey => {
        const card = forwardDepartmentCards.value.find(c => c.departmentLevel3 === cardKey)
        if (card) deptHolderIds.push(...card.holders.map(h => h.id))
      })
    }
    await communicationAPI.forwardMessage(forwardTarget.value.id, {
      recipientIds: [...new Set([...forwardRecipients.value, ...deptHolderIds])],
      departmentCardIds: deptHolderIds,
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

// 实时订阅消息变化
const subscribeMessages = () => {
  if (messageChannel) {
    supabase.removeChannel(messageChannel);
    messageChannel = null;
  }
  messageChannel = supabase
    .channel('lab-receive-messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'communications' },
      (payload) => {
        handleNewMessage(payload.new);
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'communication_recipients' },
      async (payload) => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser || payload.new.recipient_id !== authUser.id) return;
        loadMessages();
        if ('Notification' in window && Notification.permission === 'granted') {
          const { data: comm } = await supabase
            .from('communications')
            .select('sender_id')
            .eq('id', payload.new.communication_id)
            .single();
          const senderName = comm ? getSenderName(comm.sender_id) || '系统' : '系统';
          const n = new Notification('新消息', { body: `来自 ${senderName}` });
          n.onclick = () => { window.focus(); location.href = '/#/home?tab=lab-receive'; };
        } else if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'communication_recipients' },
      () => {
        // 收件人状态变化时重新加载
        loadMessages();
      }
    )
    .subscribe();
};

const handleNewMessage = async (newComm) => {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return;
  
  const recipientIds = newComm.recipient_ids || 
    (newComm.communication_recipients ? newComm.communication_recipients.map(r => r.recipient_id) : []);
  if (!recipientIds.includes(authUser.id)) return;
  
  // 重新加载列表
  loadMessages();
  
  // 桌面通知
  if ('Notification' in window && Notification.permission === 'granted') {
    const senderName = getSenderName(newComm.sender_id) || '系统';
    const n = new Notification('新消息', { body: `来自 ${senderName}` });
    n.onclick = () => { window.focus(); location.href = '/#/home?tab=lab-receive'; };
  } else if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
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
:deep(.pending-row) {
  background-color: #ecf5ff !important;
}

:deep(.pending-row:hover) {
  background-color: #d9ecff !important;
}

/* 已撤回 - 浅紫色底色 */
:deep(.recalled-row) {
  background-color: #f5f0ff !important;
}

:deep(.recalled-row:hover) {
  background-color: #ede0ff !important;
}

/* 沟通类型行背景色 */
:deep(.type-paid_urgent) { background-color: #e1f3d8 !important; }
:deep(.type-paid_urgent td) { background-color: #e1f3d8 !important; }
:deep(.type-free_urgent) { background-color: #fde2e2 !important; }
:deep(.type-free_urgent td) { background-color: #fde2e2 !important; }
:deep(.type-data_dispute) { background-color: #fef0f0 !important; }
:deep(.type-data_dispute td) { background-color: #fef0f0 !important; }
:deep(.type-follow_up) { background-color: #f0e6ff !important; }
:deep(.type-follow_up td) { background-color: #f0e6ff !important; }/* 详情弹窗底部按钮 */
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

/* 已撤回 - 浅紫色底色 */
:deep(.recalled-row) {
  background-color: #f5f0ff !important;
}

:deep(.recalled-row:hover) {
  background-color: #ede0ff !important;
}

/* ========== 详情弹窗 - 动态沟通类型背景色 ========== */
.detail-content-wrapper {
  border-radius: 8px;
  padding: 16px;
}
.detail-content-wrapper :deep(.el-descriptions__body) {
  background: transparent;
}
.detail-content-wrapper :deep(.el-descriptions__cell) {
  background-color: var(--detail-bg, transparent) !important;
}
.detail-content-wrapper :deep(.el-table__body td) {
  background-color: var(--detail-bg, transparent) !important;
}
.detail-content-wrapper :deep(.el-table__body tr) {
  background-color: var(--detail-bg, transparent) !important;
}
.detail-content-wrapper :deep(.el-table__header th.el-table__cell) {
  background-color: var(--detail-bg, transparent) !important;
}
.detail-content-wrapper :deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: var(--detail-bg, transparent) !important;
}
.detail-content-wrapper :deep(.el-table) {
  background-color: transparent !important;
}
.detail-content-wrapper :deep(.el-table__body) {
  background-color: transparent !important;
}
.detail-content-wrapper :deep(.el-table__header-wrapper) {
  background-color: transparent !important;
}

/* ========== 转发引用卡片 ========== */
.forward-reference-card {
  background: #dceefb;
  border-left: 8px solid #409eff;
  border: 4px solid #409eff;
  border-left-width: 8px;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 20px;
  position: relative;
}
.forward-reference-card .fwd-badge {
  display: inline-block;
  background: #409eff;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  padding: 3px 14px;
  border-radius: 4px;
  margin-bottom: 10px;
}
.forward-reference-card .fwd-title {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 12px;
}
.forward-reference-card :deep(.el-descriptions__cell) {
  background-color: #dceefb !important;
}
.forward-reference-card :deep(.el-descriptions__body) {
  background: transparent;
}

/* 转发选人器已选人员名片 */
.forward-recipient-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.fwd-recipient-card {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
}

.fwd-card-name {
  font-weight: 600;
  color: #303133;
}

.fwd-card-dept {
  color: #606266;
  font-size: 11px;
}

.fwd-card-role {
  color: #909399;
  font-size: 11px;
  background: #f0f0f0;
  padding: 1px 5px;
  border-radius: 3px;
}

.fwd-card-remove {
  color: #f56c6c;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  margin-left: 4px;
  line-height: 1;
}

.fwd-card-remove:hover {
  color: #c45656;
}

:deep(.dept-card-popper) {
  max-width: 400px !important;
}
.date-group-header {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
  background: #ecf5ff;
  padding: 8px 16px;
  margin: 16px 0 8px 0;
  border-radius: 4px;
  border-left: 4px solid #409eff;
}
</style>
