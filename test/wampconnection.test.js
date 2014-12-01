/*jslint node: true*/
/*global describe, it, before, after, beforeEach, afterEach*/

// WAMPRT_TRACE = true;

var Router = require('../bin/router.js');
var WampConnection = require('../src/wampconnection.js');
var Device = require('../src/device.js');
var DeviceProxy = require('../src/deviceproxy.js');
var PointCollector = require('../src/point.js');
var when = require('when');

require('when/monitor/console');

var API_ROOT = 'http://localhost:1340';
var API_TOKEN = '';

var router;
var connection;

before(function(done) {
  console.log('before wampconnection.test.js');
  router = new Router({ port: 1340 });
  connection = new WampConnection(API_ROOT, API_TOKEN, function() {
    done();
  });
});
after(function(done) {
  console.log('after wampconnection.test.js');
  // this.connection.session.close();
  //this.wampRouter. how to close?
  router.close();
  done();
});

describe('WampConnection Basic Connectivity', function() {
  var testDeviceId = 'test-device-id-1';

  it('should connect successfully', function() {
    connection.should.be.ok;
  });
  it('should allow Device registration', function(done) {
    var device = new Device({});
    device.deviceId = testDeviceId;
    connection.registerDevice(device).then(
      function() { console.log('device registered.'); }
    ).then(
      function() {
        connection.unregisterDevice(device).then(
          function() { console.log('device unregistered.'); }
        );
      }
    ).then(done, done);
  });

  it('should allow DeviceProxy registration', function(done) {
    var proxy = new DeviceProxy(testDeviceId, {});
    connection.registerProxy(proxy).then(
      function(res) { },
      function(err) { should.fail(); }
    ).then(
      function(res) {
        connection.unregisterProxy(proxy).then(
          function(res) { },
          function(err) { should.fail(); }
        );
      },
      function(err) { should.fail(); }
    ).then(done.bind(null, null), done);
  });

  it('should return config from registerDevice', function(done) {
    var device = new Device({});
    var defaultConfig = { someval: 1234, anotherSetting: "hello" };
    device.deviceId = testDeviceId;
    connection.registerDevice(device, defaultConfig).then(
      function(config) {
        config.should.be.ok;
        config.should.equal.defaultConfig;
      }).then(
      function() {
        connection.unregisterDevice(device).then(
          function() { console.log('device unregistered.'); }
        );
      }
    ).then(done.bind(null, null), done);
  });
});

describe('WampConnection Proxy->Device', function() {
  var testDeviceId = 'test-device-id-2';

  beforeEach(function(done) {
    this.device = new Device({
      hello: function() { this.called = true; return 'world!';  },
      bonjour: 'tout le monde!',
      get hola() { return 'mundo!'; },
      events: ['test-event-1', 'test-event-2']
    });
    this.device.deviceId = testDeviceId;
    this.proxy = new DeviceProxy(testDeviceId, {});
    var d = [];
    d.push(connection.registerDevice(this.device));
    d.push(connection.registerProxy(this.proxy));
    when.all(d).then(done.bind(null, null), done);
  });
  afterEach(function(done) {
    var d = [];
    d.push(connection.unregisterDevice(this.device));
    d.push(connection.unregisterProxy(this.proxy));
    when.all(d).then(done.bind(null, null), done);
  });
  it('should let proxy invoke() device method', function(done) {
    this.proxy.invoke('hello', {}).then(
      function(res) { res.should.equal('world!'); done(); },
      function(err) { should.fail(); }
    );
  });
  it('should let proxy get() device property', function(done) {
    this.proxy.get('bonjour').then(
      function(res) { res.should.equal('tout le monde!'); done(); },
      function(err) { should.fail(); }
    );
  });
  it('should let proxy get() device getter property', function(done) {
    this.proxy.get('hola').then(
      function(res) { res.should.equal('mundo!'); done(); },
      function(err) { should.fail(); }
    );
  });
  it('should support events', function(done) {
    this.proxy.on('test-event-1', function(event, args) {
      args.should.be.ok;
      args.message.should.equal('event-args-here');
      done();
    });
    this.device.notify('test-event-1', {message: 'event-args-here'});
  });
});

describe('Callable proxy methods', function() {
  var testDeviceId = 'test-device-id-3';
  var device;
  var proxy;

  beforeEach(function(done) {
    device = new Device({
      hello: function() { return 'world!';  },
      bonjour: 'tout le monde!',
      get hola() { return 'mundo!'; },
      events: ['test-event-1', 'test-event-2']
    });
    device.deviceId = testDeviceId;
    proxy = new DeviceProxy(testDeviceId, device.schema);
    var d = [];
    d.push(connection.registerDevice(device));
    d.push(connection.registerProxy(proxy));
    when.all(d).then(done.bind(null, null), done);
  });
  afterEach(function(done) {
    var d = [];
    d.push(connection.unregisterDevice(device));
    d.push(connection.unregisterProxy(proxy));
    when.all(d).then(done.bind(null, null), done);
  });
  it('invoke() with proxy method', function(done) {
    proxy.hello().then(
      function(res) { res.should.equal('world!'); },
      function(err) { should.fail(); }
    ).then(done.bind(null, null), done);
  });
  it('get() with device property', function(done) {
    // hack it for now
    proxy.get('bonjour').then(
      function(res) { proxy.bonjour.should.equal('tout le monde!'); done(); },
      function(err) { should.fail(); }
    );
  });
  it('get() with device getter property', function(done) {
    proxy.get('hola').then(
      function(res) { proxy.hola.should.equal('mundo!'); done(); },
      function(err) { should.fail(); }
    );
  });
  it('sync() gets all device props', function(done) {
    proxy.sync().then(function() {
      proxy.bonjour.should.equal('tout le monde!');
      proxy.hola.should.equal('mundo!');
    }).then(function() {
      device.bonjour = 'univers!';
      //device.hola = 'universo!'; // BUGBUG: This is invalid - no setter!
    }).then(function() {
      return proxy.sync();
    }).then(function() {
      proxy.bonjour.should.equal('univers!');
      //proxy.hola.should.equal('universo!');
    }).then(done.bind(null, null), done);
  });
});


var when = require('when');

describe('Asynchronous Device methods', function() {
  var testDeviceId = 'test-device-id-4';
  var device;
  var proxy;

  beforeEach(function(done) {
    device = new Device({
      hello: function() { var d = when.defer(); d.resolve('world!'); return d.promise; },
      get hola() { var d = when.defer(); d.resolve('mundo!'); return d.promise; },
    });
    device.deviceId = testDeviceId;
    proxy = new DeviceProxy(testDeviceId, device.schema);
    var d = [];
    d.push(connection.registerDevice(device));
    d.push(connection.registerProxy(proxy));
    when.all(d).then(done.bind(null, null), done);
  });
  afterEach(function(done) {
    var d = [];
    d.push(connection.unregisterDevice(device));
    d.push(connection.unregisterProxy(proxy));
    when.all(d).then(done.bind(null, null), done);
  });
  it('schema should find async getter', function(done) {
    proxy.hello().then(
      function(res) { res.should.equal('world!'); },
      function(err) { should.fail(); }
    ).then(done.bind(null, null), done);
  });
  it('invoke() with async method', function(done) {
    proxy.hello().then(
      function(res) { res.should.equal('world!'); },
      function(err) { should.fail(); }
    ).then(done.bind(null, null), done);
  });
  it('get property with async method', function(done) {
    proxy.sync().then(
      function(res) { proxy.hola.should.equal('mundo!'); },
      function(err) { should.fail(); }
    ).then(done.bind(null, null), done);
  });
});



describe('Points-related methods', function() {
  var testDeviceId = 'test-device-id-5';
  var device;
  var proxy;

  beforeEach(function(done) {
    device = new Device({
      get temperature() { return 72; }
    });
    device.deviceId = testDeviceId;
    proxy = new DeviceProxy(testDeviceId, device.schema);
    var d = [];
    d.push(connection.registerDevice(device));
    d.push(connection.registerProxy(proxy));
    when.all(d).then(done.bind(null, null), done);
  });
  afterEach(function(done) {
    var d = [];
    d.push(connection.unregisterDevice(device));
    d.push(connection.unregisterProxy(proxy));
    when.all(d).then(done.bind(null, null), done);
  });
  it('should accept recordPoints', function(done) {
    var point = {
      value: 42,
      ts: Date.now(),
      series: 'Answers'
    };

    device.recordPoints(point).then(done.bind(null, null), function(err) {
      console.log('\n\n\n\n\n\n\n\n');
      console.log(err);
      console.log('\n\n\n\n\n\n\n\n');
      console.log(err);
      done(Error(err.toString()));
    });
  });
  it('should accept recordPoint as string', function(done) {
    var point = {
      value: 'a big number',
      ts: Date.now(),
      series: 'AQuestion'
    };

    device.recordPoints(point).then(done.bind(null, null), done);
  });
  it('should accept recordPoints as array', function(done) {
    var point = {
      value: [42, 75, 34],
      ts: Date.now(),
      series: 'SomeOtherSeries'
    };

    device.recordPoints(point).then(done.bind(null, null), done);
  });


  it('should accept array of points in recordPoints', function(done) {
    var points = [];
    for(var i=0;i<10;i++) {
      var point = {
        value: 42,
        ts: Date.now(),
        series: 'Answers'
      };
      points.push(point);
    }
    device.recordPoints(points).then(done.bind(null, null), done);
  });


  it('should register sent point', function(done) {
    // start generating data 10 times a second
    var pc = new PointCollector(device, 'temperature', {
      sampleInterval: 100
    });
    // after a second, query the server for all points
    setTimeout(function() {
      proxy.getPoints('temperature').then(function(res) {
        var points = res.kwargs.points;
        points.length.should.be.greaterThan(7);
        for(var i=0;i<points.length;i++) {
          var point = points[i];
          var ts = point.ts;
          var value = point.value;

          value.should.equal(72);

          console.log(ts + ': ' + value);
        }
        done();
      }, done);
    }, 1000);
  });
});
