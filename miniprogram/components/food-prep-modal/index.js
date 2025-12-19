// components/food-prep-modal/index.js
Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    loveEnergy: {
      type: Number,
      value: 0
    },
    foodInventory: {
      type: Object,
      value: {
        rice_ball: 0,
        luxury_bento: 0
      }
    }
  },

  lifetimes: {
    attached() {
      console.log('food-prep-modal attached, show:', this.properties.show);
    },
    detached() {
      console.log('food-prep-modal detached');
    }
  },

  data: {
    selectedFood: 'rice_ball',
    isPreparing: false,
    animationClass: '',
    canPrepare: false,
    foodCosts: {
      rice_ball: 20,
      luxury_bento: 100
    }
  },

  observers: {
    'loveEnergy, selectedFood': function(loveEnergy, selectedFood) {
      this.setData({
        canPrepare: loveEnergy >= this.data.foodCosts[selectedFood]
      });
    }
  },

  methods: {
    stopPropagation() {
      // 阻止事件冒泡
    },

    onCancel() {
      if (this.data.isPreparing) return;
      this.triggerEvent('cancel');
    },

    selectFood(e) {
      if (this.data.isPreparing) return;
      const type = e.currentTarget.dataset.type;
      this.setData({
        selectedFood: type
      });
    },

    onConfirm() {
      if (this.data.isPreparing) return;

      const cost = this.data.foodCosts[this.data.selectedFood];

      // 检查爱意是否足够
      if (this.data.loveEnergy < cost) {
        wx.showToast({
          title: '爱意不足',
          icon: 'none'
        });
        return;
      }

      // 开始准备动画
      this.setData({
        isPreparing: true,
        animationClass: 'shake'
      });

      // 触发准备事件
      this.triggerEvent('prepare', {
        foodType: this.data.selectedFood,
        cost: cost
      });

      // 模拟准备过程
      setTimeout(() => {
        this.setData({
          isPreparing: false,
          animationClass: ''
        });

        // 触发成功事件
        this.triggerEvent('success', {
          foodType: this.data.selectedFood
        });
      }, 1500);
    }
  }
});