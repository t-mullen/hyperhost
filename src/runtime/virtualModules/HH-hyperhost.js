/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

This module is used by a virtual server running INSIDE HyperHost.
It is not a component of HH itself, but a requirement for the virtual server.

It is similar to Express.js, but with HH connections instead of HTTP.

*/


//Constructor for the response object, which abstracts away PeerJS
var Response = function (conn, id) {
    this.body;
    this.send = function (data) {
        this.body = data;
        this.end();
    }
    this.end = function () {
        conn.send({
            type: "response",
            id: id,
            content: {
                statuscode: this.statuscode,
                body: this.body
            }
        });
    }
    this.statuscode = 200;
    this.kill = function () {
        conn.close();
    }
}

//Creates the server app
module.exports.createApp = function () {
    var app = {};

    var listening = false;

    //Constructs a new router function with the specified methods allowed
    var RouterFunction = function (methods) {
        var routerFunction = function (route, requestListener, next) {
            addEventListener('hyperdata', function (e) {
                if (!listening) return; //Ignore requests made before server is started
                if (route !== e.detail.request.route) return; //Ignore invalid routes TODO: error here
                if (routerFunction.methods.indexOf(e.detail.request.method.toLowerCase()) === -1) { //Block invalid method
                    console.error("> Client requested unsupported route '" + e.detail.request.method + "' on route '" + route + "'");
                    return;
                }
                console.log(e.detail.id + " : " + e.detail.request.method.toUpperCase() + " " + route)
                requestListener(e.detail.request, new Response(e.detail.connection, e.detail.id), next);
            }, false);
        }
        routerFunction.methods = methods;
        return routerFunction;
    }

    //Router functions for different methods
    app.all = new RouterFunction(['get', 'post']);
    app.get = new RouterFunction(['get']);
    app.post = new RouterFunction(['post']);

    //Allows requests to be served
    app.listen = function () {
        listening = true;
        console.log("> Virtual server listenting...");
    }

    return app;
}

return module.exports;