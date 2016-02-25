//This is a test for the hardware setup in the organiq-raspberry example
//It polls the button as fast as it can, and writes the result to the LED

var Gpio = require('onoff').Gpio,
  led = new Gpio(14, 'out'),
  button = new Gpio(4, 'in', 'both');

led.writeSync(0);

function exit() {
  led.unexport();
  button.unexport();
  process.exit();
}

button.watch(function (err, value) {
  if (err) {
    throw err;
  }

  led.writeSync(value);
});

process.on('SIGINT', exit);
