var express = require("express");
var router = express.Router();
var request = require("request");
const qs = require("qs");
var bodyParser = require("body-parser");

// var mall_id;
var client_id = "";
var client_secret = "";
// var encode_redirect_uri;
var scope = "mall.write_order, mall.read_order";

router.get("/oauth", function (req, res, next) {
  var mall_id = req.query.mall_id;
  // var client_id = req.query.client_id;
  // var client_secret =req.query.client_secret
  var encode_redirect_uri = req.query.encode_redirect_uri;
  // var scope = req.query.scope;
  var urls =
    "https://" +
    mall_id +
    ".cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id=" +
    client_id +
    "&state={encode_csrf_token}&redirect_uri=" +
    encode_redirect_uri +
    "&scope=" +
    scope;
  console.log("oauth");
  // req.session.destroy();
  res.redirect(urls);
});

router.post("/access", function (req, res, next) {
  console.log("access");
  var secret_key = Buffer.from(client_id + ":" + client_secret).toString(
    "base64"
  );
  var auth_tokens = req.body.auth_tokens;
  mall_id = req.body.mallId;
  encode_redirect_uri = req.body.encodeRedirectUri;

  console.log("req.body");
  console.log(req.body);
  console.log(auth_tokens);
  // var scope = req.query.scope;
  console.log(secret_key);
  var header = {
    Authorization: "Basic " + secret_key,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  var payload = qs.stringify({
    grant_type: "authorization_code",
    code: auth_tokens,
    redirect_uri: encode_redirect_uri,
  });
  console.log("mall_id");
  console.log(mall_id);
  console.log("redirect_uri");
  console.log(encode_redirect_uri);
  var options = {
    method: "POST",
    url: "https://" + mall_id + ".cafe24api.com/api/v2/oauth/token",
    headers: header,
    body: payload,
    json: true,
  };
  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    // var bodys = JSON.stringify(body)
    console.log(typeof body);
    console.log(body);
    console.log(body["access_token"]);

    // res.session;
    res.send(body);
    global.mall_id = body.mall_id;
    global.access_token = body["access_token"];
    console.log( exports.mall_id);
    // req.session.mall_id = body.mall_id;
  });
});

module.exports = router;
