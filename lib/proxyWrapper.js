/**
 * Module Dependencies.
 */
var when = require('when');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

/**
 * Export ProxyWrapper constructor
 */
module.exports = ProxyWrapper;

/**
 * Native wrapper for Organiq device proxy.
 *
 * var proxy = organiq.getDevice('device alias');
 * proxy.callMethod();
 * proxy.sync(function() {
 *  var someProp = proxy.propValue;
 *  var anotherProp = proxy.anotherValue;
 * });
 * proxy.on('someEvent', function(ev) {
 *  // process event
 * })
 * proxy.on('propValue', function(value) {
 *  // 'metric' property was updated with value `value`
 *  assert(proxy.propValue === value);
 * }
 *
 * @param {Schema} schema
 * @param {RemoteDeviceProxy} proxy
 * @param {Function} applyFn Function to use to wrap asynchronous updates to
 *  proxy state.
 * @constructor
 */
function ProxyWrapper(schema, proxy, applyFn) {
  if (!(this instanceof ProxyWrapper)) {
    return new ProxyWrapper(schema, proxy);
  }

  schema = schema || { properties: {}, methods: {}, events: {} };
  applyFn = applyFn || function(cb) { cb(); };

  var cache = {};

  // build methods on the proxy object with names matching what's in schema.
  var methods = schema.methods;
  function makeMethod(method) {
    return function() {
      var args = [].slice.call(arguments); // pack into 'real' array
      return proxy.invoke(method, args);
    };
  }
  for(var method in methods) {
    if (methods.hasOwnProperty(method)) {
      this[method] = makeMethod(method);
    }
  }

  // build getters/setters for the properties
  var properties = schema.properties;
  function makeProperty(obj, property) {
    Object.defineProperty(obj, property, {
      get: function() { return cache[property]; },
      set: function(value) { this.set(property, value); },
      enumerable: true
    });
  }
  for(var property in properties) {
    if (properties.hasOwnProperty(property)) {
      makeProperty(this, property);
    }
  }

  // Register event handlers.
  var self = this;
  proxy.on('notify', function(event, args) {
    if (!Array.isArray(args)) {
      args = [args];
    }
    args.unshift(event);
    self.emit.apply(self, args); // e.g., this.emit('custom', arg0, arg1, ...)
  });

  proxy.on('put', function(metric, value) {
    // use applyFn wrapper when setting value, so that frameworks like Angular
    // can notice the state update.
    applyFn(function() {
      cache[metric] = value;
    });
    self.emit(metric, value);
  });


  /**
   * Get a device property from the remote device.
   *
   * @param {String} property
   * @returns {Promise|*}
   */
  this.get = function(property) {
    return proxy.get(property).then(
      function(res) { cache[property] = res; return res; }
    );
  };

  /**
   * Set a device property on the remote device.
   *
   *
   * proxy.set('prop', '1');
   * var p = proxy.get('prop'); // might not get '1'!
   *
   * @param {String} property The property whose value is to be set.
   * @param {*} value The new value for the property.
   * @param {Object} options Options for how to handle setting
   * @param {Boolean=} options.optimistic If `true`, the new value will be
   *  assigned to the local property immediately, before the remote operation
   *  completes. If the set operation fails, it will be reverted to the
   *  original value. Default is true.
   * @param {Boolean=} options.updateOnSuccess If `true`, the local property
   *  value will be set to `value` upon successful completion. Default is true.
   * @returns {Promise|*}
   */
  this.set = function(property, value, options) {
    options = options || {};
    var optimistic = options.optimistic !== false;        // default true
    var updateOnSuccess = options.updateOnSuccess !== false;  // default true

    // Save off the current value of the property in the event we need to
    // restore it.
    var oldValue = property in cache ? cache[property]: undefined;
    if (optimistic) {
      cache[property] = value;
    }

    return proxy.set(property, value).then(
      function(res) {
        if (updateOnSuccess) {
          cache[property] = value;
          return res;
        }
      }
    ).catch(
      function(err) {
        // don't reset the value if it's different from what it was when we
        // first set it.
        if (optimistic && cache[property] === value) {
          cache[property] = oldValue;
        }
        throw err;
      });
  };

  /**
   * Invoke a method on the remote device.
   *
   * @param {String} method Name of the method to invoke.
   * @param {Array} args List of arguments to pass to the method.
   * @returns {*}
   */
  this.invoke = function(method, args) {
    return proxy.invoke(method, args);
  };

  /**
   * Configure the remote device.
   *
   * @param config
   * @returns {*}
   */
  this.config = function(config) {
    return proxy.config(config);
  };

  /**
   * Synchronize one or more device properties.
   *
   * Property values are not automatically synchronized when the remote device
   * when read. Instead, `sync` must be used to synchronize the local state
   * with the state from the remote device.
   *
   * @param {Array=} properties List of properties to sync. If not specified,
   *  this defaults to all properties, which can be expensive if the device has
   *  many defined properties.
   * @returns {Promise} A promise for the array of properties retrieved.
   */
  this.sync = function(properties) {
    var d = [];
    properties = properties || schema.properties;
    for(var property in properties) {
      if (properties.hasOwnProperty(property)) {
        d.push(this.get(property));
      }
    }
    return when.all(d);
  };
}
util.inherits(ProxyWrapper, EventEmitter);

