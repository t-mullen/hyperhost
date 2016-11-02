/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Builds content trees from different inputs
*/

function IO() {
    'use strict';
    
    this.contentTree = {nodes: []};
    
    let _handlers = {};
    
    const _emit = function _emit(event, data){
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
    Consumes a content tree directly.
    */
    this.contentTree = function (contentTree) {
        this.contentTree = contentTree;
        _emit('digest', {});
    };
    
    /*
    Builds a true content tree from a tree containing File objects.
    */
    this.fileTree = function (fileTree) {
        throw new Error('Not implemented'); //TODO
    };
    
    /*
    Builds content tree from JSZip object.
    */
    this.zip = function (zip) {
        throw new Error('Not implemented'); //TODO
    };
    
    /*
    Builds content tree from an array of files. Use with <input type='file' multiple>
    */
    this.fileArray = function (fileArray) {
        throw new Error('Not implemented'); //TODO
    };
    
    /*
    Builds from a WebkitDirectory object
    */
    this.webkitDirectory = function (webkitDirectory, callback) {
        throw new Error('Not implemented'); //TODO
    };
}


module.exports = IO;