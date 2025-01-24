// Track active subscribers
let activeSubscribers = new Set();

// Guard for listener initialization
let listenersInitialized = false;

// Helper function to safely retrieve connections from Vonage session
const getConnections = (vonageSession) => {
    if (!vonageSession || !vonageSession.connections) {
        console.log("VRL_(Listeners): Vonage session is not properly initialized.");
        return [];
    }

    try {
        if (Array.isArray(vonageSession.connections)) {
            return vonageSession.connections;
        } else if (vonageSession.connections instanceof Map) {
            return Array.from(vonageSession.connections.values());
        } else if (typeof vonageSession.connections === "object") {
            return Object.values(vonageSession.connections);
        } else {
            console.log("VRL_(Listeners): Unknown connections format.");
            return [];
        }
    } catch (error) {
        console.error("VRL_(Listeners): Error normalizing connections:", error);
        return [];
    }
};

// Check if participants are online in the Vonage session
const checkParticipantOnlineStatus = async (vonageSession) => {
    try {
        const connections = getConnections(vonageSession);

        if (connections.length === 0) {
            console.log("VRL_(Listeners): No active participants found.");
            activeSubscribers.clear();
            return false;
        }

        const nonPublisherConnections = connections.filter(
            (connection) => connection.role && connection.role !== "publisher"
        );

        if (nonPublisherConnections.length > 0) {
            console.log(`VRL_(Listeners): Active non-publisher participants found (${nonPublisherConnections.length}).`);
            activeSubscribers = new Set(nonPublisherConnections.map((conn) => conn.connectionId));

            nonPublisherConnections.forEach((connection) => {
                console.log("VRL_(Listeners): Participant ID:", connection.connectionId);
            });

            return true;
        } else {
            console.log("VRL_(Listeners): No active non-publisher participants found.");
            activeSubscribers.clear();
            return false;
        }
    } catch (error) {
        console.error("VRL_(Listeners): Error checking participant status:", error);
        activeSubscribers.clear();
        return false;
    }
};

// Main Event Listener Setup
export const setupEventListeners = ({
    enableInterruption,
    flowInterrupt,
    vonageSession,
    notifyDisconnection,
    updateMendixObject,
    sessionGuid,
    offlineAttributeName,
    offline,
    online,
}) => {
    if (listenersInitialized) {
        console.log("VRL_(Listeners): Listeners already initialized, skipping setup.");
        return () => {};
    }

    listenersInitialized = true;

    // Event Handlers
    const handleOffline = () => {
        console.log("VRL_(Listeners): Network connection lost. User is offline.");
        notifyDisconnection(vonageSession);
        offline();

        updateMendixObject(
            sessionGuid,
            offlineAttributeName,
            true, // Assuming true indicates the offline state
            () => {
                console.log(`VRL_(Listeners): Offline status updated successfully for GUID: ${sessionGuid}`);
            },
            (error) => {
                console.error(`VRL_(Listeners): Failed to update offline status for GUID: ${sessionGuid}`, error);
            }
        );

        if (sessionGuid && offlineAttributeName) {
            document.body.classList.add("offline");
           
            const statusMessageElement = document.getElementById("status-message");
            if (statusMessageElement) {
                statusMessageElement.textContent = "You are currently offline.";
            }
            console.log("VRL_(Listeners): Offline status updated in the UI.");
        } else {
            console.error("VRL_(Listeners): Missing parameters for offline handling.");
        }
    };

    const handleOnline = async () => {
        console.log("VRL_(Listeners): Network connection restored. Checking participant status...");
       
        document.body.classList.remove("offline");
        const statusMessageElement = document.getElementById("status-message");
        if (statusMessageElement) {
            statusMessageElement.textContent = "You are back online!";
        }
        console.log("VRL_(Listeners): Online status updated in the UI.");
        flowInterrupt();
    };

    const handleVisibilityChange = () => {
        if (document.hidden) {
            flowInterrupt();
            console.log("VRL_(Listeners): Visibility change detected. Flow interrupted.");
        }
    };

    // Vonage Session Handlers
    vonageSession.on({
        connectionCreated: (event) => {
            console.log(`VRL_(Listeners): Connection created: ${event.connection.connectionId}`);
            activeSubscribers.add(event.connection.connectionId);
        },
        connectionDestroyed: (event) => {
            console.log(`VRL_(Listeners): Connection destroyed: ${event.connection.connectionId}`);
            activeSubscribers.delete(event.connection.connectionId);
        },
        sessionReconnecting:  () => {
            console.log("VRL_(Listeners): Session reconnecting. Updating UI...");
            document.body.classList.add("offline");
            const statusMessageElement = document.getElementById("status-message");
            if (statusMessageElement) {
                statusMessageElement.textContent = "Reconnecting...";
            }

            // Check participant status during reconnection
            //await checkParticipantOnlineStatus(vonageSession);
        },
        sessionReconnected: () => {
            
            console.log("VRL_(Listeners): Session reconnected. Restoring UI...");
            document.body.classList.remove("offline");
            const statusMessageElement = document.getElementById("status-message");
            if (statusMessageElement) {
                statusMessageElement.textContent = "Connection restored!";
            }

            online();
        },
    });

    // Add Listeners
    if (enableInterruption) {
        document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("beforeunload", flowInterrupt);

    console.log("VRL_(Listeners): Event listeners initialized.");

    // Cleanup Function
    return () => {
        if (!listenersInitialized) return;

        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("beforeunload", flowInterrupt);
        if (enableInterruption) {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        }

        listenersInitialized = false;
        console.log("VRL_(Listeners): Event listeners removed during cleanup.");
    };
};
