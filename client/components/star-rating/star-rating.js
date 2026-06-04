// components/star-rating/star-rating.js
Component({
  properties: {
    // 评分值 (0-5，支持小数)
    value: {
      type: Number,
      value: 0
    },
    // 是否只读（不显示可点击）
    readonly: {
      type: Boolean,
      value: false
    },
    // 星星数量
    count: {
      type: Number,
      value: 5
    },
    // 星星大小
    size: {
      type: String,
      value: '36rpx'
    },
    // 间距
    gap: {
      type: String,
      value: '8rpx'
    },
    // 颜色
    color: {
      type: String,
      value: '#FFB800'
    },
    // 背景颜色（未选中）
    bgColor: {
      type: String,
      value: '#E0E0E0'
    },
    // 是否显示文字评分
    showText: {
      type: Boolean,
      value: false
    }
  },

  data: {
    stars: []
  },

  observers: {
    'value, count': function() {
      this.updateStars();
    }
  },

  lifetimes: {
    attached() {
      this.updateStars();
    }
  },

  methods: {
    updateStars() {
      const { value, count } = this.data;
      const stars = [];

      for (let i = 1; i <= count; i++) {
        let status = 'empty'; // 空星
        if (value >= i) {
          status = 'full'; // 满星
        } else if (value >= i - 0.5) {
          status = 'half'; // 半星
        }
        stars.push({ status, index: i });
      }

      this.setData({ stars });
    },

    onTap(e) {
      if (this.data.readonly) return;

      const index = e.currentTarget.dataset.index;
      const { value } = this.data;

      // 点击切换：点击相同位置在整数和半星之间切换
      let newValue;
      if (Math.floor(value) === index && value % 1 === 0) {
        newValue = index - 0.5; // 变成半星
      } else {
        newValue = index; // 变成整数
      }

      this.triggerEvent('change', { value: newValue });
    },

    // 获取评分文字描述
    getRatingText() {
      const { value } = this.data;
      if (value >= 5) return '非常满意';
      if (value >= 4) return '满意';
      if (value >= 3) return '一般';
      if (value >= 2) return '较差';
      if (value >= 1) return '很差';
      return '请评分';
    }
  }
});
