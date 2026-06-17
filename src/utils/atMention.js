/**
 * 消息@提醒工具
 * 在文本输入框中监听 @ 字符，弹出用户选择下拉
 */
import { ref, computed } from 'vue'
import { buildSearchKeys, matchUser } from './pinyinSearch'

export function useAtMention(allUsers) {
  const mentionCandidates = ref([])
  const mentionVisible = ref(false)
  const mentionQuery = ref('')
  const mentionSearchText = ref('')
  const cursorPosition = ref(0)

  // 用户搜索（拼音模糊）
  const filteredUsers = computed(() => {
    if (!mentionSearchText.value) return allUsers.value.slice(0, 8)
    const q = mentionSearchText.value.toLowerCase()
    return allUsers.value.filter(u => {
      if (u.is_disabled) return false
      if (u.name === '已删除用户') return false
      const name = (u.name || '').toLowerCase()
      const emp = (u.employee_id || '').toLowerCase()
      return name.includes(q) || emp.includes(q)
    }).slice(0, 8)
  })

  // 处理输入事件
  function handleInput(event, textarea) {
    const el = event.target
    const pos = el.selectionStart
    const text = el.value
    cursorPosition.value = pos

    // 查找光标前的 @ 符号
    const beforeCursor = text.substring(0, pos)
    const atIndex = beforeCursor.lastIndexOf('@')

    if (atIndex >= 0) {
      // 检查 @ 前面是否有其他字符（避免匹配邮箱等）
      if (atIndex === 0 || /[\s\n\r]/.test(text[atIndex - 1])) {
        const query = beforeCursor.substring(atIndex + 1)
        mentionSearchText.value = query
        if (!query.includes(' ')) {
          mentionCandidates.value = filteredUsers.value
          mentionVisible.value = mentionCandidates.value.length > 0
        } else {
          mentionVisible.value = false
        }
        return
      }
    }
    mentionVisible.value = false
  }

  // 选择用户
  function selectUser(user) {
    const el = document.activeElement
    if (!el) return
    const text = el.value
    const beforeCursor = text.substring(0, cursorPosition.value)
    const atIndex = beforeCursor.lastIndexOf('@')

    if (atIndex >= 0) {
      const afterAt = text.substring(atIndex + 1)
      const spaceIndex = afterAt.search(/[\s\n\r]/)
      const queryLen = spaceIndex >= 0 ? spaceIndex : afterAt.length

      const newText = text.substring(0, atIndex) + '@' + user.name + ' ' + text.substring(atIndex + queryLen + 1)
      el.value = newText
      el.dispatchEvent(new Event('input'))

      // 触发vue的v-model更新
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      ).set
      nativeInputValueSetter.call(el, newText)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }

    mentionVisible.value = false
    mentionCandidates.value = []
  }

  return {
    mentionCandidates,
    mentionVisible,
    handleInput,
    selectUser
  }
}
