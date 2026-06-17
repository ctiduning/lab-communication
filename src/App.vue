<template>
  <div class="app">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { supabase } from './utils/supabase'

let notifyTimer = null
let lastNotifyCheck = Date.now()

async function checkNotifications() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('notifications')
      .select('id, content, created_at')
      .eq('user_id', session.user.id)
      .gt('created_at', new Date(lastNotifyCheck).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
    if (data && data.length > 0) {
      const notif = data[0]
      if (Notification.permission === 'granted') {
        new Notification('实验室沟通系统', {
          body: notif.content,
          icon: '/favicon.ico',
          tag: notif.id
        })
      }
    }
    lastNotifyCheck = Date.now()
  } catch (e) { /* 静默 */ }
}

onMounted(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
  if ('Notification' in window && Notification.permission === 'granted') {
    notifyTimer = setInterval(checkNotifications, 30000)
    checkNotifications()
  }
})

onBeforeUnmount(() => {
  if (notifyTimer) clearInterval(notifyTimer)
})
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>