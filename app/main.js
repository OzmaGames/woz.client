requirejs.config({
    paths: {
        'text': '../lib/requirejs-text/text',
        'durandal': '../lib/durandal/',
        'plugins': '../lib/durandal/plugins',
        'transitions': '../lib/durandal/transitions',
        'paper': '../lib/paper/paper',
        'socket': '../lib/socket.io.min',
        'crypto.sha3' : '../lib/crypto.sha3',

        'transitions/slidedown': 'api/transitions/slidedown'
    },
    urlArgs: 'v0.36'
});
 
define('jquery', function () { return jQuery; });
define('knockout', ko);
 
define(['durandal/system', 'durandal/app', 'durandal/viewLocator', 'api/server'], function (system, app, viewLocator, server) {
    //>>excludeStart("build", true);
    //system.debug(true);
    //>>excludeEnd("build");    

    app.title = 'Words Of Oz';

    app.configurePlugins({
        router:true,
        dialog: true,
        http: true        
    });

    app.loading = ko.observable(false);    

    app.start().then(function () {
        viewLocator.useConvention();
        app.setRoot('shell', null, 'app');
    });

});