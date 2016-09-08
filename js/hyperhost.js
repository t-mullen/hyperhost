/*
hyperhost.js Thomas Mullen 2016
Uses WebRTC to host static websites from the browser.
*/

var HyperHost = (function () {
    var module = {};

    /*------- Redirect clients to the client.html -----*/
    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    var siteParameter = getParameterByName("site", document.location);
    if (siteParameter) {
        document.location = "/HyperHost/client.html?site=" + siteParameter; //Add our peerId to the url
    }


    /*---------------- Static/Base Backend ----------------*/

    var initialized = false;
    document.addEventListener("DOMContentLoaded", initializeHost, false);

    // Initialize the host
    function initializeHost(forceReload) {
        if (initialized && !forceReload) return;
        initialized = true;

        var rawViews = []; //Html, css, js... files that load children (always text files)
        var assets = []; //Images, fonts... files that cannot load children (can be url encoded)
        var fileCount = 0;
        var realFileCount = 0; //Just used for loading stats
        var traversalComplete = false;
        var serverCode;
        var MY_ID; //Our PeerJS id
        var peer;

        function traverseFileTree(item, path, depth) {
            if (item.isFile) {
                // Get file
                item.file(function (file) {
                    var reader = new FileReader();
                    fileCount++;
                    realFileCount++;
                    document.querySelector("#HYPERHOST-dropzone > div > h2").innerHTML = "Found " + realFileCount + " files.";
                    var ext = item.name.split(".");
                    ext = ext[ext.length - 1].toLowerCase();
                    if (["html", "css"].indexOf(ext) != -1) {
                        reader.addEventListener("load", function () {
                            rawViews.push({
                                body: reader.result,
                                path: path + item.name,
                                extension: ext,
                                isRoot: depth <= 1
                            });
                            fileCount--;
                            if (fileCount === 0 && traversalComplete) {
                                preprocessFiles();
                            }
                        }, false);
                        reader.readAsText(file); //Read these as text
                    } else {
                        reader.addEventListener("load", function () {
                            if (item.name === "HS-server.js") {
                                serverCode = reader.result;
                            } else {
                                var isFont = ["eot", "woff", "woff2", "ttf", "svg", "sfnt", "otf"].indexOf(ext) !== -1;
                                assets.push({
                                    old: path + item.name,
                                    new: reader.result,
                                    extension: ext,
                                    itemName: item.name,
                                    isFont: isFont
                                });
                            }
                            fileCount--;
                            if (fileCount === 0 && traversalComplete) {
                                preprocessFiles();
                            }
                        }, false);
                        reader.readAsDataURL(file); //URL encode these
                    }
                }, function (err) {
                    console.error(err);
                });
            } else if (item.isDirectory) {
                if (item.name[0] === ".") return; //Ignore non-site files
                // Get folder contents
                var dirReader = item.createReader();
                dirReader.readEntries(function (entries) {
                    for (var i = 0; i < entries.length; i++) {
                        traverseFileTree(entries[i], depth === 0 ? "" : path + item.name + "/", depth + 1);
                    }
                });
            }
        }

        function escapeRegExp(str) {
            return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        }

        function preprocessFiles() {
            for (var i = 0; i < rawViews.length; i++) {
                document.querySelector("#HYPERHOST-dropzone > div > h2").innerHTML = "Encoding assets " + i + 1 + "/" + rawViews.length + 1;

                //Replace asset URLs with their data URL
                for (var i2 = 0; i2 < assets.length; i2++) {
                    if (rawViews[i].isRoot) {
                        var re = new RegExp("(.\/|)" + escapeRegExp(assets[i2].old), "g")
                        rawViews[i].body = rawViews[i].body.replace(re, assets[i2].new);
                    } else {
                        //TODO: Deal with changing paths for non-root files.
                        if (rawViews[i].extension === "css") { //Make urls work for css files
                            var re = new RegExp("url\(([^)]*)(.\/|)" + escapeRegExp(assets[i2].itemName) + "([^)]*)\)", "g");
                            rawViews[i].body = rawViews[i].body.replace(re, "url(" + assets[i2].new);
                        }

                    }
                }

            }
            for (var i = 0; i < rawViews.length; i++) {
                if (rawViews[i].invalid) continue;
                document.querySelector("#HYPERHOST-dropzone > div > h2").innerHTML = "Encoding subfiles " + i + 1 + "/" + rawViews.length + 1;

                //Determine rawView dependencies
                if (rawViews[i].extension === "html") { //Only html-out referencing is supported (should be suitable for most cases)
                    for (var i2 = 0; i2 < rawViews.length; i2++) {
                        if (rawViews[i2].invalid) continue;
                        //Replace external stylesheets with embedded styles
                        if (rawViews[i2].extension === "css") {
                            var re = new RegExp("<link.*rel\\s*=\\s*[\"']stylesheet[\"'].*href\\s*=\\s*[\"'](.\/|)" + escapeRegExp(rawViews[i2].path) + "[\"'].*>", "g");
                            rawViews[i].body = rawViews[i].body.replace(re, "<style>" + rawViews[i2].body + "</style>");

                            var re = new RegExp("<link.*href\\s*=\\s*[\"'](.\/|)" + escapeRegExp(rawViews[i2].path) + "[\"'].*rel\\s*=\\s*[\"']stylesheet[\"'].*>", "g");
                            rawViews[i].body = rawViews[i].body.replace(re, "<style>" + rawViews[i2].body + "</style>");
                        }
                        //Create hyper-host inter-page navigation scripts
                        if (rawViews[i2].extension === "html") {
                            var re = new RegExp("href\\s*=\\s*['\"](.\/|)" + escapeRegExp(rawViews[i2].path) + "(#[^'\"]*['\"]|['\"])", "g");
                            rawViews[i].body = rawViews[i].body.replace(re, `href='#' onclick="event.preventDefault();var parent=window.parent;var event = new CustomEvent('hypermessage', {detail: {type: 'navigate',path:'` + rawViews[i2].path + `'}});parent.dispatchEvent(event)"`);
                        }
                    }
                    //Make same-page hash links work!
                    var re = new RegExp("href\\s*=\\s*['\"](.\/|)\\s*#[^'\"]+['\"]", "g");
                    var res = rawViews[i].body.match(re);
                    if (res !== null) {
                        for (var i3 = 0; i3 < res.length; i3++) {
                            var re2 = new RegExp("#[^'\"]+['\"]", "g")
                            var anchorId = res[i3].match(re2)[0];
                            anchorId = anchorId.substr(1, anchorId.length - 2);
                            console.log(anchorId);
                            var re3 = new RegExp("href\\s*=\\s*['\"](.\/|)\\s*#" + escapeRegExp(anchorId) + "['\"]", "g");
                            rawViews[i].body = rawViews[i].body.replace(re3, `href="#" onclick="event.preventDefault(); document.getElementById('` + anchorId + `').scrollIntoView();"`);
                        }
                    }
                }
            }

            document.querySelector("#HYPERHOST-dropzone > div > h2").innerHTML = "Starting server...";

            HYPERHOST_SERVE(); //We can now serve the processed files to anyone who requests them
        }


        //Handles a folder drop event
        function handleDropEvent(event) {
            event.preventDefault();
            event.stopPropagation();

            if (traversalComplete) {
                return;
            }

            document.getElementById("HYPERHOST-header").innerHTML = "Loading...";
            document.querySelector("#HYPERHOST-dropzone > div > h2").innerHTML = "Traversing folder structure...";

            //TODO: Get folder parsing working for Firefox 42+
            var items = event.dataTransfer.items;
            for (var i = 0; i < items.length; i++) {
                var item = items[i].webkitGetAsEntry();
                if (item) {
                    traverseFileTree(item, "", 0);
                }
            }
            traversalComplete = true;
            event.target.style.borderColor = '#d4ac00';
        }
        //Set drag n' drop event listeners
        document.getElementById("HYPERHOST-dropzone").addEventListener("drop", handleDropEvent, false);
        document.getElementById("HYPERHOST-dropzone").addEventListener("dragover", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });
        document.getElementById("HYPERHOST-dropzone").addEventListener("dragenter", function (event) {
            event.target.style.borderColor = '#00ea09';
        });
        document.getElementById("HYPERHOST-dropzone").addEventListener("dragleave", function (event) {
            event.target.style.borderColor = '#d4ac00';
        });


        //Serve incoming WebRTC connections
        function HYPERHOST_SERVE() {
            if (!MY_ID) MY_ID = parseInt(Math.random() * 1e15, 10).toString(16);
            var PEER_SERVER = {
                host: "peerjs-server-tmullen.mybluemix.net", //Swap out this if you want to use your own PeerJS server
                port: 443,
                path: "/server",
                secure: true
            };
            if (!peer) peer = new Peer(MY_ID, PEER_SERVER); //Create the peer
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

            //Update URL to reflect where clients can connect (without reloading)
            var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?site=" + MY_ID;
            window.history.pushState({
                path: newurl
            }, '', newurl);
            document.getElementById("another").style.display = "inherit";

            peer.on('error', function (err) {
                console.error(err);
            });

            peer.on('connection', function (conn) {
                console.log("Connected to peer!");
                conn.on("open", function () {
                    console.log("Serving website to peer...");
                    conn.send({
                        type: "serve",
                        content: {
                            rawViews: rawViews,
                            hasVirtualBackend: !!serverCode //Converts serverCode to boolean. Code is NOT being sent
                        }
                    });
                });

                //Any data received by the server is intended for the virtual backend
                conn.on('data', function (data) {
                    if (data.type === "request") {
                        var event = new CustomEvent('hyperdata', {
                            detail: {
                                request: JSON.parse(data.request),
                                connection: conn,
                                id: data.id
                            }
                        });
                        window.dispatchEvent(event);
                    }
                });
            });

            peer.on('disconnected', function () {
                peer.reconnect(); //Auto-reconnect
                var check = window.setInterval(function () { //Check the reconnection worked
                    if (!peer.disconnected) {
                        console.log("Reconnected to server.");
                        window.clearInterval(check);
                    }
                }, 1000);
            });

            //Inject the virtual server code
            if (serverCode) {
                console.log("Virtual backend detected! Initializing...")
                var script = document.createElement('script');
                script.setAttribute('src', serverCode)
                document.head.appendChild(script);
            }

            var clientURL = window.location.protocol + "//" + window.location.host + window.location.pathname + "?site=" + MY_ID;
            window.onbeforeunload = function () {
                return "Your site will no longer be hosted if you leave!";
            }
            document.querySelector("#HYPERHOST-dropzone > div > h1").innerHTML = "<a target='_blank' href='" + clientURL + "'>Hosted on<br>" + clientURL + "</a>";
            document.querySelector("#HYPERHOST-dropzone > div > h2").innerHTML = "Do not close this window!";
            document.querySelector("#HYPERHOST-dropzone > div > p").style.display = "none";
            document.querySelector("#HYPERHOST-dropzone").style.border = "none";
        };
    }


    /*---------------- Dynamic/Virtual Backend ----------------*/

    var modules = {};
    var moduleList = [];

    //The 'require' emulator
    module.require = function (moduleName) {
        if (moduleList.indexOf(moduleName) === -1) {
            console.error("Module '" + moduleName + "' does not exist!");
            return;
        } else {
            return modules[moduleName];
        }
    }


    //'Peerserver' module
    moduleList.push('peerserver');
    modules['peerserver'] = (function () {
        var peerserver = {};

        //Constructs a new response object which abstracts away PeerJS
        var Response = function (conn, id) {
            this.body;
            this.send = function (data) {
                this.body = data;
                this.end();
            }
            this.end = function () {
                conn.send({
                    type: "response",
                    id: id,
                    content: {
                        statuscode: this.statuscode,
                        body: this.body
                    }
                });
            }
            this.statuscode = 200; //Status code defaults to 200
            this.kill = function () {
                conn.close();
            }
        }

        //Creates the server app
        peerserver.createApp = function () {
            var app = {};

            var listening = false;

            //Constructs a new router function with the specified methods allowed
            var RouterFunction = function (methods) {
                var routerFunction = function (route, requestListener, next) {
                    window.addEventListener('hyperdata', function (e) {
                        if (!listening) return; //Ignore requests made before server is started
                        if (route !== e.detail.request.route) return; //Ignore invalid routes TODO: error here
                        if (routerFunction.methods.indexOf(e.detail.request.method.toLowerCase()) === -1) { //Block invalid method
                            console.error("Client attempted unsupported method '" + e.detail.request.method + "' on route '" + route + "'");
                            return;
                        }
                        console.log(e.detail.id + " : " + e.detail.request.method.toUpperCase() + " " + route)
                        requestListener(e.detail.request, new Response(e.detail.connection, e.detail.id), next);
                    }, false);
                }
                routerFunction.methods = methods;
                return routerFunction;
            }

            //Router functions for different methods
            app.all = new RouterFunction(['get', 'post']);
            app.get = new RouterFunction(['get']);
            app.post = new RouterFunction(['post']);

            //Allows requests to be served
            app.listen = function () {
                listening = true;
                console.log("Virtual server running...");
            }

            return app;
        }

        return peerserver;
    }());

    return module;
})();
var require = HyperHost.require; //Expose require to any server code