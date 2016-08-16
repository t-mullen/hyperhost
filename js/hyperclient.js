/*
Version of hyperhost.js without the virtual engine. Simply makes requests to full hyperhosts.
Thomas Mullen 2016
*/

(function () {
    var rawViews;

    document.addEventListener("DOMContentLoaded", function (event) {
        //Request resources
        var MY_ID = parseInt(Math.random() * 1e15, 10).toString(16);
        var PEER_SERVER = {
            host: "peerjs-server-tmullen.mybluemix.net",
            port: 443,
            path: "/server",
            secure: true
        };
        var peer = new Peer(MY_ID, PEER_SERVER); //Create the peer object
        var OTHER_ID = window.location.hash.substr(1); //Get the server's id from url

        peer.on('error', function (err) {
            console.error(err);
        });

        console.log(OTHER_ID);
        var conn = peer.connect(OTHER_ID);
        conn.on("data", function (data) {
            rawViews = data;
            document.getElementById("HYPERHOST-viewframe").style.display = "inherit";
        });
    });

    //Send message to viewFrame document (across iframe)
    function message(data) {
        var childWindow = document.getElementById("HYPERHOST-viewframe").contentWindow;
        var event = new CustomEvent('hypermessage', {
            detail: data
        });
        childWindow.dispatchEvent(event);
    }

    //Listen to messages from viewFrame document (across iframe)
    window.addEventListener('hypermessage', function (e) {
        console.log(e);
        if (e.detail.type == "navigate") {
            HYPERHOST_NAVIGATE(e.detail.path);
        }
    }, false);

    function HYPERHOST_NAVIGATE(path) {
        for (var i = 0; i < rawViews.length; i++) {
            if (rawViews[i].path === path) {
                document.getElementById("HYPERHOST-viewframe").srcdoc = rawViews[i].body;
                console.log("Navigated to " + path);
                return;
            }
        }
        alert("HyperHost path '" + path + "' does not exist!");
    }

})();