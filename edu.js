(function() {
    const userInput = prompt("Please type one of the following:\n'a' = about:blank\n'b' = blob cloaking\n'm' = current tab iframe\n'ac' = about:blank & tab anchor\n'bc' = blob cloaking & anchor\n'mc' = current tab & tab anchor");

    if (!userInput) return;

    const getIframeContent = (addConfirmation) => {
        const fullOrigin = window.location.origin;
        let confirmationScript = "";

        if (addConfirmation) {
            confirmationScript = `
          <script>
            window.onbeforeunload = function() {
              return "Are you sure you want to leave?";
            };
          <\/script>
        `;
        }

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>New Tab</title>
          <style>
            html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
            iframe { width: 100%; height: 100%; border: none; }
          </style>
          ${confirmationScript}
        </head>
        <body>
          <iframe src="${fullOrigin}/main.html" title="Main Content"></iframe>
        </body>
        </html>
      `;
    };

    if (userInput === "a" || userInput === "ac") {
        const isAC = userInput === "ac";
        const newWin = window.open('', '_blank');
        if (newWin) {
            newWin.document.write(getIframeContent(isAC));
            newWin.document.close();
            setTimeout(function() {
                window.close();
            }, 500);
        } else {
            alert('Popup blocked! Please allow popups for this site, then reload the site.');
        }
    } else if (userInput === "b" || userInput === "bc") {
        const isBC = userInput === "bc";
        const blobContent = getIframeContent(isBC);
        const blob = new Blob([blobContent], { type: "text/html" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank") || alert('Popup blocked!');
    } else if (userInput === "m" || userInput === "mc") {
        const isMC = userInput === "mc";
        document.open();
        document.write(getIframeContent(isMC));
        document.close();
    }
})();
