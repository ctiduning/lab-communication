<template>
  <div class="business-initiate">
    <h2 class="page-title">发起沟通</h2>
    
    <!-- 撤回编辑提示横幅 -->
    <div v-if="isRecalledEditMode" style="background:#FFF8E1;border:1px solid #FFD54F;border-left:4px solid #FF8F00;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:14px;font-weight:500;color:#795548;">编辑已撤回消息 — 修改后重新发送</span>
      <el-button size="small" type="danger" @click="exitRecalledEdit">退出编辑</el-button>
    </div>
    
    <el-form :model="form" label-width="120px" class="communication-form">
      <el-form-item label="沟通类型" prop="type">
        <el-select v-model="form.type" placeholder="请选择沟通类型">
          <el-option label="付费加急" value="paid_urgent"></el-option>
          <el-option label="免费加急" value="free_urgent"></el-option>
          <el-option label="数据质疑" value="data_dispute"></el-option>
          <el-option label="跟单" value="follow_up"></el-option>
          <el-option label="咨询" value="consultation"></el-option>
          <el-option label="其他" value="other"></el-option>
        </el-select>
      </el-form-item>
      
      <el-form-item label="消息内容" prop="content">
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <el-button size="small" type="default" @click="showTemplateSelector = !showTemplateSelector">
            从模板
          </el-button>
          <el-button size="small" type="primary" @click="showTemplateManager = true">
            管理模板
          </el-button>
          <template v-if="showTemplateSelector && myTemplates.length > 0">
            <el-select v-model="selectedTemplateId" placeholder="选择模板..." size="small" style="width:200px;" @change="applyTemplate" clearable>
              <el-option v-for="tpl in myTemplates" :key="tpl.id" :label="tpl.name" :value="tpl.id" />
            </el-select>
          </template>
        </div>
        <el-input type="textarea" v-model="form.content" placeholder="请输入消息内容" :rows="4"></el-input>
      </el-form-item>
      
      <el-form-item label="是否为V1V2客户" prop="vip">
        <el-select v-model="form.vip" placeholder="请选择">
          <el-option label="是" value="yes"></el-option>
          <el-option label="否" value="no"></el-option>
        </el-select>
      </el-form-item>
      
      <el-form-item label="客户名称" prop="customerName">
        <el-input v-model="form.customerName" placeholder="请输入客户名称"></el-input>
      </el-form-item>
      
      <el-form-item label="样品短号" prop="sampleCode">
        <el-input v-model="form.sampleCode" placeholder="未进单可空"></el-input>
      </el-form-item>
      
      <el-form-item label="样品基质" prop="sampleMatrix">
        <el-input v-model="form.sampleMatrix" placeholder="请输入样品基质"></el-input>
      </el-form-item>
      
      <el-form-item label="样品数量" prop="sampleCount">
        <el-input type="number" v-model="form.sampleCount" placeholder="请输入样品数量"></el-input>
      </el-form-item>
      
      <el-form-item label="测试项目" prop="testItems">
        <el-input v-model="form.testItems" placeholder="请输入测试项目"></el-input>
      </el-form-item>
      
      <el-form-item label="到样日期" prop="sampleDate">
        <el-date-picker v-model="form.sampleDate" type="date" placeholder="选择到样日期"></el-date-picker>
      </el-form-item>
      
      <el-form-item label="想要的测试周期" prop="requestedCycle">
        <el-input v-model="form.requestedCycle" placeholder="请输入想要的测试周期"></el-input>
      </el-form-item>
      
      <el-form-item label="测试费用" prop="chargeStatus">
        <el-input v-model="form.chargeStatus" placeholder="请输入收取的测试费用金额"></el-input>
      </el-form-item>
      
      <el-form-item label="收取的加急费用" prop="urgentFee">
        <el-input type="number" v-model="form.urgentFee" placeholder="请输入加急费用"></el-input>
      </el-form-item>
      
      <el-form-item label="备注" prop="remark">
        <el-input type="textarea" v-model="form.remark" placeholder="请输入备注信息" :rows="3"></el-input>
        <div style="margin-top:8px;">
          <!-- 标准上传（兼容所有浏览器） -->
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            :on-change="handleUpload"
            multiple
          >
            <el-button size="small" type="default">📎 选择图片</el-button>
          </el-upload>
          
          <!-- 高级上传（支持任意位置，仅 Chrome/Edge） -->
          <el-button 
            v-if="supportsFileSystemAPI" 
            size="small" 
            type="primary" 
            style="margin-left:8px;"
            @click="pickFilesWithAPI"
          >
            📂 从任意位置选择
          </el-button>
          
          <div v-if="form.attachments.length > 0" style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
            <div v-for="(att, idx) in form.attachments" :key="idx" style="position:relative;width:80px;height:80px;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">
              <img :src="att.url" style="width:100%;height:100%;object-fit:cover;cursor:pointer;" @click="previewImage(att.url)" />
              <el-button size="small" style="position:absolute;top:2px;right:2px;min-width:20px;min-height:20px;padding:0;" type="danger" circle @click="form.attachments.splice(idx, 1)">×</el-button>
            </div>
          </div>
        </div>
      </el-form-item>
      
      <!-- 直接显示消息接收人选择（去掉部门筛选） -->
      <el-form-item label="消息接收人" prop="recipients">
        <el-select-v2
          v-model="form.recipients"
          :options="filteredSelectOptions"
          multiple
          filterable
          :filter-method="filterRecipient"
          placeholder="输入姓名/拼音/部门/角色搜索..."
          style="width: 100%; min-width: 600px;"
          :teleported="false"
          :popper-append-to-body="false"
          :max-collapse-tags="0"
          class="recipient-select"
          :height="320"
        >
          <template #default="{ item }">
            <div v-if="!item.isGroupHeader" style="display:flex;align-items:center;gap:8px;">
              <span style="font-weight:500;">{{ item.rawName }}</span>
              <span style="color:#999;font-size:12px;">{{ item.rawDept || '-' }} · {{ item.rawRole || '-' }}</span>
            </div>
          </template>
        </el-select-v2>
        <div style="color: #999; font-size: 12px; margin-top: 4px;">
          已选择 {{ form.recipients.length }} 人（支持拼音首字母/全拼/部门/角色搜索）
        </div>
        <!-- 已选人员名片展示 -->
        <div v-if="form.recipients.length > 0" class="selected-recipient-cards">
          <div v-for="uid in form.recipients" :key="uid" class="recipient-card">
            <span class="recipient-card-name">{{ getUserName(uid) }}</span>
            <span class="recipient-card-dept">{{ getUserDept(uid) }}</span>
            <span class="recipient-card-role">{{ getUserRoleName(uid) }}</span>
            <span class="recipient-card-remove" @click="removeRecipient(uid)">×</span>
          </div>
        </div>
      </el-form-item>
      
      <!-- 按部门发起沟通（多选 + 模糊搜索） -->
      <el-form-item label="按部门发起沟通" v-if="departmentCards.length > 0">
        <el-select
          v-model="form.departmentCards"
          multiple
          filterable
          :filter-method="filterDeptCard"
          placeholder="搜索或选择检测部门（可多选）"
          style="width: 100%;"
          popper-class="dept-card-popper"
          @change="onDepartmentCardsChange"
          clearable
        >
          <el-option
            v-for="card in filteredDepartmentCards"
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
        <div v-if="deptCardSearchKeyword && filteredDepartmentCards.length === 0 && departmentCards.length > 0" style="color:#909399;font-size:12px;padding:4px 0;">
          未找到匹配的部门
        </div>
        <div style="font-size:12px;font-weight:500;color:#A32D2D;line-height:1.6;margin-top:4px;">
          <span style="background:#FCEBEB;padding:1px 6px;border-radius:3px;">注意</span>
          选择部门后，消息将发送给该部门的负责人（检测组长+检测组长助理），同组任意一人回复即为该组已处理。
          <span style="font-weight:500;">报告组和客服组请直接选择个人名片，不要选择部门名片。</span>
        </div>
      </el-form-item>

      <!-- 抄送人选择 -->
      <el-form-item label="抄送人">
        <el-select-v2
          v-model="form.ccRecipients"
          :options="filteredCCOptions"
          multiple
          filterable
          :filter-method="filterCCRecipient"
          placeholder="输入姓名/拼音/部门/角色搜索..."
          style="width: 100%; min-width: 600px;"
          :teleported="false"
          :popper-append-to-body="false"
          :max-collapse-tags="0"
          class="recipient-select"
          :height="320"
        >
          <template #default="{ item }">
            <div v-if="!item.isGroupHeader" style="display:flex;align-items:center;gap:8px;">
              <span style="font-weight:500;">{{ item.rawName }}</span>
              <span style="color:#999;font-size:12px;">{{ item.rawDept || '-' }} · {{ item.rawRole || '-' }}</span>
            </div>
          </template>
        </el-select-v2>
        <div style="color: #999; font-size: 12px; margin-top: 4px;">
          已选择 {{ form.ccRecipients.length }} 人
        </div>
        <!-- 已选抄送人名片展示 -->
        <div v-if="form.ccRecipients.length > 0" class="selected-recipient-cards">
          <div v-for="uid in form.ccRecipients" :key="uid" class="recipient-card" style="background:#f0f9eb;border-color:#b7eb8f;">
            <span style="background:#52c41a;color:#fff;font-size:10px;padding:0 5px;border-radius:3px;margin-right:4px;">抄送</span>
            <span class="recipient-card-name">{{ getCCUserName(uid) }}</span>
            <span class="recipient-card-dept">{{ getCCUserDept(uid) }}</span>
            <span class="recipient-card-role">{{ getCCUserRoleName(uid) }}</span>
            <span class="recipient-card-remove" @click="removeCCRecipient(uid)">×</span>
          </div>
        </div>
        <!-- 常用抄送人 -->
        <div v-if="ccPresetUserIds.length > 0" style="margin-top:8px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:12px;color:#999;">常用抄送人</span>
            <el-button size="small" type="danger" plain @click="openCCManagement" style="font-size:11px;padding:2px 8px;">管理</el-button>
          </div>
          <el-tag
            v-for="uid in ccPresetUserIds"
            :key="uid"
            size="small"
            style="cursor:pointer;margin:2px;"
            :type="form.ccRecipients.includes(uid) ? 'success' : 'info'"
            @click="toggleFrequentCC(uid)"
          >
            {{ ccUserName(uid) }}
          </el-tag>
        </div>
        <div v-else style="margin-top:8px;">
          <el-button size="small" type="primary" @click="openCCManagement" style="padding:2px 8px;">设置常用抄送人</el-button>
        </div>
      </el-form-item>

      <!-- 抄送人说明 -->
      <div style="color:#f56c6c;font-size:12px;margin:-8px 0 16px 120px;line-height:1.5;">
        主要供业务助理抄送业务使用，不管业务是否回复，都不影响消息的状态。
      </div>

      <!-- 常用抄送人管理弹窗 -->
      <el-dialog title="管理常用抄送人" v-model="ccDialogVisible" width="500px" destroy-on-close>
        <div style="margin-bottom:16px;">
          <el-input
            v-model="ccSearchQuery"
            placeholder="搜索姓名、部门..."
            clearable
            @input="filterCCSearch"
            @clear="filterCCSearch('')"
            style="width:100%;"
          />
        </div>
        <div style="margin-bottom:12px;font-size:12px;color:#999;">
          已选（点击移除）
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;min-height:32px;">
          <el-tag
            v-for="uid in ccPresetUserIds"
            :key="uid"
            closable
            size="small"
            style="--el-tag-bg-color:#1890ff;--el-tag-text-color:#fff;--el-tag-border-color:#1890ff;color:#fff;"
            @close="removeCCPreset(uid)"
          >
            {{ ccUserName(uid) }}
          </el-tag>
          <span v-if="ccPresetUserIds.length === 0" style="font-size:12px;color:#ccc;">暂无，从下方添加</span>
        </div>
        <div style="margin-bottom:8px;font-size:12px;color:#999;">可选的联系人</div>
        <div style="max-height:250px;overflow-y:auto;">
          <div
            v-for="user in ccSearchResults"
            :key="user.id"
            @click.stop="isCCPreset(user.id) ? removeCCPreset(user.id) : addCCPreset(user.id)"
            style="display:flex;align-items:center;gap:8px;padding:8px 6px;border-radius:4px;cursor:pointer;transition:background 0.15s;"
            @mouseenter="$event.currentTarget.style.background='#f5f7fa'"
            @mouseleave="$event.currentTarget.style.background=''"
          >
            <span style="font-size:13px;">{{ user.name }}</span>
            <span style="font-size:11px;color:#999;">{{ user.department || '-' }}</span>
            <span style="font-size:11px;color:#999;">{{ user._roleName || '-' }}</span>
            <span style="margin-left:auto;font-size:11px;">
              <span v-if="isCCPreset(user.id)" style="color:#e6a23c;">已选</span>
              <span v-else style="color:#409eff;font-weight:500;">+ 添加</span>
            </span>
          </div>
          <div v-if="ccSearchResults.length === 0" style="text-align:center;padding:20px;color:#ccc;font-size:13px;">
            无匹配的联系人
          </div>
        </div>
        <template #footer>
          <el-button @click="ccDialogVisible = false">关闭</el-button>
        </template>
      </el-dialog>

      <el-form-item>
        <el-button type="primary" @click="submitForm" :loading="sending" :disabled="sending">发送</el-button>
        <el-button @click="saveDraft">保存草稿</el-button>
        <el-button @click="resetForm">重置</el-button>
        <el-button v-if="drafts.length > 0" type="info" @click="showDraftBox = !showDraftBox">
          草稿箱 ({{ drafts.length }})
        </el-button>
      </el-form-item>
    </el-form>
    
    <!-- 草稿箱抽屉 -->
    <el-drawer v-model="showDraftBox" title="草稿箱" size="400px" direction="rtl">
      <div v-if="drafts.length === 0" style="text-align:center;color:#999;padding:40px;">
        暂无草稿
      </div>
      <div v-else class="draft-list">
        <div v-for="(d, idx) in drafts" :key="idx" class="draft-item">
          <div class="draft-header">
            <span class="draft-time">{{ formatDraftTime(d.savedAt) }}</span>
            <el-tag size="small" type="info">{{ d.type ? getTypeName(d.type) : '未选类型' }}</el-tag>
          </div>
          <div class="draft-preview">{{ d.content || '(空)' }}</div>
          <div class="draft-actions">
            <el-button size="small" type="primary" @click="loadDraft(idx)">继续编辑</el-button>
            <el-button size="small" type="danger" @click="deleteDraft(idx)">删除</el-button>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 模板管理弹窗 -->
    <el-dialog title="管理模板" v-model="showTemplateManager" width="600px" :close-on-click-modal="false">
      <div style="margin-bottom:12px;">
        <el-button type="primary" size="small" @click="openTemplateEditor(null)">新建模板</el-button>
      </div>
      <el-table :data="myTemplates" border stripe size="small" empty-text="暂无模板">
        <el-table-column prop="name" label="名称" min-width="120"></el-table-column>
        <el-table-column prop="title" label="标题" min-width="120" show-overflow-tooltip></el-table-column>
        <el-table-column label="内容预览" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            {{ scope.row.content || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="usage_count" label="使用次数" width="80" align="center"></el-table-column>
        <el-table-column label="操作" width="140" align="center">
          <template #default="scope">
            <el-button size="small" @click="openTemplateEditor(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteTemplate(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 新建/编辑模板弹窗 -->
    <el-dialog :title="editingTemplate ? '编辑模板' : '新建模板'" v-model="templateEditorVisible" width="700px" :close-on-click-modal="false">
      <el-form label-width="100px">
        <el-form-item label="名称">
          <el-input v-model="templateForm.name" placeholder="模板名称" />
        </el-form-item>
        <el-form-item label="沟通类型">
          <el-select v-model="templateForm.type" placeholder="请选择沟通类型" clearable style="width:100%;">
            <el-option label="付费加急" value="paid_urgent"></el-option>
            <el-option label="免费加急" value="free_urgent"></el-option>
            <el-option label="数据质疑" value="data_dispute"></el-option>
            <el-option label="跟单" value="follow_up"></el-option>
            <el-option label="咨询" value="consultation"></el-option>
            <el-option label="其他" value="other"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="templateForm.title" placeholder="模板标题（可选）" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="templateForm.content" type="textarea" :rows="4" placeholder="模板内容" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="V1V2客户">
              <el-select v-model="templateForm.vip" placeholder="请选择" clearable style="width:100%;">
                <el-option label="是" value="yes"></el-option>
                <el-option label="否" value="no"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户名称">
              <el-input v-model="templateForm.customerName" placeholder="客户名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="样品短号">
              <el-input v-model="templateForm.sampleCode" placeholder="样品短号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="样品基质">
              <el-input v-model="templateForm.sampleMatrix" placeholder="样品基质" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="样品数量">
              <el-input v-model="templateForm.sampleCount" placeholder="样品数量" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="测试项目">
              <el-input v-model="templateForm.testItems" placeholder="测试项目" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="到样日期">
              <el-input v-model="templateForm.sampleDate" placeholder="到样日期" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="测试周期">
              <el-input v-model="templateForm.requestedCycle" placeholder="想要的测试周期" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="测试费用">
              <el-input v-model="templateForm.chargeStatus" placeholder="测试费用金额" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="加急费用">
              <el-input v-model="templateForm.urgentFee" placeholder="加急费用" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="templateForm.remark" type="textarea" :rows="2" placeholder="备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateEditorVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate" :loading="templateSaving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { communicationAPI, storageAPI, departmentCardAPI, templateAPI, ROLE_OPTIONS, getRoleDisplayName } from '../api';
import { supabase } from '../utils/supabase';
import { buildSearchKeys, matchUser } from '../utils/pinyinSearch';
import { getLevel2Options, getLevel3Options, getRoleOptions, isDepartmentCardRole } from '../utils/departmentConfig';
import { useAutoSave } from '../utils/autoSave';
import { pinyin } from 'pinyin-pro';

const router = useRouter();

// 草稿箱
const showDraftBox = ref(false);
const drafts = ref([]);

// 模板相关
const showTemplateSelector = ref(false);
const selectedTemplateId = ref(null);
const myTemplates = ref([]);

const loadMyTemplates = async () => {
  try {
    const { data } = await templateAPI.getMyTemplates()
    myTemplates.value = data || []
  } catch (e) {
    console.warn('加载模板失败:', e)
  }
}

const applyTemplate = (id) => {
  if (!id) return
  const tpl = myTemplates.value.find(t => t.id === id)
  if (!tpl) return
  if (tpl.title) form.content = tpl.title + '\n' + tpl.content
  else form.content = tpl.content
  form.templateId = id
  if (tpl.type) form.type = tpl.type
  if (tpl.vip) form.vip = tpl.vip
  if (tpl.customerName || tpl.customer_name) form.customerName = tpl.customerName || tpl.customer_name
  if (tpl.sampleCode || tpl.sample_code) form.sampleCode = tpl.sampleCode || tpl.sample_code
  if (tpl.sampleMatrix || tpl.sample_matrix) form.sampleMatrix = tpl.sampleMatrix || tpl.sample_matrix
  if (tpl.sampleCount || tpl.sample_count) form.sampleCount = tpl.sampleCount || tpl.sample_count
  if (tpl.testItems || tpl.test_items) form.testItems = tpl.testItems || tpl.test_items
  if (tpl.sampleDate || tpl.sample_date) form.sampleDate = tpl.sampleDate || tpl.sample_date
  if (tpl.requestedCycle || tpl.requested_cycle) form.requestedCycle = tpl.requestedCycle || tpl.requested_cycle
  if (tpl.chargeStatus || tpl.charge_status) form.chargeStatus = tpl.chargeStatus || tpl.charge_status
  if (tpl.urgentFee || tpl.urgent_fee) form.urgentFee = tpl.urgentFee || tpl.urgent_fee
  if (tpl.remark) form.remark = tpl.remark
}

// 模板管理
const showTemplateManager = ref(false)
const templateEditorVisible = ref(false)
const editingTemplate = ref(null)
const templateSaving = ref(false)
const templateForm = reactive({
  name: '',
  title: '',
  content: '',
  type: '',
  vip: '',
  customerName: '',
  sampleCode: '',
  sampleMatrix: '',
  sampleCount: '',
  testItems: '',
  sampleDate: '',
  requestedCycle: '',
  chargeStatus: '',
  urgentFee: '',
  remark: '',
})

const openTemplateEditor = (tpl) => {
  if (tpl) {
    editingTemplate.value = tpl
    templateForm.name = tpl.name || ''
    templateForm.title = tpl.title || ''
    templateForm.content = tpl.content || ''
    templateForm.type = tpl.type || ''
    templateForm.vip = tpl.vip || ''
    templateForm.customerName = tpl.customerName || tpl.customer_name || ''
    templateForm.sampleCode = tpl.sampleCode || tpl.sample_code || ''
    templateForm.sampleMatrix = tpl.sampleMatrix || tpl.sample_matrix || ''
    templateForm.sampleCount = tpl.sampleCount || tpl.sample_count || ''
    templateForm.testItems = tpl.testItems || tpl.test_items || ''
    templateForm.sampleDate = tpl.sampleDate || tpl.sample_date || ''
    templateForm.requestedCycle = tpl.requestedCycle || tpl.requested_cycle || ''
    templateForm.chargeStatus = tpl.chargeStatus || tpl.charge_status || ''
    templateForm.urgentFee = tpl.urgentFee || tpl.urgent_fee || ''
    templateForm.remark = tpl.remark || ''
  } else {
    editingTemplate.value = null
    templateForm.name = ''
    templateForm.title = ''
    templateForm.content = ''
    templateForm.type = ''
    templateForm.vip = ''
    templateForm.customerName = ''
    templateForm.sampleCode = ''
    templateForm.sampleMatrix = ''
    templateForm.sampleCount = ''
    templateForm.testItems = ''
    templateForm.sampleDate = ''
    templateForm.requestedCycle = ''
    templateForm.chargeStatus = ''
    templateForm.urgentFee = ''
    templateForm.remark = ''
  }
  templateEditorVisible.value = true
}

const saveTemplate = async () => {
  templateSaving.value = true
  try {
    if (editingTemplate.value) {
      await templateAPI.update(editingTemplate.value.id, {
        name: templateForm.name.trim(),
        title: templateForm.title.trim(),
        content: templateForm.content.trim(),
        type: templateForm.type,
        vip: templateForm.vip,
        customerName: templateForm.customerName,
        sampleCode: templateForm.sampleCode,
        sampleMatrix: templateForm.sampleMatrix,
        sampleCount: templateForm.sampleCount,
        testItems: templateForm.testItems,
        sampleDate: templateForm.sampleDate,
        requestedCycle: templateForm.requestedCycle,
        chargeStatus: templateForm.chargeStatus,
        urgentFee: templateForm.urgentFee,
        remark: templateForm.remark,
      })
      ElMessage.success('模板已更新')
    } else {
      await templateAPI.create({
        name: templateForm.name.trim(),
        title: templateForm.title.trim(),
        content: templateForm.content.trim(),
        type: templateForm.type,
        vip: templateForm.vip,
        customerName: templateForm.customerName,
        sampleCode: templateForm.sampleCode,
        sampleMatrix: templateForm.sampleMatrix,
        sampleCount: templateForm.sampleCount,
        testItems: templateForm.testItems,
        sampleDate: templateForm.sampleDate,
        requestedCycle: templateForm.requestedCycle,
        chargeStatus: templateForm.chargeStatus,
        urgentFee: templateForm.urgentFee,
        remark: templateForm.remark
      })
      ElMessage.success('模板已创建')
    }
    templateEditorVisible.value = false
    await loadMyTemplates()
  } catch (e) {
    ElMessage.error('保存失败：' + (e.message || '未知错误'))
  } finally {
    templateSaving.value = false
  }
}

const deleteTemplate = async (tpl) => {
  try {
    await ElMessageBox.confirm(`确定要删除模板「${tpl.name}」吗？删除后无法恢复。`, '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await templateAPI.remove(tpl.id)
    ElMessage.success('模板已删除')
    await loadMyTemplates()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败：' + (e.message || '未知错误'))
    }
  }
}

const loadDraftsFromStorage = () => {
  try {
    const saved = localStorage.getItem('biz_initiate_draft');
    drafts.value = saved ? JSON.parse(saved) : [];
  } catch { drafts.value = []; }
};

const saveDraft = () => {
  const draftData = {
    ...form,
    savedAt: new Date().toISOString()
  };
  const current = [...drafts.value, draftData];
  localStorage.setItem('biz_initiate_draft', JSON.stringify(current));
  drafts.value = current;
  ElMessage.success('草稿已保存');
};

const loadDraft = (idx) => {
  const d = drafts.value[idx];
  if (!d) return;
  Object.keys(form).forEach(key => {
    if (key in d) form[key] = d[key];
  });
  showDraftBox.value = false;
  ElMessage.success('已加载草稿');
};

const deleteDraft = (idx) => {
  drafts.value.splice(idx, 1);
  localStorage.setItem('biz_initiate_draft', JSON.stringify(drafts.value));
};

const formatDraftTime = (t) => {
  if (!t) return '';
  return new Date(t).toLocaleString('zh-CN');
};

const getTypeName = (type) => {
  const map = { paid_urgent: '付费加急', free_urgent: '免费加急', data_dispute: '数据质疑', follow_up: '跟单', consultation: '咨询', other: '其他' };
  return map[type] || type;
};

const form = reactive({
  type: '',
  vip: '',
  customerName: '',
  sampleCode: '',
  sampleMatrix: '',
  sampleCount: '',
  testItems: '',
  sampleDate: '',
  requestedCycle: '',
  chargeStatus: '',
  urgentFee: '',
  remark: '',
  content: '',
  recipients: [],
  ccRecipients: [],
  departmentCards: [],
  attachments: [],
  templateId: null
});

// 自动保存草稿
const { startAutoSave, restoreAutoSave, clearAutoSave } = useAutoSave(form, 'biz_auto_draft');
startAutoSave();

// 撤回编辑模式标志
const isRecalledEditMode = ref(false);

// 退出撤回编辑模式
const exitRecalledEdit = () => {
  localStorage.removeItem('recalledMessageEdit');
  isRecalledEditMode.value = false;
  resetForm();
  clearAutoSave();
  // 清除自动保存的草稿
  try { localStorage.removeItem('biz_auto_draft'); } catch {}
  // 跳转到已发送消息页面
  window.dispatchEvent(new CustomEvent('switch-to-sent'))
};

// 部门名片数据
const departmentCards = ref([]);
const deptCardSearchKeyword = ref('')
const filteredDepartmentCards = ref([])
// 当前部门名片映射：{ cardKey: [holderIds] }（用于同步移除）
let currentCardMap = {};

// 三级部门选择
const selectedLevel1 = ref('');
const selectedLevel2 = ref('');
const selectedLevel3 = ref('');
const userRole = ref(''); // 当前用户角色

// 部门选项（根据一级部门动态计算）
const level2Options = computed(() => getLevel2Options(selectedLevel1.value));
const level3Options = computed(() => getLevel3Options(selectedLevel1.value));

// 一级部门变化
const onLevel1Change = () => {
  selectedLevel2.value = '';
  selectedLevel3.value = '';
  // 过滤用户列表
  filterByDepartment();
};

// 二级部门变化
const onLevel2Change = () => {
  selectedLevel3.value = '';
  filterByDepartment();
};

// 三级部门变化
const onLevel3Change = () => {
  filterByDepartment();
};

// 部门名片选择变化（多选）
const onDepartmentCardsChange = (newSelection) => {
  // 计算新增的卡片和移除的卡片
  const prev = { ...currentCardMap }
  const current = {}

  // 新增的卡片 → 加入接收人
  newSelection.forEach(cardKey => {
    if (!prev[cardKey]) {
      const holders = departmentCardAPI.getHolderIds(cardKey, departmentCards.value)
      current[cardKey] = holders
      holders.forEach(id => {
        if (!form.recipients.includes(id)) {
          form.recipients.push(id)
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
      form.recipients = form.recipients.filter(id => !holders.includes(id))
    }
  })

  currentCardMap = current
};

// 根据持有人ID查找所属部门名片key
const findCardKeyByHolderId = (uid) => {
  for (const [cardKey, holderIds] of Object.entries(currentCardMap)) {
    if (holderIds.includes(uid)) return cardKey
  }
  return null
};

// 按部门过滤接收人列表
const filterByDepartment = () => {
  if (!selectedLevel1.value) {
    // 重置为全部用户
    loadAllUsers();
    return;
  }
  // 按部门过滤 allUsers
  const filtered = allUsers.value.filter(u => {
    if (selectedLevel3.value) {
      return u.departmentLevel3 === selectedLevel3.value;
    }
    if (selectedLevel2.value) {
      return u.departmentLevel2 === selectedLevel2.value;
    }
    if (selectedLevel1.value) {
      return u.departmentLevel1 === selectedLevel1.value;
    }
    return true;
  });
  // 重新构建 recipientGroups
  buildRecipientGroups(filtered);
};

const buildRecipientGroups = (users) => {
  const groups = {};
  const roleNameMap = {};
  const roleOrder = [];
  ROLE_OPTIONS.filter(r => r.value !== 'admin').forEach(r => {
    roleNameMap[r.value] = r.label;
    roleOrder.push(r.value);
  });

  users.forEach(u => {
    const label = roleNameMap[u.role] || u.role;
    const userWithKeys = buildSearchKeys(u, roleNameMap);
    userWithKeys._roleName = label;
    if (!groups[label]) groups[label] = { label, users: [] };
    groups[label].users.push(userWithKeys);
  });

  recipientGroups.value = (() => {
    const seen = new Map()
    roleOrder.forEach(r => {
      const label = roleNameMap[r]
      if (label && groups[label] && !seen.has(label)) {
        seen.set(label, groups[label])
      }
    })
    return Array.from(seen.values())
  })()
};

const allUsers = ref([]);
const recipientGroups = ref([]);
const searchQuery = ref('');
const ccSearchQuery = ref('');
const ccPresetUserIds = ref([]);
const ccDialogVisible = ref(false);
const ccSearchResults = ref([]);

// 展平 recipientGroups 为 el-select-v2 可用的选项数组（含 Group 表头 + 搜索过滤）
function buildSelectV2Options(groups, query) {
  const roleNameMap = {}
  ROLE_OPTIONS.filter(r => r.value !== 'admin').forEach(r => { roleNameMap[r.value] = r.label })

  if (!query?.trim()) {
    const result = []
    for (const group of groups) {
      result.push({ value: `__group_${group.label}`, label: group.label, type: 'Group', disabled: true, isGroupHeader: true })
      for (const user of group.users) {
        result.push({
          value: user.id, label: user.name, rawName: user.name,
          rawDept: (user.departmentLevel3 || user.departmentLevel2 || user.departmentLevel1) || '-', rawRole: user._roleName || '-',
          _searchKeys: user._searchKeys
        })
      }
    }
    return result
  }

  const kw = query.trim()
  const matchedUserIds = new Set()
  const matchedGroupLabels = new Set()
  for (const group of groups) {
    for (const user of group.users) {
      const keys = buildSearchKeys(user, roleNameMap)
      if (matchUser(kw, keys._searchKeys)) {
        matchedUserIds.add(user.id)
        matchedGroupLabels.add(group.label)
      }
    }
  }
  const result = []
  for (const group of groups) {
    if (matchedGroupLabels.has(group.label)) {
      result.push({ value: `__group_${group.label}`, label: group.label, type: 'Group', disabled: true, isGroupHeader: true })
      for (const user of group.users) {
        if (matchedUserIds.has(user.id)) {
          result.push({
            value: user.id, label: user.name, rawName: user.name,
            rawDept: (user.departmentLevel3 || user.departmentLevel2 || user.departmentLevel1) || '-', rawRole: user._roleName || '-',
            _searchKeys: user._searchKeys
          })
        }
      }
    }
  }
  return result
}

const filteredSelectOptions = computed(() => buildSelectV2Options(recipientGroups.value, searchQuery.value))
const filteredCCOptions = computed(() => buildSelectV2Options(recipientGroups.value, ccSearchQuery.value))

const filterRecipient = (query) => {
  searchQuery.value = query;
};

const filterCCRecipient = (query) => {
  ccSearchQuery.value = query;
};

const handleUpload = async (file) => {
  try {
    console.log('正在上传文件:', file.name, '大小:', file.size, '类型:', file.type)
    const result = await storageAPI.upload(file.raw || file, 'communications');
    form.attachments.push(result);
    ElMessage.success('图片上传成功');
  } catch (error) {
    console.error('上传失败，详细错误:', error);
    const errMsg = error.message || error.error_description || '未知错误';
    ElMessage.error('上传失败: ' + errMsg);
  }
  return false;
};

const typeMap = {
  paid_urgent: '付费加急',
  free_urgent: '免费加急',
  data_dispute: '数据质疑',
  follow_up: '跟单',
  consultation: '咨询',
  other: '其他'
};

// 从所有选项中查找用户信息
const findUserById = (uid) => {
  for (const group of recipientGroups.value) {
    const user = group.users.find(u => u.id === uid);
    if (user) return user;
  }
  return null;
};

const getUserName = (uid) => findUserById(uid)?.name || uid;
const getUserDept = (uid) => findUserById(uid)?.department || '-';
const getUserRoleName = (uid) => findUserById(uid)?._roleName || '-';

// 抄送人辅助方法
const getCCUserName = (uid) => findUserById(uid)?.name || uid;
const getCCUserDept = (uid) => findUserById(uid)?.department || '-';
const getCCUserRoleName = (uid) => findUserById(uid)?._roleName || '-';
const ccUserName = (uid) => getCCUserName(uid);

const removeCCRecipient = (uid) => {
  form.ccRecipients = form.ccRecipients.filter(id => id !== uid);
};

const toggleFrequentCC = (uid) => {
  const idx = form.ccRecipients.indexOf(uid);
  if (idx >= 0) {
    form.ccRecipients.splice(idx, 1);
  } else {
    form.ccRecipients.push(uid);
  }
};

const loadCCPresets = async () => {
  try {
    const { data } = await communicationAPI.getCCPresets();
    ccPresetUserIds.value = data?.ccUserIds || [];
  } catch (e) {
    console.warn('加载抄送人预设失败:', e);
  }
};

const saveCCPresets = async () => {
  try {
    await communicationAPI.saveCCPresets(ccPresetUserIds.value, []);
  } catch (e) {
    ElMessage.error('保存预设失败: ' + (e.message || ''));
  }
};

// 常用抄送人管理
const openCCManagement = async () => {
  ccSearchQuery.value = '';
  if (!allUsers.value || allUsers.value.length === 0) {
    await loadAllUsers();
  }
  ccSearchResults.value = allUsers.value || [];
  ccDialogVisible.value = true;
};

const addCCPreset = async (userId) => {
  if (ccPresetUserIds.value.length >= 5) {
    ElMessage.warning('最多预设5个抄送人');
    return;
  }
  if (!ccPresetUserIds.value.includes(userId)) {
    ccPresetUserIds.value.push(userId);
    await saveCCPresets();
  }
};

const removeCCPreset = async (userId) => {
  ccPresetUserIds.value = ccPresetUserIds.value.filter(id => id !== userId);
  await saveCCPresets();
};

const filterCCSearch = (query) => {
  ccSearchQuery.value = query;
  if (!query) {
    ccSearchResults.value = allUsers.value || [];
    return;
  }
  const kw = query.toLowerCase();
  ccSearchResults.value = (allUsers.value || []).filter(u => {
    const nameMatch = u.name && u.name.toLowerCase().includes(kw);
    const deptMatch = u.department && u.department.toLowerCase().includes(kw);
    const pinyinMatch = u._searchKeys && (
      u._searchKeys.pinyinFull.includes(kw) ||
      u._searchKeys.pinyinInitial.includes(kw)
    );
    return nameMatch || deptMatch || pinyinMatch;
  });
};

const isCCPreset = (userId) => {
  return ccPresetUserIds.value.includes(userId);
};

const removeRecipient = (uid) => {
  form.recipients = form.recipients.filter(id => id !== uid);
  // 检查是否属于某张部门名片
  const cardKey = findCardKeyByHolderId(uid)
  if (cardKey && form.departmentCards.includes(cardKey)) {
    // 从部门名片中移除该卡片
    form.departmentCards = form.departmentCards.filter(k => k !== cardKey)
    delete currentCardMap[cardKey]
    ElMessage.info('已同步取消部门名片')
  }
};

const sending = ref(false)

const submitForm = async () => {
  if (sending.value) return
  if (!form.type) {
    ElMessage.error('请选择沟通类型');
    return;
  }
  if (form.departmentCards.length === 0 && !form.recipients.length) {
    ElMessage.error('请选择部门名片或消息接收人');
    return;
  }
  // 检查接收人和抄送人是否重复
  if (form.recipients.some(r => form.ccRecipients.includes(r))) {
    ElMessage.warning('同一人员不可以既是消息接收人又是被抄送人');
    return;
  }
  
  try {
    sending.value = true
    const payload = {
      ...form,
      senderRole: 'business',
      attachments: form.attachments,
      cc_recipients: form.ccRecipients
    };
    // 如果选了部门名片，把持有人ID传给后端
    if (form.departmentCards.length > 0) {
      const allCardIds = []
      form.departmentCards.forEach(cardKey => {
        const ids = departmentCardAPI.getHolderIds(cardKey, departmentCards.value)
        allCardIds.push(...ids)
      })
      payload.department_card_ids = allCardIds
    }
    await communicationAPI.create(payload);
    ElMessage.success('发送成功');
    if (form.templateId) {
      templateAPI.incrementUsage(form.templateId).catch(e => console.warn('更新模板使用次数失败:', e))
    }
    // 清除匹配的草稿（按内容+样品短号匹配）
    const draftIdx = drafts.value.findIndex(d => d.content === form.content && d.sampleCode === form.sampleCode);
    if (draftIdx >= 0) deleteDraft(draftIdx);
    resetForm();
    clearAutoSave();
    router.push('/');
  } catch (error) {
    ElMessage.error('发送失败：' + (error.message || '未知错误'));
  } finally {
    sending.value = false
  }
};

const resetForm = () => {
  form.type = '';
  form.vip = '';
  form.customerName = '';
  form.sampleCode = '';
  form.sampleMatrix = '';
  form.sampleCount = '';
  form.testItems = '';
  form.sampleDate = '';
  form.requestedCycle = '';
  form.chargeStatus = '';
  form.urgentFee = '';
  form.remark = '';
  form.recipients = [];
  form.ccRecipients = [];
  form.departmentCards = [];
  form.attachments = [];
  currentCardMap = {};
};

// 加载所有用户（发起沟通时可选择任何人，除自己外）
const loadAllUsers = async () => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', authUser?.id || '')
      .order('name')
    if (error) throw error
    allUsers.value = data || []

    // 按角色分组（使用统一的 ROLE_OPTIONS）
    const groups = {}
    const roleNameMap = {}
    const roleOrder = []
    ROLE_OPTIONS.filter(r => r.value !== 'admin').forEach(r => {
      roleNameMap[r.value] = r.label
      roleOrder.push(r.value)
    })

    data.forEach(u => {
      const label = roleNameMap[u.role] || u.role
      const userWithKeys = buildSearchKeys(u, roleNameMap)
      userWithKeys._roleName = label
      if (!groups[label]) groups[label] = { label, users: [] }
      groups[label].users.push(userWithKeys)
    })

    // 用 Map 去重：同一个 label 只保留一个 group
    const seen = new Map()
    roleOrder.forEach(r => {
      const label = roleNameMap[r]
      if (label && groups[label] && !seen.has(label)) {
        seen.set(label, groups[label])
      }
    })
    recipientGroups.value = Array.from(seen.values())
  } catch (error) {
    ElMessage.error('加载用户失败');
  }
};

const preselectRecipients = inject('preselectRecipients', ref([]));
const preselectDeptCards = inject('preselectDeptCards', ref([]));

// 是否支持 File System Access API
const supportsFileSystemAPI = ref(typeof window !== 'undefined' && !!window.showOpenFilePicker);

// 使用 File System Access API 选择并上传文件
const pickFilesWithAPI = async () => {
  try {
    const handles = await window.showOpenFilePicker({
      multiple: true,
      types: [
        {
          description: '图片文件',
          accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }
        }
      ]
    });
    
    for (const handle of handles) {
      const file = await handle.getFile();
      console.log('通过 File System API 选择文件:', file.name, '大小:', file.size);
      const result = await storageAPI.upload(file, 'communications');
      form.attachments.push(result);
      ElMessage.success(`已上传: ${file.name}`);
    }
  } catch (err) {
    if (err.name === 'AbortError') return; // 用户取消了选择
    console.error('File System API 上传失败:', err);
    ElMessage.error('选择文件失败: ' + (err.message || '未知错误'));
  }
};

// 部门名片自定义模糊搜索
function filterDeptCard(keyword) {
  deptCardSearchKeyword.value = keyword
  if (!keyword?.trim()) {
    filteredDepartmentCards.value = [...departmentCards.value]
    return
  }
  const trimmed = keyword.trim()
  const keywords = trimmed.split(/[\s,，]+/)
  filteredDepartmentCards.value = departmentCards.value.filter(card => {
    const cardName = (card.departmentLevel2 || '') + '·' + (card.departmentLevel3 || '')
    return keywords.every(kw => {
      const lowerKw = kw.toLowerCase()
      // 中文直接匹配（含部分匹配 + 不区分大小写）
      if (cardName.toLowerCase().includes(lowerKw)) return true
      // 拼音全拼匹配
      const fullPinyin = pinyin(cardName, { pattern: 'pinyin', toneType: 'none' }).toLowerCase().replace(/\s/g, '')
      if (fullPinyin.includes(lowerKw)) return true
      // 拼音首字母匹配
      const firstLetter = pinyin(cardName, { pattern: 'first', toneType: 'none' }).toLowerCase().replace(/\s/g, '')
      if (firstLetter.includes(lowerKw)) return true
      return false
    })
  })
}

onMounted(() => {
  // 恢复自动保存草稿
  restoreAutoSave();

  // 加载草稿
  loadDraftsFromStorage();

  // 加载模板
  loadMyTemplates()

  // 加载常用抄送人
  loadCCPresets()
  
  // 获取当前用户角色
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) {
      supabase.from('profiles').select('role, department_level1').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          userRole.value = data.role;
          // 自动识别一级部门（去掉一级部门下拉后，根据用户所属部门自动设置）
          selectedLevel1.value = data.department_level1 || (data.role?.startsWith('business') ? '业务' : '实验室');
        }
      });
    }
  });

  // 并行加载用户和部门名片数据
  Promise.all([
    loadAllUsers(),
    departmentCardAPI.getDepartmentCards().then(({ data }) => {
      departmentCards.value = data || [];
      filteredDepartmentCards.value = data || [];
    }).catch(err => {
      console.error('加载部门名片失败:', err);
    })
  ]).then(() => {
    // 所有数据加载完成后，处理预选和撤回编辑恢复
    // 如果有预选中用户（从组织架构页面跳转过来），自动填充
    if (preselectRecipients.value && preselectRecipients.value.length > 0) {
      form.recipients = [...preselectRecipients.value];
      preselectRecipients.value = [];
    }
    // 如果有预选中的部门名片
    if (preselectDeptCards.value && preselectDeptCards.value.length > 0) {
      form.departmentCards = [...preselectDeptCards.value];
      preselectDeptCards.value = [];
      // 自动将部门名片持有人加入接收人
      form.departmentCards.forEach(cardKey => {
        const holders = departmentCardAPI.getHolderIds(cardKey, departmentCards.value)
        holders.forEach(id => {
          if (!form.recipients.includes(id)) {
            form.recipients.push(id)
          }
        })
      })
    }
    if (form.recipients.length > 0) {
      ElMessage.success(`已自动选中 ${form.recipients.length} 位接收人`);
    }
    
    // 检查是否有已撤回消息需要编辑重发
    const recalledEditData = localStorage.getItem('recalledMessageEdit');
    if (recalledEditData) {
      isRecalledEditMode.value = true;
      try {
        const editData = JSON.parse(recalledEditData);
        form.type = editData.type || '';
        form.customerName = editData.customerName || '';
        form.sampleCode = editData.sampleCode || '';
        form.content = editData.content || '';
        form.vip = editData.vip ?? '';
        form.sampleMatrix = editData.sampleMatrix || '';
        form.sampleCount = editData.sampleCount || '';
        form.testItems = editData.testItems || '';
        form.sampleDate = editData.sampleDate || '';
        form.requestedCycle = editData.requestedCycle || '';
        form.chargeStatus = editData.chargeStatus || '';
        form.urgentFee = editData.urgentFee ?? '';
        form.remark = editData.remark || '';
        form.attachments = editData.attachments || [];
        form.recipients = editData.recipientIds || [];
        // 将 holder ID 转换为部门名片 key（departmentLevel3 名称）
        if (editData.departmentCardIds && editData.departmentCardIds.length > 0) {
          const cardKeys = departmentCardAPI.getCardKeysByHolderIds(editData.departmentCardIds, departmentCards.value);
          form.departmentCards = cardKeys;
          // 同步添加 holders 到接收人列表
          cardKeys.forEach(cardKey => {
            const holders = departmentCardAPI.getHolderIds(cardKey, departmentCards.value);
            holders.forEach(id => {
              if (!form.recipients.includes(id)) {
                form.recipients.push(id);
              }
            });
          });
          // 重建 currentCardMap
          cardKeys.forEach(cardKey => {
            currentCardMap[cardKey] = departmentCardAPI.getHolderIds(cardKey, departmentCards.value);
          });
        } else {
          form.departmentCards = editData.departmentCardIds || [];
        }
        ElMessage.info('已加载撤回消息的内容，请编辑后重新发送');
        // 清除 localStorage，避免刷新后重复加载
        localStorage.removeItem('recalledMessageEdit');
      } catch (e) {
        console.error('解析撤回消息数据失败:', e);
        localStorage.removeItem('recalledMessageEdit');
      }
    }
  });
});
</script>

<style scoped>
.business-initiate {
  padding: 20px;
}

.page-title {
  margin-bottom: 20px;
  font-size: 20px;
  color: #333;
}

.section-title {
  margin: 30px 0 15px 0;
  font-size: 16px;
  color: #333;
}

.communication-form {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
}

.el-form-item {
  margin-bottom: 15px;
}

.reply-item {
  background: #f5f5f5;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
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

/* 已选人员名片 */
.selected-recipient-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.recipient-card {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
}

.recipient-card-name {
  font-weight: 600;
  color: #303133;
}

.recipient-card-dept {
  color: #606266;
  font-size: 11px;
}

.recipient-card-role {
  color: #909399;
  font-size: 11px;
  background: #f0f0f0;
  padding: 1px 5px;
  border-radius: 3px;
}

.recipient-card-remove {
  color: #f56c6c;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  margin-left: 4px;
  line-height: 1;
}

.recipient-card-remove:hover {
  color: #c45656;
}

/* 让el-select的标签也显示正确 */
:deep(.recipient-select .el-select__tags) {
  max-width: 100% !important;
}
</style>

<!-- 部门名片下拉框全局样式 -->
<style>
.dept-card-popper {
  width: 480px !important;
}
.dept-card-popper .el-select-dropdown__item {
  height: auto !important;
  padding: 6px 16px !important;
}
.dept-card-popper .el-select-dropdown__item:hover {
  background: #ecf5ff;
}

/* 草稿箱样式 */
.draft-list {
  padding: 0 16px;
}
.draft-item {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  background: #fafafa;
}
.draft-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.draft-time {
  font-size: 12px;
  color: #909399;
}
.draft-preview {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.draft-actions {
  display: flex;
  gap: 8px;
}
</style>
