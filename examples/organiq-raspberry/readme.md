


#Install Node


$ sudo apt-get install node
$ node -v


#Install Organiq
https://github.com/organiq/organiq-sdk-js


$ npm init

$ npm install --save organiq          # install into your project, if this 
                                      #isn't an npm project, omit the '--save'
$ npm install --global organiq-cli    # install the command line interface
$ organiq register                    # register an Organiq account
$ organiq generate-api-key --global   # get an API key 


#Install Onoff
https://github.com/fivdi/onoff



$ npm install onoff
  
  There are other options for GPIO access out there on npm, but this one 
  is the best updated as of Feb 2016.


### Notes about using onoff

  Most of the pins have a default pullup/pulldown resistor enabled, depending 
  on which pin, I recommend selecting a pin that has the appropriate default 
  for your needs. 
  
  You can find the default settings in Table 6-31 on pages 102 and 103 of the
  BCM2835 ARM Peripherals documentation [here.](https://www.raspberrypi.org/wp-content/uploads/2012/02/BCM2835-ARM-Peripherals.pdf) 
  
  
  You can change this from default to opposite or float, but it's not as easy
  as you'd think. It involves loading another module through npm and to using 
  a device tree overlay to apply changes to the kernel's internal device tree 
  representation. 
  
  You can find instructions on how to do this [here](https://github.com/fivdi/onoff/wiki/Enabling-Pullup-and-Pulldown-Resistors-on-The-Raspberry-Pi) 
  
  
  
#Simple Device Setup

```javascript
var device = {
  getButtonState : function() { /*console.log('returning false');*/ return _pressed; },
  getLEDState : function() { /*console.log('returning false');*/ return _led; },
  ledOn: function() { _led = 0; writeLED();/*this.emit('ledPress', true); return _led; */},
  ledOff: function() { _led = 1; writeLED();/*this.emit('ledRelease', false); return _led; */}
};
```

  
