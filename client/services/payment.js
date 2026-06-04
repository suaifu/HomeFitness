/**
 * services/payment.js - 微信支付服务
 * 封装微信小程序支付流程
 * 注意：不要在模块顶层调用 getApp()，因为此时 App() 可能还未初始化
 */

let _app = null;
function getAppInstance() {
  if (!_app) _app = getApp();
  return _app;
}

/**
 * 发起订单支付
 * @param {number} orderId - 订单ID
 * @param {string} openid - 用户openid（可选，如果不传会从后端获取）
 */
function payOrder(orderId, openid) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. 调用后端获取支付参数
      const payData = await getAppInstance().request(`/orders/${orderId}/pay`, 'POST', { openid });
      
      // 2. 检查是否是模拟支付（开发环境）
      if (payData.mock) {
        console.log('[支付] 开发模式模拟支付');
        // 模拟支付成功
        wx.showToast({ title: '支付成功（模拟）', icon: 'success' });
        
        // 更新本地订单状态
        setTimeout(() => {
          resolve({ success: true, mock: true, orderId, orderNo: payData.order_no });
        }, 1500);
        return;
      }

      // 3. 调用微信支付
      wx.requestPayment({
        timeStamp: payData.pay_params.timeStamp,
        nonceStr: payData.pay_params.nonceStr,
        package: payData.pay_params.package,
        signType: payData.pay_params.signType || 'RSA',
        paySign: payData.pay_params.paySign,
        success: (res) => {
          console.log('[支付] 支付成功', res);
          wx.showToast({ title: '支付成功', icon: 'success' });
          resolve({ 
            success: true, 
            orderId, 
            orderNo: payData.order_no,
            transactionId: res.transactionId 
          });
        },
        fail: (err) => {
          console.log('[支付] 支付取消或失败', err);
          
          if (err.errMsg && err.errMsg.includes('cancel')) {
            // 用户取消
            wx.showToast({ title: '支付已取消', icon: 'none' });
            resolve({ success: false, reason: 'cancelled' });
          } else {
            // 支付失败
            wx.showToast({ title: '支付失败，请重试', icon: 'none' });
            reject({ success: false, reason: 'failed', error: err });
          }
        }
      });
    } catch (error) {
      console.error('[支付] 发起支付失败', error);
      wx.showToast({ title: error.message || '发起支付失败', icon: 'none' });
      reject({ success: false, reason: 'error', error });
    }
  });
}

/**
 * 查询支付状态
 * @param {number} orderId - 订单ID
 */
async function queryPayStatus(orderId) {
  try {
    const order = await getAppInstance().request(`/orders/${orderId}`, 'GET');
    return {
      paid: order.status === 1,
      status: order.status,
      statusText: order.statusText
    };
  } catch (error) {
    console.error('[支付] 查询状态失败', error);
    return { paid: false, error };
  }
}

/**
 * 取消订单
 * @param {number} orderId - 订单ID
 */
async function cancelOrder(orderId) {
  try {
    const result = await getAppInstance().request(`/orders/${orderId}/cancel`, 'POST');
    wx.showToast({ title: '订单已取消', icon: 'success' });
    return { success: true, ...result };
  } catch (error) {
    wx.showToast({ title: error.message || '取消失败', icon: 'none' });
    return { success: false, error };
  }
}

/**
 * 申请退款
 * @param {number} orderId - 订单ID
 * @param {string} reason - 退款原因
 */
async function refundOrder(orderId, reason = '') {
  try {
    const result = await getAppInstance().request('/orders/refund', 'POST', {
      order_id: orderId,
      reason
    });
    wx.showToast({ title: '退款申请已提交', icon: 'success' });
    return { success: true, ...result };
  } catch (error) {
    wx.showToast({ title: error.message || '退款申请失败', icon: 'none' });
    return { success: false, error };
  }
}

/**
 * 获取用户 openid
 */
function getOpenid() {
  return new Promise((resolve, reject) => {
    // 先检查本地缓存
    const cachedOpenid = wx.getStorageSync('openid');
    if (cachedOpenid) {
      resolve(cachedOpenid);
      return;
    }

    wx.login({
      success: async (res) => {
        if (!res.code) {
          reject(new Error('获取code失败'));
          return;
        }
        
        try {
          // 调用后端获取 openid
          const result = await getAppInstance().request('/auth/openid', 'POST', { code: res.code }, true);
          if (result.openid) {
            wx.setStorageSync('openid', result.openid);
            resolve(result.openid);
          } else {
            reject(new Error('获取openid失败'));
          }
        } catch (error) {
          reject(error);
        }
      },
      fail: reject
    });
  });
}

/**
 * 创建订单并发起支付（组合方法）
 * @param {object} params - { booking_id, amount }
 */
async function createAndPay(params) {
  const api = require('./api');
  try {
    // 1. 创建订单
    const order = await api.createOrder(params);
    if (!order || !order.id) {
      throw new Error('创建订单失败');
    }

    // 2. 发起支付
    const payResult = await payOrder(order.id);
    return payResult;
  } catch (error) {
    console.error('[支付] 创建订单并支付失败:', error);
    throw error;
  }
}

/**
 * 请求订阅消息授权
 * @param {Array} templateIds - 模板ID列表
 */
function requestSubscription(templateIds = []) {
  // 如果没有传入有效模板ID，使用默认模板
  const tmplIds = templateIds.length > 0
    ? templateIds
    : ['BOOKING_REMINDER_TPL', 'ORDER_STATUS_TPL'];

  if (!wx.canIUse('requestSubscribeMessage')) {
    console.warn('[订阅消息] 当前版本不支持 requestSubscribeMessage');
    return;
  }

  // 必须同步调用，不能包在 Promise 里（微信强制要求 user TAP gesture）
  wx.requestSubscribeMessage({
    tmplIds,
    success: (res) => {
      const accepted = Object.values(res).filter(v => v === 'accept').length;
      console.log(`[订阅消息] 已授权 ${accepted} 个模板`);
    },
    fail: (err) => {
      console.warn('[订阅消息] 授权失败:', err);
    }
  });
}

module.exports = {
  payOrder,
  queryPayStatus,
  cancelOrder,
  refundOrder,
  getOpenid,
  createAndPay,
  requestSubscription
};
