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
    
    var flattener = new Flattener();
    var compiler = new Compiler();

    this.launch = function(){
        var flat = flattener.flatten(this.io.contentTree);
        var views = compiler.compile(flat.views, flat.assets);
        
        var staticServer = new StaticServer(views, !!flat.startScript);
        this.clientURL = staticServer.clientURL;
        var virtualServer = new VirtualServer(flat.startScript, flat.virtualModules, flat.jsonFiles);
        
        console.log(staticServer.clientURL);
        
        staticServer.listen();
        virtualServer.listen();
    }
}


module.exports = Host;