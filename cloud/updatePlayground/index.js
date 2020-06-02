// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
//初始化数据库
const db = cloud.database()
const pglist = db.collection('playground')
const uslist = db.collection('usablePlayground')
const validweek = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
var datalist//所有场地信息

async function getdatalist() {
  return await pglist.get().then(res => {
    console.log("[getdatalist]:获得到datalist"+res.data.length)
    datalist = res.data
    return datalist
  })
}

async function cleandata() {
 

  let datalist0 = await uslist.get().then(res=>{
    return res.data
  })
  let len = datalist0.length

  console.log("[cleandata]:删除前usablesList的长度:" + len)

  uslist.where({
    type: 1
  }).remove()

  
  
  uslist.count().then(res => {
    console.log("[cleandata]:现在usableList的长度:" + res.total)
      if(res.total==0)return
    })

}

async function  insertdata () {
  await console.log("[insertdata]:datalist长度" + datalist.length)
  await uslist.count().then(res => {
    console.log("[insertdata]:插入前usableLits的长度:" + res.total)
  })
  for(let i=0;i<datalist.length;i++){
    console.log(i)
    for(let j=0;j<datalist[i].week.length;j++){
      try{
      uslist.add({
        data:{
          "type":1,
          "placecode": datalist[i].placecode,
          "week": datalist[i].week[j],
          "opendata": datalist[i].opendate,
          "fee": datalist[i].fee,
          "maxpeople": datalist[i].maxpeople,
          "nowpeople": datalist[i].maxpeople
        }
      })
      
      }catch(e){
        console.log(e)
      }
      
    }
  }
  console.log("[insertdata]:插入完成")
  return
}




// 云函数入口函数
exports.main = async(event, context) => { //这里面的代码都是异步执行



  await cleandata()
  await getdatalist()

  await insertdata()

  return "finish"
  // .then(res => {
  //   console.log("执行获取数据")
  //   getdatalist()})
  // .then(res=>{
  //   console.log("执行插入数据")
  //   insertdata()

  // }).catch(e=>{console.log(e)})






  // //获取所有的datalist





}