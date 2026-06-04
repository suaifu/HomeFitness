# 🏋️ HomeFitness - 上门健身微信小程序

专业教练上门健身服务的微信小程序，包含用户端和后端服务。

## 项目结构

```
HomeFitness/          # 微信小程序前端
HomeFitness-server/   # Express 后端服务
```

## 功能特性

- 🏠 **首页** — 轮播图、健身分类、热门教练推荐、位置定位
- 🏋️ **教练** — 教练列表/详情、分类筛选、关键词搜索、日历选日期预约
- 📋 **订单** — 预约确认、微信支付、订单管理、取消订单
- 👤 **我的** — 个人中心、预约管理、收藏教练、地址管理、优惠券
- ⭐ **评价** — 教练评分评价、星级组件
- 🔔 **订阅消息** — 预约提醒通知
- 🔒 **隐私合规** — 隐私授权弹窗、用户协议、数据加密

## 技术栈

### 前端（微信小程序）
- 原生 WXML / WXSS / JS
- 分包加载（主包 6 页 + user-center 子包 7 页 + extra 子包 7 页）
- 自定义组件：Calendar、CoachCard、StarRating、PrivacyPopup、SharePoster 等
- 请求层封装：离线检测 + 自动重试 + 环境切换 + Token 自动刷新 + 请求缓存

### 后端（Node.js）
- Express + sql.js（纯 JS SQLite，零外部数据库依赖）
- JWT 认证 + Token 刷新
- 限流、CORS、文件上传（multer）
- 10 个 API 模块：auth、home、coaches、bookings、orders、user、upload、verify、reviews、favorites

## 快速开始

### 前端

1. 用微信开发者工具打开 `HomeFitness/` 目录
2. AppID 已配置：`wxf423febad486ea40`
3. 修改 `app.js` 中的 API 地址：
   - 开发环境：`http://localhost:3000`
   - 生产环境：替换为你的域名

### 后端

```bash
cd HomeFitness-server

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入真实配置

# 启动服务
npm start
# 或开发模式
npm run dev
```

服务启动后访问 `http://localhost:3000/health` 验证。

### 种子数据

后端首次启动自动创建以下种子数据：
- 4 位教练（含头像、专长、资质）
- 6 个健身分类
- 3 张轮播图
- 8 门课程

## API 概览

| 模块 | 端点 | 说明 |
|------|------|------|
| 首页 | `GET /api/home` | 轮播图 + 分类 + 热门教练 |
| 教练 | `GET /api/coaches` | 列表（支持搜索、分类、排序） |
| 教练 | `GET /api/coaches/:id` | 详情 + 课程 + 评价 |
| 认证 | `POST /api/auth/login` | 微信登录 |
| 预约 | `POST /api/bookings` | 创建预约 |
| 订单 | `POST /api/orders` | 创建订单 |
| 订单 | `POST /api/orders/:id/pay` | 发起支付 |
| 收藏 | `POST /api/favorites/:coachId` | 添加收藏 |
| 评价 | `POST /api/reviews` | 提交评价 |
| 文件 | `POST /api/upload` | 图片上传 |

## 上线前检查清单

- [ ] 后端部署到生产环境（HTTPS）
- [ ] API 域名配置到微信小程序后台
- [ ] 替换 `.env` 中的 JWT_SECRET 和微信配置
- [ ] 申请微信支付商户号并配置
- [ ] 申请订阅消息模板 ID
- [ ] 申请腾讯地图 Key（首页逆地理编码）
- [ ] 替换占位图片为真实素材
- [ ] 域名白名单配置（request 合法域名）

## License

MIT
