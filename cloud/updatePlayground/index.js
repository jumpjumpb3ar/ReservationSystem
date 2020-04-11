// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
//初始化数据库
const db = cloud.database()
const pglist = db.collection('playground')
const uslist = db.collection('usablePlayground')
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

  // for (value in datalist0){
  //   await uslist.where({
  //     _id: value._id
  //   }).remove().then(res => { return })
  //     .catch(e => {
  //       throw new Error("删除数据失败 @ cleandata");
  //     })
  // }
  // await datalist0.forEach(async function (value, index, array) {
  //   await uslist.where({
  //     _id: value._id
  //   }).remove().then(res => { return })
  //     .catch(e => {
  //       throw new Error("[cleandata]:删除数据失败 @ cleandata");
  //     })
  // });



  // await uslist.get().then(res => {
  //   let len = res.data.length
  //   let datalist0 = res.data
  //   console.log("删除前uslist的长度:" + len)
  //   for (let i = 0; i < len; i++) {
  //     uslist.where({
  //       _id: datalist0[i]._id
  //     }).remove().catch(e => {
  //       throw new Error("删除数据失败 @ cleandata");
  //     })
  //   }
  
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