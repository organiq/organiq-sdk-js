/*  event-app.js - Node.js application that listens for button press events */
var organiq = require('../../'); // use `require('organiq')` in your own code
function listen(device) {
  device.on('buttonPress', function() {
    console.log('Tessel button was pressed.');
  });
  device.on('buttonRelease', function() {
    console.log('Tessel button was released.');
  });
}
organiq.getDevice('EventDevice').then(listen);
