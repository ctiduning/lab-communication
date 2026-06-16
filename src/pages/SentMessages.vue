<template>
  <div class="sent-page">
    <div class="page-header">
      <h2>📤 已发送消息</h2>
      <p class="page-desc">查看历史上主动发出的沟通记录及回复状态</p>
    </div>

    <!-- 筛选标签 + 刷新按钮 -->
    <div class="filter-bar">
      <el-radio-group v-model="activeFilter" @change="filterList">
        <el-radio-button label="all">全部 ({{ communications.length + recalledMessages.length }})</el-radio-button>
        <el-radio-button label="unreplied">未回复 ({{ unrepliedCount }})</el-radio-button>
        <el-radio-button label="replied">已回复 ({{ repliedCount }})</el-radio-button>
        <el-radio-button label="completed">已完结 ({{ completedCount }})</el-radio-button>
        <el-radio-button label="recalled">已撤回 ({{ recalledCount }})</el-radio-button>
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
      <el-select v-model="tagFilter" clearable placeholder="按标签筛选" style="width:150px;margin-left:8px;">
        <el-option label="加急" value="加急" />
        <el-option label="常规" value="常规" />
        <el-option label="样品确认" value="样品确认" />
        <el-option label="报告核对" value="报告核对" />
        <el-option label="催办" value="催办" />
        <el-option label="已完成" value="已完成" />
      </el-select>
    </div>

    <el-table :data="filteredCommunications" border stripe v-loading="loading" empty-text="暂无发送记录" v-if="activeFilter !== 'recalled'" @row-click="viewDetail" :row-class-name="getRowClassName">
      <el-table-column label="状态" width="110" align="center">
        <template #default="scope">
          <el-tag v-if="scope.row.isRecalled" size="small" type="warning">已撤回</el-tag>
          <el-tag v-else-if="scope.row.isCompleted" size="small" type="success">已完结</el-tag>
          <el-tag v-else-if="computeReplyStatus(scope.row) === 'replied'" size="small" type="success">已回复</el-tag>
          <el-tag v-else size="small" type="danger">未回复</el-tag>
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
      <el-table-column label="标签" width="160">
        <template #default="scope">
          <span v-if="scope.row.tags && scope.row.tags.length > 0" style="display:flex;flex-wrap:wrap;gap:3px;">
            <el-tag v-for="tag in scope.row.tags" :key="tag" size="small" :color="getTagColor(tag)" style="color:#fff;border:none;">
              {{ tag }}
            </el-tag>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="客户/样品" min-width="140">
        <template #default="scope">
          <div>{{ scope.row.customerName || '-' }}</div>
          <div style="font-size:11px;color:#999;">{{ scope.row.sampleCode || scope.row.content?.substring(0, 20) || '' }}</div>
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
      <el-table-column label="操作" width="260" align="center">
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
    <el-dialog title="沟通详情" v-model="detailVisible" width="750px" destroy-on-close>
      <div v-if="selectedComm">
        <h4>基本信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="沟通类型">{{ getTypeName(selectedComm.type) }}</el-descriptions-item>
          <el-descriptions-item label="客户名称">{{ selectedComm.customerName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="样品短号">{{ selectedComm.sampleCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="发送时间">{{ formatTime(selectedComm.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="标签">
            <span v-if="selectedComm.tags && selectedComm.tags.length > 0" style="display:flex;flex-wrap:wrap;gap:3px;">
              <el-tag v-for="tag in selectedComm.tags" :key="tag" size="small" :color="getTagColor(tag)" style="color:#fff;border:none;">
                {{ tag }}
              </el-tag>
            </span>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedComm.remark" label="备注" :span="2">{{ selectedComm.remark }}</el-descriptions-item>
          <el-descriptions-item v-if="selectedComm.content" label="内容" :span="2">{{ selectedComm.content }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-top: 20px;">接收人状态</h4>
        <div v-if="selectedComm.departmentCardIds && selectedComm.departmentCardIds.length > 0">
          <!-- 部门名片分组 -->
          <div v-for="(group, gIdx) in getDeptCardGroups(selectedComm)" :key="gIdx" style="margin-bottom: 12px; border: 1px solid #ebeef5; border-radius: 4px; padding: 8px;">
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
                          <el-tag v-for="(qr, qi) in quickReplies" :key="qi" size="small" style="cursor:pointer;" @click="inlineReplyContent = qr">{{ qr }}</el-tag>
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
              <el-table-column label="个人状态" width="90" align="center">
                <template #default="scope">
                  <el-tag v-if="scope.row.has_replied" size="small" type="success">已回复</el-tag>
                  <el-tag v-else size="small" type="danger">未回复</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <!-- 非部门名片的普通收件人 -->
          <div v-if="getNonDeptCardRecipients(selectedComm).length > 0">
            <h5 style="margin-bottom: 8px;">其他收件人</h5>
            <el-table :data="getNonDeptCardRecipients(selectedComm)" border size="small">
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
                          <el-tag v-for="(qr, qi) in quickReplies" :key="qi" size="small" style="cursor:pointer;" @click="inlineReplyContent = qr">{{ qr }}</el-tag>
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
              <el-table-column label="回复状态" width="90" align="center">
                <template #default="scope">
                  <el-tag v-if="scope.row.has_replied" size="small" type="success">已回复</el-tag>
                  <el-tag v-else size="small" type="danger">未回复</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
        <el-table v-else :data="selectedComm.recipientDetails || []" border size="small">
          <el-table-column prop="name" label="接收人" width="100"></el-table-column>
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
          <span v-if="selectedComm.recipientDetails && selectedComm.recipientDetails.length > 0">
            已读 {{ selectedComm.recipientDetails.filter(r => r.is_read).length }}/{{ selectedComm.recipientDetails.length }}
            <span v-if="selectedComm.recipientDetails.filter(r => !r.is_read).length > 0" style="color: #e6a23c;">
              · {{ selectedComm.recipientDetails.filter(r => !r.is_read).length }} 人未读
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
    <el-dialog title="转发消息" v-model="forwardDialogVisible" width="600px" :close-on-click-modal="false">
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { communicationAPI, getRoleDisplayName } from '../api'
import { supabase } from '../utils/supabase'

const communications = ref([])
const recalledMessages = ref([])
const recalledLoading = ref(false)
const loading = ref(false)
const activeFilter = ref('all')
const detailVisible = ref(false)
const selectedComm = ref(null)
const searchKeyword = ref('')  // 搜索关键词
const tagFilter = ref('')  // 标签筛选
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
const allUsers = ref([])

// 快捷回复预设
const quickReplies = ['收到，已安排', '样品已收到，正在检测', '报告已出具，请查收', '预计 X 个工作日出报告', '数据确认中，稍后回复']

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

const getTagColor = (tag) => {
  const colors = {
    '加急': '#e74c3c',
    '样品确认': '#27ae60',
    '报告核对': '#2980b9',
    '常规': '#95a5a6',
    '催办': '#f39c12'
  }
  return colors[tag] || '#909399'
}

const formatTime = (t) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

// 计算回复状态（发件人视角，简化版：仅区分 已回复 / 未回复）
// 已完结由 isCompleted 字段单独控制
const computeReplyStatus = (comm) => {
  const recipients = comm.recipientDetails || []
  const total = recipients.length
  if (total === 0) return 'replied'
  const repliedCount = recipients.filter(r => r.has_replied).length
  return repliedCount > 0 ? 'replied' : 'unreplied'
}

// 获取行样式类名
const getRowClassName = ({ row }) => {
  if (row.hasNewReply) {
    return 'has-new-reply'
  }
  return ''
}

// 各状态计数
const unrepliedCount = computed(() => communications.value.filter(c => computeReplyStatus(c) === 'unreplied' && !c.isCompleted).length)
const repliedCount = computed(() => communications.value.filter(c => computeReplyStatus(c) === 'replied' && !c.isCompleted).length)
const completedCount = computed(() => communications.value.filter(c => c.isCompleted).length)
const recalledCount = computed(() => recalledMessages.value.length)

// 判断消息是否在5分钟撤回窗口内
const canRecall = (comm) => {
  if (!comm || !comm.createdAt) return false
  const now = new Date()
  const createdAt = new Date(comm.createdAt)
  const diffMinutes = (now - createdAt) / (1000 * 60)
  return diffMinutes <= 5 && !comm.isRecalled
}

// 筛选（支持模糊搜索 + 状态过滤）
const filteredCommunications = computed(() => {
  // 如果当前在"已撤回"标签，直接返回已撤回消息
  if (activeFilter.value === 'recalled') {
    return recalledMessages.value
  }
  
  // 过滤掉已撤回的消息（它们应该在"已撤回"标签页中）
  let result = communications.value.filter(c => !c.isRecalled)
  
  // 状态过滤（简化版：未回复/已回复/已完结/已撤回）
  if (activeFilter.value !== 'all') {
    if (activeFilter.value === 'completed') {
      result = result.filter(c => c.isCompleted)
    } else if (activeFilter.value === 'recalled') {
      // 已撤回在单独的表格中处理
    } else if (activeFilter.value === 'unreplied') {
      result = result.filter(c => computeReplyStatus(c) === 'unreplied' && !c.isCompleted)
    } else if (activeFilter.value === 'replied') {
      result = result.filter(c => computeReplyStatus(c) === 'replied' && !c.isCompleted)
    }
  }
  
  // 标签筛选
  if (tagFilter.value) {
    result = result.filter(c => c.tags && c.tags.includes(tagFilter.value))
  }
  
  // 模糊搜索
  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) {
    result = result.filter(c => {
      // 搜索字段：沟通内容、客户名称、样品短号、沟通类型、回复内容
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
  
  return result
})

  // 查看详情
  const viewDetail = async (comm) => {
  selectedComm.value = comm
  detailVisible.value = true

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
  if (!selectedComm.value || !selectedComm.value.replies) return []
  const recipientReplies = selectedComm.value.replies.filter(r =>
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
  forwardDialogVisible.value = true
  // 加载用户列表
  loadForwardUsers()
}

const loadForwardUsers = async () => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('profiles')
      .select('id, name, department')
      .neq('id', authUser?.id || '')
      .order('name')
    allUsers.value = data || []
  } catch (e) {
    console.error('加载用户列表失败:', e)
  }
}

const confirmForward = async () => {
  if (!forwardTarget.value || forwardRecipients.value.length === 0) {
    ElMessage.warning('请选择接收人')
    return
  }
  forwardLoading.value = true
  try {
    await communicationAPI.forwardMessage(forwardTarget.value.id, {
      recipientIds: forwardRecipients.value,
      note: forwardNote.value
    })
    ElMessage.success('转发成功')
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
  return computeReplyStatus(comm) === 'replied' && !comm.isRecalled && !comm.isCompleted
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

/* 新回复高亮样式 */
.has-new-reply {
  background-color: #fffef0 !important;
}

.has-new-reply td {
  background-color: #fffef0 !important;
}

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
</style>
