/**
 * Module dependencies.
 */


/**
 * Organiq Request prototype.
 */

var exports = module.exports = OrganiqRequest;
var upstreamMethods = ['NOTIFY', 'PUT'];
var downstreamMethods = ['GET', 'SET', 'INVOKE', 'SUBSCRIBE', 'CONFIG',
                         'DESCRIBE'];

/*
 * Internal request representation.
 *
 * An OrganiqRequest object is used to move requests through the system after
 * they have been received from the network or other transport. It is this
 * object that is given to each layer of the middleware stack.
 *
 * These objects are normally created via the factory functions attached to
 * this constructor, e.g., OrganiqRequest.get(), OrganiqRequest.invoke(), etc.
 *
 * @returns {OrganiqRequest}
 * @constructor
 */
function OrganiqRequest(deviceid, method) {
  if (!(this instanceof OrganiqRequest)) {
    return new OrganiqRequest(deviceid, method);
  }

  this.deviceid = deviceid;   // target device
  this.method = method;   // one of GET, SET, INVOKE, ...
  this.identifier = null; // property, method, or metric name (if applicable)
  this.value = null;      // property or metric value being SET or PUT
  this.params = {};       // parameters of method or event (INVOKE or NOTIFY)
  this.reqid = null;      // unique request id used for overlapped requests
}

exports.get = function(deviceid, property) {
  var req = new OrganiqRequest(deviceid, 'GET');
  req.identifier = property;
  return req;
};
exports.set = function(deviceid, property, value) {
  var req = new OrganiqRequest(deviceid, 'SET');
  req.identifier = property;
  req.value = value;
  return req;
};
exports.invoke = function(deviceid, method, params) {
  var req = new OrganiqRequest(deviceid, 'INVOKE');
  req.identifier = method;
  req.params = params;
  return req;
};
exports.subscribe = function(deviceid, event) {
  var req = new OrganiqRequest(deviceid, 'SUBSCRIBE');
  req.identifier = event;
  return req;
};
exports.describe = function(deviceid, property) {
  var req = new OrganiqRequest(deviceid, 'DESCRIBE');
  req.identifier = property;
  return req;
};
exports.config = function(deviceid, property, value) {
  var req = new OrganiqRequest(deviceid, 'CONFIG');
  req.identifier = property;
  req.value = value;
  return req;
};
exports.put = function(deviceid, metric, value) {
  var req = new OrganiqRequest(deviceid, 'PUT');
  req.identifier = metric;
  req.value = value;
  return req;
};
exports.notify = function(deviceid, event, params) {
  var req = new OrganiqRequest(deviceid, 'NOTIFY');
  req.identifier = event;
  req.params = params;
  return req;
};

/**
 * OrganiqRequest instance methods.
 */
var proto = OrganiqRequest.prototype;

/**
 * Specifies whether the request originated from an application request
 * (as opposed to a device notification).
 *
 * @returns {boolean}
 */
proto.isApplicationOriginated = function isApplicationOriginated() {
  return downstreamMethods.indexOf(this.method) !== -1;
};

/**
 * Specifies whether the request originated from a device notification
 * (as opposed to an application request).
 *
 * @returns {boolean}
 */
proto.isDeviceOriginated = function isDeviceOriginated() {
  return upstreamMethods.indexOf(this.method) !== -1;
};
