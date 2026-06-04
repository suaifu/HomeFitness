/**
 * 教练相关路由 — 优化版：统一响应 + 输入校验 + 评价接口
 */
const express = require('express');
const router = express.Router();
const { Coach, Review } = require('../models/database');
const { success, error, paginate } = require('../middleware/response');

/**
 * GET /api/coaches
 * 获取教练列表
 */
router.get('/', (req, res) => {
  try {
    const { category, keyword, sortBy, page = 1, pageSize = 20 } = req.query;

    // 输入校验
    const pPage = Math.max(1, parseInt(page) || 1);
    const pPageSize = Math.min(50, Math.max(1, parseInt(pageSize) || 20));
    const validSortBy = ['rating', 'orders', 'price_asc', 'price_desc'].includes(sortBy) ? sortBy : undefined;

    const coaches = Coach.findAll({
      category: category?.trim(),
      keyword: keyword?.trim(),
      sortBy: validSortBy
    });

    // 分页
    const start = (pPage - 1) * pPageSize;
    const paginatedCoaches = coaches.slice(start, start + pPageSize);

    // 解析 specialty 为数组
    const processedCoaches = paginatedCoaches.map(coach => ({
      ...coach,
      specialtyList: coach.specialty ? coach.specialty.split(',') : []
    }));

    return paginate(res, processedCoaches, coaches.length, pPage, pPageSize);
  } catch (err) {
    console.error('Get coaches error:', err);
    return error(res, '获取教练列表失败', 500);
  }
});

/**
 * GET /api/coaches/:id
 * 获取教练详情
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // 校验 id 为正整数
    if (!/^\d+$/.test(id)) {
      return error(res, '无效的教练ID', 400);
    }

    const coach = Coach.findById(parseInt(id));
    if (!coach) {
      return error(res, '教练不存在', 404);
    }

    const courses = Coach.getCourses(parseInt(id));
    const reviews = Coach.getReviews(parseInt(id));

    // 解析 specialty 为数组
    const processedCoach = {
      ...coach,
      specialtyList: coach.specialty ? coach.specialty.split(',') : [],
      certificatesList: coach.certificates ? coach.certificates.split(',') : []
    };

    return success(res, {
      coach: processedCoach,
      courses,
      reviews
    }, '获取成功');
  } catch (err) {
    console.error('Get coach detail error:', err);
    return error(res, '获取教练详情失败', 500);
  }
});

/**
 * GET /api/coaches/:id/reviews
 * 获取教练评价
 */
router.get('/:id/reviews', (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return error(res, '无效的教练ID', 400);
    }

    const reviews = Review.findByCoachId(parseInt(id));
    return success(res, reviews, '获取成功');
  } catch (err) {
    console.error('Get reviews error:', err);
    return error(res, '获取评价失败', 500);
  }
});

module.exports = router;
