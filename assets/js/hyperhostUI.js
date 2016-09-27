/*
HyperHost UI
By Thomas Mullen 2016
*/

var comingSoon = {
    "Statistics" : "Monitor server performance, view live traffic information, see realtime demographics... everything you would expect from a real server dashboard!",
    "Notifications" : "Be alerted when your website starts trending or encounters an error. Set custom triggers within the UI or from your virtual server.",
    "Files" : "Upload, manage and edit your hosted files right from the web and redeploy even faster. Keep files saved even after you close the browser.",
    "Data" : "Create a virtual MySQL database. View data, execute queries, and store the data without needing to reupload anything.",
    "Settings" : "Add a whole new level of customization to HyperHost. Change admin panel themes, optimize performance to what you need, connect real servers, export directly to Node, and much more.",
    "Docs" : "Detailed documentation on how to use and develop for HyperHost. Rely on the READMEs and source for now.",
    "Search" : "Search other websites on HyperHost and opt-in to show yours off!"
}

var app = angular.module('app', ['ngFileUpload']);

app.directive('hyperhostDrop', function () {
    return {
        restrict: 'A',
        scope: true,
        link: function (scope, elem, attr, ctrl) {
            elem.bind('dragover', function (e) {
                e.stopPropagation();
                e.preventDefault();
            });
            elem.bind('dragenter', function (e) {
                e.stopPropagation();
                e.preventDefault();
                event.target.style.backgroundColor = '#efffd5';
                event.target.style.borderColor = '#87CB16';
            })
            elem.bind('dragleave', function (e) {
                e.stopPropagation();
                e.preventDefault();
                e.originalEvent.target.style.backgroundColor = '';
                e.originalEvent.target.style.borderColor = '#bababa';
            })
            elem.bind('drop', function (e) {
                e.stopPropagation();
                e.preventDefault();
                e.preventDefault();
                scope.startDeploying();
                HyperHost.handleRawDropEvent(e.originalEvent.dataTransfer, scope);
            });
        }
    };
});

app.directive('hyperhostUpload', function () {
    return {
        restrict: 'A',
        link: function (scope, elem, attr, ctrl) {
            elem.bind('change', function (e) {
                e.stopPropagation();
                e.preventDefault();
                scope.startDeploying();
                HyperHost.handleFiles(e.target.files);
            });
        }
    };
});

app.controller('ctrl', function ($scope) {
    $scope.pages = [{
        name: "Deploy",
        template: "assets/templates/deploy.html",
        icon: "pe-7s-rocket",
        start: true
    }, {
        name: "Statistics",
        template: "assets/templates/comingSoon.html",
        icon: "pe-7s-graph1"
    }, {
        name: "Notifications",
        template: "assets/templates/comingSoon.html",
        icon: "pe-7s-bell"
    }, {
        name: "Files",
        template: "assets/templates/comingSoon.html",
        icon: "pe-7s-folder"
    }, {
        name: "Data",
        template: "assets/templates/comingSoon.html",
        icon: "pe-7s-server"
    }, {
        name: "Settings",
        template: "assets/templates/comingSoon.html",
        icon: "pe-7s-config"
    }, {
        name: "Search",
        template: "assets/templates/comingSoon.html",
        icon: "pe-7s-search",
        start: true,
    }, {
        name: "Docs",
        template: "assets/templates/comingSoon.html",
        icon: "pe-7s-map",
        start: true
    }, /*{
        name: "Typograpgy (DELETE ME)",
        template: "assets/templates/typography.html",
        icon: "pe-7s-news-paper",
        start: true
    }, {
        name: "Icons (DELETE ME)",
        template: "assets/templates/icons.html",
        icon: "pe-7s-science",
        start: true
    },*/ {
        name: "Deploy New Server",
        icon: "pe-7s-rocket"
    }, ];

    var ua = detect.parse(navigator.userAgent);

    $scope.isChrome = ua.browser.family === "Chrome" && ua.browser.major >= 21 && ua.device.type === "Desktop";


    $scope.pageName = "Deploy";
    $scope.deployed = false;
    $scope.deploying = false;
    $scope.clientURL = "ERROR: No url could be resolved.";
    $scope.comingSoon = comingSoon;
    
    $scope.startDeploying = function(){
        $scope.deploying=true;
        $scope.$apply();
    }
    
    $scope.finishDeploying = function(){
        $scope.deployed=true;
        $scope.$apply();
    }
    
     
    $scope.setClientURL = function(url){
        $scope.clientURL = url;
        $scope.$apply();
    }
    
    
    function serverConsole(msg, type) {
        $scope.logs.push({
            "msg": msg,
            "class": type
        });
        $scope.$apply();
        
        var c = $(".console").get(0);
        $(c).scrollTop($(c).prop("scrollHeight"));
    }

    // Intercept logging for console
    $scope.logs = [];
    console.oldlog = console.log;
    console.oldwarn = console.warn;
    console.olderror = console.error;
    
    console.log = function (msg) {
        console.oldlog(msg);
        serverConsole(msg, 'text-info');
    }
    console.success = function(msg){
        console.oldlog(msg);
        serverConsole(msg, 'text-success');
    } 
    console.warn = function (msg) {
        console.oldwarn(msg);
        serverConsole(msg, 'text-warning');
    }
    console.error = function (msg) {
        console.olderror(msg);
        serverConsole(msg, 'text-danger');
    }
    
    

    $scope.changePage = function (name) {
        if (name !== "Deploy New Server") {
            $scope.pageName = name;
        } else {
            window.open(window.location.href.split('?')[0], "");
        }
    }
    $scope.activePageClass = function (name, start) {
        //if (!$scope.deployed && name !== "Deploy" && !start) return 'hidden';
        //if ($scope.deployed && name === "Deploy") return 'hidden';
        if (name === "Deploy New Server") return "active active-pro";
        return name === $scope.pageName ? "active" : "";
    }

    $scope.addFiles = function (files) {
        $scope.deploying = true;
        HyperHost.handleFiles(files, $scope);
    }
});