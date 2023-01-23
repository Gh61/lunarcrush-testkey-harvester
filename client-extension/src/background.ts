import { TokenHarvester, TokenReadResult } from "./token-harvester";

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

function onTokenReadCallback(result: TokenReadResult) {
    if (result.success) {
        if (result.isLogged) {
            showMessage(result.token + "", "Token found");
        } else {
            showMessage(result.token + "", "Token found [WARNING: Not logged]");
        }
        console.log(`[BG TokenRead]: Token found: ${result.token} (logged: ${result.isLogged})`);
    } else {
        showMessage(result.error + "", "ERROR");
        console.error(`[BG TokenReadError]: ${result.error}; Details folow:`);
        console.error(result.error);
    }
}

var harvester = new TokenHarvester(onTokenReadCallback);

chrome.action.onClicked.addListener(() => {
    harvester.tryReadToken();
});
