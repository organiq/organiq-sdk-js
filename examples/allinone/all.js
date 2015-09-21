/**
 * Example showing implementation of Device, Driver, and Clients.
 *
 * This example program demonstrates:
 * - Registering a Device object that exposes actions, metrics, and events to
 *    client applications.
 * - Installation of a Driver function that acts as middleware to inspect and
 *    potentially modify requests to/from a given device.
 * - Connection of a Client that interacts with the registered device.
 *
 * In this example, all three of the components are implemented locally as part
 * of a single stand-alone Node application. In a production environment, the
 * Device object would be implemented in device firmware (for example, on an
 * Arduino or Tessel), and the Driver functionality would be part of a managed
 * application installed directly on the Organiq gateway server. The Client
 * can be implemented in any application environment, such as a mobile or web
 * application.
 */
var organiq = require('../../'); // use `require('organiq')` in your own code

/**
 * The Device object is used to expose device functionality to client
 * applications via the Organiq gateway server. A device object is normally
 * implemented in the device firmware as a simple declaration of the actions,
 * events, and metrics supported by the device.
 *
 * The Organiq SDK automatically exposes a Device object's methods, properties,
 * and events to remote Clients based on the JavaScript types.
 */
var device = {
  _pressed: false,
  get buttonState() { return this._pressed; },
  set buttonState(pressed) { this._pressed = !!pressed },
  pressButton: function() { this.buttonState = true; this.emit('buttonPress', true); return this.buttonState; },
  releaseButton: function() { this.buttonState = false; this.emit('buttonReleas', false); return this.buttonState; }
};
var promisedRegistration = organiq.registerDevice('Demo Device', device)
  .then(function(deviceid) {
    console.log('device: Registered ' + deviceid);
  });


/**
 * Driver functions are used much like middleware in frameworks like expressjs,
 * allowing you to modify the way devices interact with client applications.
 * Driver functions are normally packaged as applications that are installed on
 * and run within a container on an Organiq server, though they may be executed
 * on client nodes as well.
 */
var driver = function(req, next) {
  console.log('driver: ' + req.method + ' ' + req.identifier);
  // In this example, our "device" has a bug - 'buttonRelease' is misspelled.
  // We look for cases where the device emits this misspelled event, and fix it
  // up so that clients will see the appropriate event name.
  if (req.method === 'NOTIFY' && req.identifier === 'buttonReleas') {
    console.log('driver: fixing event name');
    req.identifier = 'buttonRelease';
  }
  return next();  // normally, next invokes the underlying device implementation
};
organiq.installDriver('Demo Device', driver);


/**
 * Client applications are able to connect to device objects in order to invoke
 * actions, handle events, and be notified of metrics. Once a device has
 * connected to a remote device, it can invoke methods and handle events in most
 * ways as if the device were just a local JavaScript object.
 */
function client(device) {
  device.on('buttonPress', function() {
    console.log('client: Button was pressed.');
  });
  device.on('buttonRelease', function() {
    console.log('client: Button was released.');
  });

  device.pressButton();
  device.releaseButton();
}
promisedRegistration.then(function() {
  organiq.getDevice('Demo Device').then(client);
});
