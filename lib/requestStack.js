var when = require('when');
var debug = require('debug')('organiq:core');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
module.exports = RequestStack;

/**
 *
 *
 * @param {Dispatcher} upstream
 * @param {Dispatcher} downstream
 * @param {Object=} options
 * @returns {RequestStack}
 * @constructor
 */
function RequestStack(upstream, downstream, options) {
  if (!(this instanceof RequestStack)) {
    return new RequestStack(upstream, downstream, options);
  }
  this.stack = [];        // middleware stack, ordered toward downstream
  this.upstream = upstream;
  this.downstream = downstream;
}
util.inherits(RequestStack, EventEmitter);


/**
 * Add middleware to the request stack.
 *
 * Middleware functions are called for every request that passes through the
 * system. They are invoked in the order that they are given to use().
 *
 * @param {function(OrganiqRequest, function)|function[]} fns
 * @returns {RequestStack}
 */
RequestStack.prototype.use = function use(fns) {

  if (typeof fns === 'function') {
    fns = [fns];
  }

  if (!Array.isArray(fns) || fns.length === 0) {
    throw new TypeError('.use() requires middleware functions');
  }

  fns.forEach(function (fn) {
    this.stack.push(fn);
    fn.organiq = this;
  }, this);

  return this;
};


/**
 * Dispatch a request through the local middleware stack.
 *
 * Requests may be either application-originated (downstream) or device-
 * originated (upstream). After being processed by the local middleware,
 * downstream messages are passed to a registered device (if present),
 * while upstream messages are sent to the gateway.
 *
 * @param  {OrganiqRequest} req The request to dispatch
 * @return {Promise} A promise for a result value
 */
RequestStack.prototype.dispatch = function dispatch(req) {

  var idx;                  // index of current handler in middleware stack
  var previousResult;       // last defined result returned from a handler
  var handlers = this.stack;// array of middleware handlers
  var finalHandler;         // function used when end of handlers reached
  var downstream = req.isApplicationOriginated();

  // Application-originated requests go "downstream" through the stack,
  // from first (index 0) to last. Device-originated requests go "upstream",
  // starting at the last handler in the stack.
  idx = downstream ? 0 : handlers.length - 1;
  finalHandler = downstream ? this.downstream : this.upstream;

  return next();

  /**
   * Invoke the next middleware handler in the stack.
   *
   * If the request is not handled before it reaches the end of the stack,
   * the `finalHandler` is called to dispatch the request to the target device.
   *
   * A reference to this function is provided to each layer, and the normal
   * case is that each layer will invoke next() to call the next layer if it
   * does not handle the request itself. We therefore are called recursively,
   * and a promise chain is built from the return values of each handler.
   *
   * @returns {Promise} a promise for a response to the request.
   */
  function next() {

    var layer = handlers[downstream ? idx++ : idx--] || finalHandler;
    var result;

    // Invoke the current layer. It may do any of the following:
    // - return the value of next() (normal case)
    // - return a result directly, or a promise (perhaps fulfilled or rejected)
    //    for a result
    // - return nothing
    // - throw an exception
    //
    // If an exception is thrown, we return a rejected promise that can be used
    // by previous layers in the stack to do error handling.
    // Note that this is different than how Connect middleware functions; in
    // Connect, errors are passed to _future_ layers in the stack, while in
    // Organiq, errors are accessible only to _previous_ layers.
    //
    // In the normal case, the layers will call next() recursively
    try { result = layer(req, next); }
    catch(e) {
      debug('Middleware threw an exception: ', e);
      return when.reject(e);
    }

    // At this point, all of the layers (including the finalHandler) that will
    // be called have been called, and we are unwinding the requests from
    // last-called to first-called layer.

    // We normally just return the value given us by the layer. However, layers
    // may not always return a value, in which case we return the most recent
    // well-defined result from any handler.
    if (typeof result === 'undefined') {
      result = previousResult;
    } else {
      previousResult = result;  // remember most recently returned result
    }

    // if result is still undefined here, it means that either (1) finalHandler
    // failed to return a value, or (2) a layer of middleware did not invoke
    // next() yet also failed to return a value.
    if (result === undefined) {
      var e = 'Layer ' + layer.name + ' must invoke next() or return a value.';
      debug(e);
      return when.reject(new Error(e));
    }

    // Return a promise to the caller
    return when(result);
  }
};

