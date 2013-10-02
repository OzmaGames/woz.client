define(['plugins/router', 'durandal/app'], function (router, app) {
    return {
        router: router,
        loading: ko.computed(function () { return router.isNavigating() || app.loading() }),
        activate: function () {
            window.router = router;
            return router.map([
                { route: 'home',      moduleId: 'home/index',       title: 'Start',                nav: true },
                { route: 'not-found',       moduleId: 'error/not-found',  title: 'Error 404: Not Found', nav: true },
                { route: ['', 'game'],            moduleId: 'game/game',        title: 'Play',   nav: true, hash: '#game' },
                { route: 'account',         moduleId: 'account/index',    title: 'Account Settings',     nav: true, hash: '#account' }
            ]).buildNavigationModel()
              .mapUnknownRoutes('home/index', 'not-found')
              .activate();
        }
    };
});