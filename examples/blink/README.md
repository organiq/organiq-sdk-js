"Hello, World!" with Organiq
----------------------------

This example demonstrates how to expose device functionality for use by remote applications using Organiq. Specifically, it shows how to expose an LED on a Tessel microcontroller and manipulate it from an external application.

Before running the example, you should start a local Organiq server and create a configuration file:

    # Start development Organiq server on default port 1340
    organiq server start
    
    # Create an organiq.json file specifying location of server
    organiq init --apiRoot http://<ip-address>:<port>/

You can then run the example like this:

    npm install organiq-tessel  # Install Tessel-specific package
    tessel run blink-tessel.js  # Start the 'Blinker' device
    node blink-app.js           # Tell it to blink!

If you don't have a Tessel, uncomment the `require('./tessel-sim')` line in blink-tessel.js and run it as a normal Node.js app:

    # ... edit blink-tessel.js to uncomment tessel-sim require, then
    node blink-tessel.js        # Start simulated 'Blinker' device
    node blink-app.js           # Tell it to blink!
