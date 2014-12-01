// Copyright (c) 2014 Myk Willis & Company, LLC. All Rights Reserved.
/*jslint node: true*/
var when = require('when');

// private DeviceProxy object. An instance of this object is returned
// by Organiq.getDevice. It is built such that it has methods as defined
// in the device schema.
//
// var proxy = organiq.getDevice();
// proxy.callMethod();
// proxy.sync(function() {
//  var someProp = proxy.propValue;
//  var anotherProp = proxy.anotherValue;
// });
//
// proxy.on('someEvent', function(ev) {
//  // process event
// })
//
function DeviceProxy(deviceId, schema) {
  this.deviceId = deviceId;
  this._schema = schema || { properties: {}, methods: {}, events: {} };
  this._cache = {};

  // build methods on the proxy object with names matching what's in schema.
  var methods = this._schema.methods;
  function makeMethod(method) {
    return function(args) {
      return this.connection.invoke(deviceId, method, args);
    };
  }
  for(var method in methods) {
    if (methods.hasOwnProperty(method)) {
      this[method] = makeMethod(method);
    }
  }

  // build getters for the properties
  var properties = this._schema.properties;
  function makeProperty(obj, property) {
    Object.defineProperty(obj, property, {
      get: function() { return obj._cache[property]; },
      enumerable: true
    });
  }
  for(var property in properties) {
    if (properties.hasOwnProperty(property)) {
      makeProperty(this, property);
    }
  }

  this.on = function(event, cb) {
    return this.connection.subscribe(deviceId, event, cb);
  };
  this.onSet = function(property, value) {
    this._cache[property] = value;
  };
  this.invoke = function(method, args) {
    return this.connection.invoke(deviceId, method, args);
  };
  this.get = function(property) {
    var self = this;
    return this.connection.get(deviceId, property).then(
      function(res) { self._cache[property] = res; return res; }
    );
  };
  this.sync = function() {
    // cheap hack to get all properties sync'd up
    var d = [];
    var properties = this._schema.properties;
    for(var property in properties) {
      if (properties.hasOwnProperty(property)) {
        d.push(this.get(property));
      }
    }
    var self = this;
    return when.all(d).then(function() { return self; });
  };

  this.getPoints = function(series) {
    return this.connection.getPoints(deviceId, series);
  };

  this.config = function(config) {
    return this.connection.config(deviceId, config);
  };
}


module.exports = DeviceProxy;
