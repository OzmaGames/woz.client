requirejs.config({
    paths: {
        'durandal': '../shared/lib/durandal',
        'plugins': '../shared/lib/durandal/plugins',
        'transitions': '../shared/lib/durandal/transitions',
        'crypto.sha3': '../shared/lib/crypto.sha3.min',
        'socket.io': '../shared/lib/socket.io',
        'jquery': '../shared/lib/jquery',
        'knockout': '../shared/lib/knockout',
        'text': '../shared/lib/text',
        'facebook': '//connect.facebook.net/en_US/all',
    },
    urlArgs: (new Date).getTime(),
    shim: {
        'facebook': {
            'export': 'FB'
        }
    }
});

//define('socket', io);

define(['durandal/system', 'durandal/app', 'plugins/router', 'durandal/viewLocator', 'jquery', 'knockout'], function (system, app, router, viewLocator) {
    //>>excludeStart("build", true);
    system.debug(true);
    //>>excludeEnd("build");    

    app.title = 'Words of Oz';

    //app.configurePlugins({
    //    router: true,
    //    widget: {
    //        kinds: ['list', 'slider', 'tile', 'xp']
    //    }
    //});

    app.start().then(function () {
        viewLocator.useConvention();
        app.setRoot('shell', null, 'app');
    });

    function loadCSS(css) {
        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = 'css/' + css + '.css';
        document.getElementsByTagName("head")[0].appendChild(link);
    }
});