# 实验室沟通小程序 - 项目笔记

## 项目基本信息
- 项目路径: `/d/game/实验室沟通/frontend`
- 线上地址: https://ctiduning.github.io/lab-communication/
- GitHub: https://github.com/ctiduning/lab-communication
- 技术栈: Vue 3 + Element Plus + Supabase
- 部署方式: GitHub Actions 自动部署

## 关键Bug修复记录
1. **通讯录为空**: Organization.vue 中 `loadUsers()` 需要单 `.order('name')`，不能用多个链式 `.order()`
2. **接收人重复**: BusinessInitiate.vue/LabInitiate.vue 需使用 Map 去重（因 ROLE_OPTIONS 含中英文角色值）
3. **角色名兼容**: 数据库 role 字段是中文（如'检测组长'），多处代码需同时匹配中英文
4. **部门分组**: 使用 `department_level3 || department_level2 || department_level1` 而非旧的 `region`/`department`

## 部署要点
- GitHub Actions 工作流在 `.github/workflows/deploy.yml`
- GitHub Pages 需配置为 "GitHub Actions" 源，而非 "Deploy from a branch"
- 手动部署命令：`npm run build && git push origin main`
- .gitignore 需要添加 `dist` 避免构建产物被跟踪
