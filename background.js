async function getCurrentTab() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

chrome.action.onClicked.addListener(async (tab) => {
    console.log("clicked");

    const currentTab = await getCurrentTab();

    const tabId = currentTab.id;

    if(currentTab.url.match("chrome://")){
        return;
    }

    try {
        chrome.scripting.executeScript({
            target: { "tabId": tabId },
            files: ["script.js"]
        });
    } catch (e) {
        console.log(e);
    }

});
