// src/pages/user/user_my.js

Page({

  /**
   * 页面的初始数据
   */
 

  data: {
    list: [{
      "text": "场馆查看",
      "iconPath": "/pages/image/stadium.png",
      "selectedIconPath": "/pages/image/stadium.png",

    },
    {
      "text": "我的账户",
      "iconPath": "/pages/image/account.png",
      "selectedIconPath": "/pages/image/account.png",
    },
    {
      "text": "新闻一览",
      "iconPath": "/pages/image/news.png",
      "selectedIconPath": "/pages/image/news.png",

    }],
    listdata1:[
      {"code":"2016003",
      "index":1
      },
      {
        "code": "2016002",
        "index": 2
      },
      {
        "code": "2016001",
        "index": 3
      },
      {
        "code": "2016006",
        "index": 4
      },
      {
        "code": "2016009",
        "index": 5
      },
    ],
    listdata2:[{
      "code":"2016001",
      "index":3
    }]
  }, 
  gotoMyorder:function(){
    wx.navigateTo({
      url: 'user_myorder',
      success: function(res) {},
      fail: function(res) {},
      complete: function(res) {},
    })
  },
  gotoMyinfo:function(){
    wx.navigateTo({
      url: 'user_myinfo',
      success: function(res) {},
      fail: function(res) {},
      complete: function(res) {},
    })
  },
  tabChange(e) {
    console.log('tab change', e)
    switch (e.detail.index) {
      case 0: {
        wx.redirectTo({
          url: 'user_map'
        })
        break;
      }
      case 2: {
        wx.redirectTo({
          url: 'user_news'
        })
      }
    }

  },

})