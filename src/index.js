// Copyright (c) 2014 Myk Willis & Company, LLC. All Rights Reserved.
/*jslint node: true*/
/*jshint -W069*/ // ['{a}'] is better written in dot notation
global.AUTOBAHN_DEBUG = true;

var DeviceProxy = require('./deviceproxy');
var Device = require('./device');
var Schema = require('./schema');
var fs = require('fs');
var WampConnection = require('./wampconnection');

var when = require('when');

var _devices = {};
var _connection = null;

var apiRoot = process.env.ORGANIQ_APIROOT || 'http://api.organiq.io';
var apiToken = '';
var optionsPath = './organiq.json';
// browser won't have fs.existsSync
if (fs && fs.existsSync !== undefined && fs.existsSync(optionsPath)) {
  var s = fs.readFileSync(optionsPath, 'utf8');
  var config = JSON.parse(s);
  apiToken = config['token'];
  apiRoot = config['apiRoot'];
}

var _connection$;
function Organiq() {
  var d = when.defer();
  _connection = new WampConnection(apiRoot, apiToken, function() {
    d.resolve(_connection);
  });
  _connection$ = d.promise;
}

function _registerDevice_connectionPending(deviceId, impl) {
  console.log('registerDevice: connect pending...');
  return _connection$.then(function() {
    console.log('registerDevice: connected.');
    Organiq.prototype.registerDevice = registerDevice;
    return registerDevice(deviceId, impl);
  });
}

function _getDevice_connectionPending(deviceId) {
  console.log('getDevice: connect pending...');
  return _connection$.then(function() {
    console.log('getDevice: connected.');
    Organiq.prototype.getDevice = getDevice;
    return getDevice(deviceId);
  });
}

// function _updateDeviceConfig_connectionPending(deviceId) {
//   return _connection$.then(function() {
//     Organiq.prototype.updateDeviceConfig = updateDeviceConfig;
//     return updateDeviceConfig(deviceId);
//   });
// }

function registerDevice(deviceId, impl) {
  var device = new Device(impl);
  device.deviceId = deviceId;
  _devices[device.deviceId] = device;
  _connection.registerDevice(device).then(function(config) {
    // configure the device as per server's definition
    device.config(config);
    return device;
  });
}

function getDevice(deviceId) {
  return _connection.get(deviceId, '__schema')
    .then(function(schema) {
      var deviceProxy = new DeviceProxy(deviceId, schema);
      return _connection.registerProxy(deviceProxy);
    })
    .then(null, function(err) {
      console.log("Failed to find device " + deviceId);
      return err;
    });
}

// function updateDeviceConfig(deviceId, config) {
//   return _connection.updateDeviceConfig(deviceId, config);
// }

Organiq.prototype.registerDevice = _registerDevice_connectionPending;
Organiq.prototype.getDevice = _getDevice_connectionPending;
// Organiq.prototype.updateDeviceConfig = _updateDeviceConfig_connectionPending;

Organiq.Device = Device;
Organiq.DeviceProxy = DeviceProxy;
Organiq.Schema = Schema;
module.exports = new Organiq();
