<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="system-title">青岛华测实验室沟通系统</h1>

      <div class="form-wrap">
        <el-form ref="loginFormRef" :model="loginForm">
          <el-form-item prop="email">
            <el-input v-model="loginForm.email" placeholder="邮箱" :prefix-icon="User" size="large"></el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input type="password" v-model="loginForm.password" placeholder="密码" :prefix-icon="Lock" show-password size="large" @keyup.enter="handleLogin"></el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleLogin" class="login-btn" size="large">登 录</el-button>
          </el-form-item>
        </el-form>
        <div class="login-tip">
          <span>首次登录初始密码请联系管理员</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import { authAPI } from '../api';

const router = useRouter();

const loginForm = reactive({
  email: '',
  password: ''
});

const loginFormRef = ref(null);

const handleLogin = async () => {
  if (!loginForm.email || !loginForm.password) {
    ElMessage.error('请输入邮箱和密码');
    return;
  }
  
  try {
  const result = await authAPI.login(loginForm);

    // 检查账号是否被禁用
    if (result.data?.user?.isDisabled) {
      await authAPI.logout();
      ElMessage.error('该账号已被禁用，请联系管理员');
      return;
    }

    // 检查是否需要强制修改密码
    if (result.data?.user?.mustChangePassword) {
      ElMessage.warning('首次登录，请先修改密码');
    }

    ElMessage.success('登录成功');
    setTimeout(() => {
      router.push('/');
    }, 800);
  } catch (error) {
    ElMessage.error(error.message || '登录失败');
  }
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 420px;
}

.system-title {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 22px;
  font-weight: 600;
}

.form-wrap {
  padding: 10px 0;
}

.login-btn {
  width: 100%;
  margin-top: 8px;
}

.login-tip {
  text-align: center;
  margin-top: 16px;
  font-size: 12px;
  color: #999;
}
</style>
