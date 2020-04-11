// pages/users/users.js
//初始化数据库
const db = wx.cloud.database()
// wx.getSystemInfo({获取系统信息
//   success(res) {
//     console.log(res.model)
//     console.log(res.pixelRatio)
//     console.log(res.windowWidth)
//     console.log(res.windowHeight)
//     console.log(res.language)
//     console.log(res.version)
//     console.log(res.platform)
//   }
// })
var mapchoose=""
var mapchooseID=-1
const venues = [];//场馆
const weeks = [];//星期
const times = [];//时间
//获取总场地信息表
const playgroundCollection = db.collection('playground')
var gpsiconPath = "../image/gps2.png";
var iconwidth = 30;
var fontcolor = "#0c3883";
var bgcolor = "#fbebd0";
var fontSize = 16;
Page({
  queryDatabase: function (event) {

    // var util = require("../../utils/util.js")
    // let time = util.formatTime(new Date());
    // let date = util.getDates(7, time);
    // console.log(date);
    var total = 0;
    playgroundCollection.count().then(res => { total = res.total })
    console.log("total = " + total)
    playgroundCollection.limit(97).get().then(res => {
      console.log(res)
    })



  },
  useCloud: function (event) {
    let that = this
    wx.cloud.callFunction({
      name: "getList"
    }).then(res => {
      console.log(res.result)
      that.setData({
        datalist: res.result.data
      })
    })
  },

  gotoVenue:function(event){
    console.log("gotoVenue:" + mapchooseID + mapchoose)
    if(mapchooseID==-1){
      wx.showToast({
        title: '请先选择场馆',
        icon:'none',
        duration: 2000,
        image:'../image/error.png',
        mask: true,
     
      })
    }else{
      wx.navigateTo({
        url: 'user_venue',
        success: function (res) {
          res.eventChannel.emit('DataFromMapPage', {
            choose: mapchoose,
            chooseID: mapchooseID,
          })
        },
      })

    }

   
  },
  data: {
    usercode:"",
    mapchoose:"无",
    mapchooseID:-1,

    list: [{
      "text": "场馆查看",
      "iconPath":"/pages/image/stadium.png",
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



    markers: [
      //LQ-1 LQ-2
      {
        id: 0,
        iconPath: gpsiconPath,
        callout: {
          content: "篮球馆",
          color: fontcolor,
          bgColor: bgcolor,
          borderWidth: 0.5,
          borderRadius: 5,
          textAlign: "center",
          padding: 3,
          fontSize: fontSize
        },
        latitude: 39.9816952200,
        longitude: 116.4301443100,
        width: iconwidth,  //图片显示宽度
        height: iconwidth  //图片显示高度
      },
      //PQ-1 PQ-2 PQ-3 PQ-4 PQ-5 PQ-6 PQ-7
      {
        id: 1,
        iconPath: gpsiconPath,
        callout: {
          content: "乒乓球馆",
          color: fontcolor,
          bgColor: bgcolor,
          borderWidth: 0.5,
          borderRadius: 5,
          textAlign: "center",
          padding: 3,
          fontSize: fontSize
        },
        latitude: 39.9818511429,
        longitude: 116.4251549416,
        width: iconwidth,
        height: iconwidth
      },
      //YMQ-1 YMQ-2 YMQ-3 YMQ-4 YMQ-5 YMQ-6
      {
        id: 2,
        iconPath: gpsiconPath,
        callout: {
          content: "羽毛球馆",
          color: fontcolor,
          bgColor: bgcolor,
          borderWidth: 0.5,
          borderRadius: 5,
          textAlign: "center",
          padding: 3,
          fontSize: fontSize
        },
        latitude: 39.9830021429,
        longitude: 116.4256809416,
        width: iconwidth,
        height: iconwidth
      },
      //HT-1 HT-2 HT-3 HT-4 HT-5
      {
        id: 3,
        iconPath: gpsiconPath,
        callout: {
          content: "红天地下体育馆",
          color: fontcolor,
          bgColor: bgcolor,
          borderWidth: 0.5,
          borderRadius: 5,
          textAlign: "center",
          padding: 3,
          fontSize: fontSize
        },
        latitude: 39.9829671429,
        longitude: 116.4260989416,
        width: iconwidth,
        height: iconwidth
      },
      //JSF
      {
        id: 4,
        iconPath: gpsiconPath,
        callout: {
          content: "健身房",
          color: fontcolor,
          bgColor: bgcolor,
          borderWidth: 0.5,
          borderRadius: 5,
          textAlign: "center",
          padding: 3,
          fontSize: fontSize
        },
        latitude: 39.9829851429,
        longitude: 116.4250249416,
        width: iconwidth,
        height: iconwidth
      }
    ]

  },

  tabChange(e) {
    console.log('tab change', e)
    switch (e.detail.index){
      case 1:{
        wx.redirectTo({
          url: 'user_my'
        })
        break;
      }
      case 2: {
        wx.redirectTo({
          url: 'user_news'
        })
        break;
      }

    }

  },

  markertap(e) {//用户选取了某一个mark后
    mapchooseID = e.markerId
    
    switch (e.markerId) {
      case 0: {
        console.log("得到了0")
        mapchoose = "篮球馆"
        this.setData({
          mapchoose: "篮球馆"
        })
        break;
      }
      case 1: {
        console.log("得到了1")
        mapchoose= "乒乓球馆"
        this.setData({
          mapchoose: "乒乓球馆"
        })
        break;
      }
      case 2: {
        console.log("得到了2")
        mapchoose="羽毛球馆"
        this.setData({
          mapchoose: "羽毛球馆"
        })
        break;
      }
      case 3: {
        console.log("得到了3")
        mapchoose="红山地下体育馆"
        this.setData({
          mapchoose :"红山地下体育馆"
        })
        break;
      }
      case 4: {
        console.log("得到了4")
        mapchoose="健身房"
        this.setData({mapchoose :"健身房"});
        break;
      }






    }






  },
  onLoad: function (options) {
    let tmp = wx.getStorageSync('usercode')
    this.setData({
      usercode: tmp
    })
    console.log("got usercode:", this.data.usercode)
  },

})