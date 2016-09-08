/*
Version of hyperhost.js without the virtual engine. Simply makes requests to full hyperhosts.
Thomas Mullen 2016
*/

(function () {
    var rawViews;
    var initialized = false;
    var dataLoaded = false;

    document.addEventListener("DOMContentLoaded", initialize);
    window.addEventListener('hypermessage', handleHyperMessage);

    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    var conn;

    function initialize(event) {
        if (initialized) return;
        initialized = true;
        //Request resources
        var MY_ID = parseInt(Math.random() * 1e15, 10).toString(16);
        var PEER_SERVER = {
            host: "peerjs-server-tmullen.mybluemix.net",
            port: 443,
            path: "/server",
            secure: true
        };
        var peer = new Peer(MY_ID, PEER_SERVER); //Create the peer object

        //Heartbeat
        var heartbeater = makePeerHeartbeater(peer);

        function makePeerHeartbeater(peer) {
            var timeoutId = 0;

            function heartbeat() {
                timeoutId = setTimeout(heartbeat, 20000);
                if (peer.socket._wsOpen()) {
                    peer.socket.send({
                        type: 'HEARTBEAT'
                    });
                }
            }
            heartbeat();
            return {
                start: function () {
                    if (timeoutId === 0) {
                        heartbeat();
                    }
                },
                stop: function () {
                    clearTimeout(timeoutId);
                    timeoutId = 0;
                }
            };
        }


        var OTHER_ID = getParameterByName("site", document.location); //Get the server's id from url

        peer.on('error', function (err) {
            console.error(err);
            if (!dataLoaded) {
                document.getElementById("HYPERHOST-HEADER").innerHTML = "Host could not be reached.";
            }
        });

        conn = peer.connect(OTHER_ID, {
            reliable: true
        });
        conn.on("data", function (data) {
            if (data.type === "serve") {
                console.log("Data received, rendering page...");
                rawViews = data.content.rawViews;
                dataLoaded = true;
                document.getElementById("HYPERHOST-viewframe").style.display = "inherit";
                document.getElementById("HYPERHOST-dropzone").style.display = "none";
                HYPERHOST_NAVIGATE("index.html");
                if (!data.content.hasVirtualBackend) {
                    conn.close();
                }
            } else if (data.type === "response") {
                sendHyperMessage({
                    type: "response",
                    response: data.content,
                    id: data.id
                });
            }
        });
        conn.on("close", function () {
            console.log("Connection to host closed.");
            if (!dataLoaded) {
                document.getElementById("HYPERHOST-HEADER").innerHTML = "Connection closed by host.";
            }
        });
    };

    //Send message to viewFrame document (across iframe)
    function sendHyperMessage(data, type) {
        var childWindow = document.getElementById("HYPERHOST-viewframe").contentWindow;
        var event = new CustomEvent('hypermessage', {
            detail: data
        });
        childWindow.dispatchEvent(event);
    }

    //Listen to messages from viewFrame document (across iframe)
    function handleHyperMessage(e) {
        if (e.detail.type == "navigate") {
            HYPERHOST_NAVIGATE(e.detail.path);
        } else if (e.detail.type == "request") {
            makeHyperRequest(e.detail.id, e.detail.request);
        }
    }

    //Make a request to the virtual backend
    function makeHyperRequest(id, request) {
        conn.send({
            id: id,
            type: "request",
            request: {
                method: "get",
                route: "/"
            }
        });
    }

    //Renders a different compiled HTML page in the viewframe
    function HYPERHOST_NAVIGATE(path, goingBack) {
        for (var i = 0; i < rawViews.length; i++) { //Search for the path
            for (var i = 0; i < rawViews.length; i++) { //Search for the path
                if (rawViews[i].path === path) {
                    document.getElementById("HYPERHOST-viewframe").srcdoc = rawViews[i].body;
                    if (!goingBack) history.replaceState(path, path);
                    console.log("Navigated to " + path);
                    return;
                }
            }
            alert("HyperHost path '" + path + "' does not exist!");
            if (path === "index.html") {
                window.location.hash = "";
                document.getElementById("HYPERHOST-header").innerHTML = "HyperHost";
                document.querySelector("#HYPERHOST-dropzone > div > h2").innerHTML = "Drop Website Root Folder Here to Instantly Host";
                document.getElementById("HYPERHOST-viewframe").style.display = "none";
                document.getElementById("HYPERHOST-dropzone").style.display = "inherit";
                initializeHost(true);
            }
        }
    }

    window.addEventListener('popstate', function (event) {
        HYPERHOST_NAVIGATE(event.state, true);
    });

})();