//app.js
App({
  onLaunch: function () {
    //云开发初始化
    wx.cloud.init({
      env:"playground-0991"
    })
  },


  globalData: {
    userInfo: null
  }
})