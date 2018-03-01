function initModal(type = "new", option = {}) {
  if (type === "edit") {
    return {
      title: "编辑股票预警上下限",
      stockname: option.stockname || "",
      stockcode: option.stockcode || "",
      downnum: option.downnum || undefined,
      upnum: option.upnum || undefined
    };
  } else {
    return {
      title: "添加股票",
      stockname: "",
      stockcode: "",
      downnum: undefined,
      upnum: undefined
    };
  }
}

function setModalData(options, ret) {
  $("#mtitle").text(options.title);
  $("#stockname").val(options.stockname);
  $("#stockcode").val(options.stockcode || "");
  $("#upnum").val(options.upnum || "");
  $("#downnum").val(options.downnum || "");
  Materialize.updateTextFields();
}

let stockManager = new StocksManager();
$(document).ready(function() {
  // the "href" attribute of the modal trigger must specify the modal ID that wants to be triggered

  $("#addStock").modal({});
  $("#deleModal").modal({});
  $("#peModal").modal({});
  $('#addStockBtnTop').click(v=>{
    $("#addStockBtn").trigger('click');
  })
  $("#addStockBtn").click(() => {
    let data = initModal();
    setModalData(data);
    $("#addStock").modal("open");
  });
  $("#tbody").on("click", ".delItem", event => {
    let index = $(event.target).data("index");
    $("#deleModel").val(index);
    $("#deleModal").modal("open");
  });
  $("#deleConfirm").click(v => {
    let index = $("#deleModel").val();
    if (!stockManager.list[+index]) return;
    stockManager.removeItem(+index);
    $("#deleModal").modal("close");
    if (!$("tbody").find("tr")[+index]) return;
    $("tbody")
      .find("tr")
      [+index].remove();
  });
  $("#tbody").on("click", ".eidtItem", event => {
    let index = $(event.target).data("index");
    if (!stockManager.list[+index]) return;
    let data = initModal("edit", stockManager.list[+index]);
    $("#editModel").val(index);
    setModalData(data);
    request(data.stockcode).then(result => {
      $("#addStock").modal("open");
      stockManager.currentTpl = result;
      let u = $("#upnum").val(),
        d = $("#downnum").val();
      if (u) {
        $("#upnumRange").val((u * 100.0 / result[45] - 100).toFixed(0));
      }
      if (d) {
        $("#downnumRange").val((d * 100.0 / result[45] - 100).toFixed(0));
      }
    });
  });
  $("#upnumRange").on("input", v => {
    let n = 1 + v.target.value / 100.0;
    if (stockManager.currentTpl) {
      let t = (stockManager.currentTpl[45] * n).toFixed(0);
      $("#upnum").val(t);
      Materialize.updateTextFields();
    }
  });
  $("#downnumRange").on("input", v => {
    // console.log(v.target.value);
    let n = 1 + v.target.value / 100.0;
    if (stockManager.currentTpl) {
      let t = (stockManager.currentTpl[45] * n).toFixed(0);
      $("#downnum").val(t);
      Materialize.updateTextFields();
    }
  });
  $("#doConfirm").click(() => {
    let stockname = $("#stockname").val() || "";
    let stockcode = $("#stockcode").val() || "";
    if (!stockcode) return;
    let upnum = $("#upnum").val() || undefined;
    let downnum = $("#downnum").val() || undefined;
    if (+downnum > +upnum) {
      return Materialize.toast(
        "下限大于上限，格式不符合！",
        1200,
        "rounded top"
      );
    }
    let i = $("#editModel").val();
    let item = stockManager.list[+i];
    if (stockManager.currentTpl && i != "") {
      if (item.upnum != upnum || item.downnum != downnum) {
        stockManager.updateItem(i, {
          upnum: upnum,
          downnum: downnum
        });
      }
    } else {
      stockManager.addItem({
        stockcode: stockManager.currentTpl[2],
        stockname: stockManager.currentTpl[1],
        warningSetting: false,
        upnum: upnum || undefined,
        downnum: downnum || undefined
      });
    }
    // console.log(stockname, stockcode, upnum, downnum);
    render(stockManager.list);
    $("#addStock").modal("close");
  });

  $("#tbody").on("change", ".warningSetting", event => {
    let index = $(event.target).data("index");
    if (!stockManager.list[+index]) return;
    let checked = event.target.checked;
    stockManager.updateItem(+index, { warningSetting: checked });
  });
  $("#stockcode").on("input", event => {
    console.log("input");
    let v = event.target.value;
    if (!isNaN(v) && v.length === 6) {
      request(v).then(result => {
        $("#stockname").val(result[1]);
        stockManager.currentTpl = result;
        

        if (!$("#upnum").val()) {
          $("#upnum").val((result[45] * 1.2).toFixed(2));
          $("#upnumRange").val("20");
        }
        if (!$("#downnum").val()) {
          $("#downnum").val((result[45] * 0.8).toFixed(2));
          $("#downnumRange").val("-20");
        }
        Materialize.updateTextFields();
      });
    }
  });

  $('#tbody').on('click','.stname',v =>{
    let index = $(v.target).data("index");
    if (!stockManager.list[+index]) return;
    let url = `http://biz.finance.sina.com.cn/company/compare/img_syl_compare.php?stock_code=${ $(v.target).data('code') }&limit=265`
    $('#pehook').attr('src',url);
    $('#peModal').modal('open');
  })
  render(stockManager.list || []);

  let renderCount = 0;
  setInterval(() => {
    let flag = isTradeTime();
    if(flag){
      render(stockManager.list || []);
      console.log(`renderCount: ${renderCount++}`);
    }
  }, 30000);
});
