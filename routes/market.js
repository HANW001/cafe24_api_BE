var express = require("express");
var router = express.Router();
var request = require("request");
var mysql = require("mysql");

var dayjs = require("dayjs");
var date = dayjs();

var db_config = require("../config/mysql.js");
var conn = mysql.createConnection({
  host: "localhost",
  port: "3306",
  user: "root",
  password: "root",
  database: "cafe24",
});

const { GoogleSpreadsheet } = require("google-spreadsheet");
const gs_creds = require(""); // 키 생성 후 다운된 json파일을 지정합니다.
const doc = new GoogleSpreadsheet(
  ""
);

var receivers_names = {};
var product_names = {};
var product_quantitys = {};
var product_prices = {};
var product_shipping_fees = {};
var product_payment_amounts = {};
var order_idss = []; //전체주문번호
var order_ids = []; // 업데이트 안된 주문번호
conn.connect();
router.get("/order", function (req, res, next) {
  console.log("order");

  console.log(mall_id);
  console.log(access_token);
  var order_api =
    "https://" +
    mall_id +
    ".cafe24api.com/api/v2/admin/orders?start_date=" +
    date.subtract(1, "day").format("YYYY-MM-DD") +
    "&end_date=" +
    date.format("YYYY-MM-DD") +
    "&limit=99";
  console.log(order_api);
  var options = {
    method: "GET",
    url: order_api,
    headers: {
      Authorization: "Bearer " + access_token,
      "Content-Type": "application/json",
      "X-Cafe24-Api-Version": "2022-09-01",
    },
  };
  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    var bodys = JSON.parse(body);
    // console.log(bodys)
    product_prices = {};
    product_shipping_fees = {};
    product_payment_amounts = {};
    gsheet_price(bodys);

    order_idss = [];
    order_ids = [];
    add_sql(bodys);

    //sql 업데이트 된 주문번호 확인 후 해당 번호 삭제작업
    pop_order_id(order_idss);

    product_names = {};
    receivers_names = {};
    if (order_idss.length > 0) {
      items(order_idss);
      receivers(order_idss);
    }
    res.send(body);
  });
});

router.get("/gsheet", function (req, res, next) {
  authGoogleSheet();
  res.send("good");
});

function gsheet_price(bodys) {
  for (let index = 0; index < bodys.orders.length; index++) {
    var order_idd = bodys.orders[index].order_id;
    var order_price_amount =
      bodys.orders[index].actual_order_amount.order_price_amount;
    var shipping_fee = bodys.orders[index].actual_order_amount.shipping_fee;
    var payment_amount = bodys.orders[index].actual_order_amount.payment_amount;

    product_prices[order_idd] = order_price_amount;
    product_shipping_fees[order_idd] = shipping_fee;
    product_payment_amounts[order_idd] = payment_amount;
  }
}

function add_sql(bodys) {
  var sql = "INSERT IGNORE  INTO order_table VALUES (?,?,0)";

  for (let index = bodys.orders.length - 1; index >= 0; index--) {
    var order_id = bodys.orders[index].order_id;
    order_idss.push(order_id);
    conn.query(sql, [mall_id, order_id]);
  }
}

function pop_order_id(order_idss) {
  for (let index = 0; index < order_idss.length; index++) {
    var pop_sql =
      "SELECT sheet_update from order_table WHERE mall_id = ? AND order_id = ?";
    conn.query(
      pop_sql,
      [mall_id, order_idss[index]],
      function (err, results, fields) {
        console.log(order_idss[index]);
        if (results[0].sheet_update == 0) {
          console.log("hi!!!!");
          console.log(order_idss[index]);
          console.log(results[0].sheet_update == 0);
          // order_ids.add(index, 1);
          order_ids.push(order_idss[index]);
          console.log("pop_order_id");
          console.log(order_ids);
        }
      }
    );
  }
}

function items(order_ids, receiver) {
  var order_id = order_ids;
  for (let index = 0; index < order_ids.length; index++) {
    var options = {
      method: "GET",
      url:
        "https://" +
        mall_id +
        ".cafe24api.com/api/v2/admin/orders/" +
        order_id[index] +
        "/items",
      headers: {
        Authorization: "Bearer " + access_token,
        "Content-Type": "application/json",
        "X-Cafe24-Api-Version": "2022-09-01",
      },
    };
    request(options, async function (error, response, body) {
      if (error) throw new Error(error);
      var bodys = JSON.parse(body);
      var name = bodys.items[0].product_name;
      var quantity = bodys.items[0].quantity;
      var product_price = bodys.items[0].product_price;

      product_names[order_id[index]] = name;
      product_quantitys[order_id[index]] = quantity;
      product_prices[order_id[index]] = product_price;
    });
  }
}

function receivers(order_ids) {
  var order_id = order_ids;

  product_quantitys = {};
  product_prices = {};

  for (let index = 0; index < order_ids.length; index++) {
    var options = {
      method: "GET",
      url:
        "https://" +
        mall_id +
        ".cafe24api.com/api/v2/admin/orders/" +
        order_id[index] +
        "/receivers",
      headers: {
        Authorization: "Bearer " + access_token,
        "Content-Type": "application/json",
        "X-Cafe24-Api-Version": "2022-09-01",
      },
    };
    request(options, async function (error, response, body) {
      if (error) throw new Error(error);
      var bodys = JSON.parse(body);
      var name = bodys.receivers[0].name;

      receivers_names[order_id[index]] = name;
    });
  }
}

async function authGoogleSheet() {
  try {
    await doc.useServiceAccountAuth(gs_creds);
    await doc.loadInfo();
    addFirstSheetRow();
  } catch (err) {
    console.log("AUTH ERROR ", err);
  }
}

async function readFirstSheetRow() {
  var sheet = doc.sheetsByIndex[0]; // 첫번째 시티를 가져옵니다.
  var rows = await sheet.getRows({ offset: 0, limit: 100 }); // 세 번째 row 부터 100개 row를 가져옵니다.
  rows.forEach((ele) => {
    console.log(ele._rawData[0], ele._rawData[1]); // 읽어온 rows 중 현재row에서 첫 번째 컬럼과 두 번째 컬럼을 출력합니다.
  });
}

async function addFirstSheetRow() {
  console.log(order_ids);
  for (let index = 0; index < order_ids.length; index++) {
    let rowData = {
      취소사유기재: "",
      고객명: receivers_names[order_ids[index]],
      품목: product_names[order_ids[index]],
      몰: mall_id,
      구매몰: "",
      비고: "",
      수량: product_quantitys[order_ids[index]],
      판매가격: product_prices[order_ids[index]],
      배송: "",
      배송비: product_shipping_fees[order_ids[index]],
      총결제금액: product_payment_amounts[order_ids[index]],
      원가: "",
      마진: "",
      마진율: "",
      주문날짜: "",
      주문자: "",
      월별: "",
    };
    var sheet = doc.sheetsByIndex[0]; // 첫번째 시티를 가져옵니다.
    var sql =
      "UPDATE order_table  SET sheet_update = 1 WHERE mall_id=? and order_id=?";

    conn.query(sql, [mall_id, order_ids[index]]);

    await sheet.addRow(rowData, function (err) {
      console.log(err);
    });
  }
}

module.exports = router;
