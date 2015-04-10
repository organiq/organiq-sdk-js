/**
 * Shim for WebSocket inclusion.
 *
 * We normally use 'websockets/ws' for WebSockets support, but this fails on
 * Tessel, where the 'sitegui/nodejs-websocket' is required.
 */
var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = process.browser ? BrowserWebSocketShim
                                 : isTesselPackage() ? TesselWebSocketShim
                                                     : require('ws');


/**
 * Determine if we are executing in the Tessel package (as opposed to the
 * `normal` node or browser package).
 *
 * We depend on the 'name' attribute of the package.json in the current
 * directory being 'organiq-tessel'.
 *
 * @return {boolean} true if we are running in organiq-tessel package.
 */
function isTesselPackage() {
  var name = '';
  try { name = require('./package.json').name; }
  catch(e) { }

  return name === 'organiq-tessel';
}


/**
 * Wrapper for nodejs-websocket module, making it behave like the WebSockets/ws
 * module (enough for our needs, anyhow).
 *
 * @param url
 * @return {TesselWebSocketShim}
 * @constructor
 */
function TesselWebSocketShim(url) {
  if (!(this instanceof TesselWebSocketShim)) {
    return new TesselWebSocketShim(url);
  }
  var nws = require('nodejs-websocket');
  var self = this;
  var ws = nws.connect(url, function connect() {
    ws.on('text', function(s) { self.emit('message', s, {}); });
    ws.on('close', function(code, reason) {
      self.emit('close', code, reason);
    });
    ws.on('error', function(e) {
      self.emit('error', e); }
    );
    self.emit('open', self);
  });
  this.send = function(s, cb) { return ws.sendText(s, cb); };
}
util.inherits(TesselWebSocketShim, EventEmitter);


/**
 * Wrapper for native browser WebSocket, making it behave like the WebSockets/ws
 * module (enough for our needs, anyhow).
 *
 * @param url
 * @return {BrowserWebSocketShim}
 * @constructor
 */
function BrowserWebSocketShim(url) {
  if (!(this instanceof BrowserWebSocketShim)) {
    return new BrowserWebSocketShim(url);
  }
  var self = this;
  /*global WebSocket*/
  var ws = new WebSocket(url);
  ws.onopen = function connect() {
    self.emit('open', self);
  };
  ws.onmessage = function(event) {
    self.emit('message', event.data, {});
  };
  ws.onerror = function(ev) {
    self.emit('error', ev);
  };
  ws.onclose = function(ev) {
    self.emit('close', ev.code, ev.reason);
  };
  this.send = function(s, cb) { ws.send(s); if (cb) { cb(); } };
}
util.inherits(BrowserWebSocketShim, EventEmitter);
