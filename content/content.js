(async () => {
    // Sends a message to the service worker and receives a tip in response
    await chrome.runtime.sendMessage({ type: 'content', title: document.title, 
    body_inner_html: JSON.stringify(document.body.innerHTML), 
    url: window.location.href, body_text: document.body.innerText });
    console.log("loaded content script")
})();
