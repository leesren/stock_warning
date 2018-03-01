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
function request(code) {
  return new Promise((resolve, reject) => {
    fetch(
      `http://sqt.gtimg.cn/utf8/q=${china_stock_pre(code).toLowerCase()}${code}`
    )
      .then(v => {
        return v.text();
      })
      .then(v => {
        let resp = v.split('"')[1];
        resolve(resp.split("~"));
      })
      .catch(v => {
        reject(v);
      });
  });
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
    if (item.upnum - flag <= 0) {
      chrome.notifications.create({
        type: "basic",
        title: `【${item.stockname}】涨幅接近预警线`,
        message: "您设置的涨幅预警线已经出现，请及时处理",
        iconUrl: "../images/stock-up-64.png"
      });
    } else if (item.downnum - flag >= 0) {
      chrome.notifications.create({
        type: "basic",
        title: `【${item.stockname}】跌幅预警线提醒`,
        message: "您设置的跌幅预警线已经出现，请及时处理",
        iconUrl: "../images/stock-down-64.png"
      });
    }
  }
}

function buildTableRowSimple(item, index, data) {
  delay().then(v => {
    showNotification(item, data[45]);
  });
  return `
    <tr>
        <td>${data[1]}</td>
        <td>${data[2]}</td>
        <td class="${getTxColor(data[31])}">${data[3]}</td>
        <td class="${getTxColor(data[31])}">${data[32]}%</td>
        <td>${data[39]}</td>
        <td>${data[45]}亿</td>
        <td class="${item.upnum && item.warningSetting ? "cwarn" : ""}">${
    item.upnum && item.warningSetting ? item.downnum + "亿~" + item.upnum + "亿" : "未设置"
  }</td> 
    </tr>
    `;
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
  return `
      <tr>
          <td class="stname pointer" data-index="${index}" data-code="${data[2]}">${data[1]}</td>
          <td class="stname pointer" data-index="${index}" data-code="${data[2]}">${data[2]}</td>
          <td class="${getTxColor(data[31])}">${data[3]}</td>
          <td class="${getTxColor(data[31])}">${data[32]}%</td>
          <td>${data[39]}</td>
          <td>${data[45]}亿</td>
          <td class="${item.upnum && item.warningSetting ? "cwarn" : ""}">${
    item.upnum && item.warningSetting ? item.downnum + "亿~" + item.upnum + "亿" : "未设置"
  }</td>
          <td><span class="p3 ${ +wav > 90 ? 'pink ctw' :''  }">${wav}%</span> </td>
          <td>
              <div class="switch">
                  <label>
                      <input class="warningSetting" data-index="${index}" type="checkbox" ${
    item.warningSetting ? "checked" : ""
  }>
                      <span class="lever"></span>
                  </label>
              </div>
          </td>
          <td>
              <a class="pointer eidtItem" data-index="${index}">编辑</a>
              <a class="pointer delItem pl15 red-text" data-index="${index}">删除</a>
          </td>
      </tr>
      `;
}

async function render(stocklist, view) {
  let t = [];
  // $("#tbody").html("");
  if (stocklist.length === 0) {
    $("#tbody").append(`
        <tr>
            <td class="text-center" colspan="${$("th").length}">暂无数据...</td>
        </tr>
    `);
    return;
  }
  let htmlStr = [];
  for (let index = 0; index < stocklist.length; index++) {
    let el = stocklist[index];
    let resp = await request(el.stockcode);
    let str = view
      ? buildTableRowSimple(el, index, resp)
      : buildTableRow(el, index, resp);
    // t.push(str);
    htmlStr.push(str);
  }
  
  $("#tbody").append(htmlStr.join(""));
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