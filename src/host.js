/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License


HyperHost v2.0
Module to host websites over WebRTC.


*/

const IO = require('./processing/io.js'),
      Flattener = require('./processing/flattener.js'),
      Compiler = require('./processing/compiler.js'),

      StaticServer = require('./runtime/staticServer.js'),
      VirtualServer = require('./runtime/virtualServer.js');

function Host(){
    'use strict';
    
    this.io = new IO();
    
    let staticServer,
        virtualServer,
        _handlers = {};
    
    const flattener = new Flattener(),
          compiler = new Compiler(),
    
          
    _emit = function _emit(event, data){
        var fn = _handlers[event];
        if (fn && typeof(fn) === 'function') {
            fn(data);
        }
    };
    
    /*
        Listen for an event.
    */
    this.on = function on(event, handler) {
        _handlers[event]=handler;
    };

    /*
        Launch the server.
    */
    this.launch = function launch() {
        const flat = flattener.flatten(this.io.getContentTree()),
              views = compiler.compile(flat.views, flat.assets);
        
        staticServer = new StaticServer(views, !!flat.startScript);
        staticServer.launch();
               
        if (flat.startScript){
            virtualServer = new VirtualServer(flat.startScript, flat.virtualModules, flat.jsonFiles);
            virtualServer.launch();
        }
        
        
        _emit('ready', staticServer.clientURL);
    };
}


module.exports = Host;