// utils/constants.js - 常量定义

// 订单状态（数字型，与后端数据库一致）
const ORDER_STATUS_MAP = {
  0: { label: '待支付', color: '#FAAD14' },
  1: { label: '已支付', color: '#FF6B6B' },
  2: { label: '已完成', color: '#52C41A' },
  3: { label: '已取消', color: '#999999' }
};

// 预约状态
const BOOKING_STATUS_MAP = {
  0: { label: '待确认', color: '#FAAD14' },
  1: { label: '已确认', color: '#FF6B6B' },
  2: { label: '已完成', color: '#52C41A' },
  3: { label: '已取消', color: '#999999' }
};

/**
 * 获取订单/预约状态文字
 * @param {number} status - 状态码
 * @param {'order'|'booking'} type - 类型
 */
function getStatusText(status, type = 'order') {
  const map = type === 'booking' ? BOOKING_STATUS_MAP : ORDER_STATUS_MAP;
  return map[status]?.label || '未知';
}

/**
 * 获取订单/预约状态颜色
 * @param {number} status - 状态码
 * @param {'order'|'booking'} type - 类型
 */
function getStatusColor(status, type = 'order') {
  const map = type === 'booking' ? BOOKING_STATUS_MAP : ORDER_STATUS_MAP;
  return map[status]?.color || '#999999';
}

// 订单状态（兼容旧代码的枚举格式）
const ORDER_STATUS = {
  PENDING_PAYMENT: { value: 0, label: '待支付', color: '#FAAD14' },
  PAID: { value: 1, label: '已支付', color: '#FF6B6B' },
  COMPLETED: { value: 2, label: '已完成', color: '#52C41A' },
  CANCELLED: { value: 3, label: '已取消', color: '#999999' },
  REFUNDING: { value: 4, label: '退款中', color: '#1890FF' },
  REFUNDED: { value: 5, label: '已退款', color: '#999999' }
};

// 预约状态（兼容旧代码的枚举格式）
const BOOKING_STATUS = {
  PENDING: { value: 0, label: '待确认' },
  CONFIRMED: { value: 1, label: '已确认' },
  COMPLETED: { value: 2, label: '已完成' },
  CANCELLED: { value: 3, label: '已取消' }
};

// 健身分类
const CATEGORIES = [
  { id: 1, name: '减脂塑形', icon: '🔥' },
  { id: 2, name: '增肌训练', icon: '💪' },
  { id: 3, name: '瑜伽冥想', icon: '🧘' },
  { id: 4, name: '拉伸放松', icon: '🤸' },
  { id: 5, name: '体能提升', icon: '⚡' },
  { id: 6, name: '产后恢复', icon: '❤️' }
];

// 排序方式
const SORT_OPTIONS = [
  { value: 'rating', label: '评分优先' },
  { value: 'price_asc', label: '价格最低' },
  { value: 'price_desc', label: '价格最高' },
  { value: 'distance', label: '距离最近' }
];

module.exports = { ORDER_STATUS, BOOKING_STATUS, ORDER_STATUS_MAP, BOOKING_STATUS_MAP, getStatusText, getStatusColor, CATEGORIES, SORT_OPTIONS };