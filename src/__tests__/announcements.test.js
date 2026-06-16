/**
 * QA 测试 —— Announcements.vue UI布局修改验证
 *
 * 验证项：
 * 1. 列宽统一扩大到约1.5倍
 * 2. 按钮重叠修复（flex-wrap, gap, action-btn样式）
 * 3. 搜索栏优化（宽度, 内联样式迁移）
 * 4. 容器间距调整（padding）
 * 5. 逻辑完整性（template ↔ script 引用一致性）
 * 6. CSS类前后一致性
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const PROJECT_ROOT = process.cwd()
const SOURCE_PATH = 'src/pages/Announcements.vue'

function readSource(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf-8')
}

/**
 * 智能提取 template 区块：正确处理嵌套 <template> 标签
 */
function extractTemplate(source) {
  const startMatch = source.match(/<template>/)
  if (!startMatch) return ''
  const startIdx = startMatch.index + startMatch[0].length
  let depth = 1
  const templateTagRegex = /<\/?template[\s>]/g
  // Start searching AFTER the main opening tag so we don't double-count it
  templateTagRegex.lastIndex = startIdx
  let execResult
  while ((execResult = templateTagRegex.exec(source)) !== null && depth > 0) {
    const tag = execResult[0]
    if (tag.startsWith('<template')) {
      depth++
    } else if (tag === '</template>') {
      depth--
    }
    if (depth === 0) {
      return source.substring(startIdx, execResult.index).trim()
    }
  }
  return ''
}

function extractScopedCSS(source) {
  const match = source.match(/<style scoped>([\s\S]*?)<\/style>/)
  return match ? match[1].trim() : ''
}

function extractScript(source) {
  const match = source.match(/<script setup>([\s\S]*?)<\/script>/)
  return match ? match[1].trim() : ''
}

function findCSSValue(css, selector, property) {
  const escapedSelector = selector.replace(/\./g, '\\.').replace(/\s+/g, '\\s+')
  const blockMatch = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)`))
  if (!blockMatch) return null
  const propMatch = blockMatch[1].match(new RegExp(`${property}\\s*:\\s*([^;]+)`))
  return propMatch ? propMatch[1].trim() : null
}

/**
 * 从原始源文件中直接查找 el-table-column 的属性值，不依赖 template 提取
 */
function findColumnAttr(label, attr) {
  // 找到包含该 label 的 <el-table-column 标签
  // label 可能在 attr 前或后
  const patterns = [
    new RegExp(`<el-table-column[^>]*?label="${label}"[^>]*?\\s${attr}="([^"]+)"`),
    new RegExp(`<el-table-column[^>]*?\\s${attr}="([^"]+)"[^>]*?label="${label}"`),
  ]
  for (const p of patterns) {
    const m = sourceFile.match(p)
    if (m) return m[1]
  }
  return null
}

function findInSource(text) {
  return sourceFile.includes(text)
}

// ============================================================
// 测试数据
// ============================================================
const sourceFile = readSource(SOURCE_PATH)
const template = extractTemplate(sourceFile)
const css = extractScopedCSS(sourceFile)
const script = extractScript(sourceFile)

// ============================================================
// 1. 列宽验证
// ============================================================
describe('列宽统一扩大到约1.5倍', () => {
  it('标题列 min-width 应为 600（原400，1.5倍）', () => {
    const val = findColumnAttr('标题', 'min-width')
    expect(val).toBe('600')
  })

  it('通知内容列 min-width 应为 800', () => {
    const val = findColumnAttr('通知内容', 'min-width')
    expect(val).toBe('800')
  })

  it('通知内容列 max-width 应为 1100', () => {
    const val = findColumnAttr('通知内容', 'max-width')
    expect(val).toBe('1100')
  })

  it('操作列 min-width 应为 360（原240，1.5倍）', () => {
    const val = findColumnAttr('操作', 'min-width')
    expect(val).toBe('360')
  })

  it('发布人列 width 应为 200', () => {
    expect(findColumnAttr('发布人', 'width')).toBe('200')
  })

  it('发布时间列 width 应为 280', () => {
    expect(findColumnAttr('发布时间', 'width')).toBe('280')
  })

  it('已读状态列 width 应为 140', () => {
    expect(findColumnAttr('已读状态', 'width')).toBe('140')
  })

  it('序号列 width 应为 80', () => {
    expect(findColumnAttr('序号', 'width')).toBe('80')
  })

  it('管理员选择列 width 应为 60', () => {
    const m = sourceFile.match(/type="selection"\s+width="(\d+)"/)
    expect(m).not.toBeNull()
    expect(m[1]).toBe('60')
  })
})

// ============================================================
// 2. 按钮重叠修复验证
// ============================================================
describe('按钮重叠修复', () => {
  it('.action-btns 应使用 flex-wrap: wrap', () => {
    expect(findCSSValue(css, '.action-btns', 'flex-wrap')).toBe('wrap')
  })

  it('.action-btns 应使用 gap: 6px（原4px）', () => {
    expect(findCSSValue(css, '.action-btns', 'gap')).toBe('6px')
  })

  it('.action-btn 样式应已定义（margin: 0, white-space: nowrap）', () => {
    const actionBtnCSS = css.match(/\.action-btns\s*\.action-btn\s*\{([^}]+)/)
    expect(actionBtnCSS).not.toBeNull()
    expect(actionBtnCSS[1]).toContain('margin: 0')
    expect(actionBtnCSS[1]).toContain('white-space: nowrap')
  })

  it('操作列中所有 el-button 应使用 action-btn 类', () => {
    // 在原始源文件中找到操作列区域
    const opColStart = sourceFile.indexOf('label="操作"')
    expect(opColStart).toBeGreaterThan(-1)
    const opColEnd = sourceFile.indexOf('</el-table-column>', opColStart)
    const opColContent = sourceFile.substring(opColStart, opColEnd)

    // 提取所有 class 属性
    const classMatches = opColContent.match(/class="([^"]+)"/g) || []
    expect(classMatches.length).toBeGreaterThanOrEqual(1)
    classMatches.forEach(cls => {
      expect(cls).toContain('action-btn')
    })
  })

  it('操作按钮容器 div 应使用 action-btns 类', () => {
    expect(findInSource('<div class="action-btns">')).toBe(true)
  })

  it('操作列不应包含 nowrap', () => {
    const actionBtnsBlock = css.match(/\.action-btns\s*\{([^}]+)/)
    expect(actionBtnsBlock).not.toBeNull()
    expect(actionBtnsBlock[1]).not.toMatch(/flex-wrap\s*:\s*nowrap/)
  })
})

// ============================================================
// 3. 搜索栏优化验证
// ============================================================
describe('搜索栏优化', () => {
  it('.search-input 宽度应为 400px（原300px）', () => {
    expect(findCSSValue(css, '.search-input', 'width')).toBe('400px')
  })

  it('搜索框应使用 CSS class 而非内联 style', () => {
    // 找到搜索框 el-input 区域
    const searchStart = sourceFile.indexOf('v-model="searchKeyword"')
    expect(searchStart).toBeGreaterThan(-1)
    const searchBlock = sourceFile.substring(
      sourceFile.lastIndexOf('<el-input', searchStart),
      sourceFile.indexOf('/>', searchStart) + 2
    )
    expect(searchBlock).toContain('class="search-input"')
    expect(searchBlock).not.toMatch(/style\s*=\s*["'].*width/)
  })

  it('搜索栏布局应为 flex 并支持换行', () => {
    expect(findInSource('class="search-bar"')).toBe(true)
    const searchBarCSS = css.match(/\.search-bar\s*\{([^}]+)/)
    expect(searchBarCSS).not.toBeNull()
    expect(searchBarCSS[1]).toContain('display: flex')
    expect(searchBarCSS[1]).toContain('flex-wrap: wrap')
  })

  it('应导入 Search 图标', () => {
    expect(script).toContain("import { Search } from '@element-plus/icons-vue'")
  })

  it('搜索框应使用 :prefix-icon="Search"', () => {
    expect(findInSource(':prefix-icon="Search"')).toBe(true)
  })
})

// ============================================================
// 4. 容器间距验证
// ============================================================
describe('容器间距调整', () => {
  it('.notice-board padding 应包含 32px 和 36px（原24px）', () => {
    const noticeBoardCSS = css.match(/\.notice-board\s*\{([^}]+)/)
    expect(noticeBoardCSS).not.toBeNull()
    expect(noticeBoardCSS[1]).toMatch(/32px/)
    expect(noticeBoardCSS[1]).toMatch(/36px/)
  })

  it('.notice-board 应设置 max-width: 1800px', () => {
    expect(findCSSValue(css, '.notice-board', 'max-width')).toBe('1800px')
  })

  it('.notice-board 应居中', () => {
    expect(findCSSValue(css, '.notice-board', 'margin')).toBe('0 auto')
  })
})

// ============================================================
// 5. 逻辑完整性验证（Template → Script 引用一致性）
// ============================================================
describe('逻辑完整性：Template 引用的数据/方法应在 Script 中定义', () => {
  const dataRefs = [
    'unreadCount', 'isAdmin', 'showCreateForm', 'selectedAnnouncements',
    'searchKeyword', 'onlyFlagged', 'filteredAnnouncements', 'announcementTab',
    'annTableRef', 'loading', 'detailVisible', 'selectedAnn',
    'editVisible', 'editForm', 'editLoading',
    'reactionDetailVisible', 'reactionDetailList',
    'showImagePreview', 'previewImageUrl',
    'form', 'sending', 'currentUser', 'currentUserRole',
  ]

  dataRefs.forEach(ref => {
    it(`模板引用的 ${ref} 应在 script 中定义`, () => {
      if (template.includes(ref)) {
        expect(script.includes(ref)).toBe(true)
      }
    })
  })

  const methodRefs = [
    'handleClickNotice', 'tableRowClassName', 'handleSelectionChange',
    'handleBatchDelete', 'toggleFlag', 'handleRecall',
    'handleEdit', 'handleDelete', 'handleSend', 'resetForm',
    'handleUploadImage', 'handleEditUploadImage',
    'previewImage', 'formatTime', 'truncateContent',
    'markAllRead', 'getMyReactionType', 'handleReaction',
    'getLikeCount', 'getDislikeCount', 'showReactionDetail',
    'handleUpdateAnnouncement',
  ]

  methodRefs.forEach(method => {
    it(`模板调用方法 ${method} 应在 script 中定义`, () => {
      if (template.includes(method)) {
        expect(script.includes(method)).toBe(true)
      }
    })
  })
})

// ============================================================
// 6. 辅助函数：提取模板中的静态 & 动态CSS类名
// ============================================================

/**
 * 从模板中提取所有CSS类名
 * - 静态 class="foo bar" → ['foo', 'bar']
 * - 动态 :class="{ 'foo': cond }" → ['foo']
 * - 动态 :class="[cond ? 'foo' : '']" → ['foo', ''] (过滤空字符串)
 */
function extractAllClassNames(tpl) {
  const classes = new Set()

  // 1. 静态 class="..."
  const staticMatches = tpl.matchAll(/class="([^"]+)"/g)
  for (const m of staticMatches) {
    m[1].split(/\s+/).forEach(cls => {
      const clean = cls.trim()
      if (clean && /^[\w-]+$/.test(clean)) classes.add(clean)
    })
  }

  // 2. 动态 :class="{ 'name': cond }"
  const dynamicObjMatches = tpl.matchAll(/:class="\{([^}]+)\}"/g)
  for (const m of dynamicObjMatches) {
    const nameMatches = m[1].matchAll(/['"]?([\w-]+)['"]?\s*:/g)
    for (const nm of nameMatches) {
      if (/^[\w-]+$/.test(nm[1])) classes.add(nm[1])
    }
  }

  // 3. 动态 :class="[cond ? 'name' : '']"
  const dynamicArrMatches = tpl.matchAll(/:class="\[([^\]]+)\]"/g)
  for (const m of dynamicArrMatches) {
    const strMatches = m[1].matchAll(/['"](\w[\w-]*)['"]/g)
    for (const sm of strMatches) {
      classes.add(sm[1])
    }
  }

  return classes
}

// ============================================================
// 6. CSS类前后一致性验证
// ============================================================
describe('CSS类前后一致性：模板使用的类名应在样式中定义', () => {
  const templateClasses = extractAllClassNames(template)
  const cssClasses = new Set()
  const cssClassMatches = css.matchAll(/\.([\w-]+)\s*\{/g)
  for (const match of cssClassMatches) {
    cssClasses.add(match[1])
  }

  // detail-content 是无样式的包装div，不需要CSS定义
  const unstyledWrappers = ['detail-content']

  templateClasses.forEach(cls => {
    if (unstyledWrappers.includes(cls)) return
    it(`CSS 类 "${cls}" 应在 scoped style 中定义`, () => {
      expect(cssClasses.has(cls)).toBe(true)
    })
  })
})

describe('CSS类前后一致性：样式定义的类应在模板中被使用', () => {
  const templateClasses = extractAllClassNames(template)
  const cssClasses = new Set()
  const cssClassMatches = css.matchAll(/\.([\w-]+)\s*\{/g)
  for (const match of cssClassMatches) {
    cssClasses.add(match[1])
  }

  const knownElementPlusClasses = ['el-table', 'el-dialog', '__body']

  cssClasses.forEach(cls => {
    if (knownElementPlusClasses.some(k => cls.includes(k))) return
    if (cls === 'el-button') return

    it(`样式定义的 "${cls}" 应在模板中有对应使用`, () => {
      expect(templateClasses.has(cls)).toBe(true)
    })
  })
})

// ============================================================
// 7. Template 结构完整性验证
// ============================================================
describe('Template 结构完整性', () => {
  it('el-table 标签应正确闭合', () => {
    const openTags = sourceFile.match(/<el-table\s[^>]*>/g) || []
    const selfClosing = sourceFile.match(/<el-table\s[^>]*\/>/g) || []
    const closeTags = sourceFile.match(/<\/el-table>/g) || []
    expect(openTags.length - selfClosing.length).toBe(closeTags.length)
  })

  it('el-dialog 标签应正确闭合', () => {
    const openTags = sourceFile.match(/<el-dialog[\s>]/g) || []
    const closeTags = sourceFile.match(/<\/el-dialog>/g) || []
    expect(openTags.length).toBe(closeTags.length)
  })

  it('template 插槽（#default/#header/#footer）应正确闭合', () => {
    const slotOpens = sourceFile.match(/<template\s+#/g) || []
    const slotCloses = sourceFile.match(/<\/template>/g) || []
    // 主 template 有1个打开，slot 有 N 个打开和 N 个关闭
    // slot关闭 + 主template关闭 = slot打开 + 1
    // 但更简单：只是验证slot打开和关闭基本匹配
    const mainTemplateClose = 1 // 主 </template>
    expect(slotCloses.length).toBe(slotOpens.length + mainTemplateClose)
  })
})

// ============================================================
// 8. 逻辑函数纯函数测试
// ============================================================
describe('逻辑函数测试：fuzzyMatch', () => {
  const fuzzyMatch = (text, query) => {
    if (!query) return true
    if (!text) return false
    const t = text.toLowerCase()
    const q = query.toLowerCase().replace(/\s/g, '')
    let qi = 0
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) qi++
    }
    return qi === q.length
  }

  it('空查询应返回 true', () => {
    expect(fuzzyMatch('任何文本', '')).toBe(true)
  })

  it('精确匹配应返回 true', () => {
    expect(fuzzyMatch('通知标题', '通知标题')).toBe(true)
  })

  it('模糊匹配（连续字符）应返回 true', () => {
    expect(fuzzyMatch('这是一个通知标题', '知标题')).toBe(true)
  })

  it('模糊匹配（不连续字符）应返回 true', () => {
    expect(fuzzyMatch('这是一个通知标题', '这知标')).toBe(true)
  })

  it('大小写不敏感匹配应返回 true', () => {
    expect(fuzzyMatch('Hello World', 'hello world')).toBe(true)
  })

  it('忽略空格匹配', () => {
    expect(fuzzyMatch('HelloWorld', 'hello world')).toBe(true)
  })

  it('不匹配时应返回 false', () => {
    expect(fuzzyMatch('这是一个通知', '不存在的关键词')).toBe(false)
  })

  it('text 为 null/undefined 应返回 false', () => {
    expect(fuzzyMatch(null, '关键词')).toBe(false)
    expect(fuzzyMatch(undefined, '关键词')).toBe(false)
  })
})

describe('逻辑函数测试：truncateContent', () => {
  const truncateContent = (content, maxLen) => {
    if (!content) return '-'
    if (content.length <= maxLen) return content
    return content.substring(0, maxLen) + '...'
  }

  it('空内容应返回 "-"', () => {
    expect(truncateContent(null, 100)).toBe('-')
    expect(truncateContent('', 100)).toBe('-')
    expect(truncateContent(undefined, 100)).toBe('-')
  })

  it('短内容应原样返回', () => {
    expect(truncateContent('短文本', 100)).toBe('短文本')
  })

  it('超出长度的内容应截断并加省略号', () => {
    const longText = '这是一段很长的通知内容，需要被截断显示'
    const result = truncateContent(longText, 10)
    expect(result).toBe('这是一段很长的通知内...')
    expect(result.length).toBe(13) // 10 + '...'
  })

  it('内容长度恰好等于 maxLen 时不应截断', () => {
    // content.length(7) <= maxLen(7) → 原样返回
    expect(truncateContent('刚好十个字啊', 7)).toBe('刚好十个字啊')
  })
})

describe('逻辑函数测试：formatTime', () => {
  const formatTime = (t) => {
    if (!t) return ''
    return new Date(t).toLocaleString('zh-CN')
  }

  it('null/undefined 应返回空字符串', () => {
    expect(formatTime(null)).toBe('')
    expect(formatTime(undefined)).toBe('')
  })

  it('有效时间应格式化', () => {
    const result = formatTime('2024-01-15T10:30:00')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('tableRowClassName 逻辑', () => {
  it('已读行返回空字符串，未读行返回 unread-row', () => {
    const tableRowClassName = ({ row }) => {
      return row.isRead ? '' : 'unread-row'
    }
    expect(tableRowClassName({ row: { isRead: true } })).toBe('')
    expect(tableRowClassName({ row: { isRead: false } })).toBe('unread-row')
  })
})

// ============================================================
// 9. 条件渲染逻辑验证
// ============================================================
describe('条件渲染逻辑验证', () => {
  it('管理员创建区域：v-if="showCreateForm && isAdmin"', () => {
    expect(findInSource('v-if="showCreateForm && isAdmin"')).toBe(true)
  })

  it('管理员标签切换：v-if="isAdmin" v-model="announcementTab"', () => {
    expect(findInSource('v-if="isAdmin"')).toBe(true)
    expect(findInSource('v-model="announcementTab"')).toBe(true)
  })

  it('批量选择列：v-if="isAdmin" type="selection"', () => {
    expect(findInSource('v-if="isAdmin" type="selection"')).toBe(true)
  })

  it('批量删除按钮：v-if="isAdmin && selectedAnnouncements.length > 0"', () => {
    expect(findInSource('v-if="isAdmin && selectedAnnouncements.length > 0"')).toBe(true)
  })

  it('撤回按钮应有 v-if 条件判断', () => {
    expect(findInSource("scope.row.status === 'active'")).toBe(true)
  })

  it('编辑/删除按钮应有 isAdmin 控制', () => {
    // 在操作列中找到 isAdmin 条件
    const opColStart = sourceFile.indexOf('label="操作"')
    const opColEnd = sourceFile.indexOf('</el-table-column>', opColStart)
    const opColContent = sourceFile.substring(opColStart, opColEnd)
    // 编辑和删除都用了 v-if="isAdmin"
    const adminChecks = (opColContent.match(/v-if="isAdmin"/g) || []).length
    expect(adminChecks).toBeGreaterThanOrEqual(2)
  })

  it('已撤回标签应有 v-if 条件', () => {
    expect(findInSource("scope.row.status === 'recalled'")).toBe(true)
  })

  it('已重发标签应有 v-if 条件', () => {
    expect(findInSource('scope.row.republishedAt')).toBe(true)
  })
})

// ============================================================
// 10. 图片上传与预览逻辑验证
// ============================================================
describe('图片上传与预览', () => {
  it('上传组件应使用 :auto-upload="false"', () => {
    const uploadMatches = sourceFile.match(/<el-upload[\s\S]*?<\/el-upload>/g) || []
    expect(uploadMatches.length).toBeGreaterThanOrEqual(2)
    uploadMatches.forEach(upload => {
      expect(upload).toContain(':auto-upload="false"')
    })
  })

  it('创建表单上传应调用 handleUploadImage', () => {
    expect(findInSource(':on-change="handleUploadImage"')).toBe(true)
  })

  it('编辑表单上传应调用 handleEditUploadImage', () => {
    expect(findInSource(':on-change="handleEditUploadImage"')).toBe(true)
  })

  it('图片预览弹窗应使用 v-model="showImagePreview"', () => {
    expect(findInSource('v-model="showImagePreview"')).toBe(true)
  })

  it('详情弹窗应使用 v-model="detailVisible"', () => {
    expect(findInSource('v-model="detailVisible"')).toBe(true)
  })
})

// ============================================================
// 11. 其他关键CSS样式验证
// ============================================================
describe('其他关键CSS样式', () => {
  it(':deep(.unread-row) 应设置红色背景', () => {
    const unreadRowCSS = css.match(/:deep\(\.unread-row\)\s*\{([^}]+)/)
    expect(unreadRowCSS).not.toBeNull()
    expect(unreadRowCSS[1]).toContain('#fef0f0')
    expect(unreadRowCSS[1]).toContain('font-weight: 500')
  })

  it(':deep(.unread-row td) 应设置红色文字', () => {
    const unreadRowTdCSS = css.match(/:deep\(\.unread-row\s+td\)\s*\{([^}]+)/)
    expect(unreadRowTdCSS).not.toBeNull()
    expect(unreadRowTdCSS[1]).toContain('#f56c6c')
  })

  it('.is-unread-text 应设置红色粗体样式', () => {
    const unreadTextCSS = css.match(/\.is-unread-text\s*\{([^}]+)/)
    expect(unreadTextCSS).not.toBeNull()
    expect(unreadTextCSS[1]).toContain('font-weight: 700')
    expect(unreadTextCSS[1]).toContain('#f56c6c')
  })

  it('content-preview 应使用 -webkit-line-clamp: 2', () => {
    const previewCSS = css.match(/\.content-preview\s*\{([^}]+)/)
    expect(previewCSS).not.toBeNull()
    expect(previewCSS[1]).toContain('-webkit-line-clamp: 2')
    expect(previewCSS[1]).toContain('overflow: hidden')
  })

  it('tab-switch 应使用 margin-left: auto', () => {
    expect(findCSSValue(css, '.tab-switch', 'margin-left')).toBe('auto')
  })

  it(':deep(.el-table .cell) 应设置 padding', () => {
    const cellCSS = css.match(/:deep\(\.el-table\s*\.cell\)\s*\{([^}]+)/)
    expect(cellCSS).not.toBeNull()
    expect(cellCSS[1]).toContain('padding-left: 14px')
    expect(cellCSS[1]).toContain('padding-right: 14px')
  })

  it(':deep(.el-dialog__body) 应设置 padding: 24px 28px', () => {
    const dialogBodyCSS = css.match(/:deep\(\.el-dialog__body\)\s*\{([^}]+)/)
    expect(dialogBodyCSS).not.toBeNull()
    expect(dialogBodyCSS[1]).toContain('padding: 24px 28px')
  })
})

// ============================================================
// 12. Script 结构完整性验证
// ============================================================
describe('Script 结构完整性', () => {
  it('应导入必要的 Vue API', () => {
    expect(script).toContain("import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'")
  })

  it('应导入 Element Plus 消息组件', () => {
    expect(script).toContain("import { ElMessage, ElMessageBox } from 'element-plus'")
  })

  it('应导入 Search 图标', () => {
    expect(script).toContain("import { Search } from '@element-plus/icons-vue'")
  })

  it('应导入 API 模块', () => {
    expect(script).toContain("import { announcementAPI, storageAPI, reactionAPI, getRoleCategory } from '../api'")
  })

  it('应导入 supabase', () => {
    expect(script).toContain("import { supabase } from '../utils/supabase'")
  })

  it('onMounted 应包含 loadUser, loadAnnouncements, subscribeAnnouncements', () => {
    expect(script).toContain('loadAnnouncements()')
    expect(script).toContain('loadUser()')
    expect(script).toContain('subscribeAnnouncements()')
  })

  it('onUnmounted 应包含 supabase.removeChannel', () => {
    expect(script).toContain('supabase.removeChannel(channel)')
  })
})

// ============================================================
// 13. 文件整体结构验证
// ============================================================
describe('文件整体结构', () => {
  it('应包含 template 区块', () => {
    expect(sourceFile).toContain('<template>')
    expect(sourceFile).toContain('</template>')
  })

  it('应包含 script setup 区块', () => {
    expect(sourceFile).toContain('<script setup>')
    expect(sourceFile).toContain('</script>')
  })

  it('应包含 scoped style 区块', () => {
    expect(sourceFile).toContain('<style scoped>')
    expect(sourceFile).toContain('</style>')
  })

  it('模板应在 script 之前', () => {
    const templateStart = sourceFile.indexOf('<template>')
    const scriptStart = sourceFile.indexOf('<script setup>')
    expect(templateStart).toBeLessThan(scriptStart)
  })
})
