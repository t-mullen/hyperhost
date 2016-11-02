/*
A HyperHost module built without browserify.
*/

HyperHost.modules['custom'] = (function(){     
    module = {exports:{}}; //This is just to make it look like node, you can return anything
    
    module.exports.someFunction = function(){
        console.log('whoa');
        return "custom module is working!";
    }
    
    return module.exports; //Return the exported module
}());