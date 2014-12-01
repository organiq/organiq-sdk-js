// Copyright (c) 2014 Myk Willis & Company, LLC. All Rights Reserved.
/*jslint node: true*/

var Schema = require('./schema');
var PointCollector = require('./point');

//
// Device
//
// A Device object is used to expose a physical (or virtual) device to the
// outside world. A Device has an associated Schema, which defines the exported
// interface, as well as a device type-dependant implementation object the
// provides the implementation of the device's properties and methods.
//
// Creating a Device object is accomplished with the constructor, which takes
// a Schema and Implementation object as arguments. The Schema defines the
// entire external interface to the device, and every property and method of
// the schema must be implemented by the implemenation object. Any attributes
// of the implementation object that are not defined in the Schema are not
// visible to external parties.
//
// The Schema is optional, and
// if omitted, a schema will be automatically created based on the
// implementation object provided.
//
//  var device = new Device({});
//
// Once a device has been created, it can be registered with a Binding object
// to allow it to be discovered on the network.
//
// Property Change Notifications. In order to allow external parties to be
// notified when property values change, implementations should use
// Device.prototype.set() to set property values. This method will notify any
// watchers, and will also set the specified property value.
//
// Raising Events. To raise an event, an implementation should use
// Device.prototype.notify().
//
// Recording data points. Use Device.prototype.recordPoint()
//
function Device(schema, impl) {

  if (!(this instanceof Device)) {
    throw Error('Device() must be called with `new`');
  }

  this._collectors = [];

  if (arguments.length === 0) {
    throw Error('Device() constructor requires arguments');
  }

  // if we are passed without a schema, build one based on the implementation.
  if ( arguments.length === 1 ) {
    impl = schema; // shifted
    this.schema = Schema.fromObjectDefinition(impl);
  }
  else {
    this.schema = schema;
  }
  this.eventHandlers = {};
  this._registrations = [];

  // Inherit all of the methods of the implementation object.
  for (var attr in impl) {
    if (typeof this[attr] !== 'undefined') {
        throw Error('Override of Device property ('+attr+') is not allowed');
    }
    // if (typeof this[attr] === 'function') {
      this[attr] = impl[attr];
    // }
  }

  // Create getters/setters for all of the schema-defined properties that wrap
  // the definitions given in the implementation.

  // helper method for creating a getter / setter pair for a property.
  function makeProperty(target, property, impldesc) {
    var desc = { enumerable: true };

    // only create a getter for data descriptors, or accessor descriptors
    // with a getter.
    if (typeof(impldesc.value) !== 'undefined' || impldesc.get !== 'undefined') {
      desc.get = function() { return target['__' + property]; };
    }

    // only create a setter for writable data descriptors or accessor
    // descriptors with a setter.
    if (impldesc.writable || impldesc.set !== 'undefined') {
      desc.set =  function(p) { target['__' + property] = p; };
    }
    Object.defineProperty(target, property, desc);
  }

  // Add a getter for each property in the schema. The getter will be a wrapper
  // for a property copied from the impl object into a property with two
  // leading underscores.
  for (var prop in this.schema.properties) {
    if (this.schema.properties.hasOwnProperty(prop)) {
      if (impl[prop] === 'undefined') {
        impl[prop] = this.schema.properties[prop].constructor();
      }
      // Copy the property implementation from impl into this. We can't do a
      // simple assignment because we might be dealing with getters.
      var d = Object.getOwnPropertyDescriptor(impl, prop);
      Object.defineProperty(this, '__' + prop, d);
      makeProperty(this, prop, d);
    }
  }

  // create the object that will hold onto any event handlers that are
  // registered. The key of the eventHandler object is the event name, and the
  // value is an array of installed handlers.
  var names = Object.getOwnPropertyNames(this.schema.events);
  for(var i=0;i<names.length;i++) {
    var name = names[i];
    this.eventHandlers[name] = [];
  }

  if (false) {
    console.log(this.schema);
  }
  return this;
}

Device.define = function(schema, impl) {

  // Here is where we return a constructor for the derived type (the device
  // object that has convenience methods built based on the schema).
  var NewDevice = function(deviceId) {
    this.deviceId = deviceId;

    if (this._init) {
      this._init.apply(this, arguments);
    }
  };

  // We want NewDevice to inherit all of the properties from Device.
  // We accomplish this by creating an instance of Device() that is specific
  // to this device type, and which will have an interface built from the
  // given schema / implementation.
  // By setting this Device object as the prototype of NewDevice, we ensure that
  // all of those properties will be available on instances created with the
  // NewDevice constructor.
  var device = Object.create(Device.prototype); // create raw object
  Device.apply(device, arguments);              // invoke Device() constructor
  NewDevice.prototype = device;                 // NewDevice inherits all props
  return NewDevice;
};


// This method may be used by Device implementations to retrieve the current
// value of a property. Unlike accessing the property directly in the object,
// this method will validate that the requested property is actually part of
// the Device interface as defined by the Schema.
Device.prototype.get = function(property) {
  if (property === '__schema') {
    return this.schema;
  }
  if (!this.schema.properties.hasOwnProperty(property)) {
    throw Error('Property ' + property + ' is invalid for schema.');
  }
  return this[property];
};

// This method should be used by Device implementations to make a change to
// a property value visible to observers.
Device.prototype.set = function(property, value) {
  if (!this.schema.properties.hasOwnProperty(property)) {
    throw Error('Property ' + property + ' is invalid for schema.');
  }
  // set the local device state
  this[property] = value;

  // update server state
  this.connection.set(this.deviceId, property, value);
};

// generic method invocation.
// Invoked by associated Connection object when a remote client invokes us.
Device.prototype.invoke = function(method, params) {
  if (!this.schema.methods.hasOwnProperty(method)) {
    console.log('deviceid: ' + this.deviceId);
    throw Error('Method ' + method + ' is invalid for schema.');
  }
  return this[method].call(this, params);
};

// method to register an event handler for a named event
Device.prototype.on = function(event, fn) {
  if (!this.schema.events.hasOwnProperty(event)) {
    throw Error('Event ' + event + ' is invalid for schema.');
  }
  this.eventHandlers[event].push(fn);
};

// method used to notify all installed event handlers of an event
Device.prototype.notify = function(event, args) {
  if (!this.schema.events.hasOwnProperty(event)) {
    throw Error('Event ' + event + ' is invalid for schema.');
  }
  // invoke local handlers
  var handlers = this.eventHandlers[event];
  for (var fn in handlers) {
    if (handlers.hasOwnProperty(fn)) {
      handlers[fn].call(this, args);
    }
  }
  // send to remote listeners
  this.connection.notify(this.deviceId, event, args);
};

Device.prototype.recordPoints = function(points) {
  return this.connection.recordPoints(this.deviceId, points);
};

// Private method invoked by connection to allow administrative config.
// Right now, this is exposed to the proxy, but it should really be
// a server function.
Device.prototype.config = function(config) {
  var collectors = config.collectors || [];

  // stop and release any existing collectors
  while (this._collectors.length) {
    this._collectors.shift().stop();
  }

  // create new collectors for those given in config
  for(var i=0;i<collectors.length;i++) {
    var dc = collectors[i];
    var collector = new PointCollector(this, dc.property, {
      sampleInterval: dc.sampleInterval
    });
    this._collectors.push(collector);
  }
};

module.exports = Device;
