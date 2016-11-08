/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Builds content trees from different inputs
*/

const util = require('../util/util.js'),
      config = require('../config/config.json');

function IO() {
    'use strict';
    
    let contentTree = {nodes: []};
    
    let _handlers = {};
    const _emit = function _emit(event, data){
        var fn = _handlers[event];
        if (fn && typeof(fn) === 'function') {
            fn(data);
        }
    };
    
    let remainingFiles = 0, // For tracking async load
        traversalComplete;  //
    
    // Traverses and loads a webkitEntry
    const traverseWebkitEntry = function travserseWebkitEntry(entry, ancestors, callback){
        if (entry.isFile) {
            
            entry.file(function(file){
                let fileReader = new FileReader(),
                    extension = entry.name.split('.');
                    extension=extension[extension.length-1].toLowerCase();
                
                remainingFiles++;
                fileReader.addEventListener('load', ()=>{
                    util.deepSetTree(contentTree, {
                        name : entry.name,
                        content : fileReader.result
                    }, ancestors);

                    // Check for completion
                    remainingFiles--;
                    if (remainingFiles === 0 && traversalComplete) {
                        callback();
                    }
                });
                
                if (config.extensions.view.indexOf(extension) !== -1){
                    // Views must remain text
                    fileReader.readAsText(file);
                } else {
                    // Everything else must be base64
                    fileReader.readAsDataURL(file);
                }
            }, function(err) {
                console.error(err);   
            });
            
        }else if (entry.isDirectory) {
            util.deepSetTree(contentTree, {
                name : entry.name,
                nodes : []
            }, ancestors);
            
            let dirReader = entry.createReader();
            dirReader.readEntries((entries)=>{
                for (var i=0; i<entries.length; i++){
                    let newAncestors = ancestors.slice(0); // Clone ancestors array
                    newAncestors.push(entry.name);
                    traverseWebkitEntry(entries[i], newAncestors, callback);
                }
            });
        }
    }
        
    /*
        Listen for an event.
    */
    this.on = function on(event, handler) {
        _handlers[event]=handler;
    };
    
    
    this.getContentTree = function(){
        return contentTree;
    }
    
    
    /*
    Consumes a content tree directly.
    */
    this.contentTree = function (contentTree) {
        contentTree = contentTree;
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
    Builds content tree from a webkitdirectory. Use with <input type='file' webkitdirectory>
    */
    this.webkitDirectory = function (fileArray) {
        throw new Error('Not implemented'); //TODO
    };
    
    /*
    Builds from a drop event. Currently only supports webkitdirectory.
    */
    this.dropEvent = function (event) {
        let items = event.dataTransfer.items;
            
        traversalComplete = false;
        for (var i=0; i<items.length; i++){
            if (items[i].webkitGetAsEntry){
                traverseWebkitEntry(items[i].webkitGetAsEntry(), [], function(){
                    contentTree=contentTree.nodes[0].nodes;
                    _emit('digest', {});
                });
            } else {
                // TODO multiple and single files
            }
        }
        traversalComplete=true;
    };
}


module.exports = IO;