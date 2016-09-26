/*
An example of how to wrap Browserify modules for HyperHost.

See HH-fs.js to see the the compiled result.
*/

//Modules available to HyperHost are stored in the global HyperHost.modules
HyperHost.modules['fs'] = (function(){     
    var filesystem = require('browserify-fs'); //Use browserify to require the browserify-fs module
    
    return filesystem; //Return the entire module
}());

// The resulting Browserify bundle can then be drag n' dropped like other HyperHost modules.
// The bundle must be named HH-<name>.js   (eg. This bundle would be named HH-fs.js)