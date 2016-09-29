/*
HyperHost UI
By Thomas Mullen 2016
*/



var comingSoon = {
    "Statistics": "Monitor server performance, view live traffic information, see realtime demographics... everything you would expect from a real server dashboard!",
    "Notifications": "Be alerted when your website starts trending or encounters an error. Set custom triggers within the UI or from your virtual server.",
    "Files": "Upload, manage and edit your hosted files right from the web and redeploy even faster. Keep files saved even after you close the browser.",
    "Database": "Create a virtual MySQL database. View data, execute queries, and store the data without needing to reupload anything.",
    "Settings": "Add a whole new level of customization to HyperHost. Change admin panel themes, optimize performance to what you need, connect real servers, export directly to Node, and much more.",
    "Docs": "Detailed documentation on how to use and develop for HyperHost. Rely on the READMEs and source for now.",
    "Search": "Search other websites on HyperHost and opt-in to show yours off!"
}

var app = angular.module('app', ['ngFileUpload', 'ui.tree', 'ui.codemirror', 'angular-websql']);



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

app.controller('ctrl', function ($scope, $webSql) {
    $scope.pages = [{
            name: "Deploy",
            template: "assets/templates/deploy.html",
            icon: "pe-7s-rocket",
            start: true
    }, {
            name: "Statistics",
            template: "assets/templates/stats.html",
            icon: "pe-7s-graph1"
    }, {
            name: "Notifications",
            template: "assets/templates/comingSoon.html",
            icon: "pe-7s-bell"
    }, {
            name: "Files",
            template: "assets/templates/files.html",
            icon: "pe-7s-folder"
    }, {
            name: "Database",
            template: "assets/templates/database.html",
            icon: "pe-7s-server"
    },  {
            name: "Search",
            template: "assets/templates/search.html",
            icon: "pe-7s-search",
            start: true,
    }, {
            name: "Docs",
            template: "assets/templates/comingSoon.html",
            icon: "pe-7s-map",
            start: true
    }, {
            name: "Settings",
            template: "assets/templates/comingSoon.html",
            icon: "pe-7s-config"
    },/*{
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
        }
    ];

    var ua = detect.parse(navigator.userAgent);
    var ROUTE_CONSOLE = true;

    $scope.isChrome = ua.browser.family === "Chrome" && ua.browser.major >= 21 && ua.device.type === "Desktop";


    $scope.pageName = "Deploy";
    $scope.deployed = false;
    $scope.deploying = false;
    $scope.clientURL = "ERROR: No url could be resolved.";
    $scope.comingSoon = comingSoon;

    $scope.startDeploying = function () {
        $scope.deploying = true;
        $scope.$apply();
    }

    $scope.finishDeploying = function () {
        $scope.deployed = true;
        $scope.$apply();
    }


    $scope.setClientURL = function (url) {
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
    if (ROUTE_CONSOLE) {
        console.oldlog = console.log;
        console.oldwarn = console.warn;
        console.olderror = console.error;

        console.log = function (msg) {
            console.oldlog(msg);
            serverConsole(msg, 'text-info');
        }
        console.success = function (msg) {
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
    } else {
        console.success = function (msg) {
            console.log(msg);
        }
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

    $scope.files = [
        {
            title: "assets",
            icon: "pe-7s-folder",
            items: [
                {
                    title: "css",
                    icon: "pe-7s-folder",
                    items: [
                       "style.css"
                   ]
               },
                {
                    title: "js",
                    icon: "pe-7s-folder",
                    items: [
                        {
                            title: "script.js",
                            icon: "pe-7s-file"
                       },
                        {
                            title: "myClientModule.js",
                            icon: "pe-7s-file"
                       }
                   ]
               }
           ]
        },
        {
            title: "index.html",
            icon: "pe-7s-file"
        },
        {
            title: "HH-server.js",
            icon: "pe-7s-file"
        }
    ]

    $scope.remove = function (scope) {
        scope.remove();
    };

    $scope.toggle = function (scope) {
        scope.toggle();
    };

    $scope.editorOptions = {
        value: "An Open-Source code editor for your files!",
        mode: {
            name: "javascript",
            globalVars: true
        }
    }

    //Extension to editor mime type
    function extToMime(a) {
        var map = {
            'js': 'javascript',
            'html': 'htmlmixed',
            'css': 'css',
            'json': 'javascript',
        }

        if (Object.keys(map).indexOf(a) !== -1) {
            return map[a];
        } else {
            return a;
        }
    }

    $scope.editorContents = 'Click on a green file button to open that file here!';
    $scope.openInEditor = function (type, content) {
        $scope.editorOptions.mode.name = extToMime(type)
        $scope.editorContents = content;
    }

    $scope.moveLastToTheBeginning = function () {
        var a = $scope.data.pop();
        $scope.data.splice(0, 0, a);
    };

    $scope.newSubItem = function (scope) {
        var nodeData = scope.$modelValue;
        nodeData.nodes.push({
            id: nodeData.id * 10 + nodeData.nodes.length,
            title: nodeData.title + '.' + (nodeData.nodes.length + 1),
            nodes: []
        });
    };

    $scope.collapseAll = function () {
        $scope.$broadcast('angular-ui-tree:collapse-all');
    };

    $scope.expandAll = function () {
        $scope.$broadcast('angular-ui-tree:expand-all');
    };


    $scope.db = $webSql.openDatabase('hyperhostdb', '1.0', 'HyperHost Example DB', 2 * 1024 * 1024);
    $scope.currentDB = "HyperHost Example DB";
    $scope.tableList = [{
        name: 'user',
        dirty: true,
        rows: [],
        temp : true
    },{
        name : 'transactions',
        dirty : true,
        rows: [],
        temp : true
    }];
    //--------- Example table ----------------
    $scope.db.dropTable('user').then(function(){
    $scope.db.createTable('user', {
        "id": {
            "type": "INTEGER",
            "null": "NOT NULL", // default is "NULL" (if not defined)
            "primary": true, // primary
            "auto_increment": true // auto increment
        },
        "created": {
            "type": "TIMESTAMP",
            "null": "NOT NULL",
            "default": "CURRENT_TIMESTAMP" // default value
        },
        "username": {
            "type": "TEXT",
            "null": "NOT NULL"
        },
        "password": {
            "type": "TEXT",
            "null": "NOT NULL"
        },
        "age": {
            "type": "INTEGER"
        }
    }).then(function(){
    $scope.db.insert('user', {
        "username": 'Bill Gates',
        "password": 'BuyApple123',
        'age': 60
    }).then(function(){
    $scope.db.insert('user', {
        "username": 'Tim Cook',
        "password": 'BuyMicrosoft123',
        'age': 55
    }).then(function(){
    $scope.db.insert('user', {
        "username": 'Linus Torvalds',
        "password": 'PenquinsRule9001',
        'age': 46
    }).then(
        
        
    function(){
        $scope.db.dropTable('transactions').then(function(){
    $scope.db.createTable('transactions', {
        "amount": {
            "type": "FLOAT",
            "null": "NOT NULL"
        },
        "created": {
            "type": "TIMESTAMP",
            "null": "NOT NULL",
            "default": "CURRENT_TIMESTAMP" // default value
        },
        "sender": {
            "type": "TEXT",
            "null": "NOT NULL"
        },
        "recipient": {
            "type": "TEXT",
            "null": "NOT NULL"
        }
    }).then(function(){
    $scope.db.insert('transactions', {
        "amount": '400.54',
        "sender": 'Bob',
        'recipient': 'Adam' 
    }).then(function(){
    $scope.db.insert('transactions', {
        "amount": '2.24',
        "sender": 'George',
        'recipient': 'Adam' 
    }).then(function(){
    $scope.db.insert('transactions', {
        "amount": '5006.89',
        "sender": 'Jim',
        'recipient': 'Steve' 
    }).then(function(){
        updateDb();
    })})})})})})})})})}); //XD
    //-------------------
    
    
    $scope.executeQuery = function (query, values) {
        $scope.db.executeQuery(query, values).then(updateDb);
    }

    function updateDb() {
        for (var j = 0; j < $scope.tableList.length; j++) {
            if ($scope.tableList[j].dirty || true) { //TODO: Don't check every table every time
                $scope.tableList[j].dirty = false;
                $scope.db.selectAll($scope.tableList[j].name).then(function (j, results) {
                    $scope.tableList[j].columns = Object.keys(results.rows.item(0));
                    for (var i = 0; i < results.rows.length; i++) {
                        $scope.tableList[j].rows[i] = results.rows.item(i);
                    }
                }.bind(null, j))
            }
        }
    }

    $scope.data = [{
        'id': 1,
        'title': 'assets',
        'type': 'folder',
        'nodes': [
            {
                'id': 11,
                'title': 'js',
                'type': 'folder',
                'nodes': [
                    {
                        'id': 111,
                        'title': 'script.js',
                        'type': 'js',
                        'nodes': [],
                        'content': "var a = 1;\nfunction myFunc(){\n\treturn \"WOW syntax hightling! Thanks CodeMirror!\"\n}"
              }
            ]
          },
            {
                'id': 12,
                'title': 'style.css',
                'type': 'css',
                'nodes': [],
                'content': '.myStyle\n\t\t{color:blue;}\n}'
          }
        ]
      }, {
        'id': 2,
        'title': 'modules',
        'type': 'folder',
        'nodrop': true, // An arbitrary property to check in custom template for nodrop-enabled
        'nodes': [
            {
                'id': 21,
                'type': 'js',
                'title': 'HH-custom.js',
                'nodes': [],
                'content': '//No content here yet. Gotta build this custom module!'
          },
            {
                'id': 22,
                'type': 'js',
                'title': 'HH-math.js',
                'content': 'var mathyThings = true;',
                'nodes': []
          }
        ]
      }, {
        'id': 3,
        'type': 'js',
        'title': 'HH-server.js',
        'content': 'var hyperhost = require("hyperhost");\n//TODO: Build an awesome P2P server!',
        'nodes': []
      }, {
        'id': 3,
        'type': 'html',
        'title': 'index.html',
        'nodes': [],
        'content': '<html>\n\t<body>\n\t\t<h1>Whoa!</h1>\n\t</body>\n</html>'
      }];
});