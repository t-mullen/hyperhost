#HyperHost Core

This is the core module (without the UI). Only dependency is PeerJS.

###API
**hyperhost.js** places a `HyperHost` variable on the window object.  

You can use the defaults, or specify your own support servers.
```javascript
HyperHost.options({
    clientUrl : "https://rationalcoding.github.io/HyperHost/client.html", // URL to the page hosting client.js
    wzrdHost : "tmullen-bcdn.herokuapp.com", // Hostname of the WZRD.in instance (for fetching NPM modules)
    peerServer : {
                    host: "peerjs-server-tmullen.mybluemix.net", //Hostname of PeerJS instance
                    port: 443,          //Port to use
                    path: "/server",    //Path to PeerJS endpoint
                    secure: true        
                }  
});
```

The below method processes a structured tree and immediately hosts it. Subsequest calls will overwrite the tree host the new content at the same URL.  
The callback will be fired when a client URL is available.  
```javascript
HyperHost.consumeTree(myTree, callback);
```
To put files into HyperHost, you will need to provide a structured tree of this format.  
```javascript
var myTree = [
    {
        name : "index.html", // Name of file
        content : "<html></html>"   // Content of file, as a string
    },
    {
        name : "myFolder",  // Name of folder
        nodes : [
            {
                name: "subFolder",
                nodes : []
            },
            {
                name : "nestedFile.js",
                content : "var a = 1"
            }
        ]
    }
]
```