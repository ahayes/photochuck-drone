var library = require("serialport");


var serialPort = new library.SerialPort("/dev/tty.usbmodem1421", {
  baudrate: 19200,
  parser: library.parsers.readline("\n")
});

serialPort.on("open", function () {
  console.log('open');
  serialPort.on('data', function(raw_data) {
    var data = raw_data.split(" ");
    var analogX = data[0];
    var analogY = data[1];
    var accelX = data[2];
    var accelY = data[3];
    var accelZ = data[4];
    var zButton = data[5];
    var cButton = data[6];

    //var x = mungeAnalog(analogX);
    //var y = mungeAnalog(analogY);
    //console.log("x: " + x + " y: " + y);
    console.log(mungeAccel(accelX));
  });
});

var mungeAnalog = function(analog){
    var temp = analog / 10;
    temp = temp - 12.5;
    temp = truncate(temp);
    temp = temp / 10;
    return temp;
};

var mungeAccel = function(accel){
  var temp = accel / 20;
  temp = temp - 25;
  temp = truncate(temp);
  temp = temp / 10;
  return temp;
};

var truncate = function(n){
  return Math[n > 0 ? "floor" : "ceil"](n);
};
