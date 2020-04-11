// pages/login/login.js
import Toast from '@vant/weapp/toast/toast';
const db = wx.cloud.database()
const _ = db.command
Page({

  /**
   * 页面的初始数据
   */
  data: {
    user:"",
    password:"",
    typeID: "0",
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

  radioChange: function(e) {
    this.data.typeID = e.detail.value
  },
  onChange: function (e) {
    switch (e.currentTarget.id) {
      case "user":{
        this.data.user=e.detail
        break
      }
      case "password": {
        this.data.password = e.detail
        break
      }
    }

  },
  checkID:function(usercode,password){
    console.log("user:",usercode)
    console.log("password:", password)

    // db.collection("news").where({
    //   newscode: options.newscode
    // })
    //   .get()
    //   .then(res => {
    //     that.setData({
    //       listdata: res.data
    //     })
    //   })


    return true
  },
  mylogin: function() {
    let that = this
    console.log("login:",this.data.typeID)
    switch (this.data.typeID) {
      case "0":
        { //学生身份
          
          if(this.checkID(this.data.user,this.data.password)){
            Toast.success('登陆成功');
            wx.setStorageSync('usercode', this.data.user)

            wx.redirectTo({
              url: '../user/user_map?isTeacher=false',
            })
          }else{
            Toast.fail('账号密码错误');
          }
          break
        }
      case "1":
        { //管理员身份


          wx.setStorageSync('usercode', this.data.user)
          wx.redirectTo({
            url: '../manager/manager',
          })
          break
        }
      case "2":
        { //教师身份
          wx.setStorageSync('usercode', this.data.user)
          wx.redirectTo({
            url: '../user/user_map?isTeacher=true',
          })
          break
        }
    }
  }

})