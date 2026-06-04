// pages/user/favorites/favorites.js - 我的收藏
const app = getApp();
const api = require('../../../services/api');
const favoritesService = require('../../../services/favorites');
const adapter = require('../../../services/adapter');

Page({
  data: {
    favorites: [],
    loading: true,
    isEmpty: false
  },

  onLoad() {
    this.loadFavorites();
  },

  onShow() {
    // 从教练详情页取消收藏后返回时刷新
    if (this._loaded) {
      this.loadFavorites();
    }
    this._loaded = true;
  },

  async loadFavorites() {
    if (!app.globalData.token) {
      this.setData({ loading: false, isEmpty: true });
      return;
    }

    this.setData({ loading: true });

    try {
      const result = await favoritesService.getFavorites();
      const list = (result.list || []).map(item => adapter.adaptCoach(item));

      this.setData({
        favorites: list,
        isEmpty: list.length === 0,
        loading: false
      });
    } catch (error) {
      console.error('加载收藏列表失败:', error);
      this.setData({ loading: false, isEmpty: true });
    }
  },

  // 跳转教练详情
  onCoachTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/coach/detail?id=${id}` });
  },

  // 取消收藏
  onRemoveFavorite(e) {
    const { id, index } = e.currentTarget.dataset;

    wx.showModal({
      title: '提示',
      content: '确定取消收藏该教练？',
      confirmColor: '#FF6B6B',
      success: async (res) => {
        if (res.confirm) {
          try {
            await favoritesService.removeFavorite(id);
            api.clearCache('favorites');
            api.clearCache(`coach_${id}`);
            const favorites = this.data.favorites;
            favorites.splice(index, 1);

            this.setData({
              favorites,
              isEmpty: favorites.length === 0
            });

            // 清除缓存
            api.clearCache('favorites');
            wx.showToast({ title: '已取消收藏', icon: 'success' });
          } catch (error) {
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 去找教练
  onBrowseCoaches() {
    wx.switchTab({ url: '/pages/coach/list' });
  },

  onShareAppMessage() {
    return {
      title: '上门健身 - 专业教练上门服务',
      path: '/pages/index/index'
    };
  }
});
