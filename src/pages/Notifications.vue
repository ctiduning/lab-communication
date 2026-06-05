<template>
  <div class="notifications-container">
    <header class="header">
      <div class="header-left">
        <h1>通知消息</h1>
      </div>
      <div class="header-right">
        <el-button @click="handleMarkAllRead" icon="check">全部标为已读</el-button>
      </div>
    </header>
    
    <aside class="sidebar">
      <el-menu :default-active="'notifications'" class="sidebar-menu">
        <el-menu-item index="home" @click="goToHome">
          <template #icon><el-icon><House /></el-icon></template>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="orders" @click="goToOrders">
          <template #icon><el-icon><Document /></el-icon></template>
          <span>订单管理</span>
        </el-menu-item>
        <el-menu-item index="communications" @click="goToCommunications">
          <template #icon><el-icon><ChatDotRound /></el-icon></template>
          <span>沟通中心</span>
        </el-menu-item>
        <el-menu-item index="notifications" @click="goToNotifications">
          <template #icon><el-icon><Bell /></el-icon></template>
          <span>通知消息</span>
        </el-menu-item>
        <el-menu-item v-if="user.role === 'admin'" index="admin" @click="goToAdmin">
          <template #icon><el-icon><Setting /></el-icon></template>
          <span>系统管理</span>
        </el-menu-item>
      </el-menu>
    </aside>
    
    <main class="main-content">
      <div class="filter-tabs">
        <el-button :type="activeTab === 'all' ? 'primary' : ''" @click="activeTab = 'all'">全部</el-button>
        <el-button :type="activeTab === 'unread' ? 'primary' : ''" @click="activeTab = 'unread'">未读</el-button>
        <el-button :type="activeTab === 'read' ? 'primary' : ''" @click="activeTab = 'read'">已读</el-button>
      </div>
      
      <div class="notifications-list">
        <div v-if="filteredNotifications.length === 0" class="empty-state">
          <el-icon size="48" color="#ccc"><Bell /></el-icon>
          <p>暂无通知</p>
        </div>
        
        <div v-for="notif in filteredNotifications" :key="notif.id" 
             class="notification-item" :class="{ unread: !notif.is_read }"
             @click="handleRead(notif)">
          <div class="notif-icon">
            <el-icon :size="24" :color="getTypeColor(notif.type)">
              <WarningFilled v-if="notif.type === 'urgent'" />
              <Message v-else-if="notif.type === 'reply'" />
              <Bell v-else-if="notif.type === 'announcement'" />
              <Warning v-else />
            </el-icon>
          </div>
          <div class="notif-content">
            <p class="notif-text" v-if="notif.type === 'announcement' && notif.announcement">
              <strong style="color: #e6a23c;">[群发公告] {{ notif.announcement.title }}</strong>
              <br>
              <span style="color: #666; font-size: 13px;">{{ notif.announcement.content }}</span>
            </p>
            <p class="notif-text" v-else>{{ notif.content }}</p>
            <p class="notif-time">{{ notif.createdAt }}</p>
          </div>
          <div v-if="!notif.is_read" class="unread-dot"></div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { House, Document, ChatDotRound, Bell, Setting, WarningFilled, Warning, Message } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { notificationAPI } from '../api';
const router = useRouter();
const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
const notifications = ref([]);
const activeTab = ref('all');
const filteredNotifications = computed(() => {
 if (activeTab.value === 'unread') {
 return notifications.value.filter(n => !n.is_read);
 }
 if (activeTab.value === 'read') {
 return notifications.value.filter(n => n.is_read);
 }
 return notifications.value;
});
const goToHome = () => {
 router.push('/');
};
const goToOrders = () => {
 router.push('/orders');
};
const goToCommunications = () => {
 router.push('/communications');
};
const goToNotifications = () => {
 router.push('/notifications');
};
const goToAdmin = () => {
 router.push('/admin');
};
const getTypeColor = (type) => {
 const colors = {
 urgent: '#f56c6c',
 reply: '#409eff',
 delay: '#e6a23c',
 report: '#13c2c2',
 unqualified: '#f56c6c',
 announcement: '#e6a23c'
 };
 return colors[type] || '#999';
};
const handleRead = async (notif) => {
 if (!notif.is_read) {
 try {
 await notificationAPI.markAsRead(notif.id);
 notif.is_read = true;
 }
 catch (error) {
 console.error(error);
 }
 }
};
const handleMarkAllRead = async () => {
 try {
 await notificationAPI.markAllAsRead();
 notifications.value.forEach(n => n.is_read = true);
 ElMessage.success('全部已标为已读');
 }
 catch (error) {
 ElMessage.error('操作失败');
 }
};
const loadNotifications = async () => {
 try {
 const response = await notificationAPI.getAll();
 notifications.value = response.data.map(n => ({
 ...n,
 createdAt: new Date(n.createdAt).toLocaleString()
 }));
 }
 catch (error) {
 console.error(error);
 }
};
onMounted(() => {
 loadNotifications();
});
</script>

<style scoped>
.notifications-container {
  display: flex;
  min-height: 100vh;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  color: white;
  z-index: 100;
}

.header-left h1 {
  font-size: 18px;
  font-weight: 600;
}

.sidebar {
  margin-top: 60px;
  width: 200px;
  background: #f5f5f5;
  min-height: calc(100vh - 60px);
  padding-top: 20px;
}

.sidebar-menu {
  border-right: none;
}

.main-content {
  margin-top: 60px;
  flex: 1;
  padding: 20px;
}

.filter-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.notifications-list {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-state p {
  margin-top: 15px;
  color: #999;
}

.notification-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border-bottom: 1px solid #e8e8e8;
  cursor: pointer;
  transition: background 0.3s;
}

.notification-item:hover {
  background: #f9f9f9;
}

.notification-item.unread {
  background: #fffcf5;
}

.notification-item:last-child {
  border-bottom: none;
}

.notif-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  justify-content: center;
  align-items: center;
}

.notif-content {
  flex: 1;
}

.notif-text {
  font-size: 14px;
  color: #333;
  margin-bottom: 5px;
}

.notif-time {
  font-size: 12px;
  color: #999;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f56c6c;
}
</style>