// pages/index/index.js - 首页（优化版：真实API + 性能优化）
const app = getApp();
const api = require('../../services/api');

Page({
  data: {
    // 轮播图数据
    banners: [],

    // 健身分类
    categories: [],

    // 热门教练
    hotCoaches: [],

    // 推荐课程
    recommendedCourses: [],

    // 用户信息
    userInfo: null,

    // 当前定位
    currentLocation: '定位中...',

    // 页面状态
    loading: true,
    loadFailed: false,

    // 骨架屏
    showSkeleton: true,
  },

  // 纯数据字段（不参与渲染，减少 setData 开销）
  options: {
    pureDataPattern: /^_/
  },

  _imageObserver: null,

  onLoad() {
    this.initPage();
  },

  onShow() {
    // 检查用户登录状态
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ userInfo });
    }
  },

  onPullDownRefresh() {
    this.refreshData();
  },

  onShareAppMessage() {
    return {
      title: '上门健身 - 专业教练上门服务',
      path: '/pages/index/index',
      imageUrl: this.data.banners[0]?.image_url || ''
    };
  },

  onShareTimeline() {
    return {
      title: '上门健身 - 专业教练上门服务',
      query: '',
      imageUrl: this.data.banners[0]?.image_url || ''
    };
  },

  // 初始化页面 — 合并所有初始化 setData 为一次调用
  async initPage() {
    // 先用本地缓存数据快速渲染
    const cachedCategories = app.globalData.categories || [];
    const cachedUserInfo = wx.getStorageSync('userInfo');

    this.setData({
      categories: cachedCategories,
      userInfo: cachedUserInfo || null,
      loading: true,
      showSkeleton: true
    });

    // 并行请求后端数据
    try {
      const [homeData] = await Promise.all([
        api.getHomeData(),
        this.getCurrentLocation()
      ]);

      // 一次性 setData 更新所有数据
      const updateData = {
        banners: homeData.banners || [],
        hotCoaches: homeData.featuredCoaches || [],
        categories: homeData.categories || cachedCategories,
        loading: false,
        loadFailed: false,
        showSkeleton: false
      };

      // 更新全局分类数据
      if (homeData.categories?.length) {
        app.globalData.categories = homeData.categories;
      }

      this.setData(updateData);

      // 延迟初始化图片懒加载
      setTimeout(() => this.initImageObserver(), 300);

    } catch (error) {
      console.error('加载首页数据失败:', error);
      this.setData({
        loading: false,
        loadFailed: true,
        showSkeleton: false
      });
    }
  },

  // 获取当前位置
  getCurrentLocation() {
    return new Promise((resolve) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          // 使用微信内置逆地理编码（需配合地图API）
          // 开发阶段先用经纬度简化显示
          const lat = res.latitude.toFixed(2);
          const lng = res.longitude.toFixed(2);
          this.setData({ currentLocation: `${lat}°N ${lng}°E` });

          // 尝试逆地理编码获取中文地址
          this.reverseGeocode(res.latitude, res.longitude);
          resolve(res);
        },
        fail: () => {
          this.setData({ currentLocation: '点击设置位置' });
          resolve(null);
        }
      });
    });
  },

  // 逆地理编码 — 使用腾讯地图WebService API
  // 需要在 app.json 的 requiredPrivateInfos 中声明 getLocation
  reverseGeocode(lat, lng) {
    // 腾讯地图 Key（需要去 lbs.qq.com 申请）
    // 开发阶段使用简化版，上线前替换为真实 Key
    const MAP_KEY = ''; // TODO: 填入腾讯地图 Key

    if (!MAP_KEY) {
      // 没有 Key 时使用 wx.chooseLocation 让用户手动选
      this.setData({ currentLocation: '当前位置' });
      return;
    }

    wx.request({
      url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=${MAP_KEY}`,
      success: (res) => {
        if (res.data?.status === 0) {
          const addr = res.data.result?.formatted_addresses?.recommend
            || res.data.result?.address;
          if (addr) {
            this.setData({ currentLocation: addr });
          }
        }
      },
      fail: () => {
        this.setData({ currentLocation: '当前位置' });
      }
    });
  },

  // 初始化图片懒加载观察器
  initImageObserver() {
    if (this._imageObserver) {
      this._imageObserver.disconnect();
    }
    this._imageObserver = wx.createIntersectionObserver(this, {
      thresholds: [0.1]
    });
    this._imageObserver.relativeToViewport({ bottom: 200 })
      .observe('.lazy-image', (res) => {
        if (res.intersectionRatio > 0) {
          const key = `imgLoaded_${res.dataset.index}`;
          this.setData({ [key]: true });
        }
      });
  },

  // 刷新数据
  async refreshData() {
    api.clearCache('home');
    api.clearCache('banners');
    api.clearCache('categories');

    try {
      await this.initPage();
      wx.stopPullDownRefresh();
      wx.showToast({ title: '刷新成功', icon: 'success' });
    } catch (e) {
      wx.stopPullDownRefresh();
    }
  },

  // 重试加载
  onRetryLoad() {
    this.initPage();
  },

  // 点击分类
  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category;
    wx.navigateTo({
      url: `/pages/coach/list?category=${category.id}`
    });
  },

  // 点击教练
  onCoachTap(e) {
    const coachId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/coach/detail?id=${coachId}`
    });
  },

  // 点击课程
  onCourseTap(e) {
    const courseId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/extra/course-booking/booking?id=${courseId}`
    });
  },

  // 点击搜索 — TabBar 页不能用 navigateTo，用 switchTab + 全局标记
  onSearchTap() {
    app.globalData.searchFromHome = true;
    wx.switchTab({ url: '/pages/coach/list' });
  },

  // 点击位置 — 打开地图选点
  onLocationTap() {
    wx.chooseLocation({
      success: (res) => {
        // 用户选择了位置
        const address = res.name || res.address || '已选择位置';
        this.setData({ currentLocation: address });
      },
      fail: (err) => {
        // 用户取消选择，不处理
        if (err.errMsg?.includes('cancel')) return;

        // 权限被拒，引导去设置
        wx.showModal({
          title: '位置权限',
          content: '需要获取您的位置才能推荐附近的教练，是否前往设置开启？',
          confirmText: '去设置',
          success: (modalRes) => {
            if (modalRes.confirm) wx.openSetting();
          }
        });
      }
    });
  },

  // 点击用户头像
  onUserTap() {
    if (this.data.userInfo) {
      wx.switchTab({ url: '/pages/user/profile' });
    } else {
      this.login();
    }
  },

  // 登录
  async login() {
    try {
      app.showLoading('登录中...');
      const result = await app.wxLogin();
      this.setData({ userInfo: result.user });
      app.showSuccess('登录成功');
    } catch (error) {
      app.showError('登录失败');
    } finally {
      app.hideLoading();
    }
  },

  // 立即预约
  onQuickBooking() {
    if (!app.globalData.token) {
      wx.showModal({
        title: '提示',
        content: '请先登录再进行预约',
        confirmColor: '#FF6B6B',
        success: (res) => {
          if (res.confirm) this.login();
        }
      });
      return;
    }
    wx.switchTab({ url: '/pages/coach/list' });
  },

  // 查看全部教练
  onViewAllCoaches() {
    wx.switchTab({ url: '/pages/coach/list' });
  },

  // 查看全部课程
  onViewAllCourses() {
    wx.navigateTo({ url: '/pages/extra/course-booking/booking?list=true' });
  },

  onUnload() {
    if (this._imageObserver) {
      this._imageObserver.disconnect();
    }
  }
});
