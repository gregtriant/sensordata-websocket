import WebSocket from 'ws';
import OS from 'os';

class SocketClient {
    constructor() {
        this.ws = null; // WebSocket instance
        this.host = null; // Host URL
        this.port = null; // Port
        this.useSSL = null; // Whether to use SSL
        this.device = null;
        this.reconnectInterval = 5000; // Reconnection interval (in ms)
        this.isReconnecting = false;

        this.sendStatusFunction = null;
        this.receivedCommandFunction = null;
        this.entityChangedFunction = null;
    }

    /**
     * Initialize the WebSocket connection.
     * @param {string} host - The host URL.
     * @param {number} port - The port to connect to.
     * @param {boolean} useSSL - Whether to use SSL (wss or ws).
     */
    init(host, port, useSSL) {
        this.host = host;
        this.port = port;
        this.useSSL = useSSL;

        const protocol = useSSL ? 'wss' : 'ws';
        const url = `${protocol}://${host}:${port}`;

        this.ws = new WebSocket(url);
        this.isReconnecting = false;
        // Event: Connection opened
        this.ws.on('open', () => {
            console.log(`Connected to ${url}`);
            let data = {
                message: "connect",
                ...this.device
            }
            this.send(data);
        });

        // Event: Message received
        this.ws.on('message', (stringData) => {
            
            // Example: Simulating different message types
            const parsedMessage = JSON.parse(stringData);
            console.log('Message received:', parsedMessage);
            const { message, data, entity, value } = parsedMessage;

            if (message === 'command' && this.receivedCommandFunction) {
                this.receivedCommandFunction(data);
            } else if (message === 'entityChanged' && this.entityChangedFunction) {
                this.entityChangedFunction(entity, value);
            } else if (message === 'askStatus' && this.sendStatusFunction) {
                this.sendStatusWithSocket();
            }
        });

        // Event: Connection closed
        this.ws.on('close', () => {
            console.log('Connection closed');
            if (this.sendStatusFunction) {
                this.sendStatusFunction('Disconnected');
            }
            this.reconnect();
        });

        // Event: Error
        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            if (this.sendStatusFunction) {
                this.sendStatusFunction(`Error: ${error.message}`);
            }
        });
    }

    /**
    * Reconnect to the WebSocket server after a delay.
    */
    reconnect() {
        if (this.isReconnecting) return;

        this.isReconnecting = true;
        console.log(`Attempting to reconnect in ${this.reconnectInterval / 1000} seconds...`);

        setTimeout(() => {
            console.log('Reconnecting...');
            this.init(this.host, this.port, this.useSSL);
        }, this.reconnectInterval);
    }

    /**
     * Set the function to handle sending status updates.
     * @param {function} func - The callback function.
     */
    setSendStatusFunction(func) {
        this.sendStatusFunction = func;
    }

    /**
     * Set the function to handle received commands.
     * @param {function} func - The callback function.
     */
    setReceivedCommandFunction(func) {
        this.receivedCommandFunction = func;
    }

    /**
     * Set the function to handle entity changes.
     * @param {function} func - The callback function.
     */
    setEntityChangedFunction(func) {
        this.entityChangedFunction = func;
    }

    setDevice(device) {
        const interfaces = OS.networkInterfaces();
        const externalIP = Object.values(interfaces)
            .flat()
            .find(item => item.family === 'IPv4' && item.internal === false);

        this.device = {
            localIP: "",
            deviceId: "",
            protocol: "ws",
            ...device
        };

        if (externalIP) {
            this.device.localIP = externalIP.address;
            this.device.deviceId = externalIP.mac;

            console.log("Client device IP:", externalIP.address);
            console.log("Client device MAC:", externalIP.mac);
        }
        else {
            console.error("No external IP found");              
        }
    }

    /**
     * Send a message through the WebSocket.
     * @param {string|object} message - The message to send (will be stringified if an object).
     */
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const messageToSend = typeof message === 'string' ? message : JSON.stringify(message);
            this.ws.send(messageToSend);
        } else {
            console.error('Cannot send message: WebSocket is not connected.');
        }
    }

    /**
     * Close the WebSocket connection and stop reconnection attempts.
     */
    close() {
        if (this.ws) {
            this.ws.close();
        }
        this.isReconnecting = false;
    }

    sendStatusWithSocket(save = false) {
        if (!this.sendStatusFunction) return;
        const status = this.sendStatusFunction();
        console.log("Sending Status!", status);
        let data = {
            message: "returningStatus",
            data: status,
            save: save
        }
        this.send(data);
    }

    sendNotification(message, data) {
        console.log("Sending Notification!", message);
        let dataToSend = {
            message: "notification",
            body: message,
            options: data
        }
        this.send(dataToSend);
    }

    sendLog(message, data) {
        console.log("Sending Log!", message);
        let dataToSend = {
            message: "@log",
            text: data,
        }
        this.send(dataToSend);
    }
}

export default SocketClient;