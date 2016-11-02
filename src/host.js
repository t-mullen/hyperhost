/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License


HyperHost v2.0
Module to host websites over WebRTC.


*/

var IO = require("./processing/io.js");
var Flattener = require("./processing/flattener.js");
var Compiler = require("./processing/compiler.js");

var StaticServer = require("./runtime/staticServer.js");
var VirtualServer = require("./runtime/virtualServer.js");

function Host(){
    this.io = new IO();
    
    var flattener = new Flattener(),
        compiler = new Compiler(),
        staticServer,
        virtualServer,
        _handlers = {};

    this.launch = function(){
        var flat = flattener.flatten(this.io.contentTree);
        var views = compiler.compile(flat.views, flat.assets);
        
        staticServer = new StaticServer(views, !!flat.startScript);
        _emit('url', staticServer.clientURL);
        
        if (flat.startScript){
            virtualServer = new VirtualServer(flat.startScript, flat.virtualModules, flat.jsonFiles);
        }
        
        console.log(staticServer.clientURL);
        
        staticServer.listen();
        virtualServer.listen();
    }
    
    
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