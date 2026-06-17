/**
 * 草稿自动保存工具
 * 表单输入防抖自动保存到 localStorage，页面加载时自动恢复
 */
import { watch, onMounted, onBeforeUnmount } from 'vue'
import { ElMessageBox } from 'element-plus'

export function useAutoSave(form, storageKey, debounceMs = 1500) {
  let saveTimer = null

  // 防抖自动保存
  const startAutoSave = () => {
    watch(form, () => {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        const data = JSON.parse(JSON.stringify(form))
        data._autoSavedAt = new Date().toISOString()
        try {
          localStorage.setItem(storageKey, JSON.stringify(data))
        } catch (e) {
          // localStorage 满时静默失败
          console.warn('Auto-save failed:', e)
        }
      }, debounceMs)
    }, { deep: true })
  }

  // 恢复自动保存的草稿
  const restoreAutoSave = async () => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (!saved) return false
      const data = JSON.parse(saved)
      const savedAt = data._autoSavedAt
      if (!savedAt) return false
      const elapsed = Date.now() - new Date(savedAt).getTime()
      // 超过4小时的草稿不恢复
      if (elapsed > 4 * 60 * 60 * 1000) {
        localStorage.removeItem(storageKey)
        return false
      }
      // 检查是否有内容被填写
      const hasContent = Object.entries(data).some(([key, val]) => {
        if (key === '_autoSavedAt') return false
        if (Array.isArray(val)) return val.length > 0
        return val !== '' && val !== null && val !== undefined
      })
      if (!hasContent) return false

      try {
        await ElMessageBox.confirm(
          `检测到上次未发送的草稿（${new Date(savedAt).toLocaleString('zh-CN')}），是否恢复？`,
          '自动保存草稿',
          { confirmButtonText: '恢复', cancelButtonText: '丢弃', type: 'info' }
        )
        Object.keys(form).forEach(key => {
          if (key in data && key !== '_autoSavedAt') form[key] = data[key]
        })
        return true
      } catch {
        // 用户选择丢弃
        localStorage.removeItem(storageKey)
        return false
      }
    } catch {
      return false
    }
  }

  // 清除自动保存
  const clearAutoSave = () => {
    localStorage.removeItem(storageKey)
  }

  onBeforeUnmount(() => {
    clearTimeout(saveTimer)
  })

  return { startAutoSave, restoreAutoSave, clearAutoSave }
}
