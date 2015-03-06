/**
 * Module Dependencies.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Schema = require('./schema');
var debug = require('debug')('organiq:sdk:device');

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
  this.config = {};

  // Make sure implementation object implements all of the functions given in
  // the schema.
  for (var m in this.schema.methods) {
    if (typeof impl[m] !== 'function') {
      throw new Error('Required method ' + m + ' is not implemented by object.');
    }
  }

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
        impl['__' + property] = value;  // call original implementation
        target.put(property, value);    // notify DeviceWrapper
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
      if (!(prop in impl)) {
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
      if (typeof impl.on === 'function') {
        impl.on(event, makeEventHandler(this, event));
      }
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
 * @param {String} property Currently unused.
 * @returns {Object} the device schema
 */
DeviceWrapper.prototype.describe = function(property) {
  switch(property) {
    case 'schema':
      return this.schema;
    case 'config':
      return this.config;
    default:
      throw new Error('Unrecognized describe property: ' + property);
  }
};

/**
 * Configure the device.
 *
 * @param {String} property Currently unused
 * @param {Object} config Configuration object
 */
DeviceWrapper.prototype.config = function(property, config) {
  debug('Updating config: ' + JSON.stringify(config, null, 2))
  this.config = config;
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

