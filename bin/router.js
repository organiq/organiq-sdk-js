// Copyright (c) 2014 Myk Willis & Company, LLC. All Rights Reserved.
/*jshint node: true */
/*jshint -W069*/ // ['{a}'] is better written in dot notation
"use strict";
global.WAMPRT_TRACE = false;
var WampRouter = require('wamp.rt');
var net = require('net');
var fs = require('fs');
var path = require('path');

var DEFAULT_CONFIG_DIR = './config';

function DevRouter(options) {
  var configDir = options.configDir || DEFAULT_CONFIG_DIR;
  options.disableProtocolCheck = true;
  var wampRouter = new WampRouter(options);
  var client;

  if ( options.tsdbEnabled ) {
    client = new net.Socket();
    client.on('data', function(data) {
      console.log('Received: ' + data);
      // we should not receive anything but errors here
    });
    client.on('close', function() {
      console.log('tsdb connection closed.');
    });
    client.connect(options.tsdbPort, options.tsdbIp, function() {
      console.log('tsdb connected.');
    });
  }

  var _points = {};

  // Register a device with the system.
  function registerDevice(id, args) {
    var deviceId = args[1].device;
    var defaultConfig = args[1].config || {};
    var activeConfig = defaultConfig;

    // Look for existing configuration defined for this device.
    var configPath = path.join(configDir, deviceId+'.json');
    fs.readFile(configPath, function(err, data) {
      if (err) {
        // failed to find file - we will use default
        console.log('Failed to read configuration file ' + configPath);
        console.log(err);
      } else {
        // parse config file
        try {
          activeConfig = JSON.parse(data);
        } catch(e) {
          console.log('Failed to parse configuration file ' + configPath);
          console.log(e);
          // this is a configuration error; we will fallback to default,
          // but this should log an error of some kind.
        }
      }

      // resrpc(id, err, args) // args is [args, kwargs]
      wampRouter.resrpc(id, null, [activeConfig, {config: activeConfig}]);

    });
  }

  /* Expose implementation for unit tests */
  this.__testonly__ = {};
  this.__testonly__.registerDevice = registerDevice;
  this.__testonly__.wampRouter = wampRouter;


  wampRouter.regrpc('io.organiq.api.registerDevice', registerDevice);

  wampRouter.regrpc('io.organiq.api.recordPoints', function(id, args) {
    var deviceId = args[1].device;
    var points = args[1].points;

    if (_points[deviceId] === undefined) {
      _points[deviceId] = {};
    }
    for(var i=0;i<points.length;i++) {
      var point = points[i];
      var series = point.series;
      if (_points[deviceId][series] === undefined) {
        _points[deviceId][series] = [];
      }
      _points[deviceId][series].push(points[i]);

      // While OpenTSDB will accept either seconds or milliseconds, it does
      // not currently support querying of millisecond-based timestamps via
      // the web interface. So convert to seconds here.
      point.ts /= 1000;
      var line = 'put ';
      line += series + ' ';
      line += point.ts + ' ';
      line += point.value + ' ';
      line += 'deviceid=' + deviceId;
      line += '\n';

      console.log('PUT ' + line);
      if (options.tsdbEnabled) {
        client.write(line);
      }
    }

    // resrpc(id, err, args) // args is [args, kwargs]
    wampRouter.resrpc(id, null, []);
  });

  wampRouter.regrpc('io.organiq.api.getPoints', function(id, args) {
    var deviceId = args[1].device;
    var series = args[1].series;

    var points = [];
    if (_points[deviceId] && _points[deviceId][series] ) {
      points = _points[deviceId][series];
    }


    // http://ip:port/api/query?start=1h-ago&m=sum:temperature{deviceid=test-device-id-5}



    wampRouter.resrpc(id, null /* err*/, [points, {points:points}]);
  });

  this.close = function() {
    wampRouter.close();
  };
  return this;
}

module.exports = DevRouter;
