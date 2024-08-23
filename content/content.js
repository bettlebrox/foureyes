(async () => {
  chrome.runtime.sendMessage({ type: 'content', title: document.title, 
    body_inner_html: JSON.stringify(document.body.innerHTML), 
    url: window.location.href, body_text: document.body.innerText });
    console.log("loaded content script");
})();
window.addEventListener("message", function(event) {
    // Only accept messages from the same origin
    if (event.source != window) return;
  
    if (event.data.type && (["setItem","removeItem","clear"].includes(event.data.type))) {
      console.debug("Content script received: " + event.data.key + " " + event.data.value);
      chrome.runtime.sendMessage({ type: 'authStorage', method:event.data.type, key: event.data.key, value: event.data.value });
    } else if (event.data.type && (event.data.type == 'auth')) {
      console.debug("Content script received : " + event.data.key);
      chrome.runtime.sendMessage({ type: 'auth', event: event.data.event });
    }
  });
  