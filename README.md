Copyright (c) 2014 Myk Willis & Company, LLC. All Rights Reserved.

# Organiq Node.js Module and CLI

Organiq is a platform that simplifies the development of applications that interact with the real world.

This package allows the development of Organiq applications and devices on Node.js-based platforms. It also provides a Command Line Interface (CLI) to interact with the Organiq web services.

    npm install -g organiq


## Hello, Organiq!

The "Hello, World!" of hardware is to blink an LED on the device. This example shows how to use Organiq to blink a device's LED from another application running anywhere on network.

The example uses Tessel, a microcontroller that runs Javascript. The interfaces used are compatible with any JavaScript environment. 


### Setup Application Directory

We will create three files for this example:
 * blink-tessel.js - Tessel app that exposes a method to blink the LED.
 * blink-app.js - Node.js app that binds to the device and invokes its method.
 * organiq.json - Organiq configuration file, used here to specify the server location.

(These files, along with a tessel-sim.js for simulating the Tessel if you don't have one available, can be found in this package at /examples/blink).

### Exposing a Method to Toggle our Device's LED

First, we write a program for the Tessel that registers a new device interface with Organiq, making it possible for external applications to discover the device and invoke its methods.

    /* blink-tessel.js - This code is deployed to and run on the Tessel. */
    var tessel = require('tessel');
    var organiq = require('organiq-tessel');
    organiq.registerDevice('Blinker', {
        toggleLed: function() { tessel.led[0].toggle(); }
        });

Save this program as `blink-tessel.js`. 


### Discovering our Device and Blinking its LED

Next, we write a Node.js application that uses Organiq to locate our blink device and invoke a method on it.

    /* blink-app.js - This is a normal Node.js application. */
    var organiq = require('organiq');
    function startBlinking(device) {
        setInterval(function() { device.toggleLed(); }, 500);
    }
    organiq.getDevice('Blinker').then(startBlinking);

Save the code as `blink-app.js`. 


### Start the Organiq Server

It is convenient to run a development version of the Organiq server locally when developing new applications. Start a new instance as follows:

    $ organiq server start
    Organiq development server v0.0.1 started on port 1340

When using a local server, it is necessary to specify its location using a configuration file in the application directory. A simple configuration file can be created like this:

    $ organiq init --local-dev
    Initialized organiq.json with API root: http://<ip-address>:1340


### Watch it Blink!

    $ npm install organiq-tessel    # Install Tessel-specific client library
    $ tessel run blink-tessel.js    # Deploy to attached Tessel
    $ node blink-app.js             # Blink the LED!


## Other Examples

See the `/examples/` directory of this package for more examples.

