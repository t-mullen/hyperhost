/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Serves static resources over WebRTC.

*/

const globalConfig = require('../config/config.json');

function StaticServer(views, hasVirtualBackend) {
    'use strict';

    const myPeerID = parseInt(Math.random() * 1e15, 10).toString(16), // A random PeerJS ID
          maxReconnectAttempts = globalConfig.maxReconnectAttempts;  // Max attempts to connect to signalling server    
    
    let peer,   //The PeerJS peer object
        heartbeater,
        _handlers = {};
    
    const _emit = function _emit(event, data){
        var fn = _handlers[event];
        if (fn && typeof(fn) === 'function') {
            fn(data);
        }
    };
    
    /*
        Listen for an event.
    */
    this.on = function on(event, handler) {
        _handlers[event]=handler;
    };

    // Fixes PeerJS' habit of disconnecting us from the signalling server
    const makePeerHeartbeater = function makePeerHeartbeater(peer) {
        let timeoutID = 0;

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
                timeoutID = 0;
            }
        };
    },

    // Returns the view for the provided path
    getView = function (path) {
        for (let i = 0; i < views.length; i++) {
            if (views[i].path === path) {
                return views[i];
            }
        }
    };
    
    
    this.clientURL = globalConfig.paths.client + myPeerID; //The URL where clients can connect
    this.views = views;            //An array of compiled views

    /*
        Connects to signalling server and starts serving views.
    */
    this.launch = function launch() {
        this.config = this.config || globalConfig.peerJS;

        peer = new Peer(myPeerID, this.config); //Create the peer    
        
        peer.on('open', function(id){
            _emit('ready');
        });
        
        peer.on('error', (err) => { 
            //TODO: Route PeerJS errors
        });
        heartbeater = makePeerHeartbeater(peer);

        // Handle incoming connections
        peer.on('connection', (conn) => {
            //TODO: Eventing

            conn.on('close', () => {
                //TODO: Eventing
            });

            // Any data received by the server is intended for the virtual backend
            conn.on('data', (data) => {
                //TODO: Eventing
                
                // Send server a request event
                if (data.type === 'request') {
                    let event = new CustomEvent('hyperdata', {
                        detail: {
                            request: JSON.parse(data.request),
                            connection: conn,
                            id: data.id
                        }
                    });
                    dispatchEvent(event);
                } 
                
                // Intercept post-load view requests
                else if (data.type === 'view') {
                    let view = getView(data.path);
                    view.body = view.content;
                    conn.send({
                        type: 'view',
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
        let failures = 0;
        peer.on('disconnected', () => {
            //TODO: Eventing
            peer.reconnect(); //Auto-reconnect

            let check = setInterval(() => { //Check the reconnection worked
                if (!peer.disconnected) {
                    //TODO: Eventing
                    failures = 0;
                    clearInterval(check);
                } else {
                    failures++;
                    if (failures >= maxReconnectAttempts) {
                        //TODO: Eventing
                        throw new Error('Could not reconnect to signalling server.');
                    }
                }
            }, 1000);
        });
        
        return this.clientURL;
    };
}

module.exports = StaticServer;