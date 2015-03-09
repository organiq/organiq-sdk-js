Handling Events with Organiq
----------------------------

This example demonstrates how a client application can listen for events raised by a remote device. The Tessel application registers local event handlers that are invoked with the Config button on the Tessel is pressed, and it exposes those events to clients.

Before running the example, you should start a local Organiq server and create an `organiq.json` configuration file:

    # Start development Organiq server on default port 1340
    organiq server start
    
    # Create an organiq.json file specifying location of server
    organiq init --local-dev

You can then run the example like this:

    npm install organiq-tessel  # Install Tessel-specific package
    tessel run event-tessel.js  # Start the 'EventDevice' device
    node event-app.js           # Listen for button press events

If you don't have a Tessel, uncomment the `require('./tessel-sim')` line in blink-tessel.js and run it as a normal Node.js app:

    # ... edit blink-tessel.js to uncomment tessel-sim require, then
    node blink-tessel.js        # Start simulated 'Blinker' device
    node blink-app.js           # Tell it to blink!
