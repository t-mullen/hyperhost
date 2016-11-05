/*
Client that connects to and renders websites served by a HyperHost host.
Thomas Mullen 2016
*/

(function (Peer) {
    'use strict';
    
    var initialized = false,
        dataLoaded = false,
        conn,
        
        viewframeElement = document.getElementById('HYPERHOST-viewframe'),
        dropzoneElement = document.getElementById('HYPERHOST-dropzone'),
        h1Element = document.getElementById('HYPERHOST-HEADER'),
        h2Element = document.querySelector('#HYPERHOST-dropzone > div > h2'),
        aElement = document.querySelector('#HYPERHOST-dropzone > div > a'),

    getParameterByName = function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    },

    //Define the HyperRequest object (akin to XMLHttpRequest)
    HyperRequestSrc = 'var HyperRequest=function(){var e={};return e.onload=function(){},e.open=function(t,n){e.method=t,e.route=n},e.send=function(t){function n(t){"response"===t.detail.type&&t.detail.id===r&&(window.removeEventListener(i,n),e.onload(t.detail.response))}var o=window.parent,r=Math.random().toString().substr(0,30),d=new CustomEvent("hypermessage",{detail:{type:"request",request:{method:e.method,route:e.route,body:t},id:r}});o.dispatchEvent(d);var i=window.addEventListener("hypermessage",n)},e};',
    /*
    var HyperRequest = function () {
        var self = {};
        self.onload = function () {}
        self.open = function (method, route) {
            self.method = method;
            self.route = route;
        }
        self.send = function (body) {
            var parent = window.parent;
            var id = Math.random().toString().substr(0, 30);
            var event = new CustomEvent("hypermessage", {
                detail: {
                    type: "request",
                    request: {
                        method: self.method,
                        route: self.route,
                        body: body
                    },
                    id: id
                }
            });
            parent.dispatchEvent(event)

            function handleResponse(e) {
                if (e.detail.type === "response" && e.detail.id === id) {
                    window.removeEventListener(listener, handleResponse);
                    self.onload(e.detail.response);
                }
            }
            var listener = window.addEventListener('hypermessage', handleResponse);
        }
        return self;
    }
    */
    
    //Renders a different compiled HTML page in the viewframe
    HYPERHOST_NAVIGATE = function HYPERHOST_NAVIGATE(path) {
        console.log('Requested ' + path);
        conn.send({
            type: 'view',
            path: path
        });
    },
        
    //Send message to viewFrame document (across iframe)
    sendHyperMessage = function sendHyperMessage(data) {
        var childWindow = viewframeElement.contentWindow;
        var event = new CustomEvent('hypermessage', {
            detail: data
        });
        childWindow.dispatchEvent(event);
    },
        
    //Make a request to the virtual backend
    makeHyperRequest = function makeHyperRequest(id, request) {
        conn.send({
            id: id,
            type: 'request',
            request: JSON.stringify(request)
        });
    },

    //Listen to messages from viewFrame document (across iframe)
    handleHyperMessage = function handleHyperMessage(e) {
        if (e.detail.type === 'navigate') {
            HYPERHOST_NAVIGATE(e.detail.path);
        } else if (e.detail.type === 'request') {
            makeHyperRequest(e.detail.id, e.detail.request);
        }
    },

    // Initialize the client
    initialize = function initialize() {
        if (initialized) {
            return;
        }else{
            initialized = true;
        }

        var MY_ID = parseInt(Math.random() * 1e15, 10).toString(16),
            PEER_SERVER = {
            host: 'peerjs-server-tmullen.mybluemix.net',
            port: 443,
            path: '/server',
            secure: true
        },
            peer = new Peer(MY_ID, PEER_SERVER), //Create the peer object

        //Heartbeat to prevent disconnection from signalling server
         makePeerHeartbeater = function makePeerHeartbeater(peer) {
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
        };
        makePeerHeartbeater(peer);


        var OTHER_ID = getParameterByName('site', document.location); //Get the server's id from url
        if (!OTHER_ID) { //If no siteId, just go to main HyperHost
            window.location = window.location.href.replace('client.html', 'index.html');
        }

        peer.on('error', function (err) {
            console.error(err);
            if (!dataLoaded) {
                h1Element.innerHTML = 'Host could not be reached.';
                aElement.style.display = 'inherit';
            }
        });

        conn = peer.connect(OTHER_ID, {
            reliable: true
        });
        conn.on('data', function (data) {
            if (data.type === 'view') {
                console.log('Data received, rendering page...');
                var newView = data.content.view,
                    path = data.path;
                dataLoaded = true;
                viewframeElement.style.display = 'inherit';
                dropzoneElement.style.display = 'none';


                if (!!newView) {
                    viewframeElement.srcdoc = newView.body.replace('<html>', '<html><script>' + HyperRequestSrc + '</script>');

                    history.pushState(path, path);
                    console.log('Navigated to ' + path);
                    return;
                } else {
                    console.error('HyperHost path "' + path + '" does not exist!');
                    if (path === 'index.html') {
                        window.location.hash = '';
                        h1Element.innerHTML = 'HyperHost';
                        h2Element.innerHTML = 'Drop Website Root Folder Here to Instantly Host';
                        viewframeElement.style.display = 'none';
                        dropzoneElement.style.display = 'inherit';
                    }
                }
            } else if (data.type === 'response') {
                sendHyperMessage({
                    type: 'response',
                    response: data.content,
                    id: data.id
                });
            }
        });
        conn.on('open', function () {
            HYPERHOST_NAVIGATE('index.html');
        });
        conn.on('close', function () {
            console.log('Connection to host closed.');
            if (!dataLoaded) {
                h1Element.innerHTML = 'Connection closed by host.';
                aElement.style.display = 'inherit';
            }
        });

    };
    
    window.addEventListener('popstate', function (event) {
        HYPERHOST_NAVIGATE(event.state, true);
    });
    window.addEventListener('hypermessage', handleHyperMessage);
    document.addEventListener('DOMContentLoaded', initialize);

}(Peer));