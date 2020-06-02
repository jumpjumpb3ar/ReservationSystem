// pages/user/user_myorder.js
const db = wx.cloud.database()
const $ = db.command.aggregate
Page({

  /**
   * 页面的初始数据
   */
  data: {
    placedata: [],
    show: false,
    studyweek: 5,
    columns: ["0", "1"],
    gottime: "",
    usercode: "2016001",
    listdata: [],
    listdata1: [],
    listdata2: [],
    indexlist:[]


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
  getname: function (placecode) {
   
    for (let i = 0; i < this.data.placedata.length; i++) {
      if (this.data.placedata[i].placecode == placecode){
        return this.data.placedata[i].name
      }
      
    }
  },
  getfee: function (placecode) {
    
    for (let i = 0; i < this.data.placedata.length; i++) {
      if (this.data.placedata[i].placecode == placecode) {
        return this.data.placedata[i].fee
      }

    }
  },
  getorder: function () {
    let data = this.data.listdata
    var mylist = []
    var oldlist = []
    var newlist = []


    for (let i = 0; i < data.length; i++) {
      if (data[i].code == this.data.usercode) {
        mylist.push(data[i])
        if (data[i].reservedate[0] < this.data.studyweek) {
          oldlist.push(data[i])
        }else {
          newlist.push(data[i])
        }
      }
    }
    console.log("my",mylist)
    console.log("old", oldlist)
    console.log("new", newlist)

    console.log("mylist", mylist)
    this.data.listdata2=[]
    for (let i = 0; i < oldlist.length; i++) {
      let tmp = {
        "opendata": oldlist[i].reservedate[2],
        "week": oldlist[i].reservedate[1],
        "venue": this.getname(oldlist[i].placecode),
        "fee": this.getfee(oldlist[i].placecode),
        "time": "第" + oldlist[i].reservedate[0] + "学周",
      }
      this.data.listdata2.push(tmp)
      this.setData({
        listdata2: this.data.listdata2
      })
    }
    this.data.listdata1 = []
    for (let i = 0; i < newlist.length; i++) {
      let tmp = {
        "index":i,
        "opendata": newlist[i].reservedate[2],
        "week": newlist[i].reservedate[1],
        "venue": this.getname(newlist[i].placecode),
        "fee": this.getfee(newlist[i].placecode),
        "time": "第" + newlist[i].reservedate[0] + "学周",
      }
      this.data.listdata1.push(tmp)
      this.setData({
        listdata1: this.data.listdata1,
        indexlist:newlist
      })
    }



  },
  onPullDownRefresh: function () {
    let that = this
    this.setData({
      listdata1: [],
      listdata2: []
    })
    this.onLoad()
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var util = require("../../utils/util.js")
    let time = util.formatTime(new Date());
    console.log(time);
    let tmp = wx.getStorageSync('usercode')
    this.setData({
      usercode: tmp
    })
    let that = this
    db.collection("orders")
      .get()
      .then(res => {
        that.setData({
          listdata: res.data
        })
       
      })

    wx.cloud.callFunction({
      name: "getList"
    }).then(res => {
      
      that.setData({
        placedata: res.result.data
      })
      that.getorder()
    })



  },

})