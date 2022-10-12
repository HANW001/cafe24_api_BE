var express = require("express");
var router = express.Router();

var request = require("request");

var mall_id = "dlsxjznf12";
var client_id = "sHf4bfqXtkpxGf2X9qVN9U";
var encode_redirect_uri = "https://dlsxjznf12.cafe24.com/";
var scope = "mall.write_order, mall.read_order";
var url = 'https://'+mall_id+'.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id='+client_id+'&state={encode_csrf_token}&redirect_uri='+encode_redirect_uri+'&scope='+scope


/* GET home page. */
router.get("/", function (req, res, next) {
  // res.render("index", { title: "Express" });
  console.log('hi')
});



module.exports = router;
