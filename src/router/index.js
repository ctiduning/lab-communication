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
  // 用 supabase 校验 session 是否有效（token 可能已过期）
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  if (to.meta.requiresAuth && !isAuthenticated) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
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
