requirejs.config({
  paths: {
    'text': '../lib/requirejs-text/text',
    'durandal': '../lib/durandal/',
    'plugins': '../lib/durandal/plugins',
    'transitions': '../lib/durandal/transitions',
    'paper': '../lib/paper/paper',
    'socket': '../lib/socket.io',
    'crypto.sha3': '../lib/crypto.sha3',
    
    'transitions/slidedown': 'api/transitions/slidedown'
  },
  urlArgs: 't'+ (new Date).getTime()
});

define('jquery', function () { return jQuery; });
define('knockout', ko);

define(['durandal/system', 'durandal/app', 'durandal/plugins/router', 'durandal/viewLocator', 'api/server/setup', 'api/datacontext', 'dialogs/_builder',
  '../lib/jquery.transit', '../lib/jquery.touch-punch', '../lib/crypto.sha3', 'api/knockout'],
  function (system, app, router, viewLocator, server, ctx, Dialog) {
    //>>excludeStart("build", true);
    system.debug(true);
    //>>excludeEnd("build");    
    
    app.title = 'Words of Oz';

    app.configurePlugins({
      router: true,
      dialog: true,
      http: true
    });

    app.inlineLoading = ko.observable(false);
    app._loading = ko.observable(false);
    app.loading = ko.computed({
      read: function () {
        return app._loading() || (ctx.loading() === true);
      },
      write: function (value) {
        app._loading(value);
      },
      owner: this
    });

    app.scrollUp = function () {
      console.log("scrollUP");
      $('body').animate({ scrollTop: 0 }, "slow", "swing");
    };

    app.scrollDown = function () {
      console.log("scrollDown");
      $('body').animate({ scrollTop: 1000 }, "slow", "swing");
    }
    app.navigate = function (hash) {
      router.navigate(hash);
    }

    app.dialog = Dialog;
    
    app.start().then(function () {
      viewLocator.useConvention();
      app.setRoot('shell', null, 'app');
    });

    window.app = app;
  });