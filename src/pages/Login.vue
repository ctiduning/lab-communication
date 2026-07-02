<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1>青岛华测实验室沟通系统</h1>
        <p>QDCTI Laboratory Communication System</p>
      </div>
      
      <div class="login-form">
        <el-form ref="loginFormRef" :model="loginForm">
          <el-form-item prop="email">
            <el-input 
              v-model="loginForm.email" 
              placeholder="请输入邮箱" 
              :prefix-icon="User" 
              size="large"
              style="height: 48px;"
            ></el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input 
              type="password" 
              v-model="loginForm.password" 
              placeholder="请输入密码" 
              :prefix-icon="Lock" 
              show-password 
              size="large"
              @keyup.enter="handleLogin"
              style="height: 48px;"
            ></el-input>
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="rememberMe">记住我</el-checkbox>
          </el-form-item>
          <el-form-item>
            <el-button 
              type="primary" 
              @click="handleLogin" 
              class="login-button"
              size="large"
              :loading="loading"
            >登 录</el-button>
          </el-form-item>
        </el-form>
        <div class="login-tip">
          <span>首次登录请联系管理员获取初始密码</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import { authAPI } from '../api';

const router = useRouter();
const loading = ref(false);

const rememberMe = ref(false);

const loginForm = reactive({
  email: '',
  password: ''
});

// 页面加载时检查是否有保存的邮箱和密码
onMounted(() => {
  const savedEmail = localStorage.getItem('savedEmail');
  if (savedEmail) {
    loginForm.email = savedEmail;
    rememberMe.value = true;
  }
  const savedPassword = localStorage.getItem('savedPassword');
  if (savedPassword) {
    loginForm.password = savedPassword;
  }
});

const handleLogin = async () => {
  if (!loginForm.email || !loginForm.password) {
    ElMessage.error('请输入邮箱和密码');
    return;
  }
  
  loading.value = true;
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

    // 记住我逻辑：存邮箱和密码
    if (rememberMe.value) {
      localStorage.setItem('savedEmail', loginForm.email);
      localStorage.setItem('savedPassword', loginForm.password);
    } else {
      localStorage.removeItem('savedEmail');
      localStorage.removeItem('savedPassword');
    }

    ElMessage.success('登录成功');
    setTimeout(() => {
      router.push('/');
    }, 800);
  } catch (error) {
    ElMessage.error(error.message || '登录失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 440px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 48px 40px;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.login-header h1 {
  font-size: 24px;
  color: #303133;
  margin-bottom: 8px;
  font-weight: 600;
}

.login-header p {
  font-size: 13px;
  color: #909399;
  letter-spacing: 1px;
}

.login-form {
  margin-top: 20px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  height: 48px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s;
}

.login-form :deep(.el-input__wrapper:hover),
.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.2);
}

.login-button {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s;
  letter-spacing: 4px;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.login-tip {
  text-align: center;
  margin-top: 16px;
  font-size: 12px;
  color: #999;
}
</style>
