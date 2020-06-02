// src/pages/user/user_order.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    usercode:"",
    placename:"",
    week:"",
    time:"",
    fee:"",
   
  },

  order:function(){
    wx.showToast({
      title: '预约成功',
      icon: 'success',
      duration: 2000,
      mask: true,

    })
  },

  onLoad: function (options) {
    console.log(options)
    this.setData({
      placename: options.placename,
      week: options.week,
      time: options.time,
      fee: options.fee,
    })
    let tmp = wx.getStorageSync('usercode')
    this.setData({
      usercode: tmp
    })
    console.log("got usercode:", this.data.usercode)
  }

})