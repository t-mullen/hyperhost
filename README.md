# HyperHost
##Webservers, without servers.

HyperHost allows hosting of websites directly from the browser using P2P WebRTC and a custom rendering framework.

Simply go to https://rationalcoding.github.io/HyperHost/ and drag n' drop the root folder of your website containing at least a **index.html**. Your website will be proccessed and displayed in your browser a few seconds. Then, *anyone* can access your site at the same URL. That's it.

Your site will be available so long as your browser has an uninterrupted network connection. All resources are served via a encrypted P2P connection. Any static resources can be served.

##Go Beyond Static Websites
HyperHost creates a virtual server that uses your browser runtime to handle HTTP-like requests.

It has syntax similar to Express.js (stay tuned for additions to the language)
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

##Great for demos and hackathons!

**Upcoming Features:**  
- Virtual backend - Handle API calls and subsequent calls to the host, allow session management and small databases.
- Distributed hosting - Allow clients to opt-in to helping you host the site.
- Rehost option - Store processed site in localstorage for fast redeployment.

**Current Limitations:**  
- The host must be running a relatively new version of Chrome. The client can run Chrome, Firefox or Opera. (Testing pending on Edge)
- Very large websites, **more than 80MB**, can freeze up when clients attempt to load them. (Serving needs to be staggered.)  
- URLs pointing to hosted files inside **Javascript** files will not work. **External URLs will work.** (JS cannot easily be refactored, a partial fix might happen.)
- Truly massive files cannot be hosted due to encoding being impossible.

**Notes:**  
You can host the files in this repo anywhere (even on a file:// domain!) if you don't want to use Github's servers for the initial resources. You can also use any PeerJS signalling server.

