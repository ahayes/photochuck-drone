var log = true;
var fs = require('fs');

var library = require("serialport");

var serialPort = new library.SerialPort("/dev/tty.usbmodem1421", {
  baudrate: 19200,
    parser: library.parsers.readline("\n")
});

var arDrone = require('ar-drone');
var client  = arDrone.createClient();

var autonomy = require('ardrone-autonomy');

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
var write_picture = false;

arDrone.createClient().getPngStream()
  .on('error', console.log)
  .on('data', function(pngBuffer) {
    if(write_picture){
      write_picture = false;
      fs.writeFile('message.png', pngBuffer, function (err) {
        if (err) throw err;
      });
    }
  });

serialPort.on("open", function () {
  console.log('open');
  serialPort.on('data', function(raw_data) {
    var data = raw_data.split(" ");
    var accelZ = data[4];
    var zButton = data[5];
    var cButton = strip(data[6]);

    var xAmmount = mungeAnalog(data[0]);
    var yAmmount = mungeAnalog(data[1]);
    var strafe = mungeAccel(data[2]);
    var height = mungeAccel(data[3]);

    if(cButton === "1") {
      var now = new Date().getTime();
      if(now > (last_button_time + 2000)){
        //take a picture
        console.log("smile!");
        write_picture = true;
      }
      last_button_time = now;
    }

    if(zButton === "1") {
      if (xAmmount === 0 && yAmmount === 0 && height === 0 && strafe === 0) {
        stop();
      } else {
        flyUp(height);
        moveRight(strafe);
        moveFront(yAmmount);
        yawRight(xAmmount);
      }
    } else {
      if (xAmmount === 0 && yAmmount === 0) {
        stop();
      } else {
        moveFront(yAmmount);
        yawRight(xAmmount);
      }
    }

  });
});

var strip = function(str) {
  if(str === undefined) { return str; }
  return str.replace(/\r/g, '');
};

var mungeAnalog = function(analog){
  var temp = analog / 10;
  temp = temp - 12.5;
  temp = truncate(temp);
  temp = temp / 10;
  return temp;
};

var mungeAccel = function(accel){
  //from 300 to 700
  if(accel > 420 && accel < 580) {
    return 0;
  } else if (accel <= 420) {
    //from 300 to 420 (highest to lowest)
    temp = accel / 10;
    //from 30 to 42
    temp = temp - 30;
    //from 0 to 12
    temp = temp / 1.2;
    //from 0 to 10
    temp = Math.round(temp);
    //from 0 to 1
    temp = temp / 10;
    //invert
    temp = - (1 - temp);
    return -temp;
  } else {
    //from 580 to 700 (highest to lowest)
    temp = accel / 10;
    //from 58 to 70
    temp = temp - 58;
    //from 0 to 12
    temp = temp / 1.2;
    //from 0 to 10
    temp = Math.round(temp);
    //from 0 to 1
    temp = temp / 10;
    return -temp;
  }
};

var truncate2 = function(n){
  return parseInt(("" + n).substring(0,3), 10);
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
  if(log) { console.log("moving CCW: " + val); }
  return "Rot CCW";
}

function moveFront(val){
  client.front(val);
  if(log) { console.log("moving front: " + val); }
  return "Move Forward";
}

function moveRight(val){
  client.left(val);
  if(log) { console.log("moving right: " + val); }
  return "Move Left";
}

function flyUp(val){
  if(log) { console.log("Fly up: " + val); }
  client.up(val);
  return "Fly Up";
}

function droneOn(){
  if(log) { console.log("Launch drone"); }
  client.takeoff();
  client.stop();
  return "Launch drone";
}

function droneOff(){
  if(log) { console.log("Land drone"); }
  client.land();
  return "Land the drone";
}

function stop(){
  client.stop();
  //console.log("stopping...");
  return "Stop the drone";
}

/////////////////////////////////////////////////////////////////////
//PICTURES
