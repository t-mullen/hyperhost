# HyperHost
##Webservers, without servers.

HyperHost allows you to host websites directly from your browser using P2P WebRTC and a custom rendering framework.

Simply go to https://rationalcoding.github.io/HyperHost/ and drag n' drop the root folder of your website containing at least a **index.html**. Your website will be proccessed and a link to your hosted site will appear after a few seconds. Then, anyone* can access your site at the same URL. That's it.

Your site will be available so long as your browser has an uninterrupted network connection. All resources are served via a encrypted P2P connection. Any static resources can be served.

##Go Beyond Static Websites
If you need more than a static website, HyperHost allows you to create a virtual server that uses your browser runtime to handle HTTP-like requests.

It has syntax similar to Express.js (stay tuned for additions to the language).  
Put your server code in a file named **HS-server.js**, then drag n' drop as you would a static site.
```
var peerserver = require('peerserver');
var app = peerserver.createApp();

app.get('/', function(req, res) {
  res.send({
    anyData : "Any serializable data can be returned in the response.",
    atAll: {a: [1,2,3], b: {}}
  });
});

app.post('/myroute', function (req, res) {
    res.body = {
        array: [1, 2, 3],
        object: {},
        int: 5
    }
    res.body.int = 6;
    res.end(); 
});

app.listen();
```

You can interact with this server via any website hosted in HyperHost by defining the HyperRequest class in any client-side script. 
```
//This script enables us to make requests to the virtual backend
var HyperRequest = function () {
    self = {};
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
- More modules for virtual backends. (Databases, user management, utilities, custom modules, etc)
- Distributed hosting - Allow clients to opt-in to helping you host the site.
- Rehost option - Store processed site in localstorage for fast redeployment.
- UI for hosts. See active connections, logs, change files without redeploying.

**Current Limitations:**  
- The host must be running Chrome. The client can run Chrome, Firefox or Opera. (Testing pending on Edge)
- Very large websites, **more than 80MB**, can freeze up when clients attempt to load them. (Serving needs to be staggered.)  
- URLs pointing to hosted files inside **Javascript** files will not work. **External URLs will work.** (JS cannot easily be refactored, a partial fix might happen.)
- Truly massive files cannot be hosted due to encoding being impossible.

**Notes:**  
You can host the files in this repo anywhere (even on a file:// domain!) if you don't want to use Github's servers for the initial resources. You can also use any PeerJS signalling server.

