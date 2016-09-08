/*
Example virtual server code. Feel free to use this as a template for your own applications.
This file MUST be named HS-server.js for it to be loaded.

See the exampleClient.js for how to make requests to this server.
*/


// We can use 'require' as we would with Node.
var peerserver = require('peerserver'); //This module handles incoming reuqests from other peers
var app = peerserver.createApp(); //Creates our app


//Requests to this server are done via HyperHost P2P clients and are NOT ordinary HTTP requests!

//Handles 'get requests' to the '/' route
app.get('/', function (req, res) {
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


app.listen(); //This starts the virtual server



/*
"Wait, this looks like Node! Can I...?" 
--> Probably not. The virtual server uses your browser runtime, it is not an actual server. 
I will try to emulate as many useful functions as possible, but this will always be a subset of Node.
*/