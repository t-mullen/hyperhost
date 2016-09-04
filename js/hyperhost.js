/*
hyperhost.js Thomas Mullen 2016
Uses WebRTC to host static websites from the browser.
To view the site elsewhere, only the generated PeerJS id (the URL hash) and hyperclient.js is needed.
*/

(function () {
    var initialized = false;
    document.addEventListener("DOMContentLoaded", initializeHost, false);

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
                            if (item.name === "hyperserver.js") {
                                serverCode = reader.result
                            } else {
                                rawViews.push({
                                    body: reader.result,
                                    path: path + item.name,
                                    extension: ext,
                                    isRoot: depth <= 1
                                });
                            }
                            fileCount--;
                            if (fileCount === 0 && traversalComplete) {
                                preprocessFiles();
                            }
                        }, false);
                        reader.readAsText(file); //Read these as text
                    } else {
                        reader.addEventListener("load", function () {
                            var isFont = ["eot", "woff", "woff2", "ttf", "svg", "sfnt", "otf"].indexOf(ext) !== -1;
                            assets.push({
                                old: path + item.name,
                                new: reader.result,
                                extension: ext,
                                itemName: item.name,
                                isFont: isFont
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
                            rawViews[i].body = rawViews[i].body.replace(re, "href='#' class='HYPERHOST-internal-link' data-href='" + rawViews[i2].path + "'");
                        }
                    }
                }
                //Inject navigation script
                /*
                document.addEventListener("DOMContentLoaded", function (event) {
                    //Send message to parent document (across iframe)
                    function message(data) {
                        var parentWindow = window.parent;
                        var event = new CustomEvent('hypermessage', {
                            detail: data
                        });
                        parentWindow.dispatchEvent(event);
                    }

                    //Add listeners to internal links
                    var els = document.getElementsByClassName("HYPERHOST-internal-link");
                    for (var i=0; i<els.length; i++){
                        els[i].addEventListener('click', function(e){
                            e.preventDefault();
                            console.log("Requested HYPERHOST navigation to"+e.target.dataset.href);
                            message({type:"navigate",path:e.target.dataset.href});
                        });
                    }
                });
                */
                var navScript = 'document.addEventListener("DOMContentLoaded",function(a){function b(a){var b=window.parent,c=new CustomEvent("hypermessage",{detail:a});b.dispatchEvent(c)}for(var c=document.getElementsByClassName("HYPERHOST-internal-link"),d=0;d<c.length;d++)c[d].addEventListener("click",function(a){a.preventDefault(),console.log("Requested HYPERHOST navigation to"+a.target.dataset.href),b({type:"navigate",path:a.target.dataset.href})})});';
                if (!rawViews[i].invalid) {
                    rawViews[i].body = rawViews[i].body.replace("<head>", "<head><script>" + navScript + "</script>"); //Inject script into head
                }
            }

            document.querySelector("#HYPERHOST-dropzone > div > h2").innerHTML = "Starting server...";

            //Inject the virtual server code
            if (serverCode) {
                document.head.appendChild(document.createElement('script').setAttribute('srcdoc', serverCode));
            }

            // Start with index.html
            document.getElementById("HYPERHOST-viewframe").style.display = "inherit"; //Show the viewframe
            document.getElementById("HYPERHOST-dropzone").style.display = "none"; //Hide the dropbox
            window.setTimeout(function () {
                document.getElementById("HYPERHOST-viewframe").contentWindow.focus(); //Focus the viewframe
            }, 100);
            HYPERHOST_NAVIGATE("index.html"); //Navigate to the index
            HYPERHOST_SERVE(); //We can now serve the processed files to anyone who requests them
        }

        //Send message to viewFrame document (across iframe)
        function sendHyperMessage(data) {
            var childWindow = document.getElementById("HYPERHOST-viewframe").contentWindow;
            var event = new CustomEvent('hypermessage', {
                detail: data
            });
            childWindow.dispatchEvent(event);
        }

        //Handle messages from viewFrame document (across iframe)                       
        function handleHyperMessage(e) {
            console.log(e);
            if (e.detail.type === "navigate") {
                HYPERHOST_NAVIGATE(e.detail.path);
            }
        }
        window.addEventListener('hypermessage', handleHyperMessage, false);

        //Renders a different compiled HTML page in the viewframe
        function HYPERHOST_NAVIGATE(path) {
            for (var i = 0; i < rawViews.length; i++) { //Search for the path
                for (var i = 0; i < rawViews.length; i++) { //Search for the path
                    if (rawViews[i].path === path) {
                        document.getElementById("HYPERHOST-viewframe").srcdoc = rawViews[i].body;
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

        //Handles a folder drop event
        function handleDropEvent(event) {
            event.preventDefault();
            event.stopPropagation();

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
            MY_ID = parseInt(Math.random() * 1e15, 10).toString(16);
            var PEER_SERVER = {
                host: "peerjs-server-tmullen.mybluemix.net", //Swap out this if you want to use your own PeerJS server
                port: 443,
                path: "/server",
                secure: true
            };
            var peer = new Peer(MY_ID, PEER_SERVER); //Create the peer
            //Update URL to reflect where clients can connect (without reloading)
            var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?site=" + MY_ID;
            window.history.pushState({
                path: newurl
            }, '', newurl);

            peer.on('error', function (err) {
                console.error(err);
            });

            peer.on('connection', function (conn) {
                console.log("Connected to peer!");
                conn.on("open", function () {
                    console.log("Serving website to peer...");
                    conn.send({
                        rawViews: rawViews,
                        virtualBackend: false
                    });
                });
            });
        };
    }

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
})();