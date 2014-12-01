/* blink-app.js - This is a normal Node.js application */
var organiq = require('../../'); // use `require('organiq')` in your own code
function startBlinking(device) {
    setInterval(function() { device.toggleLed(); }, 500);
}
organiq.getDevice('Blinker').then(startBlinking);
