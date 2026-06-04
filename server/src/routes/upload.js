/**
 * 上传路由 — 微信小程序图片上传服务
 * 支持：用户头像、教练头像、资质证书等
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { success, error } = require('../middleware/response');

// 确保上传目录存在
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
const COACH_DIR = path.join(UPLOAD_DIR, 'coaches');
const CERT_DIR = path.join(UPLOAD_DIR, 'certificates');

[UPLOAD_DIR, AVATAR_DIR, COACH_DIR, CERT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type || 'misc';
    let dest = UPLOAD_DIR;
    switch (type) {
      case 'avatar': dest = AVATAR_DIR; break;
      case 'coach': dest = COACH_DIR; break;
      case 'cert': dest = CERT_DIR; break;
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPG、PNG、WebP 格式的图片'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 限制
    files: 1
  }
});

/**
 * POST /api/upload/:type
 * 上传文件（需登录）
 * type: avatar | coach | cert
 */
router.post('/:type', authMiddleware, (req, res, next) => {
  const { type } = req.params;
  const allowedTypes = ['avatar', 'coach', 'cert'];
  
  if (!allowedTypes.includes(type)) {
    return error(res, '无效的上传类型', 400);
  }

  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return error(res, '文件大小不能超过5MB', 400);
      }
      return error(res, err.message || '上传失败', 400);
    }

    if (!req.file) {
      return error(res, '请选择要上传的文件', 400);
    }

    // 返回访问 URL
    const fileUrl = `/uploads/${type}s/${req.file.filename}`;
    
    success(res, {
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    }, '上传成功');
  });
});

/**
 * POST /api/upload/wechat/:type
 * 微信云存储上传（无需服务器存储，直接返回云URL）
 * 注意：生产环境应使用微信云开发或COS
 */
router.post('/wechat/:type', authMiddleware, async (req, res) => {
  try {
    const { type } = req.params;
    const { file_id, temp_url } = req.body;

    if (!file_id && !temp_url) {
      return error(res, '缺少文件参数', 400);
    }

    // 实际项目中，这里应该：
    // 1. 从微信云存储获取文件
    // 2. 或上传到自己的OSS/COS
    // 3. 返回永久可访问的URL

    // 这里返回模拟URL（实际项目需要真实上传）
    const mockUrl = temp_url || `https://cdn.fitness.com/${type}/${file_id || uuidv4()}.jpg`;
    
    success(res, {
      url: mockUrl,
      file_id: file_id || uuidv4()
    }, '获取成功');
  } catch (err) {
    console.error('WeChat upload error:', err);
    return error(res, '上传失败', 500);
  }
});

/**
 * DELETE /api/upload/:filename
 * 删除上传的文件（需登录）
 */
router.delete('/:filename(*)', authMiddleware, (req, res) => {
  try {
    const { filename } = req.params;
    
    // 安全检查：只允许删除 uploads 目录下的文件
    const safePath = path.join(UPLOAD_DIR, filename);
    if (!safePath.startsWith(UPLOAD_DIR)) {
      return error(res, '无效的文件路径', 400);
    }

    if (fs.existsSync(safePath)) {
      fs.unlinkSync(safePath);
      return success(res, null, '删除成功');
    } else {
      return error(res, '文件不存在', 404);
    }
  } catch (err) {
    console.error('Delete file error:', err);
    return error(res, '删除失败', 500);
  }
});

module.exports = router;
