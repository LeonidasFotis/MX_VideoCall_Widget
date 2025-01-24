/******************************************************************************
 *  Name            : Leonidas Fotis
 *  Date            : November 17, 2024
 *  Organization    : IntrasoftNetcompany
 *  Description     : Utilities for Managing Mendix Microflows, Video Calls, and Offline Notifications
 *****************************************************************************/

// Utility to call Mendix microflows
export const MF_Call = (microflowActionName, sessionEntityGUID, mxformOrigin) => {
    if (!microflowActionName || !sessionEntityGUID) {
        console.warn("VRL_(MX_Lib): Microflow action or session entity GUID is missing.");
        return;
    }

    mx.data.action({
        params: {
            applyto: "selection",
            actionname: microflowActionName,
            guids: [sessionEntityGUID]
        },
        origin: mxformOrigin,
        callback: (response) => console.log("VRL_(MX_Lib): Microflow executed successfully:", response),
        error: (error) => console.error("VRL_(MX_Lib): Error executing microflow:", JSON.stringify(error))
    });
};

export const updateMendixObject = (guid, attributeName, attributeValue, onSuccess, onError) => {
    if (!guid || !attributeName || attributeValue === undefined) {
        console.error("VRL_(MX_Lib): updateMendixObject - Invalid parameters.");
        if (onError) onError("Invalid parameters");
        return;
    }

    mx.data.get({
        guid,
        callback: (retrievedObject) => {
            if (retrievedObject) {
                console.log("VRL_(MX_Lib): Object retrieved successfully:", retrievedObject);

                // Set the attribute and its value
                retrievedObject.set(attributeName, attributeValue);
                console.log(`VRL_(MX_Lib): Updated attribute ${attributeName} with value:`, attributeValue);

                // Commit the changes
                mx.data.commit({
                    mxobj: retrievedObject,
                    callback: () => {
                        console.log("VRL_(MX_Lib): Object committed successfully!");
                        if (onSuccess) onSuccess();
                    },
                    error: (commitError) => {
                        console.error("VRL_(MX_Lib): Error committing object:", commitError);
                        if (onError) onError(commitError);
                    }
                });
            } else {
                console.warn("VRL_(MX_Lib): No object found with the specified GUID.");
                if (onError) onError("Object not found");
            }
        },
        error: (fetchError) => {
            console.error("VRL_(MX_Lib): Error retrieving object by GUID:", fetchError);
            if (onError) onError(fetchError);
        }
    });
};
