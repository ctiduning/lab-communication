import { supabase } from '../utils/supabase'
import { ElMessage } from 'element-plus'

// ==========================================
// 安全布尔值转换：处理数据库可能返回字符串 "true"/"false" 的情况
// ==========================================
function safeBoolean(val) {
  return val === true || val === 'true'
}

// ==========================================
// Auth 缓存：避免重复调用 supabase.auth.getUser()
// ==========================================
let cachedUserId = null
let cachedUserPromise = null

async function getCurrentUserId() {
  if (cachedUserId) return cachedUserId
  if (cachedUserPromise) return cachedUserPromise
  cachedUserPromise = supabase.auth.getUser().then(({ data }) => {
    cachedUserId = data?.user?.id || null
    cachedUserPromise = null
    return cachedUserId
  }).catch(err => {
    cachedUserPromise = null
    throw err
  })
  return cachedUserPromise
}

// Auth 状态变化时清除缓存
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    cachedUserId = null
    cachedUserPromise = null
  }
})

// ==========================================
// 文件上传相关
// ==========================================
export const uploadAPI = {
  // 上传单个文件到 Supabase Storage，返回公开 URL
  async upload(file, bucket = 'attachments') {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`
    const filePath = `${bucket}/${fileName}`

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { cacheControl: '3600', upsert: false })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return { url: publicUrl, name: file.name, path: filePath }
  },

  // 上传多个文件，返回附件数组
  async uploadMultiple(files, bucket = 'attachments') {
    const results = []
    for (const file of files) {
      const result = await this.upload(file, bucket)
      results.push(result)
    }
    return results
  }
}

// ==========================================
// 认证相关
// ==========================================
export const authAPI = {
  // 管理员注册用户（仅供 Admin 页面调用）
  // 使用数据库函数 admin_create_user，不影响当前管理员 session
  async register(userData) {
    const { username, password, name, role, employeeId, phone, email, region, department, departmentLevel1, departmentLevel2, departmentLevel3, priority, mustChangePwd } = userData

    // 检查邮箱或用户名是否已被注册（查 profiles 表）
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id, email, username, is_disabled')
      .or(`email.eq.${email},username.eq.${username}`)

    if (existingProfiles && existingProfiles.length > 0) {
      // 检查是否有活跃用户（未禁用）
      const activeUser = existingProfiles.find(p => !p.is_disabled)
      if (activeUser) {
        throw new Error('该邮箱或用户名已被注册')
      }
      // 已禁用用户：由 admin_create_user RPC 自行重新激活（UPDATE + 重置密码）
      // 前端不做删除操作（anon key 无 RLS 权限，删了也白删）
    }

    // 调用数据库函数创建用户（在数据库内完成，不影响前端 session）
    const { data, error } = await supabase.rpc('admin_create_user', {
      p_email: email,
      p_password: password,
      p_username: username,
      p_name: name,
      p_role: role,
      p_employee_id: employeeId || '',
      p_phone: phone || '',
      p_region: region || '',
      p_department: department || '',
      p_department_level1: departmentLevel1 || '',
      p_department_level2: departmentLevel2 || '',
      p_department_level3: departmentLevel3 || '',
      p_must_change_pwd: mustChangePwd ? true : false
    })

    if (error) {
      throw new Error('注册失败：' + error.message)
    }

    return { data: { user: data, message: '注册成功' } }
  },

  // 登录
  async login(credentials) {
    const { email, password } = credentials

    // 先清除旧 session，防止串号
    await supabase.auth.signOut()
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      if (error.message.includes('Invalid login')) {
        throw new Error('邮箱或密码错误')
      }
      throw error
    }

    // 检查账号是否被禁用
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_disabled')
      .eq('id', data.user.id)
      .single()

    if (profileData?.is_disabled) {
      // 立即登出，让 token 失效
      await supabase.auth.signOut()
      throw new Error('该账号已被禁用，请联系管理员')
    }

    // 获取完整 profile
    const { data: fullProfile } = await supabase
      .from('profiles')
      .select('id, name, username, email, role, employee_id, phone, department, department_level3, region, priority, is_disabled')
      .eq('id', data.user.id)
      .single()

    const meta = data.user.user_metadata || {}
    const mustChangePassword = fullProfile?.must_change_password === true

    const user = fullProfile ? {
      id: fullProfile.id,
      username: fullProfile.username,
      name: fullProfile.name,
      role: fullProfile.role,
      employeeId: fullProfile.employee_id,
      phone: fullProfile.phone,
      email: fullProfile.email,
      region: fullProfile.region,
      department: fullProfile.department,
      priority: fullProfile.priority,
      isDisabled: fullProfile.is_disabled === true,
      mustChangePassword
    } : {
      id: data.user.id,
      username: meta.username || '',
      name: meta.name || '',
      role: meta.role || 'business',
      employeeId: meta.employee_id || '',
      phone: meta.phone || '',
      email: data.user.email,
      region: meta.region || '',
      department: meta.department || '',
      priority: meta.priority || 2,
      isDisabled: false,
      mustChangePassword: meta.must_change_password === true
    }

    return {
      data: {
        token: data.session.access_token,
        user
      }
    }
  },

  // 登出
  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { data: { message: '登出成功' } }
  },

  // 获取当前会话
  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },

  // 获取当前用户资料
  async getCurrentUser() {
    const userId = await getCurrentUserId()
    if (!userId) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, username, email, role, employee_id, phone, department, department_level3, region, priority, is_disabled')
      .eq('id', userId)
      .single()

    if (error) return null
    return data
  }
}

// ==========================================
// 用户相关
// ==========================================
export const userAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, username, role, employee_id, phone, email, department_level1, department_level2, department_level3, priority, is_disabled, last_active_at, created_at')

    if (error) throw error
    return { data: data.map(formatProfile) }
  },

  async getByRole(role) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, username, role, employee_id, phone, email, department_level1, department_level2, department_level3, priority, is_disabled, last_active_at, created_at')
      .eq('role', role)

    if (error) throw error
    return { data: data.map(formatProfile) }
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, username, role, employee_id, phone, email, department_level1, department_level2, department_level3, priority, is_disabled, region, department, created_at')
      .eq('id', id)
      .single()

    if (error) throw error
    return { data: formatProfile(data) }
  },

  // 禁用用户
  async disable(id) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_disabled: true })
      .eq('id', id)

    if (error) throw error
    return { data: { message: '已禁用' } }
  },

  // 启用用户
  async enable(id) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_disabled: false })
      .eq('id', id)

    if (error) throw error
    return { data: { message: '已启用' } }
  },

  // 删除用户（物理删除，慎用）
  async deleteById(id) {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { data: { message: '删除成功' } }
  },

  // 更新用户资料（仅限自己的）
  async update(id, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data: formatProfile(data) }
  },

  // 管理员软删除用户：标记为已禁用，保留邮箱和用户名（便于重新激活）
  async deleteAccount(id) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_disabled: true,
        must_change_password: false
      })
      .eq('id', id)
    if (profileError) throw new Error('删除用户失败：' + profileError.message)
    return { data: { message: '用户已禁用，可重新导入激活' } }
  },

  // 管理员重置用户密码为 cti123
  async resetPassword(id) {
    const { error } = await supabase.rpc('reset_user_password', {
      target_user_id: id,
      new_password: 'cti123'
    })

    if (error) throw error
    return { data: { message: '密码已重置为 cti123' } }
  },

  // 更新用户最后活跃时间（用于判断在线状态）
  async updateLastActive() {
    const userId = await getCurrentUserId();
    if (!userId) return { data: { message: '未登录' } };
    
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({ last_active_at: now })
      .eq('id', userId);
    
    if (error) {
      // 如果字段不存在，忽略错误
      if (error.message.includes('does not exist') || error.code === '42703') {
        console.warn('last_active_at 字段不存在，请先运行 supabase_add_last_active.sql');
        return { data: { message: '字段不存在' } };
      }
      throw error;
    }
    return { data: { message: '已更新活跃时间' } }
  },

  // 管理员编辑用户资料（比上面的 update 更简单，不返回格式化数据）
  async adminUpdate(id, data) {
    const { error } = await supabase.from('profiles').update(data).eq('id', id)
    if (error) throw error
    return { data: { message: '已更新' } }
  },

  // 批量禁用
  async batchDisable(ids) {
    const { error } = await supabase.from('profiles').update({ is_disabled: true }).in('id', ids)
    if (error) throw error
    return { data: { message: `已禁用 ${ids.length} 人` } }
  },

  // 批量启用
  async batchEnable(ids) {
    const { error } = await supabase.from('profiles').update({ is_disabled: false }).in('id', ids)
    if (error) throw error
    return { data: { message: `已启用 ${ids.length} 人` } }
  },

  // 批量更新（改部门/角色）
  async batchUpdate(ids, data) {
    const { error } = await supabase.from('profiles').update(data).in('id', ids)
    if (error) throw error
    return { data: { message: `已更新 ${ids.length} 人` } }
  },
}

// ==========================================
// 沟通记录相关
// ==========================================
export const communicationAPI = {
  async getAll(recipientId = null, page = 1, pageSize = 50) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('communications')
      .select(`
        *,
        sender:sender_id(id, name, employee_id, phone, email, region, department, priority, role, department_level1),
        communication_recipients${recipientId ? '!inner' : ''}(
          recipient_id,
          is_read,
          is_flagged,
          read_at,
          is_completed,
          has_replied,
          replied_by,
          has_new_reply,
          is_cc,
          recipient:recipient_id(id, name, department, department_level3, role)
        ),
        replies(
          id,
          content,
          sender_id,
          sender:sender_id(name),
          created_at,
          target_recipient_id
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (recipientId) {
      query = query.eq('communication_recipients.recipient_id', recipientId);
    }

    const { data: communications, count, error } = await query;

    if (error) throw error

    // 批量获取标签信息
    let tagsMap = {}
    try {
      const commIds = communications.map(c => c.id)
      if (commIds.length > 0) {
        const { data: tagsData } = await supabase
          .from('message_tags')
          .select('communication_id, tag_name')
          .in('communication_id', commIds)
        if (tagsData) {
          tagsData.forEach(t => {
            if (!tagsMap[t.communication_id]) tagsMap[t.communication_id] = []
            tagsMap[t.communication_id].push(t.tag_name)
          })
        }
      }
    } catch (e) {
      console.warn('获取标签失败:', e)
    }

    const formatted = communications.map(c => ({
      id: c.id,
      senderId: c.sender_id,
      senderRole: c.sender?.department_level1 === '实验室' ? 'lab' : 'business',
      senderName: c.sender?.name || '',
      type: c.type,
      vip: c.vip,
      customerName: c.customer_name,
      sampleCode: c.sample_code,
      sampleMatrix: c.sample_matrix,
      sampleCount: c.sample_count,
      testItems: c.test_items,
      sampleDate: c.sample_date,
      requestedCycle: c.requested_cycle,
      chargeStatus: c.charge_status,
      urgentFee: c.urgent_fee,
      remark: c.remark,
      content: c.content,
      status: c.status,
      isFlagged: safeBoolean(c.is_flagged),
      createdAt: c.created_at,
      departmentCardIds: c.department_card_ids || [],
      recipients: c.communication_recipients?.map(r => r.recipient_id) || [],
      recipientDetails: c.communication_recipients?.map(r => ({
        ...r.recipient,
        recipient_id: r.recipient_id,
        is_read: safeBoolean(r.is_read),
        read_at: r.read_at || null,
        is_flagged: safeBoolean(r.is_flagged),
        is_completed: safeBoolean(r.is_completed),
        has_replied: safeBoolean(r.has_replied),
        replied_by: r.replied_by,
        has_new_reply: safeBoolean(r.has_new_reply),
        is_cc: safeBoolean(r.is_cc)
      })) || [],
      isCompleted: safeBoolean(c.is_completed),  // 沟通记录是否已完结（全局）
      isRecalled: safeBoolean(c.is_recalled),
      recallReason: c.recall_reason || '',
      recalledAt: c.recalled_at || null,
      forwardedFrom: c.forwarded_from || null,
      isAppendForward: safeBoolean(c.is_append_forward),
      forwardNote: c.forward_note || '',
      replyCount: c.replies?.length || 0,
      hasNewReply: safeBoolean(c.has_new_reply) || c.communication_recipients?.some(r => safeBoolean(r.has_new_reply)) || false,
      newReplyCount: c.communication_recipients?.filter(r => safeBoolean(r.has_new_reply)).length || 0,
      attachments: c.attachments || [],
      replies: c.replies?.map(r => ({
        id: r.id,
        senderId: r.sender_id,
        senderName: r.sender?.name || '',
        content: r.content,
        createdAt: r.created_at,
        targetRecipientId: r.target_recipient_id
      })) || [],
      tags: tagsMap[c.id] || []
    }))

    return { data: formatted, total: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) }
  },

  async create(data) {
    const {
      type, vip, customerName, sampleCode, sampleMatrix,
      sampleCount, testItems, sampleDate, requestedCycle,
      chargeStatus, urgentFee, remark, content, recipients, cc_recipients, attachments, department_card_ids
    } = data

    // 获取当前登录用户ID
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('未登录')

    const { data: communication, error } = await supabase
      .from('communications')
      .insert({
        sender_id: userId,
        type,
        vip,
        customer_name: customerName,
        sample_code: sampleCode,
        sample_matrix: sampleMatrix,
        sample_count: sampleCount,
        test_items: testItems,
        sample_date: sampleDate,
        requested_cycle: requestedCycle,
        charge_status: chargeStatus,
        urgent_fee: urgentFee,
        remark,
        content,
        attachments: attachments || [],
        department_card_ids: department_card_ids || []
      })
      .select()
      .single()

    if (error) throw error

    if (recipients && recipients.length > 0) {
      const uniqueRecipients = [...new Set(recipients)]
      const recipientRecords = uniqueRecipients.map(recipientId => ({
        communication_id: communication.id,
        recipient_id: recipientId
      }))

      const { error: recipientError } = await supabase
        .from('communication_recipients')
        .insert(recipientRecords)

      if (recipientError) throw recipientError
    }

    // 插入抄送人记录（过滤掉已经在收件人中的用户）
    if (cc_recipients && cc_recipients.length > 0) {
      const uniqueCC = [...new Set(cc_recipients)]
      const filteredCC = uniqueCC.filter(id => !(recipients || []).includes(id))
      const ccRecords = filteredCC.map(ccUserId => ({
        communication_id: communication.id,
        recipient_id: ccUserId,
        is_cc: true
      }))

      const { error: ccError } = await supabase
        .from('communication_recipients')
        .insert(ccRecords)

      if (ccError) throw ccError

      // 更新抄送频率已废弃，改为手动管理常用抄送人
    }

    const allNotifRecipients = [...new Set([...(recipients || []), ...(cc_recipients || [])])]
    if (allNotifRecipients.length > 0) {
      const notifications = allNotifRecipients.map(recipientId => ({
        user_id: recipientId,
        communication_id: communication.id,
        type: 'communication',
        content: `有新的沟通请求：${getTypeLabel(type)}`
      }))

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) throw notifError
    }

    return { data: communication }
  },

  async createReply(communicationId, { content, targetRecipientId }, skipRepliedFlag = false) {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('未登录')

    // ====== 第一步：检查是否已被回复（防止同组第二人重复回复）======
    const { data: existingRecipient } = await supabase
      .from('communication_recipients')
      .select('has_replied, replied_by')
      .eq('communication_id', communicationId)
      .eq('recipient_id', userId)
      .maybeSingle()

    // ====== 第二步：允许已回复用户追加回复 ======
    // 注意：已回复用户可以随时追加回复，不需要 skipRepliedFlag

    // ====== 第三步：插入回复 ======
    const { data: reply, error } = await supabase
      .from('replies')
      .insert({
        communication_id: communicationId,
        sender_id: userId,
        content,
        target_recipient_id: targetRecipientId || null
      })
      .select('*, sender:sender_id(name)')
      .single()

    if (error) throw error

    // 如果 skipRepliedFlag 为 true，只创建回复记录，不标记 has_replied
    if (skipRepliedFlag) {
      // 通知发起人（标记为"待确认"类型通知）
      const { data: comm } = await supabase
        .from('communications')
        .select('sender_id')
        .eq('id', communicationId)
        .single()
      if (comm) {
        await supabase.from('notifications').insert({
          user_id: comm.sender_id,
          communication_id: communicationId,
          type: 'reply',
          content: `接收人回复：等我确认后回复`
        })
      }
      return { data: reply }
    }

    // ====== 第四步：获取回复者信息 ======
    const { data: replierProfile } = await supabase
      .from('profiles')
      .select('name, role, department_level3')
      .eq('id', userId)
      .single()

    // ====== 第四步：获取该消息的信息 ======
    const { data: comm } = await supabase
      .from('communications')
      .select('sender_id, department_card_ids')
      .eq('id', communicationId)
      .single()

    // 确保 comm 存在
    if (!comm) throw new Error('沟通记录不存在')

    // ====== 第五步：检测是否是追加回复 ======
    // 追加回复场景：
    // 1. 收件人已回复后再次回复
    // 2. 发件人追加回复（发件人不在 communication_recipients 中）
    const isSender = comm.sender_id === userId
    const isFollowUp = isSender || safeBoolean(existingRecipient?.has_replied)

    // ====== 第六步：如果是追加回复，重置对方状态 ======
    if (isFollowUp) {
      // 重置所有收件人的已完结状态，并标记新回复
      await supabase
        .from('communication_recipients')
        .update({ 
          is_completed: false,
          has_new_reply: true
        })
        .eq('communication_id', communicationId)
      
      // 更新 communications 表，让发件人也能看到新回复提醒
      await supabase
        .from('communications')
        .update({ has_new_reply: true })
        .eq('id', communicationId)
    }

    // ====== 第七步：非发件人首次回复时的拦截检查 ======
    // 规则：
    // - 部门名片持有人：只拦截同组（同 department_level3 且属于 department_card_ids）的重复回复
    // - 个人名片（非 department_card_ids 成员）：永不拦截，允许独立回复
    if (!isSender && !isFollowUp) {
      const isCardHolder = comm.department_card_ids?.includes(userId)

      if (isCardHolder && replierProfile?.department_level3) {
        // 部门名片持有人：查出同组已回复的人
        const { data: sameDeptReplied } = await supabase
          .from('profiles')
          .select('id')
          .eq('department_level3', replierProfile.department_level3)
          .in('id', comm.department_card_ids)

        const sameDeptIds = (sameDeptReplied || []).map(u => u.id)

        if (sameDeptIds.length > 0) {
          const { data: repliedRecipients } = await supabase
            .from('communication_recipients')
            .select('replied_by')
            .eq('communication_id', communicationId)
            .eq('has_replied', true)
            .in('recipient_id', sameDeptIds)
            .limit(1)

          if (repliedRecipients && repliedRecipients.length > 0) {
            throw new Error(`同组已有${repliedRecipients[0].replied_by || '他人'}回复，无需重复回复`)
          }
        }
      }
      // 个人名片：不拦截，允许独立回复
    }

    const isDeptCardHolder = comm.department_card_ids?.includes(userId)

    if (isDeptCardHolder && replierProfile?.department_level3) {
      // ====== 部门名片持有人回复：按组同步 ======
      const deptLevel3 = replierProfile.department_level3

      // 1. 先更新回复者本人的 has_replied + replied_by
      await supabase
        .from('communication_recipients')
        .update({ has_replied: true, replied_by: replierProfile.name })
        .eq('communication_id', communicationId)
        .eq('recipient_id', userId)

      // 2. 查出该消息的所有收件人
      const { data: allRecipients } = await supabase
        .from('communication_recipients')
        .select('recipient_id')
        .eq('communication_id', communicationId)

      if (allRecipients && allRecipients.length > 0) {
        const allRecipientIds = allRecipients.map(r => r.recipient_id)

        // 3. 查出这些收件人中与回复者同 department_level3 的人
        const { data: sameDeptUsers } = await supabase
          .from('profiles')
          .select('id')
          .in('id', allRecipientIds)
          .eq('department_level3', deptLevel3)

        if (sameDeptUsers && sameDeptUsers.length > 0) {
          const sameDeptIds = sameDeptUsers.map(u => u.id)
          // 只同步 department_card_ids 中的人
          const toSync = sameDeptIds.filter(id => comm.department_card_ids.includes(id))

          if (toSync.length > 0) {
            await supabase
              .from('communication_recipients')
              .update({ has_replied: true, replied_by: replierProfile.name })
              .eq('communication_id', communicationId)
              .in('recipient_id', toSync)
          }
        }
      }

      // 4. 通知发起人（带上组名和回复者）
      await supabase.from('notifications').insert({
        user_id: comm.sender_id,
        communication_id: communicationId,
        type: 'reply',
        content: `${deptLevel3} ${replierProfile.role} ${replierProfile.name} 已回复`
      })
    } else {
      // ====== 普通回复：只标记自己 ======
      await supabase
        .from('communication_recipients')
        .update({ has_replied: true, replied_by: replierProfile.name })
        .eq('communication_id', communicationId)
        .eq('recipient_id', userId)

      // 通知发起人
      await supabase.from('notifications').insert({
        user_id: comm.sender_id,
        communication_id: communicationId,
        type: 'reply',
        content: '您的沟通请求已收到回复'
      })
    }

    return { data: reply }
  },

  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('communications')
      .update({ status })
      .eq('id', id)

    if (error) throw error
    return { data }
  },

  async getById(id) {
    const { data: communication, error } = await supabase
      .from('communications')
      .select(`
        *,
        sender:sender_id(id, name, employee_id, phone, email, region, department, priority),
        communication_recipients(
          recipient_id,
          is_read,
          is_flagged,
          read_at,
          is_completed,
          has_replied,
          replied_by,
          has_new_reply,
          is_cc,
          recipient:recipient_id(id, name, department, department_level3, region)
        ),
        replies(
          id,
          content,
          sender_id,
          sender:sender_id(name),
          created_at,
          target_recipient_id
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    return {
      data: {
        id: communication.id,
        senderId: communication.sender_id,
        senderRole: communication.sender?.role || '',
        senderName: communication.sender?.name || '',
        type: communication.type,
        vip: communication.vip,
        customerName: communication.customer_name,
        sampleCode: communication.sample_code,
        sampleMatrix: communication.sample_matrix,
        sampleCount: communication.sample_count,
        testItems: communication.test_items,
        sampleDate: communication.sample_date,
        requestedCycle: communication.requested_cycle,
        chargeStatus: communication.charge_status,
        urgentFee: communication.urgent_fee,
        remark: communication.remark,
        content: communication.content,
        isFlagged: safeBoolean(communication.is_flagged),
        createdAt: communication.created_at,
        departmentCardIds: communication.department_card_ids || [],
        attachments: communication.attachments || [],
        recipientDetails: communication.communication_recipients?.map(r => ({
          ...r.recipient,
          recipient_id: r.recipient_id,
          is_read: safeBoolean(r.is_read),
          read_at: r.read_at || null,
          is_flagged: safeBoolean(r.is_flagged),
          is_completed: safeBoolean(r.is_completed),
          has_replied: safeBoolean(r.has_replied),
          replied_by: r.replied_by,
          has_new_reply: safeBoolean(r.has_new_reply),
          is_cc: safeBoolean(r.is_cc)
        })) || [],
        isCompleted: safeBoolean(communication.is_completed),  // 沟通记录是否已完结（全局）
        isRecalled: safeBoolean(communication.is_recalled),
        recallReason: communication.recall_reason || '',
        recalledAt: communication.recalled_at || null,
        forwardedFrom: communication.forwarded_from || null,
        isAppendForward: safeBoolean(communication.is_append_forward),
        forwardNote: communication.forward_note || '',
        replyCount: communication.replies?.length || 0,
        hasNewReply: safeBoolean(communication.has_new_reply) || communication.communication_recipients?.some(r => safeBoolean(r.has_new_reply)) || false,
        newReplyCount: communication.communication_recipients?.filter(r => safeBoolean(r.has_new_reply)).length || 0,
        replies: communication.replies?.map(r => ({
          id: r.id,
          senderId: r.sender_id,
          senderName: r.sender?.name || '',
          content: r.content,
          createdAt: r.created_at,
          targetRecipientId: r.target_recipient_id
        })) || []
      }
    }
  },

  async getReplies(communicationId) {
    const { data, error } = await supabase
      .from('replies')
      .select('*, sender:sender_id(name)')
      .eq('communication_id', communicationId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    // 按时间正序返回，保持前端显示顺序
    data.reverse()

    const formatted = data.map(r => ({
      id: r.id,
      senderId: r.sender_id,
      senderName: r.sender?.name || '',
      content: r.content,
      createdAt: r.created_at
    }))

    return { data: formatted }
  },

  // 标记接收人已读
  async markAsRead(communicationId) {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('未登录')

    const { error } = await supabase
      .from('communication_recipients')
      .update({ is_read: true })
      .eq('communication_id', communicationId)
      .eq('recipient_id', userId)

    if (error) throw error
    return { data: { message: '已标记已读' } }
  },

  // 切换红旗标记（communications 表级，Profile 历史记录用）
  async toggleCommFlag(communicationId, isFlagged) {
    const { data, error } = await supabase
      .from('communications')
      .update({ is_flagged: isFlagged })
      .eq('id', communicationId)
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  // 切换红旗标记（基于 communication_recipients 表，每接收人独立）
  async toggleRecipientFlag(communicationId, recipientId, isFlagged) {
    const { data, error } = await supabase
      .from('communication_recipients')
      .update({ is_flagged: isFlagged })
      .eq('communication_id', communicationId)
      .eq('recipient_id', recipientId)
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  // 切换接收人个人的完结状态（基于 communication_recipients 表，每接收人独立）
  async toggleRecipientCompleted(communicationId, recipientId, isCompleted) {
    const { data, error } = await supabase
      .from('communication_recipients')
      .update({ is_completed: isCompleted })
      .eq('communication_id', communicationId)
      .eq('recipient_id', recipientId)
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  // 切换全局完结状态（发起人使用）
  async toggleCommCompleted(communicationId, isCompleted) {
    const { data, error } = await supabase
      .from('communications')
      .update({ is_completed: isCompleted })
      .eq('id', communicationId)
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  // 获取待处理消息数量（需要回复且未完成）
  async getPendingCount() {
    const userId = await getCurrentUserId()
    if (!userId) return { data: { count: 0 } }

    // 单次查询：通过 inner join 直接统计所有条件
    const { data, error } = await supabase
      .from('communication_recipients')
      .select(`
        communication_id,
        communications!inner(
          is_completed,
          is_recalled,
          is_system_notification
        )
      `)
      .eq('recipient_id', userId)
      .eq('has_replied', false)
      .eq('is_completed', false)
      .eq('communications.is_completed', false)
      .eq('communications.is_recalled', false)
      .eq('communications.is_system_notification', false)

    if (error) {
      console.error('getPendingCount 查询失败:', error)
      return { data: { count: 0 } }
    }

    return { data: { count: (data || []).length } }
  },

  // 获取已发送消息的新回复数量（用于侧边栏显示）
  async getSentNewReplyCount() {
    const userId = await getCurrentUserId()
    if (!userId) return { data: { count: 0 } }

    const { count, error } = await supabase
      .from('communications')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', userId)
      .eq('has_new_reply', true)
      .eq('is_recalled', false)

    if (error) {
      console.error('getSentNewReplyCount:', error)
      return { data: { count: 0 } }
    }

    return { data: { count: count || 0 } }
  },

  // 导出所有沟通记录（管理员用）
  async exportAll() {
    const { data: communications, error } = await supabase
      .from('communications')
      .select(`
        id,
        type,
        content,
        created_at,
        sender_id,
        is_flagged,
        is_completed,
        is_recalled,
        recall_reason,
        recalled_at,
        sender:sender_id(name, employee_id, role),
        communication_recipients(
          recipient:recipient_id(name, employee_id, role),
          is_completed,
          has_replied,
          is_flagged,
          read_at
        ),
        replies(
          id,
          content,
          created_at,
          sender: sender_id(name, employee_id)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: communications || [] };
  },

  // ==================== 存储管理相关 ====================
  // 获取存储状态（数据库记录数 + 文件存储）
  async getStorageStatus() {
    // 1. 统计数据库记录数
    const { count: commCount, error: commError } = await supabase
      .from('communications')
      .select('*', { count: 'exact', head: true });

    const { count: replyCount, error: replyError } = await supabase
      .from('replies')
      .select('*', { count: 'exact', head: true });

    const { count: notifCount, error: notifError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });

    const { count: userCount, error: userError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 2. 统计文件存储（从 communications 表中获取附件信息）
    const { data: commsWithAttachments, error: attachError } = await supabase
      .from('communications')
      .select('attachments')
      .not('attachments', 'is', null);

    // 计算文件数量和大小（通过 Storage API）
    let fileCount = 0;
    let fileSizeBytes = 0;
    try {
      const { data: files, error: storageError } = await supabase
        .storage
        .from('attachments')
        .list('', { limit: 10000 });

      if (!storageError && files) {
        // 过滤掉文件夹（name 为空或以 / 结尾的是文件夹）
        const actualFiles = files.filter(f => f.name && !f.name.endsWith('/'));
        fileCount = actualFiles.length;

        // 累加文件大小（metadata.size 在 Supabase 中可用）
        for (const file of actualFiles) {
          if (file.metadata && file.metadata.size) {
            fileSizeBytes += file.metadata.size;
          }
        }
      }
    } catch (e) {
      console.warn('获取文件列表失败:', e);
    }

    const fileSizeMB = fileSizeBytes / (1024 * 1024);

    return {
      data: {
        database: {
          communications: commCount || 0,
          replies: replyCount || 0,
          notifications: notifCount || 0,
          users: userCount || 0
        },
        storage: {
          fileCount: fileCount,
          fileSizeBytes: fileSizeBytes,
          fileSizeMB: fileSizeMB,
          // 估算：每条沟通记录约 2KB，每个回复约 1KB
          estimatedDbSizeMB: ((commCount || 0) * 2 + (replyCount || 0) * 1 + (notifCount || 0) * 0.5) / 1024,
          storageNote: fileSizeMB > 0 ? `附件占用 ${fileSizeMB.toFixed(2)} MB` : '暂无附件文件'
        },
        limits: {
          databaseMB: 500,  // Supabase 免费版 500 MB
          storageMB: 1024    // Supabase 免费版 1 GB
        }
      }
    };
  },

  // 获取指定日期之前的旧沟通记录（用于预览）
  async getOldCommunications(beforeDate) {
    const { data, error } = await supabase
      .from('communications')
      .select(`
        id,
        content,
        created_at,
        sender:sender_id(name, employee_id),
        communication_recipients(recipient_id),
        replies(id)
      `)
      .lt('created_at', beforeDate)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: (data || []).map(c => ({
        id: c.id,
        content: c.content,
        createdAt: c.created_at,
        senderName: c.sender?.name || c.sender?.employee_id || '',
        recipientCount: c.communication_recipients?.length || 0,
        replyCount: c.replies?.length || 0
      }))
    };
  },

  // 清理指定日期之前的旧数据
  async cleanupOldData(beforeDate) {
    // 1. 获取要删除的沟通记录 ID
    const { data: oldComms, error: fetchError } = await supabase
      .from('communications')
      .select('id, attachments')
      .lt('created_at', beforeDate);

    if (fetchError) throw fetchError;

    if (!oldComms || oldComms.length === 0) {
      return { data: { deleted: 0, message: '没有找到符合条件的记录' } };
    }

    const oldCommIds = oldComms.map(c => c.id);

    // 2. 删除相关的回复
    const { error: replyError } = await supabase
      .from('replies')
      .delete()
      .in('communication_id', oldCommIds);

    if (replyError) throw replyError;

    // 3. 删除相关的 communication_recipients
    const { error: recipError } = await supabase
      .from('communication_recipients')
      .delete()
      .in('communication_id', oldCommIds);

    if (recipError) throw recipError;

    // 4. 删除相关的通知
    const { error: notifError } = await supabase
      .from('notifications')
      .delete()
      .in('communication_id', oldCommIds);

    if (notifError) console.warn('删除通知失败:', notifError);

    // 5. 删除附件文件（从 Storage）
    for (const comm of oldComms) {
      if (comm.attachments && comm.attachments.length > 0) {
        const filePaths = comm.attachments.map(a => a.path);
        try {
          await supabase.storage.from('attachments').remove(filePaths);
        } catch (e) {
          console.warn('删除附件失败:', e);
        }
      }
    }

    // 6. 删除沟通记录
    const { error: deleteError, count } = await supabase
      .from('communications')
      .delete({ count: 'exact' })
      .lt('created_at', beforeDate);

    if (deleteError) throw deleteError;

    return {
      data: {
        deleted: count || oldCommIds.length,
        message: `成功删除 ${count || oldCommIds.length} 条沟通记录及其相关数据`
      }
    };
  },

  // 撤回消息（5分钟内可撤回）
  async recallMessage(communicationId, reason = '') {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('未登录');

    // 检查消息是否存在且是本人发送
    const { data: comm, error: checkError } = await supabase
      .from('communications')
      .select('id, sender_id, created_at, content')
      .eq('id', communicationId)
      .single();

    if (checkError) throw checkError;
    if (!comm) throw new Error('消息不存在');
    if (comm.sender_id !== userId) throw new Error('只能撤回自己发送的消息');

    // 标记为已撤回
    const { error } = await supabase
      .from('communications')
      .update({ 
        is_recalled: true,
        recall_reason: reason || null,
        recalled_at: new Date().toISOString()
      })
      .eq('id', communicationId);

    if (error) throw error;

    // 发送系统通知给发件人和所有收件人
    try {
      // 获取消息详情（用于通知内容）
      const { data: commDetail, error: detailError } = await supabase
        .from('communications')
        .select(`
          id, content, created_at, sender_id,
          sender:sender_id(name),
          communication_recipients(recipient_id)
        `)
        .eq('id', communicationId)
        .single();

      if (detailError) throw detailError;
      if (!commDetail) throw new Error('获取消息详情失败');

      const senderName = commDetail.sender?.name || '未知用户';
      const sendTime = new Date(commDetail.created_at).toLocaleString('zh-CN');
      const recallTime = new Date().toLocaleString('zh-CN');
      const contentPreview = (commDetail.content || '').substring(0, 50) + 
                           ((commDetail.content || '').length > 50 ? '...' : '');
      
      const notificationContent = `${senderName}于${recallTime}撤回了${sendTime}发送的消息，消息内容：${contentPreview}`;
      
      // 获取所有需要通知的用户ID（发件人 + 所有收件人），去重
      const recipientIds = (commDetail.communication_recipients || []).map(r => r.recipient_id);
      const notifyUserIds = [...new Set([commDetail.sender_id, ...recipientIds])];

      // 为每位用户创建一条系统通知
      for (const userId of notifyUserIds) {
        // 插入通知消息，并直接获取返回的 ID
        const { data: notif, error: insertError } = await supabase
          .from('communications')
          .insert([{
            content: notificationContent,
            sender_id: userId,
            is_system_notification: true
          }])
          .select('id')
          .single();

        if (insertError) {
          console.error('插入通知失败:', insertError);
          continue;
        }

        if (notif && notif.id) {
          // 创建接收人记录
          const { error: recError } = await supabase
            .from('communication_recipients')
            .insert([{
              communication_id: notif.id,
              recipient_id: userId
            }]);

          if (recError) {
            console.error('创建通知接收人失败:', recError);
          }
        }
      }
    } catch (notifError) {
      console.error('发送撤回通知失败:', notifError);
      // 不影响主流程，撤回本身已成功
    }

    return { data: { message: '消息已撤回' } };
  },

  // 获取已撤回的消息（发件人视角）
  async getRecalledMessages() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('未登录');

    const { data, error } = await supabase
      .from('communications')
      .select(`
        *,
        sender:sender_id(id, name, employee_id, phone, email, region, department, priority, role, department_level1),
        communication_recipients(
          recipient_id,
          is_read,
          is_flagged,
          read_at,
          is_completed,
          has_replied,
          replied_by,
          is_cc,
          recipient:recipient_id(id, name, department, department_level3, role)
        ),
        replies(
          id,
          content,
          sender_id,
          sender:sender_id(name),
          created_at
        )
      `)
      .eq('sender_id', userId)
      .eq('is_recalled', true)
      .order('recalled_at', { ascending: false });

    if (error) {
      console.error('[getRecalledMessages] 查询失败:', error);
      throw error;
    }

    console.log('[getRecalledMessages] 查到数据:', data?.length || 0, '条');

    const formatted = (data || []).map(c => ({
      id: c.id,
      senderId: c.sender_id,
      senderRole: c.sender?.department_level1 === '实验室' ? 'lab' : 'business',
      senderName: c.sender?.name || '',
      type: c.type,
      vip: c.vip,
      customerName: c.customer_name || '',
      sampleCode: c.sample_code || '',
      sampleMatrix: c.sample_matrix || '',
      sampleCount: c.sample_count || '',
      testItems: c.test_items || '',
      sampleDate: c.sample_date || '',
      requestedCycle: c.requested_cycle || '',
      chargeStatus: c.charge_status || '',
      urgentFee: c.urgent_fee || '',
      remark: c.remark || '',
      content: c.content || '',
      status: c.status || '',
      isFlagged: safeBoolean(c.is_flagged),
      isCompleted: safeBoolean(c.is_completed),
      createdAt: c.created_at,
      recipients: c.communication_recipients?.map(r => r.recipient_id) || [],
      recipientDetails: c.communication_recipients?.map(r => ({
        ...r.recipient,
        recipient_id: r.recipient_id,
        is_read: safeBoolean(r.is_read),
        read_at: r.read_at || null,
        is_flagged: safeBoolean(r.is_flagged),
        is_completed: safeBoolean(r.is_completed),
        has_replied: safeBoolean(r.has_replied),
        replied_by: r.replied_by,
        has_new_reply: safeBoolean(r.has_new_reply),
        is_cc: safeBoolean(r.is_cc)
      })) || [],
      isRecalled: safeBoolean(c.is_recalled),
      recallReason: c.recall_reason || '',
      recalledAt: c.recalled_at || null,
      departmentCardIds: c.department_card_ids || [],
      replyCount: c.replies?.length || 0,
      attachments: c.attachments || [],
      replies: c.replies?.map(r => ({
        id: r.id,
        senderId: r.sender_id,
        senderName: r.sender?.name || '',
        content: r.content,
        createdAt: r.created_at,
        targetRecipientId: r.target_recipient_id
      })) || []
    }));

    return { data: formatted };
  },

  // 转发消息
  async forwardMessage(originalCommId, { recipientIds, departmentCardIds, note, senderRole }) {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('未登录')

    // 获取原消息
    const { data: original, error: origError } = await supabase
      .from('communications')
      .select('*')
      .eq('id', originalCommId)
      .single()
    if (origError) throw origError

    // 创建新消息（不复制原消息内容，转发的附言作为消息内容）
    const newComm = {
      sender_id: userId,
      type: original.type,
      content: note || '',  // 转发附言作为消息内容
      forwarded_from: originalCommId,
      forward_note: note || '',
      department_card_ids: departmentCardIds || []
    }

    const { data: comm, error: commError } = await supabase
      .from('communications')
      .insert(newComm)
      .select()
      .single()
    if (commError) throw commError

    // 创建接收人（recipientIds 已包含个人收件人 + 部门持有人ID）
    const recipientRows = (recipientIds || []).map(rid => ({
      communication_id: comm.id,
      recipient_id: rid
    }))
    if (recipientRows.length > 0) {
      const { error: recError } = await supabase
        .from('communication_recipients')
        .insert(recipientRows)
      if (recError) throw recError
    }

    // 为所有接收人创建通知
    if (recipientIds && recipientIds.length > 0) {
      await Promise.all(recipientIds.map(recipientId =>
        supabase.from('notifications').insert({
          user_id: recipientId,
          communication_id: comm.id,
          type: 'new_message',
          content: `有新的沟通请求：${getTypeLabel(original.type)}`
        })
      ))
    }

    return { data: comm }
  },

  // 编辑消息（2分钟内可编辑）
  async editMessage(communicationId, newContent) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('未登录');

    // 检查消息是否存在且是本人发送
    const { data: comm, error: checkError } = await supabase
      .from('communications')
      .select('id, sender_id, created_at')
      .eq('id', communicationId)
      .single();

    if (checkError) throw checkError;
    if (!comm) throw new Error('消息不存在');
    if (comm.sender_id !== userId) throw new Error('只能编辑自己发送的消息');

    // 检查是否超过2分钟
    const createdAt = new Date(comm.created_at);
    const now = new Date();
    const diffMinutes = (now - createdAt) / (1000 * 60);
    if (diffMinutes > 2) throw new Error('超过2分钟，无法编辑');

    // 更新内容
    const { error } = await supabase
      .from('communications')
      .update({ 
        content: newContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', communicationId);

    if (error) throw error;
    return { data: { message: '消息已更新' } };
  },

  // 追加对所有人发送消息（重置所有收件人状态）
  async appendResend(communicationId, userContent = '') {
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

    // 构建追加消息内容：用户输入 + 系统通知
    const userNote = userContent ? `\n\n【追加消息】\n${userContent}` : '';
    const systemNote = `\n\n—— 发起人对所有人追加发送消息 ——\n此消息为沟通发起人对历史消息的追加回复，所有收件人的回复状态已重置为"待处理"，请重新回复确认。`;

    // 创建新沟通记录（追加转发类型）：content 只存用户输入的追加消息
    const { data: newComm, error: createError } = await supabase
      .from('communications')
      .insert({
        sender_id: userId,
        type: original.type,
        content: userContent || '(无消息内容)',
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
        forwarded_from: communicationId,
        forward_note: userContent || ''
      })
      .select()
      .single();
    if (createError) throw createError;

    // 区分普通收件人和抄送人
    const originalRecipients = original.communication_recipients || [];
    const recipientIds = originalRecipients
      .filter(r => !r.is_cc)
      .map(r => r.recipient_id);
    const ccRecipientIds = originalRecipients
      .filter(r => r.is_cc)
      .map(r => r.recipient_id);

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

    // 创建抄送人记录
    if (ccRecipientIds.length > 0) {
      const ccRecipients = ccRecipientIds.map(rid => ({
        communication_id: newComm.id,
        recipient_id: rid,
        is_cc: true,
        has_replied: false,
        is_completed: false,
        is_read: false,
        has_new_reply: false
      }));
      const { error: recError } = await supabase
        .from('communication_recipients')
        .insert(ccRecipients);
      if (recError) throw recError;
    }

    // 创建通知（包含普通收件人和抄送人）
    const allNotifIds = [...recipientIds, ...ccRecipientIds];
    if (allNotifIds.length > 0) {
      const notifications = allNotifIds.map(rid => ({
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
  },

  // ==================== 抄送人功能（预设管理） ====================
  // 获取当前用户的抄送人预设
  async getCCPresets() {
    const userId = await getCurrentUserId();
    if (!userId) return { data: { ccUserIds: [], ccDeptCardIds: [] } };
    const { data, error } = await supabase
      .from('user_cc_favorites')
      .select('cc_user_id')
      .eq('user_id', userId);
    if (error) throw error;
    return {
      data: {
        ccUserIds: (data || []).map(r => r.cc_user_id),
        ccDeptCardIds: []
      }
    };
  },

  // 保存抄送人预设（一次性替换整个列表，最多5个）
  async saveCCPresets(ccUserIds, ccDeptCardIds) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('未登录');
    const total = (ccUserIds?.length || 0) + (ccDeptCardIds?.length || 0);
    if (total > 5) throw new Error('最多预设5个抄送人');
    // 先删除该用户的所有预设，再批量插入
    const { error: delErr } = await supabase
      .from('user_cc_favorites')
      .delete()
      .eq('user_id', userId);
    if (delErr) throw delErr;
    if (ccUserIds?.length) {
      const records = ccUserIds.map(id => ({ user_id: userId, cc_user_id: id }));
      const { error: insErr } = await supabase
        .from('user_cc_favorites')
        .insert(records);
      if (insErr) throw insErr;
    }
    return { data: { message: '预设已保存' } };
  }
}

// 把 replies 按 target_recipient_id 分组，用于 Thread 视图
communicationAPI.buildThreads = function(comm) {
  const recipients = comm.recipientDetails || []
  const replies = (comm.replies || []).sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  )
  const allReplies = replies.filter(r => !r.targetRecipientId)
  const threadMap = {}
  replies.forEach(r => {
    const targetId = r.targetRecipientId
    if (targetId) {
      if (!threadMap[targetId]) threadMap[targetId] = []
      threadMap[targetId].push(r)
    }
  })
  const threads = Object.entries(threadMap).map(([recipientId, threadReplies]) => {
    const recipient = recipients.find(r => r.recipient_id === recipientId)
    return {
      recipient: recipient || { name: '未知', recipient_id: recipientId },
      replies: threadReplies
    }
  })
  return { all: allReplies, threads }
}

// ==========================================
// 通知公告相关（拉取模式，不再推通知）
// ==========================================
export const announcementAPI = {
  // 创建公告（管理员）—— 只写入 announcements 表，不再推通知
  async create({ title, content, attachments, target_role }) {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('未登录')

    const { data, error } = await supabase
      .from('announcements')
      .insert([{
        title,
        content,
        target_role: target_role || 'all',
        sender_id: userId,
        attachments: attachments || []
      }])
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  // 获取所有公告 + 当前用户的已读状态
  async list(page = 1, pageSize = 50) {
    const userId = await getCurrentUserId()
    if (!userId) return { data: [] }

    const from = (page - 1) * pageSize
    const to = page * pageSize - 1

    // 查所有公告（不使用 sender join，因为 FK 可能不存在）
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('id, title, content, created_at, sender_id, target_role, target_regions, attachments, status, recalled_at, republished_at')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    // 批量获取发布人姓名
    const senderIds = [...new Set((announcements || []).map(a => a.sender_id).filter(Boolean))]
    let senderMap = {}
    if (senderIds.length > 0) {
      try {
        const { data: senders } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', senderIds)
        ;(senders || []).forEach(s => { senderMap[s.id] = s.name })
      } catch (e) {
        console.warn('获取发布人信息失败:', e.message)
      }
    }

    // 查当前用户的已读记录（如果 announcement_reads 表不存在则忽略）
    let reads = []
    try {
      const { data: readData } = await supabase
        .from('announcement_reads')
        .select('announcement_id, read_at, is_flagged')
        .eq('user_id', userId)
      reads = readData || []
    } catch (e) {
      console.warn('读取公告已读状态失败，可能表不存在:', e.message)
    }

    const readMap = {}
    reads.forEach(r => { readMap[r.announcement_id] = { readAt: r.read_at, isFlagged: safeBoolean(r.is_flagged) } })

    return {
      data: (announcements || []).map(a => {
        const myRead = readMap[a.id]
        return {
          id: a.id,
          title: a.title,
          content: a.content,
          targetRole: a.target_role,
          targetRegions: a.target_regions,
          senderName: senderMap[a.sender_id] || '',
          createdAt: a.created_at,
          attachments: a.attachments || [],
          status: a.status || 'active',
          recalledAt: a.recalled_at || null,
          republishedAt: a.republished_at || null,
          isRead: !!myRead,
          readAt: myRead?.readAt || null,
          isFlagged: myRead?.isFlagged || false
        }
      })
    }
  },

  // 获取未读公告数量（按角色 & 已读状态过滤）
  async getUnreadCount() {
    const userId = await getCurrentUserId()
    if (!userId) return { data: { count: 0 } }

    try {
      // 获取当前用户的角色分类
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, department_level1, department_level3')
        .eq('id', userId)
        .single()
      const userRole = profile ? getRoleCategory(profile.role, profile.department_level1) : 'lab'
      const isBusiness = profile?.department_level1 === '业务'
      const isQingdao = profile?.department_level3 === '青岛'

      // 查公告（含 target_role，过滤出对当前用户可见的）
      const { data: allAnn, error: annError } = await supabase
        .from('announcements')
        .select('id, target_role')
      if (annError) throw annError

      // 过滤：只保留对当前角色可见的公告
      const visible = (allAnn || []).filter(a => {
        if (a.target_role === 'all') return true
        if (a.target_role === userRole) return true
        if (a.target_role === 'qingdao_business') return isBusiness && isQingdao
        if (a.target_role === 'non_qingdao_business') return isBusiness && !isQingdao
        return false
      })

      // 查已读的公告ID
      let readIds = new Set()
      try {
        const { data: reads } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', userId)
        readIds = new Set((reads || []).map(r => r.announcement_id))
      } catch (e) {
        console.warn('读取已读记录失败，所有公告算未读:', e.message)
      }

      const count = visible.filter(a => !readIds.has(a.id)).length
      return { data: { count } }
    } catch (error) {
      console.error('获取未读公告数失败:', error)
      return { data: { count: 0 } }
    }
  },

  // 标记单条公告已读
  async markAsRead(announcementId) {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('未登录')

    // 用 upsert 避免重复插入
    const { data, error } = await supabase
      .from('announcement_reads')
      .upsert({
        announcement_id: announcementId,
        user_id: userId,
        read_at: new Date().toISOString()
      }, { onConflict: 'announcement_id,user_id' })
      .select()
      .single()

    if (error) {
      // 如果唯一约束冲突，说明已经读过，忽略错误
      if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
        throw error
      }
    }
    return { data }
  },

  // 全部标记已读
  async markAllAsRead() {
    const userId = await getCurrentUserId()
    if (!userId) return

    // 获取所有未读公告ID
    const { data: allAnn } = await supabase
      .from('announcements')
      .select('id')

    const { data: reads } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', userId)

    const readIds = new Set((reads || []).map(r => r.announcement_id))
    const unreadAnnIds = (allAnn || []).filter(a => !readIds.has(a.id)).map(a => a.id)

    if (unreadAnnIds.length > 0) {
      const records = unreadAnnIds.map(aid => ({
        announcement_id: aid,
        user_id: userId,
        read_at: new Date().toISOString()
      }))
      const { error } = await supabase.from('announcement_reads').insert(records)
      if (error) throw error
    }
  },

  // 管理员修改公告
  async update(id, { title, content, attachments }) {
    const { data, error } = await supabase
      .from('announcements')
      .update({
        title,
        content,
        attachments: attachments || []
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  // 管理员删除公告
  async delete(id) {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { data: { message: '删除成功' } }
  },

  // 管理员撤回公告
  async recall(id) {
    const { data, error } = await supabase
      .from('announcements')
      .update({ status: 'recalled', recalled_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { data }
  },

  // 管理员修改已撤回公告并重发
  async republish(id, { title, content, attachments }) {
    const { data, error } = await supabase
      .from('announcements')
      .update({
        title,
        content,
        attachments: attachments || [],
        status: 'active',
        republished_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { data }
  },

  // ========== 公告红旗标记（简单update模式） ==========

  // 切换红旗标记（使用 upsert，确保没有记录时也能插入）
  async toggleAnnouncementFlag(announcementId, isFlagged) {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('未登录')

    const { error } = await supabase
      .from('announcement_reads')
      .upsert({
        announcement_id: announcementId,
        user_id: userId,
        is_flagged: isFlagged,
        read_at: new Date().toISOString()
      }, { onConflict: 'announcement_id,user_id' })

    if (error) throw error
    return { flagged: isFlagged }
  }
}

// ==========================================
// 通知相关
// ==========================================
export const notificationAPI = {
  async getAll() {
    const userId = await getCurrentUserId()
    if (!userId) return { data: [] }

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        communication:communication_id(*),
        announcement:announcement_id(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data }
  },

  async getUnreadCount() {
    const userId = await getCurrentUserId()
    if (!userId) return { data: { count: 0 } }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return { data: { count } }
  },

  async markAsRead(id) {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('未登录')

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
    return { data }
  },

  async markAllAsRead() {
    const userId = await getCurrentUserId()
    if (!userId) return { data: { message: '未登录' } }

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return { data }
  },

  // 管理员删除通知
  async delete(id) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { data: { message: '删除成功' } }
  },

  // 管理员删除公告
  async deleteAnnouncement(id) {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { data: { message: '删除成功' } }
  }
}

// ==========================================
// 附件上传（Supabase Storage）
// ==========================================
export const storageAPI = {
  // 上传图片到 attachments 桶，返回公开 URL
  async upload(file, folder = 'communications') {
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(fileName, file, { upsert: false })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(fileName)
    return { path: fileName, url: publicUrl, name: file.name }
  },

  // 删除附件
  async remove(path) {
    const { error } = await supabase.storage
      .from('attachments')
      .remove([path])
    if (error) throw error
  }
}

// ==========================================
// 点赞/点踩相关
// ==========================================
export const reactionAPI = {
  // 对回复或公告点赞/点踩（toggle 逻辑：再点一次取消）
  async toggle(targetType, targetId, reactionType) {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('未登录')

    // 先查是否已存在
    const { data: existing } = await supabase
      .from('reactions')
      .select('id, reaction_type')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .single()

    if (existing) {
      if (existing.reaction_type === reactionType) {
        // 同类型再点一次 → 取消
        await supabase.from('reactions').delete().eq('id', existing.id)
        return { data: { action: 'removed' } }
      } else {
        // 不同类型 → 更新（如已点踩，再点赞则改为赞）
        await supabase.from('reactions')
          .update({ reaction_type: reactionType })
          .eq('id', existing.id)
        return { data: { action: 'updated', reaction_type: reactionType } }
      }
    } else {
      // 新增
      await supabase.from('reactions').insert({
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
        reaction_type: reactionType
      })
      return { data: { action: 'added', reaction_type: reactionType } }
    }
  },

  // 获取某个目标的点赞/点踩统计
  async getStats(targetType, targetId) {
    const { data, error } = await supabase
      .from('reactions')
      .select('reaction_type, user_id, created_at')
      .eq('target_type', targetType)
      .eq('target_id', targetId)

    if (error) throw error

    const likes = data.filter(r => r.reaction_type === 'like')
    const dislikes = data.filter(r => r.reaction_type === 'dislike')
    return {
      data: {
        likeCount: likes.length,
        dislikeCount: dislikes.length,
        reactions: data
      }
    }
  },

  // 批量获取多个目标的点赞统计（用于列表）
  async getStatsBatch(targetType, targetIds) {
    if (!targetIds || targetIds.length === 0) return { data: {} }
    const { data, error } = await supabase
      .from('reactions')
      .select('target_id, reaction_type, user_id, created_at')
      .eq('target_type', targetType)
      .in('target_id', targetIds)

    if (error) throw error

    const statsMap = {}
    for (const tid of targetIds) {
      const items = data.filter(r => r.target_id === tid)
      statsMap[tid] = {
        likeCount: items.filter(r => r.reaction_type === 'like').length,
        dislikeCount: items.filter(r => r.reaction_type === 'dislike').length,
        reactions: items
      }
    }
    return { data: statsMap }
  },

  // 管理员查看某个目标的所有点赞/点踩详情
  async getDetail(targetType, targetId) {
    const { data, error } = await supabase
      .from('reactions')
      .select('*, user:user_id(name, employee_id, role)')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data }
  }
}

// ==========================================
// 实时订阅
// ==========================================
export function subscribeToTable(table, callback) {
  const channel = supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        callback(payload)
      }
    )
    .subscribe()

  return channel
}

// ==========================================
// 辅助函数
// ==========================================
function getTypeLabel(type) {
  const typeLabels = {
    paid_urgent: '付费加急',
    free_urgent: '免费加急',
    data_dispute: '数据质疑',
    follow_up: '跟单',
    consultation: '咨询',
    other: '其他',
    unqualified: '不合格沟通',
    data_confirm: '数据确认'
  }
  return typeLabels[type] || type
}

function formatProfile(p) {
  if (!p) return null
  return {
    id: p.id,
    username: p.username,
    name: p.name,
    role: p.role,
    employeeId: p.employee_id,
    phone: p.phone,
    email: p.email,
    region: p.region,
    department: p.department,
    // 新字段：三级部门
    departmentLevel1: p.department_level1 || '',
    departmentLevel2: p.department_level2 || '',
    departmentLevel3: p.department_level3 || '',
    priority: p.priority === 1 ? 'leader' : 'member',
    isDisabled: p.is_disabled === true,
    last_active_at: p.last_active_at || null,
    last_sign_in_at: p.last_sign_in_at || null,
    createdAt: p.created_at
  }
}

// ==========================================
// 角色系统（三级架构：部门 → 属地/检测组 → 角色）
// ==========================================

export const ROLE_OPTIONS = [
  // 业务端
  { value: 'business', label: '业务', dept: 'business' },
  { value: 'business_assistant', label: '业务助理', dept: 'business' },
  // 实验室端
  { value: 'supervisor', label: '实验室主管', dept: 'lab' },
  { value: 'supervisor_assistant', label: '实验室主管助理', dept: 'lab' },
  { value: 'customer_service', label: '客服', dept: 'lab' },
  { value: 'cs_leader', label: '客服组长', dept: 'lab' },
  { value: 'cs_leader_assistant', label: '客服组长助理', dept: 'lab' },
  { value: 'inspection_leader', label: '检测组长', dept: 'lab' },
  { value: 'inspection_leader_assistant', label: '检测组长助理', dept: 'lab' },
  { value: 'inspection_engineer', label: '检测工程师', dept: 'lab' },
  { value: 'sample_prep_leader', label: '制样组组长', dept: 'lab' },
  { value: 'report_leader', label: '报告组组长', dept: 'lab' },
  { value: 'report_leader_assistant', label: '报告组长助理', dept: 'lab' },
  { value: 'data_review', label: '数据二审', dept: 'lab' },
  { value: 'report_compiler', label: '报告编制', dept: 'lab' },
  { value: 'tech_support', label: '技术支持', dept: 'lab' },
  // 管理员
  { value: 'admin', label: '管理员', dept: 'admin' }
]

export function getRoleDisplayName(role) {
  const opt = ROLE_OPTIONS.find(r => r.value === role)
  return opt?.label || role
}

// 角色 → 导航分类映射
// department_level1 为可选参数，传入时优先使用（比 role 更准确）
export function getRoleCategory(role, departmentLevel1) {
  // 有一级部门时直接使用（最准确）
  if (departmentLevel1 === '实验室') return 'lab'
  if (departmentLevel1 === '业务') return 'business'
  // 降级：通过 role 判断
  let opt = ROLE_OPTIONS.find(r => r.value === role)
  // 如果没找到，尝试按 label（中文）查找（兼容遗留数据）
  if (!opt) {
    opt = ROLE_OPTIONS.find(r => r.label === role)
  }
  if (!opt) return 'lab'
  if (opt.dept === 'admin') return 'admin'
  if (opt.dept === 'lab') return 'lab'
  return 'business'
}

// 获取实验室端所有角色
export const LAB_ROLES = ROLE_OPTIONS.filter(r => r.dept === 'lab').map(r => r.value)

// 获取业务端所有角色
export const BIZ_ROLES = ROLE_OPTIONS.filter(r => r.dept === 'business').map(r => r.value)

// 获取所有非管理员角色（发起沟通时可选）
export const ALL_COMM_ROLES = ROLE_OPTIONS.filter(r => r.value !== 'admin').map(r => r.value)

// ==========================================
// 角色名片背景色映射
// ==========================================

// 角色 → 名片背景色（用于通讯录头像/卡片背景）
export function getRoleCardColor(role) {
  const colors = {
    // 业务端：金色系
    business: { bg: '#FFD700', text: '#333' },              // 金色
    business_assistant: { bg: '#FFF8DC', text: '#333' },    // 浅金黄色
    // 实验室主管：棕色系
    supervisor: { bg: '#8B4513', text: '#fff' },            // 棕色
    supervisor_assistant: { bg: '#D2B48C', text: '#333' },  // 浅棕色
    // 组长：蓝色系
    cs_leader: { bg: '#409EFF', text: '#fff' },             // 蓝色
    inspection_leader: { bg: '#409EFF', text: '#fff' },     // 蓝色
    sample_prep_leader: { bg: '#409EFF', text: '#fff' },    // 蓝色
    report_leader: { bg: '#409EFF', text: '#fff' },         // 蓝色
    // 组长助理：浅蓝色系
    cs_leader_assistant: { bg: '#87CEEB', text: '#333' },   // 浅蓝色
    inspection_leader_assistant: { bg: '#87CEEB', text: '#333' }, // 浅蓝色
    report_leader_assistant: { bg: '#DAA520', text: '#fff' }, // 黄褐色（报告组长助理）
    // 浅绿色系
    inspection_engineer: { bg: '#90EE90', text: '#333' },   // 浅绿色
    data_review: { bg: '#90EE90', text: '#333' },           // 浅绿色
    report_compiler: { bg: '#90EE90', text: '#333' },       // 浅绿色
    tech_support: { bg: '#90EE90', text: '#333' },          // 浅绿色
    // 其他
    customer_service: { bg: '#E6E6FA', text: '#333' },      // 客服：淡紫色
    admin: { bg: '#DC143C', text: '#fff' }                  // 管理员：红色
  }
  return colors[role] || { bg: '#f0f0f0', text: '#333' }
}

// 角色 → CSS 类名（用于标签/徽章）
export function getRoleTagClass(role) {
  const tagClasses = {
    business: 'tag-gold',
    business_assistant: 'tag-light-gold',
    supervisor: 'tag-brown',
    supervisor_assistant: 'tag-light-brown',
    cs_leader: 'tag-blue',
    inspection_leader: 'tag-blue',
    sample_prep_leader: 'tag-blue',
    report_leader: 'tag-blue',
    cs_leader_assistant: 'tag-light-blue',
    inspection_leader_assistant: 'tag-light-blue',
    report_leader_assistant: 'tag-amber',
    inspection_engineer: 'tag-light-green',
    data_review: 'tag-light-green',
    report_compiler: 'tag-light-green',
    tech_support: 'tag-light-green',
    customer_service: 'tag-purple',
    admin: 'tag-red'
  }
  return tagClasses[role] || 'tag-gray'
}

// ==========================================
// 管理员操作日志
// ==========================================
// 把 PostgREST / Postgres 错误码翻译成人话，便于管理员自查（表级权限、RLS、缺表、登录态等）
//
// ⚠️ 维护铁律：任何时候都必须把 Supabase 返回的原始 error.message / error.code / error.hint
//    原样带给用户，绝不能只显示自己编的推测文案。
//    历史教训：本函数曾把所有 42501 一律翻译成"RLS 策略拒绝：role 可能不是 admin"，
//    而真实原因是【表级 GRANT 缺失】，两者修复方式完全不同。
//    这句写死的文案把排查方向带偏了整整 10 轮。
//
// 42501 有两种截然不同的形态，必须分开判：
//   permission denied for table/sequence xxx        → 表级 GRANT 缺失，要 GRANT
//   new row violates row-level security policy      → RLS 策略拒绝，要改 POLICY
export function describeAdminLogError(error) {
  const code = error?.code || '';
  const message = error?.message || '';
  const hint = error?.hint || '';

  // 1) 表级/序列级权限缺失：字面就是 permission denied for table|sequence
  //    必须排在 RLS 判定之前，否则会被 42501 一把抓走，导致给出错误的修复建议。
  if (/permission denied for (table|sequence|relation|schema)/i.test(message)) {
    const target = /sequence/i.test(message) ? '序列' : '表';
    // PostgREST 通常会在 hint 里直接给出可执行的 GRANT 语句，原样透出，价值极高
    const hintText = hint ? `。Supabase 给出的修复提示：${hint}` : '';
    // ⚠️ 会话过期也会走到这里：cachedUserId 是模块级缓存，只靠 onAuthStateChange 清除。
    //    若会话静默失效而事件没触发（后台页久挂、refresh token 静默失败、
    //    另一标签页清了 localStorage），请求角色会退化为 anon，
    //    而 anon 无表级权限，报的同样是 permission denied for table。
    //    不提示这一句的话，客户会以为"补了 GRANT 还是不行"，又绕回原地。
    return `${target}级权限缺失（不是 RLS 问题，改策略无效）：`
      + `需在 Supabase SQL Editor 执行 supabase_admin_logs.sql 补 GRANT，`
      + `核心是 GRANT SELECT, INSERT ON public.admin_logs TO authenticated`
      + `以及 GRANT USAGE, SELECT ON SEQUENCE public.admin_logs_id_seq TO authenticated${hintText}`
      + `。若此前该功能正常，请先确认登录是否已过期，重新登录后再试`;
  }

  // 2) 真正的 RLS 策略拒绝：报文里明确出现 row-level security
  if (/row-level security|violates row-level/i.test(message)) {
    return 'RLS 策略拒绝（表级权限正常，是行级策略把这行挡了）：'
      + '请检查 admin_logs 的 INSERT 策略 WITH CHECK 条件，确认 admin_id 等于当前登录用户 auth.uid()';
  }
  // 3) 其余 42501：不猜原因，原样透出 Supabase 的说法，避免又编一句错的把人带偏
  if (code === '42501') {
    return `权限被拒绝（42501），Supabase 原文：${message || '无附加说明'}`
      + (hint ? `；提示：${hint}` : '');
  }

  // 4) 缓存里找不到这张表（PGRST205）——必须排在"列缺失"之前判，
  //    否则会被下面那条 /schema cache/ 正则抢走，误报成"列缺失"。
  //    注意区分：PGRST205 是【表】不在缓存，PGRST204 才是【列】对不上。
  if (code === 'PGRST205' || /could not find the table .+ in the schema cache/i.test(message)) {
    return 'PostgREST 缓存里找不到 admin_logs 表：请在 SQL Editor 执行 '
      + "NOTIFY pgrst, 'reload schema'; 刷新缓存"
      + '（新版 Dashboard 已无 Reload schema 按钮，这句 SQL 即等价操作）';
  }

  // 5) 列缺失：必须先于"表不存在"判，否则 42703 的文案
  //    （column "x" of relation "admin_logs" does not exist）会被下面的正则抢先命中
  if (code === 'PGRST204' || code === '42703' || /could not find the .+ column|^column .+ does not exist/i.test(message)) {
    return `表结构与写入字段不匹配（列缺失）：请执行 supabase_admin_logs.sql 补列。原文：${message}`;
  }

  // 6) 表不存在：正则用 ^ 锚定，确保只匹配 relation 开头的文案，不误吞 column 开头的列缺失文案
  if (code === '42P01' || /^relation .*does not exist/i.test(message)) {
    return 'admin_logs 表不存在：请先在 Supabase 执行 supabase_admin_logs.sql';
  }

  if (code === 'PGRST301' || code === '401' || /jwt|not authenticated/i.test(message)) {
    return '登录态无效或已过期，请重新登录';
  }
  if (code === 'NO_AUTH_USER') {
    return '未获取到当前登录用户，请重新登录后重试';
  }
  if (/failed to fetch|network/i.test(message)) {
    return '网络异常，未能连接 Supabase';
  }

  // 7) 兜底：不再返回"数据库返回错误"这种等于没说的话，原样透出 Supabase 的信息
  return message
    ? `数据库返回错误，Supabase 原文：${message}${hint ? `；提示：${hint}` : ''}`
    : '数据库返回未知错误（无 message）';
}

export const adminLogAPI = {
  // 记录操作
  async log(action, targetUserId = null, targetUserName = '', detail = '') {
    // 统一的失败提示：console 保留完整对象便于排查，UI 显式弹出错误码 + 原因，杜绝静默失败
    const notifyFailure = (stage, error) => {
      const code = error?.code ? `[${error.code}] ` : '';
      const msg = error?.message || '未知错误';
      // 原始 hint 常常直接给出可执行的修复语句（例如 PostgREST 的 GRANT 建议），必须透出
      const hint = error?.hint ? `｜Supabase 提示：${error.hint}` : '';
      const text = `操作日志写入失败（${stage}）：${code}${msg}${hint}（${describeAdminLogError(error)}）`;
      console.error('[adminLog] 记录操作日志失败:', { action, stage, code: error?.code, message: error?.message, hint: error?.hint, error });
      ElMessage.error({ message: text, duration: 8000, showClose: true });
    };

    // 1) 登录态检查：拿不到管理员 ID 时同样要给出 UI 反馈，而不是静默 return
    let userId = null;
    try {
      userId = await getCurrentUserId();
    } catch (authError) {
      notifyFailure('获取登录态', authError);
      return;
    }
    if (!userId) {
      console.warn('[adminLog] 未获取到当前管理员ID，跳过操作日志写入');
      notifyFailure('获取登录态', { code: 'NO_AUTH_USER', message: '未获取到当前管理员ID' });
      return;
    }

    // 2) 查询管理员姓名：失败不阻断日志写入，仅降级为空名
    let adminName = '';
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();
      if (profileError) {
        console.warn('[adminLog] 读取管理员姓名失败（不阻断日志写入）:', profileError.message);
      }
      adminName = profile?.name || '';
    } catch (profileException) {
      console.warn('[adminLog] 读取管理员姓名异常（不阻断日志写入）:', profileException?.message || profileException);
    }

    const base = {
      admin_id: userId,
      admin_name: adminName,
      action,
      detail
    };
    // 列缺失判定：错误码优先 + 正则兜底，覆盖新旧两种文案
    // 注意：这里刻意【排除】PGRST205（表不在缓存）与 42501（权限不足），
    // 这两种情况降级重写也一样会失败，重试只会多刷一条无意义的报错。
    const isColumnMissing = (e) => {
      const m = e?.message || '';
      if (e?.code === 'PGRST205' || e?.code === '42501') return false;
      if (/permission denied/i.test(m)) return false;
      if (/could not find the table .+ in the schema cache/i.test(m)) return false;
      return e?.code === 'PGRST204' || e?.code === '42703' ||
        /column .+ does not exist|could not find the .+ column/i.test(m);
    };

    try {
      // 先尝试完整写入（适配 target_user_id / target_user_name 版表结构）
      let { error } = await supabase.from('admin_logs').insert({
        ...base,
        target_user_id: targetUserId,
        target_user_name: targetUserName
      });
      // 若因列不存在(表是 target_type/target_id 旧版)而 400，降级为只写核心列，target 信息并入 detail
      if (error && isColumnMissing(error)) {
        console.warn('[adminLog] 完整写入失败(列不匹配)，降级写入核心字段:', error.message);
        const mergedDetail = [detail, targetUserName ? `目标用户: ${targetUserName}` : ''].filter(Boolean).join('；');
        ({ error } = await supabase.from('admin_logs').insert({ ...base, detail: mergedDetail }));
        if (error) {
          notifyFailure('降级写入核心字段后仍失败', error);
          return;
        }
      } else if (error) {
        notifyFailure('写入 admin_logs', error);
        return;
      }
    } catch (insertException) {
      notifyFailure('写入请求异常', insertException);
    }
  },

  // 查询操作日志（管理员用）
  // 用 select('*') 而不是显式列清单：admin_logs 历史上存在两版结构
  // （target_user_id/target_user_name 版 与 target_type/target_id 版），
  // 写死列名会在结构不匹配时直接 42703 报错。'*' 对两版结构都能读，
  // 与 Admin.vue 里 loadAdminLogs 的查询方式保持一致。
  async getAll(limit = 200) {
    const { data, error } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { data: data || [] };
  }
};

// ==========================================
// 数据备份
// ==========================================
export const backupAPI = {
  // 备份所有数据（管理员用）
  async backupAll() {
    const tables = ['profiles', 'communications', 'communication_recipients', 'replies', 'announcements', 'announcement_reads', 'admin_logs', 'message_reads'];
    const result = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*');
        
        if (error) {
          console.warn(`备份表 ${table} 失败:`, error.message);
          result[table] = { error: error.message };
        } else {
          result[table] = data || [];
        }
      } catch (e) {
        console.warn(`备份表 ${table} 异常:`, e.message);
        result[table] = { error: e.message };
      }
    }
    
    return { data: result };
  }
};

// ==========================================
// 消息已读回执
// ==========================================
export const messageReadsAPI = {
  // 标记消息已读
  async markAsRead(communicationId) {
    const userId = await getCurrentUserId();
    if (!userId) return { data: { message: '未登录' } };
    
    const { error } = await supabase
      .from('message_reads')
      .upsert({
        communication_id: communicationId,
        user_id: userId,
        read_at: new Date().toISOString()
      }, { onConflict: 'communication_id, user_id' });
    
    if (error) {
      console.error('标记已读失败:', error);
      return { data: { message: '标记失败' } };
    }
    return { data: { message: '已标记已读' } };
  },
  
  // 获取消息的已读回执（管理员用）
  async getReads(communicationId) {
    const { data, error } = await supabase
      .from('message_reads')
      .select(`
        user_id,
        read_at,
        profile:user_id(name, employee_id)
      `)
      .eq('communication_id', communicationId)
      .order('read_at', { ascending: true });
    
    if (error) throw error;
    return { data: data || [] };
  }
};;

// ==========================================
// 部门名片相关 API
// ==========================================
export const departmentCardAPI = {
  // 获取所有部门名片列表（前端计算，不依赖后端函数）
  async getDepartmentCards() {
    // 查出所有部门名片负责人（组长 + 组长助理）
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, role, department_level1, department_level2, department_level3')
      .eq('department_level1', '实验室')
      .in('role', ['检测组长', '检测组长助理', '组长', '组长助理', 'inspection_leader', 'inspection_leader_assistant'])
      .not('department_level3', 'is', null)
      .order('department_level2', { ascending: true })
      .order('department_level3', { ascending: true })

    if (error) throw error

    // 前端按 department_level3 分组，配成部门名片
    const cardMap = {}
    ;(data || []).forEach(u => {
      const key = u.department_level3
      if (!cardMap[key]) {
        cardMap[key] = {
          departmentLevel3: u.department_level3,
          departmentLevel2: u.department_level2,
          leader: null,
          assistants: [],
          holders: []
        }
      }
      if (u.role === '组长' || u.role === '检测组长' || u.role === 'inspection_leader') {
        cardMap[key].leader = { id: u.id, name: u.name, role: u.role }
        cardMap[key].holders.push({ id: u.id, name: u.name, role: u.role })
      } else {
        cardMap[key].assistants.push({ id: u.id, name: u.name, role: u.role })
        cardMap[key].holders.push({ id: u.id, name: u.name, role: u.role })
      }
    })

    // 只返回同时有 leader 的部门名片
    return {
      data: Object.values(cardMap).filter(c => c.leader !== null)
    }
  },

  // 发送消息时校验部门名片负责人是否都在职
  async validateCardHolders(departmentLevel3) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, is_disabled')
      .eq('department_level3', departmentLevel3)
      .in('role', ['检测组长', '检测组长助理', '组长', '组长助理', 'inspection_leader', 'inspection_leader_assistant'])

    if (error) throw error
    const active = (data || []).filter(u => !u.is_disabled)
    return {
      data: {
        valid: active.length > 0,
        holders: active,
        message: active.length === 0 ? '该部门暂无负责人' : ''
      }
    }
  },

  // 根据部门名片选中的 key（departmentLevel3），获取所有持有人ID
  getHolderIds(cardKey, allCards) {
    const card = allCards.find(c => c.departmentLevel3 === cardKey)
    return card ? card.holders.map(h => h.id) : []
  },

  // 根据持有人 ID 列表，反向查找对应的部门名片 key（departmentLevel3）
  // 用于撤回编辑重发时，将 DB 中存储的 holder UUID 转回卡片 key
  getCardKeysByHolderIds(holderIds, allCards) {
    const cardKeys = new Set()
    holderIds.forEach(id => {
      const card = allCards.find(c => c.holders.some(h => h.id === id))
      if (card) {
        cardKeys.add(card.departmentLevel3)
      }
    })
    return Array.from(cardKeys)
  }
}

// ==========================================
// 三级部门架构 API（管理员用）
// ==========================================
export const departmentAPI = {
  // 更新用户三级部门信息
  async updateProfile(userId, updates) {
    const { error } = await supabase
      .from('profiles')
      .update({
        department_level1: updates.departmentLevel1 || null,
        department_level2: updates.departmentLevel2 || null,
        department_level3: updates.departmentLevel3 || null,
      })
      .eq('id', userId)

    if (error) throw error
    return { data: { message: '已更新' } }
  },

  // 获取三级部门架构统计
  async getStats() {
    const { data, error } = await supabase
      .from('profiles')
      .select('department_level1, department_level2, department_level3, role, is_disabled')
      .not('department_level1', 'is', null)

    if (error) throw error
  }
}

// ==========================================
// 消息模板 API
// ==========================================
export const templateAPI = {
  async getMyTemplates() {
    const userId = await getCurrentUserId()
    if (!userId) return { data: [] }
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('user_id', userId)
      .order('usage_count', { ascending: false })
    if (error) throw error
    return { data: data || [] }
  },

  async create({ name, title, content, type, vip, customerName, sampleCode, sampleMatrix, sampleCount, testItems, sampleDate, requestedCycle, chargeStatus, urgentFee, remark }) {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('未登录')
    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        user_id: userId,
        name, title, content,
        type: type || '',
        vip: vip || '',
        customer_name: customerName || '',
        sample_code: sampleCode || '',
        sample_matrix: sampleMatrix || '',
        sample_count: sampleCount || '',
        test_items: testItems || '',
        sample_date: sampleDate || '',
        requested_cycle: requestedCycle || '',
        charge_status: chargeStatus || '',
        urgent_fee: urgentFee || '',
        remark: remark || ''
      })
      .select()
      .single()
    if (error) throw error
    return { data }
  },

  async update(id, updates) {
    const dbUpdates = { ...updates, updated_at: new Date().toISOString() }
    // 转换前端字段名到数据库字段名
    const fieldMap = {
      customerName: 'customer_name',
      sampleCode: 'sample_code',
      sampleMatrix: 'sample_matrix',
      sampleCount: 'sample_count',
      testItems: 'test_items',
      sampleDate: 'sample_date',
      requestedCycle: 'requested_cycle',
      chargeStatus: 'charge_status',
      urgentFee: 'urgent_fee'
    }
    for (const [frontKey, dbKey] of Object.entries(fieldMap)) {
      if (frontKey in dbUpdates) {
        dbUpdates[dbKey] = dbUpdates[frontKey]
        delete dbUpdates[frontKey]
      }
    }
    const { data, error } = await supabase
      .from('message_templates')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { data }
  },

  async incrementUsage(id) {
    const { data, error } = await supabase
      .rpc('increment_template_usage', { template_id: id })
    if (error) {
      // fallback: 直接 update
      const { data: tpl } = await supabase
        .from('message_templates')
        .select('usage_count')
        .eq('id', id)
        .single()
      if (tpl) {
        await supabase
          .from('message_templates')
          .update({ usage_count: (tpl.usage_count || 0) + 1, updated_at: new Date().toISOString() })
          .eq('id', id)
      }
    }
    return { data }
  },

  async remove(id) {
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

// ==========================================
// 标签 API
// ==========================================
export const tagAPI = {
  // 获取可用的标签列表
  async getAvailableTags() {
    const { data, error } = await supabase
      .from('message_tags')
      .select('tag_name')
      .order('tag_name')
    if (error) throw error
    // 去重
    const tags = [...new Set((data || []).map(t => t.tag_name))].sort()
    return { data: tags }
  },

  // 获取某条消息的标签
  async getByCommunication(communicationId) {
    const { data, error } = await supabase
      .from('message_tags')
      .select('id, tag_name')
      .eq('communication_id', communicationId)
    if (error) throw error
    return { data: data || [] }
  },

  // 设置消息标签（先删后插）
  async setTags(communicationId, tagNames) {
    // 先删旧的
    const { error: delError } = await supabase
      .from('message_tags')
      .delete()
      .eq('communication_id', communicationId)
    if (delError) throw delError

    if (!tagNames || tagNames.length === 0) return { data: [] }

    // 插入新标签
    const rows = tagNames.map(name => ({
      communication_id: communicationId,
      tag_name: name
    }))
    const { data, error } = await supabase
      .from('message_tags')
      .insert(rows)
      .select()
    if (error) throw error
    return { data }
  }
}

// ==========================================
// 统计看板 API
// ==========================================
export const statisticsAPI = {
  async getDashboardData(startDate, endDate) {
    // 1. 获取时间范围内的所有沟通记录
    const { data: communications, error: commError } = await supabase
      .from('communications')
      .select('id, type, vip, sender_id, created_at, is_completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })

    if (commError) throw commError

    if (!communications || communications.length === 0) {
      return {
        communications: [],
        replies: [],
        profiles: [],
        recipients: []
      }
    }

    const commIds = communications.map(c => c.id)

    // 2. 获取这些沟通的所有回复
    const { data: replies, error: replyError } = await supabase
      .from('replies')
      .select('id, communication_id, sender_id, content, created_at')
      .in('communication_id', commIds)
      .order('created_at', { ascending: true })

    if (replyError) throw replyError

    // 3. 获取这些沟通的所有接收人
    const { data: recipients, error: recipError } = await supabase
      .from('communication_recipients')
      .select('id, communication_id, recipient_id, has_replied')
      .in('communication_id', commIds)

    if (recipError) throw recipError

    // 4. 获取所有用户档案
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, name, role, department_level1, department_level2, department_level3')
      .not('name', 'eq', '已删除用户')

    if (profError) throw profError

    return {
      communications,
      replies: replies || [],
      profiles,
      recipients: recipients || []
    }
  }
}

// ==========================================
// 已读回执 API
// ==========================================
export const readReceiptAPI = {
  async markAsRead(communicationId) {
    const userId = await getCurrentUserId()
    if (!userId) return
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('communication_recipients')
      .update({ is_read: true, read_at: now })
      .eq('communication_id', communicationId)
      .eq('recipient_id', userId)
      .is('read_at', null)
    if (error) console.warn('markAsRead error:', error)
  }
}

// ==========================================
// 快捷回复 API
// ==========================================
export const quickReplyAPI = {
  async getMyQuickReplies() {
    const userId = await getCurrentUserId()
    if (!userId) return { data: [] }
    const { data, error } = await supabase
      .from('user_quick_replies')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return { data: data || [] }
  },
  async create(content) {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('未登录')
    const { data, error } = await supabase
      .from('user_quick_replies')
      .insert({ user_id: userId, content })
      .select()
      .single()
    if (error) throw error
    return { data }
  },
  async update(id, content, sortOrder) {
    const updates = { updated_at: new Date().toISOString() }
    if (content !== undefined) updates.content = content
    if (sortOrder !== undefined) updates.sort_order = sortOrder
    const { data, error } = await supabase
      .from('user_quick_replies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { data }
  },
  async remove(id) {
    const { error } = await supabase
      .from('user_quick_replies')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  }
}
