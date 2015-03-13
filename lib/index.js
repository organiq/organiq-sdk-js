/**
 * Organiq Application and Device SDK.
 *
 * Provides interfaces for obtaining proxies for remote Organiq objects, and
 * implements a local device container for hosting devices.
 *
 */
var organiq = require('organiq-core');
var WebSocket = require('./websocket');
var when = require('when');
var fs = require('fs');
require('when/monitor/console');
var debug = require('debug')('sdk');

var Proxy_ = require('./proxy');
var Device = require('./device');
var Schema = require('./schema');


module.exports = OrganiqContainer;
module.exports.Device = Device;
module.exports.Proxy = Proxy_;
module.exports.Schema = Schema;


var DEFAULT_APIROOT = 'ws://api.organiq.io';
var DEFAULT_APITOKEN = '';
var DEFAULT_OPTIONS_PATH = './organiq.json';


/**
 * Create Organiq Device Container.
 *
 * The values used for API root and API token can be specified in any of the
 * following places:
 *  (1) Organiq constructor
 *  (2) organiq.json in the current working directory
 *  (3) ORGANIQ_APIROOT and ORGANIQ_APITOKEN environment variables
 *
 * If values are not found in any of these places, defaults are used.
 *
 * @param {Object} options Configuration options.
 * @param {String=} options.apiRoot The URI of the gateway server endpoint to which we
 *  should connect.
 * @param {String=} options.apiToken The authentication token to use with the gateway.
 * @param {String=} options.optionsPath Defaults to './organiq.json'
 * @param {Boolean=} options.autoConnect Defaults to true.
 * @param {Boolean=} options.strictSchema Defaults to false.
 *
 * @constructor
 */
function OrganiqContainer(options) {
  if (!(this instanceof OrganiqContainer)) {
    return new OrganiqContainer(options);
  }

  options = options || {};
  var apiRoot = options.apiRoot;
  var apiToken = options.apiToken;
  var optionsPath = options.optionsPath || DEFAULT_OPTIONS_PATH;
  var autoConnect = options.autoConnect !== false;  // true if not given false
  var strictSchema = options.strictSchema || false; // false if not given true

  var deferredConnection = when.defer();
  var connection$ = deferredConnection.promise;

  // If we weren't given apiRoot and apiToken, look first in organiq.json.
  // Note that the special checks for fs.existsSync are necessary for this code
  // to work in a web browser environment (where it will not be defined).

  if (!apiRoot || !apiToken) {
    if (fs && fs.existsSync !== undefined && fs.existsSync(optionsPath)) {
      var s = fs.readFileSync(optionsPath, 'utf8');
      var config = JSON.parse(s);
      apiToken = config['token'];
      apiRoot = config['apiRoot'];
    }
  }

  apiRoot = apiRoot || process.env['ORGANIQ_APIROOT'] || DEFAULT_APIROOT;
  apiToken = apiToken || process.env['ORGANIQ_APITOKEN'] || DEFAULT_APITOKEN;


  // Create the local node.
  var core = new organiq();

  if (autoConnect) {
    connect(apiRoot, apiToken);
  }

  /**
   * Connect to an Organiq Gateway Server.
   *
   * Normally called automatically in the constructor.
   *
   * @param {String=} overrideApiRoot
   * @param {String=} overrideApiToken
   * @returns {Promise}
   */
  function connect(overrideApiRoot, overrideApiToken) {
    apiRoot = overrideApiRoot || apiRoot;
    apiToken = overrideApiToken || apiToken;


    // Listen for the 'gatewayRegistered' event from the local
    // node so that we can signal to the caller that
    // connection is complete.
    core.on('gatewayRegistered', function() {
      deferredConnection.resolve();
    });

    // Create a new websocket (client) connection, configuring it as a gateway
    // for the local organiq instance.
    var ws = new WebSocket(apiRoot);
    ws.on('open', core.websocketApi({ gateway:true }));

    return deferredConnection.promise;
  }

  /**
   * Register a local device object with the system.
   *
   * If `strictSchema` is enabled in options, a schema object must be provided
   * that specifies the properties, methods, and events exposed by the device
   * being registered. If `strictSchema` is not enabled, then the schema object
   * is optional. If omitted in this case, a schema will be automatically
   * created by inspecting the given `impl` object.
   *
   * @param {String} deviceid
   * @param {Object} impl Native implementation object
   * @param {Object} [schema] optional schema for interface
   * @returns {DeviceWrapper|*}
   */
  this.registerDevice = function(deviceid, impl, schema) {
    if (strictSchema && !schema) {
      throw new Error('Schema is required when `strictSchema` enabled');
    }
    var device = new Device(impl, schema, { strictSchema: strictSchema });
    return core.register(deviceid, device);
  };


  /**
   * Get a reference to a remote device.
   *
   * @param deviceId
   * @return {ProxyWrapper|Promise}
   */
  this.getDevice = function(deviceId) {
    var proxy = null;

    debug('getDevice(deviceId='+deviceId+')');

    // First, wait for the gateway connection to be established
    return connection$.then(function() {
      // Issue the core connect() request to get a core device proxy
      debug('getDevice connection established.');
      return core.connect(deviceId);
    }).then(function(proxy_) {
      // Query the device for its schema
      debug('getDevice received native device proxy.');
      proxy = proxy_;
      return proxy.describe('schema');
    }).then(function(schema) {
      // Create the proxy wrapper object for the caller
      debug('getDevice received device schema.');
      return new Proxy_(schema, proxy);
    }).catch(function(err) {
      console.log('getDevice error: '+err);
    });
  };
}


/**
 * Factory for a singleton OrganiqContainer object.
 *
 * It is common for the module client to want to use a single instance of
 * OrganiqContainer with default connection settings. This factory (together
 * with the class functions below) allows the constructor function exported by
 * this module to be used directly in this case, obviating the need for the
 * caller to manually create an instance.
 *
 * // verbose (normal) flow:
 * var organiq = require('organiq');
 * var options = { ... }
 * organiq = organiq(options);  // create instance with optional options
 * organiq.register(...);       // call via instance
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
  return { get: function() { if (!o) { o = new OrganiqContainer(); } return o; } };
})();

/**
 * Calls `connect` of singleton object.
 *
 * @return {LocalDeviceProxy|Promise|WebSocketDeviceProxy|*|Connection}
 */
//OrganiqContainer.connect = function() {
//  var s = Singleton.get();
//  return s.connect.apply(s, arguments);
//};

/**
 * Calls `registerDevice` of singleton object.
 *
 * @return {LocalDeviceProxy|Promise|WebSocketDeviceProxy|*|Connection}
 */
OrganiqContainer.registerDevice = function() {
  var s = Singleton.get();
  return s.registerDevice.apply(s, arguments);
};

/**
 * Calls `getDevice` of singleton object.
 *
 * @return {LocalDeviceProxy|Promise|WebSocketDeviceProxy|*|Connection}
 */
OrganiqContainer.getDevice = function() {
  var s = Singleton.get();
  return s.getDevice.apply(s, arguments);
};
