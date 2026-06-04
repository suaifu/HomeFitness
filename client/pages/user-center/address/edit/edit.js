// pages/user/address/edit/edit.js - 地址编辑
Page({
  data: {
    addressId: null,
    isEdit: false,
    // 地址数据
    contactName: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail: '',
    tag: '',
    isDefault: false,
    latitude: null,
    longitude: null,
    locationName: '',
    // 地址标签选项
    tagOptions: ['家', '公司', '父母家', '其他'],
    // 表单验证
    errors: {}
  },

  onLoad(options) {
    const { id, latitude, longitude, name, address } = options;

    // 从地图选择进入
    if (latitude && longitude) {
      this.setData({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        locationName: decodeURIComponent(name || ''),
        detail: decodeURIComponent(address || '')
      });
      this.reverseGeocode(latitude, longitude);
    }

    // 编辑模式
    if (id) {
      this.setData({ addressId: id, isEdit: true });
      wx.setNavigationBarTitle({ title: '编辑地址' });
      this.loadAddress(id);
    } else {
      wx.setNavigationBarTitle({ title: '新增地址' });
    }
  },

  loadAddress(id) {
    const addresses = wx.getStorageSync('addresses') || [];
    const address = addresses.find(a => a.id === id);

    if (address) {
      this.setData({
        contactName: address.contactName,
        phone: address.phone,
        province: address.province,
        city: address.city,
        district: address.district,
        detail: address.detail,
        tag: address.tag,
        isDefault: address.isDefault,
        latitude: address.latitude,
        longitude: address.longitude,
        locationName: address.locationName || ''
      });
    }
  },

  // 逆地理编码（模拟，实际需要调用地图API）
  reverseGeocode(latitude, longitude) {
    // 这里应该调用腾讯/高德地图API获取地址
    // 暂时使用模拟数据
    this.setData({
      province: '北京市',
      city: '北京市',
      district: '朝阳区'
    });
  },

  // 输入处理
  onContactNameInput(e) {
    this.setData({ contactName: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onDetailInput(e) {
    this.setData({ detail: e.detail.value });
  },

  // 选择标签
  onTagSelect(e) {
    const tag = e.currentTarget.dataset.tag;
    this.setData({ tag: this.data.tag === tag ? '' : tag });
  },

  // 设为默认
  onDefaultChange(e) {
    this.setData({ isDefault: e.detail.value.length > 0 });
  },

  // 地图选址
  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          locationName: res.name,
          detail: res.address
        });
        this.reverseGeocode(res.latitude, res.longitude);
      }
    });
  },

  // 表单验证
  validate() {
    const { contactName, phone, detail } = this.data;
    const errors = {};

    if (!contactName.trim()) {
      errors.contactName = '请输入联系人姓名';
    }

    if (!phone.trim()) {
      errors.phone = '请输入手机号码';
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      errors.phone = '请输入正确的手机号码';
    }

    if (!detail.trim()) {
      errors.detail = '请输入详细地址';
    }

    this.setData({ errors });
    return Object.keys(errors).length === 0;
  },

  // 保存地址
  onSave() {
    if (!this.validate()) return;

    wx.showLoading({ title: '保存中...' });

    const {
      addressId, contactName, phone, province, city, district,
      detail, tag, isDefault, latitude, longitude, locationName
    } = this.data;

    const addresses = wx.getStorageSync('addresses') || [];

    const addressData = {
      id: addressId || Date.now(),
      contactName,
      phone,
      province,
      city,
      district,
      detail,
      tag,
      isDefault,
      latitude,
      longitude,
      locationName,
      updatedAt: new Date().toISOString()
    };

    let newAddresses;
    if (addressId) {
      // 编辑模式：替换对应地址，如设为默认则清除其他默认
      newAddresses = addresses.map(a =>
        a.id === addressId
          ? addressData
          : (isDefault ? { ...a, isDefault: false } : a)
      );
    } else {
      // 新增模式：如设为默认先清除其他默认，再追加
      if (isDefault) {
        newAddresses = [...addresses.map(a => ({ ...a, isDefault: false })), addressData];
      } else {
        newAddresses = [...addresses, addressData];
      }
    }

    wx.setStorageSync('addresses', newAddresses);
    wx.hideLoading();

    wx.showToast({
      title: '保存成功',
      icon: 'success',
      success: () => {
        setTimeout(() => wx.navigateBack(), 1500);
      }
    });
  }
});
