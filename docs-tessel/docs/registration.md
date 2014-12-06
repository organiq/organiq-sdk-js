# Device Registration and Discovery

The Organiq server maintains a registry containing all registered device objects in the network. The registry is used by applications to locate devices to which they are interested in connecting.

## Device Names

Every device in the device registry has a unique name. This name is associated with the device during registration, and is used as the primary identifier for the device.

When using the development version of the Organiq server included in this package, there is a single, global device namespace. 

## Registering Devices

Devices are registered in the device registry with `organiq.registerDevice`:
    
    var device = new organiq.Device({/* device def'n */});
    organiq.registerDevice('MyDevice', device)
        .then(function(d) { console.log('successfully registered.'); });

Upon successful completion, the device registry will have an entry named 'MyDevice' that can be used to get a reference to the provded device object
(`device`).

## Discovering Devices

To obtain a reference to a registered device, you query the device registry by passing the device's name to `organiq.getDevice`:

    var organiq = require('organiq');
    organiq.getDevice('MyDevice')
        .then(function(device) {
            /* we can now interact with device */
            device.doSomething();
        });
