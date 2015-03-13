/* event-tessel.js - Tessel application exposing button press/release as events.

  tessel run event-tessel.js
*/
var tessel = require('tessel');
var organiq = require('organiq-tessel');

var device = { /* device exposes no properties/methods */ };
organiq.registerDevice('EventDevice', device);

// Register for local button press/release events, and raise them on our
// device object when they happen. This will allow them to be subscribed by
// remote clients (the event-app.js Node app in this example).
tessel.button.on('press', function() {
  device.emit('buttonPress');
});
tessel.button.on('release', function() {
  device.emit('buttonRelease');
});


