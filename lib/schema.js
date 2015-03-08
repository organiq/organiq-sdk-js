/**
 * Module Dependencies.
 */

/**
 * Export Schema constructor
 */
module.exports = Schema;


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
