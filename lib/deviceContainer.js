var OrganiqRequest = require('./request');
var RequestStack = require('./requestStack');
var when = require('when');
var debug = require('debug')('organiq:core');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
module.exports = LocalDeviceContainer;

/**
 * Create a DeviceContainer node.
 *
 * A device container holds references to locally-connected devices and attaches
 * them to the upstream gateway.
 *
 * @param {Object=} options
 * @returns {LocalDeviceContainer}
 * @constructor
 */
function LocalDeviceContainer(options) {
  if (!(this instanceof LocalDeviceContainer)) {
    return new LocalDeviceContainer(options);
  }
  //options = options || {};

  var devices = {};      // registered local device objects, by deviceid
  var gateway = null;    // gateway with which we are associated
  var stack = new RequestStack(finalHandlerUpstream, finalHandlerDownstream);
  var self = this;

  // Public Interface
  this.dispatch = dispatch;
  this.register = register;
  this.deregister = deregister;

  function dispatch(req) {
    return stack.dispatch(req);
  }

  /**
   * Handle an application-originated request after it has passed through the
   * middleware stack.
   *
   * The request will be passed to the device object if it exists, otherwise
   * an Error will be raised.
   *
   * @param {OrganiqRequest} req request object
   */
  function finalHandlerDownstream(req) {

    var device = devices[req.deviceid];
    if (!device) {
      var msg = 'Device \'' + req.deviceid + '\' is not connected.';
      debug(msg);
      throw new Error(msg);
    }

    switch(req.method) {
      case 'GET':
        return device.get(req.identifier);
      case 'SET':
        return device.set(req.identifier, req.value) || true;
      case 'INVOKE':
        return device.invoke(req.identifier, req.params) || true;
      case 'SUBSCRIBE':
        return device.subscribe(req.identifier);
      case 'DESCRIBE':
        debug('handling DESCRIBE');
        return device.describe(req.identifier);
      case 'CONFIG':
        return device.config(req.identifier, req.value);
      default:
        debug('Invalid request method: ' + req.method);
        throw new Error(req.method + ' is not a valid downstream request');
    }
  }

  /**
   * Handle a device-originated request after it has passed through the
   * middleware stack.
   *
   * We forward the request to the gateway.
   *
   * @param {OrganiqRequest} req request object
   * @returns {Boolean}
   */
  function finalHandlerUpstream(req) {
    if (gateway && gateway.connected) {
      gateway.dispatch(req);
    }
    return true;
  }

  /**
   * Register a device with the system.
   *
   * The device may be either a locally-implemented device, or a proxy to a
   * device implemented elsewhere.
   *
   *
   * @param {String} deviceid
   * @param {Device|EventEmitter} device
   * @returns {Device} the device object given
   */
  function register(deviceid, device) {

    // Make sure we haven't already registered this deviceid.
    if (typeof devices[deviceid] !== 'undefined') {
      return when.reject(new Error(
        'Register called for already registered deviceid: ' + deviceid));
    }

    if (typeof device.on === 'function') {
      // Pass device-originated messages from the device into the organiq
      // middleware stack.
      device.on('put', function onPut(metric, value) {
        debug('LocalDevice '+deviceid+': PUT ' + metric + ',' + value);
        var req = OrganiqRequest.put(deviceid, metric, value);
        dispatch(req);
      });
      device.on('notify', function onNotify(event, args) {
        debug('LocalDevice '+deviceid+': NOTIFY ' + event + ',' + args);
        var req = OrganiqRequest.notify(deviceid, event, args);
        dispatch(req);
      });
    }

    devices[deviceid] = device;
    self.emit('deviceRegistered', deviceid);

    debug('Device registered locally: ' + deviceid);

    if (gateway && gateway.connected) {
      registerWithGateway(deviceid);
    }
    return device;
  }

  function registerWithGateway(deviceid) {
    debug('Registering ' + deviceid + ' with gateway.');
    var req = new OrganiqRequest(deviceid, 'REGISTER');
    gateway.dispatch(req).then(function() {
      debug('Device registered with gateway: ' + deviceid);
    }, function(err) {
      debug('Failed to register device ' + deviceid + ': ' + err);
    });
  }

  /**
   * Removes a device registration from the system.
   *
   * Once deregistered, a device is no longer reachable.
   *
   * @param {string} deviceid
   * @returns {DeviceWrapper} the device originally registered
   *
   */
  function deregister(deviceid) {
    if (typeof devices[deviceid] === 'undefined') {
      debug('deregister called for unregistered deviceid: ' + deviceid);
      return when.reject(new Error(
        'deregister of unregistered device: ' + deviceid));
    }

    var device = devices[deviceid];
    device.removeAllListeners();
    delete devices[deviceid];
    self.emit('deviceDeregistered', deviceid);

    debug('Device deregistered: ' + deviceid);

    var req = new OrganiqRequest(deviceid, 'DEREGISTER');
    return gateway.dispatch(req);
  }

  /**
   * Attach to a Gateway.
   *
   * A device container is associated with a single gateway for its entire
   * lifetime. The gateway connection may `connect` and `disconnect`, potentially
   * many times, over the lifetime of the container. Any time the gateway goes
   * into the `connect` state, we assume that it has lost server-side context
   * associated with connected devices, and we re-register all devices.
   *
   * @param gateway_
   */
  LocalDeviceContainer.prototype.attachGateway = function attachGateway(gateway_) {
    if (gateway) {
      throw new Error('Gateway already attached');
    }
    gateway = gateway_;

    gateway.on('connect', function() {
      debug('Gateway connected');
      for (var deviceid in devices) {
        if (devices.hasOwnProperty(deviceid)) {
          registerWithGateway(deviceid);
        }
      }
    });
    gateway.on('disconnect', function() {
      debug('Gateway disconnnected');
      // nothing
    });
  };
}
util.inherits(LocalDeviceContainer, EventEmitter);

