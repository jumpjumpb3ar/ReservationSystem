// pages/login/login.js
import Toast from '@vant/weapp/toast/toast';
const db = wx.cloud.database()
const _ = db.command
var mypass = 0
Page({

  /**
   * 页面的初始数据
   */
  studyweek: 5,
  data: {
    user: "",
    password: "",
    typeID: "0",
    pass: 0,
    username: "",
    items: [{
      "key": "0",
      "value": "学生",
      "checked": "true"
    },
    {
      "key": "1",
      "value": "管理员",
    },
    {
      "key": "2",
      "value": "教师",
    },


    ],
  },

  radioChange: function (e) {
    this.data.typeID = e.detail.value
    this.checkID(this.data.user, this.data.password, this.data.typeID)
  },
  onChange: function (e) {
    switch (e.currentTarget.id) {
      case "user":
        {
          this.data.user = e.detail
          break
        }
      case "password":
        {
          this.data.password = e.detail
          break
        }
    }
    this.checkID(this.data.user, this.data.password, this.data.typeID)

  },
  checkID: function (usercode, password, type) {
    let that = this
    console.log("user:", usercode)
    console.log("password:", password)
    console.log("type:", type)
    switch (type) {
      case "0":
        {
          db.collection("users").where({
            right: "学生",
            secret: password,
            code: usercode
          })
            .get()
            .then(res => {
              if (res.data.length != 0) {
                console.log(res.data)
                that.mypass = 1
                that.setData({
                  username: res.data[0].name,
                  pass: 1
                })
              } else {
                that.setData({
                  pass: 0
                })
              }
            })
          break
        }
      case "1":
        {
          db.collection("users").where({
            right: "管理员",
            secret: password,
            code: usercode
          })
            .get()
            .then(res => {
              if (res.data.length != 0) {
                that.mypass = 1
                that.setData({
                  pass: 1,
                  username: res.data[0].name
                })
              } else {
                that.setData({
                  pass: 0
                })
              }
            })

          break
        }
      case "2":
        {
          console.log("teacher")
          db.collection("users").where({
            right: "老师",
            secret: password,
            code: usercode
          })
            .get()
            .then(res => {
              if (res.data.length != 0) {
                that.mypass = 1
                that.setData({
                  pass: 1,
                  username: res.data[0].name
                })
              } else {
                that.setData({
                  pass: 0
                })
              }
            })
          break
        }
    }
  },
  mylogin: function () {

    let that = this
    console.log("**************login:", this.data.typeID)
    switch (this.data.typeID) {
      case "0":
        { //学生身份
          if (this.mypass == 1) {
            Toast.success('登陆成功');
            wx.setStorageSync('isTeacher', false)
            wx.setStorageSync('usercode', this.data.user)
            wx.redirectTo({
              url: '../user/user_map?isTeacher=false',
            })
          } else {
            Toast.fail('账号密码错误');
          }
          break
        }
      case "1":
        { //管理员身份
          if (this.mypass == 1) {
            Toast.success('登陆成功');
            wx.setStorageSync('usercode', this.data.user)
            wx.redirectTo({
              url: '../manager/manager',
            })
          } else {
            Toast.fail('账号密码错误');
          }

          break
        }
      case "2":
        { //教师身份
          if (this.mypass == 1) {
            wx.setStorageSync('isTeacher', true)
            Toast.success('登陆成功');
            wx.setStorageSync('usercode', this.data.user)
            wx.redirectTo({
              url: '../user/user_map?isTeacher=true',
            })
          } else {
            Toast.fail('账号密码错误');
          }
          break
        }
    }
  }

})