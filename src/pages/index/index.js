//index.js
//获取应用实例
const app = getApp()

Page({
  data: {
    list: [{
      "text": "11",
      "pagePath": "pages/users/users",
    
    },
    {
      "text": "设置",
      "pagePath": "../users/users",
      
    }]},
  //跳转页面
  navigaterToUsers:function(event){
    wx.navigateTo({
      url: '../user/user_map',
    })
  },
  navigaterToManager: function (event) {
    wx.navigateTo({
      url: '../manager/manager',
    })
  },
  navigaterToNews: function (event) {
    wx.navigateTo({
      url: '../news/news',
    })
  },

  tabChange(e) {
    console.log('tab change', e)
    
  }



  })
