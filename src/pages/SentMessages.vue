<template>
  <div class="sent-page">
    <div class="page-header">
      <h2>📤 已发送消息</h2>
      <p class="page-desc">查看历史上主动发出的沟通记录及回复状态</p>
    </div>

    <!-- 筛选标签 + 刷新按钮 -->
    <div class="filter-bar">
      <el-radio-group v-model="activeFilter" @change="filterList">
        <el-radio-button label="all">全部 ({{ searchFilteredComms.length }})</el-radio-button>
        <el-radio-button label="unreplied">未回复 ({{ unrepliedCount }})</el-radio-button>
        <el-radio-button label="partial_replied">部分回复 ({{ partialRepliedCount }})</el-radio-button>
        <el-radio-button label="all_replied">全部回复 ({{ allRepliedCount }})</el-radio-button>
        <el-radio-button label="completed">已完结 ({{ completedCount }})</el-radio-button>
        <el-radio-button label="recalled">已撤回 ({{ recalledCount }})</el-radio-button>
        <el-radio-button label="flagged">🚩 红旗 ({{ flaggedCount }})</el-radio-button>
      </el-radio-group>
      <el-button 
        size="small" 
        :icon="Refresh" 
        @click="loadCommunications"
        :loading="loading"
        style="margin-left: 12px;"
      >
        刷新
      </el-button>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索沟通内容、客户名称、样品短号..."
        clearable
        style="width: 300px;"
        :prefix-icon="Search"
      />
    </div>

    <el-table :data="filteredCommunications" border stripe v-loading="loading" empty-text="暂无发送记录" v-if="activeFilter !== 'recalled'" @row-click="viewDetail" :row-class-name="getRowClassName">
      <el-table-column label="状态" width="140" align="center">
        <template #default="scope">
          <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;">
          <el-tag v-if="scope.row.isRecalled" size="small" type="warning">
            {{ getRecallStatusText(scope.row) }}
          </el-tag>
          <el-tag v-else-if="scope.row.isCompleted" size="small" type="success">已完结</el-tag>
          <el-tag v-else-if="computeReplyStatus(scope.row) === 'all_replied'" size="small" type="success">已回复</el-tag>
          <el-tag v-else-if="computeReplyStatus(scope.row) === 'partial_replied'" size="small" type="warning">{{ getReplyStatusText(scope.row) }}</el-tag>
          <el-tag v-else size="small" type="danger">未回复</el-tag>
          <el-tag v-if="!scope.row.isRecalled && !scope.row.isCompleted && isOverdue(scope.row)" size="small" type="danger" effect="dark">超时</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="🚩" width="50" align="center">
        <template #default="scope">
          <span v-if="scope.row.hasFlagged" style="color: #f56c6c; font-size: 16px;">🚩</span>
          <span v-else style="color: #ccc;">-</span>
        </template>
      </el-table-column>
      <el-table-column label="新回复" width="80" align="center">
        <template #default="scope">
          <el-badge 
            v-if="scope.row.hasNewReply" 
            :value="scope.row.newReplyCount || 1" 
            type="warning" 
          />
          <span v-else-if="scope.row.replyCount > 0" class="reply-count">
            {{ scope.row.replyCount }}条回复
          </span>
        </template>
      </el-table-column>
      <el-table-column label="沟通类型" width="110">
        <template #default="scope">
          {{ getTypeName(scope.row.type) }}
        </template>
      </el-table-column>
      <el-table-column label="客户/样品" min-width="140">
        <template #default="scope">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span>{{ scope.row.customerName || '-' }}</span>
            <el-tag v-if="scope.row.forwardedFrom" size="small" type="warning" effect="dark" style="font-size:10px;height:20px;line-height:18px;">转发</el-tag>
          </div>
          <div style="font-size:11px;color:#999;margin-top:2px;">{{ scope.row.sampleCode || scope.row.content?.substring(0, 20) || '' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="接收人" min-width="220">
        <template #default="scope">
          <template v-if="scope.row.departmentCardIds && scope.row.departmentCardIds.length > 0">
            <!-- 按部门分组展示 -->
            <div v-for="(group, gIdx) in getDeptCardGroups(scope.row)" :key="gIdx" class="dept-card-group">
              <span class="dept-group-label">{{ group.deptName }}</span>
              <el-tag v-if="group.hasReplied" size="small" type="success" style="margin-left:4px;">
                ✅ 已处理（{{ group.repliedByName }}）
              </el-tag>
              <el-tag v-else size="small" type="danger" style="margin-left:4px;">
                ⏳ 待处理
              </el-tag>
            </div>
            <!-- 非部门名片的普通收件人 -->
            <div v-for="(r, idx) in getNonDeptCardRecipients(scope.row)" :key="'r'+idx" class="recipient-row">
              <span class="recipient-name">{{ r.name || '-' }}</span>
              <el-tag v-if="r.has_replied" size="small" type="success" style="margin-left:4px;">已回复</el-tag>
              <el-tag v-else size="small" type="info" style="margin-left:4px;">未回复</el-tag>
            </div>
          </template>
          <template v-else>
            <div v-for="(r, idx) in (scope.row.recipientDetails || [])" :key="idx" class="recipient-row">
              <span class="recipient-name">{{ r.name || '-' }}</span>
              <el-tag v-if="r.has_replied" size="small" type="success" style="margin-left:4px;">已回复</el-tag>
              <el-tag v-else size="small" type="danger" style="margin-left:4px;">未回复</el-tag>
            </div>
          </template>
        </template>
      </el-table-column>
      <el-table-column label="发送时间" width="160">
        <template #default="scope">
          {{ formatTime(scope.row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="320" align="center">
        <template #default="scope">
          <el-button size="small" @click.stop="viewDetail(scope.row)">查看</el-button>
          <el-button 
            v-if="canFollowUp(scope.row)" 
            size="small" 
            type="primary" 
            @click.stop="openFollowUp(scope.row)"
            style="margin-left: 4px;"
          >
            追加回复
          </el-button>
          <el-button 
            size="small" 
            type="success"
            @click.stop="openForwardDialog(scope.row)"
            v-if="!scope.row.isRecalled"
            style="margin-left: 4px;"
          >
            转发
          </el-button>
          <el-button 
            size="small" 
            :type="scope.row.hasFlagged ? 'warning' : 'default'"
            @click.stop="toggleFlag(scope.row)"
            style="margin-left: 4px;"
          >
            {{ scope.row.hasFlagged ? '取消红旗' : '红旗' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 已撤回消息表格 -->
    <el-table 
      v-if="activeFilter === 'recalled'" 
      :data="recalledMessages" 
      border 
      stripe 
      v-loading="recalledLoading"
      empty-text="暂无已撤回消息"
      style="margin-top: 16px;"
      @row-click="viewDetail"
    >
      <el-table-column label="撤回时间" width="160">
        <template #default="scope">
          {{ formatTime(scope.row.recalledAt) }}
        </template>
      </el-table-column>
      <el-table-column label="原发送时间" width="160">
        <template #default="scope">
          {{ formatTime(scope.row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="沟通类型" width="110">
        <template #default="scope">
          {{ getTypeName(scope.row.type) }}
        </template>
      </el-table-column>
      <el-table-column label="内容预览" min-width="200" show-overflow-tooltip>
        <template #default="scope">
          {{ scope.row.content || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="撤回原因" min-width="150" show-overflow-tooltip>
        <template #default="scope">
          {{ scope.row.recallReason || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="接收人" min-width="150">
        <template #default="scope">
          {{ (scope.row.recipientDetails || []).map(r => r.name || '').join('、') || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="290" align="center" fixed="right">
        <template #default="scope">
          <el-button size="small" type="primary" @click.stop="editAndResend(scope.row)">编辑重发</el-button>
          <el-button size="small" type="danger" @click.stop="deleteRecalled(scope.row)">删除</el-button>
          <el-button 
            size="small" 
            :type="scope.row.hasFlagged ? 'warning' : 'default'"
            @click.stop="toggleFlag(scope.row)"
            style="margin-left: 4px;"
          >
            {{ scope.row.hasFlagged ? '取消红旗' : '红旗' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 沟通详情弹窗 -->
    <el-dialog title="沟通详情" v-model="detailVisible" width="1125px" destroy-on-close>
      <div v-if="selectedComm" class="detail-content-wrapper" style="background:#faf6eb; border-radius:8px; padding:16px;">
        <!-- 转发消息：原消息引用卡片（放在最上方） -->
        <div v-if="forwardedOriginalMsg" class="forward-reference-card" style="margin-bottom: 20px; border: 4px solid #409eff; border-left: 8px solid #409eff; background: #dceefb; border-radius: 10px; padding: 18px;">
          <div class="fwd-badge" style="display:inline-block;background:#409eff;color:#fff;padding:4px 14px;border-radius:6px;font-size:14px;font-weight:700;margin-bottom:10px;">转发</div>
          <div class="fwd-title" style="font-size:16px;font-weight:700;margin-bottom:12px;">以下为 {{ forwardedOriginalMsg.senderName }} 发送的原消息</div>
          <el-descriptions :column="2" border size="small" class="fwd-descriptions">
            <el-descriptions-item label="沟通类型">{{ getTypeName(forwardedOriginalMsg.type) }}</el-descriptions-item>
            <el-descriptions-item label="客户名称">{{ forwardedOriginalMsg.customerName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="样品短号">{{ forwardedOriginalMsg.sampleCode || '-' }}</el-descriptions-item>
            <el-descriptions-item label="发送时间">{{ formatTime(forwardedOriginalMsg.createdAt) }}</el-descriptions-item>
            <el-descriptions-item v-if="forwardedOriginalMsg.content" label="内容" :span="2">{{ forwardedOriginalMsg.content }}</el-descriptions-item>
          </el-descriptions>
          <div style="font-size: 12px; color: #909399; margin-top: 8px;">
            原接收人：{{ (forwardedOriginalMsg.recipientDetails || []).map(r => r.name || '').join('、') || '-' }}
          </div>
        </div>

        <h4>基本信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="沟通类型">{{ getTypeName(selectedComm.type) }}</el-descriptions-item>
          <el-descriptions-item label="客户名称">{{ selectedComm.customerName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="样品短号">{{ selectedComm.sampleCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="发送时间">{{ formatTime(selectedComm.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="沟通类型标签">
            <el-tag size="small" :type="getTypeTag(selectedComm.type)" style="border:none;">{{ getTypeName(selectedComm.type) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedComm.remark" label="备注" :span="2">{{ selectedComm.remark }}</el-descriptions-item>
          <el-descriptions-item v-if="selectedComm.content" label="内容" :span="2">{{ selectedComm.content }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-top: 20px;">{{ forwardedOriginalMsg ? '原接收人状态' : '接收人状态' }}</h4>
        <div v-if="statusComm.departmentCardIds && statusComm.departmentCardIds.length > 0">
          <!-- 部门名片分组 -->
          <div v-for="(group, gIdx) in getDeptCardGroups(statusComm)" :key="gIdx" style="margin-bottom: 12px; border: 1px solid #ebeef5; border-radius: 4px; padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">
              {{ group.deptName }}
              <el-tag v-if="group.hasReplied" size="small" type="success" style="margin-left: 8px;">已处理（{{ group.repliedByName }}）</el-tag>
              <el-tag v-else size="small" type="danger" style="margin-left: 8px;">待处理</el-tag>
            </div>
            <el-table :data="group.recipients" border size="small">
              <el-table-column prop="name" label="姓名" width="80"></el-table-column>
              <el-table-column label="角色" width="100">
  <template #default="scope">
    {{ getRoleDisplayName(scope.row.role) }}
  </template>
</el-table-column>
              <el-table-column label="回复记录" min-width="250">
                <template #default="scope">
                  <div v-if="getRecipientReplies(scope.row.recipient_id).length > 0">
                    <div v-for="(reply, idx) in getRecipientReplies(scope.row.recipient_id)" :key="idx">
                      <div class="recipient-reply-line">
                        <span :class="getReplyClass(reply)">
                          <strong>{{ getUserDisplayName(reply.senderId) }}</strong>
                          <span v-if="reply.targetRecipientId"> → {{ getUserDisplayName(reply.targetRecipientId) }}</span>
                          ：{{ reply.content }}
                        </span>
                        <span class="reply-time-mini">{{ formatTime(reply.createdAt) }}</span>
                        <el-button size="small" circle @click.stop="activeReplyId = reply.id; inlineReplyContent = ''" style="flex-shrink:0;padding:0 4px;min-width:auto;height:auto;font-size:13px;border:none;">💬</el-button>
                      </div>
                      <div v-if="activeReplyId === reply.id" style="display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;">
                        <el-input v-model="inlineReplyContent" size="small" placeholder="回复..." style="flex:1;min-width:200px;" @keyup.enter="submitInlineReply(reply)" />
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
              <el-table-column label="已读" width="120" align="center">
                <template #default="scope">
                  <el-tag v-if="scope.row.has_new_reply" size="small" type="warning" style="border:none;">新回复</el-tag>
                  <el-tag v-else-if="scope.row.is_read" size="small" type="success" style="border:none;">
                    {{ scope.row.read_at ? formatTime(scope.row.read_at).substring(5,16) + ' 已读' : '已读' }}
                  </el-tag>
                  <el-tag v-else size="small" type="info" style="border:none;">未读</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="个人状态" width="90" align="center">
                <template #default="scope">
                  <el-tag v-if="scope.row.has_replied" size="small" type="success">已回复</el-tag>
                  <el-tag v-else size="small" type="danger">未回复</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <!-- 非部门名片的普通收件人 -->
          <div v-if="getNonDeptCardRecipients(statusComm).length > 0">
            <h5 style="margin-bottom: 8px;">其他收件人</h5>
            <el-table :data="getNonDeptCardRecipients(statusComm)" border size="small">
              <el-table-column prop="name" label="姓名" width="80"></el-table-column>
              <el-table-column prop="department" label="部门" width="120"></el-table-column>
              <el-table-column label="回复记录" min-width="250">
                <template #default="scope">
                  <div v-if="getRecipientReplies(scope.row.recipient_id).length > 0">
                    <div v-for="(reply, idx) in getRecipientReplies(scope.row.recipient_id)" :key="idx">
                      <div class="recipient-reply-line">
                        <span :class="getReplyClass(reply)">
                          <strong>{{ getUserDisplayName(reply.senderId) }}</strong>
                          <span v-if="reply.targetRecipientId"> → {{ getUserDisplayName(reply.targetRecipientId) }}</span>
                          ：{{ reply.content }}
                        </span>
                        <span class="reply-time-mini">{{ formatTime(reply.createdAt) }}</span>
                        <el-button size="small" circle @click.stop="activeReplyId = reply.id; inlineReplyContent = ''" style="flex-shrink:0;padding:0 4px;min-width:auto;height:auto;font-size:13px;border:none;">💬</el-button>
                      </div>
                      <div v-if="activeReplyId === reply.id" style="display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;">
                        <el-input v-model="inlineReplyContent" size="small" placeholder="回复..." style="flex:1;min-width:200px;" @keyup.enter="submitInlineReply(reply)" />
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
              <el-table-column label="已读" width="120" align="center">
                <template #default="scope">
                  <el-tag v-if="scope.row.has_new_reply" size="small" type="warning" style="border:none;">新回复</el-tag>
                  <el-tag v-else-if="scope.row.is_read" size="small" type="success" style="border:none;">
                    {{ scope.row.read_at ? formatTime(scope.row.read_at).substring(5,16) + ' 已读' : '已读' }}
                  </el-tag>
                  <el-tag v-else size="small" type="info" style="border:none;">未读</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="回复状态" width="90" align="center">
                <template #default="scope">
                  <el-tag v-if="scope.row.has_replied" size="small" type="success">已回复</el-tag>
                  <el-tag v-else size="small" type="danger">未回复</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
        <el-table v-else :data="statusComm.recipientDetails || []" border size="small">
          <el-table-column prop="name" :label="forwardedOriginalMsg ? '原接收人' : '接收人'" width="100"></el-table-column>
          <el-table-column prop="department" label="部门" width="120"></el-table-column>
          <el-table-column label="回复记录" min-width="280">
            <template #default="scope">
              <div v-if="getRecipientReplies(scope.row.recipient_id).length > 0">
                <div v-for="(reply, idx) in getRecipientReplies(scope.row.recipient_id)" :key="idx">
                  <div class="recipient-reply-line">
                    <span :class="getReplyClass(reply)">
                      <strong>{{ getUserDisplayName(reply.senderId) }}</strong>
                      <span v-if="reply.targetRecipientId"> → {{ getUserDisplayName(reply.targetRecipientId) }}</span>
                      ：{{ reply.content }}
                    </span>
                    <span class="reply-time-mini">{{ formatTime(reply.createdAt) }}</span>
                    <el-button size="small" circle @click.stop="activeReplyId = reply.id; inlineReplyContent = ''" style="flex-shrink:0;padding:0 4px;min-width:auto;height:auto;font-size:13px;border:none;">💬</el-button>
                  </div>
                  <div v-if="activeReplyId === reply.id" style="display:flex;gap:4px;margin:4px 0;align-items:center;">
                    <el-input v-model="inlineReplyContent" size="small" placeholder="回复..." style="flex:1;" @keyup.enter="submitInlineReply(reply)" />
                    <el-button size="small" type="primary" @click="submitInlineReply(reply)" :loading="inlineReplyLoading">发送</el-button>
                    <el-button size="small" @click="cancelInlineReply">取消</el-button>
                  </div>
                </div>
              </div>
              <span v-else style="color:#999;">-</span>
            </template>
          </el-table-column>
          <el-table-column label="回复状态" width="90" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.has_replied" size="small" type="success">已回复</el-tag>
              <el-tag v-else size="small" type="danger">未回复</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="已读" width="72" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.has_new_reply" size="small" type="warning" style="border:none;">新回复</el-tag>
              <el-tag v-else-if="scope.row.is_read" size="small" type="success" style="border:none;">已读</el-tag>
              <el-tag v-else size="small" type="info" style="border:none;">未读</el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div style="margin-top: 12px; color: #606266; font-size: 13px; padding: 8px 0;">
          <span v-if="statusComm.recipientDetails && statusComm.recipientDetails.length > 0">
            已读 {{ statusComm.recipientDetails.filter(r => r.is_read).length }}/{{ statusComm.recipientDetails.length }}
            <span v-if="statusComm.recipientDetails.filter(r => !r.is_read).length > 0" style="color: #e6a23c;">
              · {{ statusComm.recipientDetails.filter(r => !r.is_read).length }} 人未读
            </span>
          </span>
        </div>
        <div style="margin-top: 12px;">
          <el-button
            v-if="!selectedComm.isCompleted"
            type="success"
            size="small"
            @click="toggleGlobalCompleted(selectedComm, true)"
          >
            标记整体完结
          </el-button>
          <el-button
            v-if="selectedComm.isCompleted"
            type="info"
            size="small"
            @click="toggleGlobalCompleted(selectedComm, false)"
          >
            取消整体完结
          </el-button>
          
          <!-- 撤回按钮：仅发送人可见，且5分钟内可撤回 -->
          <el-button
            v-if="canRecall(selectedComm)"
            type="warning"
            size="small"
            @click="showRecallDialog(selectedComm)"
            style="margin-left: 8px;"
          >
            撤回消息
          </el-button>
          <!-- 转发按钮 -->
          <el-button
            type="primary"
            size="small"
            @click="showForwardDialog(selectedComm)"
            style="margin-left: 8px;"
          >
            转发
          </el-button>
        </div>
      </div>
      <template #footer>
        <el-button 
          v-if="selectedComm"
          :type="selectedComm.hasFlagged ? 'warning' : 'default'"
          @click="toggleFlagFromDetail"
        >
          {{ selectedComm.hasFlagged ? '取消红旗' : '标记红旗' }}
        </el-button>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 撤回原因弹窗 -->
    <el-dialog title="撤回消息" v-model="recallDialogVisible" width="500px" :close-on-click-modal="false">
      <div>
        <p>请输入撤回原因（可选）：</p>
        <el-input
          v-model="recallReason"
          type="textarea"
          :rows="3"
          placeholder="例如：发错人了、内容有误、需要补充信息等"
          maxlength="200"
          show-word-limit
        />
        <p style="font-size: 12px; color: #999; margin-top: 8px;">
          注意：撤回后，发件人和所有收件人将收到系统通知。
        </p>
      </div>
      <template #footer>
        <el-button @click="recallDialogVisible = false">取消</el-button>
        <el-button type="warning" @click="confirmRecall()" :loading="recallLoading">确认撤回</el-button>
      </template>
    </el-dialog>

    <!-- 转发弹窗 -->
    <el-dialog title="转发消息" v-model="forwardDialogVisible" width="750px" :close-on-click-modal="false" destroy-on-close>
      <div v-if="forwardTarget">
        <div style="margin-bottom: 16px; padding: 12px; background: #f5f7fa; border-radius: 6px;">
          <div style="font-weight: 600; margin-bottom: 8px;">原消息摘要</div>
          <div style="font-size: 13px; color: #606266;">
            <div>发送人：{{ forwardTarget.senderName }}</div>
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
              placeholder="输入姓名/拼音/部门/角色搜索..."
              style="width: 100%; min-width: 600px;"
              :teleported="false"
              :popper-append-to-body="false"
              :max-collapse-tags="0"
              class="forward-recipient-select"
            >
              <el-option-group v-for="group in filteredForwardGroups" :key="group.label" :label="group.label">
                <el-option
                  v-for="u in group.users"
                  :key="u.id"
                  :label="u.name"
                  :value="u.id"
                >
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-weight:500;">{{ u.name }}</span>
                    <span style="color:#999;font-size:12px;">{{ u.department || '-' }} · {{ u._roleName || '-' }}</span>
                  </div>
                </el-option>
              </el-option-group>
            </el-select>
            <div style="color: #999; font-size: 12px; margin-top: 4px;">
              已选择 {{ forwardRecipients.length }} 人（支持拼音首字母/全拼/部门/角色搜索）
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
            <el-select
              v-model="forwardDepartmentCardIds"
              multiple
              filterable
              placeholder="搜索或选择检测部门（可多选）"
              style="width: 100%;"
              popper-class="dept-card-popper"
              @change="onForwardDepartmentCardsChange"
              clearable
            >
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

    <!-- 追加回复弹窗 -->
    <el-dialog title="追加回复" v-model="followUpVisible" width="550px" :close-on-click-modal="false">
      <div>
        <p style="margin-bottom: 8px; color: #606266; font-weight: 600;">
          回复给：
        </p>
        <el-radio-group v-model="followUpTargetRecipient" style="margin-bottom: 12px;">
          <el-radio :value="null">全部接收人</el-radio>
          <el-radio 
            v-for="r in (followUpTarget?.recipientDetails || [])" 
            :key="r.recipient_id" 
            :value="r.recipient_id"
          >
            仅回复 {{ r.name }}
            <el-tag v-if="r.has_replied" size="small" type="success" style="margin-left:4px;">已回复</el-tag>
            <el-tag v-else size="small" type="danger" style="margin-left:4px;">未回复</el-tag>
          </el-radio>
        </el-radio-group>

        <p style="margin-bottom: 8px; color: #606266; font-weight: 600;">回复内容</p>
        <el-input
          v-model="followUpContent"
          type="textarea"
          :rows="4"
          placeholder="输入追加内容..."
          maxlength="500"
          show-word-limit
        />
      </div>
      <template #footer>
        <el-button @click="followUpVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFollowUp" :loading="followUpLoading">发送</el-button>
      </template>
    </el-dialog>

    <!-- 快捷回复管理对话框 -->
    <el-dialog title="管理快捷回复" v-model="showQuickReplyManager" width="450px" :close-on-click-modal="false">
      <div style="margin-bottom: 12px;">
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <el-input v-model="editingQuickReply" placeholder="输入快捷回复内容" size="small" clearable @keyup.enter="saveQuickReply" />
          <el-button type="primary" size="small" @click="saveQuickReply">{{ editingQuickReplyIndex >= 0 ? '修改' : '添加' }}</el-button>
        </div>
        <el-divider />
        <div v-if="quickReplies.length === 0" style="text-align:center;color:#999;padding:20px;font-size:13px;">暂无快捷回复，上方添加</div>
        <div v-for="(qr, idx) in quickReplies" :key="idx" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;">
          <span style="flex:1;">{{ qr }}</span>
          <el-button size="small" link type="primary" @click="editQuickReply(idx)">编辑</el-button>
          <el-button size="small" link type="danger" @click="deleteQuickReply(idx)">删除</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { communicationAPI, departmentCardAPI, quickReplyAPI, getRoleDisplayName, ROLE_OPTIONS } from '../api'
import { supabase } from '../utils/supabase'
import { buildSearchKeys, filterGroups } from '../utils/pinyinSearch'

const communications = ref([])
const recalledMessages = ref([])
const recalledLoading = ref(false)
const loading = ref(false)
const activeFilter = ref('all')
const detailVisible = ref(false)
const selectedComm = ref(null)
const searchKeyword = ref('')  // 搜索关键词
const refreshTimer = ref(null)  // 自动刷新定时器
const messageChannel = ref(null)  // Realtime 频道

// 撤回相关
const recallDialogVisible = ref(false)
const recallReason = ref('')
const recallLoading = ref(false)
const currentRecallingMsg = ref(null)

// 追加回复相关
const followUpVisible = ref(false)
const followUpContent = ref('')
const followUpTarget = ref(null)
const followUpTargetRecipient = ref(null)
const followUpLoading = ref(false)

// inline 回复（回复记录中追加回复）
const activeReplyId = ref(null)
const inlineReplyContent = ref('')
const inlineReplyLoading = ref(false)

// 转发相关
const forwardDialogVisible = ref(false)
const forwardTarget = ref(null)
const forwardRecipients = ref([])
const forwardNote = ref('')
const forwardLoading = ref(false)
const forwardDepartmentCards = ref([])
const forwardDepartmentCardIds = ref([])
const allUsers = ref([])
const forwardSearchQuery = ref('')
const forwardRecipientGroups = ref([])

// 快捷回复（从API加载）
const quickReplies = ref(['收到，已安排', '样品已收到，正在检测', '报告已出具，请查收', '预计 X 个工作日出报告', '数据确认中，稍后回复'])
const showQuickReplyManager = ref(false)
const editingQuickReply = ref('')
const editingQuickReplyIndex = ref(-1)

async function loadQuickReplies() {
  try {
    const { data } = await quickReplyAPI.getMyQuickReplies()
    if (data && data.length > 0) {
      quickReplies.value = data.map(q => q.content)
    }
  } catch {}
}

function openAddQuickReply() {
  editingQuickReply.value = ''
  editingQuickReplyIndex.value = -1
  showQuickReplyManager.value = true
}

function saveQuickReply() {
  if (!editingQuickReply.value.trim()) return
  if (editingQuickReplyIndex.value >= 0) {
    quickReplies.value[editingQuickReplyIndex.value] = editingQuickReply.value.trim()
  } else {
    quickReplies.value.push(editingQuickReply.value.trim())
  }
  editingQuickReply.value = ''
  editingQuickReplyIndex.value = -1
  showQuickReplyManager.value = false
  // 保存到服务器
  quickReplyAPI.create(editingQuickReply.value.trim()).catch(() => {})
}

function editQuickReply(index) {
  editingQuickReply.value = quickReplies.value[index]
  editingQuickReplyIndex.value = index
  showQuickReplyManager.value = true
}

function deleteQuickReply(index) {
  quickReplies.value.splice(index, 1)
}

const typeMap = {
  paid_urgent: '付费加急',
  free_urgent: '免费加急',
  data_dispute: '数据质疑',
  follow_up: '跟单',
  consultation: '咨询',
  other: '其他',
  unqualified: '不合格沟通',
  data_confirm: '数据确认'
}

const getTypeName = (type) => typeMap[type] || type || '-'

const typeTagMap = {
  paid_urgent: 'danger',
  free_urgent: 'warning',
  data_dispute: 'danger',
  follow_up: 'info',
  consultation: 'info',
  other: '',
  unqualified: 'danger',
  data_confirm: 'success'
}
const getTypeTag = (type) => typeTagMap[type] || ''

const formatTime = (t) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

// 计算回复状态（发件人视角）
// 已完结由 isCompleted 字段单独控制
const computeReplyStatus = (comm) => {
  const recipients = comm.recipientDetails || []
  const total = recipients.length
  if (total === 0) return 'all_replied'
  const repliedCount = recipients.filter(r => r.has_replied).length
  if (repliedCount === 0) return 'unreplied'
  if (repliedCount === total) return 'all_replied'
  return 'partial_replied'
}

// 获取回复状态文字
const getReplyStatusText = (comm) => {
  const recipients = comm.recipientDetails || []
  const total = recipients.length
  if (total === 0) return '已回复'
  const repliedCount = recipients.filter(r => r.has_replied).length
  if (repliedCount === 0) return '未回复'
  if (repliedCount === total) return '已回复'
  return `${repliedCount}/${total} 已回复`
}

// 转发消息的原消息引用
const forwardedOriginalMsg = ref(null)
// 接收人状态用数据：转发消息时显示原消息的接收人状态
const statusComm = computed(() => forwardedOriginalMsg.value || selectedComm.value)

// 获取回复状态标签颜色
const getReplyTagType = (comm) => {
  const status = computeReplyStatus(comm)
  if (status === 'unreplied') return 'danger'
  if (status === 'partial_replied') return 'warning'
  return 'success'
}

// 沟通时效监控：付费加急超2小时未回复
const isOverdue = (comm) => {
  if (comm.isRecalled || comm.isCompleted) return false
  if (comm.vip !== '付费加急') return false
  if (!comm.createdAt) return false
  const elapsed = Date.now() - new Date(comm.createdAt).getTime()
  return elapsed > 2 * 60 * 60 * 1000
}

// 获取撤回消息状态文本
const getRecallStatusText = (comm) => {
  const recipients = comm.recipientDetails || []
  const repliedCount = recipients.filter(r => r.has_replied).length
  const total = recipients.length
  if (repliedCount === 0) return '已撤回'
  return `已撤回（${repliedCount}/${total} 已回复）`
}

// 获取行样式类名
const getRowClassName = ({ row }) => {
  if (row.isRecalled) {
    return 'recalled-row'
  }
  if (row.hasNewReply) {
    return 'has-new-reply'
  }
  // 根据沟通类型添加背景色
  if (row.type) {
    return 'type-' + row.type
  }
  return ''
}

// 各状态计数
// 搜索关键词过滤函数（与 filteredCommunications 共用，保证计数与显示一致）
const applySearchFilter = (data) => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return data
  return data.filter(c => {
    const replyTexts = (c.replies || []).map(r => r.content || '').join(' ')
    const fields = [
      c.content || '',
      c.customerName || '',
      c.sampleCode || '',
      getTypeName(c.type),
      replyTexts
    ].map(f => f.toLowerCase())
    return fields.some(f => f.includes(kw))
  })
}

// 先过滤已撤回的消息，再应用搜索过滤，确保计数和显示一一对应
const searchFilteredComms = computed(() => applySearchFilter(communications.value))

const unrepliedCount = computed(() => searchFilteredComms.value.filter(c => !c.isRecalled && computeReplyStatus(c) === 'unreplied' && !c.isCompleted).length)
const partialRepliedCount = computed(() => searchFilteredComms.value.filter(c => computeReplyStatus(c) === 'partial_replied' && !c.isCompleted).length)
const allRepliedCount = computed(() => searchFilteredComms.value.filter(c => computeReplyStatus(c) === 'all_replied' && !c.isCompleted).length)
const completedCount = computed(() => searchFilteredComms.value.filter(c => c.isCompleted).length)
const recalledCount = computed(() => recalledMessages.value.length)
const flaggedCount = computed(() => searchFilteredComms.value.filter(c => c.hasFlagged).length)

// 判断消息是否可以撤回（不限时间，只要未撤回即可）
const canRecall = (comm) => {
  if (!comm || !comm.createdAt) return false
  return !comm.isRecalled
}

// 筛选（支持模糊搜索 + 状态过滤）
const filteredCommunications = computed(() => {
  // 如果当前在"已撤回"标签，直接返回已撤回消息
  if (activeFilter.value === 'recalled') {
    return recalledMessages.value
  }
  
  // 使用与计数相同的 searchFilteredComms 作为基数据，保证完全同步
  let result = searchFilteredComms.value
  
  // 状态过滤
  if (activeFilter.value !== 'all') {
    if (activeFilter.value === 'completed') {
      result = result.filter(c => c.isCompleted)
    } else if (activeFilter.value === 'flagged') {
      result = result.filter(c => c.hasFlagged)
    } else if (activeFilter.value === 'unreplied') {
      result = result.filter(c => !c.isRecalled && computeReplyStatus(c) === 'unreplied' && !c.isCompleted)
    } else if (activeFilter.value === 'partial_replied') {
      result = result.filter(c => computeReplyStatus(c) === 'partial_replied' && !c.isCompleted)
    } else if (activeFilter.value === 'all_replied') {
      result = result.filter(c => computeReplyStatus(c) === 'all_replied' && !c.isCompleted)
    }
  }
  
  return result
})

  // 查看详情
  const viewDetail = async (comm) => {
  selectedComm.value = comm
  detailVisible.value = true
  forwardedOriginalMsg.value = null  // 重置

  // 如果是转发消息，获取原消息
  if (comm.forwardedFrom) {
    try {
      const res = await communicationAPI.getById(comm.forwardedFrom)
      forwardedOriginalMsg.value = res.data
    } catch (e) {
      console.error('加载原消息失败:', e)
    }
  }

  // 如果有新回复，清除标记
  if (comm.hasNewReply) {
    try {
      await supabase
        .from('communications')
        .update({ has_new_reply: false })
        .eq('id', comm.id)
      // 更新本地状态
      comm.hasNewReply = false
    } catch (e) {
      console.error('清除新回复标记失败:', e)
    }
  }
}

// 发起人标记整体完结
const toggleGlobalCompleted = async (comm, isCompleted) => {
  try {
    await communicationAPI.toggleCommCompleted(comm.id, isCompleted);
    comm.isCompleted = isCompleted;
    ElMessage.success(isCompleted ? '已标记整体完结' : '已取消整体完结');
    loadCommunications(); // 刷新列表
  } catch (e) {
    ElMessage.error('操作失败');
  }
}

// 切换红旗标记（通讯级别）
const toggleFlag = async (msg) => {
  try {
    const newVal = !msg.hasFlagged
    await communicationAPI.toggleCommFlag(msg.id, newVal)
    msg.hasFlagged = newVal
    ElMessage.success(newVal ? '已标记红旗' : '已取消红旗')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

// 详情弹窗中切换红旗
const toggleFlagFromDetail = async () => {
  if (!selectedComm.value) return
  try {
    const newVal = !selectedComm.value.hasFlagged
    await communicationAPI.toggleCommFlag(selectedComm.value.id, newVal)
    selectedComm.value.hasFlagged = newVal
    ElMessage.success(newVal ? '已标记红旗' : '已取消红旗')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

// 提交 inline 回复（回复记录中的追加回复）
const submitInlineReply = async (reply) => {
  const content = inlineReplyContent.value.trim()
  if (!content) {
    ElMessage.warning('请输入回复内容')
    return
  }
  inlineReplyLoading.value = true
  try {
    await communicationAPI.createReply(selectedComm.value.id, {
      content,
      targetRecipientId: reply.senderId
    }, true)
    ElMessage.success('回复成功')
    inlineReplyContent.value = ''
    activeReplyId.value = null
    // 重新加载详情
    const { data } = await communicationAPI.getById(selectedComm.value.id)
    selectedComm.value = data
  } catch (error) {
    ElMessage.error('回复失败：' + (error.message || '未知错误'))
  } finally {
    inlineReplyLoading.value = false
  }
}

const cancelInlineReply = () => {
  activeReplyId.value = null
  inlineReplyContent.value = ''
}

// 获取某个接收人的最新回复
// 获取某个接收人的所有回复（按时间倒序）
const getRecipientReplies = (recipientId) => {
  const comm = statusComm.value
  if (!comm || !comm.replies) return []
  const recipientReplies = comm.replies.filter(r =>
    r.senderId === recipientId || r.targetRecipientId === recipientId
  )
  return recipientReplies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

const getUserDisplayName = (userId) => {
  if (!selectedComm.value) return '未知'
  const recipient = selectedComm.value.recipientDetails?.find(r => r.recipient_id === userId)
  if (recipient) return recipient.name || '未知'
  if (userId === selectedComm.value.senderId) return selectedComm.value.senderName || '发起人'
  return '未知'
}

// 按 department_level3 分组部门名片持有人
const getDeptCardGroups = (comm) => {
  const deptCardIds = comm.departmentCardIds || []
  if (deptCardIds.length === 0) return []

  const recipients = comm.recipientDetails || []
  const deptCardRecipients = recipients.filter(r => deptCardIds.includes(r.recipient_id))

  // 按 department_level3 分组
  const groups = {}
  deptCardRecipients.forEach(r => {
    const dept = r.department_level3 || r.department || '未知部门'
    if (!groups[dept]) {
      groups[dept] = {
        deptName: dept,
        recipients: [],
        hasReplied: false,
        repliedByName: r.replied_by || ''
      }
    }
    groups[dept].recipients.push(r)
    if (r.has_replied) {
      groups[dept].hasReplied = true
      if (r.replied_by) {
        groups[dept].repliedByName = r.replied_by
      }
    }
  })

  return Object.values(groups)
}

// 获取非部门名片的普通收件人
const getNonDeptCardRecipients = (comm) => {
  const deptCardIds = comm.departmentCardIds || []
  if (deptCardIds.length === 0) return comm.recipientDetails || []
  return (comm.recipientDetails || []).filter(r => !deptCardIds.includes(r.recipient_id))
}

const getLatestReply = (recipientId) => {
  const replies = getRecipientReplies(recipientId)
  return replies.length > 0 ? replies[0].content : null
}

// 获取回复内容的样式类
const getReplyClass = (reply) => {
  if (!reply || !reply.content) return ''
  if (reply.content === '同意') return 'reply-agree'
  if (reply.content === '拒绝') return 'reply-reject'
  if (reply.targetRecipientId) return 'reply-follow-up'
  return 'reply-normal'
}

// 获取原始消息的接收人名称列表（用于转发引用卡片）
const getOriginalRecipientNames = (originalMsg) => {
  if (!originalMsg || !originalMsg.recipientDetails) return '-'
  return originalMsg.recipientDetails.map(r => r.name).join('、')
}

const loadCommunications = async () => {
  loading.value = true
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const response = await communicationAPI.getAll()
      const mine = response.data.filter(c => c.senderId === authUser.id).map(c => {
        // 计算 hasFlagged：发送人视角，取 communications 表级 is_flagged
        return {
          ...c,
          hasFlagged: !!c.is_flagged
        }
      })
      communications.value = mine
    }
  } catch (error) {
    ElMessage.error('加载发送记录失败')
  } finally {
    loading.value = false
  }
}

// 实时订阅消息变化（替代轮询）
const subscribeMessages = () => {
  // 先清理旧订阅
  if (messageChannel.value) {
    supabase.removeChannel(messageChannel.value)
    messageChannel.value = null
  }
  messageChannel.value = supabase
    .channel('sent-messages-realtime')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'communications' },
      (payload) => {
        // communications 表有更新时重新加载（如状态变化）
        supabase.auth.getUser().then(({ data }) => {
          if (data?.user && payload.new.sender_id === data.user.id) {
            loadCommunications()
          }
        }).catch(() => {})
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'communication_recipients' },
      (payload) => {
        // 收件人有回复时重新加载
        loadCommunications()
      }
    )
    .subscribe()
}

onMounted(() => {
  loadCommunications()
  subscribeMessages()
  loadQuickReplies()
})

onUnmounted(() => {
  // 清理 Realtime 订阅
  if (messageChannel.value) {
    supabase.removeChannel(messageChannel.value)
    messageChannel.value = null
  }
})

// 加载已撤回的消息
const loadRecalledMessages = async () => {
  recalledLoading.value = true
  try {
    const { data } = await communicationAPI.getRecalledMessages()
    recalledMessages.value = data || []
  } catch (error) {
    console.error('加载已撤回消息失败:', error)
    recalledMessages.value = []
    ElMessage.error('加载已撤回消息失败')
  } finally {
    recalledLoading.value = false
  }
}

// 显示撤回原因弹窗
const showRecallDialog = (msg) => {
  currentRecallingMsg.value = msg
  recallReason.value = ''
  recallDialogVisible.value = true
}

// 确认撤回
const confirmRecall = async () => {
  if (!currentRecallingMsg.value) return
  
  recallLoading.value = true
  try {
    await communicationAPI.recallMessage(currentRecallingMsg.value.id, recallReason.value)
    ElMessage.success('消息已撤回')
    recallDialogVisible.value = false
    detailVisible.value = false
    // 刷新两个列表
    await Promise.all([
      loadCommunications(),
      loadRecalledMessages()
    ])
  } catch (error) {
    ElMessage.error('撤回失败：' + (error.message || '未知错误'))
  } finally {
    recallLoading.value = false
  }
}

// 转发相关
const showForwardDialog = (comm) => {
  forwardTarget.value = comm
  forwardRecipients.value = []
  forwardNote.value = ''
  forwardDepartmentCardIds.value = []
  forwardDialogVisible.value = true
  // 加载用户列表
  loadForwardUsers()
  // 加载部门名片
  import('../api').then(({ departmentCardAPI }) => {
    departmentCardAPI.getDepartmentCards().then(res => {
      forwardDepartmentCards.value = res.data || []
    }).catch(() => {})
  })
}

const loadForwardUsers = async () => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('profiles')
      .select('id, name, department, role, department_level3')
      .neq('id', authUser?.id || '')
      .order('name')
    allUsers.value = data || []

    // 按角色分组并构建搜索键
    const roleNameMap = {}
    const roleOrder = []
    ROLE_OPTIONS.filter(r => r.value !== 'admin').forEach(r => {
      roleNameMap[r.value] = r.label
      roleOrder.push(r.value)
    })
    const groups = {}
    data.forEach(u => {
      const label = roleNameMap[u.role] || u.role || '其他'
      const userWithKeys = buildSearchKeys(u, roleNameMap)
      userWithKeys._roleName = label
      if (!groups[label]) groups[label] = { label, users: [] }
      groups[label].users.push(userWithKeys)
    })
    const seen = new Map()
    roleOrder.forEach(r => {
      const label = roleNameMap[r]
      if (label && groups[label] && !seen.has(label)) {
        seen.set(label, groups[label])
      }
    })
    forwardRecipientGroups.value = Array.from(seen.values())
  } catch (e) {
    console.error('加载用户列表失败:', e)
  }
}

// 转发选人器搜索
const filterForwardRecipient = (query) => {
  forwardSearchQuery.value = query
}

const filteredForwardGroups = computed(() => {
  return filterGroups(forwardSearchQuery.value, forwardRecipientGroups.value)
})

// 转发选人器辅助方法
const findForwardUserById = (uid) => {
  for (const group of forwardRecipientGroups.value) {
    const user = group.users.find(u => u.id === uid)
    if (user) return user
  }
  return null
}

const getForwardUserName = (uid) => findForwardUserById(uid)?.name || uid
const getForwardUserDept = (uid) => findForwardUserById(uid)?.department || '-'
const getForwardUserRoleName = (uid) => findForwardUserById(uid)?._roleName || '-'

const removeForwardRecipient = (uid) => {
  forwardRecipients.value = forwardRecipients.value.filter(id => id !== uid)
  // 检查是否属于某张部门名片，同步取消（与 BusinessInitiate removeRecipient 逻辑一致）
  const cardKey = findForwardCardKeyByHolderId(uid)
  if (cardKey && forwardDepartmentCardIds.value.includes(cardKey)) {
    forwardDepartmentCardIds.value = forwardDepartmentCardIds.value.filter(k => k !== cardKey)
    delete forwardDeptCardMap[cardKey]
    ElMessage.info('已同步取消部门名片')
  }
}

// 根据持有人ID查找所属部门名片key（与 BusinessInitiate findCardKeyByHolderId 一致）
const findForwardCardKeyByHolderId = (uid) => {
  for (const [cardKey, holderIds] of Object.entries(forwardDeptCardMap)) {
    if (holderIds.includes(uid)) return cardKey
  }
  return null
}

// 部门名片选择变化（与 BusinessInitiate onDepartmentCardsChange 逻辑一致）
let forwardDeptCardMap = {}  // { cardKey: [holderId, ...] }
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

// 打开转发弹窗
const openForwardDialog = async (comm) => {
  forwardTarget.value = comm
  forwardRecipients.value = []
  forwardDepartmentCardIds.value = []
  forwardDeptCardMap = {}
  forwardNote.value = ''
  forwardSearchQuery.value = ''
  forwardDialogVisible.value = true
  
  // 加载用户列表（复用 loadForwardUsers，它会填充 forwardRecipientGroups）
  await loadForwardUsers()
  
  // 加载部门名片
  try {
    const res = await departmentCardAPI.getDepartmentCards()
    forwardDepartmentCards.value = res.data || []
  } catch (e) {
    console.error('加载部门名片失败:', e)
    forwardDepartmentCards.value = []
  }
}

const confirmForward = async () => {
  if (!forwardTarget.value || (forwardRecipients.value.length === 0 && forwardDepartmentCardIds.value.length === 0)) {
    ElMessage.warning('请选择个人接收人或部门名片')
    return
  }
  forwardLoading.value = true
  try {
    // 收集部门持有人ID（与 submitForm 逻辑一致：department_card_ids 存用户ID）
    let deptHolderIds = []
    if (forwardDepartmentCardIds.value.length > 0 && forwardDepartmentCards.value.length > 0) {
      forwardDepartmentCardIds.value.forEach(cardKey => {
        const ids = departmentCardAPI.getHolderIds(cardKey, forwardDepartmentCards.value)
        deptHolderIds.push(...ids)
      })
    }
    // forwardRecipients 已包含个人+部门持有人（onForwardDepartmentCardsChange 自动添加）
    
    await communicationAPI.forwardMessage(forwardTarget.value.id, {
      recipientIds: [...forwardRecipients.value],
      departmentCardIds: deptHolderIds,
      note: forwardNote.value
    })
    ElMessage.success(`转发成功（共 ${forwardRecipients.value.length} 人）`)
    forwardDialogVisible.value = false
    loadCommunications()
  } catch (e) {
    ElMessage.error('转发失败：' + (e.message || '未知错误'))
  } finally {
    forwardLoading.value = false
  }
}

// 编辑并重发已撤回的消息
const editAndResend = (msg) => {
  // 将消息数据存储到 localStorage，然后跳转到发起沟通页面
  const editData = {
    type: msg.type,
    customerName: msg.customerName || '',
    sampleCode: msg.sampleCode || '',
    content: msg.content || '',
    recipientIds: (msg.recipientDetails || []).map(r => r.recipient_id || r.id),
    departmentCardIds: msg.departmentCardIds || [],
    vip: msg.vip ?? '',
    sampleMatrix: msg.sampleMatrix || '',
    sampleCount: msg.sampleCount || '',
    testItems: msg.testItems || '',
    sampleDate: msg.sampleDate || '',
    requestedCycle: msg.requestedCycle || '',
    chargeStatus: msg.chargeStatus || '',
    urgentFee: msg.urgentFee ?? '',
    remark: msg.remark || '',
    attachments: msg.attachments || [],
    isRecalledEdit: true,
    recalledId: msg.id
  }
  
  localStorage.setItem('recalledMessageEdit', JSON.stringify(editData))
  // 跳转到发起沟通页面（根据消息的 senderRole 判断是商务还是实验室）
  const senderRole = msg.senderRole || ''
  if (senderRole === 'lab') {
    window.location.href = '#/lab-initiate'
  } else {
    window.location.href = '#/business-initiate'
  }
}

// 删除已撤回的消息
const deleteRecalled = async (msg) => {
  try {
    await ElMessageBox.confirm('确定要删除这条已撤回的消息吗？删除后无法恢复。', '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const { error } = await supabase
      .from('communications')
      .delete()
      .eq('id', msg.id)
    
    if (error) throw error
    
    ElMessage.success('已删除')
    await loadRecalledMessages()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + (error.message || '未知错误'))
    }
  }
}

// 判断是否可追加回复：已回复且未完结
const canFollowUp = (comm) => {
  const status = computeReplyStatus(comm)
  return (status === 'partial_replied' || status === 'all_replied') && !comm.isRecalled && !comm.isCompleted
}

// 打开追加回复弹窗
const openFollowUp = (comm) => {
  followUpTarget.value = comm
  followUpContent.value = ''
  followUpTargetRecipient.value = null
  followUpVisible.value = true
}

// 提交追加回复
const submitFollowUp = async () => {
  const content = followUpContent.value.trim()
  if (!content) {
    ElMessage.warning('请输入回复内容')
    return
  }
  if (!followUpTarget.value) return

  followUpLoading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    // 插入回复
    const { error } = await supabase
      .from('replies')
      .insert({
        communication_id: followUpTarget.value.id,
        sender_id: user.id,
        content,
        target_recipient_id: followUpTargetRecipient.value
      })

    if (error) throw error

    // 发件人追加回复：重置所有收件人的已完结状态，并标记新回复
    await supabase
      .from('communication_recipients')
      .update({ 
        is_completed: false,
        has_new_reply: true
      })
      .eq('communication_id', followUpTarget.value.id)

    // 通知所有收件人
    const recipients = followUpTarget.value.recipientDetails || []
    if (recipients.length > 0) {
      const notifications = recipients.map(r => ({
        user_id: r.recipient_id,
        communication_id: followUpTarget.value.id,
        type: 'reply',
        content: `发起人追加回复：${content.length > 30 ? content.substring(0, 30) + '...' : content}`
      }))
      await supabase.from('notifications').insert(notifications)
    }

    ElMessage.success('追加回复已发送')
    followUpVisible.value = false
    loadCommunications()
  } catch (e) {
    ElMessage.error('发送失败：' + (e.message || '未知错误'))
  } finally {
    followUpLoading.value = false
  }
}

// 监听标签页切换，加载已撤回消息
const filterList = () => {
  if (activeFilter.value === 'recalled') {
    loadRecalledMessages()
  }
}
</script>

<style scoped>
.sent-page {
  padding: 20px;
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

.filter-bar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-bar {
  margin-bottom: 16px;
}

.recipient-row {
  display: flex;
  align-items: center;
  margin-bottom: 2px;
  font-size: 13px;
}

.recipient-name {
  font-weight: 500;
}

.reply-item {
  background: #f5f5f5;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 6px;
}

.reply-item p {
  margin: 0;
}

.reply-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px !important;
}

.no-reply {
  text-align: center;
  color: #999;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

/* 已撤回行样式 - 浅紫色 */
:deep(.recalled-row) {
  background-color: #f5f0ff !important;
}
:deep(.recalled-row:hover) {
  background-color: #ede0ff !important;
}

/* 新回复高亮样式 */
.has-new-reply {
  background-color: #fffef0 !important;
}

.has-new-reply td {
  background-color: #fffef0 !important;
}

/* 沟通类型行背景色 */
.type-paid_urgent { background-color: #e1f3d8 !important; }
.type-paid_urgent td { background-color: #e1f3d8 !important; }
.type-free_urgent { background-color: #fde2e2 !important; }
.type-free_urgent td { background-color: #fde2e2 !important; }
.type-data_dispute { background-color: #fef0f0 !important; }
.type-data_dispute td { background-color: #fef0f0 !important; }
.type-follow_up { background-color: #f0e6ff !important; }
.type-follow_up td { background-color: #f0e6ff !important; }

.reply-count {
  font-size: 12px;
  color: #666;
  padding: 2px 6px;
  background: #f5f5f5;
  border-radius: 4px;
}

.reply-agree {
  color: #67c23a;
  font-weight: 600;
}

.reply-reject {
  color: #f56c6c;
  font-weight: 600;
}

.reply-normal {
  color: #606266;
}

.reply-follow-up {
  background-color: #fff0f0;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
}

.recipient-reply-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
  border-bottom: 1px dashed #eee;
}

.recipient-reply-line:last-child {
  border-bottom: none;
}

.reply-time-mini {
  color: #999;
  font-size: 11px;
  white-space: nowrap;
}

/* 部门名片分组展示 */
.dept-card-group {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  padding: 2px 0;
}
.dept-group-label {
  font-weight: 600;
  font-size: 13px;
  color: #303133;
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

:deep(.forward-recipient-select .el-select__tags) {
  max-width: 100% !important;
}

/* ========== 详情弹窗 - 浅棕背景 ========== */
.detail-content-wrapper {
  border-radius: 8px;
  padding: 16px;
}
/* 强制 el-descriptions 单元格背景 */
.detail-content-wrapper :deep(.el-descriptions__body) {
  background: transparent;
}
.detail-content-wrapper :deep(.el-descriptions__cell) {
  background-color: #faf6eb !important;
}
/* 强制 el-table 单元格背景 */
.detail-content-wrapper :deep(.el-table__body td) {
  background-color: #faf6eb !important;
}
.detail-content-wrapper :deep(.el-table__body tr) {
  background-color: #faf6eb !important;
}
.detail-content-wrapper :deep(.el-table__header th.el-table__cell) {
  background-color: #faf6eb !important;
}
/* stripe 行也覆盖 */
.detail-content-wrapper :deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: #f5efe0 !important;
}
/* 去除 el-table 内部白色底色 */
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
/* 转发引用卡片内部的 descriptions 保持浅蓝背景 */
.forward-reference-card :deep(.el-descriptions__cell) {
  background-color: #dceefb !important;
}
.forward-reference-card :deep(.el-descriptions__body) {
  background: transparent;
}
</style>
