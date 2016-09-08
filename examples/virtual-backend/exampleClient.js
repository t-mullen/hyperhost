/*
Example client code for making requests to a virtual backend. Feel free to use this as a template for your own applications.

See HS-server.js to see how to create a server that can handle these requests.
*/

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

//Here is an example request
var hyp = HyperRequest(); //Create a new HyperRequest
hyp.onload = function (response) { //Set the callback
    console.log(response);
    document.getElementById("output").innerHTML = JSON.stringify(response);
}
hyp.open("GET", "/"); //Set the method and route
hyp.send({ //Send arbitrary data to server
    message: "hello",
    moreData: [12, 42, 21],
    evenMore: {}
});