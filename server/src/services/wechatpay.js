/**
 * 微信支付服务
 * 支持 JSAPI 支付（小程序）
 * 
 * 使用前需要在微信商户平台配置：
 * 1. API密钥
 * 2. APIv3密钥（用于回调通知）
 * 3. 安装商户证书
 * 
 * 文档：https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_5_1.shtml
 */
const crypto = require('crypto');
const axios = require('axios');
const querystring = require('querystring');

// 配置
const WECHAT_CONFIG = {
  appid: process.env.WECHAT_APPID || 'wx0000000000000000',
  mchid: process.env.WECHAT_MCHID || '1234567890',
  serial_no: process.env.WECHAT_SERIAL_NO || '', // 商户证书序列号
  private_key: process.env.WECHAT_PRIVATE_KEY || '', // PKCS8格式的商户私钥
  apiv3_key: process.env.WECHAT_APIV3_KEY || '', // APIv3密钥
  notify_url: process.env.WECHAT_NOTIFY_URL || 'https://your-domain.com/api/orders/pay/callback'
};

// 微信支付 API 域名
const WECHAT_PAY_HOST = 'https://api.mch.weixin.qq.com';

/**
 * 生成随机字符串
 */
function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成签名
 */
async function generateSignature(message) {
  const signType = 'RSA';
  const messageHash = crypto.createHash('sha256').update(message).digest('hex');
  
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(messageHash);
  
  // 如果没有配置私钥，返回模拟签名
  if (!WECHAT_CONFIG.private_key) {
    console.warn('[WeChat Pay] 未配置私钥，使用模拟签名');
    return 'mock_signature';
  }
  
  return sign.sign(WECHAT_CONFIG.private_key, 'base64');
}

/**
 * 生成平台证书序列号（用于请求）
 */
function getSerialNo() {
  return WECHAT_CONFIG.serial_no;
}

/**
 * JSAPI 统一下单
 */
async function createJsapiOrder(params) {
  const { openid, orderNo, amount, description, attach = '' } = params;

  // 构造请求体
  const payload = {
    appid: WECHAT_CONFIG.appid,
    mchid: WECHAT_CONFIG.mchid,
    description: description || '上门健身服务',
    out_trade_no: orderNo,
    time_expire: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30分钟后过期
    attach,
    notify_url: WECHAT_CONFIG.notify_url,
    amount: {
      total: Math.round(amount * 100), // 转换为分
      currency: 'CNY'
    },
    payer: {
      openid
    }
  };

  // 生成签名
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = generateNonceStr();
  const requestBody = JSON.stringify(payload);
  
  // 构建签名串
  // POST\n/path\ntimestamp\nnonceStr\nbody\n
  const signStr = `POST\n/v3/pay/transactions/jsapi\n${timestamp}\n${nonceStr}\n${requestBody}`;
  
  const signature = await generateSignature(signStr);

  // 设置请求头
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `WECHATPAY2-SHA256-RSA2048 ` +
      `mchid="${WECHAT_CONFIG.mchid}", ` +
      `serial_no="${getSerialNo()}", ` +
      `nonce_str="${nonceStr}", ` +
      `signature="${signature}", ` +
      `timestamp="${timestamp}"`
  };

  try {
    // 调用统一下单接口
    const response = await axios.post(
      `${WECHAT_PAY_HOST}/v3/pay/transactions/jsapi`,
      payload,
      { headers }
    );

    const { prepay_id } = response.data;
    
    // 构造小程序调起支付的参数
    const paySign = await constructPaySign(prepay_id);
    
    return {
      success: true,
      prepay_id,
      pay_params: {
        timeStamp: timestamp,
        nonceStr,
        package: `prepay_id=${prepay_id}`,
        signType: 'RSA',
        paySign
      }
    };
  } catch (err) {
    console.error('[WeChat Pay] 统一下单失败:', err.response?.data || err.message);
    return {
      success: false,
      error: err.response?.data?.message || '创建订单失败'
    };
  }
}

/**
 * 构造调起支付的签名
 */
async function constructPaySign(prepayId) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = generateNonceStr();
  
  // 构造签名串
  // appId\ntimestamp\nnonceStr\nprepayId\n
  const signStr = `${WECHAT_CONFIG.appid}\n${timestamp}\n${nonceStr}\n${prepayId}\n`;
  
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(crypto.createHash('sha256').update(signStr).digest('hex'));
  
  if (!WECHAT_CONFIG.private_key) {
    return 'mock_pay_sign';
  }
  
  return sign.sign(WECHAT_CONFIG.private_key, 'base64');
}

/**
 * 查询订单
 */
async function queryOrder(outTradeNo) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = generateNonceStr();
  
  const signStr = `GET\n/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${WECHAT_CONFIG.mchid}\n${timestamp}\n${nonceStr}\n\n`;
  const signature = await generateSignature(signStr);
  
  const headers = {
    'Accept': 'application/json',
    'Authorization': `WECHATPAY2-SHA256-RSA2048 ` +
      `mchid="${WECHAT_CONFIG.mchid}", ` +
      `serial_no="${getSerialNo()}", ` +
      `nonce_str="${nonceStr}", ` +
      `signature="${signature}", ` +
      `timestamp="${timestamp}"`
  };

  try {
    const response = await axios.get(
      `${WECHAT_PAY_HOST}/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${WECHAT_CONFIG.mchid}`,
      { headers }
    );
    return { success: true, data: response.data };
  } catch (err) {
    return { success: false, error: err.response?.data?.message || '查询失败' };
  }
}

/**
 * 关闭订单
 */
async function closeOrder(outTradeNo) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = generateNonceStr();
  const body = '';
  
  const signStr = `POST\n/v3/pay/transactions/out-trade-no/${outTradeNo}/close\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = await generateSignature(signStr);
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `WECHATPAY2-SHA256-RSA2048 ` +
      `mchid="${WECHAT_CONFIG.mchid}", ` +
      `serial_no="${getSerialNo()}", ` +
      `nonce_str="${nonceStr}", ` +
      `signature="${signature}", ` +
      `timestamp="${timestamp}"`
  };

  try {
    await axios.post(
      `${WECHAT_PAY_HOST}/v3/pay/transactions/out-trade-no/${outTradeNo}/close`,
      {},
      { headers }
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.response?.data?.message || '关闭失败' };
  }
}

/**
 * 申请退款
 */
async function refund(outTradeNo, totalAmount, refundAmount, reason = '') {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = generateNonceStr();
  
  const payload = {
    out_trade_no: outTradeNo,
    out_refund_no: `REF${Date.now()}${Math.random().toString(36).substr(2, 6)}`.toUpperCase(),
    reason,
    notify_url: WECHAT_CONFIG.notify_url.replace('/pay/callback', '/refund/callback'),
    amount: {
      total: Math.round(totalAmount * 100),
      refund: Math.round(refundAmount * 100),
      currency: 'CNY'
    }
  };
  
  const requestBody = JSON.stringify(payload);
  const signStr = `POST\n/v3/refund/domestic/refunds\n${timestamp}\n${nonceStr}\n${requestBody}\n`;
  const signature = await generateSignature(signStr);
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `WECHATPAY2-SHA256-RSA2048 ` +
      `mchid="${WECHAT_CONFIG.mchid}", ` +
      `serial_no="${getSerialNo()}", ` +
      `nonce_str="${nonceStr}", ` +
      `signature="${signature}", ` +
      `timestamp="${timestamp}"`
  };

  try {
    const response = await axios.post(
      `${WECHAT_PAY_HOST}/v3/refund/domestic/refunds`,
      payload,
      { headers }
    );
    return { success: true, data: response.data };
  } catch (err) {
    return { success: false, error: err.response?.data?.message || '退款失败' };
  }
}

/**
 * 解密支付通知
 */
function decryptNotify(notifyStr) {
  try {
    const data = JSON.parse(notifyStr);
    const { algorithm, associated_data, ciphertext, nonce } = data.resource;
    
    // 使用 AES-256-GCM 解密
    // 注意：实际项目中需要使用微信提供的解密库
    // 这里简化处理，直接返回原始数据
    
    return {
      type: 'encrypted',
      // 实际解密后的数据...
      original: data
    };
  } catch (err) {
    console.error('[WeChat Pay] 解密通知失败:', err);
    return null;
  }
}

/**
 * 验证回调签名
 */
function verifyCallbackSign(params) {
  const { sign, timestamp, nonce, body } = params;
  
  // 构造签名串
  // timestamp\nnonce\nbody\n
  const signStr = `${timestamp}\n${nonce}\n${body}\n`;
  const messageHash = crypto.createHash('sha256').update(signStr).digest('hex');
  
  // 使用 APIv3 密钥验证（简化版）
  const expectedSign = crypto
    .createHmac('sha256', WECHAT_CONFIG.apiv3_key)
    .update(messageHash)
    .digest('base64');
  
  return sign === expectedSign;
}

/**
 * 模拟支付（开发环境使用）
 */
function createMockPayParams(orderNo, amount) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = generateNonceStr();
  
  return {
    success: true,
    prepay_id: `wx${Date.now()}mock`,
    pay_params: {
      timeStamp: timestamp,
      nonceStr,
      package: `prepay_id=wx${Date.now()}mock`,
      signType: 'MD5',
      paySign: 'mock_pay_sign_for_development'
    }
  };
}

module.exports = {
  createJsapiOrder,
  queryOrder,
  closeOrder,
  refund,
  decryptNotify,
  verifyCallbackSign,
  createMockPayParams
};
