define(['plugins/router', 'durandal/app', 'api/server/connection'], function (router, app, cnn) {

  app.commandMenuVisibility = ko.observable(true);
  var connected = ko.observable(false);
  var online = ko.observable(false);
  var errors = ko.observableArray();  

  cnn.connected
    .then(function () { connected(true); })
    .fail(function () { connected(false); });

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
       app.dialog.show("alert", { content: this.summary() });
    },

    activate: function () {
      window.router = router;
      return router.map([
          { route: ['', 'home'],      moduleId: 'home/index',       title: '',                     nav: true },
          { route: 'test',            moduleId: 'home/test',        title: 'Test',                 nav: true },
          { route: 'lobby',           moduleId: 'home/lobby',       title: 'Lobby',                nav: true },
          { route: 'settings',        moduleId: 'home/settings',    title: 'Settings',             nav: true },
          { route: 'newGame',         moduleId: 'home/newGame',     title: 'New Game',             nav: true },
          { route: 'singlePlayer',    moduleId: 'home/singlePlayer',title: 'Loading the game',     nav: true },
          { route: 'not-found',       moduleId: 'error/not-found',  title: 'Error 404: Not Found', nav: true },
          { route: 'game',            moduleId: 'game/game',        title: 'Play',                 nav: true },
          { route: 'game-editor',     moduleId: 'game-editor/menu', title: 'Game Editor',          nav: true },
          {
            route: 'game-editor/edit/:id',
            moduleId: 'game-editor/edit', title: 'Game Editor - Edit'
          },
          { route: 'account',         moduleId: 'account/index',    title: 'Account Settings',     nav: true, hash: '#account' }
      ]).buildNavigationModel()
        .mapUnknownRoutes('home/index', 'not-found')
        .activate();
    },

    menuVisibility: app.commandMenuVisibility,
    openMenu: function () {
      app.dialog.show("menu");
    }
  };
});