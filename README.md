# HyperHost
##Webservers, without servers.

HyperHost allows you to host websites directly from your browser using P2P WebRTC and a custom rendering framework.

Simply go to https://rationalcoding.github.io/HyperHost/ and drag n' drop the root folder of your website containing at least a **index.html**. Your website will be proccessed and a link to your hosted site will appear after a few seconds. Then, anyone* can access your site at the same URL. That's it.

Your site will be available so long as your browser has an uninterrupted network connection. All resources are served via a encrypted P2P connection. Any static resources can be served.

##Go Beyond Static Websites
If you need more than a static website, HyperHost allows you to create a virtual server that uses your browser runtime.  
*Any* [Browserify](https://www.npmjs.com/package/browserify) module can be used.


Put your server code in a file named **HH-server.js**, then drag n' drop as you would a static site.
```
var hyperhost = HyperHost.require('hyperhost'); //This module enables us to act as a server for clients. It is similar to Express.
var custom = HyperHost.require('custom'); //Require custom modules
var fs = HyperHost.require('fs'); //We can require any Browserified modules

var app = hyperhost.createApp(); //Creates our app


//Requests to this server are done via HyperHost P2P clients and are NOT ordinary HTTP requests!

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

//Handles 'post requests' to the  '/myroute' route
app.post('/myroute', function (req, res) {
    //A more advanced way of doing the same thing
    res.body = {
        array: [1, 2, 3],
        object: {},
        int: 5
    }
    res.body.int = 6;
    res.end(); //Call res.end() when finished. res.send() calls this automatically.
});

//Handles both 'post' and 'get' requests 
app.all('/any/possible/route', function (req, res) {
    res.statuscode = 404; //We can define status codes
    res.kill(); //We can also kill the connection (this frees up resources but the client will no longer be able to make requests during their session)
});


app.listen(); //This starts the virtual backend
```

You can interact with this server via any website hosted in HyperHost by defining the HyperRequest class in any client-side script. 
```
//This script enables us to make requests to the virtual backend
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
```


```
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
- Distributed hosting - Allow clients to opt-in to helping you host the site.
- Rehost option - Store processed site in localstorage for fast redeployment.
- UI for hosts. See active connections, logs, change files without redeploying.
- Zip uploading for cross-browser support.
- No-WebRTC fallback for mobile and old browsers. 

**Current Limitations:**  
- The host must be running Chrome (no other browser supports folder drag n' drop). The client can be [any browser supporting WebRTC](http://caniuse.com/#feat=rtcpeerconnection).
- Very large websites, **more than 80MB**, can freeze up when clients attempt to load them. (Serving needs to be staggered.)  
- URLs pointing to hosted files inside **Javascript** files will not work. **External URLs will work.** (JS cannot easily be refactored, a partial fix might happen.)
- Truly massive files cannot be hosted due to encoding being impossible.

**Notes:**  
You can host the files in this repo anywhere (even on a file:// domain!) if you don't want to use Github's servers for the initial resources. You can also use any PeerJS signalling server.

