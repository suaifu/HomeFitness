// services/adapter.js - 数据适配层
// 统一将后端 API 返回的字段映射为前端组件所需的格式
// 一劳永逸解决前后端字段不匹配问题

/**
 * 适配教练数据（列表项）
 * 后端返回：{ id, name, avatar_url, specialty, price, rating, order_count, service_area, ... }
 * 前端需要：{ id, name, avatar, specialty, price, rating, ... }
 */
function adaptCoach(raw) {
  if (!raw) return null;
  return {
    ...raw,
    avatar: raw.avatar_url || raw.avatar || '/images/default-coach.png',
    // 保留 avatar_url 给需要的地方
    avatar_url: raw.avatar_url || raw.avatar || '/images/default-coach.png',
    // 职称/标签
    title: raw.title || raw.specialty || '专业私教',
    // 评价数
    reviewCount: raw.reviewCount || raw.order_count || 0,
  };
}

/**
 * 适配教练详情数据
 * 后端返回：{ coach, courses }
 * 前端需要完整的教练信息对象（coverImage, avatar, bio, specialties, stats, certificates, services）
 */
function adaptCoachDetail(res) {
  const rawCoach = res.coach || res;
  const rawCourses = res.courses || [];

  if (!rawCoach) return null;

  // 擅长领域：优先用 specialtyList（数组），否则拆分 specialty 字符串
  const specialties = rawCoach.specialtyList ||
    (rawCoach.specialty ? rawCoach.specialty.split(',').map(s => s.trim()).filter(Boolean) : []);

  // 资质证书：统一为 [{name, year}] 格式
  let certificates = [];
  if (rawCoach.certificatesList && Array.isArray(rawCoach.certificatesList)) {
    certificates = rawCoach.certificatesList.map(name => ({ name, year: '' }));
  } else if (rawCoach.certificates) {
    certificates = rawCoach.certificates.split(',').map(name => ({ name: name.trim(), year: '' })).filter(c => c.name);
  }

  // 统计数据
  const orderCount = rawCoach.order_count || 0;
  const stats = {
    completedSessions: orderCount,
    students: Math.floor(orderCount * 0.7),
    satisfaction: rawCoach.rating ? Math.round(rawCoach.rating * 20) : 95,
  };

  // 服务项目：从课程数据生成
  const services = rawCourses.length > 0
    ? rawCourses.map(c => ({
        name: c.name || '健身课程',
        duration: c.duration ? `${c.duration}分钟` : '60分钟',
        price: c.price || rawCoach.price
      }))
    : [{
        name: '私人教练课',
        duration: '60分钟',
        price: rawCoach.price
      }];

  return {
    ...rawCoach,
    coverImage: rawCoach.avatar_url || '/images/default-coach.png',
    avatar: rawCoach.avatar_url || rawCoach.avatar || '/images/default-coach.png',
    avatar_url: rawCoach.avatar_url || rawCoach.avatar || '/images/default-coach.png',
    title: rawCoach.specialty || '专业私教',
    bio: rawCoach.intro || rawCoach.bio || '暂无简介',
    specialties,
    certificates,
    stats,
    services,
    reviewCount: orderCount,
  };
}

/**
 * 适配评价数据
 * 后端返回：{ reviews, stats, pagination }
 * 前端需要格式化后的评价列表
 */
function adaptReviews(res) {
  const data = res.data || res;
  const reviews = (data.reviews || data || []).map(r => ({
    ...r,
    _formattedTags: formatTags(r.tags)
  }));
  const stats = data.stats || { total: 0, avg_rating: 0 };
  return { reviews, stats, pagination: data.pagination || null };
}

/**
 * 格式化标签字符串为数组
 * 支持两种格式：
 * 1. JSON 字符串：'["professional","skillful"]' → ['专业','技巧好']
 * 2. 逗号分隔：'专业, 技巧好' → ['专业','技巧好']
 */
const REVIEW_TAG_MAP = {
  professional: '专业',
  patient: '耐心',
  effective: '效果明显',
  on_time: '准时',
  friendly: '亲切',
  skillful: '技巧好',
  knowledgeable: '知识丰富',
  flexible: '灵活变通'
};

function formatTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map(id => REVIEW_TAG_MAP[id] || id);
  }
  if (typeof tags === 'string') {
    // 尝试 JSON 解析（后端存储的格式）
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) {
        return parsed.map(id => REVIEW_TAG_MAP[id] || id);
      }
    } catch (e) {
      // 不是 JSON，按逗号分割
    }
    // 逗号分隔格式
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
}

/**
 * 适配订单数据
 * 后端返回：{ order, ... }
 * 前端需要统一的订单展示格式
 */
function adaptOrder(raw) {
  if (!raw) return null;
  return {
    ...raw,
    coachAvatar: raw.coach_avatar || raw.coachAvatar || '/images/default-coach.png',
    coachName: raw.coach_name || raw.coachName || '教练',
    statusText: getOrderStatusText(raw.status),
  };
}

/**
 * 订单状态映射
 */
function getOrderStatusText(status) {
  const map = {
    'pending': '待支付',
    'paid': '已支付',
    'confirmed': '已确认',
    'in_progress': '进行中',
    'completed': '已完成',
    'cancelled': '已取消',
    'refunded': '已退款',
  };
  return map[status] || status || '未知';
}

/**
 * 计算星级数组（用于 WXML 渲染，避免在模板中使用 Math.floor）
 * @param {number} rating 评分（1-5）
 * @returns {number[]} 长度5的数组，1=亮星 0=暗星
 */
function calcStars(rating) {
  const r = Math.round(rating || 0);
  return [1, 2, 3, 4, 5].map(i => i <= r ? 1 : 0);
}

// 导出
module.exports = {
  adaptCoach,
  adaptCoachDetail,
  adaptReviews,
  adaptOrder,
  formatTags,
  calcStars,
  getOrderStatusText,
};
