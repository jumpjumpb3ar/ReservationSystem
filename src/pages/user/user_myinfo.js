// pages/user/user_myinfo.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    code:"2016001",
    name:"张三",
    password:"123456",
    inputpassword:"******"
  },
  onChange:function(e){
    this.setData({
      inputpassword:e.detail
    })
  },
  changecode:function(){
    console.log(this.data.inputpassword)
  }
  
})