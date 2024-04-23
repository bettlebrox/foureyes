(async () => {
    html2canvas(document.body,{allowTaint:true, useCORS:true, foreignObjectRendering: true}).then(function(canvas) {
        // Export the canvas to its data URI representation
       chrome.runtime.sendMessage({ type: 'content', title: document.title, 
       body_inner_html: JSON.stringify(document.body.innerHTML), 
       url: window.location.href, body_text: document.body.innerText, image: canvas.toDataURL("image/jpeg", 0.5) });
       console.log("loaded content script")
      });
    // Sends a message to the service worker and receives a tip in response

})();
