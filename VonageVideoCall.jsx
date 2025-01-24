/******************************************************************************
 *  Name            : Leonidas Fotis
 *  Date            : November 17, 2024
 *  Organization    : IntrasoftNetcompany
 *  Description     : Fully React Component for Managing Vonage Video Calls
 *****************************************************************************/
import { createElement, useEffect } from "react";
import { 
    MF_Call, 
    updateMendixObject
} from "./mendixHelper.jsx";
import { notifyConnections, showCustomAlert, closeCustomAlert } from "./connectionInfo.jsx"; // Updated import
import OT from "@opentok/client";
import { setupEventListeners } from "./eventListeners.jsx";

export function VonageVideoCall(props) {
    const {
        vonageTokenValue = props.vonageToken?.value,
        vonageSessionIDValue = props.vonageSessionID?.value,
        vonageApiKeyValue = props.vonageApiKey,
        vci_guid = props.VCI_GUID?.value,
        themeSelection = props.themeSelection,
        customFlowAction = props.customFlow,
        terminateFlow = props.terminateFlow,
        workFlowOffline = props.OfflineFlow,
        mxformOrigin = props.mxform || null,
        sessionEntity = props.sessionEntity,
        enableInterruption = props.enableInterruption,
        offlineAttributeName = props.offlineAttribute, 
    } = props;


    let vonageSession = null;
    let videoPublisher = null;
    const guid = vci_guid;

    const logMessage = (level, message, data = null) => {
        const logPrefix = "VRL_Main:";
        if (level === "error") console.error(`${logPrefix} ${message}`, data);
        else if (level === "warn") console.warn(`${logPrefix} ${message}`, data);
        else console.log(`${logPrefix} ${message}`, data);
    };

    const flowInterrupt = () => MF_Call(terminateFlow, guid, mxformOrigin);
    const offlineFlow = () => MF_Call(workFlowOffline, guid, mxformOrigin);

    const offline = () =>  showCustomAlert("Reconnecting", "Reconnecting to the video session. Please wait.");
    const online = () => closeCustomAlert();
    const initializeSession = () => {


        if (typeof OT === "undefined") {
            logMessage("error", "OpenTok library is not available.");
            showCustomAlert("Error", "Video call features are currently unavailable.");
            return;
        }
    
        vonageSession = OT.initSession(vonageApiKeyValue, vonageSessionIDValue);
        logMessage("info", "Vonage session initialized.");
        logMessage("info", `Initializing session with ID: ${vonageSessionIDValue}`);
        logMessage("info", `Using token: ${vonageTokenValue}`);
        logMessage("info", `mf action: ${offlineAttributeName}`);
        setupSessionEvents();
       
        connectSession();
    };

    const setupSessionEvents = () => {
        if (!vonageSession) return;

        const eventHandlers = {
            connectionCreated: () => logMessage("info", "Connection created."),
            connectionDestroyed: () => logMessage("info", "Connection destroyed."),
            streamCreated: handleStreamCreated,
            streamDestroyed: handleStreamDestroyed,
            sessionDisconnected: handleSessionDisconnected,
        };

        Object.entries(eventHandlers).forEach(([event, handler]) => {
            vonageSession.on(event, handler);
        });

   
    };


    

    const connectSession = () => {
        vonageSession.connect(vonageTokenValue, (error) => {
            if (error) {
                logMessage("error", "Error connecting to the session.", error);
            } else {
                logMessage("info", "Session connected successfully.");
                
                notifyConnections(vonageSession); // Updated to use the refactored utility
               // offlineFlow();
                startVideoPublishing();
            }
        });
    };

    const startVideoPublishing = () => {
        
        const videoPublisherOptions = {
            insertMode: "append",
            width: "100%",
            height: "100%",
            publishAudio: true,
            publishVideo: true,
        };

        if (themeSelection === "blur") {
            videoPublisherOptions.videoFilter = { type: "backgroundBlur", blurStrength: "high" };
        } else if (themeSelection === "theme") {
            videoPublisherOptions.videoFilter = { 
                type: "backgroundReplacement", 
                backgroundImgUrl: "../images/theme.jpg" 
            };
        }

        videoPublisher = OT.initPublisher("publisher-video", videoPublisherOptions, (error) => {
            if (error) logMessage("error", "Error initializing publisher.", error);
            else {
                logMessage("info", "Video publisher initialized successfully.");
                vonageSession.publish(videoPublisher);
            }
        });
    };

    const handleStreamCreated = (event) => {
        logMessage("info", `Stream created: ${event.stream.streamId}`);
      
        const subscriber = vonageSession.subscribe(
            event.stream,
            "subscriber-video",
            { insertMode: "append", width: "100%", height: "100%" },
            (error) => {
                if (error) logMessage("error", "Error subscribing to stream.", error);
                else logMessage("info", `Subscribed to stream: ${event.stream.streamId}`);
            }
        );
    };

    const handleStreamDestroyed = (event) => {
        logMessage("info", `Stream destroyed: ${event.stream.streamId}`);
    };

    const handleSessionDisconnected = () => {
        if (videoPublisher) videoPublisher.destroy();
        logMessage("info", "Session disconnected.");
       
    };

    const handleEndVideoCall = () => {
        const sessionEntityGUID = guid;
    
        if (vonageSession) {
            // Send a signal to notify about the end of the call
            vonageSession.signal(
                { type: "callEnd", data: "End call signal" },
                (error) => {
                    if (error) {
                        console.error("VRL_(MX_Lib): Error sending end call signal:", error.message);
                    } else {
                        console.log("VRL_(MX_Lib): End call signal sent successfully.");
                    }
                }
            );
    
            // Unsubscribe all subscribers before disconnecting
            vonageSession.streams.forEach((stream) => {
                const subscriber = vonageSession.getSubscribersForStream(stream)[0];
                if (subscriber) {
                    vonageSession.unsubscribe(subscriber);
                    console.log("VRL_(MX_Lib): Unsubscribed from stream:", stream.streamId);
                }
            });
    
            vonageSession.off();
            vonageSession.disconnect();
            console.log("VRL_(MX_Lib): Session disconnected successfully.");
        }
    
        if (videoPublisher) {
            videoPublisher.destroy();
            console.log("VRL_(MX_Lib): Video publisher destroyed.");
        }
    
        if (sessionEntityGUID) {
            MF_Call(customFlowAction, guid, mxformOrigin);
            console.log("VRL_(MX_Lib): Custom flow action triggered for session GUID:", sessionEntityGUID);
        }
    };
    
    
    
    window.endVideoCall = handleEndVideoCall;

    const cleanupResources = () => {
        if (videoPublisher) {
            videoPublisher.destroy();
            videoPublisher = null;
        }
        if (vonageSession) {
            vonageSession.off();
            vonageSession.disconnect();
            vonageSession = null;
        }
        logMessage("info", "Resources cleaned up.");
    };



    useEffect(() => {
        initializeSession();

        const removeEventListeners = setupEventListeners({
            enableInterruption,
            flowInterrupt,
            vonageSession,
            notifyDisconnection: () => notifyConnections(vonageSession, true),
            updateOfflineStatus: offlineFlow,
            updateMendixObject, // Pass updateMendixObject
            sessionGuid: guid, // Pass the session GUID
            sessionID: vonageSessionIDValue,
            offlineAttributeName, // Pass the attribute name for offline status
            offline, 
            online,
        });

        return () => {
            cleanupResources();
            removeEventListeners();
        };
    }, [props]);

    return null;
}

