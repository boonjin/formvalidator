'use strict';

//dependencies
var config = require('./config'),
  express = require('express'),
  http = require('http'),
  http = require('http'),
  path = require('path'),
  //    slash   = require('express-slash'),
  helmet = require('helmet'),
  connect = require('connect'),
  errorhandler = require('errorhandler');
var fs = require('fs');
var cors = require('cors');
var async = require('async');
var _ = require('underscore');
var bodyParser = require('body-parser');

var cheerio = require("cheerio");
var request = require('request');

//create express app
var app = express();

//keep reference to config
app.config = config;
//Setting up the environment for the app depends on config
//console.log(app.settings.env);

//setup the web server
app.server = http.createServer(app);

//setup mongoose

//config express in all environments
//app.configure(function(){
//settings
app.disable('x-powered-by');
app.set('port', config.port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(require('morgan')('dev'));
app.use(require('compression')());


app.use(bodyParser.json({
  limit: '5mb'
}));
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '5mb'
}));

// app.use(require('body-parser')());
//app.use(express.json());
app.use(require('method-override')());

app.get(function(req, res, next) {
  if (req.url.substr(-1) == '/' && req.url.length > 1)
    res.redirect(301, req.url.slice(0, -1));
  else
    next();
});


var serveStatic = require('serve-static');
app.use(serveStatic(path.join(__dirname, 'statics'), {
  setHeaders: function(res) {}
}));

var startHTML = "";
startHTML += "<!DOCTYPE html>";
startHTML += "<html>";
startHTML += "<body>";
startHTML += '<h4>Google Form Extraction Tool Created by Boon Jin <a href="http://www.boonjin.com">(www.boonjin.com)</a></h4>';
startHTML += "<form action=\"\/\" method=\"post\">";
startHTML += "  <br>";
startHTML += "  Google Form (or Google Site with embedded Form) URL:<br>";
startHTML += "  <input type=\"text\" name=\"formaddress\" value=\"";

var midHTML = "\" size=\"100\">";
midHTML += "  <br><br>";
midHTML += "  <input type=\"submit\" value=\"Check Validation Answers\">";
midHTML += "<\/form>";
midHTML += "";
midHTML += "<p><\/p>";
midHTML += "";

var endHTML = "<\/body>";
endHTML += "<\/html>";

var frameStart = "<br><br><br><iframe src=\"";
var frameEnd = "\" width='500px' height='500px' ></iframe>";


app.post('/', function(req, res) {

  //  console.log("TEST");
  //modify the url in any way you want
  //    console.log("HJSELJRLEJSRLER");
  var newUrl = req.body.formaddress;
  console.log(newUrl);
  if (newUrl.indexOf('google.com') < 0) {
    res.status(200).send(startHTML + newUrl + midHTML + '<h2> NOT FOUND! </h2>' + endHTML);
    return;
  }
  //old image type need to retrieve
  // var fileID = newUrl.replace('https://docs.google.com/uc?id=', '');
  // var previewURL = 'https://docs.google.com/file/d/' + fileID + '/edit?pli=1'; // + '/preview';
  // console.log(previewURL);
  if (newUrl.indexOf('sites.google.com') > 0) {
    request(newUrl, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var $ = cheerio.load(body);
        var foundFrames = $('iframe[src]');
        var foundURL;
        _.each(foundFrames, function(frame) {
          if (frame && frame.attribs && frame.attribs.src){
            var frameURL = frame.attribs.src;
            if (frameURL.indexOf('/forms/viewform') > 0) {
              foundURL = frameURL;
            }
          }

        });

        if (foundURL) {
          checkURL(foundURL, res);
        } else {
          res.status(200).send(startHTML + newUrl + midHTML + '<h2> NOT FOUND! </h2>' + endHTML);

        }
      } else {
        res.status(200).send(startHTML + newUrl + midHTML + '<h2> NOT FOUND! </h2>' + endHTML);
      }
    });
  } else {
    checkURL(newUrl, res);
  }



});

function checkURL(newUrl, res) {
  console.log(newUrl);
  request(newUrl, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var $ = cheerio.load(body);


      var scriptData = $('script').last().html();
      // console.log(scriptData);


      // var position = 0;
      var marker = '\\x22';
      var endPosition;

      var output = "";

      var startPosition = scriptData.indexOf(marker, 0);
      while (startPosition > 0) {
        var endPosition = scriptData.indexOf(marker, startPosition + 1);
        var dataFound = scriptData.substring(startPosition + marker.length, endPosition);
        output += "<h3>" + dataFound + "</h3>";
        startPosition = scriptData.indexOf(marker, endPosition + 1);
      }


      res.status(200).send(startHTML + newUrl + midHTML + output + frameStart + newUrl + frameEnd + endHTML);
    } else {
      res.status(200).send(startHTML + newUrl + midHTML + '<h2> NOT FOUND! </h2>' + endHTML);
    }
  });
}
// H5F.setup(document.getElementById('ss-form'));
// _initFormViewer({
//   [100, , [
//     [
//       [15711429, [
//         [4, 301, [\x22RWB\ x22]\ n, \x22STILL LOCKED!\x22]\ n
//       ]\ n]\ n, [23609948, [
//         [1, 5, [\x221956\ x22]\ n, \x22STILL LOCKED!\x22]\ n
//       ]\ n]\ n, [1341170028, [
//         [4, 301, [\x22EAGLES\ x22]\ n, \x22STILL LOCKED!\x22]\ n
//       ]\ n]\ n
//     ]\ n
//   ]\ n]\ n
// }, true);


//listen up
app.server.listen(app.config.port, function() {
  console.log("Server running!");
});

process.on('uncaughtException', function(err) {
  console.log("UNCAUGHT EXCEPTION ");
  console.log("[Inside 'uncaughtException' event] " + err.stack || err.message);
  //should restart app
});
