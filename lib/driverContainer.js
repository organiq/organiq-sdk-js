var OrganiqRequest = require('./request');
var RequestStack = require('./requestStack');
var when = require('when');
var debug = require('debug')('organiq:core');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
module.exports = LocalDriverContainer;

/**
 * Create a DriverContainer node.
 *
 * A driver container holds references to locally-connected drivers and attaches
 * them to the upstream gateway.
 *
 * Downstream messages are processed first by the container stack, and then by
 * the driver stack. Upstream messages are processed first by the driver stack
 * and then by the container stack.
 *
 * @param {Object=} options
 * @returns {LocalDriverContainer}
 * @constructor
 */
function LocalDriverContainer(options) {
  if (!(this instanceof LocalDriverContainer)) {
    return new LocalDriverContainer(options);
  }
  //options = options || {};

  var drivers = {};      // installed local driver stacks, by deviceid
  var gateway = null;    // gateway with which we are associated
  var stack = new RequestStack(finalHandlerUpstream, finalHandlerDownstream);

  // Public Interface
  this.dispatch = dispatch;
  this.install = install;
  this.uninstall = uninstall;

  /**
   * Dispatch a message from the transport.
   *
   * Application-originated messages are routed to the container stack before
   * being passed to a device-specific driver stack. Device-originated messages
   * go first to the device driver, then to the stack.
   *
   * @param {OrganiqRequest} req
   * @return {*}
   */
  function dispatch(req) {
    if (req.isApplicationOriginated()) {
      return stack.dispatch(req);
    } else {
      var driverStack = drivers[req.deviceid];
      if (!driverStack) {
        throw new Error('driver not installed: ' + req.deviceid);
      }
      return driverStack.dispatch(req);
    }
  }

  /**
   * Handle an application-originated request after it has passed through the
   * device-specific driver stack.
   *
   * The request will be passed to the gateway to be forwarded to the underlying
   * device.
   *
   * @param {OrganiqRequest} req request object
   */
  function finalDriverHandlerDownstream(req) {
    // send the request to the underlying device object
    if (gateway && gateway.connected) {
      return gateway.dispatchFromDriver(req);
    }
  }

  /**
   * Handle a device-originated request after it has passed through the
   * device-specific driver stack.
   *
   * The request will be passed to the container stack.
   *
   * @param {OrganiqRequest} req request object
   * @returns {Promise}
   */
  function finalDriverHandlerUpstream(req) {
    return stack.dispatch(req);
  }

  /**
   * Handle an application-originated request after it has been processed by
   * the local container stack.
   *
   * The request will be passed to the device-specific driver stack.
   *
   * @param {OrganiqRequest} req request object
   * @returns {Promise|Boolean}
   */
  function finalHandlerDownstream(req) {
    var driver = drivers[req.deviceid];
    if (!driver) {
      throw new Error('Driver \'' + req.deviceid + '\' is not connected.');
    }
    return driver.dispatch(req);
  }

  /**
   * Handle a device-originated request after it has been processed by the
   * local container stack.
   *
   * The request will be forwarded to the gateway for notification of connected
   * clients.
   *
   * @param {OrganiqRequest} req request object
   * @returns {Promise|Boolean}
   */
  function finalHandlerUpstream(req) {
    if (gateway && gateway.connected) {
      gateway.dispatchFromDriver(req);
    }
    return true;
  }

  /**
   * Install a device driver to the local container.
   *
   * @param {String} deviceid
   * @param {Dispatcher|Dispatcher[]} driver
   * @returns {Dispatcher} the device object given
   */
  function install(deviceid, driver) {

    // Make sure we haven't already registered this deviceid.
    if (typeof drivers[deviceid] !== 'undefined') {
      return when.reject(new Error(
        'Install called for already installed deviceid: ' + deviceid));
    }

    var driverStack =  new RequestStack(finalDriverHandlerUpstream,
                                        finalDriverHandlerDownstream);
    driverStack.use(driver);
    drivers[deviceid] = driverStack;

    if (gateway && gateway.connected) {
      installWithGateway(deviceid);
    }
    return driver;
  }

  /**
   * Install a device driver with the gateway server.
   *
   * @param deviceid
   * @returns {Promise}
   */
  function installWithGateway(deviceid) {
    var req = new OrganiqRequest(deviceid, 'INSTALL');
    return gateway.dispatch(req).then(function() {
      debug('Driver installed with gateway: ' + deviceid);
    }, function(err) {
      debug('Failed to install driver ' + deviceid + ': ' + err);
    });
  }

  /**
   * Uninstall a device driver from the local container.
   *
   * @param {string} deviceid
   *
   */
  function uninstall(deviceid) {
    if (typeof drivers[deviceid] === 'undefined') {
      return when.reject(new Error(
        'uninstall of uninstalled device: ' + deviceid));
    }

    var driverStack = drivers[deviceid];
    delete drivers[deviceid];
    void(driverStack);  // cleanup somehow?

    if (gateway && gateway.connected) {
      var req = new OrganiqRequest(deviceid, 'UNINSTALL');
      return gateway.dispatch(req);
    }
    return when(true);
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
  LocalDriverContainer.prototype.attachGateway = function attachGateway(gateway_) {
    if (gateway) {
      throw new Error('Gateway already attached');
    }
    gateway = gateway_;

    gateway.on('connect', function() {
      debug('Gateway connected');
      for (var deviceid in drivers) {
        if (drivers.hasOwnProperty(deviceid)) {
          installWithGateway(deviceid);
        }
      }
    });
    gateway.on('disconnect', function() {
      debug('Gateway disconnnected');
      // nothing
    });
  };
}
util.inherits(LocalDriverContainer, EventEmitter);

