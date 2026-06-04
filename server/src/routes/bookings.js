/**
 * 预约相关路由 — 优化版：时间冲突检测 + 输入校验
 */
const express = require('express');
const router = express.Router();
const { Booking, Coach } = require('../models/database');
const { authMiddleware } = require('../middleware/auth');
const { success, error } = require('../middleware/response');

/**
 * POST /api/bookings
 * 创建预约（需登录）
 */
router.post('/', authMiddleware, (req, res) => {
  try {
    const { coach_id, course_id, booking_date, booking_time, address, contact_name, contact_phone, remark } = req.body;

    // 参数校验
    if (!coach_id || !booking_date || !booking_time || !address || !contact_phone) {
      return error(res, '缺少必要参数（coach_id, booking_date, booking_time, address, contact_phone）', 400);
    }

    // 日期格式校验
    if (!/^\d{4}-\d{2}-\d{2}$/.test(booking_date)) {
      return error(res, '日期格式错误，应为 YYYY-MM-DD', 400);
    }

    // 时间格式校验
    if (!/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(booking_time)) {
      return error(res, '时间格式错误，应为 HH:MM-HH:MM', 400);
    }

    // 手机号校验
    if (!/^1\d{10}$/.test(contact_phone)) {
      return error(res, '手机号格式错误', 400);
    }

    // 验证教练存在
    const coach = Coach.findById(coach_id);
    if (!coach) {
      return error(res, '教练不存在', 404);
    }

    // 检查时间冲突（同一教练同一时间段不能有多个预约）
    const existingBookings = Booking.findByCoachId(coach_id, booking_date);
    const conflict = existingBookings.some(b =>
      b.booking_time === booking_time && b.status !== 3 // 3=已取消
    );

    if (conflict) {
      return error(res, '该时间段已被预约，请选择其他时间', 409);
    }

    // 创建预约
    const booking = Booking.create({
      user_id: req.userId,
      coach_id,
      course_id,
      booking_date,
      booking_time,
      address: address.trim(),
      contact_name: contact_name?.trim(),
      contact_phone,
      remark: remark?.trim()
    });

    return success(res, booking, '预约成功');
  } catch (err) {
    console.error('Create booking error:', err);
    return error(res, '创建预约失败', 500);
  }
});

/**
 * GET /api/bookings
 * 获取用户的预约列表（需登录）
 */
router.get('/', authMiddleware, (req, res) => {
  try {
    const { status } = req.query;

    const bookings = Booking.findByUserId(req.userId, status ? parseInt(status) : undefined);

    return success(res, bookings, '获取成功');
  } catch (err) {
    console.error('Get bookings error:', err);
    return error(res, '获取预约列表失败', 500);
  }
});

/**
 * GET /api/bookings/:id
 * 获取预约详情（需登录）
 */
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return error(res, '无效的预约ID', 400);
    }

    const booking = Booking.findById(parseInt(id));
    if (!booking) {
      return error(res, '预约不存在', 404);
    }

    if (booking.user_id !== req.userId) {
      return error(res, '无权限查看', 403);
    }

    return success(res, booking, '获取成功');
  } catch (err) {
    console.error('Get booking detail error:', err);
    return error(res, '获取预约详情失败', 500);
  }
});

/**
 * PUT /api/bookings/:id/cancel
 * 取消预约（需登录）
 */
router.put('/:id/cancel', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return error(res, '无效的预约ID', 400);
    }

    const booking = Booking.findById(parseInt(id));
    if (!booking) {
      return error(res, '预约不存在', 404);
    }

    if (booking.user_id !== req.userId) {
      return error(res, '无权限操作', 403);
    }

    if (booking.status !== 0) {
      return error(res, '该预约无法取消', 400);
    }

    Booking.updateStatus(parseInt(id), 3);
    return success(res, null, '预约已取消');
  } catch (err) {
    console.error('Cancel booking error:', err);
    return error(res, '取消预约失败', 500);
  }
});

module.exports = router;
