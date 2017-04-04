<h1 align="center">
  <br>
  <a href="https://rationalcoding.github.io/HyperHost/"><img src="https://s12.postimg.org/6asslh8hp/HH_logo.png" alt="HyperHost" width="200"></a>
  <br>
  HyperHost
  <br>
  <br>
</h1>
<h4 align="center">Peer-To-Peer Node Servers in the Browser.</h4>
<br>

### Demo
Drag and drop your website (with at least an **index.html**) into https://rationalcoding.github.io/HyperHost/.  
It will be instantly served ***from your browser*** via WebRTC.

### Node Servers
HyperHost emulates a Node server in your browser by replacing HTTP requests with WebRTC connections.  
This, along with the huge number of [Browserified](https://github.com/substack/node-browserify) Node modules, allows you to run a full server from your browser.  

Drag and drop a folder containing a file an **index.html** and a **HH-server.js**.
Inside **HH-server.js**, you can put your Node start script.  

Example of a **HH-server.js**:
```javascript
// HyperHost gives you access to a Node-like 'require'
var hyperhost = require('hyperhost'); // This special module lets us handle WebRTC connections
var fs = require('browserify-fs');    // require any module that can be Browserified
var custom = require('custom');       // require custom modules that you upload with the "HH-" prefix (ie HH-custom.js"

var app = hyperhost.createApp();
app.get('/', function (req, res) {    

    custom.someFunction();
    
    fs.mkdir('/home');
    fs.writeFile('/home/hello-world.txt', "browserify-fs is used to create a virtual file system!");
    
    // Send any data over WebRTC (objects, files, blobs)
    res.send({
        exampleData: "send any serializable data",
        a : []
    });
});

app.listen();
```

### Pull from NPM

You can pull NPM modules via [WZRD](https://wzrd.in/) by adding a **package.json**:
```javascript
{
  "name": "MyNodeApp",
  "dependencies": { 
    "browserify-fs": ">1.0.0", // These are modules that will be pulled from NPM
    "crypto-browserify" : "",  //
  }
}
```

### Client Code

Calls to this Node server can only be made from the pages being hosted. (Think of it like CORS)  
Including **hyperclient.js** in your hosted files provides the `HyperRequest` object, similar to the `XMLHttpRequest` object.  
```javascript
//Here is an example request
var hyp = HyperRequest(); //Create a new HyperRequest
hyp.onload = function (response) { //Set the callback
    console.log(response);
    document.getElementById("output").innerHTML = JSON.stringify(response);
}
hyp.open("GET", "/"); //Set the method and route
hyp.send({ //Send arbitrary data to server
    message: "hello",
    moreData: [12, 42, 21, ],
    evenMore: {}
});
```

### How It Works
First, the files you upload are read and seperated into static assets (images, HTML, CSS, etc) and server code (Javascript with the "HH-" prefix, or a package.json).  

The static assets are base64 encoded and bundled into a single large file (with some extra scripts for changing page). The server code is injected into the host page, along with any external NPM modules. The server is now running.  

When a client connects, they first connect to a signalling server, which helps with the creation of a WebRTC connection to the host page. When a connection is established, the static resource bundle is sent and displayed by the client.    

The same connection is used to handle any subsequent requests to the host (by way of the HyperRequest object). These requests are forwarded to the server code, which sends a response back the same way.  

### Custom Usage

The demo at https://rationalcoding.github.io/HyperHost/ is just one use-case of HyperHost.  
You can easily integrate instant hosting over WebRTC into any project.  
```javascript
var host = new HyperHost(); // Create a new HyperHost instance

host.on('ready', function(url){
  window.open(url); // Open the window when a URL is available
});

host.io.on('digest', function(){
    host.launch();  // Launch the server when digest is completed
});

// Digest the content to be served.
host.io.contentTree([
    {
       name : 'index.html',
       content : '<html><body>Hello World</body></html>'
    },
    {
        name : "HH-server.js",
        content : 'var hyperhost = require("hyperhost"); console.log(hyperhost);'
    }
]);
```

## Great for demos and hackathons!

**Upcoming Features:**  
- Distributed hosting - Allow clients to opt-in to helping you host the site via a mesh network.  
- More ways to upload your site.  
- Full documentation and better examples. 
- More custom modules (WebSockets, MySQL, templating views)  

**Current Limitations:**  
- Any Node modules used must be Browserify-able.  
- The host must be running Chrome. The client can be [any browser supporting WebRTC](http://caniuse.com/#feat=rtcpeerconnection).
- Very large pages can freeze up when clients attempt to load them. 
- Relative URLs pointing to hosted files inside **Javascript** files will not work. (JS cannot easily be refactored, an API for allowing this is forthcoming)
- The **require** method only supports module *names* and not *paths*. `require('custom')`, not `require('./custom')`. (Use Browserify before uploading if you need this behaviour)

**Notes:**  
You can host the files in this repo anywhere (even on a file:// domain!) if you don't want to use Github's servers for the initial resources. You can also use any PeerJS signalling server (with the addition of a `/api/peers` route that returns all peer IDs)

### [MULTIHACK](https://rationalcoding.github.io/multihack-web) is a web-based editor that uses HyperHost to deploy your project even faster!
