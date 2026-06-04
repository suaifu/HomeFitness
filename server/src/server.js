/**
 * 上门健身小程序后端服务 — 优化版：限流 + 日志 + 安全
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const { initDatabase, flushDatabase } = require('./models/database');

// ============ 限流器（内存实现，无需额外依赖）============
const rateLimiter = {
  _requests: new Map(),

  check(ip, windowMs, max) {
    const now = Date.now();
    const record = this._requests.get(ip);

    if (!record || now - record.startTime > windowMs) {
      this._requests.set(ip, { startTime: now, count: 1 });
      return false; // 未超限
    }

    record.count++;
    return record.count > max; // 是否超限
  },

  // 每分钟清理过期记录
  _cleanup() {
    const now = Date.now();
    for (const [ip, record] of this._requests) {
      if (now - record.startTime > 60000) {
        this._requests.delete(ip);
      }
    }
  }
};

setInterval(() => rateLimiter._cleanup(), 60000);

// ============ 请求日志 ============
function requestLogger(req, res, next) {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // 记录请求开始
  console.log(`→ [${requestId.substring(0, 8)}] ${req.method} ${req.originalUrl} ip=${req.ip}`);

  // 记录响应完成
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? '⚠' : '✓';
    console.log(`${level} [${requestId.substring(0, 8)}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
}

// ============ 限流中间件 ============
function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
  const max = parseInt(process.env.RATE_LIMIT_MAX) || 100;

  if (rateLimiter.check(ip, windowMs, max)) {
    return res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试'
    });
  }

  next();
}

// ============ 安全头 ============
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cache-Control', 'no-store'); // API 不缓存
  next();
}

// ============ 启动服务 ============
async function startServer() {
  // 初始化数据库
  await initDatabase();

  const app = express();

  // 信任代理（如果使用 nginx 等反向代理）
  app.set('trust proxy', 1);

  // 基础中间件
  app.use(securityHeaders);
  app.use(requestLogger);
  app.use(rateLimitMiddleware);
  app.use(cors({
    origin: '*', // 生产环境应限制为小程序域名
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 静态文件
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // 路由
  const authRoutes = require('./routes/auth');
  const homeRoutes = require('./routes/home');
  const coachRoutes = require('./routes/coaches');
  const bookingRoutes = require('./routes/bookings');
  const orderRoutes = require('./routes/orders');
  const userRoutes = require('./routes/user');
  const uploadRoutes = require('./routes/upload');
  const verifyRoutes = require('./routes/verify');
  const reviewRoutes = require('./routes/reviews');
  const favoriteRoutes = require('./routes/favorites');

  app.use('/api/auth', authRoutes);
  app.use('/api/auth', verifyRoutes); // 验证码相关路由
  app.use('/api/home', homeRoutes);
  app.use('/api/coaches', coachRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/favorites', favoriteRoutes);

  // 健康检查
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV
    });
  });

  // 404处理
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: '接口不存在',
      path: req.originalUrl
    });
  });

  // 全局错误处理
  app.use((err, req, res, next) => {
    console.error(`❌ [${req.requestId?.substring(0, 8) || 'unknown'}] Server error:`, err.message);

    // JWT 错误已在 auth 中间件处理，这里兜底
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({
        success: false,
        message: '请求体格式错误'
      });
    }

    if (err.type === 'entity.too.large') {
      return res.status(413).json({
        success: false,
        message: '请求数据过大'
      });
    }

    // 不暴露内部错误细节
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误',
      requestId: req.requestId
    });
  });

  // 启动服务器
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🏋️  上门健身小程序后端服务启动成功！              ║
║                                                   ║
║   📍 本地地址: http://localhost:${PORT}              ║
║   📍 健康检查: http://localhost:${PORT}/health      ║
║   🔒 限流: ${process.env.RATE_LIMIT_MAX || 100}次/分钟                          ║
║                                                   ║
║   📚 API文档:                                     ║
║   • GET  /api/home        - 首页数据              ║
║   • GET  /api/coaches     - 教练列表              ║
║   • POST /api/auth/login  - 用户登录              ║
║   • POST /api/bookings    - 创建预约              ║
║   • POST /api/orders      - 创建订单              ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch(console.error);
