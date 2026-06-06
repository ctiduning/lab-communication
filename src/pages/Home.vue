<template>
  <div class="home">
    <el-container>
      <el-header class="header">
        <div class="header-content">
          <h1 class="logo">青岛华测实验室沟通小程序</h1>
          <div class="user-info">
            <span>欢迎, {{ user.name }}</span>
            <el-button @click="logout" type="text">退出登录</el-button>
          </div>
        </div>
      </el-header>
      
      <el-container>
        <el-aside width="200px" class="sidebar">
          <el-menu :default-active="activeMenu" mode="vertical" class="side-menu" @select="activeMenu = $event">
            <!-- 通知公告 - 所有角色都可见，放在最上面 -->
            <el-menu-item index="announcements">
              <el-icon><Bell /></el-icon>
              <span>通知公告</span>
              <span v-if="unreadAnnCount > 0" class="unread-ann-badge">{{ unreadAnnCount }}条未读</span>
            </el-menu-item>

            <!-- 业务类角色 -->
            <template v-if="roleCategory === 'business'">
              <el-menu-item index="initiate">
                <el-icon><ChatDotSquare /></el-icon>
                <span>发起沟通</span>
              </el-menu-item>
              <el-menu-item index="receive">
                <el-icon><ChatDotSquare /></el-icon>
                <span>接收消息</span>
              </el-menu-item>
              <el-menu-item index="sent">
                <el-icon><Promotion /></el-icon>
                <span>已发送消息</span>
              </el-menu-item>
              <el-menu-item index="organization">
                <el-icon><OfficeBuilding /></el-icon>
                <span>通讯录</span>
              </el-menu-item>
            </template>
            
            <!-- 实验室类角色 -->
            <template v-else-if="roleCategory === 'lab'">
              <el-menu-item index="lab-initiate">
                <el-icon><ChatDotSquare /></el-icon>
                <span>发起沟通</span>
              </el-menu-item>
              <el-menu-item index="lab-receive">
                <el-icon><ChatDotSquare /></el-icon>
                <span>接收消息</span>
              </el-menu-item>
              <el-menu-item index="sent">
                <el-icon><Promotion /></el-icon>
                <span>已发送消息</span>
              </el-menu-item>
              <el-menu-item index="organization">
                <el-icon><OfficeBuilding /></el-icon>
                <span>通讯录</span>
              </el-menu-item>
            </template>
            
            <!-- 管理员 -->
            <template v-else-if="roleCategory === 'admin'">
              <el-menu-item index="admin">
                <el-icon><Setting /></el-icon>
                <span>用户管理</span>
              </el-menu-item>
              <el-menu-item index="organization">
                <el-icon><OfficeBuilding /></el-icon>
                <span>通讯录</span>
              </el-menu-item>
            </template>
            
            <el-menu-item index="profile">
              <el-icon><User /></el-icon>
              <span>个人设置</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
        
        <el-main class="main-content">
          <component :is="currentComponent" />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, provide } from 'vue';
import { useRouter } from 'vue-router';
import { ChatDotSquare, Bell, Setting, User, OfficeBuilding, Promotion } from '@element-plus/icons-vue';
import { supabase } from '../utils/supabase';

const router = useRouter();
import { authAPI, announcementAPI, getRoleCategory } from '../api';
import BusinessInitiate from './BusinessInitiate.vue';
import BusinessReceive from './BusinessReceive.vue';
import LabInitiate from './LabInitiate.vue';
import LabReceive from './LabReceive.vue';
import Admin from './Admin.vue';
import Profile from './Profile.vue';
import Announcements from './Announcements.vue';
import Communications from './Communications.vue';
import Organization from './Organization.vue';
import SentMessages from './SentMessages.vue';

const user = ref({
  name: '',
  role: ''
});

const activeMenu = ref('initiate');
const unreadAnnCount = ref(0);
let announcementChannel = null;

// 角色分类
const roleCategory = computed(() => getRoleCategory(user.value.role));

const currentComponent = computed(() => {
  // 通知公告 - 所有角色通用
  if (activeMenu.value === 'announcements') return Announcements;
  // 个人设置 - 所有角色通用
  if (activeMenu.value === 'profile') return Profile;

  const cat = roleCategory.value;

  if (cat === 'business') {
    if (activeMenu.value === 'initiate') return BusinessInitiate;
    if (activeMenu.value === 'receive') return BusinessReceive;
    if (activeMenu.value === 'sent') return SentMessages;
  }

  if (cat === 'lab') {
    if (activeMenu.value === 'lab-initiate') return LabInitiate;
    if (activeMenu.value === 'lab-receive') return LabReceive;
    if (activeMenu.value === 'sent') return SentMessages;
  }

  if (cat === 'admin') {
    if (activeMenu.value === 'admin') return Admin;
  }

  // 通讯录 - 所有角色通用
  if (activeMenu.value === 'organization') return Organization;

  return BusinessInitiate;
});

const logout = async () => {
  try {
    await authAPI.logout();
  } catch (e) {
    // 忽略登出错误
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // 清除 Supabase 本地存储
  localStorage.removeItem('sb-qgoqhjwekairknkuqisi-auth-token');
  router.push('/login');
};

const preselectRecipients = ref([]);
provide('preselectRecipients', preselectRecipients);

const loadUser = async () => {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    router.push('/login');
    return;
  }

  const meta = authUser.user_metadata || {};

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (profile) {
    user.value = {
      id: profile.id,
      name: profile.name || '',
      role: profile.role || 'business',
      username: profile.username || '',
      employeeId: profile.employee_id || '',
      phone: profile.phone || '',
      email: profile.email || authUser.email,
      region: profile.region || '',
      department: profile.department || '',
      priority: profile.priority === 1 ? 'leader' : 'member'
    };
  } else {
    user.value = {
      id: authUser.id,
      name: meta.name || '',
      role: meta.role || 'business',
      username: meta.username || '',
      employeeId: meta.employee_id || '',
      phone: meta.phone || '',
      email: authUser.email,
      region: meta.region || '',
      department: meta.department || '',
      priority: meta.priority === 1 ? 'leader' : 'member'
    };
  }

  const cat = getRoleCategory(user.value.role);
  // 检查是否有预选中用户（从通讯录页面跳转过来）
  const preselect = sessionStorage.getItem('preselectRecipients');
  if (preselect) {
    try {
      preselectRecipients.value = JSON.parse(preselect);
      sessionStorage.removeItem('preselectRecipients');
      // 自动切换到发起沟通页面
      if (cat === 'lab') {
        activeMenu.value = 'lab-initiate';
      } else {
        activeMenu.value = 'initiate';
      }
      return;
    } catch (e) {
      console.error('解析预选中用户失败:', e);
    }
  }
  if (cat === 'lab') {
    activeMenu.value = 'lab-initiate';
  } else if (cat === 'admin') {
    activeMenu.value = 'admin';
  } else {
    activeMenu.value = 'initiate';
  }
};

// 加载未读公告数量
const loadUnreadCount = async () => {
  try {
    const { data } = await announcementAPI.getUnreadCount();
    unreadAnnCount.value = data.count;
  } catch (error) {
    console.error('加载未读公告数失败:', error);
  }
};

// 实时订阅新公告（新增时刷新未读数）
const subscribeAnnouncements = () => {
  announcementChannel = supabase
    .channel('announcements-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'announcements' },
      () => {
        loadUnreadCount();
      }
    )
    .subscribe();
};

onMounted(async () => {
  await loadUser();
  loadUnreadCount();
  subscribeAnnouncements();

  // 监听 auth 状态变化，防止串号
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      router.push('/login');
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      loadUser();
    }
  });
});

onUnmounted(() => {
  if (announcementChannel) {
    supabase.removeChannel(announcementChannel);
  }
});
</script>

<style scoped>
.home {
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

.logo {
  font-size: 18px;
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info span {
  font-size: 14px;
}

.sidebar {
  background: #f5f5f5;
}

.side-menu {
  height: 100%;
  border-right: none;
}

.main-content {
  padding: 20px;
}

.unread-ann-badge {
  font-size: 11px;
  color: #f56c6c;
  background: #fef0f0;
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: 6px;
  white-space: nowrap;
}
</style>
