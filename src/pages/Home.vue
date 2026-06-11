<template>
  <div class="home">
    <el-container>
      <el-header class="header">
        <div class="header-content">
          <!-- 移动端汉堡菜单按钮 -->
          <el-button
            v-if="isMobile"
            class="menu-toggle"
            @click="sidebarCollapsed = !sidebarCollapsed"
            size="small"
          >
            <el-icon><Menu /></el-icon>
            <span style="margin-left: 4px;">菜单</span>
          </el-button>
          <h1 class="logo" :class="{ 'logo-mobile': isMobile }">青岛华测实验室沟通小程序</h1>
          <div class="user-info">
            <span v-if="!isMobile">欢迎, {{ user.name }}</span>
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
            <el-button @click="logout" type="text" size="small">退出</el-button>
          </div>
        </div>
      </el-header>
      
      <el-container>
        <!-- 桌面端侧边栏 -->
        <el-aside v-if="!isMobile" width="200px" class="sidebar">
          <el-menu :default-active="activeMenu" mode="vertical" class="side-menu" @select="activeMenu = $event">
            <!-- 通知公告 -->
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

        <!-- 移动端侧边抽屉 -->
        <el-drawer
          v-if="isMobile"
          v-model="sidebarCollapsed"
          direction="ltr"
          size="200px"
          :with-header="false"
          class="mobile-sidebar-drawer"
        >
          <el-menu :default-active="activeMenu" mode="vertical" class="side-menu" @select="onMobileMenuSelect">
            <!-- 通知公告 -->
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
        </el-drawer>
        
        <el-main class="main-content" :class="{ 'main-mobile': isMobile }">
          <component :is="currentComponent" />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, provide, nextTick, defineAsyncComponent, watch } from 'vue';
import { ChatDotSquare, Bell, Setting, User, OfficeBuilding, Promotion, ArrowDown, Menu } from '@element-plus/icons-vue';
import { supabase } from '../utils/supabase';

import { authAPI, announcementAPI, communicationAPI, userAPI, getRoleCategory } from '../api';

const BusinessInitiate = defineAsyncComponent(() => import('./BusinessInitiate.vue'));
const BusinessReceive = defineAsyncComponent(() => import('./BusinessReceive.vue'));
const LabInitiate = defineAsyncComponent(() => import('./LabInitiate.vue'));
const LabReceive = defineAsyncComponent(() => import('./LabReceive.vue'));
const AdminPanel = defineAsyncComponent(() => import('./Admin.vue'));
const ProfileView = defineAsyncComponent(() => import('./Profile.vue'));
const AnnouncementsView = defineAsyncComponent(() => import('./Announcements.vue'));
const OrgView = defineAsyncComponent(() => import('./Organization.vue'));
const SentView = defineAsyncComponent(() => import('./SentMessages.vue'));

const user = ref({
  name: '',
  role: ''
});

const activeMenu = ref('initiate');
const viewRole = ref('admin');
const unreadAnnCount = ref(0);
const pendingMsgCount = ref(0);
let announcementChannel = null;
let messageChannel = null;
let activeTimer = null;
const isMobile = ref(false);
const sidebarCollapsed = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
  if (isMobile.value) sidebarCollapsed.value = false; // 移动端默认关闭抽屉
};

const onMobileMenuSelect = (index) => {
  activeMenu.value = index;
  sidebarCollapsed.value = true; // 选中后自动关闭抽屉
};

const preselectRecipients = ref([]);
const preselectDeptCards = ref([]);
provide('preselectRecipients', preselectRecipients);
provide('preselectDeptCards', preselectDeptCards);

// 实际用户角色
const realRoleCategory = computed(() => getRoleCategory(user.value.role, user.value.department_level1));
// 视图角色
const roleCategory = computed(() => viewRole.value);
// 是否是管理员
const isAdmin = computed(() => realRoleCategory.value === 'admin');
// 视图角色标签
const viewRoleLabel = computed(() => {
  if (viewRole.value === 'admin') return '管理员视图';
  if (viewRole.value === 'business') return '业务端视图';
  return '实验室视图';
});

const currentComponent = computed(() => {
  if (activeMenu.value === 'announcements') return AnnouncementsView;
  if (activeMenu.value === 'profile') return ProfileView;

  const cat = roleCategory.value;

  if (cat === 'business') {
    if (activeMenu.value === 'initiate') return BusinessInitiate;
    if (activeMenu.value === 'receive') return BusinessReceive;
    if (activeMenu.value === 'sent') return SentView;
  }

  if (cat === 'lab') {
    if (activeMenu.value === 'lab-initiate') return LabInitiate;
    if (activeMenu.value === 'lab-receive') return LabReceive;
    if (activeMenu.value === 'sent') return SentView;
  }

  if (cat === 'admin') {
    if (activeMenu.value === 'admin') return AdminPanel;
  }

  if (activeMenu.value === 'organization') return OrgView;

  return BusinessInitiate;
});

const logout = async () => {
  try {
    await authAPI.logout();
  } catch (e) {}
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('sb-qgoqhjwekairknkuqisi-auth-token');
  sessionStorage.clear();
  // 强制跳转到登录页
  window.location.href = '/login';
};

const loadUser = async () => {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) { router.push('/login'); return; }

  const meta = authUser.user_metadata || {};
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();

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
  localStorage.setItem('user', JSON.stringify(user.value));
};

const initMenu = async () => {
  const cat = getRoleCategory(user.value.role, user.value.department_level1);
  const preselect = sessionStorage.getItem('preselectRecipients');
  const preselectDept = sessionStorage.getItem('preselectDeptCards');
  if (preselect) {
    try {
      preselectRecipients.value = JSON.parse(preselect);
      sessionStorage.removeItem('preselectRecipients');
      if (preselectDept) {
        preselectDeptCards.value = JSON.parse(preselectDept);
        sessionStorage.removeItem('preselectDeptCards');
      }
      if (cat === 'lab') activeMenu.value = 'lab-initiate';
      else activeMenu.value = 'initiate';
      return;
    } catch (e) { console.error('解析预选中用户失败:', e); }
  }

  if (cat === 'lab') activeMenu.value = 'lab-initiate';
  else if (cat === 'admin') activeMenu.value = 'admin';
  else activeMenu.value = 'initiate';

  if (user.value.role === 'admin') {
    const savedViewRole = localStorage.getItem('viewRole');
    if (savedViewRole && ['admin', 'business', 'lab'].includes(savedViewRole)) {
      viewRole.value = savedViewRole;
      if (savedViewRole === 'admin') activeMenu.value = 'admin';
      else if (savedViewRole === 'business') activeMenu.value = 'initiate';
      else if (savedViewRole === 'lab') activeMenu.value = 'lab-initiate';
    }
  } else {
    viewRole.value = cat;
  }
};

const loadUnreadCount = async () => {
  try {
    const { data } = await announcementAPI.getUnreadCount();
    unreadAnnCount.value = data.count;
  } catch (error) { console.error('加载未读公告数失败:', error); }
};

const loadPendingMsgCount = async () => {
  try {
    const { data } = await communicationAPI.getPendingCount();
    pendingMsgCount.value = data.count;
    console.log('[待处理数量] API返回:', data.count);
  } catch (error) { console.error('加载待处理消息数失败:', error); }
};

const subscribeMessages = () => {
  messageChannel = supabase
    .channel('messages-pending-count')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'communications' }, () => loadPendingMsgCount())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'communication_recipients' }, () => loadPendingMsgCount())
    .subscribe();
};

const switchRole = (role) => {
  viewRole.value = role;
  localStorage.setItem('viewRole', role);
  if (role === 'admin') activeMenu.value = 'admin';
  else if (role === 'business') activeMenu.value = 'initiate';
  else if (role === 'lab') activeMenu.value = 'lab-initiate';
};

const handleSwitchToInitiate = () => {
  const preselect = sessionStorage.getItem('preselectRecipients');
  const preselectDept = sessionStorage.getItem('preselectDeptCards');
  if (preselect) {
    try {
      preselectRecipients.value = JSON.parse(preselect);
      sessionStorage.removeItem('preselectRecipients');
      if (preselectDept) {
        preselectDeptCards.value = JSON.parse(preselectDept);
        sessionStorage.removeItem('preselectDeptCards');
      }
      if (viewRole.value === 'lab') activeMenu.value = 'lab-initiate';
      else activeMenu.value = 'initiate';
    } catch (e) { console.error('解析预选中用户失败:', e); }
  }
};

const subscribeAnnouncements = () => {
  announcementChannel = supabase
    .channel('announcements-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, () => loadUnreadCount())
    .subscribe();
};

onMounted(async () => {
  await loadUser();
  await initMenu();
  loadUnreadCount();
  loadPendingMsgCount();
  subscribeAnnouncements();
  subscribeMessages();

  checkMobile();
  window.addEventListener('resize', checkMobile);

  try { await userAPI.updateLastActive(); } catch (e) {}
  activeTimer = setInterval(async () => {
    try { await userAPI.updateLastActive(); } catch (e) {}
  }, 5 * 60 * 1000);

  window.addEventListener('switch-to-initiate', handleSwitchToInitiate);
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) router.push('/login');
    else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') loadUser();
  });
});

onUnmounted(() => {
  if (announcementChannel) supabase.removeChannel(announcementChannel);
  if (messageChannel) supabase.removeChannel(messageChannel);
  if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }
  window.removeEventListener('switch-to-initiate', handleSwitchToInitiate);
  window.removeEventListener('resize', checkMobile);
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

.logo-mobile {
  font-size: 14px;
}

.menu-toggle {
  color: white;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.5);
  margin-right: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info span {
  font-size: 14px;
}

.role-switcher {
  margin-left: 12px;
}

:deep(.el-dropdown-menu__item) {
  font-size: 13px;
  padding: 8px 20px;
}

.sidebar {
  background: #f5f5f5;
}

.sidebar-mobile {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2000;
}

.side-menu {
  height: 100%;
  border-right: none;
}

.main-content {
  padding: 20px;
}

.main-mobile {
  padding: 10px;
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

/* 移动端表格横向滚动 */
@media screen and (max-width: 768px) {
  :deep(.el-table) {
    width: 100%;
    overflow-x: auto;
  }
  :deep(.el-table__body-wrapper) {
    overflow-x: auto;
  }
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 10px auto !important;
  }
  :deep(.el-drawer) {
    width: 80% !important;
  }
}
</style>
