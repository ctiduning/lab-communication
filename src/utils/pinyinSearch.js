/**
 * 拼音模糊搜索工具
 * 支持：中文姓名、拼音全拼、拼音首字母、部门、角色名、工号、电话、邮箱
 * 例如：输入 "jw" 能匹配 "姜伟"，输入 "液相" 能匹配液相组所有人
 */
import { pinyin } from 'pinyin-pro'

/**
 * 为用户对象预计算搜索关键词
 * @param {Object} user - 用户对象，需有 name, department, role 等字段
 * @param {Object} roleNameMap - 角色英文名到中文名的映射
 * @returns {Object} 带有 _searchKeys 的用户对象
 */
export function buildSearchKeys(user, roleNameMap = {}) {
  const name = user.name || ''
  const dept = user.department || ''
  const region = user.region || ''
  const roleName = roleNameMap[user.role] || user.role || ''

  // 拼音首字母（如 "姜伟" → "jw"）
  const pinyinInitial = pinyin(name, { pattern: 'first', toneType: 'none' }).toLowerCase().replace(/\s/g, '')
  // 拼音全拼（如 "姜伟" → "jiangwei"）
  const pinyinFull = pinyin(name, { pattern: 'pinyin', toneType: 'none' }).toLowerCase().replace(/\s/g, '')

  // 部门拼音
  const deptPinyinInitial = pinyin(dept, { pattern: 'first', toneType: 'none' }).toLowerCase().replace(/\s/g, '')
  const deptPinyinFull = pinyin(dept, { pattern: 'pinyin', toneType: 'none' }).toLowerCase().replace(/\s/g, '')

  // 角色名拼音
  const rolePinyinInitial = pinyin(roleName, { pattern: 'first', toneType: 'none' }).toLowerCase().replace(/\s/g, '')
  const rolePinyinFull = pinyin(roleName, { pattern: 'pinyin', toneType: 'none' }).toLowerCase().replace(/\s/g, '')

  // 地区拼音
  const regionPinyinInitial = pinyin(region, { pattern: 'first', toneType: 'none' }).toLowerCase().replace(/\s/g, '')
  const regionPinyinFull = pinyin(region, { pattern: 'pinyin', toneType: 'none' }).toLowerCase().replace(/\s/g, '')

  return {
    ...user,
    _searchKeys: {
      name,                    // 姜伟
      nameLower: name.toLowerCase(),
      pinyinInitial,           // jw
      pinyinFull,              // jiangwei
      dept,                    // 液相组
      deptLower: dept.toLowerCase(),
      deptPinyinInitial,       // yxz
      deptPinyinFull,          // yexiangzu
      roleName,                // 检测组长
      roleNameLower: roleName.toLowerCase(),
      rolePinyinInitial,       // jczz
      rolePinyinFull,          // jiancexuzhang
      region,                  // 青岛
      regionPinyinInitial,     // qd
      regionPinyinFull,        // qingdao
      // 新增字段
      employeeId: (user.employee_id || '').toLowerCase(),
      phone: user.phone || '',
      email: (user.email || '').toLowerCase(),
      deptLevel1: (user.department_level1 || '').toLowerCase(),
      deptLevel2: (user.department_level2 || '').toLowerCase(),
      deptLevel3: (user.department_level3 || '').toLowerCase(),
    }
  }
}

/**
 * 模糊+拼音匹配（增强版）
 * @param {string} query - 用户输入的搜索词
 * @param {Object} searchKeys - 预计算的搜索关键词
 * @returns {boolean} 是否匹配
 */
export function matchUser(query, searchKeys) {
  if (!query) return true
  const q = query.trim().toLowerCase()
  if (!q) return true

  const s = searchKeys

  // 1. 中文名称包含匹配
  if (s.nameLower.includes(q)) return true
  if (s.deptLower.includes(q)) return true
  if (s.roleNameLower.includes(q)) return true

  // 2. 拼音首字母前缀匹配（输入 "jw" 匹配 "jw"，输入 "j" 匹配 "jw"）
  if (s.pinyinInitial.startsWith(q)) return true
  if (s.deptPinyinInitial.startsWith(q)) return true
  if (s.rolePinyinInitial.startsWith(q)) return true

  // 3. 拼音全拼前缀匹配（输入 "jiang" 匹配 "jiangwei"）
  if (s.pinyinFull.startsWith(q)) return true
  if (s.deptPinyinFull.startsWith(q)) return true
  if (s.rolePinyinFull.startsWith(q)) return true

  // 4. 拼音全拼包含匹配（输入 "wei" 匹配 "jiangwei"）
  if (s.pinyinFull.includes(q)) return true
  if (s.deptPinyinFull.includes(q)) return true
  if (s.rolePinyinFull.includes(q)) return true

  // 5. 地区匹配
  if (s.region.toLowerCase().includes(q)) return true
  if (s.regionPinyinInitial.startsWith(q)) return true
  if (s.regionPinyinFull.startsWith(q)) return true

  // 6. 工号匹配（支持模糊）
  if (s.employeeId.includes(q)) return true

  // 7. 电话匹配
  if (s.phone.includes(q)) return true

  // 8. 邮箱匹配
  if (s.email.includes(q)) return true

  // 9. 部门级别匹配
  if (s.deptLevel1.includes(q)) return true
  if (s.deptLevel2.includes(q)) return true
  if (s.deptLevel3.includes(q)) return true

  return false
}

/**
 * 过滤用户列表（按搜索词）
 * @param {string} query - 搜索词
 * @param {Array} users - 带 _searchKeys 的用户列表
 * @returns {Array} 匹配的用户列表
 */
export function filterUsers(query, users) {
  if (!query) return users
  return users.filter(u => u._searchKeys && matchUser(query, u._searchKeys))
}

/**
 * 过滤分组用户列表
 * @param {string} query - 搜索词
 * @param {Array} groups - 分组列表 [{ label, users }]
 * @returns {Array} 过滤后的分组列表（空组被移除）
 */
export function filterGroups(query, groups) {
  if (!query) return groups
  return groups
    .map(g => ({
      ...g,
      users: g.users.filter(u => u._searchKeys && matchUser(query, u._searchKeys))
    }))
    .filter(g => g.users.length > 0)
}
