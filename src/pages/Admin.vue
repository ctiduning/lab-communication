<template>
  <div class="admin-page">
    <div class="page-header">
      <h1>管理员控制台</h1>
      <p>用户管理、沟通记录查看、系统配置</p>
    </div>
    
    <div class="page-content">
      <el-tabs v-model="activeTab" type="card" class="beautiful-tabs">
        <el-tab-pane label="用户管理" name="users">
          <div class="beautiful-card">
            <div class="tab-header">
              <div class="header-left">
                <el-button type="primary" @click="showCreateModal = true" size="large">
                  <el-icon><UserFilled /></el-icon>
                  单个添加
                </el-button>
                <el-button 
                  type="success" 
                  @click="handlePickExcel" 
                  size="large"
                  style="margin-left: 12px;"
                >
                  <el-icon><Upload /></el-icon>
                  导入Excel批量注册
                </el-button>
                <!-- 传统文件选择兜底（隐藏） -->
                <input
                  ref="excelFileInputRef"
                  type="file"
                  accept=".xlsx,.xls"
                  style="display: none"
                  @change="handleTraditionalFileInput"
                />
                <el-button 
                  type="warning" 
                  @click="exportToExcel" 
                  size="large"
                  style="margin-left: 12px;"
                  :loading="exportLoading"
                >
                  <el-icon><Download /></el-icon>
                  导出沟通记录
                </el-button>
                <el-button 
                  type="danger" 
                  @click="handleBackup" 
                  size="large"
                  style="margin-left: 12px;"
                  :loading="backupLoading"
                >
                  <el-icon><Download /></el-icon>
                  一键备份
                </el-button>
                <el-button 
                  type="default" 
                  @click="downloadTemplate" 
                  style="margin-left: 12px;"
                >
                  <el-icon><Download /></el-icon>
                  下载模板
                </el-button>
                <el-button 
                  type="warning" 
                  @click="showCleanupDialog = true"
                  size="large"
                  style="margin-left: 12px;"
                >
                  <el-icon><Delete /></el-icon>
                  清理旧数据
                </el-button>
                <el-button 
                  type="danger" 
                  @click="showClearTestDataDialog = true"
                  size="large"
                  style="margin-left: 12px;"
                >
                  <el-icon><Delete /></el-icon>
                  清除测试数据
                </el-button>
              </div>
              <div class="header-right">
                <el-input 
                  v-model="searchKeyword" 
                  placeholder="搜索姓名、工号、部门..." 
                  clearable 
                  class="search-input"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-button type="primary" @click="handleSearch" size="large">搜索</el-button>
              </div>
            </div>
            </div>
            <!-- 存储状态显示 -->
            <div v-if="storageStatus" class="storage-status-card beautiful-card" style="margin-top: 16px; padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 16px;">📊 存储状态</h3>
                <el-button type="primary" link @click="loadStorageStatus" :loading="storageLoading">刷新</el-button>
              </div>
              <el-row :gutter="20">
                <el-col :span="12">
                  <div style="margin-bottom: 8px;">
                    <span style="font-weight: bold;">数据库记录数：</span>
                    <span>{{ storageStatus.database.communications }} 条沟通记录，</span>
                    <span>{{ storageStatus.database.replies }} 条回复，</span>
                    <span>{{ storageStatus.database.notifications }} 条通知</span>
                  </div>
                  <div style="margin-bottom: 8px;">
                    <span style="font-weight: bold;">预估数据库大小：</span>
                    <el-tag :type="storageStatus.storage.estimatedDbSizeMB > 400 ? 'danger' : storageStatus.storage.estimatedDbSizeMB > 300 ? 'warning' : 'success'">
                      {{ storageStatus.storage.estimatedDbSizeMB.toFixed(2) }} MB / {{ storageStatus.limits.databaseMB }} MB
                    </el-tag>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div style="margin-bottom: 8px;">
                    <span style="font-weight: bold;">文件存储：</span>
                    <span>{{ storageStatus.storage.fileCount }} 个文件</span>
                    <el-tag type="info" size="small" style="margin-left: 8px;">{{ storageStatus.storage.storageNote }}</el-tag>
                  </div>
                  <div style="margin-bottom: 8px;">
                    <el-progress 
                      :percentage="Math.min(100, storageStatus.storage.estimatedDbSizeMB / storageStatus.limits.databaseMB * 100)" 
                      :color="storageStatus.storage.estimatedDbSizeMB > 400 ? '#f56c6c' : storageStatus.storage.estimatedDbSizeMB > 300 ? '#e6a23c' : '#67c23a'"
                      :stroke-width="10"
                    />
                  </div>
                </el-col>
              </el-row>
              <el-alert 
                v-if="storageStatus.storage.estimatedDbSizeMB > 400" 
                title="存储空间即将用尽！请立即清理旧数据或升级套餐。" 
                type="error" 
                :closable="false" 
                style="margin-top: 12px;"
              />
              <el-alert 
                v-else-if="storageStatus.storage.estimatedDbSizeMB > 300" 
                title="存储空间使用率较高，建议定期清理旧数据。" 
                type="warning" 
                :closable="false" 
                style="margin-top: 12px;"
              />
            </div>
            <el-table :data="filteredUsers" border stripe height="550" style="width: 100%; margin-top: 16px;">
            <el-table-column label="姓名" width="90" sortable>
              <template #default="scope">
                {{ scope.row.name || scope.row.username }}
              </template>
            </el-table-column>
            <el-table-column prop="employeeId" label="工号" width="90" sortable></el-table-column>
            <el-table-column prop="departmentLevel1" label="一级部门" width="90" sortable></el-table-column>
            <el-table-column prop="departmentLevel2" label="二级部门" width="140" sortable></el-table-column>
            <el-table-column prop="departmentLevel3" label="三级部门" width="110" sortable></el-table-column>
            <el-table-column prop="role" label="角色" width="110" sortable>
              <template #default="scope">
                <el-tag :type="getRoleTag(scope.row)" size="small">{{ scope.row.role }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="phone" label="电话" width="115" sortable></el-table-column>
            <el-table-column prop="email" label="邮箱" min-width="150" sortable show-overflow-tooltip></el-table-column>
            <el-table-column label="是否在线" width="90" align="center" sortable>
              <template #default="scope">
                <el-tag v-if="isUserOnline(scope.row)" type="success" size="small">在线</el-tag>
                <el-tag v-else type="info" size="small">离线</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="75" align="center" sortable>
              <template #default="scope">
                <el-tag v-if="scope.row.isDisabled" type="info" size="small">已禁用</el-tag>
                <el-tag v-else type="success" size="small">正常</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right" align="center">
              <template #default="scope">
                <div class="op-btns">
                  <el-button
                    v-if="!scope.row.isDisabled && scope.row.role !== 'admin'"
                    size="small"
                    type="warning"
                    class="op-btn"
                    @click="handleDisable(scope.row)"
                  >禁用</el-button>
                  <el-button
                    v-if="scope.row.isDisabled"
                    size="small"
                    type="success"
                    class="op-btn"
                    @click="handleEnable(scope.row)"
                  >启用</el-button>
                  <el-button
                    v-if="scope.row.role !== 'admin'"
                    size="small"
                    type="info"
                    class="op-btn"
                    @click="handleResetPassword(scope.row)"
                  >重置密码</el-button>
                  <el-button
                    v-if="scope.row.role !== 'admin'"
                    size="small"
                    type="danger"
                    class="op-btn"
                    @click="handleDeleteAccount(scope.row)"
                  >删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
      </el-tab-pane>

      <el-tab-pane label="沟通记录" name="communications">
        <div class="tab-content">
          <div class="tab-header">
            <span class="record-count">共 {{ communications.length }} 条记录</span>
            <el-input v-model="commSearchKeyword" placeholder="搜索内容、客户、发起人..." clearable style="width: 250px; margin-left: auto;" />
          </div>
          <el-table :data="filteredCommunications" border stripe max-height="600">
            <el-table-column label="时间" width="160">
              <template #default="scope">
                {{ formatTime(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="类型" width="100">
              <template #default="scope">
                <el-tag size="small">{{ getTypeLabel(scope.row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="发起人" width="100">
              <template #default="scope">
                {{ scope.row.senderName }}
              </template>
            </el-table-column>
            <el-table-column prop="customerName" label="客户名称" width="120"></el-table-column>
            <el-table-column prop="sampleCode" label="样品编号" width="120"></el-table-column>
            <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip></el-table-column>
            <el-table-column label="接收人" width="120" show-overflow-tooltip>
              <template #default="scope">
                {{ scope.row.recipientNames }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="scope">
                <el-tag :type="scope.row.replyCount > 0 ? 'success' : 'warning'" size="small">
                  {{ scope.row.replyCount > 0 ? '有回复' : '待回复' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="回复" width="60">
              <template #default="scope">
                {{ scope.row.replyCount || 0 }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="通知管理" name="notifications">
        <div class="tab-content">
          <div class="tab-header">
            <span class="record-count">共 {{ allNotifications.length }} 条通知</span>
          </div>
          <el-table :data="allNotifications" border stripe max-height="600">
            <el-table-column label="时间" width="160">
              <template #default="scope">
                {{ formatTime(scope.row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="类型" width="100">
              <template #default="scope">
                <el-tag size="small" :type="getNotifTypeTag(scope.row.type)">{{ scope.row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="content" label="内容" min-width="250" show-overflow-tooltip></el-table-column>
            <el-table-column label="已读" width="70" align="center">
              <template #default="scope">
                <el-tag :type="scope.row.is_read ? 'success' : 'warning'" size="small">
                  {{ scope.row.is_read ? '已读' : '未读' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" align="center">
              <template #default="scope">
                <el-button v-if="scope.row.announcement_id" size="small" type="info" @click="viewAnnouncementReactions(scope.row.announcement_id)">点赞详情</el-button>
                <el-button size="small" type="danger" @click="handleDeleteNotification(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="统计" name="stats">
        <div class="stats-content">
          <!-- 筛选区域 -->
          <div class="stats-filter">
            <el-form :inline="true" class="filter-form">
              <el-form-item label="时间范围">
                <el-date-picker
                  v-model="statsTimeRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                  style="width: 280px;"
                />
              </el-form-item>
              <el-form-item label="人员名称">
                <el-input
                  v-model="statsPersonName"
                  placeholder="输入姓名或工号"
                  clearable
                  style="width: 180px;"
                />
              </el-form-item>
              <el-form-item label="沟通类型">
                <el-select
                  v-model="statsTypes"
                  multiple
                  collapse-tags
                  placeholder="全部类型"
                  clearable
                  style="width: 220px;"
                >
                  <el-option label="付费加急" value="paid_urgent" />
                  <el-option label="免费加急" value="free_urgent" />
                  <el-option label="数据质疑" value="data_dispute" />
                  <el-option label="跟单" value="follow_up" />
                  <el-option label="咨询" value="consultation" />
                  <el-option label="其他" value="other" />
                  <el-option label="不合格沟通" value="unqualified" />
                  <el-option label="数据确认" value="data_confirm" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="calculateStats" :loading="statsLoading">
                  <el-icon><Search /></el-icon>
                  查询
                </el-button>
                <el-button type="success" @click="exportStatsToExcel" :disabled="!statsResult" style="margin-left: 8px;">
                  <el-icon><Download /></el-icon>
                  导出Excel
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <!-- 统计结果 -->
          <div v-if="statsResult" class="stats-tables">
            <!-- 表格1：发起人统计 -->
            <div class="stats-table-section">
              <h3 class="table-title">发起人统计</h3>
              <el-table :data="statsResult.senderStats" border stripe size="small" max-height="400">
                <el-table-column prop="name" label="姓名" width="100" fixed="left" />
                <el-table-column prop="employeeId" label="工号" width="100" fixed="left" />
                <el-table-column prop="roleName" label="角色" width="100" />
                <el-table-column prop="paid_urgent" label="付费加急" width="90" align="center" />
                <el-table-column prop="free_urgent" label="免费加急" width="90" align="center" />
                <el-table-column prop="data_dispute" label="数据质疑" width="90" align="center" />
                <el-table-column prop="follow_up" label="跟单" width="80" align="center" />
                <el-table-column prop="consultation" label="咨询" width="80" align="center" />
                <el-table-column prop="other" label="其他" width="80" align="center" />
                <el-table-column prop="unqualified" label="不合格沟通" width="110" align="center" />
                <el-table-column prop="data_confirm" label="数据确认" width="100" align="center" />
                <el-table-column prop="total" label="总计" width="90" align="center" fixed="right">
                  <template #default="scope">
                    <strong>{{ scope.row.total }}</strong>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 表格2：接收人统计 -->
            <div class="stats-table-section">
              <h3 class="table-title">接收人统计</h3>
              <el-table :data="statsResult.recipientStats" border stripe size="small" max-height="400">
                <el-table-column prop="name" label="姓名" width="100" fixed="left" />
                <el-table-column prop="employeeId" label="工号" width="100" fixed="left" />
                <el-table-column prop="roleName" label="角色" width="100" />
                <el-table-column prop="department" label="部门/组" width="120" />
                <el-table-column prop="paid_urgent" label="付费加急" width="90" align="center" />
                <el-table-column prop="free_urgent" label="免费加急" width="90" align="center" />
                <el-table-column prop="data_dispute" label="数据质疑" width="90" align="center" />
                <el-table-column prop="follow_up" label="跟单" width="80" align="center" />
                <el-table-column prop="consultation" label="咨询" width="80" align="center" />
                <el-table-column prop="other" label="其他" width="80" align="center" />
                <el-table-column prop="unqualified" label="不合格沟通" width="110" align="center" />
                <el-table-column prop="data_confirm" label="数据确认" width="100" align="center" />
                <el-table-column prop="total" label="总计" width="90" align="center" fixed="right">
                  <template #default="scope">
                    <strong>{{ scope.row.total }}</strong>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 表格3：按组统计 -->
            <div class="stats-table-section">
              <h3 class="table-title">按组统计</h3>
              <el-table :data="statsResult.groupStats" border stripe size="small" max-height="400">
                <el-table-column prop="group" label="组别" width="150" fixed="left" />
                <el-table-column prop="paid_urgent" label="付费加急" width="90" align="center" />
                <el-table-column prop="free_urgent" label="免费加急" width="90" align="center" />
                <el-table-column prop="data_dispute" label="数据质疑" width="90" align="center" />
                <el-table-column prop="follow_up" label="跟单" width="80" align="center" />
                <el-table-column prop="consultation" label="咨询" width="80" align="center" />
                <el-table-column prop="other" label="其他" width="80" align="center" />
                <el-table-column prop="unqualified" label="不合格沟通" width="110" align="center" />
                <el-table-column prop="data_confirm" label="数据确认" width="100" align="center" />
                <el-table-column prop="total" label="总计" width="90" align="center" fixed="right">
                  <template #default="scope">
                    <strong>{{ scope.row.total }}</strong>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 表格4：同意统计 -->
            <div class="stats-table-section">
              <h3 class="table-title">同意统计</h3>
              <el-table :data="statsResult.approvalStats" border stripe size="small" max-height="400">
                <el-table-column prop="name" label="姓名" width="100" fixed="left" />
                <el-table-column prop="employeeId" label="工号" width="100" fixed="left" />
                <el-table-column prop="roleName" label="角色" width="100" />
                <el-table-column prop="department" label="部门/组" width="120" />
                <el-table-column prop="paid_urgent" label="付费加急" width="90" align="center" />
                <el-table-column prop="free_urgent" label="免费加急" width="90" align="center" />
                <el-table-column prop="data_dispute" label="数据质疑" width="90" align="center" />
                <el-table-column prop="follow_up" label="跟单" width="80" align="center" />
                <el-table-column prop="consultation" label="咨询" width="80" align="center" />
                <el-table-column prop="other" label="其他" width="80" align="center" />
                <el-table-column prop="unqualified" label="不合格沟通" width="110" align="center" />
                <el-table-column prop="data_confirm" label="数据确认" width="100" align="center" />
                <el-table-column prop="total" label="总计" width="90" align="center" fixed="right">
                  <template #default="scope">
                    <strong>{{ scope.row.total }}</strong>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>

          <div v-else class="stats-placeholder">
            <el-empty description="请设置筛选条件后点击查询" />
          </div>
        </div>
      </el-tab-pane>
      
      <!-- 清理旧数据对话框 -->
      <el-dialog 
        v-model="showCleanupDialog" 
        title="清理旧数据" 
        width="600px"
        :close-on-click-modal="false"
      >
        <div class="cleanup-dialog-content">
          <el-alert 
            title="⚠️ 清理前请务必先备份数据！" 
            type="warning" 
            :closable="false"
            style="margin-bottom: 16px;"
          >
            <template #default>
              <div>
                <p>清理操作不可恢复！建议在清理前先使用"一键备份"功能备份数据。</p>
                <el-button type="primary" size="small" @click="handleBackup" :loading="backupLoading" style="margin-top: 8px;">
                  立即备份
                </el-button>
              </div>
            </template>
          </el-alert>

          <div class="cleanup-date-picker">
            <el-form label-width="120px">
              <el-form-item label="清理此日期之前的记录">
                <el-date-picker
                  v-model="cleanupDate"
                  type="date"
                  placeholder="选择日期"
                  value-format="YYYY-MM-DD"
                  style="width: 100%;"
                  :clearable="false"
                  @change="handleCleanupPreview"
                />
                <div style="font-size: 12px; color: #888; margin-top: 4px;">
                  将删除该日期之前的所有沟通记录（含回复和附件）
                </div>
              </el-form-item>
            </el-form>
          </div>

          <div v-if="oldCommunications.length > 0" class="cleanup-preview">
            <el-divider>预览：将删除以下 {{ oldCommunications.length }} 条记录</el-divider>
            <el-table :data="oldCommunications.slice(0, 10)" border stripe size="small" max-height="300">
              <el-table-column prop="senderName" label="发起人" width="100" />
              <el-table-column prop="content" label="内容" min-width="150" show-overflow-tooltip />
              <el-table-column label="接收人" width="80" align="center">
                <template #default="scope">
                  {{ scope.row.recipientCount }} 人
                </template>
              </el-table-column>
              <el-table-column label="回复" width="80" align="center">
                <template #default="scope">
                  {{ scope.row.replyCount }} 条
                </template>
              </el-table-column>
              <el-table-column label="时间" width="160">
                <template #default="scope">
                  {{ formatTime(scope.row.createdAt) }}
                </template>
              </el-table-column>
            </el-table>
            <div v-if="oldCommunications.length > 10" style="font-size: 12px; color: #888; margin-top: 8px;">
              ... 还有 {{ oldCommunications.length - 10 }} 条记录未显示
            </div>
          </div>
        </div>

        <template #footer>
          <el-button @click="showCleanupDialog = false">取消</el-button>
          <el-button 
            type="danger" 
            @click="handleCleanupConfirm" 
            :loading="cleanupLoading"
            :disabled="!cleanupDate || oldCommunications.length === 0"
          >
            确认清理 {{ oldCommunications.length }} 条记录
          </el-button>
        </template>
      </el-dialog>
    </el-tabs>
    </div>
    
    <!-- 添加用户弹窗 -->
    <el-dialog title="添加用户" v-model="showCreateModal">
      <el-form :model="userForm" label-width="100px">
        <el-form-item label="邮箱">
          <el-input v-model="userForm.email" placeholder="登录邮箱（企业邮箱）"></el-input>
        </el-form-item>
        <el-form-item label="密码">
          <el-input type="password" v-model="userForm.password" show-password placeholder="不少于6位"></el-input>
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="userForm.username"></el-input>
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="userForm.name"></el-input>
        </el-form-item>
        <el-form-item label="工号">
          <el-input v-model="userForm.employeeId" placeholder="唯一标识，不可重复"></el-input>
        </el-form-item>
        <!-- 一级部门 -->
        <el-form-item label="一级部门">
          <el-select v-model="userForm.departmentLevel1" placeholder="请选择" style="width:100%" @change="onAdminLevel1Change">
            <el-option label="业务" value="业务" />
            <el-option label="实验室" value="实验室" />
          </el-select>
        </el-form-item>
        <!-- 二级部门 -->
        <el-form-item label="二级部门">
          <el-select v-model="userForm.departmentLevel2" placeholder="请先选择一级部门" style="width:100%" :disabled="!userForm.departmentLevel1">
            <el-option
              v-for="opt in adminLevel2Options"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <!-- 三级部门 -->
        <el-form-item label="三级部门">
          <el-input v-if="isAdminLevel3Manual" v-model="userForm.departmentLevel3" placeholder="请填写属地，如：青岛、上海"></el-input>
          <el-select v-else v-model="userForm.departmentLevel3" placeholder="请先选择一级部门" style="width:100%" :disabled="!userForm.departmentLevel1">
            <el-option
              v-for="opt in adminLevel3Options"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <!-- 角色 -->
        <el-form-item label="角色">
          <el-select v-model="userForm.role" placeholder="请先选择一级部门" style="width: 100%;" :disabled="!userForm.departmentLevel1">
            <el-option
              v-for="opt in adminRoleOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="userForm.phone"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateModal = false">取消</el-button>
        <el-button type="primary" @click="handleCreateUser">确认创建</el-button>
      </template>
    </el-dialog>

    <!-- 点赞/点踩详情弹窗（管理员） -->
    <el-dialog v-model="reactionDetailVisible" :title="reactionDetailTitle" width="600px" destroy-on-close>
      <el-table :data="reactionDetailList" border stripe size="small">
        <el-table-column label="用户" width="120">
          <template #default="scope">
            {{ scope.row.user?.name || '未知' }}
          </template>
        </el-table-column>
        <el-table-column label="工号" width="100">
          <template #default="scope">
            {{ scope.row.user?.employee_id || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="角色" width="100">
          <template #default="scope">
            {{ getRoleName(scope.row.user?.role || '') }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="80" align="center">
          <template #default="scope">
            <span v-if="scope.row.reaction_type === 'like'">👍 赞</span>
            <span v-else>👎 踩</span>
          </template>
        </el-table-column>
        <el-table-column label="时间">
          <template #default="scope">
            {{ formatTime(scope.row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
      <div v-if="reactionDetailList.length === 0" style="text-align:center;color:#999;padding:20px;">
        暂无点赞/点踩记录
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { userAPI, authAPI, communicationAPI, notificationAPI, reactionAPI, ROLE_OPTIONS, getRoleDisplayName, getRoleCategory, adminLogAPI, departmentAPI } from '../api';
import { supabase } from '../utils/supabase';
import * as XLSX from 'xlsx';
import { getLevel2Options, getLevel3Options, getRoleOptions, isLevel3ManualInput } from '../utils/departmentConfig';

const activeTab = ref('users');
const users = ref([]);
const communications = ref([]);
const allNotifications = ref([]);
const searchKeyword = ref('');
const showCreateModal = ref(false);
const saving = ref(false);
const exportLoading = ref(false);
const backupLoading = ref(false);

// ==================== 存储管理 ====================
const storageStatus = ref(null);
const storageWarning = ref(false);
const showCleanupDialog = ref(false);
const showClearTestDataDialog = ref(false);
const cleanupDate = ref('');
const oldCommunications = ref([]);
const cleanupLoading = ref(false);
const cleanupPreviewLoading = ref(false);
const clearTestDataLoading = ref(false);

const allRoleOptions = ROLE_OPTIONS;

const userForm = reactive({
  username: '',
  password: '',
  name: '',
  employeeId: '',
  departmentLevel1: '',
  departmentLevel2: '',
  departmentLevel3: '',
  role: '',
  phone: '',
  email: ''
});

// 联动计算属性
const adminLevel2Options = computed(() => getLevel2Options(userForm.departmentLevel1));
const adminLevel3Options = computed(() => getLevel3Options(userForm.departmentLevel1));
const adminRoleOptions = computed(() => getRoleOptions(userForm.departmentLevel1));
const isAdminLevel3Manual = computed(() => isLevel3ManualInput(userForm.departmentLevel1));

const onAdminLevel1Change = () => {
  userForm.departmentLevel2 = '';
  userForm.departmentLevel3 = '';
  userForm.role = '';
};

const fuzzyMatch = (text, query) => {
  if (!query) return true;
  if (!text) return false;
  const t = text.toLowerCase();
  const q = query.toLowerCase().replace(/\s/g, '');
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
};

const commSearchKeyword = ref('');

const filteredUsers = computed(() => {
  if (!searchKeyword.value) return users.value;
  const kw = searchKeyword.value;
  return users.value.filter(u =>
    fuzzyMatch(u.name, kw) ||
    fuzzyMatch(u.employeeId, kw) ||
    fuzzyMatch(u.email, kw) ||
    fuzzyMatch(u.departmentLevel1, kw) ||
    fuzzyMatch(u.departmentLevel2, kw) ||
    fuzzyMatch(u.departmentLevel3, kw) ||
    fuzzyMatch(u.role, kw) ||
    fuzzyMatch(u.phone, kw)
  );
});

const totalUsers = computed(() => users.value.length);

// 按一级部门划分（最准确），无一级部门时降级为按角色判断
const isBizUser = (u) => u.department_level1 === '业务' || (!u.department_level1 && ['business', 'business_assistant'].includes(u.role));
const isLabUser = (u) => u.department_level1 === '实验室' || (!u.department_level1 && !isBizUser(u) && u.role !== 'admin');

const businessUserCount = computed(() => users.value.filter(u => isBizUser(u)).length);
const labUserCount = computed(() => users.value.filter(u => isLabUser(u)).length);

const filteredCommunications = computed(() => {
  if (!commSearchKeyword.value) return communications.value;
  const kw = commSearchKeyword.value;
  return communications.value.filter(c =>
    fuzzyMatch(c.content, kw) ||
    fuzzyMatch(c.customerName, kw) ||
    fuzzyMatch(c.senderName, kw) ||
    fuzzyMatch(c.sampleCode, kw) ||
    fuzzyMatch(c.recipientNames, kw)
  );
});

const getRoleTag = (user) => {
  // 按一级部门划分（最准确）
  if (user.department_level1 === '实验室') return 'success';
  if (user.department_level1 === '业务') return 'warning';
  // 降级：按角色判断
  const role = user.role || '';
  if (role === '管理员' || role === 'admin') return 'danger';
  if (role === '业务' || role === '业务助理' || role === 'business' || role === 'business_assistant') return 'warning';
  return 'success'; // 实验室端角色统一用 success
};

const getRoleName = (role) => getRoleDisplayName(role);

// 判断用户是否在线（最近30分钟内有活动）
const isUserOnline = (user) => {
  if (!user || user.isDisabled) return false;
  // 如果有 last_active_at 字段，使用它判断
  if (user.last_active_at) {
    const lastActive = new Date(user.last_active_at);
    const now = new Date();
    const diffMinutes = (now - lastActive) / (1000 * 60);
    return diffMinutes <= 30; // 30分钟内有活动则认为在线
  }
  // 降级：使用 last_sign_in_at 判断（不太准确）
  if (user.last_sign_in_at) {
    const lastSignin = new Date(user.last_sign_in_at);
    const now = new Date();
    const diffMinutes = (now - lastSignin) / (1000 * 60);
    return diffMinutes <= 30;
  }
  return false;
};

const getTypeLabel = (type) => {
  const labels = {
    paid_urgent: '付费加急',
    free_urgent: '免费加急',
    data_dispute: '数据质疑',
    follow_up: '跟单',
    consultation: '咨询',
    other: '其他',
    unqualified: '不合格沟通',
    data_confirm: '数据确认'
  };
  return labels[type] || type;
};

const getNotifTypeTag = (type) => {
  const tags = { urgent: 'danger', reply: '', announcement: 'warning', communication: 'info' };
  return tags[type] || '';
};

const formatTime = (t) => {
  if (!t) return '';
  return new Date(t).toLocaleString('zh-CN');
};

// 导出沟通记录为 Excel
const exportToExcel = async () => {
  exportLoading.value = true;
  try {
    const { data } = await communicationAPI.exportAll();
    if (!data || data.length === 0) {
      ElMessage.warning('没有沟通记录可导出');
      return;
    }

    // 准备 Excel 数据
    const excelData = data.map(c => ({
      'ID': c.id,
      '类型': getTypeLabel(c.type),
      '内容': c.content || '',
      '发起人': c.sender?.name || c.sender?.employee_id || '',
      '创建时间': formatTime(c.created_at),
      '客户名称': c.customer_name || '',
      '样品编号': c.sample_code || '',
      '是否标记': c.is_flagged ? '是' : '否',
      '是否撤回': c.is_recalled ? '是' : '否',
      '接收人': c.communication_recipients?.map(r => r.recipient?.name || r.recipient?.employee_id || '').join('、') || '',
      '接收人是否已回复': c.communication_recipients?.map(r => r.has_replied ? '是' : '否').join('、') || '',
      '接收人是否已完结': c.communication_recipients?.map(r => r.is_completed ? '是' : '否').join('、') || '',
      '回复数': c.replies?.length || 0,
      '回复内容': c.replies?.map(r => (r.sender?.name || '') + '：' + r.content).join('；') || ''
    }));

    // 生成 Excel 文件
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '沟通记录');
    const fileName = `沟通记录_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    ElMessage.success('导出成功：' + fileName);
    await adminLogAPI.log('export_communications', null, '', '导出沟通记录，共 ' + data.length + ' 条');
  } catch (error) {
    ElMessage.error('导出失败：' + (error.message || '未知错误'));
  } finally {
    exportLoading.value = false;
  }
};

const handleSearch = () => {};

const handleCreateUser = async () => {
  if (!userForm.email || !userForm.password || !userForm.name || !userForm.employeeId) {
    ElMessage.error('请填写必填项（邮箱、密码、姓名、工号）');
    return;
  }
  if (userForm.password.length < 6) {
    ElMessage.error('密码不能少于6位');
    return;
  }
  if (!userForm.email.includes('@')) {
    ElMessage.error('请输入有效的邮箱地址');
    return;
  }

  try {
    await authAPI.register({
      ...userForm,
      priority: 'member',
      mustChangePwd: true
    });
    ElMessage.success('用户创建成功，初始密码：' + userForm.password);
    await adminLogAPI.log('create_user', null, userForm.name + '(' + userForm.employeeId + ')', '创建用户');
    showCreateModal.value = false;
    Object.keys(userForm).forEach(key => {
      if (key === 'role') userForm[key] = 'business';
      else userForm[key] = '';
    });
    loadUsers();
  } catch (error) {
    ElMessage.error(error.message || '创建失败');
  }
};

const handleDisable = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要禁用用户「${user.name}(${user.employeeId})」吗？\n禁用后该用户将无法登录，但数据会保留。`,
      '确认禁用',
      { confirmButtonText: '确定禁用', cancelButtonText: '取消', type: 'warning' }
    );
    await userAPI.disable(user.id);
    ElMessage.success('已禁用该用户');
    await adminLogAPI.log('disable_user', user.id, user.name + '(' + user.employeeId + ')', '禁用用户');
    loadUsers();
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('操作失败：' + (error.message || '未知错误'));
  }
};

const handleEnable = async (user) => {
  try {
    await userAPI.enable(user.id);
    ElMessage.success('已启用该用户');
    await adminLogAPI.log('enable_user', user.id, user.name + '(' + user.employeeId + ')', '启用用户');
    loadUsers();
  } catch (error) {
    ElMessage.error('操作失败：' + (error.message || '未知错误'));
  }
};

// 删除用户账号（清除注册信息，保留沟通记录）
const handleDeleteAccount = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户「${user.name}(${user.employeeId})」的账号吗？\n\n⚠️ 此操作将清除该用户的所有注册信息（姓名、电话、邮箱等），该用户将无法登录。但该用户的历史沟通记录会保留。\n\n删除后该邮箱可以重新注册。`,
      '确认删除账号',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'error', confirmButtonClass: 'el-button--danger' }
    );
    await userAPI.deleteAccount(user.id);
    ElMessage.success('用户账号已删除，沟通记录已保留，该邮箱可重新注册');
    await adminLogAPI.log('delete_account', user.id, user.name + '(' + user.employeeId + ')', '删除用户账号');
    loadUsers();
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败：' + (error.message || '未知错误'));
  }
};

// 重置用户密码
const handleResetPassword = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要重置用户「${user.name}(${user.employeeId})」的密码吗？\n\n密码将被重置为：cti123\n该用户下次登录后需要修改密码。`,
      '确认重置密码',
      { confirmButtonText: '确定重置', cancelButtonText: '取消', type: 'warning' }
    );
    await userAPI.resetPassword(user.id);
    ElMessage.success('密码已重置为 cti123，用户下次登录需修改密码');
    await adminLogAPI.log('reset_password', user.id, user.name + '(' + user.employeeId + ')', '重置密码');
    loadUsers();
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('重置失败：' + (error.message || '未知错误'));
  }
};

// 删除通知
const handleDeleteNotification = async (notif) => {
  try {
    await ElMessageBox.confirm('确定要删除这条通知吗？', '确认删除', { type: 'warning' });
    await notificationAPI.delete(notif.id);
    ElMessage.success('通知已删除');
    await adminLogAPI.log('delete_notification', null, notif.title || '', '删除通知');
    loadNotifications();
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败：' + (error.message || '未知错误'));
  }
};

// 用 File System Access API 打开文件选择器（支持桌面等任意路径）
const excelFileInputRef = ref(null);

const handlePickExcel = async () => {
  try {
    if (!window.showOpenFilePicker) {
      // 降级到传统文件选择
      excelFileInputRef.value?.click();
      return;
    }
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        { description: 'Excel 文件', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] } }
      ],
      excludeAcceptAllOption: false,
      multiple: false
    });
    const file = await fileHandle.getFile();
    handleExcelImport({ raw: file, name: file.name });
  } catch (err) {
    if (err.name === 'AbortError') return;
    // File System Access API 失败，降级到传统文件选择
    if (err.message?.includes('user declined') || err.message?.includes('The user aborted')) return;
    try {
      excelFileInputRef.value?.click();
    } catch {
      ElMessage.error('选择文件失败：' + err.message);
    }
  }
};

// 传统文件选择兜底
const handleTraditionalFileInput = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'xlsx' && ext !== 'xls') {
    ElMessage.error('请上传 .xlsx 或 .xls 格式的 Excel 文件');
    return;
  }
  handleExcelImport({ raw: file, name: file.name });
  // 清空 input 以便重新选择同一个文件
  e.target.value = '';
};

// Excel 拖拽导入
const handleExcelDrop = (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      handleExcelImport({ raw: file, name: file.name });
    } else {
      ElMessage.error('请上传 .xlsx 或 .xls 格式的 Excel 文件');
    }
  }
};

// Excel 导入
const handleExcelImport = async (file) => {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        ElMessage.error('Excel 文件为空或格式不正确');
        return;
      }

      const firstRow = rows[0];
      const requiredFields = ['姓名', '工号', '角色'];
      const missing = requiredFields.filter(f => !(f in firstRow));
      if (missing.length > 0) {
        ElMessage.error(`Excel 缺少必要列：${missing.join('、')}。请下载模板对照填写`);
        return;
      }

      const roleMap = {
        '业务': 'business',
        '业务助理': 'business_assistant',
        '实验室主管': 'supervisor',
        '实验室主管助理': 'supervisor_assistant',
        '组长': 'inspection_leader',
        '检测组长': 'inspection_leader',
        '组长助理': 'inspection_leader_assistant',
        '检测组长助理': 'inspection_leader_assistant',
        '检测工程师': 'inspection_engineer',
        '客服': 'customer_service',
        '客服组长': 'cs_leader',
        '客服组长助理': 'cs_leader_assistant',
        '制样组组长': 'sample_prep_leader',
        '报告组组长': 'report_leader',
        '数据二审': 'data_review',
        '报告编制': 'report_compiler',
        '技术支持': 'tech_support',
        '管理员': 'admin'
      };

      const usersToCreate = rows.map(row => ({
        name: String(row['姓名'] || '').trim(),
        employeeId: String(row['工号'] || '').trim(),
        role: String(row['角色'] || '').trim(),
        departmentLevel1: String(row['一级部门'] || '').trim(),
        departmentLevel2: String(row['二级部门'] || '').trim(),
        departmentLevel3: String(row['三级部门'] || '').trim(),
        phone: String(row['电话'] || '').trim(),
        email: String(row['邮箱'] || '').trim()
      })).filter(u => u.name && u.employeeId && u.role);

      if (usersToCreate.length === 0) {
        ElMessage.error('没有有效的用户数据（需要姓名、工号、角色）');
        return;
      }

      let previewMsg = `即将创建 ${usersToCreate.length} 个账号：\n`;
      usersToCreate.slice(0, 10).forEach(u => {
        previewMsg += `  - ${u.name}(${u.employeeId}) [${u.role}]\n`;
      });
      if (usersToCreate.length > 10) previewMsg += `  ... 共 ${usersToCreate.length} 人`;

      await ElMessageBox.confirm(previewMsg, '确认批量注册', {
        confirmButtonText: '确认注册', cancelButtonText: '取消', type: 'info'
      });

      let successCount = 0;
      let updateCount = 0;
      let failList = [];
      for (const u of usersToCreate) {
        try {
          const defaultPwd = 'Ct1@2026';
          if (!u.email) {
            failList.push(`${u.name}(${u.employeeId}): 缺少邮箱，请在 Excel 中补充"邮箱"列`);
            continue;
          }
          const email = u.email;
          const mappedRole = roleMap[u.role] || u.role;
          try {
            await authAPI.register({
              email,
              password: defaultPwd,
              username: `${u.name}${u.employeeId}`,
              name: u.name,
              employeeId: u.employeeId,
              role: mappedRole,
              departmentLevel1: u.departmentLevel1,
              departmentLevel2: u.departmentLevel2,
              departmentLevel3: u.departmentLevel3,
              phone: u.phone,
              priority: 'member',
              mustChangePwd: true
            });
            successCount++;
          } catch (registerErr) {
            // 如果用户已存在（邮箱/用户名重复），尝试更新其 profile
            if (registerErr.message && registerErr.message.includes('已被注册')) {
              // 查找已存在的用户
              const { data: existingUsers } = await supabase
                .from('profiles')
                .select('id')
                .or(`email.eq.${email},username.eq.${u.name}${u.employeeId}`)
                .limit(1);
              if (existingUsers && existingUsers.length > 0) {
                const existingId = existingUsers[0].id;
                await supabase
                  .from('profiles')
                  .update({
                    name: u.name,
                    role: mappedRole,
                    email: email,
                    department_level1: u.departmentLevel1,
                    department_level2: u.departmentLevel2,
                    department_level3: u.departmentLevel3,
                    phone: u.phone,
                    employee_id: u.employeeId
                  })
                  .eq('id', existingId);
                updateCount++;
                // 同步 auth.users 邮箱，失败不阻塞
                try {
                  await supabase.rpc('admin_update_user_email', {
                    target_user_id: existingId,
                    new_email: email
                  });
                } catch (e) {
                  console.warn('auth.users 邮箱同步失败，请手动检查', e);
                }
              } else {
                throw registerErr;
              }
            } else {
              throw registerErr;
            }
          }
        } catch (err) {
          failList.push(`${u.name}(${u.employeeId}): ${err.message || '未知错误'}`);
        }
      }

      let resultMsg = `成功创建 ${successCount} 个账号`;
      if (updateCount > 0) resultMsg += `，更新 ${updateCount} 个已有账号`;
      if (failList.length > 0) {
        resultMsg += `\n失败 ${failList.length} 个：\n${failList.slice(0, 5).join('\n')}`;
        if (failList.length > 5) resultMsg += `\n... 共 ${failList.length} 个失败`;
      }
      ElMessage.success(resultMsg);
      loadUsers();
    } catch (err) {
      if (err !== 'cancel') ElMessage.error('导入失败：' + (err.message || err));
    }
  };
  reader.readAsArrayBuffer(file.raw);
};

// 下载 Excel 模板（8列通讯录架构）
const downloadTemplate = () => {
  const templateData = [
    {
      '姓名': '张三',
      '工号': 'CTI001',
      '一级部门': '业务',
      '二级部门': '食品产品线',
      '三级部门': '青岛',
      '角色': '业务',
      '电话': '13800138000',
      '邮箱': 'zhangsan@cti-cert.com'
    },
    {
      '姓名': '李四',
      '工号': 'CTI002',
      '一级部门': '实验室',
      '二级部门': '青岛食品实验室',
      '三级部门': '理化组',
      '角色': '检测组长',
      '电话': '13800138001',
      '邮箱': 'lisi@cti-cert.com'
    },
    {
      '姓名': '（以下为填写说明，实际填写时删除本行）',
      '工号': '',
      '一级部门': '业务 或 实验室',
      '二级部门': '业务端：食品产品线/特食及日化产品线/饲料产品线/农产品产品线/其他产品线；实验室端：青岛食品实验室/青岛食品大客户实验室',
      '三级部门': '业务端填属地如青岛、上海；实验室端：企业气相组/企业液相组/政府气相组/政府液相组/综合组/理化组/营养标签组/包材组/分子生物组/元素组/微生物组/标签审核组/放射性检测组/客服组/制样组/报告组',
      '角色': '业务端：业务/业务助理；实验室端：实验室主管/实验室主管助理/检测组长/检测组长助理/检测工程师',
      '电话': '',
      '邮箱': ''
    }
  ];
  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '用户注册模板');
  XLSX.writeFile(wb, '用户注册模板.xlsx');
};

const loadUsers = async () => {
  try {
    const response = await userAPI.getAll();
    users.value = response.data;
  } catch (error) {
    console.error(error);
  }
};

const loadCommunications = async () => {
  try {
    const { data, error } = await supabase
      .from('communications')
      .select(`
        *,
        sender:sender_id(name, employee_id),
        communication_recipients(recipient_id, recipient:recipient_id(name)),
        replies(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    communications.value = (data || []).map(c => ({
      id: c.id,
      type: c.type,
      content: c.content,
      customerName: c.customer_name,
      sampleCode: c.sample_code,
      senderName: c.sender?.name || '-',
      senderEmployeeId: c.sender?.employee_id || '-',
      recipientNames: (c.communication_recipients || []).map(r => r.profiles?.name || '-').join(', '),
      replyCount: c.replies?.[0]?.count || 0,
      status: c.status,
      createdAt: c.created_at
    }));
  } catch (error) {
    console.error('加载沟通记录失败:', error);
  }
};

const loadNotifications = async () => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    allNotifications.value = data || [];
  } catch (error) {
    console.error('加载通知失败:', error);
  }
};

// ==================== 统计功能 ====================

const statsTimeRange = ref([]);  // [startDate, endDate]
const statsPersonName = ref('');  // 发起人姓名/工号
const statsTypes = ref([]);       // 选中的沟通类型
const statsLoading = ref(false);
const statsResult = ref(null);     // 统计结果

// 计算统计数据
const calculateStats = async () => {
  statsLoading.value = true;
  try {
    // 获取所有沟通记录（snake_case 格式）
    const { data: allCommunications, error } = await communicationAPI.exportAll();
    if (error) throw error;

    // 获取所有用户
    let allUsers = [];
    try {
      const userResp = await userAPI.getAll();
      allUsers = userResp.data || [];
    } catch (e) {
      // 如果 userAPI.getAll() 不可用，直接从 supabase 查询
      const { data: usersData } = await supabase.from('profiles').select('*');
      allUsers = usersData || [];
    }

    // 构建用户映射 (id -> user)
    const userMap = {};
    allUsers.forEach(u => {
      userMap[u.id] = u;
    });

    // 过滤沟通记录
    let filteredComm = allCommunications || [];

    // 按时间范围过滤
    if (statsTimeRange.value && statsTimeRange.value.length === 2) {
      const [start, end] = statsTimeRange.value;
      filteredComm = filteredComm.filter(c => {
        const createdAt = c.created_at;
        if (!createdAt) return false;
        return createdAt >= start && createdAt <= end + 'T23:59:59';
      });
    }

    // 按人员名称过滤（发起人姓名或工号模糊匹配）
    if (statsPersonName.value) {
      const kw = statsPersonName.value.toLowerCase();
      filteredComm = filteredComm.filter(c => {
        const sender = userMap[c.sender_id];
        if (!sender) return false;
        return (
          (sender.name && sender.name.toLowerCase().includes(kw)) ||
          (sender.employee_id && sender.employee_id.toLowerCase().includes(kw))
        );
      });
    }

    // 按沟通类型过滤
    if (statsTypes.value && statsTypes.value.length > 0) {
      filteredComm = filteredComm.filter(c => statsTypes.value.includes(c.type));
    }

    // ========== 表格1：发起人统计 ==========
    const senderMap = {};  // sender_id -> stats
    filteredComm.forEach(c => {
      const senderId = c.sender_id;
      if (!senderId) return;
      if (!senderMap[senderId]) {
        const sender = userMap[senderId] || {};
        senderMap[senderId] = {
          name: sender.name || '-',
          employeeId: sender.employee_id || '-',
          role: sender.role || '-',
          roleName: getRoleName(sender.role || ''),
          paid_urgent: 0,
          free_urgent: 0,
          data_dispute: 0,
          follow_up: 0,
          consultation: 0,
          other: 0,
          unqualified: 0,
          data_confirm: 0,
          total: 0
        };
      }
      const stat = senderMap[senderId];
      if (stat[c.type] !== undefined) {
        stat[c.type]++;
        stat.total++;
      }
    });
    const senderStats = Object.values(senderMap);

    // ========== 表格2：接收人统计 ==========
    const recipientMap = {};  // recipient_id -> stats
    filteredComm.forEach(c => {
      const recipients = c.communication_recipients || [];
      recipients.forEach(r => {
        const rid = r.recipient_id;
        if (!rid) return;
        if (!recipientMap[rid]) {
          const user = userMap[rid] || {};
          recipientMap[rid] = {
            name: user.name || '-',
            employeeId: user.employee_id || '-',
            role: user.role || '-',
            roleName: getRoleName(user.role || ''),
            department: user.department || user.region || '-',
            paid_urgent: 0,
            free_urgent: 0,
            data_dispute: 0,
            follow_up: 0,
            consultation: 0,
            other: 0,
            unqualified: 0,
            data_confirm: 0,
            total: 0
          };
        }
        const stat = recipientMap[rid];
        if (stat[c.type] !== undefined) {
          stat[c.type]++;
          stat.total++;
        }
      });
    });
    const recipientStats = Object.values(recipientMap);

    // ========== 表格3：按组统计 ==========
    const groupMap = {};  // group -> { types... }
    filteredComm.forEach(c => {
      const recipients = c.communication_recipients || [];
      // 收集这条沟通涉及的所有组（去重）
      const groupsForThisComm = new Set();
      recipients.forEach(r => {
        const rid = r.recipient_id;
        if (!rid) return;
        const user = userMap[rid] || {};
        const group = user.department || user.region || '未分组';
        groupsForThisComm.add(group);
      });
      // 每个组 +1（去重后）
      groupsForThisComm.forEach(group => {
        if (!groupMap[group]) {
          groupMap[group] = {
            group,
            paid_urgent: 0,
            free_urgent: 0,
            data_dispute: 0,
            follow_up: 0,
            consultation: 0,
            other: 0,
            unqualified: 0,
            data_confirm: 0,
            total: 0
          };
        }
        const stat = groupMap[group];
        if (stat[c.type] !== undefined) {
          stat[c.type]++;
          stat.total++;
        }
      });
    });
    const groupStats = Object.values(groupMap);

    // ========== 表格4：同意统计 ==========
    const approvalMap = {};  // sender_id (of reply) -> stats
    filteredComm.forEach(c => {
      const replies = c.replies || [];
      replies.forEach(r => {
        // 判断回复是否包含"同意"
        if (r.content && r.content.includes('同意')) {
          const replySenderId = r.sender_id;
          if (!replySenderId) return;
          if (!approvalMap[replySenderId]) {
            const user = userMap[replySenderId] || {};
            approvalMap[replySenderId] = {
              name: user.name || '-',
              employeeId: user.employee_id || '-',
              role: user.role || '-',
              roleName: getRoleName(user.role || ''),
              department: user.department || user.region || '-',
              paid_urgent: 0,
              free_urgent: 0,
              data_dispute: 0,
              follow_up: 0,
              consultation: 0,
              other: 0,
              unqualified: 0,
              data_confirm: 0,
              total: 0
            };
          }
          const stat = approvalMap[replySenderId];
          if (stat[c.type] !== undefined) {
            stat[c.type]++;
            stat.total++;
          }
        }
      });
    });
    const approvalStats = Object.values(approvalMap);

    statsResult.value = {
      senderStats,
      recipientStats,
      groupStats,
      approvalStats
    };

    ElMessage.success(`统计完成：共 ${filteredComm.length} 条沟通记录`);
    await adminLogAPI.log('stats_query', null, '', `统计查询：时间=${statsTimeRange.value || '全部'}，人员=${statsPersonName.value || '全部'}`);
  } catch (error) {
    console.error('统计失败:', error);
    ElMessage.error('统计失败：' + (error.message || '未知错误'));
  } finally {
    statsLoading.value = false;
  }
};

// 导出统计结果为 Excel
const exportStatsToExcel = () => {
  if (!statsResult.value) {
    ElMessage.warning('请先查询统计数据');
    return;
  }
  try {
    const wb = XLSX.utils.book_new();

    // Sheet1: 发起人统计
    const senderData = statsResult.value.senderStats.map(row => ({
      '姓名': row.name,
      '工号': row.employeeId,
      '角色': row.roleName,
      '付费加急': row.paid_urgent,
      '免费加急': row.free_urgent,
      '数据质疑': row.data_dispute,
      '跟单': row.follow_up,
      '咨询': row.consultation,
      '其他': row.other,
      '不合格沟通': row.unqualified,
      '数据确认': row.data_confirm,
      '总计': row.total
    }));
    const ws1 = XLSX.utils.json_to_sheet(senderData);
    XLSX.utils.book_append_sheet(wb, ws1, '发起人统计');

    // Sheet2: 接收人统计
    const recipientData = statsResult.value.recipientStats.map(row => ({
      '姓名': row.name,
      '工号': row.employeeId,
      '角色': row.roleName,
      '部门/组': row.department,
      '付费加急': row.paid_urgent,
      '免费加急': row.free_urgent,
      '数据质疑': row.data_dispute,
      '跟单': row.follow_up,
      '咨询': row.consultation,
      '其他': row.other,
      '不合格沟通': row.unqualified,
      '数据确认': row.data_confirm,
      '总计': row.total
    }));
    const ws2 = XLSX.utils.json_to_sheet(recipientData);
    XLSX.utils.book_append_sheet(wb, ws2, '接收人统计');

    // Sheet3: 按组统计
    const groupData = statsResult.value.groupStats.map(row => ({
      '组别': row.group,
      '付费加急': row.paid_urgent,
      '免费加急': row.free_urgent,
      '数据质疑': row.data_dispute,
      '跟单': row.follow_up,
      '咨询': row.consultation,
      '其他': row.other,
      '不合格沟通': row.unqualified,
      '数据确认': row.data_confirm,
      '总计': row.total
    }));
    const ws3 = XLSX.utils.json_to_sheet(groupData);
    XLSX.utils.book_append_sheet(wb, ws3, '按组统计');

    // Sheet4: 同意统计
    const approvalData = statsResult.value.approvalStats.map(row => ({
      '姓名': row.name,
      '工号': row.employeeId,
      '角色': row.roleName,
      '部门/组': row.department,
      '付费加急': row.paid_urgent,
      '免费加急': row.free_urgent,
      '数据质疑': row.data_dispute,
      '跟单': row.follow_up,
      '咨询': row.consultation,
      '其他': row.other,
      '不合格沟通': row.unqualified,
      '数据确认': row.data_confirm,
      '总计': row.total
    }));
    const ws4 = XLSX.utils.json_to_sheet(approvalData);
    XLSX.utils.book_append_sheet(wb, ws4, '同意统计');

    const fileName = `沟通统计_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    ElMessage.success('导出成功：' + fileName);
    adminLogAPI.log('stats_export', null, '', '导出统计结果：' + fileName);
  } catch (error) {
    ElMessage.error('导出失败：' + (error.message || '未知错误'));
  }
};

// ==================== 存储管理相关方法 ====================
const storageLoading = ref(false);

const loadStorageStatus = async () => {
  storageLoading.value = true;
  try {
    const { data } = await communicationAPI.getStorageStatus();
    storageStatus.value = data;
  } catch (error) {
    ElMessage.error('获取存储状态失败：' + (error.message || '未知错误'));
  } finally {
    storageLoading.value = false;
  }
};

const handleCleanupPreview = async () => {
  if (!cleanupDate.value) {
    ElMessage.warning('请选择日期');
    return;
  }
  cleanupPreviewLoading.value = true;
  try {
    const { data } = await communicationAPI.getOldCommunications(cleanupDate.value);
    oldCommunications.value = data;
    if (data.length === 0) {
      ElMessage.info('该日期之前没有沟通记录');
    }
  } catch (error) {
    ElMessage.error('预览失败：' + (error.message || '未知错误'));
  } finally {
    cleanupPreviewLoading.value = false;
  }
};

const handleCleanupConfirm = async () => {
  if (!cleanupDate.value || oldCommunications.value.length === 0) {
    ElMessage.warning('请先选择日期并预览');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${oldCommunications.value.length} 条沟通记录及其相关数据吗？\n\n此操作不可恢复！`,
      '确认清理',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }
    );
    cleanupLoading.value = true;
    const { data } = await communicationAPI.cleanupOldData(cleanupDate.value);
    ElMessage.success(data.message);
    showCleanupDialog.value = false;
    oldCommunications.value = [];
    await loadStorageStatus();
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('清理失败：' + (error.message || '未知错误'));
  } finally {
    cleanupLoading.value = false;
  }
};

// 页面加载时自动获取存储状态
onMounted(() => {
  loadUsers();
  loadCommunications();
  loadNotifications();
  loadStorageStatus();
});

// ==================== 一键备份功能 ====================
const handleBackup = async () => {
  backupLoading.value = true;
  try {
    ElMessage.info('正在备份数据，请稍候...');

    // 1. 获取所有用户
    let allUsers = [];
    try {
      const userResp = await userAPI.getAll();
      allUsers = userResp.data || [];
    } catch (e) {
      const { data } = await supabase.from('profiles').select('*');
      allUsers = data || [];
    }

    // 2. 获取所有沟通记录（带详情）
    const { data: allCommunications, error: commError } = await supabase
      .from('communications')
      .select(`
        *,
        sender:sender_id(name, employee_id, role),
        communication_recipients(
          recipient:recipient_id(name, employee_id, role),
          is_read,
          has_replied,
          is_completed,
          is_flagged
        ),
        replies(
          id,
          content,
          created_at,
          sender:sender_id(name, employee_id)
        )
      `)
      .order('created_at', { ascending: false });

    if (commError) throw commError;

    // 3. 获取所有通知
    const { data: allNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (notifError) throw notifError;

    // 4. 创建 Excel 工作簿
    const wb = XLSX.utils.book_new();

    // Sheet1: 用户信息
    const userData = allUsers.map(u => ({
      'ID': u.id,
      '用户名': u.username || '',
      '姓名': u.name || '',
      '工号': u.employee_id || '',
      '角色': getRoleName(u.role || ''),
      '部门': u.department || '',
      '地区/组': u.region || '',
      '电话': u.phone || '',
      '邮箱': u.email || '',
      '是否禁用': u.is_disabled ? '是' : '否',
      '最后登录': u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('zh-CN') : '',
      '创建时间': u.created_at ? new Date(u.created_at).toLocaleString('zh-CN') : ''
    }));
    const ws1 = XLSX.utils.json_to_sheet(userData);
    XLSX.utils.book_append_sheet(wb, ws1, '用户信息');

    // Sheet2: 沟通记录
    const commData = (allCommunications || []).map(c => ({
      'ID': c.id,
      '类型': getTypeLabel(c.type || ''),
      '内容': c.content || '',
      '发起人': c.sender?.name || c.sender?.employee_id || '',
      '客户名称': c.customer_name || '',
      '样品编号': c.sample_code || '',
      '是否标记': c.is_flagged ? '是' : '否',
      '是否完结': c.is_completed ? '是' : '否',
      '是否撤回': c.is_recalled ? '是' : '否',
      '撤回原因': c.recall_reason || '',
      '撤回时间': c.recalled_at ? new Date(c.recalled_at).toLocaleString('zh-CN') : '',
      '接收人': c.communication_recipients?.map(r => r.recipient?.name || r.recipient?.employee_id || '').join('、') || '',
      '回复数': c.replies?.length || 0,
      '创建时间': c.created_at ? new Date(c.created_at).toLocaleString('zh-CN') : ''
    }));
    const ws2 = XLSX.utils.json_to_sheet(commData);
    XLSX.utils.book_append_sheet(wb, ws2, '沟通记录');

    // Sheet3: 回复记录
    const replyData = [];
    (allCommunications || []).forEach(c => {
      (c.replies || []).forEach(r => {
        replyData.push({
          '回复ID': r.id,
          '所属沟通ID': c.id,
          '沟通类型': getTypeLabel(c.type || ''),
          '回复人': r.sender?.name || r.sender?.employee_id || '',
          '回复内容': r.content || '',
          '回复时间': r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : ''
        });
      });
    });
    const ws3 = XLSX.utils.json_to_sheet(replyData);
    XLSX.utils.book_append_sheet(wb, ws3, '回复记录');

    // Sheet4: 通知记录
    const notifData = (allNotifications || []).map(n => ({
      'ID': n.id,
      '类型': n.type || '',
      '内容': n.content || '',
      '是否已读': n.is_read ? '是' : '否',
      '创建时间': n.created_at ? new Date(n.created_at).toLocaleString('zh-CN') : ''
    }));
    const ws4 = XLSX.utils.json_to_sheet(notifData);
    XLSX.utils.book_append_sheet(wb, ws4, '通知记录');

    // 保存文件
    const fileName = `系统备份_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    ElMessage.success(`备份成功！文件名：${fileName}，共备份 ${allUsers.length} 个用户，${allCommunications?.length || 0} 条沟通记录`);
    await adminLogAPI.log('backup', null, '', `一键备份： ${fileName}`);
  } catch (error) {
    console.error('备份失败:', error);
    ElMessage.error('备份失败：' + (error.message || '未知错误'));
  } finally {
    backupLoading.value = false;
  }
};


// ==================== 点赞详情弹窗 ====================
const reactionDetailVisible = ref(false);
const reactionDetailList = ref([]);
const reactionDetailTitle = ref('');

const viewAnnouncementReactions = async (announcementId) => {
  try {
    const { data } = await reactionAPI.getDetail('announcement', announcementId);
    reactionDetailList.value = data || [];
    reactionDetailTitle.value = '公告点赞/点踩详情';
    reactionDetailVisible.value = true;
  } catch (error) {
    ElMessage.error('加载点赞详情失败');
  }
};

const viewReplyReactions = async (replyId) => {
  try {
    const { data } = await reactionAPI.getDetail('reply', replyId);
    reactionDetailList.value = data || [];
    reactionDetailTitle.value = '回复点赞/点踩详情';
    reactionDetailVisible.value = true;
  } catch (error) {
    ElMessage.error('加载点赞详情失败');
  }
};

onMounted(() => {
  loadUsers();
  loadCommunications();
  loadNotifications();
});
</script>

<style scoped>
.admin-page {
  padding: 24px;
  min-height: 100vh;
  background: #f5f7fa;
}

.page-header {
  background: white;
  border-radius: 16px;
  padding: 24px 32px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.page-header h1 {
  font-size: 24px;
  color: #303133;
  font-weight: 600;
  margin-bottom: 6px;
}

.page-header p {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.page-content {
  max-width: 1400px;
  margin: 0 auto;
}

.beautiful-tabs {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  padding: 24px;
}

/* Tab 标签栏 - 增加间距 */
:deep(.el-tabs--card > .el-tabs__header) {
  margin-bottom: 24px;
  padding: 8px 16px 0;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__nav) {
  border-radius: 10px 10px 0 0;
  gap: 4px;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item) {
  border-radius: 10px 10px 0 0;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.3s;
  height: 48px;
  line-height: 24px;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);
  color: white;
  border: none;
}

/* 操作栏 - 增加间距 */
.tab-header {
  margin-bottom: 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  padding: 4px 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  width: 300px;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 12px;
}

.beautiful-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
}

:deep(.el-table) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

:deep(.el-table th.el-table__cell) {
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  color: #303133;
  font-weight: 600;
  font-size: 14px;
  padding: 16px 12px;
}

:deep(.el-table td.el-table__cell) {
  padding: 14px 12px;
}

:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s;
  padding: 10px 20px;
  height: 40px;
}

/* 用户管理操作栏按钮 - 更紧凑 */
.op-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}
.op-btns .op-btn {
  padding: 2px 8px !important;
  height: 26px !important;
  font-size: 12px !important;
  min-height: 26px !important;
  border-radius: 4px !important;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);
  border: none;
}

:deep(.el-button--primary:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}

:deep(.el-button--success) {
  background: linear-gradient(135deg, #67c23a 0%, #5daf34 100%);
  border: none;
}

:deep(.el-button--success:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.4);
}

:deep(.el-tag) {
  border-radius: 6px;
  font-weight: 500;
  padding: 4px 12px;
}

:deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);
  color: white;
  padding: 20px 24px;
  margin: 0;
}

:deep(.el-dialog__title) {
  color: white;
  font-weight: 600;
}

:deep(.el-pagination) {
  margin-top: 24px;
  justify-content: center;
}

.record-count {
  color: #606266;
  font-size: 14px;
  font-weight: 500;
}

/* ==================== 统计页面样式 ==================== */

.stats-content {
  padding: 20px;
}

.stats-filter {
  background: #f9fafb;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 24px;
  border: 1px solid #e8ecf1;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 0;
}

/* ==================== 存储清理对话框 ==================== */
.cleanup-dialog-content {
  padding: 16px 0;
}

.cleanup-warning {
  margin-bottom: 16px;
}

.cleanup-date-picker {
  margin-bottom: 16px;
}

.cleanup-preview {
  margin-top: 16px;
}

.filter-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
  padding-bottom: 4px;
}

.stats-tables {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.stats-table-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #409eff;
}

.stats-placeholder {
  padding: 60px 0;
}

/* 统计表格内总计列高亮 */
.stats-table-section :deep(.el-table .el-table__cell:last-child) {
  background: #f0f9ff;
}

/* 筛选区域按钮样式 */
.stats-filter :deep(.el-button--primary) {
  padding: 8px 20px;
  height: 36px;
}

.stats-filter :deep(.el-button--success) {
  padding: 8px 20px;
  height: 36px;
}
</style>
