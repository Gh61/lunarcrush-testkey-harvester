import { TokenHarvester } from "./token-harvester";

function showMessage(message: string, title: string) {
    const messageId = "AlertNotification";

    chrome.notifications.clear(messageId);
    chrome.notifications.create(
        messageId,
        {
            type: "basic",
            iconUrl: "img/icon-48.png",
            title: title,
            message: message
        }
    );
}

function onTokenReadCallback(success: boolean, token: string | null, error: string | null) {
    if (success) {
        showMessage(token + "", "Token found");
        console.log("[BG TokenRead]: Token found: " + token);
    } else {
        showMessage(error + "", "ERROR");
        console.error("[BG TokenReadError]: " + error + "; Details folow:");
        console.error(error);
    }
}

var harvester = new TokenHarvester(onTokenReadCallback);

chrome.action.onClicked.addListener(() => {
    harvester.tryReadToken();
});
