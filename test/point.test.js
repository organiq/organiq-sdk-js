/*jslint node: true*/
/*global describe, it, before, after, beforeEach, afterEach*/
var Device = require('../src/device.js');
var PointCollector = require('../src/point.js');

describe('PointCollector', function() {
  it('should call getter at specified interval', function(done) {
    var getCount = 0;
    var recordPointCount = 0;
    var device = new Device({
      get temperature() { getCount++; return 68 + (Math.random() * 10); }
    });
    device.recordPoints = function() { recordPointCount++; };  // stub it out

    var collector = new PointCollector(device, 'temperature', {
      sampleInterval: 100
    });

    setTimeout(function() {
      collector.stop();
      recordPointCount.should.be.greaterThan(8);
      done();
    }, 1000);
  });

});

