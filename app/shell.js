define(['plugins/router', 'durandal/app'], function (router, app) {

  var connected = ko.observable(false);
  var online = ko.observable(false);
  var errors = ko.observableArray();  

  //cnn.connected
  //  .then(function () { connected(true); })
  //  .fail(function () { connected(false); });

  app.on("socket:status").then(function (status) {
    connected(status == "connect");
  });

  window.addEventListener("online", function () { online(true); });
  window.addEventListener("offline", function () { online(false); });

  window.addEventListener("error", function (e) {
    errors.push(e);
  });
  
  return {
    router: router,
    loading: ko.computed(function () {
      return (router.isNavigating() || app.loading()) && !app.inlineLoading();
    }),
    status: {
      cnn: connected,
      online: online
    },
    errors: errors,
    summary: ko.computed(function () {
      var str = "";
      ko.utils.arrayForEach(errors(), function (e) {
        str += e.message;
        str += '\n';
        str += e.lineno + ' ' + e.filename
        str += '\n';
      });
      return str;
    }),
    showSummary: function () {
       app.dialog.show("alert", {
          content: $('<div/>').css({ fontSize: '12px' }).html(this.summary())[0].outerHTML,
          delay: 5000
       });
    },

    activate: function () {
              
       window.router = router.map([
          { route: ['', 'home'],      moduleId: 'home/index',       title: '',                     nav: true },
          { route: 'test',            moduleId: 'home/test',        title: 'Test',                 nav: true },
          { route: 'lobby',           moduleId: 'home/lobby/index', title: 'My Games',             nav: true },
          { route: 'settings',        moduleId: 'home/settings',    title: 'Settings',             nav: true },
          { route: 'newGame',         moduleId: 'home/newGame',     title: 'New Game',             nav: true },
          { route: 'singlePlayer',    moduleId: 'home/singlePlayer',title: 'Loading the game',     nav: true },
          { route: 'not-found',       moduleId: 'error/not-found',  title: 'Not Found',            nav: true },
          { route: 'game',            moduleId: 'game/game',        title: 'Play',                 nav: true },
          { route: 'game/:id',        moduleId: 'game/game',        title: 'Play',                 nav: true },
          { route: 'game-editor',     moduleId: 'game-editor/menu', title: 'Game Editor',          nav: true },
          {
            title: 'Game Editor - Edit',
            route: 'game-editor/edit/:id',
            moduleId: 'game-editor/edit'
          },
          {
             route: 'account*details',
             moduleId: 'account/index',
             title: 'Account Settings',
             hash: '#account', nav: true
          },
          { route: 'facebook', moduleId: 'account/oAuth/facebook', title: 'Words of Oz'}
      ]).buildNavigationModel()
        .mapUnknownRoutes('error/not-found', 'not-found')
        .activate();

       return window.router;
    },
    compositionComplete: function () {
       $('#fixed').prependTo('body');
    }
  };
});