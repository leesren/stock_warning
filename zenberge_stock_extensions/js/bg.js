let sm = new StocksManager();
async function handlerTimer() {
  let ls = sm.getLatestList();
  for (let index = 0; index < ls.length; index++) {
    let el = ls[index];
    let resp = await request(el.stockcode);
    showNotification(el,resp[45]);
  }
}

setInterval(v => {
  handlerTimer();
}, 4000);
