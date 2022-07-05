// set up inlets/outlets/assist strings
inlets = 1;
outlets = 1;

setinletassist(0,"MIDI Pitch, Velocity, Channel");
setoutletassist(0,"MIDI Pitch, Velocity, Channel");

var args = [];

function sendToOutlet(outletNum, value){
 outlet(outletNum,value)	
}

function list()
{
	var args = arrayfromargs(arguments);
	post("received list " + args + "\n");
	sendToOutlet(0, args)
	var differentNote = [args[0] + 2, args[1], args[2]]
	sendToOutlet(0, differentNote)
}