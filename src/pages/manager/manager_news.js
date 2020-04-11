// pages/manager/manager.js
const db = wx.cloud.database()
const _ = db.command

Page({

  /**
   * 页面的初始数据
   */
  data: {
    list: [{
      "text": "场馆管理",
      "iconPath": "/pages/image/stadium.png",
      "selectedIconPath": "/pages/image/stadium.png",
    },
    {
      "text": "我的信息",
      "iconPath": "/pages/image/account.png",
      "selectedIconPath": "/pages/image/account.png",
    },
    {
      "text": "新闻管理",
      "iconPath": "/pages/image/news.png",
      "selectedIconPath": "/pages/image/news.png",
    }
    ],
    mangercode:"2016012",
    listdata: []


  },
  onLoad(options) {
    let that = this
    db.collection("news").where({
      code:that.data.mangercode
      })
      .orderBy('startdate', 'desc')
      .get()
      .then(res => {
        that.setData({
          listdata: res.data
        })
        console.log(this.data.listdata)
      })
  },
  addnews:function(){
    wx.navigateTo({
      url: 'create_news'
    })
  },


  tabChange(e) {
    console.log('tab change', e)
    switch (e.detail.index) {
      case 0:
        {
          wx.redirectTo({
            url: 'manager'
          })
          break;
        }
      case 1:
        {
          wx.redirectTo({
            url: 'manager_my'
          })
        }
    }

  },

})