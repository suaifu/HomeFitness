// routes/favorites.js - 收藏管理路由
const express = require('express');
const router = express.Router();
const { Favorite, Coach } = require('../models/database');
const { authMiddleware } = require('../middleware/auth');
const { success, error } = require('../middleware/response');

// 获取用户收藏列表
router.get('/', authMiddleware, (req, res) => {
  try {
    const favorites = Favorite.findByUserId(req.userId);
    return success(res, { list: favorites, total: favorites.length });
  } catch (err) {
    console.error('获取收藏列表失败:', err);
    return error(res, '获取收藏列表失败', 500);
  }
});

// 添加收藏
router.post('/:coachId', authMiddleware, (req, res) => {
  try {
    const coachId = parseInt(req.params.coachId);
    if (!coachId) return error(res, '无效的教练ID', 400);

    const coach = Coach.findById(coachId);
    if (!coach) return error(res, '教练不存在', 404);

    if (Favorite.isFavorited(req.userId, coachId)) {
      return success(res, { favorited: true }, '已收藏');
    }

    Favorite.add(req.userId, coachId);
    return success(res, { favorited: true }, '收藏成功');
  } catch (err) {
    console.error('添加收藏失败:', err);
    return error(res, '添加收藏失败', 500);
  }
});

// 取消收藏
router.delete('/:coachId', authMiddleware, (req, res) => {
  try {
    const coachId = parseInt(req.params.coachId);
    if (!coachId) return error(res, '无效的教练ID', 400);

    if (!Favorite.isFavorited(req.userId, coachId)) {
      return success(res, { favorited: false }, '未收藏');
    }

    Favorite.remove(req.userId, coachId);
    return success(res, { favorited: false }, '取消收藏成功');
  } catch (err) {
    console.error('取消收藏失败:', err);
    return error(res, '取消收藏失败', 500);
  }
});

// 检查是否已收藏
router.get('/check/:coachId', authMiddleware, (req, res) => {
  try {
    const coachId = parseInt(req.params.coachId);
    if (!coachId) return error(res, '无效的教练ID', 400);

    const favorited = Favorite.isFavorited(req.userId, coachId);
    return success(res, { favorited });
  } catch (err) {
    console.error('检查收藏状态失败:', err);
    return error(res, '检查收藏状态失败', 500);
  }
});

module.exports = router;
