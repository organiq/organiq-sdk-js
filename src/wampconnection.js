// Copyright (c) 2014 Myk Willis & Company, LLC. All Rights Reserved.
/*jslint node: true*/
var autobahn = require('wamp-tessel');
var when = require('when');

// Device.set()
// Device.notify()
// Device.onGet()
// Device.onInvoke()
//
// Proxy.get()
// Proxy.onNotify()
// Proxy.onSet()
// Proxy.invoke()
//
// Connection.set(device, property, value)
// Connection.notify(device, event, args)
// Connection.onGet(device, property)
// Connection.onInvoke(device, method, args)
// Connection.get(device, property)
// Connection.onNotify(device, event, args)
// Connection.onSet(device, property, value)
// Connection.invoke(device, method, args)
function Connection(apiRoot, apiToken, cb)  {
  this.apiRoot = apiRoot;
  this.apiToken = apiToken;
  this.session = null;

  this.connection = new autobahn.Connection({
    url: this.apiRoot.replace('http', 'ws'),
    // protocols: ['wamp.2.json'],
    protocols: null,
    realm: 'organiq'
  });

  var self = this;
  this.connection.onopen = function(session) {
    console.log('session connected');
    self.session = session;
    cb(session);
  };

  this.connection.open();
}


// When a device is registered, it has its `invoke` and `get` methods
// registered with the server. The device object can then call
// `set` and `notify` on the connection to indicate state changes and
// event firings, respectively.
Connection.prototype.registerDevice = function(device, defaultConfig_) {
  var self = this;
  var defaultConfig = defaultConfig_ || {};
  var d = [];

  var invoke = device.deviceId + ".invoke";
  d.push(this.session.register(invoke, function(args, kwargs) {
    var method = kwargs.method;
    var params = kwargs.params;
    return device.invoke(method, params);
  }).then(
    function(res) { device._registrations.push(res); return res; },
    function(err) { console.log('failed to register .invoke.'); return err; }
  ));

  var get = device.deviceId + ".get";
  d.push(this.session.register(get, function(args, kwargs) {
    return device.get(kwargs.property);
  }).then(
    function(res) { device._registrations.push(res); return res; },
    function(err) { console.log('failed to register .get.'); return err; }
  ));

  var config = device.deviceId + ".config";
  d.push(this.session.register(config, function(args, kwargs) {
    return device.config(kwargs.config);
  }).then(
    function(res) { device._registrations.push(res); return res; },
    function(err) { console.log('failed to register .config.'); return err; }
  ));

  var register = "io.organiq.api.registerDevice";
  var args = { device: device.deviceId, config: defaultConfig };
  d.push(this.session.call(register, [], args).then(
    function(res) { return res; },
    function(err) { console.log('failed to registerDevice'); return err; }
  ));

  return when.all(d).then(
    function(res) { device.connection = self; return res[3]; }, // config
    function(err) { console.log('failed to register device.'); return err; }
  );
};

Connection.prototype.unregisterDevice = function(device) {
  var d = [];
  for(var i = 0; i < device._registrations.length; i++) {
    d.push(this.session.unregister(device._registrations[i]));
  }

  device._registrations = {};

  return when.all(d);
};

Connection.prototype.set = function(deviceId, property, value) {
  var topic = deviceId + '.__set';
  var args = { property: property, value: value };
  return this.session.publish(topic, [], args);
};

Connection.prototype.notify = function(deviceId, event, args) {
  var topic = deviceId + '.' + event;
  return this.session.publish(topic, [], args);
};


// When a proxy is registered, its `set` method is registered as an event
// handler for the associated device's __set event.  The proxy can call
// `get`, `subscribe`, or `invoke`.
Connection.prototype.registerProxy = function(proxy) {
  var self = this;
  var topic = proxy.deviceId + '.__set';
  return this.session.subscribe(topic, function(args, kwargs) {
    var property = kwargs.property;
    var value = kwargs.value;
    proxy.onSet(property, value);
  }).then(
    function(res) { proxy.subscription = res; proxy.connection = self; return proxy; }
    //function(err) { return err; }
  );
};
Connection.prototype.unregisterProxy = function(proxy) {
  return this.session.unsubscribe(proxy.subscription).then(
    function(res) { proxy.subscription = null; return res; }
    //function(err) { return err; }
  );
};


Connection.prototype.get = function(deviceId, property) {
  var get = deviceId + ".get";
  var args = { property: property };
  return this.session.call(get, [], args).then(
    // function (res) { return res; },
    // function (err) { return err; }
  );
};

Connection.prototype.subscribe = function(deviceId, event, cb) {
  var topic = deviceId + '.' + event;
  return this.session.subscribe(topic, function(args, kwargs) {
    cb(event, kwargs);
  }).then(
    // function(res) { return res; },
    // function(err) { return err; }
  );
};

Connection.prototype.invoke = function(deviceId, method, args) {
  var invoke = deviceId + ".invoke";
  var iargs = { method: method, params: args };
  return this.session.call(invoke, [], iargs).then(
    // function (res) { return res; },
    // function (err) { return err; }
  );
};

Connection.prototype.recordPoints = function(deviceId, points) {
  var recordPoints = "io.organiq.api.recordPoints";
  if (!Array.isArray(points)) {
    points = [points];
  }
  var iargs = { device: deviceId, points: points };
  return this.session.call(recordPoints, [], iargs);
};

Connection.prototype.getPoints = function(deviceId, series) {
  var getPoints = "io.organiq.api.getPoints";
  var iargs = { device: deviceId, series: series };
  return this.session.call(getPoints, [], iargs);
};

Connection.prototype.config = function(deviceId, config_) {
  var config = deviceId + ".config";
  var iargs = { config: config_ };
  return this.session.call(config, [], iargs);
};

module.exports = Connection;
