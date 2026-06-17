import { createRouter, createWebHashHistory } from 'vue-router';
import { supabase } from '../utils/supabase';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/Login.vue')
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../pages/Home.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../pages/Admin.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/announcements',
    name: 'Announcements',
    component: () => import('../pages/Announcements.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../pages/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../pages/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../pages/History.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/business-initiate',
    name: 'BusinessInitiate',
    component: () => import('../pages/BusinessInitiate.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/lab-initiate',
    name: 'LabInitiate',
    component: () => import('../pages/LabInitiate.vue'),
    meta: { requiresAuth: true }
  },
  // 兜底：其他路径重定向到首页
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  // 先检查 localStorage 是否有 token（避免每次导航都调用服务端验证）
  const hasToken = !!localStorage.getItem('sb-qgoqhjwekairknkuqisi-auth-token')
  if (!hasToken && to.path !== '/login' && to.meta.requiresAuth) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    next('/login')
    return
  }

  // 再用服务端验证确认 session 是否有效
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  if (to.meta.requiresAuth && !isAuthenticated) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('sb-qgoqhjwekairknkuqisi-auth-token')
    next('/login')
    return
  }

  // 已登录用户访问 /login 时重定向到首页
  if (to.path === '/login' && isAuthenticated) {
    next('/')
    return
  }

  next()
});

export default router;
