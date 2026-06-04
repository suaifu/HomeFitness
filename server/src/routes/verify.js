/**
 * 验证码路由 — 手机验证码登录服务
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { User } = require('../models/database');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { success, error } = require('../middleware/response');

// 验证码存储（生产环境应使用 Redis）
const _verifyCodes = new Map();

// 清理过期验证码（10分钟过期）
setInterval(() => {
  const now = Date.now();
  for (const [phone, record] of _verifyCodes) {
    if (now - record.createdAt > 10 * 60 * 1000) {
      _verifyCodes.delete(phone);
    }
  }
}, 60000);

/**
 * POST /api/auth/sendCode
 * 发送验证码
 */
router.post('/sendCode', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return error(res, '请输入正确的手机号', 400);
    }

    // 频率限制：同一手机号60秒内只能发送一次
    const record = _verifyCodes.get(phone);
    if (record && Date.now() - record.createdAt < 60000) {
      const remaining = Math.ceil((60000 - (Date.now() - record.createdAt)) / 1000);
      return error(res, `请${remaining}秒后再次获取`, 429);
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 存储验证码
    _verifyCodes.set(phone, {
      code,
      createdAt: Date.now(),
      attempts: 0
    });

    // TODO: 实际项目中调用短信服务发送验证码
    // 常见服务商：阿里云、腾讯云、七牛云等
    // await sendSMS(phone, code);

    console.log(`[验证码] 手机号: ${phone}, 验证码: ${code}`);

    // 开发环境返回验证码，方便测试
    if (process.env.NODE_ENV === 'development') {
      return success(res, { code }, '验证码已发送');
    }

    return success(res, null, '验证码已发送');
  } catch (err) {
    console.error('Send code error:', err);
    return error(res, '发送失败，请重试', 500);
  }
});

/**
 * POST /api/auth/verifyCode
 * 验证验证码并登录
 */
router.post('/verifyCode', async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return error(res, '请输入正确的手机号', 400);
    }

    if (!code || !/^\d{6}$/.test(code)) {
      return error(res, '请输入6位验证码', 400);
    }

    // 验证验证码
    const record = _verifyCodes.get(phone);
    if (!record) {
      return error(res, '验证码已过期，请重新获取', 400);
    }

    if (Date.now() - record.createdAt > 10 * 60 * 1000) {
      _verifyCodes.delete(phone);
      return error(res, '验证码已过期，请重新获取', 400);
    }

    if (record.code !== code) {
      record.attempts++;
      if (record.attempts >= 3) {
        _verifyCodes.delete(phone);
        return error(res, '验证码错误次数过多，请重新获取', 400);
      }
      return error(res, '验证码错误', 400);
    }

    // 验证成功，删除验证码
    _verifyCodes.delete(phone);

    // 查找或创建用户
    let user = User.findByPhone(phone);
    if (!user) {
      user = User.create({
        phone,
        nickname: `用户${phone.slice(-4)}`,
        avatar_url: null
      });
    }

    // 生成 token
    const token = generateToken(user.id);

    return success(res, {
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        phone: user.phone
      }
    }, '登录成功');
  } catch (err) {
    console.error('Verify code error:', err);
    return error(res, '验证失败，请重试', 500);
  }
});

/**
 * POST /api/auth/phoneLogin
 * 微信手机号登录（通过微信获取手机号）
 */
router.post('/phoneLogin', async (req, res) => {
  try {
    const { code, nickname, avatar_url } = req.body;

    if (!code) {
      return error(res, '缺少微信授权码', 400);
    }

    // TODO: 实际项目中用 code 调用微信接口换取手机号
    // const wxResult = await axios.post('https://api.weixin.qq.com/wxa/business/getuserphonenumber', {
    //   code
    // }, {
    //   headers: { 'Content-Type': 'application/json' }
    // });
    // const phoneInfo = wxResult.data.phone_info;
    // const phone = phoneInfo.phoneNumber;

    // 模拟返回（开发环境）
    const phone = '13800000000';

    // 查找或创建用户
    let user = User.findByPhone(phone);
    if (!user) {
      user = User.create({
        phone,
        nickname: nickname || '微信用户',
        avatar_url: avatar_url || null
      });
    }

    // 生成 token
    const token = generateToken(user.id);

    return success(res, {
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        phone: user.phone
      }
    }, '登录成功');
  } catch (err) {
    console.error('Phone login error:', err);
    return error(res, '登录失败，请重试', 500);
  }
});

/**
 * GET /api/auth/checkPhone/:phone
 * 检查手机号是否已注册
 */
router.get('/checkPhone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return error(res, '请输入正确的手机号', 400);
    }

    const user = User.findByPhone(phone);
    return success(res, { registered: !!user }, '查询成功');
  } catch (err) {
    console.error('Check phone error:', err);
    return error(res, '查询失败', 500);
  }
});

module.exports = router;
