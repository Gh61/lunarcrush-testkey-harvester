function readLCtestApiKey(sendResponse, attempt) {
    attempt = attempt || 1;
    var key = "lunar-temporary-session";
    console.log("Reading token data from localStorage (" + key + ")");
    var data = localStorage.getItem(key);

    if (data) {
        console.log("Sending response: " + data);
        sendResponse(data);

        // send response was called synchronously
        return false;
    } else {

        if (attempt > 5) {
            throw new Error("Reading token failed after " + (attempt - 1) + " attempts.");
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

        throw new Error("Unknown message from background.");
    }
);