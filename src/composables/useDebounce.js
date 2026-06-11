import { ref, watch } from 'vue'

export function useDebouncedSearch(delay = 300) {
  const input = ref('')
  const debouncedValue = ref('')
  let timer = null

  watch(input, (val) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      debouncedValue.value = val
    }, delay)
  })

  return { input, debouncedValue }
}
