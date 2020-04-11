// pages/user/user_venue.js
const db = wx.cloud.database()
const playgroundCollection = db.collection('playground')
var userChoose=-1

var listID=1

const _ = db.command
Page({
  itemclick:function(res){
    listID = parseInt(res.currentTarget.dataset.index)
    console.log("itemclick",listID)
    console.log("itemclick", this.data.listdata[listID].name)
    this.setData({
      choose1: this.data.listdata[listID].opendate,
      choose2: this.data.listdata[listID].name,
      choose3: this.data.listdata[listID].fee,
      columns: this.data.listdata[listID].week
    })
  },
  selectWeek:function(){
    this.setData({ show: true });

  },
  data:{
    choose1:0,
    choose3:0,
    choose2:"",
    listdata:[],
    show: false,
    columns: []
  },
  onConfirm(event) {
    //const { picker, value, index } = event.detail;
    console.log("onConfirm",event.detail)
    this.setData({ show: false });
    let pn = this.data.choose2
    let wk = event.detail.value
    let time = this.data.choose1
    let fee1 = this.data.choose3
    wx.navigateTo({
      url: 'user_order?placename=' + pn +'&week='+wk+'&time='+time+'&fee='+fee1,
    })
  },

  onCancel() {

    this.setData({ show: false });
  },


  onPullDownRefresh: function () {
    let that=this
    this.setData({
      listdata:[]
    })
    this.onLoad()
  },



  onLoad: function (options) {
    wx.stopPullDownRefresh()
    const eventChannel = this.getOpenerEventChannel()
    eventChannel.on('DataFromMapPage', function (data) {
      console.log(data)
      userChoose= data.chooseID
    })
    let that = this
    switch (userChoose) {
      case 0: {
        playgroundCollection
          .where({
            placecode: _.or(_.eq('LQ-1'), _.eq('LQ-2'))
          })
          .orderBy('name', 'asc')
          .get().then(res => {
            that.listresult=res.data
            that.setData({
              listdata: res.data,
            })
          })
          break;
      }
      case 1: {
        playgroundCollection
          .where({
            placecode: _.or(_.eq('PQ-1'), _.eq('PQ-2'), _.eq('PQ-3'), _.eq('PQ-4'), _.eq('PQ-5'), _.eq('PQ-6'), _.eq('PQ-7'))
          })
          .orderBy('name', 'asc')
          .get().then(res => {
            that.listresult = res.data
            that.setData({
              listdata: res.data,
            })
          })
        break;
      }
      case 2: {
        playgroundCollection
          .where({
            placecode: _.or(_.eq('YMQ-1'), _.eq('YMQ-2'), _.eq('YMQ-3'), _.eq('YMQ-4'), _.eq('YMQ-5'), _.eq('YMQ-6'))
          })
          .orderBy('name', 'asc')
          .get().then(res => {
            that.listresult = res.data
            that.setData({
              listdata: res.data,
            })
          })
        break;
      }
      case 3: {
        playgroundCollection
          .where({
            placecode: _.or(_.eq('HT-1'), _.eq('HT-2'), _.eq('HT-3'), _.eq('HT-4'), _.eq('HT-5'))
          })
          .orderBy('name', 'asc')
          .get().then(res => {
            that.listresult = res.data
            that.setData({
              listdata: res.data,
            })
          })
        break;
      }
      case 4: {
        playgroundCollection
          .where({
            placecode: _.eq('JSF')
          })
          .orderBy('name', 'asc')
          .get().then(res => {
            that.listresult = res.data
            that.setData({
              listdata: res.data,
            })
          })
        break;
      }
        
    }
   
    
  },
 


})