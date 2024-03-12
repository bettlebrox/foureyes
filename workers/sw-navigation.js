//log when navigation complete
chrome.webNavigation.onCompleted.addListener((details) => {
    chrome.tabs.get(details.tabId, function (tab) {
        if (!tab || details.url == 'about:blank' ||
            details.frameType == 'sub_frame') return;
        console.log({
            'type': 'navigation', 'title': tab.title, 'tabId': details.tabId,
            'timestamp': details.timeStamp,
            'documentId': details.documentId,
            'url': details.url
        })
    })
});

//log transitiontype of navigation
chrome.webNavigation.onCommitted.addListener((details) => {
    chrome.tabs.get(details.tabId, function (tab) {
        if (!tab || details.transitionType == 'auto_subframe') return;
        console.log({
            'type': 'navigation', 'tabId': details.tabId,
            'timestamp': details.timeStamp,
            'transitionType': details.transitionType,
            'documentId': details.documentId,
            'url': details.url
        })
    })
});