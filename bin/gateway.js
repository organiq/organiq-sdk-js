/**
 * Organiq Device Gateway Server for Development.
 */
var organiq = require('organiq-core');        // organiq-core
var express = require('express');             // Express web server
var bodyParser = require('body-parser');      // middleware for Express
var WebSocketServer = require('ws').Server;
var debug = require('debug')('organiq:gateway');

module.exports = OrganiqDevelopmentServer;

/**
 * Organiq Device Gateway Server for Development.
 *
 * This is a simple implementation of an Organiq server that can be used for
 * development purposes. It should not be used from publicly accessible
 * machines.
 *
 * @param {Object} options
 * @param options.port The port on which to listen
 * @returns {OrganiqDevelopmentServer}
 * @constructor
 */
function OrganiqDevelopmentServer(options) {
  if (!(this instanceof OrganiqDevelopmentServer)) {
    return new OrganiqDevelopmentServer();
  }

  options = options || {};
  var port = options.port || 1338;

  // Create the core Organiq device proxy with a trace middleware function
  var app = new organiq();
  app.use(trace);

  // Create the Express Application for service HTTP requests
  var http_server = express()
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({extended: true}))
    .all('/dapi/:deviceid/:identifier', app.expressDapi())
    .listen(port, function () {
      var host = http_server.address().address;
      var port = http_server.address().port;
      console.log('Organiq Device Proxy at http://%s:%s', host, port);
    });

  // Create the WebSocket application for handling WebSocket requests
  var wss = new WebSocketServer({server: http_server});
  wss.on('connection', app.websocketApi());
}

/**
 * Simple trace module for Organiq stack.
 *
 * This trace module logs request information via debug. It is intended to be
 * installed as Organiq middleware, like:
 *
 * var app = new organiq();
 * app.use(trace);
 *
 * @param req
 * @param next
 * @returns {Promise|*}
 */
function trace(req, next) {
  var s = req.method + '(' + req.identifier + ') ==> '+ req.deviceid;
  debug(s);
  return next().then(function(res) {
    debug('[RESPONSE TO] ' + s);
    debug('  ==> ' + res);
    return res;
  });
}
