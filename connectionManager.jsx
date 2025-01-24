/****************************************************************************** 
 *  Name            : Connection Manager
 *  Date            : November 17, 2024
 *  Organization    : IntrasoftNetcompany
 *  Description     : Utility to Monitor Publisher and Subscriber Connection Status
 *****************************************************************************/

export function monitorPublisherSubscriberStatus(session) {
    if (!session) {
        console.error("Connection Manager: Vonage session is not initialized.");
        return;
    }

    let publisherConnected = false;
    let subscriberConnected = false;

    const logMessage = (level, message, data = null) => {
        const logPrefix = "VRL_(connectionManager):";
        if (level === "error") console.error(`${logPrefix} ${message}`, data);
        else if (level === "warn") console.warn(`${logPrefix} ${message}`, data);
        else console.log(`${logPrefix} ${message}`, data);
    };

    const checkConnections = () => {
        const streams = session.streams;

        publisherConnected = !!streams.find(
            (stream) => stream.connection.id === session.connection.id
        );

        subscriberConnected = streams.some(
            (stream) => stream.connection.id !== session.connection.id
        );

        if (publisherConnected && subscriberConnected) {
            logMessage("info", "Both publisher and subscriber are connected.");
        } else {
            if (!publisherConnected) {
                logMessage("warn", "Publisher is not connected.");
            }
            if (!subscriberConnected) {
                logMessage("warn", "Subscriber is not connected.");
            }
        }
    };

    // Monitor events during the session
    const setupConnectionMonitoring = () => {
        session.on("streamCreated", (event) => {
            logMessage("info", `Stream created: ${event.stream.streamId}`);
            checkConnections();
        });

        session.on("streamDestroyed", (event) => {
            logMessage("info", `Stream destroyed: ${event.stream.streamId}`);
            checkConnections();
        });

        session.on("sessionDisconnected", () => {
            logMessage("warn", "Session disconnected.");
            publisherConnected = false;
            subscriberConnected = false;
        });

        logMessage("info", "Connection monitoring set up.");
    };

    setupConnectionMonitoring();

    // Initial check
    checkConnections();

    // Return a cleanup function to remove listeners when no longer needed
    return () => {
        session.off("streamCreated");
        session.off("streamDestroyed");
        session.off("sessionDisconnected");
        logMessage("info", "Connection monitoring removed.");
    };
}
