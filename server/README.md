# 上门健身小程序后端服务

基于 Node.js + Express + SQLite 的后端服务

## 快速开始

### 1. 安装依赖

```bash
cd HomeFitness-server
npm install
```

### 2. 启动服务

```bash
npm start
```

服务启动后会监听 http://localhost:3000

### 3. 开发模式（自动重启）

```bash
npm run dev
```

## 接口文档

### 认证模块 `/api/auth`

| 接口 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `/api/auth/login` | POST | 微信登录 | code, nickname, avatar_url |
| `/api/auth/refresh` | POST | 刷新Token | userId |

### 首页模块 `/api/home`

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/home` | GET | 获取首页数据（分类+轮播图+热门教练） |
| `/api/home/categories` | GET | 获取分类列表 |
| `/api/home/banners` | GET | 获取轮播图列表 |

### 教练模块 `/api/coaches`

| 接口 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `/api/coaches` | GET | 获取教练列表 | category, keyword, sortBy, page, pageSize |
| `/api/coaches/:id` | GET | 获取教练详情 | - |

### 预约模块 `/api/bookings`（需登录）

| 接口 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `/api/bookings` | GET | 获取预约列表 | status |
| `/api/bookings` | POST | 创建预约 | coach_id, booking_date, booking_time, address, contact_phone |
| `/api/bookings/:id` | GET | 获取预约详情 | - |
| `/api/bookings/:id/cancel` | PUT | 取消预约 | - |

### 订单模块 `/api/orders`（需登录）

| 接口 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `/api/orders` | GET | 获取订单列表 | status |
| `/api/orders` | POST | 创建订单 | booking_id, amount |
| `/api/orders/:id` | GET | 获取订单详情 | - |
| `/api/orders/:id/pay` | POST | 发起支付 | - |
| `/api/orders/pay/callback` | POST | 支付回调 | - |

### 用户模块 `/api/user`（需登录）

| 接口 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `/api/user/profile` | GET | 获取用户信息 | - |
| `/api/user/profile` | PUT | 更新用户信息 | nickname, phone, gender... |
| `/api/user/phone` | POST | 绑定手机号 | code |

## 数据库

使用 SQLite 数据库，文件位于 `data/homefitness.db`

首次启动会自动创建表和种子数据：
- 6 个健身分类
- 3 张轮播图
- 4 名教练
- 每位教练 2 门课程

## 微信小程序配置

### 1. 获取本机局域网IP

```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### 2. 修改小程序 `app.js`

将 `apiBaseUrl` 改为你的局域网IP：

```javascript
apiBaseUrl: 'http://192.168.x.x:3000'
```

### 3. 微信开发者工具配置

在「详情」→「本地设置」中：
- ✅ 勾选「不校验合法域名」
- ✅ 勾选「不校验 HTTPS 证书」

### 4. 信任局域网调试

在微信开发者工具中：
- 点击「详情」
- 勾选「勾选后可真机调试该开发助手」
- 重新编译

## 环境变量

创建 `.env` 文件：

```env
PORT=3000
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
WECHAT_APPID=your-appid
WECHAT_MCHID=your-mchid
WECHAT_API_KEY=your-api-key
WECHAT_NOTIFY_URL=http://your-domain.com/api/orders/pay/callback
DATABASE_PATH=./data/homefitness.db
```

## 生产部署

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Nginx 反向代理

```nginx
server {
    listen 443 ssl;
    server_name api.fitness.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 技术栈

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: SQLite 3 (better-sqlite3)
- **Auth**: JWT (jsonwebtoken)
- **WeChat Pay**: 微信支付 v3 API
