// services/websocketService.js

class WebSocketService {
    constructor() {
        this.socket = null;
        this.messageCallbacks = new Map();
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.messageQueue = [];
        this.connectPromise = null;
    }

    async connect() {
        if (this.connectPromise) {
            return this.connectPromise;
        }

        if (this.socket?.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        this.connectPromise = new Promise((resolve, reject) => {
            try {
                this.socket = new WebSocket("ws://localhost:3000/ws/todos");

                this.socket.onopen = () => {
                    console.log("WebSocket connected");
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.processMessageQueue();
                    resolve();
                };

                this.socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        const callbacks = this.messageCallbacks.get(data.type) || [];
                        callbacks.forEach(callback => callback(data.data));
                    } catch (error) {
                        console.error("Error processing WebSocket message:", error);
                    }
                };

                this.socket.onclose = () => {
                    this.isConnected = false;
                    this.connectPromise = null;
                    this.handleReconnect();
                };

                this.socket.onerror = (error) => {
                    console.error("WebSocket error:", error);
                    this.isConnected = false;
                    reject(error);
                };
            } catch (error) {
                this.connectPromise = null;
                reject(error);
            }
        });

        return this.connectPromise;
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
            console.error("Max reconnection attempts reached");
        }
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.socket.send(JSON.stringify(message));
        }
    }

    subscribe(messageType, callback) {
        if (!this.messageCallbacks.has(messageType)) {
            this.messageCallbacks.set(messageType, []);
        }
        this.messageCallbacks.get(messageType).push(callback);
    }

    unsubscribe(messageType, callback) {
        if (this.messageCallbacks.has(messageType)) {
            const callbacks = this.messageCallbacks.get(messageType);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    async sendMessage(message) {
        // First ensure we're connected
        await this.connect();

        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            // Queue message if not connected
            this.messageQueue.push(message);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.isConnected = false;
            this.connectPromise = null;
        }
    }
}

// Create a singleton instance
const websocketService = new WebSocketService();

export { websocketService };