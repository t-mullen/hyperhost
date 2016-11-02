(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.HyperHost = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports={
    paths : {
        client : "https://rationalcoding.github.io/HyperHost/client.html?site=",
        wzrd : "https://tmullen-bcdn.herokuapp.com/debug-standalone/",
        crossOriginProxy : "https://crossorigin.me/"
    },
    extensions : {
        text : ["js", "txt", "md", "py", "java"],
        font : ["eot", "woff", "woff2", "ttf", "svg", "sfnt", "otf"],
        image : ["png", "jpg", "jpeg", , "jpeg2000", "tif", "tiff", "gif", "bmp"],
        view : ["html", "css", "json"]
    },
    peerJS : {
        host: "peerjs-server-tmullen.mybluemix.net",
        port: 443,
        path: "/server",
        secure: true
    },
    warnings : {
        maxTreeSize : 40
    },
    maxReconnectAttempts : 10
}
},{}],2:[function(require,module,exports){
/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License


HyperHost v2.0
Module to host websites over WebRTC.


*/

var IO = require("./processing/io.js");
var Flattener = require("./processing/flattener.js");
var Compiler = require("./processing/compiler.js");

var StaticServer = require("./runtime/staticServer.js");
var VirtualServer = require("./runtime/virtualServer.js");

function Host(){
    this.io = new IO();
    
    var flattener = new Flattener();
    var compiler = new Compiler();

    this.launch = function(){
        var flat = flattener.flatten(this.io.contentTree);
        var views = compiler.compile(flat.views, flat.assets);
        
        var staticServer = new StaticServer(views);
        var virtualServer = new VirtualServer(flat.startScript, flat.virtualModules, flat.jsonFiles);
        
        staticServer.listen();
        virtualServer.listen();
    }
}


module.exports = Host;
},{"./processing/compiler.js":3,"./processing/flattener.js":4,"./processing/io.js":5,"./runtime/staticServer.js":6,"./runtime/virtualServer.js":8}],3:[function(require,module,exports){
/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Injects encoded assets and subviews into views.
*/

var util = require("../util/util.js");

function Compiler() {
    
    /*
    Accepts an array of views and an array of pre-encoded assets.
    Compiles these views in-place.
    Returns the array of compiled views.
    */
    this.compile = function (views, assets) {
        injectAssets(views, assets);
        injectViews(views);
        replaceHashLinks(views);
        return views;
    };
    
    // Inject assets into views
    var injectAssets = function (views, assets) {
        var i, i2, regex;
        i = views.length;
        while (i--) {           
            i2 = assets.length;
            while (i2--) { 

                if (views[i].isRoot) {   
                    //Find instances of the path name and replace with encoded content
                    regex = new RegExp("(.\/|)" + util.escapeRegex(assets[i2].old), "g");
                    views[i].content = views[i].content.replace(regex, assets[i2].new);      
                }

                else if (views[i].extension === "css"){    

                    //Relaxes exact path matching for CSS files (only name match is required)
                    regex = new RegExp("url\(([^)]*)(.\/|)" + util.escapeRegex(assets[i2].name) + "([^)]*)\)", "g");
                    views[i].content = views[i].content.replace(regex, "url(" + assets[i2].new);

                }
                else{
                    /*
                    TODO: Support relative paths in more than just stylesheets.

                    Javascript may have many false matches.
                    Other types are completely unknown.
                    */
                }

            }
        }
    }
    
    
    // Inject subsviews into views
    var injectViews = function(views){
        var i, i2, regex, navScript;
        
        i = views.length;
        while (i--) {     
            if (views[i].isInvalid) continue;
            if (views[i].extension !== "html") continue; //Subviews only make sense for HTML
            
            i2 = views.length;
            while (i2--) { 
                if (views[i2].isInvalid) continue;
                
                
                switch (views[i2].extension){     
                        
                    case "css":
                        // External CSS files are replaced by embedded stylesheets
                        regex = new RegExp("<link.*rel\\s*=\\s*[\"']stylesheet[\"'].*href\\s*=\\s*[\"'](.\/|)" + util.escapeRegex(views[i2].path) + "[\"'].*>", "g");
                        views[i].content = views[i].content.replace(regex, "<style>" + views[i2].content + "</style>");
                        
                        break;
                        
                        
                    case "html":
                        // Links to internal HTML files are replaced via navigation scripts
                        regex = new RegExp("href\\s*=\\s*['\"](.\/|)" + util.escapeRegex(views[i2].path) + "(#[^'\"]*['\"]|['\"])", "g");
                        
                        navScript = `href='#' onclick="event.preventDefault();var parent=window.parent;var event = new CustomEvent('hypermessage', {detail: {type: 'navigate',path:'` + views[i2].path + `'}});parent.dispatchEvent(event)"`;
                        
                        views[i].content = views[i].content.replace(regex, navScript);
                        
                        break;
                        
                        
                    default:
                        //TODO support other kinds of injectable views (are there any?)
                        continue;
                }

            }
        }
    }
    
    // Replaces hash links with scrolling scripts
    var replaceHashLinks = function(views){
        var i, i2, regex, regex2, regex3, matches, anchorID;
        
        i = views.length;
        while (i--) {   
            if (views[i].isInvalid) continue;
            if (views[i].extension !== "html") continue; 
            
            
            // Replace hash links
            
            // Get all href attributes that begin with a hash
            regex = new RegExp("href\\s*=\\s*['\"](.\/|)\\s*#[^'\"]+['\"]", "g");
            matches = vews[i].content.match(re);
            
            if (matches !== null) {
                i2 = matches.length;
                while (i2--) {
                    
                    // Get the actual name (without the #)
                    regex2 = new RegExp("#[^'\"]+['\"]", "g")
                    anchorID = matches[i3].match(regex2)[0];
                    anchorID = anchorID.substr(1, anchorID.length - 2);
                    
                    // Get the full href again
                    regex3 = new RegExp("href\\s*=\\s*['\"](.\/|)\\s*#" + util.escapeRegex(anchorID) + "['\"]", "g");
                    
                    //Inject a script to control scrolling
                    //TODO: Is this the best solution?
                    views[i].content = views[i].content.replace(regex3, `href="#" onclick="event.preventDefault(); document.getElementById('` + anchorID + `').scrollIntoView();"`); 
                }
            }
            
        }
    }
}




module.exports = Compiler;
},{"../util/util.js":9}],4:[function(require,module,exports){
/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Flattens the content tree into two arrays of views and assets.


The content tree has the following example structure:

[
    {
        name: "folder",
        nodes : [
            {
                name : "nested file",
                content : "content of file here"
            }
        ]
    },
    {
        name : "a file",
        content : "some file content"
    }
]

*/

var util = require("../util/util.js");
var config = require("../config/config.json");


function Flattener() {

    var views,
        assets,
        startScript,
        virtualModules,
        jsonFiles,
        foundIndex;

    
    /*  
    Flattens a content tree and returns the result.
    
    Returns an object containing :
        an array of views,
        an array of assets, 
        a virtual server start script (if one exists), 
        a dictionary of virtual modules,
        a dictionary of json files.
    */
    this.flatten = function(tree) {
        
        //Reset working variables
        views = [];
        assets = [];
        virtualModules = {};
        foundIndex=false,
        jsonFiles = {};

        // Iterate across root level of tree
        for (var i = 0; i < tree.length; i++) {
            traverseFileTree(tree[i], "", 0, []);
        }
        
        if (!foundIndex){
            throw new Error("No index.html in root level of content tree.");
        }
        
        return {
            views : views,
            assets : assets,
            startScript : startScript,
            virtualModules : virtualModules,
            jsonFiles : jsonFiles
        };
    }

    // Traverses an item of unknown type in the content tree
    var traverseFileTree = function (item, path, depth, ancestors) {
        if (item.name[0] === "." || item.isRemoved) return; //Ignore hidden files

        if (!item.nodes) { //No child node array, must be a file
            pushFile(path, item, depth <= 1);
        } else {

            // Recursively traverse folder
            for (var i = 0; i < item.nodes.length; i++) {
                var newPath = path + item.name + "/";
                var newAncestors = ancestors.slice(0);
                newAncestors.push(item.name);
                
                traverseFileTree(item.nodes[i], newPath, depth + 1, newAncestors);
            }
        }
    }


    var pushFile = function (path, item, isRoot) {
        var ext = util.nameToExtension(item.name);
        
        
        // Views must not be encoded!
        if (util.contains(config.extensions.view, ext)) { 
            
            if (path + item.name === "index.html") { // Find the root HTML page
                foundIndex = true;
            }

            if (ext === "json") {
                jsonFiles[path + item.name.split(".")[0]] = JSON.parse(item.content); //JSON files are reserved for the server. If you need them in client, use a virtual backend to serve them
            } else {
                views.push({
                    content: item.content,
                    path: path + item.name,
                    extension: ext,
                    isRoot: isRoot
                });
            }
        } 
        
        
        // Should not be encoded initially, but we will encode them
        else if (util.contains(config.extensions.text, ext)) { 
            var dataURI = item.dataURI || util.toDataURI(item.content);

            if (item.name.substring(0, 3) === "HH-") {
                if (item.name === "HH-server.js") { // Virtual server start file
                    startScript = dataURI;
                } else { //Virtual server module
                    var name = item.name.substring(3).slice(0, -3);
                    virtualModules[name] = dataURI;
                }
            } else {
                assets.push({
                    old: path + item.name,
                    new: dataURI,
                    extension: ext,
                    itemName: item.name,
                    isFont: false
                });
            }

        } 
        
        
        //Misc files should always be encoded
        else { 
            var dataURI = item.dataURI ||  util.toDataURI(item.content);
            
            var isFont = util.contains(config.extensions.image, ext); // Identify fonts
            
            assets.push({
                old: path + item.name,
                new: dataURI,
                extension: ext,
                itemName: item.name,
                isFont: isFont
            });
        }

    }
}


module.exports = Flattener;
},{"../config/config.json":1,"../util/util.js":9}],5:[function(require,module,exports){
/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Builds content trees from different inputs
*/

function IO(){
    this.contentTree = {nodes:[]};
    
    /*
    Builds a true content tree from a tree containing File objects.
    */
    this.buildFileTree = function(fileTree, callback){
        
    };
    
    /*
    Builds content tree from JSZip file object.
    */
    this.buildZip = function(zip, callback){
        
    };
    
    /*
    Builds content tree from list of files with paths.
    */
    this.buildFilePaths = function(fileArray, callback){
        
    };
    
    /*
    Builds from a WebkitDirectory object
    */
    this.buildWebkitDirectory = function(webkitDirectory, callback){
        
    };
}


module.exports = IO;
},{}],6:[function(require,module,exports){
/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Serves static resources over WebRTC.

*/

var globalConfig = require("../config/config.json");

function StaticServer(views) {

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
},{"../config/config.json":1}],7:[function(require,module,exports){
/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

This module is used by a virtual server running INSIDE HyperHost.
It is not a component of HH itself, but a requirement for the virtual server.

It is similar to Express.js, but with HH connections instead of HTTP.

*/


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
            addEventListener('hyperdata', function (e) {
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
        console.log("> Hosted at " + clientURL);
    }

    return app;
}

return module.exports;
},{}],8:[function(require,module,exports){
/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Emulates a Node.js server.

*/

var config = require("../config/config.json")
var hyperhostRequireModule = require("./virtualModules/HH-hyperhost.js");

function VirtualServer(startScript, modules, jsonFiles){

    this.listen = function(){
        var npmModuleList = Object.keys(jsonFiles['package']["dependencies"]); //Get NPM modules from package.json
        var moduleListing = Objects.keys(modules);
        moduleListing = moduleListing.concat(npmModuleList);
        
        
        //Generate urls for wzrd.in files
        for (var i = 0; i < npmModuleList.length; i++) {
            module.modules[npmModuleList[i]] = getWzrdModuleUrl(npmModuleList[i], jsonFiles["package"]["dependencies"][npmModuleList[i]]);
        }
        
        
        //Inject the virtual backend modules
        util.injectScripts(moduleListing, modules, function () {
                  
            //Wzrd will put everything on the window, so we need to move it to the modules
            for (var i = 0; i < npmModuleList.length; i++) {
                modules[npmModuleList[i]] = window[util.camelize(npmModuleList[i])];
            }

            // Add the HyperHost virtual module
            moduleListing.push('hyperhost'); 
            modules['hyperhost'] = hyperhostRequireModule;
            
            window.require = HHrequire; //Overwrite any other 'require' methods

            //Inject the virtual start script after modules loaded
            var script = document.createElement('script');
            script.setAttribute('type', 'text/javascript');
            script.setAttribute('src', startScript);
            document.head.appendChild(script);
        });
    }
    
    // The 'require' emulator
    var HHrequire = function (moduleName) {
        if (moduleListing.indexOf(moduleName) === -1) {   
            return;
        } else {
            return modules[moduleName];
        }
    }
    
    
    //Gets a Wzrd.in url from module name
    var getWzrdModuleUrl = function(name, version) {
        return config.paths.wzrd + name + jsonFiles["package"]["dependencies"][name] + (!!version ? "@" + version : "");
    }
}



module.exports = VirtualServer;
},{"../config/config.json":1,"./virtualModules/HH-hyperhost.js":7}],9:[function(require,module,exports){
/*

Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Utilities.

*/


// Escapes a regex expression
module.exports.escapeRegex = function(str){
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

// Creates a dataURI from some data
module.exports.toDataURI = function(content){    
    var prefix = {
        js : "data:text/javascript;base64,"
    };

    try {
        return prefix.js+btoa(unescape(encodeURIComponent(content)));
    }catch (err){
        console.warn(err);
        try{
            return prefix.js+btoa(content);
        }catch (err){
            console.warn(err);
            return "";
        }
    }
}

// Gets the extension of a file name
module.exports.nameToExtension = function(name){
    var ext = name.split(".");
    ext = ext[ext.length - 1].toLowerCase();
    return ext;
}

// Check if array contains an item
module.exports.contains = function(array, item){
    return array.indexOf(item) !== -1;
}

// Deeply sets a nested object/array tree, creating ancestors where they are missing
// Ancestors is an array of names that lead from root to the target object
module.deepSetTree = function(tempObj, value, ancestors) {
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


// Injects an array of urls as scripts into the document
module.exports.injectScripts = function(scripts, mappingObject, callback) {
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


//Basic ajax call
module.exports.ajax = function (method, url, xOriginProxy, successCallback, errorCallback) {
    var xhr = new XMLHttpRequest();
    url = xOriginProxy + url;
    xhr.open(method, url, true);
    xhr.onreadystatechange = function (e) {
        if (this.readyState === 4) {
            if (this.status >= 200 && this.status < 400) {
                if (successCallback && successCallback.constructor == Function) {
                    return successCallback(this.responseText);
                }
            } else {
                if (errorCallback && errorCallback.constructor == Function) {
                    return errorCallback(this.statusText);
                } else {
                    console.error("Failed to get resource '" + url + "' Error: " + this.statusText);
                }
            }
        }
    };
    xhr.onerror = function (e) {
        if (errorCallback && errorCallback.constructor == Function) {
            return errorCallback(this.statusText);
        } else {
            console.error("Failed to get resource. Error: " + this.statusText);
        }
    };
    xhr.send(null);
};

//Ajax-es an array of urls, only returning when all have been loaded
module.exports.ajaxMulti = function (arr, successCallback, errorCallback) {
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


// dash-case to camelCase
module.exports.camelize = function(str) {
    return str.replace(/-([a-z])/g, function (g) {
        return g[1].toUpperCase();
    });
}
},{}]},{},[2])(2)
});