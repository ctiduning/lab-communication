import { ElMessage } from 'element-plus'

export default function useApi() {
  async function safeCall(apiCall, options = {}) {
    const { errorMsg, silent = false } = options
    try {
      return await apiCall()
    } catch (error) {
      if (!silent) {
        ElMessage.error(errorMsg || error.message || '操作失败')
      }
      console.error('[API Error]', error)
      return null
    }
  }

  async function safeCallWithResult(apiCall, options = {}) {
    const { errorMsg, silent = false } = options
    try {
      const result = await apiCall()
      return { data: result, error: null }
    } catch (error) {
      if (!silent) {
        ElMessage.error(errorMsg || error.message || '操作失败')
      }
      console.error('[API Error]', error)
      return { data: null, error }
    }
  }

  return { safeCall, safeCallWithResult }
}
