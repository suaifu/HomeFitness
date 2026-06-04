// utils/performance.js - 性能优化工具

/**
 * 图片懒加载观察器
 */
function createImageObserver() {
  return wx.createIntersectionObserver().relativeToViewport({ bottom: 200 });
}

/**
 * 预加载页面（使用微信官方预加载能力）
 * 注意：仅预加载代码包，不会触发页面生命周期
 */
function preloadPage(path) {
  if (wx.canIUse('preloadPage')) {
    wx.preloadPage({ url: path });
  }
  // 不支持时静默跳过，不使用 navigateTo 替代
}

/**
 * 节流setData
 */
function throttledSetData(page, data, delay = 50) {
  if (page._setDataTimer) clearTimeout(page._setDataTimer);
  page._setDataTimer = setTimeout(() => {
    page.setData(data);
  }, delay);
}

/**
 * 纯数据字段标记（不参与渲染）
 */
const PURE_DATA_FIELDS = {
  _loadingTimer: true,
  _setDataTimer: true,
  _pageStartTime: true
};

module.exports = { createImageObserver, preloadPage, throttledSetData, PURE_DATA_FIELDS };