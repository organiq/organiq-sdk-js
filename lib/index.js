/**
 * Organiq Application and Device SDK.
 *
 * Provides interfaces for obtaining proxies for remote Organiq objects, and
 * implements a local device container for hosting devices.
 *
 */
var DeviceContainer = require('./deviceContainer');
var ClientContainer = require('./clientContainer');
var DriverContainer = require('./driverContainer');
var WebSocket = require('./websocket');
var WebSocketTransport = require('./webSocketTransport');
var when = require('when');
var fs = require('fs');
require('when/monitor/console');
var debug = require('debug')('organiq:sdk');
var ConfigApi = require('./api');

var Proxy_ = require('./proxyWrapper');
var Device = require('./deviceWrapper');
var Schema = require('./schema');


module.exports = Organiq;
module.exports.Device = Device;
module.exports.Proxy = Proxy_;
module.exports.Schema = Schema;


var DEFAULT_APIROOT = 'https://api.organiq.io';
var DEFAULT_DPIROOT = 'wss://dpi.organiq.io';
var DEFAULT_APIKEY_ID = '';
var DEFAULT_APIKEY_SECRET = '';
var DEFAULT_OPTIONS_PATH = './organiq.json';


/**
 * Create Organiq Device Container.
 *
 * The values used for API root and API key can be specified in any of the
 * following places:
 *  (1) Organiq constructor
 *  (2) organiq.json in the current working directory
 *  (3) ORGANIQ_DPIROOT, ORGANIQ_APIKEY_ID, and ORGANIQ_APIKEY_SECRET
 *    environment variables
 *
 * If values are not found in any of these places, defaults are used.
 *
 * @param {Object} options Configuration options.
 * @param {String=} options.apiRoot The URI of the gateway server endpoint to which we
 *  should connect.
 * @param {String=} options.apiKeyId The api key id to use with the gateway.
 * @param {String=} options.apiKeySecret The api key secret to use with the gateway.
 * @param {String=} options.optionsPath Defaults to './organiq.json'
 * @param {Boolean=} options.autoConnect Defaults to true.
 * @param {Boolean=} options.strictSchema Defaults to false.
 * @param {Function=} options.applyFn Function to use as wrapper for operations
 *  that change device proxy state asynchronously. Allows, e.g., Angular's
 *  $scope.$apply to be applied when state is changed in response to async event.
 *
 * @constructor
 */
function Organiq(options) {
  if (!(this instanceof Organiq)) {
    return new Organiq(options);
  }

  options = options || {};
  var apiRoot = options.apiRoot;
  var dpiRoot = options.dpiRoot;
  var apiKeyId = options.apiKeyId;
  var apiKeySecret = options.apiKeySecret;
  var optionsPath = options.optionsPath || DEFAULT_OPTIONS_PATH;
  //var autoConnect = options.autoConnect !== false;  // true if not given false
  var strictSchema = options.strictSchema || false; // false if not given true

  var activatedDevices = options.devices || {};  // alias -> { deviceid, token }

  // If we weren't given all configurable parameters, look in organiq.json.
  // Note that the special checks for fs.existsSync are necessary for this code
  // to work in a web browser environment (where it will not be defined).

  if (!apiRoot || !apiKeyId || !apiKeySecret) {
    if (fs && fs.existsSync !== undefined && fs.existsSync(optionsPath)) {
      var s = fs.readFileSync(optionsPath, 'utf8');
      var config = JSON.parse(s);
      apiKeyId = apiKeyId || config['apiKeyId'];
      apiKeySecret = apiKeySecret || config['apiKeySecret'];
      apiRoot = apiRoot || config['apiRoot'];
      dpiRoot = dpiRoot || config['dpiRoot'];
    }
  }

  apiRoot = apiRoot || process.env['ORGANIQ_APIROOT'] || DEFAULT_APIROOT;
  dpiRoot = dpiRoot || process.env['ORGANIQ_DPIROOT'] || DEFAULT_DPIROOT;
  apiKeyId = apiKeyId || process.env['ORGANIQ_APIKEY_ID'] || DEFAULT_APIKEY_ID;
  apiKeySecret = apiKeySecret || process.env['ORGANIQ_APIKEY_SECRET'] || DEFAULT_APIKEY_SECRET;

  debug('Connecting to ' + dpiRoot + ' with apiKeyId ' + apiKeyId);

  // Create a device container and client node, and connect them to the gateway
  // via the WebSocketTransport.
  var adminApi = new ConfigApi(apiRoot, { username: apiKeyId, password: apiKeySecret });
  var container = new DeviceContainer();
  var client = new ClientContainer();
  var driverContainer = new DriverContainer();
  var gateway = new WebSocketTransport(container, client, driverContainer);

  client.attachGateway(gateway);
  container.attachGateway(gateway);
  driverContainer.attachGateway(gateway);

  var authorization = 'Basic ' +
    new Buffer(apiKeyId + ':' + apiKeySecret).toString('base64');

  var reconnectInterval = 30 * 1000;  // 30 sec
  function connect() {
    debug('Connecting to gateway server.');
    var ws = new WebSocket(dpiRoot, null,
      { headers: {'Authorization': authorization} });
    ws.on('open', gateway.connectionHandler);
    ws.on('error', function (e) {
      debug('Failed to connect container to gateway server: ' + e);
      if (e.errno && e.errno === 'ECONNREFUSED') {
        setTimeout(connect, reconnectInterval);
      } else {
        throw e;
      }
    });
    ws.on('close', function() {
      debug('Websocket connection was closed. Retrying after interval.');
      setTimeout(connect, reconnectInterval);
    });
  }
  connect();


  /**
   * Register a local device object with the system.
   *
   * If `strictSchema` is enabled in options, a schema object must be provided
   * that specifies the properties, methods, and events exposed by the device
   * being registered. If `strictSchema` is not enabled, then the schema object
   * is optional. If omitted in this case, a schema will be automatically
   * created by inspecting the given `impl` object.
   *
   * @param {String} alias
   * @param {Object} impl Native implementation object
   * @param {Object} [schema] optional schema for interface
   * @returns {Device}
   */
  this.registerDevice = function (alias, impl, schema) {
    if (strictSchema && !schema) {
      throw new Error('Schema is required when `strictSchema` enabled');
    }

    var device = new Device(impl, schema, {strictSchema: strictSchema});

    // If a token is provided, the device is already activated.
    var activationInfo = activatedDevices[alias];
    var deviceid = activationInfo ? activationInfo.deviceid : null;
    var token = activationInfo ? activationInfo.token : null;
    if (deviceid && token) {
      debug('Registering \'' + alias + '\' with deviceid: ' + deviceid);
      return container.register(deviceid, device/*, options.token */);
    }

    // The device is not activated (or at least we don't have an activation
    // token). Attempt to activate it. This will succeed if either:
    // (1) our API key is a valid activation key, and `alias` is a valid
    //     serial number for this product type, or
    // (2) our API key has autoprovisioning privileges, in which case a new
    //     product will be created and the device activated against it.
    debug('Activating \'' + alias + '\' with deviceid: ' + deviceid);
    return container.activate(alias).then(function(deviceid, token) {
      // save the deviceid and token...
      activatedDevices[alias] = { deviceid: deviceid, token: token };
      return container.register(deviceid, device, token);
    });
  };


  this.activateAlias = function(alias) {
    // If a token is provided, the device is already activated.
    var activationInfo = activatedDevices[alias];
    var deviceid = activationInfo ? activationInfo.deviceid : null;
    var token = activationInfo ? activationInfo.token : null;
    if (deviceid && token) {
      return when(deviceid);
    }

    // The device is not activated (or at least we don't have an activation
    // token). Attempt to activate it. This will succeed if either:
    // (1) our API key is a valid activation key, and `alias` is a valid
    //     serial number for this product type, or
    // (2) our API key has autoprovisioning privileges, in which case a new
    //     product will be created and the device activated against it.
    debug('Activating \'' + alias + '\'');
    return container.activate(alias).then(function(deviceid, token) {
      // save the deviceid and token...
      activatedDevices[alias] = { deviceid: deviceid, token: token };
      return deviceid;
    });
  };

  /**
   * Get a reference to a remote device.
   *
   * @param alias
   * @return {ProxyWrapper|Promise} Promise for a proxy object
   */
  this.getDevice = function(alias) {
    var proxy = null;

    var d$ = adminApi.getDeviceIdByAlias(alias);
    return d$.then(function(deviceid) {
      return client.connect(deviceid)
        .then(function(proxy_) {
          // Query the device for its schema
          debug('getDevice received native device proxy.');
          proxy = proxy_;
          return proxy.describe('.schema');
        }).then(function(schema) {
          // Create the proxy wrapper object for the caller
          debug('getDevice received device schema.');
          return new Proxy_(schema, proxy, options.applyFn);
        }).catch(function(err) {
          debug('getDevice error: ', err);
          throw err;
        });
    });
  };

  /**
   * Get a reference to a remote device.
   *
   * @param {String} deviceid
   * @param {Object} options
   * @return {Promise<RemoteDeviceProxy>} Promise for a proxy object
   */

  this.getDeviceById = function(deviceid, options) {
    options = options || {};
    var useWrapper = !!options.proxyWrapper;

    if (useWrapper) {
      throw Error('not yet supported');
    }

    return client.connect(deviceid);
  };

  /**
   * Register a device driver.
   *
   * @param {String} alias
   * @param {Function} handler
   * @return {*}
   */
  this.installDriver = function(alias, handler) {
    return this.activateAlias(alias).then(function() {
      return adminApi.getDeviceIdByAlias(alias);
    }).then(function(deviceid) {
      return driverContainer.install(deviceid, handler);
    });
  };
}



/**
 * Factory for a singleton Organiq object.
 *
 * It is common for the module client to want to use a single instance of
 * Organiq with default connection settings (or settings configured in the
 * environment or config file). This factory, together with the class functions
 * below, allows the constructor function exported by this module to be used
 * directly in this case, obviating the need for the caller to manually create
 * an instance.
 *
 * // verbose (normal) flow:
 * var organiq = require('organiq');
 * var options = { ... }
 * var app = organiq(options);  // create instance with optional options
 * app.register(...);           // call via instance
 *
 * // using singleton pattern
 * var organiq = require('organiq');
 * organiq.register();  // implicitly create singleton and call through it
 * // ...
 * organiq.getDevice(); // calls through same singleton object
 *
 */
var Singleton = (function () {
  var o;
  return { get: function() { if (!o) { o = new Organiq(); } return o; } };
})();

/**
 * Calls `registerDevice` of singleton object.
 *
 * @return {LocalDeviceProxy|Promise|WebSocketDeviceProxy|*|Connection}
 */
Organiq.registerDevice = function() {
  var s = Singleton.get();
  return s.registerDevice.apply(s, arguments);
};

/**
 * Calls `getDevice` of singleton object.
 *
 * @return {LocalDeviceProxy|Promise|WebSocketDeviceProxy|*|Connection}
 */
Organiq.getDevice = function() {
  var s = Singleton.get();
  return s.getDevice.apply(s, arguments);
};

/**
 * Calls `getDeviceById` of singleton object.
 *
 * @return {Promise<RemoteDeviceProxy>}
 */
Organiq.getDeviceById = function() {
  var s = Singleton.get();
  return s.getDeviceById.apply(s, arguments);
};

/**
 * Calls `installDriver` of singleton object.
 *
 * @return {*}
 */
Organiq.installDriver = function() {
  var s = Singleton.get();
  return s.installDriver.apply(s, arguments);
};
