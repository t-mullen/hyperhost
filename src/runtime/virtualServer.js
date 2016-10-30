/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Emulates a Node.js server.

*/

var config = require("../config/config.json");
var util = require("../util/util.js");
var hyperhostRequireModule = require("./virtualModules/HH-hyperhost.js");

function VirtualServer(startScript, modules, jsonFiles){
    
    var moduleListing = [];

    this.listen = function(){
        var npmModuleList = Object.keys(jsonFiles['package']["dependencies"]); //Get NPM modules from package.json
        moduleListing = Object.keys(modules);
        moduleListing = moduleListing.concat(npmModuleList);
        
        
        //Generate urls for wzrd.in files
        for (var i = 0; i < npmModuleList.length; i++) {
            modules[npmModuleList[i]] = getWzrdModuleUrl(npmModuleList[i], jsonFiles["package"]["dependencies"][npmModuleList[i]]);
        }
        
        window.HyperHost.modules = modules; //Expose the modules
        
        //Inject the virtual backend modules
        util.injectScripts(moduleListing, modules, function () {
                  
            //Wzrd will put everything on the window, so we need to move it to the modules
            for (var i = 0; i < npmModuleList.length; i++) {
                modules[npmModuleList[i]] = window[util.camelize(npmModuleList[i])];
            }

            // Add the HyperHost virtual module
            moduleListing.push('hyperhost'); 
            modules['hyperhost'] = hyperhostRequireModule;
            
            window.require = HHrequire; //Overwrite any other 'require' methods
            
            //Inject the virtual start script after modules loaded
            var script = document.createElement('script');
            script.setAttribute('type', 'text/javascript');
            script.setAttribute('src', startScript);
            document.head.appendChild(script);
        });
    }
    
    // The 'require' emulator
    var HHrequire = function (moduleName) {
        if (moduleListing.indexOf(moduleName) === -1) {   
            return;
        } else {
            return modules[moduleName];
        }
    }
    
    
    //Gets a Wzrd.in url from module name
    var getWzrdModuleUrl = function(name, version) {
        return config.paths.wzrd + name + jsonFiles["package"]["dependencies"][name] + (!!version ? "@" + version : "");
    }
}



module.exports = VirtualServer;