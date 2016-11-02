/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License


HyperHost v2.0
Module to host websites over WebRTC.


*/

const IO = require("./processing/io.js"),
    Flattener = require("./processing/flattener.js"),
    Compiler = require("./processing/compiler.js"),

    StaticServer = require("./runtime/staticServer.js"),
    VirtualServer = require("./runtime/virtualServer.js");

function Host(){
    this.io = new IO();
    
    let flattener = new Flattener(),
        compiler = new Compiler(),
        staticServer,
        virtualServer,
        _handlers = {};

    /*
        Launch the server.
    */
    this.launch = function(){
        const flat = flattener.flatten(this.io.contentTree),
            views = compiler.compile(flat.views, flat.assets);
        
        staticServer = new StaticServer(views, !!flat.startScript);
        
        if (!!flat.startScript){
            virtualServer = new VirtualServer(flat.startScript, flat.virtualModules, flat.jsonFiles);
        }
        
        staticServer.launch();
        virtualServer.launch();
        
         _emit('url', staticServer.clientURL);
    }
    
    /*
        Listen for an event.
    */
    this.on = function(event, handler){
        _handlers[event]=handler;
    }
    
    var _emit = function(event, data){
        var fn = _handlers[event];
        if (fn && typeof(fn) === 'function'){
            fn(data);
        }
    }
}


module.exports = Host;