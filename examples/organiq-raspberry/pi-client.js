
//////////////////////////////////////////////////////////////////////////////
//pi-client.js
//////////////////////////////////////////////////////////////////////////////
var organiq = require('organiq');
var _toggle = false;
/**
 * Client applications are able to connect to device objects in order to invoke
 * actions, handle events, and be notified of metrics. Once a device has
 * connected to a remote device, it can invoke methods and handle events in most
 * ways as if the device were just a local JavaScript object.
 */
function client(device) {
  setInterval(function() {
    device.getButtonState().then(function (value) {
      console.log('The button is pressed: ' + value);
    });    
    if (_toggle === false) {
      device.ledOff().then(function () { 
        console.log('led off.'); });
    } else {
      device.ledOn().then(function () { 
        console.log('led on.'); });
    }
    _toggle = !_toggle;
  }, 1000);
};

organiq.getDevice('Pi Demo Device').then(client);
