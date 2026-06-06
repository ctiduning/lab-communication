<template>
  <div class="home">
    <el-container>
      <el-header class="header">
        <div class="header-content">
          <h1 class="logo">青岛华测实验室沟通小程序</h1>
          <div class="user-info">
            <span>欢迎, {{ user.name }}</span>
            <!-- 角色切换器（仅管理员可见） -->
            <el-dropdown v-if="isAdmin" @command="switchRole" class="role-switcher">
              <el-button size="small" style="background: transparent; border: 1px solid rgba(255,255,255,0.5); color: #fff;">
                {{ viewRoleLabel }}<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="admin">👑 管理员视图</el-dropdown-item>
                  <el-dropdown-item command="business">💼 业务端视图</el-dropdown-item>
                  <el-dropdown-item command="lab">🔬 实验室视图</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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
                <span v-if="pendingMsgCount > 0" class="pending-msg-badge">{{ pendingMsgCount }}条待处理</span>
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
                <span v-if="pendingMsgCount > 0" class="pending-msg-badge">{{ pendingMsgCount }}条待处理</span>
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
import { ChatDotSquare, Bell, Setting, User, OfficeBuilding, Promotion, ArrowDown } from '@element-plus/icons-vue';
import { supabase } from '../utils/supabase';

const router = useRouter();
import { authAPI, announcementAPI, communicationAPI, getRoleCategory } from '../api';
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
const viewRole = ref('admin'); // 当前视图角色
const unreadAnnCount = ref(0);
const pendingMsgCount = ref(0);
let announcementChannel = null;
let messageChannel = null;

// 实际用户角色
const realRoleCategory = computed(() => getRoleCategory(user.value.role));
// 视图角色（用于菜单渲染）
const roleCategory = computed(() => viewRole.value);
// 是否是管理员（使用真实角色判断）
const isAdmin = computed(() => realRoleCategory.value === 'admin');
// 视图角色标签
const viewRoleLabel = computed(() => {
  if (viewRole.value === 'admin') return '管理员视图';
  if (viewRole.value === 'business') return '业务端视图';
  return '实验室视图';
});

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

  // 将用户信息同步到 localStorage，供其他页面使用
  localStorage.setItem('user', JSON.stringify(user.value));
};

// 初始化菜单（只在组件首次挂载时调用一次，防止切换程序后自动跳转）
const initMenu = async () => {
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

  // 设置默认菜单
  if (cat === 'lab') {
    activeMenu.value = 'lab-initiate';
  } else if (cat === 'admin') {
    activeMenu.value = 'admin';
  } else {
    activeMenu.value = 'initiate';
  }

  // 加载保存的视图角色（仅管理员）
  if (user.value.role === 'admin') {
    const savedViewRole = localStorage.getItem('viewRole');
    if (savedViewRole && ['admin', 'business', 'lab'].includes(savedViewRole)) {
      viewRole.value = savedViewRole;
      // 根据保存的视图角色设置正确的 activeMenu
      if (savedViewRole === 'admin') {
        activeMenu.value = 'admin';
      } else if (savedViewRole === 'business') {
        activeMenu.value = 'initiate';
      } else if (savedViewRole === 'lab') {
        activeMenu.value = 'lab-initiate';
      }
    }
  } else {
    // 非管理员强制使用实际角色
    viewRole.value = cat;
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

// 加载待处理消息数量
const loadPendingMsgCount = async () => {
  try {
    const { data } = await communicationAPI.getPendingCount();
    pendingMsgCount.value = data.count;
  } catch (error) {
    console.error('加载待处理消息数失败:', error);
  }
};

// 实时订阅新消息（新增/回复时刷新待处理数）
const subscribeMessages = () => {
  messageChannel = supabase
    .channel('messages-pending-count')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'communications' },
      () => {
        loadPendingMsgCount();
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'communication_recipients' },
      () => {
        loadPendingMsgCount();
      }
    )
    .subscribe();
};

// 切换视图角色
const switchRole = (role) => {
  viewRole.value = role;
  localStorage.setItem('viewRole', role);
  
  // 切换到对应角色的有效菜单
  if (role === 'admin') {
    activeMenu.value = 'admin';
  } else if (role === 'business') {
    activeMenu.value = 'initiate';
  } else if (role === 'lab') {
    activeMenu.value = 'lab-initiate';
  }
};

// 处理从通讯录跳转来的快捷发起沟通
const handleSwitchToInitiate = () => {
  const preselect = sessionStorage.getItem('preselectRecipients');
  if (preselect) {
    try {
      preselectRecipients.value = JSON.parse(preselect);
      sessionStorage.removeItem('preselectRecipients');
      // 切换到发起沟通页面
      if (viewRole.value === 'lab') {
        activeMenu.value = 'lab-initiate';
      } else {
        activeMenu.value = 'initiate';
      }
    } catch (e) {
      console.error('解析预选中用户失败:', e);
    }
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
  await initMenu(); // 只在首次挂载时初始化菜单
  loadUnreadCount();
  loadPendingMsgCount();
  subscribeAnnouncements();
  subscribeMessages();

  // 监听从通讯录跳转来的快捷发起沟通事件
  window.addEventListener('switch-to-initiate', handleSwitchToInitiate);

  // 监听 auth 状态变化，防止串号
  // 注意：TOKEN_REFRESHED 时只更新用户信息，不修改菜单，避免切换程序后自动跳转
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      router.push('/login');
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      loadUser(); // 只更新用户信息，不再调用 initMenu()
    }
  });
});

onUnmounted(() => {
  if (announcementChannel) {
    supabase.removeChannel(announcementChannel);
  }
  if (messageChannel) {
    supabase.removeChannel(messageChannel);
  }
  window.removeEventListener('switch-to-initiate', handleSwitchToInitiate);
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

.role-switcher {
  margin-left: 12px;
}

/* 让下拉菜单项有合适的间距 */
:deep(.el-dropdown-menu__item) {
  font-size: 13px;
  padding: 8px 20px;
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

.pending-msg-badge {
  font-size: 11px;
  color: #e6a23c;
  background: #fdf6ec;
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: 6px;
  white-space: nowrap;
}
</style>
