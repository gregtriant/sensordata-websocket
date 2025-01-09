import SocketClient from '../index.js';
import si from 'systeminformation';
import { execSync } from 'child_process';
// init .env
import dotenv from 'dotenv';
dotenv.config("../.env");

const sensordataClient = new SocketClient();

let intervalId = 0;

// status object that will be sent to the server
// flat array of numbers and/or strings
let status = {
    cpuPercentage: 0,
    cpuCores: 0,
    memoryBytes: 1,
    memoryBytesMax: 1,
    diskBytes: 1,
    diskBytesMax: 1,
    commandResult: "",
};

let configuration = {
    interval: 10000
};

function updateStatus() {

    // cpu
    si.currentLoad().then(data => {
        status.cpuPercentage = data.currentLoad;
        status.cpuCores = data.cpus.length;
    });

    // memory
    si.mem().then(data => {
        status.memoryBytes = data.used;
        status.memoryBytesMax = data.total;
    });

    // disk
    si.fsSize().then(data => {
        status.diskBytes = data[0].used;
        status.diskBytesMax = data[0].size;
    });

}

function sendStatus() {
    updateStatus();
    return status; // you need to return the status object
}

// expects a JSON object
// setInterval -> {"name": "setInterval", value: 1000}
// executeTerminalCommand -> {"name": "executeTerminalCommand", "value": "New-Item -Name \"test01.txt\" -ItemType File"}
function receivedCommand(command) {

    let cmd;
    try {
        cmd = JSON.parse(command);
    } catch (e) {
        console.error("Invalid JSON command received:", command);
        return;
    }
    console.log(`Parsed command: ${cmd}`);

    if (cmd.name === "setInterval") {
        configuration.interval = cmd.value;
        clearInterval(intervalId);
        intervalId = setInterval(() => {
            sensordataClient.sendStatusWithSocket(false);
        }, configuration.interval);
    }
    if (cmd.name === "executeTerminalCommand") {
        let result = execSync(cmd.value, {'shell':'powershell.exe'}, (error, stdout, stderr)=> {
            console.log(error);
            console.log(stdout);
            console.log(stderr);
        });

        status.commandResult = result.toString();
    }

    sensordataClient.sendStatusWithSocket(false); // this will send status back everytime a command is received
}

function entityChanged(entity, value) {
    console.log(`Entity "${entity}" changed to ${value}`);
    if (entity === "led") {
        status.led = value;
    } else if (entity === "count") {
        status.count = value;
    }
    sensordataClient.sendStatusWithSocket(false); // this will send status back everytime a command is received
}

function main() {
    const device = {
        deviceApp: "Example JS device",
        version: "3.01",
        deviceType: "PC",
        token: process.env.DEVICE_TOKEN,
    }
    
    sensordataClient.setSendStatusFunction(sendStatus);
    sensordataClient.setReceivedCommandFunction(receivedCommand);
    sensordataClient.setEntityChangedFunction(entityChanged);

    sensordataClient.setDevice(device);
    sensordataClient.init("api.sensordata.space", 443, true);

    // this will send status to the server every 10 seconds
    setInterval(() => {
        sensordataClient.sendStatusWithSocket(true);
    }, configuration.interval);

}

main();