/*
hyperhost.js Thomas Mullen 2016
Uses WebRTC to host static websites from the browser.
To view the site elsewhere, only the generated PeerJS id (the URL hash) and hyperclient.js is needed.
*/

(function () {
    var initialized = false;
    document.addEventListener("DOMContentLoaded", function (event) {
        if (initialized) return;
        initialized = true;

        var rawViews = []; //Html, css, js... files that load children (always text files)
        var assets = []; //Images, fonts... files that cannot load children (can be url encoded)
        var fileCount = 0;
        var traversalComplete = false;

        function traverseFileTree(item, path, notRoot) {
            path = path || "";
            if (item.isFile) {
                // Get file
                item.file(function (file) {
                    var reader = new FileReader();
                    fileCount++;


                    var ext = item.name.split(".");
                    ext = ext[ext.length - 1].toLowerCase();
                    if (["html", "css", "js"].indexOf(ext) != -1) {
                        reader.addEventListener("load", function () {
                            rawViews.push({
                                body: reader.result,
                                path: path + item.name,
                                extension: ext
                            });
                            fileCount--;
                            if (fileCount == 0 && traversalComplete) {
                                preprocessFiles();
                            }
                        }, false);
                        reader.readAsText(file); //Read these as text
                    } else {
                        reader.addEventListener("load", function () {
                            assets.push({
                                old: path + item.name,
                                new: reader.result,
                                extension: ext,
                                fontName: item.name
                            });
                            fileCount--;
                            if (fileCount == 0 && traversalComplete) {
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
                var dirReader = item.createReader();
                dirReader.readEntries(function (entries) {
                    for (var i = 0; i < entries.length; i++) {
                        traverseFileTree(entries[i], notRoot ? path + item.name + "/" : "", true);
                    }
                });
            }
        }

        function escapeRegExp(str) {
            return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        }

        function preprocessFiles() {
            for (var i = 0; i < rawViews.length; i++) {
                //Replace assets with their data URL
                for (var i2 = 0; i2 < assets.length; i2++) {
                    rawViews[i].body = rawViews[i].body.replace(assets[i2].old, assets[i2].new);
                }
            }
            for (var i = 0; i < rawViews.length; i++) {
                //Determine rawView dependencies
                if (rawViews[i].extension == "html") { //Only html-out referencing is supported (should be suitable for most cases)
                    for (var i2 = 0; i2 < rawViews.length; i2++) {
                        //Replace external javascript with embedded script
                        if (rawViews[i2].extension == "js") {
                            var re = new RegExp("<script.*src\\s*=\\s*[\"']" + escapeRegExp(rawViews[i2].path) + "[\"'][^>]*>", "g");
                            rawViews[i].body = rawViews[i].body.replace(re, "<script>" + rawViews[i2].body);
                        }
                        //Replace external stylesheets with embedded styles
                        if (rawViews[i2].extension == "css") {
                            var re = new RegExp("<link.*rel\\s*=\\s*[\"']stylesheet[\"'].*href\\s*=\\s*[\"']" + escapeRegExp(rawViews[i2].path) + "[\"'].*>", "g");
                            rawViews[i].body = rawViews[i].body.replace(re, "<style>" + rawViews[i2].body + "</style>");

                            var re = new RegExp("<link.*href\\s*=\\s*[\"']" + escapeRegExp(rawViews[i2].path) + "[\"'].*rel\\s*=\\s*[\"']stylesheet[\"'].*>", "g");
                            rawViews[i].body = rawViews[i].body.replace(re, "<style>" + rawViews[i2].body + "</style>");
                        }
                        //Create hyper-host inter-page navigation scripts
                        if (rawViews[i2].extension == "html") {
                            var re = new RegExp("href\\s*=\\s*['\"]" + escapeRegExp(rawViews[i2].path) + "['\"]", "g");
                            rawViews[i].body = rawViews[i].body.replace(re, "href='#' class='HYPERHOST-internal-link' data-href='" + rawViews[i2].path + "'");
                        }
                    }
                }
                //Inject navigation script
                var navScript = `
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
                `;
                document.getElementsByClassName
                rawViews[i].body = rawViews[i].body.replace("<head>", "<head><script>" + navScript + "</script>");
            }

            // Start with index.html
            document.getElementById("HYPERHOST-viewframe").style.display = "inherit";
            document.getElementById("HYPERHOST-dropzone").style.display = "none";
            HYPERHOST_NAVIGATE("index.html");
            HYPERHOST_SERVE(); //We can now serve the processed files to anyone who requests them
        }

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

        document.getElementById("HYPERHOST-dropzone").addEventListener("drop", function (event) {
            event.preventDefault();
            event.stopPropagation();

            document.getElementById("HYPERHOST-header").innerHTML = "Loading...";

            var items = event.dataTransfer.items;
            for (var i = 0; i < items.length; i++) {
                var item = items[i].webkitGetAsEntry();
                if (item) {
                    traverseFileTree(item);
                }
            }
            traversalComplete = true;
            event.target.style.borderColor = '#d4ac00';
        }, false);

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

        function HYPERHOST_SERVE() {
            //Serve incoming WebRTC connections
            var MY_ID = parseInt(Math.random() * 1e15, 10).toString(16);
            var PEER_SERVER = {
                host: "peerjs-server-tmullen.mybluemix.net",
                port: 443,
                path: "/server",
                secure: true
            };
            var peer = new Peer(MY_ID, PEER_SERVER); //Create the peer
            window.location.hash = MY_ID; //Update URL to reflect where clients can connect

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
    });

    if (window.location.hash) {
        window.location = "/HyperHost/client.html" + window.location.hash;
    }
})();