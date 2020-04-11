const db = wx.cloud.database()
const _ = db.command

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
    listdata:[]





  },
  check:function(e){
    console.log(e.currentTarget.id)
    wx.navigateTo({
      url: '../news/news?newscode=' + e.currentTarget.id,
    })
  },
  onLoad(options){
    let that = this
    db.collection("news").orderBy('startdate', 'desc')
    .get()
    .then(res=>{
        that.setData({
          listdata:res.data
         
        })
      console.log(this.data.listdata)
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
      case 1: {
        wx.redirectTo({
          url: 'user_my'
        })
      }
    }

  },

})