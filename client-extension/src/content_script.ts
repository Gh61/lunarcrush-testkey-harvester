/// <reference types="chrome"/>

function readStorage(key:string)
{
    console.log("[LCTKH] Reading data from localStorage (" + key + ")");
    let data = localStorage.getItem(key);
    return data;
}

function readLCtestApiKey(sendResponse:(data:any) => void, retry:number|null = null) {
    const loggedKey = "lunar-UserSettings";
    const anonymKey = "lunar-temporary-session";

    const attempt = (retry == null || retry < 1) ? 1 : retry;
    const data = readStorage(loggedKey) || readStorage(anonymKey);

    if (data) {
        console.log("[LCTKH] Sending response: " + data);
        sendResponse(data);

        // send response was called synchronously
        return false;
    } else {

        if (attempt > 5) {
            throw new Error("[LCTKH] Reading token failed after " + (attempt - 1) + " attempts.");
        }

        // reading postponed
        setTimeout(function () {
            readLCtestApiKey(sendResponse, attempt + 1);
        }, 1000);

        // sendResponse will be asynchronous
        return true;
    }
}

// Listeners
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log("[LCTKH] Message received: ");
        console.log(request);

        if (request.type == "readToken") {
            return readLCtestApiKey(sendResponse);
        }

        throw new Error("[LCTKH] Unknown message from background.");
    }
);