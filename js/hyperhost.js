var HYPERHOST_NAVIGATE;
document.addEventListener("DOMContentLoaded", function (event) {
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
                        rawViews[i].body = rawViews[i].body.replace(re, "href='' onclick='alert(\"Only single-page sites are currently supported by HyperHost\");return false;'");
                    }
                }
            }
        }

        // Start with index.html
        document.getElementById("HYPERHOST-viewframe").style.display = "inherit";
        document.getElementById("HYPERHOST-dropzone").style.display = "none";
        document.getElementsByTagName("html")[0].style.background = "white";
        HYPERHOST_NAVIGATE("index.html");
        HYPERHOST_SERVE(); //We can now serve the processed files to anyone who requests them
    }

    HYPERHOST_NAVIGATE = function (path) {
        for (var i = 0; i < rawViews.length; i++) {
            if (rawViews[i].path === path) {
                document.getElementById("HYPERHOST-viewframe").src = 'data:text/html;charset=utf-8,' + encodeURI(rawViews[i].body);
                console.log("Navigated to " + path);
                return;
            }
        }
        alert("HyperHost path '" + path + "' does not exist!");
    }

    document.getElementById("HYPERHOST-dropzone").addEventListener("drop", function (event) {
        event.preventDefault();
        event.stopPropagation();

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

        peer.on('connection', function (conn) {
            conn.on("open", function () {
                conn.send(rawViews);
            });
        });
    }
});

if (window.location.hash) {
    window.location = "/HyperHost/client.html" + window.location.hash;
}