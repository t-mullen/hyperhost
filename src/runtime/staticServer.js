/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Serves static resources over WebRTC.

*/

var globalConfig = require("../config/config.json");

function StaticServer(views, hasVirtualBackend) {

    var MY_PEER_ID = parseInt(Math.random() * 1e15, 10).toString(16), // A random PeerJS ID
        peer,                    //The PeerJS peer object
        MAX_RECONNECT_ATTEMPTS = globalConfig.maxReconnectAttempts;  //Max attempts to connect to signalling server    


    this.clientURL = globalConfig.paths.client + MY_PEER_ID; //The URL where clients can connect
    this.views = views;            //An array of compiled views

    /*
        Connects to signalling server and starts serving views.
    */
    this.listen = function () {
        this.config = this.config || globalConfig.peerJS;

        peer = new Peer(MY_PEER_ID, this.config); //Create the peer     
        peer.on('error', function (err) { 
            //TODO: Route PeerJS errors
        });
        makePeerHeartbeater(peer);

        // Handle incoming connections
        peer.on('connection', function (conn) {
            //TODO: Eventing

            conn.on("close", function () {
                //TODO: Eventing
            });

            // Any data received by the server is intended for the virtual backend
            conn.on('data', function (data) {
                //TODO: Eventing
                
                // Send server a request event
                if (data.type === "request") {
                    var event = new CustomEvent('hyperdata', {
                        detail: {
                            request: JSON.parse(data.request),
                            connection: conn,
                            id: data.id
                        }
                    });
                    dispatchEvent(event);
                } 
                
                // Intercept post-load view requests
                else if (data.type === "view") {
                    var view = getView(data.path);
                    view.body = view.content;
                    conn.send({
                        type: "view",
                        path: data.path,
                        content: {
                            view: view,
                            hasVirtualBackend: hasVirtualBackend
                        }
                    });
                }
            });
        });
        
        
        // Handle disconnections from signalling server
        var failures = 0;
        peer.on('disconnected', function () {
            //TODO: Eventing
            peer.reconnect(); //Auto-reconnect

            var check = setInterval(function () { //Check the reconnection worked
                if (!peer.disconnected) {
                    //TODO: Eventing
                    var failures = 0;
                    clearInterval(check);
                } else {
                    failures++;
                    if (failures >= MAX_RECONNECT_ATTEMPTs) {
                        //TODO: Eventing
                        throw new Error("Could not reconnect to signalling server.");
                    }
                }
            }, 1000);
        });
        
        return this.clientURL;
    };
    

    // Fixes PeerJS' habit of disconnecting us from the signalling server
    var makePeerHeartbeater = function (peer) {
        var timeoutID = 0;

        function heartbeat() {
            timeoutID = setTimeout(heartbeat, 20000);
            if (peer.socket._wsOpen()) {
                peer.socket.send({
                    type: 'HEARTBEAT'
                });
            }
        }
        heartbeat();
        return {
            start: function () {
                if (timeoutID === 0) {
                    heartbeat();
                }
            },
            stop: function () {
                clearTimeout(timeoutID);
                timeoutId = 0;
            }
        };
    }

    // Returns the view for the provided path
    var getView = function (path) {
        for (var i = 0; i < views.length; i++) {
            if (views[i].path === path) {
                return views[i];
            }
        }
    }
}

module.exports = StaticServer;