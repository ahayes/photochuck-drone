var library = require("serialport");



var serialPort = new library.SerialPort("/dev/tty.usbmodem1411", {
  baudrate: 19200,
  parser: library.parsers.readline("\n")
});




var arDrone = require('ar-drone');
var client  = arDrone.createClient();

//client.takeoff();



var stdin = process.stdin;

// without this, we would only get streams once enter is pressed
stdin.setRawMode( true );

// resume stdin in the parent process (node app won't quit all by itself
// unless an error or process.exit() happens)
stdin.resume();

// i don't want binary, do you?
stdin.setEncoding( 'utf8' );

var movable = true;
var last_button_time = new Date().getTime();
var last_button = false;

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

    var current_time = new Date().getTime();
    if(zButton === "1")
    {
      if (current_time > (last_button_time + 200))
      {
        movable = !movable;
      }
      last_button_time = current_time;
    }


    var xAmmount = mungeAnalog(analogX);
    var yAmmount = mungeAnalog(analogY);


    if (!movable || (xAmmount === 0 && yAmmount === 0))
    {
        stop();
    }
    else
    {
      moveFront(yAmmount);
      yawRight(xAmmount);
    }


    //var x = mungeAnalog(analogX);
    //var y = mungeAnalog(analogY);
    //console.log("x: " + x + " y: " + y);
    //console.log(mungeAccel(accelX));
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

  switch(key)
  {
    case 'w':
      output = moveFront();
      break;

    case 'x':
      output = moveBack();
      break;

    case 'a':
      output = moveLeft();
      break;

    case 'd':
      output = moveRight();
      break;


  case 'i':
      output = flyUp();
      break;

    case 'k':
      output = flyDown();
      break;

    case 'j':
      output = yawLeft();
      break;

    case 'l':
      output = yawRight();
      break;


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



  if(output != "-")
  {
    process.stdout.write( "Pressed: " + output + '\n');
  }


});








var rotRate = 0.25;
var horzRate = 0.2;
var vertRate = 0.1;

function yawLeft(val){ client.counterClockwise(rotRate); return "Rot CW"; }

function yawRight(val){ client.clockwise(val); console.log("moving CCW: " + val); return "Rot CCW"; }

function moveFront(val){ client.front(val); console.log("moving front: " + val); return "Move Forward"; }

function moveBack(val){ client.back(horzRate); return "Move Backward"; }

function moveLeft(val){ client.left(horzRate); return "Move Left"; }

function moveRight(val){ client.right(horzRate); return "Move Right"; }

function flyUp(val){ client.up(vertRate); return "Fly Up"; }

function flyDown(val){ client.down(vertRate); return "Fly Down"; }


function droneOn(){ client.takeoff(); return "Launch drone"; }

function droneOff(){ client.land(); return "Land the drone"; }


function stop(){ client.stop(); console.log("stopping..."); return "Stop the drone"; }



/////////////////////////////////////////////////////////////////////
//PICTURES
