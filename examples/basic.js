import SocketClient from '../index.js';
import dotenv from 'dotenv';
dotenv.config("../.env");

const sensordataClient = new SocketClient(); // this should be global

// status object that will be sent to the server
// flat json object of numbers | strings | booleans
let status = {
    message: "hello world",
    count: 0,
    led: false,
};

function sendStatus() {
    // here you can modify the status object
    // and then return it
    return status;
}

function receivedCommand(command) {
    console.log(`Received command: ${command}`);
    if (command === "increment") {
        status.count++;
    } else if (command === "decrement") {
        status.count--;
    }
    // (optional) send status back everytime a command is received
    const saveToDB = false;
    sensordataClient.sendStatusWithSocket(saveToDB);
}

function entityChanged(entity, value) {
    console.log(`Entity "${entity}" changed to ${value}`);
    if (entity === "led") {
        status.led = value;
    }
    // (optional) send status back everytime am entity changes
    const saveToDB = false;
    sensordataClient.sendStatusWithSocket(saveToDB);
}

function main() {
    const device = {
        deviceApp: "Example JS device",
        version: "1.0.0",
        deviceType: "PC",
        token: process.env.DEVICE_TOKEN,
    }
    
    sensordataClient.setSendStatusFunction(sendStatus);
    sensordataClient.setReceivedCommandFunction(receivedCommand);
    sensordataClient.setEntityChangedFunction(entityChanged);

    sensordataClient.setDevice(device);
    sensordataClient.init("api.sensordata.space", 443, true);

    // (optional) This will send status to the server every 10 seconds
    setInterval(() => {
        const saveToDB = false;
        sensordataClient.sendStatusWithSocket(saveToDB);
    }, 10 * 1000);

}

main();