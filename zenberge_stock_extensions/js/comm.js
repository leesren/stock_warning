function china_stock_pre(code = "") {
  if (
    code.startsWith("3") ||
    code.startsWith("002") ||
    code.startsWith("00") ||
    code.startsWith("200")
  ) {
    return "SZ";
  } else if (
    code.startsWith("6") ||
    code.startsWith("900") ||
    code.startsWith("7")
  ) {
    return "SH";
  } else {
    return "";
  }
}

let headers = new Headers({'Host':'sqt.gtimg.cn','Referer':'http://gu.qq.com/sh601360/gp','User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.167 Safari/537.36'});

function request(code) {
  let url = `http://sqt.gtimg.cn/utf8/q=${china_stock_pre(code).toLowerCase()}${code}&r=${Math.random()}`;
  return requestJq(url);
  // return new Promise((resolve, reject) => {
  //   fetch( url,{method: 'GET',headers:headers})
  //     .then(v => {
  //       return v.text();
  //     })
  //     .then(v => {
  //       let resp = v.split('"')[1];
  //       resolve(resp.split("~"));
  //     })
  //     .catch(v => {
  //       reject(v);
  //     });
  // });
}

function requestJq(url){
  return $.get(url).then(v=>{
      let resp = v.split('"')[1];
      return resp.split("~");
  })
}

class StocksManager {
  constructor() {
    this.KEY = "stockchoice_";
    this.currentTpl = null;  
    this.list = this.getLatestList() || [];
  }
  getLatestList(){
    let ls = localStorage.getItem(this.KEY);
    if (ls) {
      ls = JSON.parse(ls);
    }
    return ls;
  }
  updateItem(index, data) {
    let el = this.list[index];
    if (el) {
      this.list[index] = Object.assign(el, data);
      this.saveTolocal();
    }
  }
  addItem(data) {
    let f = this.list.filter(v => {
      return v.stockcode === data.stockcode;
    });
    if (f.length > 0) return;
    this.list.push(data);
    this.saveTolocal();
  }

  removeItem(index) {
    if (this.list[index]) {
      this.list.splice(index, 1);
      this.saveTolocal();
    }
  }

  saveTolocal() {
    let str = JSON.stringify(this.list);
    localStorage.setItem(this.KEY, str);
  }
}
function getTxColor(t) {
  if (t > 0) {
    return "cup";
  }
  if (t < 0) {
    return "cdown";
  }
  return "";
}

function delay(t = 500) {
  return new Promise((resolve, reject) => {
    setTimeout(v => {
      resolve();
    }, t);
  });
}

function showNotification(item, flag) {
  if (item.warningSetting) {
    //   console.log(`upnum: ${item.upnum} downnum:${item.downnum} flag:${flag}`);
    let n = item.stockname + ' '+ item.stockcode;
    if (item.upnum - flag <= 0) {
      chrome.notifications.create({
        type: "basic",
        title: `【${n}】涨幅接近预警线`,
        message: "您设置的涨幅预警线已经出现，请及时处理",
        iconUrl: "../images/stock-up-64.png"
      });
    } else if (item.downnum - flag >= 0) {
      chrome.notifications.create({
        type: "basic",
        title: `【${n}】跌幅预警线提醒`,
        message: "您设置的跌幅预警线已经出现，请及时处理",
        iconUrl: "../images/stock-down-64.png"
      });
    }
  }
}
 
function buildTableRowHtml(obj,simple=false){
  if(simple){
    return `
    <tr>
      <td class="stname pointer" data-index="${obj.index}" data-code="${obj.stockcode}">${ obj.stockname}</td>
      <td class="stname pointer" data-index="${obj.index}" data-code="${obj.stockcode}">${obj.stockcode}</td>
      <td class="${ obj.upAndDownColor}">${obj.price}</td>
      <td class="${ obj.upAndDownColor}">${ obj.upAndDown}%</td>
      <td>${obj.pe}</td>
      <td>${obj.value}亿</td>
      <td class="${obj.warningColor}">${ obj.warningValue}</td>
      <td><span class="p3 ${ +obj.wav > 90 ? 'pink ctw' :''}">${obj.wav}%</span> </td>
    </tr>
    `
  }
  return `
      <tr>
          <td class="stname pointer" data-index="${obj.index}" data-code="${obj.stockcode}">${ obj.stockname}</td>
          <td class="stname pointer" data-index="${obj.index}" data-code="${obj.stockcode}">${obj.stockcode}</td>
          <td class="${ obj.upAndDownColor}">${obj.price}</td>
          <td class="${ obj.upAndDownColor}">${ obj.upAndDown}%</td>
          <td>${obj.pe}</td>
          <td>${obj.value}亿</td>
          <td class="${obj.warningColor}">${ obj.warningValue}</td>
          <td><span class="p3 ${ +obj.wav > 90 ? 'pink ctw' :''}">${obj.wav}%</span> </td>
          <td>
              <div class="switch">
                  <label>
                      <input class="warningSetting" data-index="${obj.index}" type="checkbox" ${obj.warningSetting ? "checked" : ""}>
                      <span class="lever"></span>
                  </label>
              </div>
          </td>
          <td>
              <a class="pointer eidtItem" data-index="${obj.index}">编辑</a>
              <a class="pointer delItem pl15 red-text" data-index="${obj.index}">删除</a>
          </td>
      </tr>
  `
}

function buildTableRow(item, index, data) {
  delay().then(v => {
    showNotification(item, data[45]);
  });
  let wav = '-';
  if(item.upnum && item.warningSetting){
    let t1 = 1- Math.abs(item.upnum - data[45]) / data[45], 
    t2 = 1 - Math.abs(item.downnum - data[45]) / data[45];
    wav = t1 > t2 ? ''+((t1*100).toFixed(2)) : ''+(t2*100).toFixed(2);
  }
  let formatNum = (v)=>{
    let s = v/10000;
    if(s >= 1){
      return s.toFixed(2)+'万'
    }
    return v;
  }
  let obj = {
    index:index,// 索引
    stockname:data[1],// 名称
    stockcode:data[2], // 代码
    price:data[3],// 当前价
    upAndDown:data[32],// 涨跌幅
    upAndDownColor:getTxColor(data[31]),// 涨跌颜色
    pe:data[39],// 市盈率
    value:data[45],// 市值
    wav:wav,// 预警 
    warningSetting:item.warningSetting,// 设置
    warningValue: item.upnum && item.warningSetting ? formatNum(item.downnum) + "亿~" + formatNum(item.upnum) + "亿" : "未设置",// 设置值
    warningColor:item.upnum && item.warningSetting ? "cwarn" : ""// 设置预警颜色
  } 
      return obj;
}

async function render(stocklist, view) {
  let t = [];
  // $("#tbody").html("");
  if (stocklist.length === 0) {
    $("#tbody").html(`
        <tr>
            <td class="text-center" colspan="${$("th").length}">暂无数据...</td>
        </tr>
    `);
    return;
  }
  let htmlStr = [], objList = [];
  for (let index = 0; index < stocklist.length; index++) {
    let el = stocklist[index];
    let resp = await request(el.stockcode);
    // let { str,obj } = view
    //   ? buildTableRowSimple(el, index, resp)
    //   : buildTableRow(el, index, resp);
    // t.push(str);
    // htmlStr.push(str);
    let obj = buildTableRow(el, index, resp);
    objList.push(obj)
  }
  let ss = window['sortKey'];
  if(ss){
    objList.sort((a,b)=>{
      if(window['sortKeyType']){
        return a[ss] - b[ss];
      }else{
        return b[ss] - a[ss];
      }
      
    })
  }
  objList.map(v=>{
    htmlStr.push(buildTableRowHtml(v,view ) )
  })
  $("#tbody").html(htmlStr.join(""));
  //   $("#tbody").html(t.join(""));
}

function isTradeTime(){
  let d = new Date()
  let day = d.getDay();
  let hour = d.getHours();
  let mimute = d.getMinutes();
  let t = +(hour + '.' + mimute);
  if(day >5){
    return false;
  }
  if( (t >= 9.30 && t <= 11.30) || ( t >= 13 && t <= 15.0)){
    return true;
  }
  return false
}

function thsData(){
  // [{"stockcode":"600030","stockname":"中信证券","warningSetting":true,"upnum":"2658","downnum":"1735"},{"stockcode":"600036","stockname":"招商银行","warningSetting":true,"upnum":"9200","downnum":"6133"},{"stockcode":"600048","stockname":"保利地产","warningSetting":true,"upnum":"2092","downnum":"1395"},{"stockcode":"600050","stockname":"中国联通","warningSetting":true,"upnum":"2322","downnum":"1548"},{"stockcode":"600066","stockname":"宇通客车","warningSetting":true,"upnum":"619","downnum":"413"},{"stockcode":"600079","stockname":"人福医药","warningSetting":true,"upnum":"255","downnum":"170"},{"stockcode":"600085","stockname":"同仁堂","warningSetting":true,"upnum":"533","downnum":"355"},{"stockcode":"600183","stockname":"生益科技","warningSetting":true,"upnum":"310","downnum":"206"},{"stockcode":"600201","stockname":"生物股份","warningSetting":true,"upnum":"309","downnum":"206"},{"stockcode":"600276","stockname":"恒瑞医药","warningSetting":true,"upnum":"2522","downnum":"1681"},{"stockcode":"600340","stockname":"华夏幸福","warningSetting":true,"upnum":"1305","downnum":"870"},{"stockcode":"600436","stockname":"片仔癀","warningSetting":true,"upnum":"529","downnum":"352"},{"stockcode":"600487","stockname":"亨通光电","warningSetting":true,"upnum":"639","downnum":"426"},{"stockcode":"600516","stockname":"方大炭素","warningSetting":true,"upnum":"657","downnum":"438"},{"stockcode":"600521","stockname":"华海药业","warningSetting":true,"upnum":"355","downnum":"237"},{"stockcode":"600535","stockname":"天士力","warningSetting":true,"upnum":"465","downnum":"310"},{"stockcode":"600547","stockname":"山东黄金","warningSetting":true,"upnum":"577","downnum":"385"},{"stockcode":"600585","stockname":"海螺水泥","warningSetting":true,"upnum":"2107","downnum":"1405"},{"stockcode":"600703","stockname":"三安光电","warningSetting":true,"upnum":"1273","downnum":"849"},{"stockcode":"600741","stockname":"华域汽车","warningSetting":true,"upnum":"1002","downnum":"668"},{"stockcode":"600750","stockname":"江中药业","warningSetting":true,"upnum":"89","downnum":"59"},{"stockcode":"600816","stockname":"安信信托","warningSetting":true,"upnum":"702","downnum":"468"},{"stockcode":"600867","stockname":"通化东宝","warningSetting":true,"upnum":"487","downnum":"325"},{"stockcode":"600900","stockname":"长江电力","warningSetting":true,"upnum":"4353","downnum":"2902"},{"stockcode":"600993","stockname":"马应龙","warningSetting":true,"upnum":"92","downnum":"61"},{"stockcode":"601006","stockname":"大秦铁路","warningSetting":true,"upnum":"1640","downnum":"1093"},{"stockcode":"601012","stockname":"隆基股份","warningSetting":true,"upnum":"881","downnum":"587"},{"stockcode":"601088","stockname":"中国神华","warningSetting":true,"upnum":"5690","downnum":"3793"},{"stockcode":"601166","stockname":"兴业银行","warningSetting":true,"upnum":"4485","downnum":"2990"},{"stockcode":"601318","stockname":"中国平安","warningSetting":true,"upnum":"15121","downnum":"10080"},{"stockcode":"601360","stockname":"三六零","warningSetting":true,"upnum":"4256","downnum":"2838"},{"stockcode":"601607","stockname":"上海医药","warningSetting":true,"upnum":"766","downnum":"510"},{"stockcode":"601766","stockname":"中国中车","warningSetting":true,"upnum":"3575","downnum":"2383"},{"stockcode":"603568","stockname":"伟明环保","warningSetting":true,"upnum":"180","downnum":"120"},{"stockcode":"603799","stockname":"华友钴业","warningSetting":true,"upnum":"854","downnum":"569"},{"stockcode":"603898","stockname":"好莱客","warningSetting":true,"upnum":"111","downnum":"74"},{"stockcode":"300003","stockname":"乐普医疗","warningSetting":true,"upnum":"597","downnum":"398"},{"stockcode":"300014","stockname":"亿纬锂能","warningSetting":true,"upnum":"185","downnum":"123"},{"stockcode":"300015","stockname":"爱尔眼科","warningSetting":true,"upnum":"707","downnum":"471"},{"stockcode":"300070","stockname":"碧水源","warningSetting":true,"upnum":"626","downnum":"417"},{"stockcode":"300072","stockname":"三聚环保","warningSetting":true,"upnum":"733","downnum":"489"},{"stockcode":"300136","stockname":"信维通信","warningSetting":true,"upnum":"476","downnum":"317"},{"stockcode":"300144","stockname":"宋城演艺","warningSetting":true,"upnum":"342","downnum":"228"},{"stockcode":"300176","stockname":"鸿特精密","warningSetting":true,"upnum":"171","downnum":"114"},{"stockcode":"300182","stockname":"捷成股份","warningSetting":true,"upnum":"324","downnum":"216"},{"stockcode":"300323","stockname":"华灿光电","warningSetting":true,"upnum":"198","downnum":"132"},{"stockcode":"300355","stockname":"蒙草生态","warningSetting":true,"upnum":"227","downnum":"151"},{"stockcode":"300450","stockname":"先导智能","warningSetting":true,"upnum":"336","downnum":"224"},{"stockcode":"300498","stockname":"温氏股份","warningSetting":true,"upnum":"1398","downnum":"932"},{"stockcode":"300603","stockname":"立昂技术","warningSetting":true,"upnum":"40","downnum":"27"},{"stockcode":"000028","stockname":"国药一致","warningSetting":true,"upnum":"296","downnum":"197"},{"stockcode":"002022","stockname":"科华生物","warningSetting":true,"upnum":"82","downnum":"55"},{"stockcode":"002038","stockname":"双鹭药业","warningSetting":true,"upnum":"251","downnum":"167"},{"stockcode":"002032","stockname":"苏 泊 尔","warningSetting":true,"upnum":"436","downnum":"291"},{"stockcode":"002035","stockname":"华帝股份","warningSetting":true,"upnum":"207","downnum":"138"},{"stockcode":"002024","stockname":"苏宁易购","warningSetting":true,"upnum":"1408","downnum":"938"},{"stockcode":"002042","stockname":"华孚时尚","warningSetting":true,"upnum":"152","downnum":"101"},{"stockcode":"000069","stockname":"华侨城Ａ","warningSetting":true,"upnum":"836","downnum":"557"},{"stockcode":"000540","stockname":"中天金融","warningSetting":true,"upnum":"414","downnum":"276"},{"stockcode":"000002","stockname":"万  科Ａ","warningSetting":true,"upnum":"4293","downnum":"2862"},{"stockcode":"002294","stockname":"信立泰","warningSetting":true,"upnum":"488","downnum":"326"},{"stockcode":"000826","stockname":"启迪桑德","warningSetting":true,"upnum":"358","downnum":"238"},{"stockcode":"002007","stockname":"华兰生物","warningSetting":true,"upnum":"302","downnum":"201"},{"stockcode":"000869","stockname":"张  裕Ａ","warningSetting":true,"upnum":"295","downnum":"197"},{"stockcode":"002271","stockname":"东方雨虹","warningSetting":true,"upnum":"429","downnum":"286"},{"stockcode":"000661","stockname":"长春高新","warningSetting":true,"upnum":"326","downnum":"218"},{"stockcode":"002236","stockname":"大华股份","warningSetting":true,"upnum":"1056","downnum":"704"},{"stockcode":"002415","stockname":"海康威视","warningSetting":true,"upnum":"4905","downnum":"3270"},{"stockcode":"000513","stockname":"丽珠集团","warningSetting":true,"upnum":"474","downnum":"316"},{"stockcode":"000423","stockname":"东阿阿胶","warningSetting":true,"upnum":"474","downnum":"316"},{"stockcode":"002008","stockname":"大族激光","warningSetting":true,"upnum":"736","downnum":"491"},{"stockcode":"000063","stockname":"中兴通讯","warningSetting":true,"upnum":"1628","downnum":"1085"},{"stockcode":"002223","stockname":"鱼跃医疗","warningSetting":true,"upnum":"265","downnum":"176"},{"stockcode":"002635","stockname":"安洁科技","warningSetting":true,"upnum":"213","downnum":"142"},{"stockcode":"002450","stockname":"康得新","warningSetting":true,"upnum":"840","downnum":"560"},{"stockcode":"002507","stockname":"涪陵榨菜","warningSetting":true,"upnum":"159","downnum":"106"},{"stockcode":"000538","stockname":"云南白药","warningSetting":true,"upnum":"1186","downnum":"791"},{"stockcode":"002508","stockname":"老板电器","warningSetting":true,"upnum":"454","downnum":"303"},{"stockcode":"002572","stockname":"索菲亚","warningSetting":true,"upnum":"407","downnum":"271"},{"stockcode":"002475","stockname":"立讯精密","warningSetting":true,"upnum":"966","downnum":"644"},{"stockcode":"002230","stockname":"科大讯飞","warningSetting":true,"upnum":"946","downnum":"631"},{"stockcode":"002405","stockname":"四维图新","warningSetting":true,"upnum":"351","downnum":"234"},{"stockcode":"002460","stockname":"赣锋锂业","warningSetting":true,"upnum":"648","downnum":"432"},{"stockcode":"002352","stockname":"顺丰控股","warningSetting":true,"upnum":"2669","downnum":"1780"},{"stockcode":"000830","stockname":"鲁西化工","warningSetting":true,"upnum":"396","downnum":"264"},{"stockcode":"000786","stockname":"北新建材","warningSetting":true,"upnum":"520","downnum":"347"},{"stockcode":"002050","stockname":"三花智控","warningSetting":true,"upnum":"520","downnum":"346"},{"stockcode":"002252","stockname":"上海莱士","warningSetting":true,"upnum":"1166","downnum":"778"},{"stockcode":"000963","stockname":"华东医药","warningSetting":true,"upnum":"664","downnum":"443"},{"stockcode":"002310","stockname":"东方园林","warningSetting":true,"upnum":"627","downnum":"418"},{"stockcode":"002466","stockname":"天齐锂业","warningSetting":true,"upnum":"869","downnum":"579"},{"stockcode":"002714","stockname":"牧原股份","warningSetting":true,"upnum":"678","downnum":"452"}]
  var v = {};
  function getObject(key,obj){
    return {
      "stockcode":key+'',
      "stockname":obj['name'],
      "warningSetting":true,
      "upnum":(obj['3541450'] * 1.1/100000000).toFixed(0),
      "downnum":(obj['3541450'] * 0.9/100000000).toFixed(0)
    }
  }
  
  var list = []
  for(let el in v){
    if(el != 'hk'){
       for(let i in v[el]){
        let t = getObject(i,v[el][i]);
         list.push(t)
     }
    } 
  } 
}

$('th').click((e)=>{
  let key = $(e.target).data('key');
  window['sortKey'] = key;
  let sortType = $(e.target).attr('sort');
  sortType = sortType=='1' ? 0 : 1;
  $(e.target).attr('sort',sortType);
  window['sortKeyType'] = sortType; 
  render(stocksManager.list , location.href.indexOf('index') != -1);
})