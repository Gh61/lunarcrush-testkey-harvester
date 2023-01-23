/// <reference types="chrome"/>

import { retryOperation } from "./utils";

export type TokenReadResult = { success:boolean, isLogged:boolean, token: string | null, error: any | null }

export type OnTokenReadCallback = (result:TokenReadResult) => void;

export class TokenHarvester {
    private static readonly _lcApiPageUrl = "https://lunarcrush.com/developers/api/coins";
    private static readonly _lcPageLoadMaxRetries = 3;
    private static readonly _lcPageLoadTimeout = 5000; // ms

    private readonly _onTokenGet: OnTokenReadCallback;

    constructor(onTokenGet: OnTokenReadCallback) {
        this._onTokenGet = onTokenGet;
    }

    /**
     * Will open and read lunarcrush testing api key.
     * Will fire callback passed in ctor of this object.
     */
    public tryReadToken() {
        let openedTab: chrome.tabs.Tab;

        this.openApiCoinsTab()
            .then(tab => openedTab = tab)
            .then(tab => this.ensureApiCoinsUrl(tab))
            .then(tab => this.harvestApiToken(tab))
            .then(result => this._onTokenGet(result))
            .catch(error => this._onTokenGet(this.createFailedTokenRead(error)))
            .finally(() => {
                if (openedTab != null) {
                    chrome.tabs.remove(openedTab.id ?? -1);
                }
            })
    }

    private createSuccessTokenRead(token:string, isLogged:boolean):TokenReadResult{
        return {
            success: true,
            token: token,
            isLogged: isLogged,
            error: null
        }
    }

    private createFailedTokenRead(error:any):TokenReadResult{
        return {
            success: false,
            token: null,
            isLogged: false,
            error: error
        };
    }

    /**
     * Will open new tab on LC API-Coins documentation and wait for the load.
     */
    private async openApiCoinsTab(): Promise<chrome.tabs.Tab> {
        const tab = await chrome.tabs.create({ url: TokenHarvester._lcApiPageUrl });
        return await this.waitForTabLoad(tab, TokenHarvester._lcPageLoadTimeout);
    }

    /**
     * Will wait for tab to load and then will fire @param onLoad callback.
     */
    private waitForTabLoad(tab: chrome.tabs.Tab, timeoutMs: number): Promise<chrome.tabs.Tab> {
        return new Promise((resolve, reject) => {

            const listener = function (tabId: number, info: chrome.tabs.TabChangeInfo) {
                if (info.status === 'complete' && tabId === tab.id) {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve(tab);
                }
            }

            chrome.tabs.onUpdated.addListener(listener);

            setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                reject(tab);
            }, timeoutMs);
        });
    }

    /**
     * Will change url of tab and than @see waitForTabLoad.
     */
    private setUrlAndWaitForTabLoad(tab: chrome.tabs.Tab, newUrl: string, timeoutMs: number): Promise<chrome.tabs.Tab> {
        tab.url = newUrl;
        return this.waitForTabLoad(tab, timeoutMs);
    }

    /** Will ensure, that given tab is on LC API-Coins page url. */
    private ensureApiCoinsUrl(tab: chrome.tabs.Tab): Promise<chrome.tabs.Tab> {
        const self = this;
        let attempt = 1;

        function tryToResolve(): Promise<chrome.tabs.Tab> {
            return new Promise((resolve, reject) => {
                // we're already there, resolve promise
                if (tab.url == TokenHarvester._lcApiPageUrl) {
                    resolve(tab);
                    return;
                }

                console.log("Redirecting to api url (attempt: " + attempt + ")");

                self.setUrlAndWaitForTabLoad(tab, TokenHarvester._lcApiPageUrl, TokenHarvester._lcPageLoadTimeout)
                    .then(() => {

                        // after load it's the right URL
                        if (tab.url == TokenHarvester._lcApiPageUrl) {
                            resolve(tab);
                        } else {
                            // we've been redirected again
                            reject("Loaded url is different than requested (" + tab.url + " != " + TokenHarvester._lcApiPageUrl + ")")
                        }
                    })
                    .catch(e => reject(e));
            });
        }

        return retryOperation<chrome.tabs.Tab>(tryToResolve, 100, TokenHarvester._lcPageLoadMaxRetries);
    }

    private harvestApiToken(tab: chrome.tabs.Tab): Promise<TokenReadResult> {
        return new Promise((resolve, reject) => {
            console.log("[Harvest] Sending message to content_script (tabId:" + tab.id + ").");

            chrome.tabs.sendMessage(tab.id ?? -1, { type: "readToken" })
                .then(data => {

                    if (!data) {
                        reject("[Harvest] No data received from content_script.");
                        return;
                    }

                    // Example of parsed data:
                    // Logged: '{"signedIn":true,"token":"XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX","theme":"dark","locale":"en-US","currency":"USD","exchangeRate":1,"lowPowerMode":false,"level":1,"role":"user"}'
                    // Anonym:       '{"seed":37,"token":"XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"}'

                    let parsedData = { token: '', signedIn: false };
                    try {
                        parsedData = JSON.parse(data);
                    }
                    catch (ex) {
                        reject(ex);
                        return;
                    }

                    if (typeof parsedData.token == "string" && parsedData.token) {
                        const isLogged = typeof parsedData.signedIn == "boolean" && parsedData.signedIn;

                        // token found
                        resolve(this.createSuccessTokenRead(parsedData.token, isLogged))
                    } else {
                        reject("[Harvest] No token found in '" + data + "'.");
                    }
                })
                .catch(error => {
                    reject(error);
                });
        });
    }
}