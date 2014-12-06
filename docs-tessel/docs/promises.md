# Asynchronous Operations with Promises

Asynchronous operations in Organiq are handled with [Promises](https://promisesaplus.com/), rather than the more traditional Node.js-style callbacks. 

A traditional asynchronous method implemented with callbacks might be called like:

    object.doAsyncOperationWithCallback(function(err, res) {
        if (err) { /* failure */ }
        else { /* success */ }
    });

When implemented with promises, we would have instead something like:

    object.doAsyncOperationWithPromise()
        .then(function(res) { /* success */ },
              function(res) { /* failure */ }) /* optional failure function */

Not much of a difference in trivial examples, but promises tend to simplify error handling and chaining lots of nested asynchronous network operations. 

Internally and in the example programs, Organiq uses the [when.js](https://github.com/cujojs/when) library for handling promises. It's simple and small and works on Tessel. 

You will encounter promises when:

* Using APIs such as `organiq.getDevice` and `Device.sync`
* Writing asynchronous methods and property getters as part of device implementations
* Invoking remote methods on Device objects from external applications

For the most part, all you need to know to use asynchronous methods in Organiq is to use the `.then` syntax as in the example above.
