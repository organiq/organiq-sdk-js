var OrganiqRequest = require('./request');
var RequestStack = require('./requestStack');
var debug = require('debug')('organiq:gateway:device');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
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

  var pendingActivations = {};

  // Public Interface
  this.dispatch = dispatch;
  this.activate = activate;
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
   * Activate a device
   *
   * @param {String} alias
   * @returns {Promise<deviceid, token>} deviceid and token on success
   */
  function activate(alias) {
    debug('Activating ' + alias + ' with gateway.');
    // Make sure we haven't already registered this deviceid.
    if (typeof pendingActivations[alias] !== 'undefined') {
      return pendingActivations[alias].d.promise;
    }
    if (gateway && gateway.connected) {
      return activateWithGateway(alias);
    } else {
      pendingActivations[alias] = { alias: alias, d: when.defer() };
      return pendingActivations[alias].d.promise;
    }
  }

  function activateWithGateway(alias) {
    var req = new OrganiqRequest(null, 'ACTIVATE');
    req.identifier = alias;
    return gateway.dispatch(req).then(function(res) {
      var deviceid = res.deviceid;
      var token = res.token;
      debug('Device activated with gateway: ' + deviceid);
      return when(deviceid, token);
    }, function(err) {
      debug('Failed to activate device ' + alias + ': ' + err);
    });

  }

  /**
   * Register a device with the system..
   *
   *
   * @param {String} deviceid
   * @param {Device|EventEmitter} device
   * @param {Object} token Device token from a previous activation call
   * @returns {String} the deviceid given
   */
  function register(deviceid, device, token) {

    // Make sure we haven't already registered this deviceid.
    if (typeof devices[deviceid] !== 'undefined') {
      throw new Error('organiq.registerDevice() called for already-registered' +
                      ' deviceid: ' + deviceid);
    }

    if (typeof device.on === 'function') {
      // Pass device-originated messages from the device into the organiq
      // middleware stack.
      device.on('put', function onPut(metric, value) {
        debug('LocalDevice ' + deviceid + ': PUT ' + metric + ',' + value);
        var req = OrganiqRequest.put(deviceid, metric, value);
        dispatch(req).then(null, function(err) {
          debug('Failed to dispatch PUT: ' + err);
        });
      });
      device.on('notify', function onNotify(event, args) {
        debug('LocalDevice ' + deviceid + ': NOTIFY ' + event + ',' + args);
        var req = OrganiqRequest.notify(deviceid, event, args);
        dispatch(req).then(null, function(err) {
          debug('Failed to dispatch NOTIFY: ' + err);
        });
      });
    }

    devices[deviceid] = device;

    debug('Device registered locally: ' + deviceid);

    if (gateway && gateway.connected) {
      registerWithGateway(deviceid, token);
    }
    return deviceid;
  }


  function registerWithGateway(deviceid, token) {
    debug('Registering ' + deviceid + ' with gateway.');
    var req = new OrganiqRequest(deviceid, 'REGISTER');
    req.identifier = token;
    gateway.dispatch(req).then(function() {
      debug('Device registered with gateway: ' + deviceid);
    }, function(err) {
      debug('Failed to register device ' + deviceid + ': ' + err);
    });
  }

  function deregisterWithGateway(deviceid) {
    debug('Deregistering ' + deviceid + ' with gateway.');
    var req = new OrganiqRequest(deviceid, 'DEREGISTER');
    gateway.dispatch(req).then(function() {
      debug('Device deregistered with gateway: ' + deviceid);
    }, function(err) {
      debug('Failed to deregister device ' + deviceid + ': ' + err);
    });
  }

  /**
   * Removes a device registration from the system.
   *
   * Once deregistered, a device is no longer reachable.
   *
   * @param {string} deviceid
   * @returns {string} the deregistered deviceid
   *
   */
  function deregister(deviceid) {
    if (typeof devices[deviceid] === 'undefined') {
      throw Error('organiq.deregisterDevice() called for unregistered' +
                  ' deviceid: ' + deviceid);
    }

    var device = devices[deviceid];
    device.removeAllListeners();
    delete devices[deviceid];

    debug('Device deregistered: ' + deviceid);

    if (gateway && gateway.connected) {
      deregisterWithGateway(deviceid);
    }

    return deviceid;
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
      for (var alias in pendingActivations) {
        if (pendingActivations.hasOwnProperty(alias)) {
          var ai = pendingActivations[alias];
          ai.d.resolve(activateWithGateway(ai.alias));
        }
      }

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

