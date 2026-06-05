/**
 * 订单相关路由 — 集成微信支付
 */
const express = require('express');
const router = express.Router();
const { Order, Booking, Coach, User } = require('../models/database');
const { authMiddleware } = require('../middleware/auth');
const { success, error } = require('../middleware/response');
const wechatpay = require('../services/wechatpay');

/**
 * POST /api/orders
 * 创建订单（需登录）
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { booking_id, amount, pay_type = 'wechat' } = req.body;

    if (!booking_id || amount === undefined) {
      return error(res, '缺少必要参数', 400);
    }

    // 金额校验
    if (typeof amount !== 'number' || amount <= 0) {
      return error(res, '金额必须为正数', 400);
    }

    if (amount > 10000) {
      return error(res, '单笔订单金额不能超过10000元', 400);
    }

    // 验证预约存在
    const booking = Booking.findById(booking_id);
    if (!booking) {
      return error(res, '预约不存在', 404);
    }

    if (booking.user_id !== req.userId) {
      return error(res, '无权限操作', 403);
    }

    // 验证金额与预约价格一致
    const coach = Coach.findById(booking.coach_id);
    if (coach && Math.abs(amount - coach.price) > 0.01) {
      console.warn(`金额不一致: 提交=${amount}, 教练价格=${coach.price}`);
      return error(res, '订单金额异常', 400);
    }

    // 检查是否已有该预约的未支付订单
    const existingOrders = Order.findByUserId(req.userId, 0);
    const duplicateOrder = existingOrders.find(o => o.booking_id === booking_id);
    if (duplicateOrder) {
      return success(res, duplicateOrder, '订单已存在');
    }

    // 创建订单
    const order = Order.create({
      user_id: req.userId,
      booking_id,
      amount,
      status: 0
    });

    return success(res, order, '订单创建成功');
  } catch (err) {
    console.error('Create order error:', err);
    return error(res, '创建订单失败', 500);
  }
});

/**
 * GET /api/orders
 * 获取订单列表（需登录）
 */
router.get('/', authMiddleware, (req, res) => {
  try {
    const { status } = req.query;

    const orders = Order.findByUserId(req.userId, status !== undefined ? parseInt(status) : undefined);

    // 为每个订单添加详细信息（平铺为前端期望的字段格式）
    const processedOrders = orders.map(order => {
      const booking = Booking.findById(order.booking_id);
      const coach = booking ? Coach.findById(booking.coach_id) : null;

      return {
        ...order,
        // 平铺字段，适配前端 WXML 期望的命名
        courseTitle: booking?.course_name || '私教课程',
        coachName: booking?.coach_name || (coach?.name || ''),
        coachAvatar: booking?.coach_avatar || (coach?.avatar || ''),
        date: booking?.booking_date || '',
        time: booking?.booking_time || '',
        total: order.amount,
        statusText: ['待支付', '已支付', '已完成', '已取消'][order.status] || '未知',
        booking,
        coach: coach ? {
          id: coach.id,
          name: coach.name,
          avatar: coach.avatar,
          title: coach.title
        } : null
      };
    });

    return success(res, processedOrders, '获取成功');
  } catch (err) {
    console.error('Get orders error:', err);
    return error(res, '获取订单列表失败', 500);
  }
});

/**
 * GET /api/orders/:id
 * 获取订单详情（需登录）
 */
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return error(res, '无效的订单ID', 400);
    }

    const order = Order.findById(parseInt(id));
    if (!order) {
      return error(res, '订单不存在', 404);
    }

    if (order.user_id !== req.userId) {
      return error(res, '无权限查看', 403);
    }

    // 获取关联信息
    const booking = Booking.findById(order.booking_id);
    const coach = booking ? Coach.findById(booking.coach_id) : null;
    const user = User.findById(order.user_id);

    const processedOrder = {
      ...order,
      // 平铺字段，适配前端 WXML 期望的命名
      courseTitle: booking?.course_name || '私教课程',
      coachName: booking?.coach_name || (coach?.name || ''),
      coachAvatar: booking?.coach_avatar || (coach?.avatar || ''),
      date: booking?.booking_date || '',
      time: booking?.booking_time || '',
      total: order.amount,
      statusText: ['待支付', '已支付', '已完成', '已取消'][order.status] || '未知',
      booking,
      coach: coach ? {
        id: coach.id,
        name: coach.name,
        avatar: coach.avatar,
        title: coach.title,
        price: coach.price
      } : null,
      user: user ? {
        nickname: user.nickname,
        phone: user.phone
      } : null
    };

    return success(res, processedOrder, '获取成功');
  } catch (err) {
    console.error('Get order detail error:', err);
    return error(res, '获取订单详情失败', 500);
  }
});

/**
 * POST /api/orders/:id/pay
 * 发起支付（需登录）- 集成微信支付
 */
router.post('/:id/pay', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { openid } = req.body;

    if (!/^\d+$/.test(id)) {
      return error(res, '无效的订单ID', 400);
    }

    const order = Order.findById(parseInt(id));
    if (!order) {
      return error(res, '订单不存在', 404);
    }

    if (order.user_id !== req.userId) {
      return error(res, '无权限操作', 403);
    }

    if (order.status !== 0) {
      return error(res, '订单已支付或已关闭', 400);
    }

    // 获取用户信息
    const user = User.findById(req.userId);
    
    // 获取预约和教练信息
    const booking = Booking.findById(order.booking_id);
    const coach = booking ? Coach.findById(booking.coach_id) : null;

    // 开发环境使用模拟支付
    if (process.env.NODE_ENV === 'development' || !process.env.WECHAT_PRIVATE_KEY) {
      console.log('[开发模式] 使用模拟支付参数');
      
      const mockPayParams = wechatpay.createMockPayParams(order.order_no, order.amount);
      
      return success(res, {
        order_id: order.id,
        order_no: order.order_no,
        amount: order.amount,
        pay_params: mockPayParams.pay_params,
        mock: true
      }, '获取支付参数成功（模拟）');
    }

    // 生产环境：调用微信支付统一下单
    const payResult = await wechatpay.createJsapiOrder({
      openid: openid || user?.openid,
      orderNo: order.order_no,
      amount: order.amount,
      description: coach ? `${coach.name}的健身课程` : '上门健身服务',
      attach: JSON.stringify({ orderId: order.id, bookingId: order.booking_id })
    });

    if (!payResult.success) {
      return error(res, payResult.error || '发起支付失败', 500);
    }

    return success(res, {
      order_id: order.id,
      order_no: order.order_no,
      amount: order.amount,
      pay_params: payResult.pay_params
    }, '获取支付参数成功');
  } catch (err) {
    console.error('Pay order error:', err);
    return error(res, '发起支付失败', 500);
  }
});

/**
 * POST /api/orders/:id/cancel
 * 取消订单（需登录）
 */
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const order = Order.findById(parseInt(id));
    if (!order) {
      return error(res, '订单不存在', 404);
    }

    if (order.user_id !== req.userId) {
      return error(res, '无权限操作', 403);
    }

    if (order.status !== 0) {
      return error(res, '只有待支付的订单可以取消', 400);
    }

    // 如果是已支付的订单，需要退款
    if (order.status === 1) {
      // 实际项目中调用退款接口
      console.log(`[订单 ${order.order_no}] 需要退款，金额: ${order.amount}`);
    }

    // 更新订单状态
    Order.updateStatus(order.id, 3); // 3 = 已取消

    return success(res, { order_id: order.id }, '订单已取消');
  } catch (err) {
    console.error('Cancel order error:', err);
    return error(res, '取消订单失败', 500);
  }
});

/**
 * POST /api/orders/:id/confirm
 * 确认完成（需登录，教练操作）
 */
router.post('/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const order = Order.findById(parseInt(id));
    if (!order) {
      return error(res, '订单不存在', 404);
    }

    if (order.status !== 1) {
      return error(res, '只有已支付的订单可以确认完成', 400);
    }

    // 更新订单状态
    Order.updateStatus(order.id, 2); // 2 = 已完成

    // 更新预约状态
    if (order.booking_id) {
      Booking.updateStatus(order.booking_id, 2);
    }

    return success(res, { order_id: order.id }, '订单已完成');
  } catch (err) {
    console.error('Confirm order error:', err);
    return error(res, '操作失败', 500);
  }
});

/**
 * POST /api/orders/pay/callback
 * 支付回调（微信服务器调用，无需登录）
 */
router.post('/pay/callback', express.raw({ type: 'application/xml' }), async (req, res) => {
  try {
    const xmlData = req.body.toString('utf-8');
    
    // 解析 XML
    const parseString = (xml) => {
      const result = {};
      const regex = /<(\w+)>([^<]*)<\/\1>/g;
      let match;
      while ((match = regex.exec(xml)) !== null) {
        result[match[1]] = match[2];
      }
      return result;
    };

    const data = parseString(xmlData);
    
    console.log('[支付回调]', data);

    // 验证签名
    if (data.sign) {
      // TODO: 实际项目中验证微信返回的签名
      // const verified = wechatpay.verifyCallbackSign(...);
    }

    const { return_code, return_msg, transaction_id, out_trade_no, total_fee, cash_fee, time_end } = data;

    if (return_code !== 'SUCCESS') {
      return res.send(`<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[${return_msg || '签名失败'}]]></return_msg></xml>`);
    }

    // 查找订单
    const order = Order.findByOrderNo(out_trade_no);
    if (!order) {
      return res.send(`<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单不存在]]></return_msg></xml>`);
    }

    // 幂等检查
    if (order.status === 1) {
      return res.send(`<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>`);
    }

    // 金额校验（可选，增强安全性）
    const totalAmount = parseInt(total_fee) / 100;
    if (Math.abs(totalAmount - order.amount) > 0.01) {
      console.error(`[支付回调] 金额不匹配: 订单=${order.amount}, 支付=${totalAmount}`);
      // 可以选择拒绝或记录日志继续处理
    }

    // 更新订单状态
    Order.updateStatus(order.id, 1, {
      pay_time: time_end ? new Date(time_end).toISOString() : new Date().toISOString(),
      transaction_id
    });

    // 更新预约状态
    if (order.booking_id) {
      Booking.updateStatus(order.booking_id, 1);
    }

    console.log(`[支付成功] 订单 ${out_trade_no} 已支付，金额 ${totalAmount} 元`);

    return res.send(`<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>`);
  } catch (err) {
    console.error('[支付回调错误]', err);
    return res.send(`<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[系统错误]]></return_msg></xml>`);
  }
});

/**
 * POST /api/orders/refund
 * 申请退款（需登录）
 */
router.post('/refund', authMiddleware, async (req, res) => {
  try {
    const { order_id, reason = '' } = req.body;

    if (!order_id) {
      return error(res, '缺少订单ID', 400);
    }

    const order = Order.findById(order_id);
    if (!order) {
      return error(res, '订单不存在', 404);
    }

    if (order.user_id !== req.userId) {
      return error(res, '无权限操作', 403);
    }

    if (order.status !== 1 && order.status !== 2) {
      return error(res, '只有已支付或已完成的订单可以退款', 400);
    }

    // 开发环境模拟退款
    if (process.env.NODE_ENV === 'development' || !process.env.WECHAT_PRIVATE_KEY) {
      Order.updateStatus(order.id, 3); // 模拟退款成功，标记为已取消
      return success(res, { order_id: order.id, refund_no: `REF${Date.now()}` }, '退款申请已提交（模拟）');
    }

    // 生产环境调用微信退款
    const refundResult = await wechatpay.refund(order.order_no, order.amount, order.amount, reason);

    if (!refundResult.success) {
      return error(res, refundResult.error || '退款失败', 500);
    }

    // 更新订单状态
    Order.updateStatus(order.id, 3);

    return success(res, {
      order_id: order.id,
      refund_no: refundResult.data.out_refund_no
    }, '退款申请已提交');
  } catch (err) {
    console.error('Refund error:', err);
    return error(res, '退款申请失败', 500);
  }
});

module.exports = router;
