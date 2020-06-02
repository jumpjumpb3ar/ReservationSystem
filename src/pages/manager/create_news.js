// pages/manager/create_news.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    starttime:""
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let tmp = wx.getStorageSync('mangercode')
    var util = require("../../utils/util.js")
    let time = util.formatTime(new Date());
    this.setData({
      usercode: tmp,
      starttime: time
    })
    console.log("got mangercode:", this.data.usercode)
  },

})