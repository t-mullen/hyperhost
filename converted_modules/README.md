# A Browserify module for HyperHost in seconds.

## To create a new module.

1) Install Browserify if you haven't already: `npm install -g browserify`  
2) Install your Browser-compatiable module. `npm install yourModuleName`  
3) Create a new file `new.js` with the contents:  
```
HyperHost.modules['yourModuleName'] = (function(){     
    var filesystem = require('yourModuleName'); //Use browserify to require the module 
    return filesystem; //Return the entire module
}());
```
4) `browserify new.js > HH-yourModuleName.js` **(The HH- prefix is required!)**  
5) You now have a file that can be drag n' dropped into HyperHost.

## To use the module.
1. Create a file named exactly `HH-server.js`.
2. Inside the file, `HyperHost.require` the module and put your server code.
```
var yourModule = HyperHost.require('yourModuleName');
```
3. Drag n' drop this into HyperHost for an instant virtual server!
