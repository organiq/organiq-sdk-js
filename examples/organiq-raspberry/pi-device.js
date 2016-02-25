
//////////////////////////////////////////////////////////////////////////////
//pi-device.js
//////////////////////////////////////////////////////////////////////////////
var organiq = require('organiq');
var Gpio = require('onoff').Gpio;
var led = new Gpio(14, 'out');
var  button = new Gpio(4, 'in', 'both');
//////////////////////////////////////////////////////////////////////////////
var exit = function () {
  led.unexport();
  button.unexport();
  process.exit();
}
process.on('SIGINT', exit);//when interrupted, exit properly 
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
var _pressed = 'false';
var _led = 'false';
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
/**
 * The Device object is used to expose device functionality to client
 * applications via the Organiq gateway server. A device object is normally
 * implemented in the device firmware as a simple declaration of the actions,
 * events, and metrics supported by the device.
 *
 * The Organiq SDK automatically exposes a Device object's methods, properties,
 * and events to remote Clients based on the JavaScript types.
 */
var device = {
  getButtonState : function() { return _pressed; },
  getLEDState : function() { return _led; },
  ledOn: function() { _led = 'true'; writeLED(); },
  ledOff: function() { _led = 'false'; writeLED(); }
};
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
var writeLED = function() {
  var _toWrite;  
  if (_led === 'true') {
    _toWrite = 1;
  }
  else if (_led === 'false') {
    _toWrite = 0;
  }  
  led.write(_toWrite, function (err, value) {
    if (err) {
      throw err;
      }
    console.log('wrote ' + _led + ' to the led');
  });
};
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
button.watch(function (err, value) {
  if (err) {
    throw err;
  }
  if (value) {
    _pressed = 'false';
    console.log('The button was released.');
  }
  else {
    _pressed = 'true';
    console.log('The button was pressed.');
  }  
});
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
var promisedRegistration = organiq.registerDevice('Pi Demo Device', device)
  .then(function(deviceid) {
    console.log('device: Registered ' + deviceid);
});
