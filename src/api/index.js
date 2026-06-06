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
      replyCount: c.replies?.length || 0,
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

  // 获取待处理消息数量
  async getPendingCount() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: { count: 0 } }

    const { data: communications, error } = await supabase
      .from('communications')
      .select(`
        is_completed,
        communication_recipients(
          recipient_id,
          is_completed,
          has_replied
        )
      `)
      .eq('isDeleted', false)

    if (error) throw error

    const userId = user.id
    const count = (communications || []).filter(c => {
      const myRec = c.communication_recipients?.find(r => r.recipient_id === userId)
      if (!myRec) return false
      return !myRec.has_replied && !myRec.is_completed && !c.is_completed
    }).length

    return { data: { count } }
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
    priority: p.priority === 1 ? 'leader' : 'member',
    isDisabled: p.is_disabled === true,
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
