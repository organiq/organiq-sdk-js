/**
 * Module Dependencies.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');

/**
 * Export DeviceWrapper constructor
 */
module.exports = DeviceWrapper;

/**
 * Local device interface.
 *
 * Manages the interface between Organiq and local objects implementing device
 * functionality. Could be called "native (JavaScript) device wrapper."
 *
 * It is relatively straightforward to create device objects that implement the
 * Organiq device interface (get/set/invoke/describe/config) and register them
 * directly with organiq.register(). However, it can be simpler and more natural
 * to implement methods and properties with native JavaScript functionality.
 *
 * DeviceWrapper encapsulates an existing 'native' JavaScript object and
 * automatically exposes its public methods, properties, and events to Organiq.
 *
 * var organiq = require('organiq-core');
 * var container = organiq();
 * ...
 * var device = new DeviceWrapper({
 *    someFunc: function() { ... }
 *    events: []
 *
 *
 * @param {Object} impl User-supplied implementation object.
 * @param {Object=} schema schema for the device, specifying properties,
 *  methods, and events to expose. If omitted, the schema is created
 *  automatically by inspecting the given implementation object.
 * @constructor
 */
function DeviceWrapper(impl, schema) {
  if (!(this instanceof DeviceWrapper)) {
    return new DeviceWrapper(impl, schema);
  }
  this.impl = impl;
  this.schema = schema || Schema.fromObjectDefinition(impl);


  // We want to be notified whenever the implementation object modifies one of
  // its public properties. To do this, we replace the user-supplied property
  // (which may be a simple object, or some combination of getter/setter) with
  // a new getter/setter pair of our own. Our implementation is essentially a
  // 'spy' that calls through to the original implementation transparently.

  // Create getters/setters for all of the schema-defined properties that wrap
  // the definitions given in the implementation.

  /**
   * Helper method for creating a getter / setter pair for a property.
   *
   * @param {DeviceWrapper} target The device on which the new getter/setter will
   *  be defined
   * @param {Object} impl User-supplied implementation object
   * @param {String} property The property name to be spied on
   */
  function makePropertySpy(target, impl, property) {
    // Rename the original property implementation. Note that we can't do a
    // simple assignment, because this won't work correctly with getters.
    var impldesc = Object.getOwnPropertyDescriptor(impl, property);
    Object.defineProperty(impl, '__' + property, impldesc);

    var desc = { enumerable: true };

    // only create a getter for data descriptors (that is, normal properties
    // attached to an object), or accessor descriptors with a getter.
    if (typeof(impldesc.value) !== 'undefined' || impldesc.get !== 'undefined') {
      desc.get = function getSpy() { return impl['__' + property]; };
    }

    // only create a setter for writable data descriptors or accessor
    // descriptors with a setter.
    if (impldesc.writable || impldesc.set !== 'undefined') {
      desc.set =  function setSpy(value) {
        target.put(property, value);    // notify DeviceWrapper
        impl['__' + property] = value;  // call original implementation
      };
    }
    Object.defineProperty(impl, property, desc);
  }

  // Create a spy method for each property in the schema.
  for (var prop in this.schema.properties) {
    if (this.schema.properties.hasOwnProperty(prop)) {
      // It is possible that the implementation object doesn't have one of the
      // defined properties defined. Create a default property of the correct
      // type so that the getter/setter has something to wrap.
      if (impl[prop] === 'undefined') {
        impl[prop] = this.schema.properties[prop].constructor();
      }
      makePropertySpy(this, impl, prop);
    }
  }

  /**
   *
   * @param {DeviceWrapper} target
   * @param {String} event
   * @return {Function}
   */
  function makeEventHandler(target, event) {
    return function() {
      var args = [].slice.call(arguments);  // convert arguments to Array
      target.notify(event, args);
    };
  }
  for (var event in this.schema.events) {
    if (this.schema.events.hasOwnProperty(event)) {
      impl.on(event, makeEventHandler(this, event));
    }
  }
}
util.inherits(DeviceWrapper, EventEmitter);

/**
 * Get a local device property.
 *
 * Fetches the requested device property from the implementation object.
 *
 * @param {String} property
 */
DeviceWrapper.prototype.get = function(property) {
  if (!this.schema.properties.hasOwnProperty(property)) {
    throw Error('Property ' + property + ' is invalid for schema.');
  }
  return this.impl['__' + property];
};

/**
 * Set a property on a local device.
 *
 * @param {String} property
 * @param {Object} value
 */
DeviceWrapper.prototype.set = function(property, value) {
  if (!this.schema.properties.hasOwnProperty(property)) {
    throw Error('Property ' + property + ' is invalid for schema.');
  }
  // set the local device state by invoking the underlying device implementation
  // for the property (which was renamed when the spy was installed).
  this.impl['__' + property] = value;
};

/**
 * Invoke a method on a local device.
 *
 * @param {String} method
 * @param {Array} params List of parameters to pass to method
 */
DeviceWrapper.prototype.invoke = function(method, params) {
  if (!this.schema.methods.hasOwnProperty(method)) {
    throw Error('Method ' + method + ' is invalid for schema.');
  }
  var impl = this.impl;
  var args = params || [];
  if (!Array.isArray(args)) {
    args = [args];
  }
  return impl[method].apply(impl, args);
};

/**
 * Get device schema information.
 *
 * @param {String} property not currently used
 */
DeviceWrapper.prototype.describe = function(property) {
  void(property);
  return this.schema;
};

/**
 * Configure the device.
 *
 * @param {String} property
 * @param {Object} value
 */
DeviceWrapper.prototype.config = function(property, value) {
  void(property);
  void(value);
  return true;
};



/**
 * Notify the local device container of an event.
 *
 * This method is intended to be called by the device implementation itself,
 * and should not be called by other components.
 *
 * Note that events that are defined as part of the device schema are
 * automatically sent to the device container when emit()'d by the device.
 *
 * @param {String} event
 * @param {Array} params Array of parameters passed to event handler
 * @private
 */
DeviceWrapper.prototype.notify = function(event, params) {
  params.unshift('notify', event);
  this.emit.apply(this, params);
};

/**
 * Put a new metric via the local device container.
 *
 * This method may be used by any user-supplied code to notify the device
 * container of an updated device metric.
 *
 * Changes to public properties are automatically detected, and put() invoked.
 *
 * @param {String} metric
 * @param {Object} value
 * @private
 */
DeviceWrapper.prototype.put = function(metric, value) {
  this.emit('put', metric, value);
};




//
// Schema
//
// Every Device object has an associated schema which provides information
// about the methods, properties, and events supported by that device. The
// Schema defines the Device interface completely, and allows for validation
// and authorization of operations involving the Device.
//
// Schema objects can be constructed manually, or they may be inferred
// automatically by the object passed to the Device constructor/define. Explicit
// definition is preferred to avoid the possibility of 'leakage' (e.g., private
// device state/information being exposed to external parties).
//
// A Schema is a fairly simple object: it has three sub-objects, one each
// for properties, methods, and events. Each of these, in turn, have one
// property for each 'member', with the value of each member giving its
// type (i.e., the Function object that is used to create instances of that
// type).
//
// The current set of supported types are limited to  JavaScript's Boolean,
// Number, and String, as well as lists and dictionaries (objects) composed of
// those types.
//
function Schema(attributes) {
  this.properties = attributes.properties;
  this.methods = attributes.methods;
  this.events = attributes.events;
}

// Build a Schema object based on a provided object.
//
// In addition, if an attribute with the name `events` is present, it is
// assumed to be an array of strings documenting the events emitted by
// this object.
//
// Check here:
// http://javascriptweblog.wordpress.com
//  /2011/08/08/fixing-the-javascript-typeof-operator/
// for a way that we can get better type information.
//
/**
 * Construct a Schema object based on a provided object definition.
 *
 * This method inspects the given object and automatically determines what
 * methods, properties, and events are supported by it.
 *
 * By default, all public functions defined on the object will be exposed as
 * methods, and all public getters will be exposed as properties. Any object
 * property that begins with an underscore will be skipped.
 *
 * Note that events are not automatically inferred; the object must have a
 * property named `events` that is an array of strings documenting the emitted
 * events.
 *
 * @param obj Implementation object whose schema is to be inferred.
 * @return {Schema}
 */
Schema.fromObjectDefinition = function(obj) {
  var schema = { properties: {}, methods: {}, events: {} };
  // N.B. We need to use getOwnPropertyNames() rather than for (var p in obj)
  // in order to pick up non-enumerable properties. On Tessel, getters are
  // not enumerable by default, so the normal for (var p in obj) will not
  // pick them up.
  var attrs = Object.getOwnPropertyNames(obj);
  for(var i=0;i<attrs.length;i++) {
    var attr = attrs[i];
    if (attr[0] === '_') { continue; } // skip properties with leading _
    // console.log('attr ' + attrs[i] + ' has type: ' + (typeof obj[attrs[i]]));
    var desc = Object.getOwnPropertyDescriptor(obj, attr);
    if (desc.get !== undefined) { // this is a getter property
      schema.properties[attr] = { type: typeof obj[attr] }; // invoke
    }
    else if (typeof obj[attr] === "string") {
      schema.properties[attr] = { type: 'string', constructor: String };
    }
    else if (typeof obj[attr] === "number") {
      schema.properties[attr] = { type: 'number', constructor: Number };
    }
    else if (typeof obj[attr] === "boolean") {
      schema.properties[attr] = { type: 'boolean', constructor: Boolean };
    }
    else if (typeof obj[attr] === "function") {
      // todo: get signature of function
      // # arguments = obj[attr].length
      schema.methods[attr] = { type: 'unknown' };
    }
    else if (typeof obj[attr] === "object" && attr === "events") {
      var events = obj[attr];
      for (var j=0; j<events.length;j++) {
        schema.events[events[j]] = {};
      }
    }
  }
  return new Schema(schema);
};

// Dump out the object definition. The callback to stringify() lets us
// modify how to show function names, which is necessary to get method names
// to show up on Tessel.
Schema.prototype.toString = function() {
  console.log(JSON.stringify(this, function(key, val) {
    console.log(key, val);
    if (typeof val === 'function') {
      // val.name is not defined in Tessel firmware, but if we return 'method'
      // here it will show the name as key.
      //return val.name;
      return 'method';
    }
    return val;
  }, 4 /* indent */));
};
