// Copyright (c) 2014 Myk Willis & Company, LLC. All Rights Reserved.
/*jshint node:true*/
// `Points` are timestamped values associated with a specific device
// and a named series. In the simplest case, the series name is the name
// of a device property from which the data is acquired. There may,
// however, be any number of series associated wiht a device, each with
// a unique series name.

var DEFAULT_SAMPLE_INTERVAL = 60*1000;

// PointManager manages the points associated with a local device.
// It is expected that the PointManager will be configured by the device
// configuration, and will automatically record points at the
// configured interval.
// This class is not intended to be used directly by application code.
function PointCollector(device, property, options) {
  var _property = property;
  var _sampleInterval = options.sampleInterval || DEFAULT_SAMPLE_INTERVAL;
  var _bufferSize = options.bufferSize || 0;
  var _buffer = [];

  this.timerId = setInterval(function() {
    var point = {
      value: device[_property],
      ts: Date.now(),
      series: _property
    };
    if (_bufferSize) {
      _buffer.push(point);
      if ( _buffer.length >= _bufferSize ) {
        device.recordPoints(_buffer);
        _buffer = [];
      }
    }
    else {
      device.recordPoints(point);
    }
  }, _sampleInterval);

  return this;
}

PointCollector.prototype.stop = function() {
  clearInterval(this.timerId);
  this.timerId = null;
};

module.exports = PointCollector;

