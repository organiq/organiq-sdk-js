// tessel-sim.js - simulator for some simple Tessel LED functionality.
//
// You can do a `require('./tessel-sim')` in place of a `require('tessel')`
// to get the example Organiq applications to run as normal Node.js apps.
//
var Tessel = {};

function Led() {
  var value = false;
  this.read = function() { return value; };
  this.output = function(s) { value = s; };
  this.toggle = function() { value = !value; };
}

Tessel.led = [new Led(), new Led(), new Led(), new Led()];

module.exports = Tessel;
