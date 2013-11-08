﻿define(['plugins/router', 'durandal/app'], function (router, app) {

  app.commandMenuVisibility = ko.observable(true);

  return {
    router: router,
    loading: ko.computed(function () { return router.isNavigating() || app.loading() }),
    activate: function () {
      window.router = router;
      return router.map([
          { route: ['', 'home'],      moduleId: 'home/index',       title: 'Start',                nav: true },
          { route: 'test',            moduleId: 'home/test',        title: 'Test',                 nav: true },
          { route: 'lobby',           moduleId: 'home/lobby',       title: 'Lobby',                nav: true },
          { route: 'settings',        moduleId: 'home/settings',    title: 'Settings',             nav: true },
          { route: 'newGame',         moduleId: 'home/newGame',     title: 'New Game',             nav: true },
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