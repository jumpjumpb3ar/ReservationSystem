// pages/manager/manager.js
const db = wx.cloud.database()
const _ = db.command
Page({

  /**
   * 页面的初始数据
   */
  data: {
    venuecode: "LQ-1",
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
    datalist: [],
    equiplist: [],
    //读取本地usercode
    usercode: "",
    //以下为从field中读取的数据存储名称
    inVenue: "",
    inMaxpeople: "",
    inFee: "",
    inWeek: [1, 2, 3, 4],
    inEqcode: "",
    inEqnum: 0
  },
  queryDatabase: function() {},
  tabChange(e) {
    console.log('tab change', e)
    switch (e.detail.index) {
      case 1:
        {
          wx.redirectTo({
            url: 'manager_my'
          })
          break;
        }
      case 2:
        {
          wx.redirectTo({
            url: 'manager_news'
          })
        }
    }

  },
  onLoad: function(options) {

    let tmp = wx.getStorageSync('usercode')
    this.setData({
      usercode: tmp
    })
    console.log("got usercode:", this.data.usercode)

    const eventChannel = this.getOpenerEventChannel()
    // eventChannel.on('DataFromMapPage', function(data) {
    //   console.log(data)
    //   userChoose = data.chooseID
    // })
    let that = this
    that.data.venuecode = "LQ-1"
    db.collection('playground')
      .where({
        placecode: _.eq(that.data.venuecode),
        opendate: 9
      })
      .orderBy('name', 'asc')
      .get().then(res => {
        that.data.datalist = res.data
        that.setData({
          datalist: res.data,
        })
      })
    db.collection('equip')
      .where({
        placecode: _.eq(that.data.venuecode),
      })
      .orderBy('equipcode', 'asc')
      .get().then(res => {
        that.data.equiplist = res.data
        that.setData({
          equiplist: res.data,
        })
      })
  },
  onChange: function(e) {
    switch (e.currentTarget.id) {
      case "inVenue":
        {
          this.setData({
            inVenue: e.detail
          })
          break;
        }
      case "inMaxpeople":
        {
          this.setData({
            inMaxpeople: e.detail
          })
          break;
        }
      case "inFee":
        {
          this.setData({
            inFee: e.detail
          })
          break;
        }
      case "inEqcode":
        {
          this.setData({
            inEqcode: e.detail
          })
          break;
        }
      case "inEqnum":
        {
          this.setData({
            inEqnum: e.detail
          })
          break;
        }
    }

  },
  changeEquip: function() {
    console.log("changeEquip:" + this.data.inEqcode)
    console.log("changeEquip:" + this.data.inEqnum)
    var tmplist = this.data.equiplist
    for (var i = 0; i < tmplist.length; i++) {
      if (tmplist[i].equipcode == this.data.inEqcode) {
        console.log(i)
        tmplist[i].num = this.data.inEqnum
        this.setData({
          equiplist: tmplist
        })
        break
      }
    }
  }

})