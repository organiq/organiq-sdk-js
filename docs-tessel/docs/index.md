# Organiq on Tessel

Interact with your Tessel microcontroller from the web.

-------


### Installation

    npm install -g organiq      # application SDK, CLI, examples
    npm install organiq-tessel  # Tessel-specific lib deployed to device


### Why Organiq on Tessel?

Writing apps that interact with the real world is surprisingly easy and fun with [Tessel](http://www.tessel.io) and its [assorted modules](https://tessel.io/modules). Because it ships with Wifi, Tessel can also interface with the web in a fairly straightforward manner. But allowing an external application to do something like query the current temperature with the [climate module](https://tessel.io/modules#module-climate), or take a picture with the [camera module](https://tessel.io/modules#module-camera), is not nearly as simple and elegant as most of the other things you do on Tessel.

**Organiq makes it easy for applications to interact with Tessel-based devices over the web.** It strives for a nearly-invisible interface that lets you focus on your device and application functionality without worrying about the network plumbing.

### Show Me Some Code

Here's a Tessel program that uses Organiq to allow the device LED to be toggled from the web:

    var tessel = require('tessel');
    var organiq = require('organiq-tessel');
    organiq.registerDevice('Blinker', {
        toggleLed: function() { tessel.led[0].toggle(); }
    });

And here's a Node.js app that uses that method to blink the LED on and off once a second:

    var organiq = require('organiq');
    function startBlinking(device) {
        setInterval(function() { device.toggleLed(); }, 500); 
    }
    organiq.getDevice('Blinker').then(startBlinking);

The methods and properties you expose from your device can do whatever you want. You might activate a servo motor, or return the current humidity, or execute any other code.

See [Hello, Organiq!](hello.md) to walk through building this 'Blinker' example step-by-step.

### Contribute

Organiq on Tessel is part of the [organiq-js](https://github.com/organiq/organiq-js) project on GitHub.

* Issue Tracker: <https://github.com/organiq/organiq-js/issues>
* Source Code: <https://github.com/organiq/organiq-js>

