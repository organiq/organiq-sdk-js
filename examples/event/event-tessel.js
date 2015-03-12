/* event-tessel.js - Tessel application exposing button press/release as events.

  tessel run event-tessel.js
*/
var tessel = require('tessel');
var organiq = require('organiq-tessel');
var EventEmitter = require('events').EventEmitter;  // std. node emitter

// Define our device object, which simply declares the available events that
// it raises.
var device = {
  // define the (custom) events that we raise.
  events: ['buttonPress', 'buttonRelease'],

  // EventEmitter support for the object
  _emitter: new EventEmitter(),
  on: function(ev, fn) { return this._emitter.on(ev, fn); },
  emit: function(ev, args) { return this._emitter.emit(ev, args); }
};

// Register for local button press/release events, and raise them on our
// device object when they happen. This will allow them to be subscribed by
// remote clients (the event-app.js Node app in this example).
tessel.button.on('press', function() {
  device.emit('buttonPress');
});
tessel.button.on('release', function() {
  device.emit('buttonRelease');
});

organiq.registerDevice('EventDevice', device);

