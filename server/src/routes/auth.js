/**
 * 认证路由 — 优化版：更安全的 Token 刷新
 */
const express = require('express');
const router = express.Router();
const { User } = require('../models/database');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { success, error } = require('../middleware/response');

/**
 * POST /api/auth/login
 * 微信登录
 */
router.post('/login', async (req, res) => {
  try {
    const { code, nickname, avatar_url } = req.body;

    if (!code) {
      return error(res, '登录凭证不能为空', 400);
    }

    // TODO: 实际项目中需要用 code 调用微信接口换取 openid
    // const wxResult = await axios.get(`https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${code}&grant_type=authorization_code`);
    // const openid = wxResult.data.openid;
    const openid = `openid_${code}`;

    // 查找或创建用户
    let user = User.findByOpenid(openid);

    if (!user) {
      user = User.create({
        openid,
        nickname: nickname || '新用户',
        avatar_url: avatar_url || null
      });
    } else {
      // 更新用户信息（如果提供了新的昵称和头像）
      if (nickname || avatar_url) {
        user = User.update(user.id, {
          nickname: nickname || user.nickname,
          avatar_url: avatar_url || user.avatar_url
        });
      }
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
    console.error('Login error:', err);
    return error(res, '登录失败，请重试', 500);
  }
});

/**
 * POST /api/auth/refresh
 * 刷新Token — 需要验证旧 Token（更安全）
 */
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    // authMiddleware 已验证旧 token 并设置了 req.userId
    const user = User.findById(req.userId);
    if (!user) {
      return error(res, '用户不存在', 404);
    }

    const token = generateToken(user.id);

    return success(res, {
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar_url: user.avatar_url
      }
    }, 'Token已刷新');
  } catch (err) {
    console.error('Refresh error:', err);
    return error(res, '刷新失败', 500);
  }
});

module.exports = router;
