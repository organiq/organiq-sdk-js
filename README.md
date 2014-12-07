# Organiq Software Development Kit for JavaScript

Organiq is a platform for developing applications that interact with the real world.

The Organiq Software Development Kit (SDK) for JavaScript contains library code, utilities, and examples designed to enable developers to build applications using Organiq and JavaScript. This SDK supports both server- and client-side JavaScript, including support for Tessel microcontrollers.

    npm install -g organiq            # to install on development machine
    npm install organiq-tessel --save # to install into a Tessel app's package.json

### Quick Peek

Here's a (complete) program for Tessel that uses the Organiq SDK to expose the ability to turn on and off the device LED from the web:

```JavaScript
var tessel = require('tessel');
var organiq = require('organiq-tessel');
organiq.registerDevice('Blinker', {
    toggleLed: function() { tessel.led[0].toggle(); }
    });
```

Here's a Node.js application that starts the Tessel's LED blinking from anywhere on the web:

```JavaScript
var organiq = require('organiq');
function startBlinking(device) {
    setInterval(function() { device.toggleLed(); }, 500);
}
organiq.getDevice('Blinker').then(startBlinking);
```

## Documentation

See <http://organiq-tessel.readthedocs.org/en/latest/> for documentation on using Organiq with Tessel. 



Copyright (c) 2014 Myk Willis & Company, LLC. All Rights Reserved.

