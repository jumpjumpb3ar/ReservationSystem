// pages/user/user_myinfo.js
const db = wx.cloud.database()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    listdata: [],
    isTeacher: false,
    right:"学生",
    doc: 0,
    code: "2016001",
    name: "",
    password: "123456",
    inputpassword: "******"
  },
  onChange: function (e) {
    this.setData({
      inputpassword: e.detail
    })
  },
  getDoc: function () {
    if (this.data.isTeacher) {
      this.setData({
        right:"老师"
      })
      for (let i = 0; i < this.data.listdata.length; i++) {
        if (this.data.listdata[i].code == this.data.code && this.data.listdata[i].right == "老师") {
          this.data.doc = this.data.listdata[i]._id
          this.setData({
            name: this.data.listdata[i].name,
            password: this.data.listdata[i].secret
          })
          console.log("get doc")
          return
        }

      }
      console.log("wrong doc")
    } else {
      this.setData({
        right: "学生"
      })
      for (let i = 0; i < this.data.listdata.length; i++) {
        if (this.data.listdata[i].code == this.data.code && this.data.listdata[i].right == "学生") {
          this.data.doc = this.data.listdata[i]._id
          this.setData({
            name: this.data.listdata[i].name,
            password: this.data.listdata[i].secret
          })
          console.log("get doc")
          return
        }

      }
      console.log("wrong doc")
    }
  },
  changecode: function () {
    console.log(this.data.inputpassword)

    wx.cloud.callFunction({
      name: "changepass",
      data: {
        pass: this.data.inputpassword,
        id: this.data.doc
      }
    }).then(res => {
      console.log(res.result)
    })

  },
  onLoad(options) {
    let tmp = wx.getStorageSync('usercode')
    let tmp2 = wx.getStorageSync('isTeacher')
    this.setData({
      code: tmp,
      isTeacher: tmp2
    })
    let that = this
    wx.cloud.callFunction({
      name: "getUser"
    }).then(res => {
      that.setData({
        listdata: res.result.data
      })
      that.getDoc()
    })


  }

})