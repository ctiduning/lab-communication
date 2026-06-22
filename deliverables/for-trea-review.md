# 实验室沟通系统 4项功能开发 — trea 审查材料

## 一、用户需求

### 需求1：角色体系扩展
在管理员创建用户时，当部门选择路径为 `实验室 → 食品实验室/食品大客户实验室 → 报告组` 时，角色下拉框提供以下4个角色：
- 报告组长（report_leader）
- **报告组长助理（report_leader_assistant）— 新增**
- 数据二审（data_review）
- 报告编制（report_compiler）

### 需求2：追加对所有人发送消息
在"已发送消息"界面，每条消息后面增加一个"追加对所有人发送消息"的快捷键（浅绿色背景、黑色字体）。点击后不管其他人有没有看、有没有回复、有没有处理，所有接收人那里这条消息就变成了"待处理"。追加的消息放在沟通详情的最上方，以红色加粗字体显示，外边框格式类似于转发消息界面。

### 需求3：撤回编辑退出按钮
对已发送消息撤回后，进入编辑重发界面时，需要一个退出方式来回退到主界面。

### 需求4：部门选择提示文字修改
将部门名片选择器下方的提示文字从灰色改为红色加粗警告：报告组和客服组请直接选择个人名片，不要选择部门名片。

---

## 二、代码实现

### 涉及文件（9个）

#### 1. src/utils/departmentConfig.js

```diff
export const LAB_ROLES = [
  { value: 'supervisor', label: '实验室主管' },
  { value: 'supervisor_assistant', label: '实验室主管助理' },
  { value: 'inspection_leader', label: '检测组长' },
  { value: 'inspection_leader_assistant', label: '检测组长助理' },
  { value: 'inspection_engineer', label: '检测工程师' },
+ { value: 'report_leader', label: '报告组长' },
+ { value: 'report_leader_assistant', label: '报告组长助理' },
+ { value: 'data_review', label: '数据二审' },
+ { value: 'report_compiler', label: '报告编制' },
]
```

#### 2. src/api/index.js

**ROLE_OPTIONS 添加 report_leader_assistant：**
```javascript
{ value: 'report_leader_assistant', label: '报告组长助理', dept: 'lab' },
```

**getRoleCardColor 添加颜色映射：**
```javascript
report_leader_assistant: { bg: '#DAA520', text: '#fff' },
```

**getRoleTagClass 添加标签类：**
```javascript
report_leader_assistant: 'tag-amber',
```

**getAll() 和 getById() 添加字段映射：**
```javascript
isAppendForward: c.is_append_forward || false,
forwardedFrom: c.forwarded_from || null,
```

**新增 appendResend API（完整代码）：**
```javascript
async appendResend(communicationId) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('未登录');

    // 获取原沟通记录及收件人
    const { data: original, error: origError } = await supabase
      .from('communications')
      .select(`
        *,
        communication_recipients(recipient_id, has_replied, is_completed)
      `)
      .eq('id', communicationId)
      .single();
    if (origError) throw origError;
    if (!original) throw new Error('沟通记录不存在');

    // 构建系统通知内容
    const systemNote = `\n\n—— 发起人对所有人追加发送消息 ——\n此消息为沟通发起人对历史消息的追加回复，所有收件人的回复状态已重置为"待处理"，请重新回复确认。`;

    // 创建新沟通记录（追加转发类型）
    const { data: newComm, error: createError } = await supabase
      .from('communications')
      .insert({
        sender_id: userId,
        type: original.type,
        content: (original.content || '') + systemNote,
        customer_name: original.customer_name,
        sample_code: original.sample_code,
        sample_matrix: original.sample_matrix,
        sample_count: original.sample_count,
        test_items: original.test_items,
        sample_date: original.sample_date,
        requested_cycle: original.requested_cycle,
        charge_status: original.charge_status,
        urgent_fee: original.urgent_fee,
        remark: original.remark,
        vip: original.vip,
        attachments: original.attachments || [],
        department_card_ids: original.department_card_ids || [],
        is_append_forward: true,
        forwarded_from: communicationId
      })
      .select()
      .single();
    if (createError) throw createError;

    // 获取所有原收件人
    const originalRecipients = original.communication_recipients || [];
    const recipientIds = originalRecipients.map(r => r.recipient_id);

    // 创建新的收件人记录（状态全部重置）
    if (recipientIds.length > 0) {
      const newRecipients = recipientIds.map(rid => ({
        communication_id: newComm.id,
        recipient_id: rid,
        has_replied: false,
        is_completed: false,
        is_read: false,
        has_new_reply: false
      }));
      const { error: recError } = await supabase
        .from('communication_recipients')
        .insert(newRecipients);
      if (recError) throw recError;
    }

    // 创建通知
    if (recipientIds.length > 0) {
      const notifications = recipientIds.map(rid => ({
        user_id: rid,
        communication_id: newComm.id,
        type: 'communication',
        content: `有新的沟通请求（追加回复）：${getTypeLabel(original.type)}`
      }));
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);
      if (notifError) throw notifError;
    }

    return { data: newComm };
}
```

#### 3. src/pages/SentMessages.vue

**操作列模板（核心改动）：**
```html
<el-table-column label="操作" min-width="520" align="center">
  <template #default="scope">
    <el-button size="small" @click.stop="viewDetail(scope.row)">查看</el-button>
    
    <!-- 追加对所有人发送消息（第2位，紧挨查看） -->
    <el-button 
      v-if="!scope.row.isRecalled"
      size="small" 
      style="background:#E1F5EE;color:#000;border-color:#B2DFDB;margin-left:4px;font-weight:500;"
      @click.stop="handleAppendResend(scope.row)"
    >
      追加对所有人发送消息
    </el-button>
    
    <el-button v-if="canFollowUp(scope.row)" size="small" type="primary" ...>追加回复</el-button>
    <el-button v-if="!scope.row.isRecalled" size="small" type="success" ...>转发</el-button>
    <el-button ...>{{ scope.row.hasFlagged ? '取消红旗' : '红旗' }}</el-button>
  </template>
</el-table-column>
```

**详情弹窗底部按钮：**
```html
<el-button
  v-if="!selectedComm.isRecalled"
  size="small"
  style="background:#E1F5EE;color:#000;border-color:#B2DFDB;margin-left:8px;font-weight:500;"
  @click="handleAppendResend(selectedComm)"
>
  追加对所有人发送消息
</el-button>
```

**系统通知卡片（详情顶部）：**
```html
<div v-if="selectedComm.isAppendForward" 
     style="background:#FCEBEB;border:2px solid #A32D2D;border-left:6px solid #A32D2D;border-radius:8px;padding:14px 16px;margin-bottom:12px;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="background:#A32D2D;color:white;font-size:11px;padding:2px 8px;border-radius:4px;font-weight:500;">系统通知</span>
    <span style="font-weight:500;font-size:14px;color:#A32D2D;">沟通发起人对所有人追加发送了消息</span>
  </div>
  <div style="font-size:13px;color:#791F1F;line-height:1.5;">
    此消息为沟通发起人对历史消息的追加回复，所有收件人的回复状态已重置为"待处理"，请重新回复确认。
  </div>
</div>
```

**handleAppendResend 函数：**
```javascript
const handleAppendResend = async (comm) => {
  try {
    await ElMessageBox.confirm(
      '确定要对所有人追加发送消息？所有收件人的回复状态将重置为"待处理"。',
      '确认追加发送',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    const loadingMsg = ElMessage.info('正在发送...')
    await communicationAPI.appendResend(comm.id)
    loadingMsg.close()
    ElMessage.success('追加发送成功，收件人状态已重置')
    detailVisible.value = false
    await loadCommunications()
  } catch (error) {
    if (error !== 'cancel') {
      const msg = error.message || '未知错误'
      if (msg.includes('is_append_forward')) {
        ElMessage.error('数据库字段缺失：请在 Supabase SQL Editor 中运行 ALTER TABLE communications ADD COLUMN IF NOT EXISTS is_append_forward BOOLEAN DEFAULT FALSE;')
      } else {
        ElMessage.error('发送失败：' + msg)
      }
    }
  }
}
```

**editAndResend 函数修复：**
```javascript
// 原代码（不工作）：
window.location.href = '#/business-initiate'  // 无Router，hash无人监听

// 修复后：
localStorage.setItem('recalledMessageEdit', JSON.stringify(editData))
window.dispatchEvent(new CustomEvent('switch-to-initiate'))  // 改为自定义事件
```

#### 4. src/pages/Home.vue

**新增事件监听：**
```javascript
const handleSwitchToSent = () => {
  activeMenu.value = 'sent';
};

// onMounted:
window.addEventListener('switch-to-sent', handleSwitchToSent);

// onUnmounted:
window.removeEventListener('switch-to-sent', handleSwitchToSent);
```

**handleSwitchToInitiate 修复：**
```javascript
// 原代码：
const handleSwitchToInitiate = () => {
  const preselect = sessionStorage.getItem('preselectRecipients');
  if (preselect) {
    // ...处理preselect数据
    if (viewRole.value === 'lab') activeMenu.value = 'lab-initiate';
    else activeMenu.value = 'initiate';
  }
  // 没有preselect时什么都不做 ← bug！
}

// 修复后：
const handleSwitchToInitiate = () => {
  const preselect = sessionStorage.getItem('preselectRecipients');
  if (preselect) {
    // ...处理preselect数据
  }
  // 无论有没有preselect都执行导航
  if (viewRole.value === 'lab') activeMenu.value = 'lab-initiate';
  else activeMenu.value = 'initiate';
};
```

#### 5-6. src/pages/BusinessInitiate.vue / LabInitiate.vue

**表单顶部退出编辑横幅：**
```html
<div v-if="isRecalledEditMode" style="background:#FFF8E1;border:1px solid #FFD54F;border-left:4px solid #FF8F00;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;">
  <span style="font-size:14px;font-weight:500;color:#795548;">编辑已撤回消息 — 修改后重新发送</span>
  <el-button size="small" type="danger" @click="exitRecalledEdit">退出编辑</el-button>
</div>
```

**exitRecalledEdit 函数：**
```javascript
const isRecalledEditMode = ref(false);

const exitRecalledEdit = () => {
  localStorage.removeItem('recalledMessageEdit');
  isRecalledEditMode.value = false;
  resetForm();
  clearAutoSave();
  try { localStorage.removeItem('biz_auto_draft'); } catch {}
  window.dispatchEvent(new CustomEvent('switch-to-sent'));
};

// onMounted:
const recalledEditData = localStorage.getItem('recalledMessageEdit');
if (recalledEditData) {
  isRecalledEditMode.value = true;
  // ...填充表单
}
```

**部门提示文字修改：**
```html
<div style="font-size:12px;font-weight:500;color:#A32D2D;line-height:1.6;margin-top:4px;">
  <span style="background:#FCEBEB;padding:1px 6px;border-radius:3px;">注意</span>
  选择部门后，消息将发送给该部门的负责人（检测组长+检测组长助理），同组任意一人回复即为该组已处理。
  <span style="font-weight:500;">报告组和客服组请直接选择个人名片，不要选择部门名片。</span>
</div>
```

#### 7. src/pages/Admin.vue
Excel导入角色映射添加：
```javascript
'报告组长助理': 'report_leader_assistant',
```

#### 8. src/pages/Organization.vue
角色显示名、tag、avatar添加：
```javascript
report_leader_assistant: '报告组长助理',
getRoleTagClass: { report_leader_assistant: 'tag-amber' },
getAvatarClass: { report_leader_assistant: 'avatar-amber' },
```

#### 9. supabase_add_append_forward.sql（新增文件）
```sql
ALTER TABLE communications 
ADD COLUMN IF NOT EXISTS is_append_forward BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_communications_append_forward ON communications (is_append_forward);
```

---

## 三、已修复的问题

### 问题1：editAndResend 导航不生效
- **症状**：点击"编辑重发"后页面不跳转
- **原因**：项目使用 Home.vue 动态组件（`<component :is="currentComponent">`）切换页面，无 Vue Router。`window.location.href = '#/business-initiate'` 没有触发任何页面切换。
- **修复**：改为 `window.dispatchEvent(new CustomEvent('switch-to-initiate'))`，Home.vue 监听该事件并设置 `activeMenu`。

### 问题2：退出编辑按钮点击无反应
- **症状**：黄色横幅显示后，点"退出编辑"什么也不发生
- **原因**：Home.vue 的 `handleSwitchToInitiate` 函数只在 sessionStorage 有 `preselectRecipients` 时才执行导航，但编辑重发存的是 `recalledMessageEdit`，不匹配。
- **修复**：将 `activeMenu.value = '...'` 移到 `if (preselect)` 外面，无条件执行导航。

### 问题3：按钮被操作列宽度挤掉
- **症状**：5个操作按钮在420px列宽中放不下
- **修复**：操作列 `width="420"` → `min-width="520"`，按钮顺序调整，追加按钮提到第2位。

### 问题4：按钮对已完结消息不可见
- **症状**：已完结消息不显示追加按钮
- **原因**：`v-if="!scope.row.isRecalled && !scope.row.isCompleted"`
- **修复**：改为 `v-if="!scope.row.isRecalled"`，移除 isCompleted 限制。

### 问题5：部署到错误分支
- **症状**：代码推送到 main 分支，但 GitHub Pages 从 gh-pages 分支提供服务
- **修复**：切换到 gh-pages 分支，从 dist/ 复制构建产物到根目录后推送。

---

## 四、当前仍存在的问题 ★★★

### 核心问题：追加按钮在 GitHub Pages 上不可见

**现象**：
用户访问 `https://ctiduning.github.io/lab-communication/#/` 的"已发送消息"页面，操作列仅能看到"查看"和"红旗"两个按钮。"追加对所有人发送消息"、"追加回复"、"转发"三个按钮均不可见。

**已经排查过的原因**：

1. ✅ 源代码已确认包含按钮（SentMessages.vue:125-132）
2. ✅ 编译产物确认包含按钮文本"追加对所有人发送消息"（grep dist/assets/SentMessages-*.js 返回匹配）
3. ✅ GitHub Pages 上线上 JS 文件确认包含按钮代码（通过 WebFetch 验证）
4. ✅ index.html 确认引用了正确的 JS 文件
5. ❌ 排除 Service Worker 缓存——已从 cache-first 改为 network-first 并推送 v3
6. ❌ 排除 GitHub Pages 缓存——已强制刷新尝试

**可能需要排查的方向**：
- 数据库中 `communications` 表的数据是否返回了异常的 `isRecalled` 值？
- `el-table-column` 在固定宽度下是否因为 `min-width` 导致列被截断？
- Element Plus 版本是否有已知的 column 渲染 bug？
- Vite 构建时的 tree-shaking 是否移除了部分模板内容？

---

## 五、用户仍需手动操作的事项

1. **跑 SQL 迁移**：在 Supabase SQL Editor 执行：
   ```sql
   ALTER TABLE communications 
   ADD COLUMN IF NOT EXISTS is_append_forward BOOLEAN DEFAULT FALSE;
   ```
   否则"追加对所有人发送消息"功能无法使用，会报数据库字段缺失错误。
