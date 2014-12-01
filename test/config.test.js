/*jslint node: true */
/*global describe, it, before, after, beforeEach, afterEach*/
var Router = require('../bin/router.js');
var WampConnection = require('../src/wampconnection.js');
var Device = require('../src/device.js');
var DeviceProxy = require('../src/deviceproxy.js');
var when = require('when');
var sinon = require('sinon');
var fs = require('fs');
var path = require('path');

var router;
var connection;

before(function(done) {
  console.log('before config.test.js');
  router = new Router({ port: 1341 });
  connection = new WampConnection('http://localhost:1341', '', function() {
    done();
  });
});
after(function(done) {
  console.log('after config.test.js');
  router.close(); // this seems to happen asyncronously, but there is no cb
  done();
});

describe('Configuration Functions', function() {
  var testDeviceId = 'test-device-id-1';
  var device;
  var proxy;

  beforeEach(function(done) {
    device = new Device({
      get someValue() { return 1.0; },
      get someValue2() { return 1.0; },
    });
    device.deviceId = testDeviceId;
    // mock out the .config() method
    device.config = sinon.spy();
    proxy = new DeviceProxy(testDeviceId, {});
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


  it('sets collector for a defined property', function(done) {
    var config = {
      collectors: [{property:'someValue', sampleInterval:1000}]
    };
    proxy.config(config).then(function() {
      device.config.calledOnce.should.be.true;
      device.config.calledWith(config).should.be.true;
      done();
    }, done);
  });

  it('sets collectors for multiple defined properties', function(done) {
    var config = {
      collectors: [{property:'someValue', sampleInterval:1000},
                   {property:'someValue2', sampleInterval:1000}]
    };
    proxy.config(config).then(function() {
      device.config.calledOnce.should.be.true;
      device.config.calledWith(config).should.be.true;
      done();
    }, done);
  });

  it('fails to set collectors for undefined properties', function() {
  });
});

describe('Configuration During Registration', function() {
  var testDeviceId = 'test-device-id-2';
  var testDefaultConfig = { collectors: [
    { property: 'p1', sampleInterval: 4333 }
    ]};
  var stub_resrpc;
  var promisedResrpc;

  beforeEach(function() {
    console.log('before');
    var d = when.defer();
    promisedResrpc = d.promise;
    stub_resrpc = sinon.stub(router.__testonly__.wampRouter, 'resrpc',
      function() { d.resolve(); });
  });
  afterEach(function() {
    console.log('after');
    stub_resrpc.restore();
  });


  it('uses default configuration supplied by device', function(done) {
    var registerDevice = router.__testonly__.registerDevice;

    registerDevice(123, [null, {device:testDeviceId, config:testDefaultConfig}]);
    promisedResrpc.then(function() {
      stub_resrpc.calledWith(123, null,
        [testDefaultConfig, {config: testDefaultConfig}]).should.be.true;
      done();
    }, done);
  });

  it('overrides device-supplied configuration with server config', function(done) {
    var registerDevice = router.__testonly__.registerDevice;
    var overrideConfig = {
      someval: [0, 1, 2]
    };
    var stub = sinon.stub(fs, 'readFile', function(path, cb) {
      console.log('readFile called with: ' + path);
      cb(null, JSON.stringify(overrideConfig));
    });

    registerDevice(123, [null, {device:testDeviceId, config:testDefaultConfig}]);
    promisedResrpc.then(function() {
      stub_resrpc.calledWith(123, null, [overrideConfig, {config: overrideConfig}]).should.be.true;
      stub.calledWith(path.join('./config', testDeviceId+'.json')).should.be.true;
      done();
    }, done);
    stub.restore();
  });

});

