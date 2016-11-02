/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Builds content trees from different inputs
*/

function IO(){
    this.contentTree = {nodes:[]};
    
    /*
    Consumes a content tree directly.
    */
    this.contentTree = function(contentTree, callback){
        this.contentTree = contentTree;
        callback();
    }
    
    /*
    Builds a true content tree from a tree containing File objects.
    */
    this.fileTree = function(fileTree, callback){
        throw new Error("Not implemented"); //TODO
    };
    
    /*
    Builds content tree from JSZip object.
    */
    this.zip = function(zip, callback){
        throw new Error("Not implemented"); //TODO
    };
    
    /*
    Builds content tree from an array of files. Use with <input type="file" multiple>
    */
    this.fileArray = function(fileArray, callback){
        throw new Error("Not implemented"); //TODO
    };
    
    /*
    Builds from a WebkitDirectory object
    */
    this.webkitDirectory = function(webkitDirectory, callback){
        throw new Error("Not implemented"); //TODO
    };
}


module.exports = IO;