// services/favorites.js - 收藏管理服务
const api = require('./api');

/**
 * 获取收藏列表
 */
async function getFavorites() {
  try {
    const result = await api.getFavorites();
    return result;
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    throw error;
  }
}

/**
 * 添加收藏
 */
async function addFavorite(coachId) {
  try {
    const result = await api.addFavorite(coachId);
    return result;
  } catch (error) {
    console.error('添加收藏失败:', error);
    throw error;
  }
}

/**
 * 取消收藏
 */
async function removeFavorite(coachId) {
  try {
    const result = await api.removeFavorite(coachId);
    return result;
  } catch (error) {
    console.error('取消收藏失败:', error);
    throw error;
  }
}

/**
 * 切换收藏状态
 */
async function toggleFavorite(coachId, isFavorited) {
  try {
    if (isFavorited) {
      return await removeFavorite(coachId);
    } else {
      return await addFavorite(coachId);
    }
  } catch (error) {
    console.error('切换收藏状态失败:', error);
    throw error;
  }
}

/**
 * 检查是否已收藏
 */
async function checkFavorite(coachId) {
  try {
    const result = await api.checkFavorite(coachId);
    return result.favorited || false;
  } catch (error) {
    console.error('检查收藏状态失败:', error);
    return false;
  }
}

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  checkFavorite
};
