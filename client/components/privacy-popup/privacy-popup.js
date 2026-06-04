// components/privacy-popup/privacy-popup.js
// 微信隐私协议弹窗组件
// 用于 wx.requirePrivacyAuthorize 的自定义授权弹窗

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    innerShow: false
  },

  lifetimes: {
    attached() {
      // 监听隐私协议需要授权的事件
      if (wx.onNeedPrivacyAuthorization) {
        wx.onNeedPrivacyAuthorization((resolve, eventInfo) => {
          console.log('隐私授权触发:', eventInfo);
          this._resolve = resolve;
          this.setData({ innerShow: true });
        });
      }
    }
  },

  methods: {
    // 同意隐私协议
    onAgree() {
      this.setData({ innerShow: false });
      if (this._resolve) {
        this._resolve({ buttonAction: 'agree', event: 'tap' });
        this._resolve = null;
      }
      this.triggerEvent('agree');
    },

    // 拒绝隐私协议
    onDisagree() {
      this.setData({ innerShow: false });
      if (this._resolve) {
        this._resolve({ buttonAction: 'disagree' });
        this._resolve = null;
      }
      this.triggerEvent('disagree');
    },

    // 查看隐私政策
    onViewPrivacy() {
      wx.navigateTo({ url: '/pages/extra/privacy/privacy' });
    }
  }
});
