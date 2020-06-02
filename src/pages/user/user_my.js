// src/pages/user/user_my.js
const db = wx.cloud.database()
const _ = db.command
Page({

  /**
   * 页面的初始数据
   */


  data: {
    usercode: "2016002",
    isTeacher:false,
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

      }
    ],
    listdata: [],
    listdata1: [],
    listdata2: []
  },
  gotoMyorder: function() {
    wx.navigateTo({
      url: 'user_myorder',
      success: function(res) {},
      fail: function(res) {},
      complete: function(res) {},
    })
  },
  gotoMyinfo: function() {
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
      case 0:
        {
          wx.redirectTo({
            url: 'user_map'
          })
          break;
        }
      case 2:
        {
          wx.redirectTo({
            url: 'user_news'
          })
        }
    }

  },
  indexcode: function() {
    let data = this.data.listdata
    var codelist = []
    var sumlist = []

    for (let i = 0; i < data.length; i++) {
      if (codelist.includes(data[i].code)) {
        sumlist[codelist.indexOf(data[i].code)] = sumlist[codelist.indexOf(data[i].code)] + 1
      } else {
        codelist.push(data[i].code)
        sumlist.push(1)
      }
    }
    
    var indexlist=[]
    for(let i=0;i<sumlist.length;i++){
      indexlist.push(sumlist[i])
    }

    indexlist.sort(function (a, b) { return b - a });
    if (codelist.includes(this.data.usercode)) {
      let j = codelist.indexOf(this.data.usercode)
      let k = sumlist[j]
      let myindex = indexlist.indexOf(k)
      let tmp = {
        "code": this.data.usercode,
        "index": myindex+1
      }
      this.data.listdata2 = []
      this.data.listdata2.push(tmp)
    } else {
      let tmp = {
        "code": this.data.usercode,
        "index": "未上榜"
      }
      this.data.listdata2 = []
      this.data.listdata2.push(tmp)
    }


    console.log("idnexlist",indexlist)
    let len = codelist.length
    if(len>5)len=5
    for(let i=0;i<len;i++){
      console.log("index",indexlist)
      let j = sumlist.indexOf(indexlist[i])
      console.log("j",j)
      let tmp={
        "code":codelist[j],
        "index":i+1
      }
      this.data.listdata1.push(tmp)
      codelist.splice(j,1)
      sumlist.splice(j,1)
    }
    
   
    this.setData({
      listdata1: this.data.listdata1,
      listdata2:this.data.listdata2
    })


  },
  onPullDownRefresh: function () {
    let that = this
    this.setData({
      listdata1: [],
      listdata2:[]
    })
    this.onLoad()
  },

  onLoad(options) {
    let tmp = wx.getStorageSync('usercode')
    this.setData({
      usercode: tmp
    })
    let tmp2 = wx.getStorageSync('isTeacher')
    this.setData({
      isTeacher: tmp2
    })
    let that = this
    db.collection("orders")
      .get()
      .then(res => {
        that.setData({
          listdata: res.data
        })
        that.indexcode()
      })


  }

})