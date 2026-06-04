// components/CoachCard/CoachCard.js - 教练卡片组件
Component({
  properties: {
    // 教练数据
    coach: {
      type: Object,
      value: {}
    },
    // 显示模式: card(卡片) / simple(简约) / horizontal(横向)
    mode: {
      type: String,
      value: 'card'
    },
    // 是否显示预约按钮
    showBooking: {
      type: Boolean,
      value: true
    },
    // 是否显示距离
    showDistance: {
      type: Boolean,
      value: false
    }
  },

  data: {
    defaultAvatar: '/images/default-avatar.png'
  },

  methods: {
    onTap() {
      const { id } = this.properties.coach;
      if (id) {
        wx.navigateTo({
          url: `/pages/coach/detail?id=${id}`
        });
      }
    },

    onBookingTap(e) {
      // 阻止冒泡
      const { id } = this.properties.coach;
      this.triggerEvent('booking', { coachId: id });
    }
  }
});
