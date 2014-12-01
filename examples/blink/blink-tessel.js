/* blink-tessel.js - Tessel application exposing method to blink an LED.

  tessel run blink-tessel.js
  - or -
  node blink-tessel.js (if you don't have Tessel)
*/
var tessel = require('tessel');
// var tessel = require('./tessel-sim');  // use this if you don't have Tessel
var organiq = require('organiq-tessel');
organiq.registerDevice('Blinker', {
    toggleLed: function() { tessel.led[0].toggle(); }
});
