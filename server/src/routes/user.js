/**
 * 用户相关路由 — 优化版：输入校验
 */
const express = require('express');
const router = express.Router();
const { User } = require('../models/database');
const { authMiddleware } = require('../middleware/auth');
const { success, error } = require('../middleware/response');

/**
 * GET /api/user/profile
 * 获取用户信息（需登录）
 */
router.get('/profile', authMiddleware, (req, res) => {
  try {
    const user = User.findById(req.userId);
    if (!user) {
      return error(res, '用户不存在', 404);
    }

    // 脱敏处理
    const safeUser = {
      id: user.id,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      phone: user.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : null,
      gender: user.gender,
      birthday: user.birthday,
      height: user.height,
      weight: user.weight,
      fitness_goal: user.fitness_goal,
      health_condition: user.health_condition,
      created_at: user.created_at
    };

    return success(res, safeUser, '获取成功');
  } catch (err) {
    console.error('Get profile error:', err);
    return error(res, '获取用户信息失败', 500);
  }
});

/**
 * PUT /api/user/profile
 * 更新用户信息（需登录）
 */
router.put('/profile', authMiddleware, (req, res) => {
  try {
    const { nickname, avatar_url, phone, gender, birthday, height, weight, fitness_goal, health_condition } = req.body;

    // 输入校验
    if (nickname && (typeof nickname !== 'string' || nickname.length > 30)) {
      return error(res, '昵称长度不能超过30个字符', 400);
    }

    if (phone && !/^1\d{10}$/.test(phone)) {
      return error(res, '手机号格式错误', 400);
    }

    if (gender !== undefined && ![0, 1, 2].includes(gender)) {
      return error(res, '性别参数错误', 400);
    }

    if (height !== undefined && (typeof height !== 'number' || height < 50 || height > 300)) {
      return error(res, '身高数据异常', 400);
    }

    if (weight !== undefined && (typeof weight !== 'number' || weight < 20 || weight > 500)) {
      return error(res, '体重数据异常', 400);
    }

    const updatedUser = User.update(req.userId, {
      nickname: nickname?.trim(),
      avatar_url,
      phone,
      gender,
      birthday,
      height,
      weight,
      fitness_goal,
      health_condition
    });

    return success(res, {
      id: updatedUser.id,
      nickname: updatedUser.nickname,
      avatar_url: updatedUser.avatar_url,
      phone: updatedUser.phone
    }, '更新成功');
  } catch (err) {
    console.error('Update profile error:', err);
    return error(res, '更新用户信息失败', 500);
  }
});

/**
 * POST /api/user/phone
 * 绑定手机号（需登录）
 */
router.post('/phone', authMiddleware, (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return error(res, '验证码不能为空', 400);
    }

    // TODO: 实际项目中需要用 code 调用微信接口换取手机号
    // const phone = await getPhoneFromWx(code);

    return success(res, null, '手机号绑定成功（演示模式）');
  } catch (err) {
    console.error('Bind phone error:', err);
    return error(res, '绑定手机号失败', 500);
  }
});

module.exports = router;
