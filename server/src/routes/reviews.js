/**
 * routes/reviews.js - 评价管理
 */
const express = require('express');
const router = express.Router();
const { Review, Coach, Booking } = require('../models/database');
const { authMiddleware } = require('../middleware/auth');

// 获取教练的评价列表
router.get('/coach/:coachId', (req, res) => {
  try {
    const { coachId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 获取评价列表
    const reviews = Review.findByCoachIdWithPagination(coachId, limit, offset);

    // 获取教练统计信息
    const stats = Review.getCoachStats(coachId);

    // 获取总评价数
    const totalResult = Review.countByCoachId(coachId);

    res.json({
      success: true,
      data: {
        reviews,
        stats: {
          ...stats,
          total: totalResult?.count || 0
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult?.count || 0,
          totalPages: Math.ceil((totalResult?.count || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取评价列表失败:', error);
    res.status(500).json({ success: false, message: '获取评价列表失败' });
  }
});

// 创建评价（需要登录）
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { coach_id, booking_id, rating, content, tags } = req.body;

    // 参数校验
    if (!coach_id || !rating) {
      return res.status(400).json({
        success: false,
        message: '教练ID和评分不能为空'
      });
    }

    // 评分范围检查
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: '评分必须在1-5之间'
      });
    }

    // 检查教练是否存在
    const coach = Coach.findById(coach_id);
    if (!coach) {
      return res.status(404).json({
        success: false,
        message: '教练不存在'
      });
    }

    // 检查用户是否已经评价过该教练（同一预约只能评价一次）
    if (booking_id) {
      const existingReview = Review.findByUserAndBooking(userId, booking_id);
      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: '该订单已评价'
        });
      }
    }

    // 检查用户是否已完成该预约（可选的验证）
    if (booking_id) {
      const booking = Booking.findById(booking_id);
      if (booking && booking.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权评价该预约'
        });
      }
    }

    // 创建评价
    const review = Review.create({
      user_id: userId,
      coach_id,
      booking_id: booking_id || null,
      rating,
      content: content || '',
      tags: tags ? JSON.stringify(tags) : null
    });

    res.json({
      success: true,
      message: '评价成功',
      data: {
        id: review.id,
        rating: review.rating,
        content: review.content
      }
    });
  } catch (error) {
    console.error('创建评价失败:', error);
    res.status(500).json({ success: false, message: '创建评价失败' });
  }
});

// 获取用户的评价列表
router.get('/user/me', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const reviews = Review.findByUserId(userId, limit, offset);
    const total = Review.countByUserId(userId);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total?.count || 0
        }
      }
    });
  } catch (error) {
    console.error('获取用户评价失败:', error);
    res.status(500).json({ success: false, message: '获取用户评价失败' });
  }
});

// 检查用户是否可以评价某教练
router.get('/check/:coachId', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { coachId } = req.params;

    // 获取该教练所有已完成的预约
    const bookings = Booking.findCompletedByUserAndCoach(userId, coachId);

    // 检查是否有未评价的预约
    const pendingBookings = bookings.filter(booking => {
      const review = Review.findByUserAndBooking(userId, booking.id);
      return !review;
    });

    res.json({
      success: true,
      data: {
        canReview: pendingBookings.length > 0,
        pendingBookings: pendingBookings.map(b => ({
          id: b.id,
          booking_date: b.booking_date,
          booking_time: b.booking_time,
          course_name: b.course_name
        }))
      }
    });
  } catch (error) {
    console.error('检查评价资格失败:', error);
    res.status(500).json({ success: false, message: '检查评价资格失败' });
  }
});

// 删除评价（仅能删除自己的评价）
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const review = Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: '评价不存在'
      });
    }

    if (review.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权删除该评价'
      });
    }

    Review.delete(id);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除评价失败:', error);
    res.status(500).json({ success: false, message: '删除评价失败' });
  }
});

module.exports = router;
