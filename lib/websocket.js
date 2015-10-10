/**
 * Shim for WebSocket inclusion.
 *
 * We normally use 'websockets/ws' for WebSockets support, but this fails in
 * the browser. Apparently. Need to revisit this.
 */
var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = process.browser ? BrowserWebSocketShim
                                 : require('ws');

/**
 * Wrapper for native browser WebSocket, making it behave like the WebSockets/ws
 * module (enough for our needs, anyhow).
 *
 * @param {String} url
 * @param {String[]=} protocols
 * @param {Object=} options
 * @param {Object=} options.headers Optional headers to include in request.
 * @param {Object=} options.headers.Authorization An authorization header.
 * @return {BrowserWebSocketShim}
 * @constructor
 */
function BrowserWebSocketShim(url, protocols, options) {
  if (!(this instanceof BrowserWebSocketShim)) {
    return new BrowserWebSocketShim(url, protocols, options);
  }
  var self = this;
  /*global WebSocket*/
  // The browser WebSocket implementation does not allow for headers to be
  // added to the upgrade request, so we're forced to put the Authorization
  // information on the query string.
  if (options && options.headers && options.headers['Authorization']) {
    url += '/?Authorization=' + options.headers['Authorization'];
  }
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
