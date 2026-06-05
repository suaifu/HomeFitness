# 贡献指南

感谢你对 HomeFitness 项目的关注！欢迎提交 Issue 和 Pull Request。

## 开发环境搭建

### 前置要求

- Node.js >= 18
- 微信开发者工具（最新稳定版）
- Git

### 后端

```bash
cd server
npm install
cp .env.example .env
# 编辑 .env 填入开发配置
npm run dev
```

### 前端

1. 用微信开发者工具打开 `client/` 目录
2. 修改 `client/app.js` 中的 `apiBaseUrl` 指向本地后端
3. 勾选「不校验合法域名」
4. 编译运行

## 代码规范

### 通用

- 缩进：2 空格
- 文件编码：UTF-8
- 换行符：LF（Unix 风格）
- 无 `console.log` 调试代码残留

### 前端（微信小程序）

- 页面目录结构：`pages/{module}/{page}/{page}.js|json|wxml|wxss`
- 组件使用 `Component()` 构造器，属性使用 `properties`，事件使用 `triggerEvent`
- `setData` 调用尽量合并，减少跨线程通信次数
- 图片资源放在 `images/` 目录，使用 WebP 格式优先

### 后端（Express）

- 路由文件放在 `src/routes/`，模型放在 `src/models/`
- API 路径统一前缀 `/api/`
- 错误处理使用统一格式：`{ code: number, message: string }`
- 环境变量通过 `.env` 管理，新增变量需同步更新 `.env.example`

## Git 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <subject>

<body>
```

### Type

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构（非新功能/修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/配置变更 |

### Scope

| Scope | 说明 |
|-------|------|
| `client` | 微信小程序前端 |
| `server` | Express 后端 |
| `ci` | CI/CD 配置 |
| `docs` | 文档 |

### 示例

```
feat(client): 添加教练收藏功能
fix(server): 修复 JWT_SECRET 含 # 号时解析错误
docs: 更新 API 文档
chore(ci): 添加 GitHub Actions CI 配置
```

## PR 流程

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feat/your-feature`
3. 提交变更：遵循上述提交规范
4. 推送到你的 Fork：`git push origin feat/your-feature`
5. 在本仓库创建 Pull Request
6. 等待 CI 通过和 Code Review

### PR 检查清单

- [ ] 代码风格与项目一致
- [ ] 无调试代码残留（`console.log`、注释掉的代码）
- [ ] 敏感信息未提交（密钥、Token、真实 AppID 等）
- [ ] `.env.example` 已同步更新（如有新环境变量）
- [ ] 本地已测试通过

## Issue 规范

- Bug 报告：使用 Bug Report 模板，包含复现步骤和环境信息
- 功能建议：使用 Feature Request 模板，描述使用场景和期望方案

## 许可证

提交代码即表示你同意以 MIT 许可证授权你的贡献。
