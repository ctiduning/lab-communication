import { supabase } from '../utils/supabase'

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
    const { username, password, name, role, employeeId, phone, email, region, department, priority, mustChangePwd } = userData

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
      // 所有匹配的都是已删除用户 -> 先清理旧记录（释放 auth.users 邮箱 + 删除 profiles）
      // 这样新注册时 admin_create_user 插入 auth.users 就不会冲突
      for (const deletedUser of existingProfiles) {
        try {
          await supabase.rpc('delete_user_and_release_email', { target_user_id: deletedUser.id })
        } catch (e) {
          // 函数不存在则忽略
        }
        await supabase.from('profiles').delete().eq('id', deletedUser.id)
      }
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
      .select('is_disabled, must_change_password')
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
      .select('*')
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
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
      .select('*')

    if (error) throw error
    return { data: data.map(formatProfile) }
  },

  async getByRole(role) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)

    if (error) throw error
    return { data: data.map(formatProfile) }
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
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

  // 管理员删除用户账号（调用数据库函数，同时释放 auth.users 的邮箱）
  async deleteAccount(id) {
    // 调用数据库函数：更新 auth.users.email + 更新 profiles 为已删除
    const { error } = await supabase
      .rpc('delete_user_and_release_email', { target_user_id: id })

    if (error) {
      // 如果函数不存在，降级为只更新 profiles（需要用户手动运行 SQL）
      if (error.message.includes('does not exist') || error.message.includes('Could not find')) {
        console.warn('delete_user_and_release_email 函数不存在，请先在 Supabase SQL 编辑器中运行 supabase_fix_delete_user.sql')
        // 降级方案：只更新 profiles
        const releasedEmail = `deleted_${id}@deleted.local`
        const releasedUsername = `deleted_${id.substring(0, 8)}`
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: '已删除用户',
            username: releasedUsername,
            email: releasedEmail,
            phone: '',
            region: '',
            department: '',
            is_disabled: true,
            must_change_password: false
          })
          .eq('id', id)
        if (profileError) throw new Error('删除用户失败：' + profileError.message)
        throw new Error('删除成功，但 auth.users 邮箱未释放（函数不存在）。请先运行 supabase_fix_delete_user.sql')
      }
      throw new Error('删除用户失败：' + error.message)
    }

    return { data: { message: '用户已删除，邮箱已释放，可重新注册' } }
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: { message: '未登录' } };
    
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({ last_active_at: now })
      .eq('id', user.id);
    
    if (error) {
      // 如果字段不存在，忽略错误
      if (error.message.includes('does not exist') || error.code === '42703') {
        console.warn('last_active_at 字段不存在，请先运行 supabase_add_last_active.sql');
        return { data: { message: '字段不存在' } };
      }
      throw error;
    }
    return { data: { message: '已更新活跃时间' } }
  }
}

// ==========================================
// 沟通记录相关
// ==========================================
export const communicationAPI = {
  async getAll() {
    const { data: communications, error } = await supabase
      .from('communications')
      .select(`
        *,
        sender:sender_id(id, name, employee_id, phone, email, region, department, priority),
        communication_recipients(
          recipient_id,
          is_read,
          is_flagged,
          is_completed,
          has_replied,
          recipient:recipient_id(id, name, department)
        ),
        replies(
          id,
          content,
          sender_id,
          sender:sender_id(name),
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    const formatted = communications.map(c => ({
      id: c.id,
      senderId: c.sender_id,
      senderRole: c.sender?.role || '',
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
      isFlagged: c.is_flagged || false,
      isCompleted: c.is_completed || false,
      createdAt: c.created_at,
      recipients: c.communication_recipients?.map(r => r.recipient_id) || [],
      recipientDetails: c.communication_recipients?.map(r => ({
        ...r.recipient,
        recipient_id: r.recipient_id,
        is_read: r.is_read,
        is_flagged: r.is_flagged,
        is_completed: r.is_completed,
        has_replied: r.has_replied
      })) || [],
      isCompleted: c.is_completed || false,  // 沟通记录是否已完结（全局）
      isRecalled: c.is_recalled || false,
      recallReason: c.recall_reason || '',
      recalledAt: c.recalled_at || null,
      replyCount: c.replies?.length || 0,
      attachments: c.attachments || [],
      replies: c.replies?.map(r => ({
        id: r.id,
        senderId: r.sender_id,
        senderName: r.sender?.name || '',
        content: r.content,
        createdAt: r.created_at
      })) || []
    }))

    return { data: formatted }
  },

  async create(data) {
    const {
      type, vip, customerName, sampleCode, sampleMatrix,
      sampleCount, testItems, sampleDate, requestedCycle,
      chargeStatus, urgentFee, remark, content, recipients, attachments
    } = data

    // 获取当前登录用户ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    const { data: communication, error } = await supabase
      .from('communications')
      .insert({
        sender_id: user.id,
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
        attachments: attachments || []
      })
      .select()
      .single()

    if (error) throw error

    if (recipients && recipients.length > 0) {
      const recipientRecords = recipients.map(recipientId => ({
        communication_id: communication.id,
        recipient_id: recipientId
      }))

      const { error: recipientError } = await supabase
        .from('communication_recipients')
        .insert(recipientRecords)

      if (recipientError) throw recipientError
    }

    if (recipients && recipients.length > 0) {
      const notifications = recipients.map(recipientId => ({
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

  async createReply(communicationId, { content }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    const { data: reply, error } = await supabase
      .from('replies')
      .insert({
        communication_id: communicationId,
        sender_id: user.id,
        content
      })
      .select('*, sender:sender_id(name)')
      .single()

    if (error) throw error

    // 更新 communication_recipients 表的 has_replied 字段
    await supabase
      .from('communication_recipients')
      .update({ has_replied: true })
      .eq('communication_id', communicationId)
      .eq('recipient_id', user.id)

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
          is_completed,
          recipient:recipient_id(id, name, department, region)
        ),
        replies(
          id,
          content,
          sender_id,
          sender:sender_id(name),
          created_at
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
        isFlagged: communication.is_flagged || false,
        isCompleted: communication.is_completed || false,
        createdAt: communication.created_at,
        recipientDetails: communication.communication_recipients?.map(r => ({
          ...r.recipient,
          recipient_id: r.recipient_id,
          is_read: r.is_read,
          is_flagged: r.is_flagged,
          is_completed: r.is_completed,
          has_replied: r.has_replied
        })) || [],
        isCompleted: communication.is_completed || false,  // 沟通记录是否已完结（全局）
        replies: communication.replies?.map(r => ({
          id: r.id,
          senderId: r.sender_id,
          senderName: r.sender?.name || '',
          content: r.content,
          createdAt: r.created_at
        })) || []
      }
    }
  },

  async getReplies(communicationId) {
    const { data, error } = await supabase
      .from('replies')
      .select('*, sender:sender_id(name)')
      .eq('communication_id', communicationId)
      .order('created_at', { ascending: true })

    if (error) throw error

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    const { error } = await supabase
      .from('communication_recipients')
      .update({ is_read: true })
      .eq('communication_id', communicationId)
      .eq('recipient_id', user.id)

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

  // 切换完结状态（基于 communications 表，全局完结，任意一人标记完结所有人都能看到）
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: { count: 0 } }

    // 先拿当前用户作为收件人的所有沟通ID
    const { data: commIds, error: idError } = await supabase
      .from('communication_recipients')
      .select('communication_id')
      .eq('recipient_id', user.id)

    if (idError) {
      console.error('getPendingCount 获取沟通ID失败:', idError)
      return { data: { count: 0 } }
    }

    if (!commIds || commIds.length === 0) {
      return { data: { count: 0 } }
    }

    const ids = [...new Set(commIds.map(r => r.communication_id))]

    // 查这些沟通的详情（含 recipients 子表）
    const { data: communications, error } = await supabase
      .from('communications')
      .select(`
        id,
        is_completed,
        is_recalled,
        is_system_notification,
        communication_recipients(
          recipient_id,
          is_completed,
          has_replied
        )
      `)
      .in('id', ids)

    if (error) {
      console.error('getPendingCount 查询沟通失败:', error)
      return { data: { count: 0 } }
    }

    const userId = user.id
    const count = (communications || []).filter(c => {
      const myRec = c.communication_recipients?.find(r => r.recipient_id === userId)
      if (!myRec) return false
      // 未回复 && 我个人未完结 && 沟通本身未完结 && 未撤回 && 非系统通知
      return !myRec.has_replied
        && !myRec.is_completed
        && !c.is_completed
        && !c.is_recalled
        && !c.is_system_notification
    }).length

    return { data: { count } }
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
          is_flagged
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未登录');

    // 检查消息是否存在且是本人发送
    const { data: comm, error: checkError } = await supabase
      .from('communications')
      .select('id, sender_id, created_at, content')
      .eq('id', communicationId)
      .single();

    if (checkError) throw checkError;
    if (!comm) throw new Error('消息不存在');
    if (comm.sender_id !== user.id) throw new Error('只能撤回自己发送的消息');

    // 检查是否超过5分钟
    const createdAt = new Date(comm.created_at);
    const now = new Date();
    const diffMinutes = (now - createdAt) / (1000 * 60);
    if (diffMinutes > 5) throw new Error('超过5分钟，无法撤回');

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
          sender:profiles!communications_sender_id_fkey(name),
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
            sender_id: user.id,
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未登录');

    const { data, error } = await supabase
      .from('communications')
      .select(`
        *,
        sender:sender_id(id, name, employee_id, phone, email, region, department, priority),
        communication_recipients(
          recipient_id,
          is_read,
          is_flagged,
          is_completed,
          has_replied,
          recipient:recipient_id(id, name, department)
        ),
        replies(
          id,
          content,
          sender_id,
          sender:sender_id(name),
          created_at
        )
      `)
      .eq('sender_id', user.id)
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
      senderRole: c.sender?.role || '',
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
      isFlagged: c.is_flagged || false,
      isCompleted: c.is_completed || false,
      createdAt: c.created_at,
      recipients: c.communication_recipients?.map(r => r.recipient_id) || [],
      recipientDetails: c.communication_recipients?.map(r => ({
        ...r.recipient,
        recipient_id: r.recipient_id,
        is_read: r.is_read,
        is_flagged: r.is_flagged,
        is_completed: r.is_completed,
        has_replied: r.has_replied
      })) || [],
      isRecalled: c.is_recalled || false,
      recallReason: c.recall_reason || '',
      recalledAt: c.recalled_at || null,
      replyCount: c.replies?.length || 0,
      attachments: c.attachments || [],
      replies: c.replies?.map(r => ({
        id: r.id,
        senderId: r.sender_id,
        senderName: r.sender?.name || '',
        content: r.content,
        createdAt: r.created_at
      })) || []
    }));

    return { data: formatted };
  },

  // 编辑消息（2分钟内可编辑）
  async editMessage(communicationId, newContent) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未登录');

    // 检查消息是否存在且是本人发送
    const { data: comm, error: checkError } = await supabase
      .from('communications')
      .select('id, sender_id, created_at')
      .eq('id', communicationId)
      .single();

    if (checkError) throw checkError;
    if (!comm) throw new Error('消息不存在');
    if (comm.sender_id !== user.id) throw new Error('只能编辑自己发送的消息');

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
  }
}

// ==========================================
// 通知公告相关（拉取模式，不再推通知）
// ==========================================
export const announcementAPI = {
  // 创建公告（管理员）—— 只写入 announcements 表，不再推通知
  async create({ title, content, attachments }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    const { data, error } = await supabase
      .from('announcements')
      .insert([{
        title,
        content,
        target_role: 'all',
        target_regions: null,
        sender_id: user.id,
        attachments: attachments || []
      }])
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  // 获取所有公告 + 当前用户的已读状态
  async list() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [] }

    // 查所有公告（不使用 sender join，因为 FK 可能不存在）
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

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
        .select('announcement_id, read_at')
        .eq('user_id', user.id)
      reads = readData || []
    } catch (e) {
      console.warn('读取公告已读状态失败，可能表不存在:', e.message)
    }

    const readMap = {}
    reads.forEach(r => { readMap[r.announcement_id] = r.read_at })

    return {
      data: (announcements || []).map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        targetRole: a.target_role,
        targetRegions: a.target_regions,
        senderName: senderMap[a.sender_id] || '',
        createdAt: a.created_at,
        attachments: a.attachments || [],
        isRead: !!readMap[a.id],       // 当前用户是否已读
        readAt: readMap[a.id] || null   // 已读时间
      }))
    }
  },

  // 获取未读公告数量
  async getUnreadCount() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: { count: 0 } }

    try {
      // 查所有公告ID
      const { data: allAnn, error: annError } = await supabase
        .from('announcements')
        .select('id')
      if (annError) throw annError

      // 查已读的公告ID（表可能不存在，优雅降级）
      let readIds = new Set()
      try {
        const { data: reads } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id)
        readIds = new Set((reads || []).map(r => r.announcement_id))
      } catch (e) {
        // announcement_reads 表不存在时，所有公告都算未读
        console.warn('读取已读记录失败，所有公告算未读:', e.message)
      }

      const count = (allAnn || []).filter(a => !readIds.has(a.id)).length
      return { data: { count } }
    } catch (error) {
      console.error('获取未读公告数失败:', error)
      return { data: { count: 0 } }
    }
  },

  // 标记单条公告已读
  async markAsRead(announcementId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    // 用 upsert 避免重复插入
    const { data, error } = await supabase
      .from('announcement_reads')
      .upsert({
        announcement_id: announcementId,
        user_id: user.id,
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 获取所有未读公告ID
    const { data: allAnn } = await supabase
      .from('announcements')
      .select('id')

    const { data: reads } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', user.id)

    const readIds = new Set((reads || []).map(r => r.announcement_id))
    const unreadAnnIds = (allAnn || []).filter(a => !readIds.has(a.id)).map(a => a.id)

    if (unreadAnnIds.length > 0) {
      const records = unreadAnnIds.map(aid => ({
        announcement_id: aid,
        user_id: user.id,
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
  }
}

// ==========================================
// 通知相关
// ==========================================
export const notificationAPI = {
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [] }

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        communication:communication_id(*),
        announcement:announcement_id(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data }
  },

  async getUnreadCount() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: { count: 0 } }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) throw error
    return { data: { count } }
  },

  async markAsRead(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return { data }
  },

  async markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: { message: '未登录' } }

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    // 先查是否已存在
    const { data: existing } = await supabase
      .from('reactions')
      .select('id, reaction_type')
      .eq('user_id', user.id)
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
        user_id: user.id,
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
export function getRoleCategory(role) {
  const opt = ROLE_OPTIONS.find(r => r.value === role)
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
export const adminLogAPI = {
  // 记录操作
  async log(action, targetUserId = null, targetUserName = '', detail = '') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        admin_name: (await supabase.from('profiles').select('name').eq('id', user.id).single())?.data?.name || '',
        action,
        target_user_id: targetUserId,
        target_user_name: targetUserName,
        detail
      });
    if (error) console.error('记录操作日志失败:', error);
  },

  // 查询操作日志（管理员用）
  async getAll(limit = 200) {
    const { data, error } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { data };
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: { message: '未登录' } };
    
    const { error } = await supabase
      .from('message_reads')
      .upsert({
        communication_id: communicationId,
        user_id: user.id,
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
      .select('id, name, role, department_level1, department_level2, department_level3, is_disabled')
      .eq('department_level1', '实验室')
      .in('role', [
        'inspection_leader', 'inspection_leader_assistant',
        'cs_leader', 'cs_leader_assistant',
        'sample_prep_leader', 'report_leader'
      ])
      .eq('is_disabled', false)
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
          assistant: null,
          holders: []
        }
      }
      if (u.role.endsWith('_leader') || u.role === 'sample_prep_leader' || u.role === 'report_leader') {
        cardMap[key].leader = { id: u.id, name: u.name, role: u.role }
        cardMap[key].holders.push({ id: u.id, name: u.name, role: u.role })
      } else {
        cardMap[key].assistant = { id: u.id, name: u.name, role: u.role }
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
      .in('role', [
        'inspection_leader', 'inspection_leader_assistant',
        'cs_leader', 'cs_leader_assistant',
        'sample_prep_leader', 'report_leader'
      ])

    if (error) throw error
    const active = (data || []).filter(u => !u.is_disabled)
    return {
      data: {
        valid: active.length > 0,
        holders: active,
        message: active.length === 0 ? '该部门暂无负责人' : ''
      }
    }
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
    return { data: data || [] }
  }
}
