# Hello, Organiq!

The [Hello, World!"](http://start.tessel.io/blinky) of Tessel is to blink an LED on the device. This example shows how to use Organiq to blink one of Tessel's LEDs from another application across the network.

### Setup Application Directory

If you haven't already, run 

    npm install -g organiq

to install the application SDK, command line interface (CLI), development web server, and example programs to your machine. Because it is installed globally (with `-g`), you only need to do this once.

Create a directory for the new project, and initialize NPM in it:

    mkdir blinker
    cd blinker
    npm init

(You can just press enter at each option in npm init to accept default values).

Now install the Tessel-specific Organiq library (`organiq-tessel`). This library has the same interface as the one in the core `organiq` package, but is made specifically to run in the Tessel environment.

    npm install --save organiq-tessel


### Exposing a Method to Toggle our Device's LED

Now we'll write a program to run on the Tessel that registers a new device interface with Organiq, making it possible for external applications to discover the device and invoke its methods.

    /* blink-tessel.js - This code is deployed to and run on the Tessel. */
    var tessel = require('tessel');
    var organiq = require('organiq-tessel');
    organiq.registerDevice('Blinker', {
        toggleLed: function() { tessel.led[0].toggle(); }
        });

Save this program as `blink-tessel.js`. 


### Discovering our Device and Blinking its LED

Next, we write a Node.js application that uses Organiq to locate our 'Blinker' device and invoke a method on it.

    /* blink-app.js - This is a normal Node.js application. */
    var organiq = require('organiq');
    function startBlinking(device) {
        setInterval(function() { device.toggleLed(); }, 500);
    }
    organiq.getDevice('Blinker').then(startBlinking);

Save the code as `blink-app.js`. 


### Start the Organiq Server

It is convenient to run a private development version of the Organiq web services locally when developing new applications. [It's also currently ***required*** to do so, because the public Organiq web services are not yet available.] You can start a new instance of the development server as follows:

    $ organiq server start
    Organiq development server v0.0.3 started on port 1340

When using a local server, it is necessary to configure devices and applications with the server's location. This can be done by placing an `organiq.json` file in the application directory that contains the necessary configuration.  A simple configuration file for local development can be created like this:

    $ organiq init --local-dev
    Initialized organiq.json with API root: http://<ip-address>:1340


### Watch it Blink!

At this point, you should have the following files in your blinker directory:

* **blink-tessel.js** - Tessel device exposing the toggleLed function
* **blink-app.js** - Node.js application that invokes toggleLed
* **organiq.json** - Organiq configuration file 
* **package.json** - NPM configuration file
* **node_modules/organiq-tessel/** - Tessel-specific Organiq library files

You're now ready to deploy the device code to your Tessel:

    $ tessel run blink-tessel.js

When the Tessel has connected successfully to Organiq, run the `blink-app` application to start the LED blinking:

    $ node blink-app.js

Note that while we've run the `blink-app` application from the same machine to which your Tessel is connected, that needn't be the case. As long as it can connect to the Organiq server, it can run from anywhere.
