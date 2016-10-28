/*
hyperhost.js Thomas Mullen 2016
Uses WebRTC to host static websites from the browser.
*/

var HyperHost = (function () {
    'use strict';
    var module = {};
    var $scope;
    var clientURL;
    module.VERSION = "2.0.0";

    /*------- Redirect clients to the client.html -----*/
    function getParameterByName(name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) {
            return null;
        } else if (!results[2]) {
            return '';
        }
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    var siteParameter = getParameterByName("site", document.location);
    if (siteParameter && document.location.toString().indexOf('client.html') === -1) {
        document.location = "/HyperHost/client.html?site=" + siteParameter; //Add our peerId to the url
    }

    // dash-case to camelCase
    function camelize(str) {
        return str.replace(/-([a-z])/g, function (g) {
            return g[1].toUpperCase();
        });
    }


    //Ajax
    var ajax = function (url, successCallback, errorCallback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onload = function (e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    if (successCallback && successCallback.constructor == Function) {
                        return successCallback(xhr.responseText);
                    }
                } else {
                    if (errorCallback && errorCallback.constructor == Function) {
                        return errorCallback(xhr.statusText);
                    } else {
                        console.error("Failed to get resource '" + url + "' Error: " + xhr.statusText);
                    }
                }
            }
        };
        xhr.onerror = function (e) {
            if (errorCallback && errorCallback.constructor == Function) {
                return errorCallback(xhr.statusText);
            } else {
                console.error("Failed to get resource. Error: " + xhr.statusText);
            }
        };
        xhr.send(null);
    };

    //Ajax-es an array of urls, only returning when all have been loaded
    var ajaxMulti = function (arr, successCallback, errorCallback) {
        var result = [];
        var remaining = arr.length;
        for (var i = 0; i < arr.length; i++) {
            ajax(arr[i],
                function (data) {
                    result[i] = data;
                    remaining--;
                    if (remaining === 0) {
                        successCallback(result);
                    }
                }, errorCallback);
        }
    }

    // Injects an array of urls to scripts
    function injectScripts(scripts, mappingObject, callback) {
        var remaining = scripts.length;

        function loadScript(i) {
            var script = document.createElement("script");
            script.type = "text/javascript";

            if (script.readyState) { //IE
                script.onreadystatechange = function () {
                    if (script.readyState === "loaded" || script.readyState === "complete") {
                        script.onreadystatechange = null;
                        remaining--;
                        if (remaining === 0) {
                            callback();
                        } else {
                            if (i < scripts.length - 1) {
                                loadScript(i + 1);
                            }
                        }
                    }
                };
            } else { //Others
                script.onload = function () {
                    remaining--;
                    if (remaining === 0) {
                        callback();
                    } else {
                        if (i < scripts.length - 1) {
                            loadScript(i + 1);
                        }
                    }
                };
            }

            script.src = mappingObject[scripts[i]];
            document.getElementsByTagName("head")[0].appendChild(script);
        }
        loadScript(0);
    }

    // Initialize the host
    var initialized = false;

    function initializeHost(forceReload) {
        if (initialized && !forceReload) {
            return;
        }
        console.log("> Initializing HyperHost...");
        initialized = true;

        var rawViews = []; //Html, css, js... files that load children (always text files)
        var assets = []; //Images, fonts... files that cannot load children (can be url encoded)
        var jsonFiles = []; //JSON files for access by the server
        var fileCount = 0;
        var realFileCount = 0; //Just used for loading stats
        var traversalComplete = false;
        var fileNetSize = 0; //Net size of files
        var foundIndex = false;
        var serverCode;
        var MY_ID; //Our PeerJS id
        var peer;

        var workingTree = {
            nodes: []
        }; //Aethetically keeps track of file structure 
        // Updates working tree
        function deepSetTree(tempObj, value, ancestors) { //Deep tree setting
            for (var i = 0; i < ancestors.length; i++) {
                var found = false;
                for (var i2 = 0; i2 < tempObj.nodes.length; i2++) { //Locate the ancestors
                    if (tempObj.nodes[i2].name === ancestors[i]) {
                        tempObj = tempObj.nodes[i2];
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    tempObj.nodes.push({ //Create the ancestor if it doesn't exits
                        name: ancestors[i],
                        type: "folder",
                        nodes: []
                    });
                    for (var i2 = 0; i2 < tempObj.nodes.length; i2++) { //Get the reference of the new object
                        if (tempObj.nodes[i2].name === ancestors[i]) {
                            tempObj = tempObj.nodes[i2];
                            break;
                        }
                    }
                }
            }
            value.nodes = [];
            tempObj.nodes.push(value);
        }

        /*
        {name: "name", type:"file", ancestors:[folder1", "folder2"]}
        [
            {
                name:"folder1",
                type:"folder",
                nodes: [
                    {
                    name : "folder2",
                    type : "folder",
                    nodes : [
                        {
                            name : "name",
                            type : "file",
                        }
                    ]
                    }
                ]
             }
        ]
        
        */

        // Traverse a dropped directory. TODO: ZIP support for browsers other than Chrome
        function traverseFileTree(item, path, depth, ancestors) {
            if (item.name[0] === ".") {
                return; //Ignore hidden files
            }
            if (item.isFile) {
                // Get file
                item.file(function (file) {
                    fileNetSize += file.size / 1048576;
                    var reader = new FileReader();
                    fileCount++;
                    realFileCount++;
                    var ext = item.name.split(".");
                    ext = ext[ext.length - 1].toLowerCase();
                    if (["html", "css", "json"].indexOf(ext) !== -1) { //These files need to be read as text, so we can replace URLs within them or use them immediately
                        reader.addEventListener("load", function () {
                            deepSetTree(workingTree, {type : ext, name : item.name, content: reader.result}, ancestors);
                            if (ext === "json") {
                                jsonFiles[path + item.name.split(".")[0]] = JSON.parse(reader.result); //JSON files are reserved for the server. If you need them in client, use a virtual backend to serve them
                            } else {
                                rawViews.push({
                                    body: reader.result,
                                    path: path + item.name,
                                    extension: ext,
                                    isRoot: depth <= 1
                                });
                                if (path + item.name === "index.html") {
                                    foundIndex = true;
                                }
                            }
                            fileCount--;
                            if (fileCount === 0 && traversalComplete) {
                                preprocessFiles();
                            }
                        }, false);
                        reader.readAsText(file); //Read these as text
                    } else if (["js", "txt", "md", "py", "java"].indexOf(ext) !== -1) { //Read JS as text, but save as base64
                        reader.addEventListener("load", function () {
                            var base64 = "data:text/javascript;base64," + btoa(unescape(encodeURIComponent(reader.result)));
                            deepSetTree(workingTree, {type:ext, name:item.name, content:reader.result}, ancestors);

                            if (item.name === "HH-server.js") {
                                //Is virtual backend code
                                serverCode = base64;
                            } else if (item.name.substring(0, 3) === "HH-") {
                                //Is a module for the virtual backend   
                                var name = item.name.substring(3).slice(0, -3);
                                moduleListing.push(name);
                                module.modules[name] = base64; //Store url in place of the module (prevent .js extension with meaningless query)
                            } else {
                                assets.push({
                                    "old": path + item.name,
                                    "new": base64,
                                    "extension": ext,
                                    "itemName": item.name,
                                    "isFont": false
                                });
                            }

                            fileCount--;
                            if (fileCount === 0 && traversalComplete) {
                                preprocessFiles();
                            }
                        });
                        reader.readAsText(file);
                    } else {
                        reader.addEventListener("load", function () {
                            deepSetTree(workingTree, {type:ext, name:item.name, content:"Cannot display image type \""+ext+"\""}, ancestors);
                            
                            var isFont = ["eot", "woff", "woff2", "ttf", "svg", "sfnt", "otf"].indexOf(ext) !== -1;
                            assets.push({
                                "old": path + item.name,
                                "new": reader.result,
                                "extension": ext,
                                "itemName": item.name,
                                "isFont": isFont
                            });

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
                // Get folder contents
                deepSetTree(workingTree, {type:'folder', name:item.name, content:null}, ancestors); //Keeps track of structure
                
                
                var dirReader = item.createReader();
                dirReader.readEntries(function (entries) {
                    for (var i = 0; i < entries.length; i++) {
                        var newAns = ancestors.slice(0);
                        newAns.push(item.name);
                        traverseFileTree(entries[i], depth === 0 ? "" : path + item.name + "/", depth + 1, newAns);
                    }
                });
            }
        }

        function escapeRegExp(str) {
            return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        }

        function preprocessFiles() {
            console.log(" > Net uploaded size: " + fileNetSize + " MB");
            if (fileNetSize > 40) {
                console.warn("> WARNING: Large website, serving may crash the browser.");
            }

            console.log("> Preparing to encode " + rawViews.length + " assets...");
            console.success("> Done!");
            console.log("> Encoding view elements...");
            for (var i = 0; i < rawViews.length; i++) {
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
            console.success("> Done!");
            console.log("> Encoding subfiles...");
            for (var i = 0; i < rawViews.length; i++) {
                if (rawViews[i].invalid) continue;

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
                            var re3 = new RegExp("href\\s*=\\s*['\"](.\/|)\\s*#" + escapeRegExp(anchorId) + "['\"]", "g");
                            rawViews[i].body = rawViews[i].body.replace(re3, `href="#" onclick="event.preventDefault(); document.getElementById('` + anchorId + `').scrollIntoView();"`);
                        }
                    }
                }
            }
            console.success("> Done!");

            if (!foundIndex) {
                console.error("No file 'index.html' at top level of directory. Unable to host. Refresh to try again.");
                return;
            }

            console.log("> Preparing to host static website...");
            console.success("> Done!");

            HYPERHOST_SERVE(); //We can now serve the processed files to anyone who requests them
        }


        //Handles a folder or single-file drop event
        module.handleRawDropEvent = function (dataTransfer, scope) {
            if (traversalComplete) {
                return;
            }

            $scope = scope;

            console.log("******* HyperHost v" + module.VERSION + " *******");
            console.log("> Loading your files...");

            //TODO: Get folder parsing working for Firefox 42+
            var items = dataTransfer.items;
            for (var i = 0; i < items.length; i++) {
                var item = items[i].webkitGetAsEntry();
                if (item) {
                    traverseFileTree(item, "", 0, []);
                }
            }
            traversalComplete = true;
            scope.updateFileTree(workingTree.nodes);
            console.success("> Done!");
        }

        //Handles an array of files (no nesting)
        module.handleFiles = function (files, scope) {
            if (traversalComplete) {
                return;
            }

            $scope = scope;
            console.log("******* HyperHost v" + module.VERSION + " *******");
            console.log("> Loading your files...");

            for (var i = 0; i < files.length; i++) {
                traverseFileTree(files[i], "", 0, []);
            }

            traversalComplete = true;
            console.success("> Files loaded!");
        }

        //Gets a Wzrd.in url from module name
        function getWzrdModuleUrl(name, version) {
            return "https://tmullen-bcdn.herokuapp.com/debug-standalone/" + name + jsonFiles["package"]["dependencies"][name] + (!!version ? "@" + version : "");
        }


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

            //Heartbeat to stop PeerJS from disconnecting us from the signalling server
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
            var heartbeater = makePeerHeartbeater(peer);

            //Update URL to reflect where clients can connect (without reloading)
            clientURL = window.location.protocol + "//" + window.location.host + window.location.pathname + "?site=" + MY_ID;
            clientURL = clientURL.replace('index.html', 'client.html');
            $scope.setClientURL(clientURL);

            peer.on('error', function (err) {
                console.error(err);
            });

            function getView(path) {
                for (var i = 0; i < rawViews.length; i++) {
                    if (rawViews[i].path === path) {
                        return rawViews[i];
                    }
                }
            }

            peer.on('connection', function (conn) {
                console.log("> Connected to peer!");

                conn.on("close", function () {
                    console.log("> Peer closed the connection.");
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
                    } else if (data.type === "ip") {
                        ajax("https://freegeoip.net/json/" + data.ip, function (geo) {
                            geo = JSON.parse(geo);
                            var arr = [];
                            for (var key in geo) {
                                arr.push(geo[key]);
                            }
                            console.log("> " + arr.join(' '));
                        });
                    } else if (data.type === "view") {
                        console.log("> Peer request " + data.path);
                        conn.send({
                            type: "view",
                            path: data.path,
                            content: {
                                view: getView(data.path),
                                hasVirtualBackend: !!serverCode //Converts serverCode to boolean. Server code is NOT being sent
                            }
                        });
                    }
                });
            });

            var failures = 0;
            peer.on('disconnected', function () {
                console.warn("> WARNING:Disconnected from server, attempting reconnection...");
                peer.reconnect(); //Auto-reconnect

                var check = window.setInterval(function () { //Check the reconnection worked
                    if (!peer.disconnected) {
                        console.success("> Reconnected to server.");
                        var failures = 0;
                        window.clearInterval(check);
                    } else {
                        failures++;
                        console.warn("> WARNING: Reconnection failed (" + failures + "/" + MAX_RECONNECT_FAILURES + ")");
                        if (failures >= MAX_RECONNECT_FAILURES) {
                            console.error("> FATAL ERROR: Could not reconnect to signalling server.");
                        }
                    }
                }, 1000);
            });

            if (serverCode) {
                var npmModuleList = Object.keys(jsonFiles['package']["dependencies"]);
                moduleListing = moduleListing.concat(npmModuleList);
                console.log("> Virtual backend detected! Loading modules...");
                //Generate urls for wzrd.in files
                for (var i = 0; i < npmModuleList.length; i++) {
                    module.modules[npmModuleList[i]] = getWzrdModuleUrl(npmModuleList[i], jsonFiles["package"]["dependencies"][npmModuleList[i]]);
                }
                //Inject the virtual backend modules
                injectScripts(moduleListing, module.modules, function () {
                    //Wzrd will put everything on the window, so we need to move it to the modules
                    for (var i = 0; i < npmModuleList.length; i++) {
                        console.log("> Loading module '" + npmModuleList[i] + "' from npm...");
                        module.modules[npmModuleList[i]] = window[camelize(npmModuleList[i])];
                    }

                    console.success("> Done!");
                    console.log("> Injecting virtual server code...")
                    moduleListing.push('hyperhost'); // Add the Hyperhost module (this module is unique in this respect)
                    module.modules['hyperhost'] = hyperhostRequireModule;

                    //Inject the virtual backend code after modules loaded
                    var script = document.createElement('script');
                    script.setAttribute('type', 'text/javascript');
                    script.setAttribute('src', serverCode);
                    console.success("> Done!");
                    console.log("> Virtual server starting...");
                    window.require = module.require;
                    document.head.appendChild(script);
                    console.success("> Done!");
                    console.warn("> WARNING: Hosting will stop if this window is closed!");
                });
            } else {
                console.log("> No HH-server.js. Assuming there is no virtual server.");
                console.warn("> WARNING: Hosting will stop if this window is closed!");
                console.success("> Hosted at " + clientURL);
                $scope.finishDeploying();
            }

            window.onbeforeunload = function () {
                return "Your site will no longer be hosted if you leave!"; //Alert before leaving!
            }
        };
        console.log("> Initialization complete.");
    }
    module.initializeHost = initializeHost;


    /*---------------- Dynamic/Virtual Backend ----------------*/

    module.modules = {}; //Maps name to actual module
    var moduleListing = []; //Names and urls of modules for virtual backend

    //The 'require' emulator
    module.require = function (moduleName) {
        if (moduleListing.indexOf(moduleName) === -1) {
            console.error("> Module '" + moduleName + "' does not exist! Did you upload it?");
            return;
        } else {
            return module.modules[moduleName];
        }
    }


    //'hyperhost' module has to be within this scope, so it's pre-defined
    var hyperhostRequireModule = (function () {
        var module = {
            exports: {}
        };

        //Constructor for the response object, which abstracts away PeerJS
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
            this.statuscode = 200;
            this.kill = function () {
                conn.close();
            }
        }

        //Creates the server app
        module.exports.createApp = function () {
            var app = {};

            var listening = false;

            //Constructs a new router function with the specified methods allowed
            var RouterFunction = function (methods) {
                var routerFunction = function (route, requestListener, next) {
                    window.addEventListener('hyperdata', function (e) {
                        if (!listening) return; //Ignore requests made before server is started
                        if (route !== e.detail.request.route) return; //Ignore invalid routes TODO: error here
                        if (routerFunction.methods.indexOf(e.detail.request.method.toLowerCase()) === -1) { //Block invalid method
                            console.error("> Client requested unsupported route '" + e.detail.request.method + "' on route '" + route + "'");
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
                console.log("> Virtual server listenting...");
                console.success("> Hosted at " + clientURL);
                $scope.finishDeploying();
            }

            return app;
        }

        return module.exports;
    }());

    return module;
})();
HyperHost.initializeHost();