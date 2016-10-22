# HyperHost
##Instant Drag n' Drop Hosting

Go to https://rationalcoding.github.io/HyperHost/ and drag n' drop the folder of any website containing at least an **index.html**. A link to your hosted site will appear after a few seconds. Then, anyone with a WebRTC enabled browser can see it from anywhere. That's it. No server hosting your files, no charges, just direct hosting.

Your site will be available so long as your browser window is open. All resources are served via an encrypted P2P connection.

##A WebRTC-powered Node server in Your Browser
You can also run a virtual Node server straight in your browser.

Put your server's starting code in a file called **HH-server.js**, then drag n' drop into HyperHost like you would a static site.  
Put any additional server code in files with the **HH-** extension. We can **require** these.
Put any modules you need to be downloaded from NPM in a file called **package.json**

Here is an example HH-server.js
```javascript
var hyperhost = require('hyperhost'); //This module lets us handle P2P connections
var fs = require('browserify-fs'); //We can require ANY module that can be Browserified
var custom = require('custom'); //We can require our other server files.
var app = hyperhost.createApp(); //Creates our app

//Handles 'get requests' to the '/' route
app.get('/', function (req, res) {
    //We can use our modules
    
    custom.someFunction();
    fs.mkdir('/home');
    fs.writeFile('/home/hello-world.txt', "Virtual file system? Yes please!");
    
    //We can send any data over the connection (including files, blobs, anything)
    res.send({
        exampleData: "hello!",
        moreData: [1, 4, 2, 3],
        more: {
            anyData: {}
        }
    });
});

app.listen(); //This starts the virtual backend
```

Here is an example of **package.json**
```javascript
{
  "name": "MyNodeApp",
  "dependencies": { 
    "browserify-fs": ">1.0.0", //These are modules that will be pulled from NPM
    "crypto-browserify" : "", //Don't specify a version number for the latest version
  }
}
```

Calls to this virtual server can only be made from the site being hosted.  
HyperHost defines the `HyperRequest` object, which is similar to the `XMLHttpRequest` object.
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

##Great for demos and hackathons!

**Upcoming Features:**  
- Distributed hosting - Allow clients to opt-in to helping you host the site via a "branching-tree" mesh network.
- Rehost option - Store processed site in localstorage for fast redeployment.
- Features for hosts. See traffic statistics, change files without redeploying, notifications, themes, etc.
- Zip uploading for cross-browser support.
- No-WebRTC fallback for mobile and old browsers. 
- Full SQLLite server with WebSQL.
- Search other websites that are hosted. (Also, a service to expose websites to real search engines.)
- Full documentation and better examples.

**Current Limitations:**  
- The host must be running Chrome (no other browser supports folder drag n' drop). The client can be [any browser supporting WebRTC](http://caniuse.com/#feat=rtcpeerconnection).
- Very large pages, **more than 40MB**, can freeze up when clients attempt to load them. 
- URLs pointing to hosted files inside **Javascript** files will not work. **External URLs will work.** (JS cannot easily be refactored, a partial fix might happen.)
- Truly massive files cannot be hosted due to encoding being impossible.

**Notes:**  
You can host the files in this repo anywhere (even on a file:// domain!) if you don't want to use Github's servers for the initial resources. You can also use any PeerJS signalling server.

### [MULTIHACK](https://rationalcoding.github.io/multihack) is a web-based IDE that uses HyperHost to deploy your project even faster!
