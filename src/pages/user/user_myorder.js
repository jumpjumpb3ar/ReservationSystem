// pages/user/user_myorder.js
const db = wx.cloud.database()
const $ = db.command.aggregate
Page({

  /**
   * 页面的初始数据
   */
  data: {
    show: false,
    columns: ["0","1"],
    gottime:"",
    usercode: "2016001",
    listdata1: [{
      "index":0,
      "opendata": "9",
      "week": "4",
      "venue": "篮球馆1",
      "fee": 10,
      "time": "2020/02/09 14:51:22"

    }, {
        "index": 1,
        "opendata": "10",
        "week": "4",
        "venue": "篮球馆1",
        "fee": 10,
        "time": "2020/02/09 14:52:50"

      }],
    listdata2: [{
      "opendata": "10",
      "week": "2",
      "venue": "篮球馆1",
      "fee": 10,
      "time": "2020/01/09 21:00:23"
    },
      {
        "opendata": "9",
        "week": "4",
        "venue": "篮球馆1",
        "fee": 10,
        "time": "2020/01/08 15:20:03"
      },
      {
        "opendata": "14",
        "week": "4",
        "venue": "篮球馆1",
        "fee": 10,
        "time": "2020/01/07 00:51:23"
      },
    
    
    
    ],
    

  },
  myorder: function (e) {
    console.log(e)
    this.setData({
      show: true
    })
  },

  onConfirm(event) {
    const { picker, value, index } = event.detail;
    console.log(event)
    this.setData({ show: false });
  },

  onCancel() {
    this.setData({ show: false });
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    var util = require("../../utils/util.js")
    let time = util.formatTime(new Date());
    console.log(time);

    
   

  
  },

})