/**
 * Client Container.
 *
 * @type {ClientContainer|exports|module.exports}
 */

var when = require('when');
var debug = require('debug')('organiq:core');
var EventEmitter = require('events').EventEmitter;
var OrganiqRequest = require('./request');
var util = require('util');

module.exports = ClientContainer;

/* begin-test-code */
module.exports.RemoteDeviceProxy = RemoteDeviceProxy;
module.exports.OrganiqRequest = OrganiqRequest;
/* nd-test-code */

/**
 * Create a Client node.
 *
 * @param {Object=} options
 * @returns {ClientContainer}
 * @constructor
 */
function ClientContainer(options) {
  if (!(this instanceof ClientContainer)) {
    return new ClientContainer(options);
  }
  options = options || {};

  this.proxies = {};      // connected remote device proxies, by deviceid
  this.gateway = null;    // gateway with which we are associated
}
util.inherits(ClientContainer, EventEmitter);

/**
 * Get a proxy for a device.
 *
 * @param {string} deviceid Specifies the device to which to connect.
 * @return {Promise<RemoteDeviceProxy>} device proxy
 */
ClientContainer.prototype.connect = function(deviceid) {
  var proxies = this.proxies;
  if (typeof proxies[deviceid] !== 'undefined') {
    return when(proxies[deviceid]);  // BUGBUG, ref count?
  }

  var gateway = this.gateway;
  if (!gateway) {
    throw new Error('No gateway attached.');
  }

  function _connect() {
    var req = new OrganiqRequest(deviceid, 'CONNECT');
    return gateway.dispatch(req).then(function() {
      debug('Client connected to gateway: ' + deviceid);
      proxies[deviceid] = new RemoteDeviceProxy(gateway, deviceid);
      return proxies[deviceid];
    });
  }

  if (gateway.connected) {
    return _connect();
  }

  // Wait for connection to be established.
  var d = when.defer();
  function listener() {d.resolve(true);}
  gateway.on('connect', listener);
  return when(d.promise).timeout(5000)
    .then(_connect)
    .finally(function() {
      gateway.removeListener('on', listener);
    });
};

/**
 * Release a proxy for a device.
 *
 * @params {LocalDeviceProxy} previously connected device proxy
 */
ClientContainer.prototype.disconnect = function(proxy) {
  var req = new OrganiqRequest(proxy.deviceid, 'DISCONNECT');
    return this.gateway.dispatch(req);
};

ClientContainer.prototype.attachGateway = function attachGateway(gateway) {
  if (this.gateway) {
    throw new Error('Gateway already attached');
  }
  this.gateway = gateway;
  //var self = this;

  gateway.on('connect', function() {
    debug('Gateway connected');
    //for (var reqid in self.pendingRequests) {
    //  if (self.pendingRequests.hasOwnProperty(reqid)) {
    //    gateway.dispatch(self.pendingRequests[reqid]);
    //    delete self.pendingRequests[reqid];
    //  }
    //}
  });
  gateway.on('disconnect', function() {
    debug('Gateway disconnnected');
    // nothing
  });
};

/**
 * Dispatch an upstream request to a connected client.
 *
 * This method is invoked by the gateway when an upstream notification is sent
 * for a device for which we have a connected proxy. It causes the appropriate
 * proxy objects to emit() an approprate event.
 *
 * @param  {OrganiqRequest} req The request to dispatch
 * @return {Promise} A promise for a result value
 */
ClientContainer.prototype.dispatch = function dispatch(req) {
  /** @type {RemoteDeviceProxy} */
  var proxy = this.proxies[req.deviceid];
  var res = req.method === 'NOTIFY' ? true : req.value;
  if (!proxy) {
    // nothing to do
    return when(res);
  }

  switch(req.method) {
    case 'NOTIFY':
      proxy.emit('notify', req.identifier, req.params);
      break;
    case 'PUT':
      proxy.emit('put', req.identifier, req.value);
      break;
    default:
      debug('Invalid upstream method: ' + req.method);
      throw new Error(req.method + ' is not a valid upstream notification');
  }

  return when(res);
};

/**
 * Remote Device Proxy.
 *
 * This object is given to callers of connect(), providing them an object-
 * based interface to a remote device. Calls to the proxy's methods are routed
 * through the remote gateway, and notifications that the connected device
 * emits are raised as normal events on this proxy.
 *
 *
 * @param {WebSocketTransport} gateway The dispatcher for downstream messages.
 * @param deviceid
 * @return {RemoteDeviceProxy}
 * @constructor
 */
function RemoteDeviceProxy(gateway, deviceid) {
  if (!(this instanceof RemoteDeviceProxy)) {
    return new RemoteDeviceProxy(gateway, deviceid);
  }

  this.deviceid = deviceid;
  this.dispatch = function(req) {
    return gateway.dispatch(req);
  };
}
//emits 'notify' and 'put'
util.inherits(RemoteDeviceProxy, EventEmitter);

RemoteDeviceProxy.prototype.get = function(prop) {
  var req = OrganiqRequest.get(this.deviceid, prop);
  return this.dispatch(req);
};

RemoteDeviceProxy.prototype.set = function(prop, value) {
  var req = OrganiqRequest.set(this.deviceid, prop, value);
  return this.dispatch(req);
};

RemoteDeviceProxy.prototype.invoke = function(method, params) {
  var req = OrganiqRequest.invoke(this.deviceid, method, params);
  return this.dispatch(req);
};

RemoteDeviceProxy.prototype.subscribe = function(event) {
  var req = OrganiqRequest.subscribe(this.deviceid, event);
  return this.dispatch(req);
};

RemoteDeviceProxy.prototype.describe = function(property) {
  var req = OrganiqRequest.describe(this.deviceid, property);
  return this.dispatch(req);
};

RemoteDeviceProxy.prototype.config = function(property, value) {
  var req = OrganiqRequest.config(this.deviceid, property, value);
  return this.dispatch(req);
};

