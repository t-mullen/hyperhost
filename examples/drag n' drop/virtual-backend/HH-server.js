/*
Example virtual server code. Feel free to use this as a template for your own applications.
This file MUST be named HS-server.js for it to be loaded.

See HS-fs.js for an example of how to create your own modules from Browserify modules.

See exampleClient.js for how to make requests to this server.
*/


// We can use 'require' as we would with Node's 'require'.
var hyperhost = require('hyperhost'); //This module enables to interact with HyperHost. It is similar to Express
var custom = require('custom'); //Require custom modules
var fs = require('browserify-fs'); //We can require any modules that work with Browserify

var app = hyperhost.createApp(); //Creates our app


//Requests to this server are done via HyperHost P2P clients and are NOT ordinary HTTP requests!

//Handles 'get requests' to the '/' route
app.get('/', function (req, res) {
    //We can use our modules
    
    custom.someFunction();
    fs.mkdir('/home');
    fs.writeFile('/home/hello-world.txt', "Virtual file system? Yes please!");
    console.log(fs);
    
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