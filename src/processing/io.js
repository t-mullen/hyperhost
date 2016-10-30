/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Builds content trees from different inputs
*/

function IO(){
    this.contentTree = {nodes:[]};
    
    /*
    Builds a true content tree from a tree containing File objects.
    */
    this.buildFileTree = function(fileTree, callback){
        
    };
    
    /*
    Builds content tree from JSZip file object.
    */
    this.buildZip = function(zip, callback){
        
    };
    
    /*
    Builds content tree from list of files with paths.
    */
    this.buildFilePaths = function(fileArray, callback){
        
    };
    
    /*
    Builds from a WebkitDirectory object
    */
    this.buildWebkitDirectory = function(webkitDirectory, callback){
        
    };
}


module.exports = IO;