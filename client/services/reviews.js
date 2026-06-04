/**
 * services/reviews.js - 评价服务
 * 注意：不要在模块顶层调用 getApp()，因为此时 App() 可能还未初始化
 */

let _app = null;
function getAppInstance() {
  if (!_app) _app = getApp();
  return _app;
}

/**
 * 获取教练评价列表
 * @param {number} coachId - 教练ID
 * @param {object} params - 查询参数 { page, limit }
 */
function getCoachReviews(coachId, params = {}) {
  const { page = 1, limit = 10 } = params;
  return getAppInstance().request(`/reviews/coach/${coachId}?page=${page}&limit=${limit}`, 'GET');
}

/**
 * 获取教练评价统计
 * @param {number} coachId - 教练ID
 */
function getCoachStats(coachId) {
  return getAppInstance().request(`/reviews/coach/${coachId}`, 'GET')
    .then(res => (res.data || res)?.stats);
}

/**
 * 创建评价
 * @param {object} data - 评价数据 { coach_id, booking_id, rating, content, tags }
 */
function createReview(data) {
  return getAppInstance().request('/reviews', 'POST', data);
}

/**
 * 获取我的评价列表
 * @param {object} params - 查询参数 { page, limit }
 */
function getMyReviews(params = {}) {
  const { page = 1, limit = 10 } = params;
  return getAppInstance().request(`/reviews/user/me?page=${page}&limit=${limit}`, 'GET');
}

/**
 * 检查是否可以评价某教练
 * @param {number} coachId - 教练ID
 */
function checkCanReview(coachId) {
  return getAppInstance().request(`/reviews/check/${coachId}`, 'GET');
}

/**
 * 删除我的评价
 * @param {number} reviewId - 评价ID
 */
function deleteReview(reviewId) {
  return getAppInstance().request(`/reviews/${reviewId}`, 'DELETE');
}

/**
 * 评价标签列表
 */
const REVIEW_TAGS = [
  { id: 'professional', label: '专业', icon: 'badge' },
  { id: 'patient', label: '耐心', icon: 'hand' },
  { id: 'effective', label: '效果明显', icon: 'star' },
  { id: 'on_time', label: '准时', icon: 'clock' },
  { id: 'friendly', label: '亲切', icon: 'heart' },
  { id: 'skillful', label: '技巧好', icon: 'award' },
  { id: 'knowledgeable', label: '知识丰富', icon: 'book' },
  { id: 'flexible', label: '灵活变通', icon: 'refresh' }
];

/**
 * 格式化评价标签
 * @param {string} tagsJson - JSON字符串格式的标签
 */
function formatTags(tagsJson) {
  if (!tagsJson) return [];
  try {
    const tagIds = JSON.parse(tagsJson);
    return tagIds.map(id => {
      const tag = REVIEW_TAGS.find(t => t.id === id);
      return tag ? tag.label : id;
    });
  } catch (e) {
    return [];
  }
}

/**
 * 评分分布百分比计算
 * @param {object} distribution - 评分分布 { 5: count, 4: count, ... }
 * @param {number} total - 总评价数
 */
function calcDistributionPercent(distribution, total) {
  if (!total) return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  return {
    5: Math.round((distribution[5] || 0) / total * 100),
    4: Math.round((distribution[4] || 0) / total * 100),
    3: Math.round((distribution[3] || 0) / total * 100),
    2: Math.round((distribution[2] || 0) / total * 100),
    1: Math.round((distribution[1] || 0) / total * 100)
  };
}

module.exports = {
  getCoachReviews,
  getCoachStats,
  createReview,
  getMyReviews,
  checkCanReview,
  deleteReview,
  REVIEW_TAGS,
  formatTags,
  calcDistributionPercent
};
