/*jslint node: true*/
/*global describe, it, before, after, beforeEach, afterEach*/

var Device = require('../src/device.js');

describe('Device constructor', function() {
  beforeEach(function(done) {
    done();
  });

  it('should exist', function() {
    Device.should.be.ok;
  });

  it('should throw if no arguments provided', function() {
    (function() {
      var device = new Device();
    }).should.throw();
  });

  it('should throw if invoked without `new`', function() {
    (function() {
      var device = Device(); // note: `new` omitted
    }).should.throw();
  });

  it('should support omitted schema', function() {
    var device = new Device({ test: 'present' });  // implementation
    device.should.have.property('test');
  });

  it('should inherit properties', function() {
    var impl = {
      num1: 1,
      num2: 1.1,
      str1: "hello",
      bool1: false,
      bool2: true
    };
    var device = new Device(impl);

    device.should.have.properties('num1', 'num2', 'str1', 'bool1', 'bool2');
  });

  it('should inherit methods', function() {
    var impl = {
      hello: function() { return 'world'; }
    };
    var device = new Device(impl);

    device.should.have.property('hello');
    device.hello().should.equal('world');
  });

  it('should not allow redefinition of Device props or methods', function() {
    var d = new Device({});
    var threw;
    for (var p in d) {
      threw = false;
      try  { new Device({}[p] = 'value'); }
      catch(Error) { threw = true; }
      threw.should.be.true;
    }
  });

  it('should be sane', function() {
    var d = new Device({
      prop: 'value',
      meth1: function(a) { this.someprop = a; },
      meth2: function(a) { return this.someprop; },
    });

    d.prop.should.equal('value');
    d.meth1('blahblah');
    d.meth2().should.equal('blahblah');
  })
});

describe('Device subclassing with define()', function() {
  it('should return constructor', function() {
    var MyDevice = Device.define({});
    MyDevice.prototype.should.be.ok;
    MyDevice.prototype.should.have.properties(
      'get', 'set', 'invoke', 'on', 'notify');
  });

  it('should return proper subclass of Device', function() {
    var MyDevice = Device.define({});
    var device = new MyDevice();
    device.should.be.instanceof(Device);
  });

  it('should have impl properties in prototype', function() {
    var MyDevice = Device.define({ c1: 's', c2: 1, c3: false });
    MyDevice.prototype.should.have.properties('c1', 'c2', 'c3');
   });
});

