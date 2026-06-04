// pages/user/address/address.js - 地址管理
const app = getApp();
const api = require('../../../services/api');

Page({
  data: {
    addresses: [],
    loading: true,
    // 选择模式（用于选择地址）
    selectMode: false
  },

  onLoad(options) {
    const { select } = options;
    this.setData({ selectMode: select === 'true' });
    wx.setNavigationBarTitle({
      title: this.data.selectMode ? '选择地址' : '地址管理'
    });
    this._loaded = false;
  },

  onShow() {
    // 首次由 onLoad 触发过则跳过，后续由 onShow 刷新（如编辑/新增返回）
    if (this._loaded) {
      this.loadAddresses();
    }
    this._loaded = true;
  },

  async loadAddresses() {
    this.setData({ loading: true });
    try {
      // 从本地存储获取地址列表
      const addresses = wx.getStorageSync('addresses') || [];
      this.setData({ addresses, loading: false });
    } catch (error) {
      console.error('加载地址失败:', error);
      this.setData({ loading: false });
    }
  },

  // 添加新地址
  onAddAddress() {
    wx.navigateTo({ url: '/pages/user-center/address/edit/edit' });
  },

  // 编辑地址
  onEditAddress(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/user-center/address/edit/edit?id=${id}` });
  },

  // 删除地址
  onDeleteAddress(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          this.deleteAddress(id);
        }
      }
    });
  },

  deleteAddress(id) {
    const { addresses } = this.data;
    const newAddresses = addresses.filter(a => a.id !== id);
    wx.setStorageSync('addresses', newAddresses);
    this.setData({ addresses: newAddresses });
    wx.showToast({ title: '删除成功', icon: 'success' });
  },

  // 点击地址条目
  onAddressTap(e) {
    if (this.data.selectMode) {
      this.onSelectAddress(e);
    }
  },

  // 选择地址（选择模式）
  onSelectAddress(e) {
    if (!this.data.selectMode) return;

    const { id } = e.currentTarget.dataset;
    const address = this.data.addresses.find(a => a.id === id);

    if (address) {
      // 存储选中的地址
      wx.setStorageSync('selectedAddress', address);
      wx.navigateBack();
    }
  },

  // 设置默认地址
  onSetDefault(e) {
    const { id } = e.currentTarget.dataset;
    const { addresses } = this.data;

    const newAddresses = addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    }));

    wx.setStorageSync('addresses', newAddresses);
    this.setData({ addresses: newAddresses });
    wx.showToast({ title: '已设为默认', icon: 'success' });
  },

  // 打开地图选择位置
  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        const { name, address, latitude, longitude } = res;
        wx.navigateTo({
          url: `/pages/user-center/address/edit/edit?latitude=${latitude}&longitude=${longitude}&name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}`
        });
      },
      fail: () => {
        wx.showToast({ title: '请开启位置权限', icon: 'none' });
      }
    });
  }
});
