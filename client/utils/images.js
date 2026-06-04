/**
 * 图片资源配置
 * 统一管理默认图片路径，便于替换
 */

const DEFAULT_IMAGES = {
  // 通用
  avatar: '/images/default-avatar.png',
  coach: '/images/default-coach.png',

  // 空状态
  emptyAddress: '/images/empty-address.png',
  emptyReviews: '/images/empty-reviews.png',
  emptyOrders: '/images/empty-orders.png',
  emptyData: '/images/empty-data.png',
  emptySearch: '/images/empty-search.png',

  // 图标
  logo: '/images/logo.png',
  banner: '/images/banner-default.png',

  // TabBar图标 (需要4个状态：未选中和选中)
  tabHome: '/images/tab-home.png',
  tabHomeActive: '/images/tab-home-active.png',
  tabCoach: '/images/tab-coach.png',
  tabCoachActive: '/images/tab-coach-active.png',
  tabOrder: '/images/tab-order.png',
  tabOrderActive: '/images/tab-order-active.png',
  tabUser: '/images/tab-user.png',
  tabUserActive: '/images/tab-user-active.png'
};

/**
 * 获取图片URL，带默认值
 */
function getImage(key, customUrl = null) {
  return customUrl || DEFAULT_IMAGES[key] || DEFAULT_IMAGES.avatar;
}

/**
 * 图片加载失败处理
 * 修改 e.detail 对象中的信息，并通过回调让页面 setData 更新
 * 
 * 使用方式（在页面JS中）:
 *   onImageError(e) {
 *     const { key, index, field } = e.currentTarget.dataset;
 *     const fallback = images.onImageError(key);
 *     if (index !== undefined && field) {
 *       this.setData({ [`${field}[${index}].${field === 'coaches' ? 'avatar' : 'image'}`]: fallback });
 *     }
 *   }
 *
 * @param {string} fallbackKey - 备用图片类型键名
 * @returns {string} 备用图片路径
 */
function onImageError(fallbackKey = 'avatar') {
  return DEFAULT_IMAGES[fallbackKey] || DEFAULT_IMAGES.avatar;
}

module.exports = {
  DEFAULT_IMAGES,
  getImage,
  onImageError
};
