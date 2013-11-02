var library = require("serialport");

var serialPort = new library.SerialPort("/dev/tty.usbmodem1421", {
  baudrate: 19200,
    parser: library.parsers.readline("\n")
});

var arDrone = require('ar-drone');
var client  = arDrone.createClient();

var stdin = process.stdin;

// without this, we would only get streams once enter is pressed
stdin.setRawMode( true );

// resume stdin in the parent process (node app won't quit all by itself
// unless an error or process.exit() happens)
stdin.resume();

// i don't want binary, do you?
stdin.setEncoding( 'utf8' );

var movement = false;
var last_button_time = new Date().getTime();

    function strip(str) {
      if(str === undefined) { return str; }
      return str.replace(/\r/g, '');
    }
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
    var cButton = strip(data[6]);

    var current_time = new Date().getTime();
    if(zButton === "1") {
      if (current_time > (last_button_time + 200)) {
        movement = !movement;
      }
      last_button_time = current_time;
    }
    if(!movement){
      stop();
    } else {
      var xAmmount = mungeAnalog(analogX);
      var yAmmount = mungeAnalog(analogY);
      console.log(xAmmount);

      if (xAmmount === 0 && yAmmount === 0) {
        stop();
      } else {
        moveFront(yAmmount);
        yawRight(xAmmount);
      }

      var height = mungeAccel(accelY);
      if (height === 0) {
        stop();
      } else {
        flyUp(height);
      }
    }

  });
});

var mungeAnalog = function(analog){
  var temp = analog / 10;
  temp = temp - 12.5;
  temp = truncate(temp);
  temp = temp / 10;
  return temp;
};

//FIXME
var mungeAccel = function(accel){
  if(accel > 400 && accel < 600) {
    return 0;
  }
  var temp = accel / 20;
  temp = temp - 25;
  temp = truncate(temp);
  temp = temp / 10;
  offset = (temp < 0) ? 0.5 : -0.5;
  temp = temp + offset;
  return temp;
};

var truncate = function(n){
  return Math[n > 0 ? "floor" : "ceil"](n);
};

// on any data into stdin
stdin.on( 'data', function( key ){
  // ctrl-c ( end of text )
  if ( key === '\u0003' ) {
    console.log("stopping");
    droneOff();
    process.exit();
  }

  var output = '-';
  // write the key to stdout all normal like

  switch(key) {
  case '0':
    output = droneOn();
    break;

  case '9':
    output = droneOff();
    break;

  case 's':
    output = stop();
    break;
  default:
    output = '-';
  }
  if(output != "-") {
    process.stdout.write( "Pressed: " + output + '\n');
  }

});


var rotRate = 0.25;
var horzRate = 0.2;
var vertRate = 0.1;

function yawRight(val){
  client.clockwise(val);
  console.log("moving CCW: " + val);
  return "Rot CCW";
}

function moveFront(val){
  client.front(val);
  console.log("moving front: " + val);
  return "Move Forward";
}

function moveRight(val){
  client.left(val);
  console.log("moving right: " + val);
  return "Move Left";
}

function flyUp(val){
  client.up(val);
  return "Fly Up";
}

function droneOn(){
  console.log("Launch drone");
  client.takeoff();
  return "Launch drone";
}

function droneOff(){
  console.log("Land drone");
  client.land();
  return "Land the drone";
}

function stop(){
  client.stop();
  console.log("stopping...");
  return "Stop the drone";
}

/////////////////////////////////////////////////////////////////////
//PICTURES
