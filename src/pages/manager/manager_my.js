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
    code: "2016012",
    placecode:"",
    startdate:"",
    enddate:"",
    placename:"",
    name: "李九",
    password: "123467",
    inputpassword: "******"
  },
  onLoad:function(option){
    let that = this
    db.collection("zhiban").where({
      mangercode: that.data.code
    }).get().then(res =>{
      console.log(res.data[0].placecode)
      if(res.data.length!=0){
        that.setData({
          placecode: res.data[0].placecode,
          startdate: res.data[0].startdate,
          enddate: res.data[0].enddate,
          
        })      
        db.collection("playground").where({
          placecode: that.data.placecode
        }).get().then(res => {
          console.log(res)
          console.log(res.data[0])
          if (res.data.length != 0) {
            that.setData({
              placename: res.data[0].name
            })
          }
        })
      }
    })
 
  },
  onChange: function (e) {
    this.setData({
      inputpassword: e.detail
    })
  },
  changecode: function () {
    console.log(this.data.inputpassword)
  },
  tabChange(e) {
    console.log('tab change', e)
    switch (e.detail.index) {
      case 0: {
        wx.redirectTo({
          url: 'manager'
        })
        break;
      }
      case 2: {
        wx.redirectTo({
          url: 'manager_news'
        })
      }
    }

  },

})