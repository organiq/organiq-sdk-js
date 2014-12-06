# Implementing Devices

***Device Objects*** are the basis of communication between physical devices and the external applications that interact with them. A device object is defined by the device developer to contain the complete exported interface (methods and properties) for their device.

When working with Tessel, you will normally create exactly one Device object to represent your microcontroller and all of its modules and related functionality. You'll define methods on this object that will be invoked by external applications.

## Creating Device Objects

You define the methods you want to expose to external applications by passing an implementation object to the `organiq.Device` constructor.

    var device = new organiq.Device({
        sayHello: function() { console.log('Hello'); },
        sayGoodbye: function() { console.log('Goodbye'); }
        });

You can also pass your implementation object directly to `registerDevice` and it will create the Device object for you:

    organiq.registerDevice('MyDevice', {
        sayHello: function() { console.log('Hello'); },
        sayGoodbye: function() { console.log('Goodbye'); }
        });

This being done, other applications can get a reference to your device by name using `getDevice`. The methods you defined on your implementation object can be invoked directly on the returned reference, as if they were implemented locally:

    organiq.getDevice('MyDevice').then(function(device) {
        device.sayHello();      // prints 'Hello' to device console
        device.sayGoodbye();    // prints 'Goodbye' to device console
        });

(Note that Organiq uses Promises for dealing with asynchronous operations. If the use of `then` in the snippet above is unfamiliar to you, please refer to the section on [Promises](promises.md) elsewhere in this guide.)

See [Device Registration and Discovery](registration.md) for more information on the registration and discovery process.

## Implementing Methods

When an external application invokes a method on a device object defined by your device, the appropriate method is called locally as if the application were running on the Tessel itself. You normally don't have to think about the fact that the caller is remote, and can implement your method as you normally would. For example, you can accept arguments and return values in a normal way.

One exception to this is in the handling of asynchronous operations. **Organiq does not support the use of callbacks when defining asynchronous methods** in device objects. 

    var device = new Device({
        doAsync: function(callback) {  // BUG: callbacks not allowed
            _internalAsync(function() { callback(result); });
        }
    }

To implement asynchronous methods in device objects, you need to use [promises](http://www.promisesaplus.com) as described below.

## Implementing Asynchronous Methods

When writing your device code, it's common to want to expose a property obtained from a connected module asynchronously. For example, you may want to return the humidity reading from the climate module, which is obtained with a Node.js-style callback:

    // var climate = require('climate-si7020')...
    climate.readHumidity(function(err, res) {
        if (!err) {
            var humidity = res;
            console.log('humidity: ' + humidity);
        }
    });

To expose this to external applications as a property getter on a Device object, you need to return a promise instead of using the Node.js-style callback. You normally do this with the help of a promise library like [when.js](https://github.com/cujojs/when), as shown in this example:

    // ...
    var when = require('when');
    organiq.registerDevice('ClimateDevice', {
        get humidity() {
            var d = when.defer();
            climate.readHumidity(function(err, res) {
                if (err) { d.fail(); } // fail the promise
                else { d.resolve(res); }
            }
            return d.promise;
    });

We can make this a little less verbose by using [node.lift](https://github.com/cujojs/when/blob/master/docs/api.md#nodelift) from the [when.js](https://github.com/cujojs/when) library. This function will automatically convert a Node.js-style callback to one that returns a promise, which is just what we need:

    // ...
    var nodefn =  require('when/node');
    var promisedHumidity = nodefn.lift(climate.readHumidity).bind(climate);
    organiq.registerDevice('ClimateDevice', {
        get humidity() { return promisedHumidity(); }
    });

See [Asynchronous Operations with Promises](promises.md) for more background.

## Device Properties

Properties can be defined on Device objects just like methods. You can define constant properties as primitive values, though more commonly you'll use JavaScript getters:

    var implementation = {
        version: 1.2,   // a simple property
        get curTime(): { return new Date().getTime(); }
    }

Just like with methods, you can use promises to implement asynchronous property getters:

    var implementation = {
        get curPosition(): { 
            var d = when.defer();
            _readGpsPositionAsync(function(pos) {
                d.resolve(pos);
            });
            return d.promise;
        }
    }

### Consuming Device Properties

***Device properties are not automatically synchronized with the current value of the device when referenced from external applications***. Instead, clients must explictly synchronize properties before reading their values:

    device.sync().then(function() {
        var timeAtSync = device.curTime;
        var positionAtSync = device.curPosition;
        });

The `device.sync` function goes across the network to update the device properties. Only after the sync operation completes will the properties have updated values. They will retain the synchronized values until the next call to sync.

This behavior prevents excessive network roundtrips when reading multiple property values, and allows properties to be read synchronously (rather than requiring every property fetch be an async operation, as would be necessary if a network round-trip were done).
