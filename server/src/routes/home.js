/**
 * 首页数据路由
 */
const express = require('express');
const router = express.Router();
const { Category, Banner, Coach } = require('../models/database');
const { success, error } = require('../middleware/response');

/**
 * GET /api/home
 * 获取首页数据（无需登录）
 */
router.get('/', (req, res) => {
  try {
    // 获取分类
    const categories = Category.findAll();
    
    // 获取轮播图
    const banners = Banner.findAll();
    
    // 获取热门教练（订单数最多的4个）
    const featuredCoaches = Coach.findAll({}).slice(0, 4);

    return success(res, {
      categories,
      banners,
      featuredCoaches
    }, '获取成功');
  } catch (err) {
    console.error('Get home data error:', err);
    return error(res, '获取首页数据失败', 500);
  }
});

/**
 * GET /api/categories
 * 获取分类列表（无需登录）
 */
router.get('/categories', (req, res) => {
  try {
    const categories = Category.findAll();
    return success(res, categories, '获取成功');
  } catch (err) {
    console.error('Get categories error:', err);
    return error(res, '获取分类失败', 500);
  }
});

/**
 * GET /api/banners
 * 获取轮播图列表（无需登录）
 */
router.get('/banners', (req, res) => {
  try {
    const banners = Banner.findAll();
    return success(res, banners, '获取成功');
  } catch (err) {
    console.error('Get banners error:', err);
    return error(res, '获取轮播图失败', 500);
  }
});

module.exports = router;
