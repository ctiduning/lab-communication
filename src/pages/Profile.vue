<template>
  <div class="profile-page">
    <div class="page-header">
      <h2>个人设置</h2>
      <p class="page-desc">修改个人资料和密码</p>
    </div>

    <el-row :gutter="24">
      <!-- 基本信息 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span style="font-weight:600;">基本信息</span>
          </template>
          <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
            <!-- 姓名 -->
            <el-form-item label="姓名">
              <el-input v-model="form.name" disabled></el-input>
            </el-form-item>
            <!-- 工号 -->
            <el-form-item label="工号">
              <el-input v-model="form.employee_id" disabled></el-input>
            </el-form-item>
            <!-- 一级部门 -->
            <el-form-item label="一级部门" prop="departmentLevel1">
              <el-select v-model="form.departmentLevel1" placeholder="请选择一级部门" style="width: 100%;" @change="onLevel1Change">
                <el-option label="业务" value="业务" />
                <el-option label="实验室" value="实验室" />
              </el-select>
            </el-form-item>
            <!-- 二级部门 -->
            <el-form-item label="二级部门" prop="departmentLevel2">
              <el-select v-model="form.departmentLevel2" placeholder="请选择二级部门" style="width: 100%;" :disabled="!form.departmentLevel1">
                <el-option v-for="opt in level2Options" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
            <!-- 三级部门 -->
            <el-form-item label="三级部门" prop="departmentLevel3">
              <el-input v-if="isLevel3Manual" v-model="form.departmentLevel3" placeholder="请填写属地，如：青岛、上海"></el-input>
              <el-select v-else v-model="form.departmentLevel3" placeholder="请选择三级部门" style="width: 100%;" :disabled="!form.departmentLevel1">
                <el-option v-for="opt in level3Options" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
            <!-- 角色 -->
            <el-form-item label="角色" prop="role">
              <el-select v-model="form.role" placeholder="请选择角色" style="width: 100%;" :disabled="!form.departmentLevel1">
                <el-option v-for="opt in roleOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
            <!-- 电话 -->
            <el-form-item label="电话" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入电话号码"></el-input>
            </el-form-item>
            <!-- 邮箱 -->
            <el-form-item label="邮箱">
              <el-input v-model="form.email" disabled></el-input>
            </el-form-item>
            <!-- 创建时间 -->
            <el-form-item label="创建时间">
              <el-input v-model="form.created_at" disabled></el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSave" :loading="saving">保存修改</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 修改密码 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span style="font-weight:600;">修改密码</span>
          </template>
          <el-form :model="pwdForm" :rules="pwdRules" ref="pwdFormRef" label-width="100px">
            <el-form-item label="当前密码" prop="currentPassword">
              <el-input v-model="pwdForm.currentPassword" type="password" show-password placeholder="请输入当前密码"></el-input>
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="请输入新密码（不少于6位）"></el-input>
            </el-form-item>
            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input v-model="pwdForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码"></el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleChangePassword" :loading="changingPwd">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { userAPI } from '../api'
import { supabase } from '../utils/supabase'
import { getLevel2Options, getLevel3Options, getRoleOptions, isLevel3ManualInput } from '../utils/departmentConfig'

const formRef = ref(null)
const pwdFormRef = ref(null)
const saving = ref(false)
const changingPwd = ref(false)

const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))

// 从 localStorage 或 Supabase 获取当前用户ID
const getCurrentUserId = async () => {
  const cached = localStorage.getItem('user')
  if (cached) {
    const u = JSON.parse(cached)
    if (u.id) return u.id
  }
  const { data: { user: authUser } } = await supabase.auth.getUser()
  return authUser?.id || null
}

const form = reactive({
  id: '',
  name: '',
  email: '',
  employee_id: '',
  phone: '',
  departmentLevel1: '',
  departmentLevel2: '',
  departmentLevel3: '',
  role: '',
  created_at: ''
})

// 联动计算属性
const level2Options = computed(() => getLevel2Options(form.departmentLevel1))
const level3Options = computed(() => getLevel3Options(form.departmentLevel1))
const roleOptions = computed(() => getRoleOptions(form.departmentLevel1))
const isLevel3Manual = computed(() => isLevel3ManualInput(form.departmentLevel1))

// 一级部门变化时清空下游
const onLevel1Change = () => {
  form.departmentLevel2 = ''
  form.departmentLevel3 = ''
  form.role = ''
}

const pwdForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const rules = {
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }],
  departmentLevel1: [{ required: true, message: '请选择一级部门', trigger: 'change' }],
  departmentLevel2: [{ required: true, message: '请选择二级部门', trigger: 'change' }],
  departmentLevel3: [{ required: true, message: '请填写三级部门', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const pwdRules = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: (rule, value, callback) => {
      if (value !== pwdForm.newPassword) callback(new Error('两次密码不一致'))
      else callback()
    }, trigger: 'blur' }]
}

const loadProfile = async () => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      console.error('无法获取当前用户ID')
      return
    }
    const cached = localStorage.getItem('user')
    if (cached) user.value = JSON.parse(cached)

    const { data } = await userAPI.getById(userId)
    if (data) {
      Object.assign(form, {
        id: data.id,
        name: data.name || '',
        email: data.email || '',
        employee_id: data.employeeId || '',
        phone: data.phone || '',
        departmentLevel1: data.departmentLevel1 || '',
        departmentLevel2: data.departmentLevel2 || '',
        departmentLevel3: data.departmentLevel3 || '',
        role: data.role || '',
        created_at: data.createdAt ? new Date(data.createdAt).toLocaleString('zh-CN') : ''
      })
    }
  } catch (error) {
    console.error('加载个人信息失败:', error)
  }
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      await userAPI.update(form.id, {
        phone: form.phone,
        departmentLevel1: form.departmentLevel1,
        departmentLevel2: form.departmentLevel2,
        departmentLevel3: form.departmentLevel3,
        role: form.role
      })
      ElMessage.success('保存成功')
      // 更新 localStorage
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      Object.assign(u, {
        phone: form.phone,
        departmentLevel1: form.departmentLevel1,
        departmentLevel2: form.departmentLevel2,
        departmentLevel3: form.departmentLevel3,
        role: form.role
      })
      localStorage.setItem('user', JSON.stringify(u))
    } catch (error) {
      ElMessage.error(error.message || '保存失败')
    } finally {
      saving.value = false
    }
  })
}

const handleChangePassword = async () => {
  if (!pwdFormRef.value) return
  await pwdFormRef.value.validate(async (valid) => {
    if (!valid) return
    changingPwd.value = true
    try {
      const { error } = await supabase.auth.updateUser({
        password: pwdForm.newPassword
      })
      if (error) throw error
      ElMessage.success('密码修改成功，请重新登录')
      pwdForm.currentPassword = ''
      pwdForm.newPassword = ''
      pwdForm.confirmPassword = ''
    } catch (error) {
      ElMessage.error(error.message || '密码修改失败')
    } finally {
      changingPwd.value = false
    }
  })
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.profile-page {
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 24px;
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
</style>
