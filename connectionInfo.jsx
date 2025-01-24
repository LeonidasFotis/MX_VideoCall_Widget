/****************************************************************************** 
 *  Name            : Connection Manager
 *  Date            : November 17, 2024
 *  Organization    : IntrasoftNetcompany
 *  Description     : Utility to Log Publisher and Subscriber Connection Status
 *****************************************************************************/

// Utility to parse connection data
const parseConnectionData = (data) => {
    if (!data) return {};
    return Object.fromEntries(new URLSearchParams(data).entries());
};

// Utility to log detailed connection information
const logConnectionInfo = (connections, logType = "Current Connections") => {
    if (!Array.isArray(connections) || connections.length === 0) {
        console.log(`VRL_(Connection Info): No ${logType.toLowerCase()} found.`);
        return;
    }

    connections.forEach((connection) => {
        const parsedData = parseConnectionData(connection.data);
        console.log(`VRL_(Connection Info): ${logType}`, {
            connectionId: connection.connectionId,
            data: parsedData,
            creationTime: connection.creationTime,
            destroyed: connection.destroyed || false, // If connection is destroyed
            destroyedReason: connection.destroyedReason || "N/A", // Reason for disconnection
            capabilities: connection.capabilities || {}, // Connection capabilities
            permissions: connection.permissions || {}, // Connection permissions
            quality: connection.quality || "Unknown", // Connection quality
            allKeys: Object.keys(connection), // All keys for debugging
        });
    });
};

// Utility to fetch and log connections
export const notifyConnections = (vonageSession, isDisconnected = false) => {
    if (!vonageSession || !vonageSession.isConnected()) {
        console.warn(`VRL_(Connection Info): Unable to fetch ${isDisconnected ? "disconnected" : "connected"} connections - session is not connected.`);
        return;
    }

    const connections = vonageSession.connections || [];
    logConnectionInfo(connections, isDisconnected ? "Disconnected Connections" : "Current Connections");
};

// Utility to log all subscribers in a session
export const notifySubscribers = (subscribers, vonageSession) => {
    if (!vonageSession || !vonageSession.isConnected()) {
        console.warn("VRL_(Connection Info): Unable to fetch subscribers - session is not connected.");
        return;
    }

    console.log("VRL_(Connection Info): Fetching current subscribers...");

    if (!Array.isArray(subscribers) || subscribers.length === 0) {
        console.log("VRL_(Connection Info): No active subscribers found.");
        return;
    }

    subscribers.forEach((subscriber) => {
        console.log("VRL_(Connection Info): Subscriber Info", {
            subscriberId: subscriber.id, // Unique subscriber ID
            streamId: subscriber.stream?.streamId || "Unknown", // Stream the subscriber is subscribed to
            connectionId: subscriber.stream?.connection?.connectionId || "Unknown", // Associated connection ID
            streamName: subscriber.stream?.name || "Unnamed Stream", // Stream name
            subscriberProperties: subscriber.properties || {}, // Additional properties
        });
    });
};

export const getAlertElements = () => ({
    alertTitle: document.getElementById('alertTitle'),
    alertMessage: document.getElementById('alertMessage'),
    customAlert: document.getElementById('customAlert'),
    alertOverlay: document.getElementById('alertOverlay'),
});

export const showCustomAlert = (title = '', message = '') => {
    const { alertTitle, alertMessage, customAlert, alertOverlay } = getAlertElements();

    if (customAlert && alertOverlay) {
        if (alertTitle) alertTitle.textContent = title;
        if (alertMessage) alertMessage.textContent = message;

        customAlert.style.display = 'block';
        alertOverlay.style.display = 'block';
    } else {
        console.error('VRL_(Connection Info): Custom alert elements not found in the DOM.');
    }
};

export const closeCustomAlert = () => {
    const { customAlert, alertOverlay } = getAlertElements();

    if (customAlert && alertOverlay) {
        customAlert.style.display = 'none';
        alertOverlay.style.display = 'none';
    } else {
        console.error('VRL_(Connection Info): Custom alert elements not found in the DOM.');
    }
};
