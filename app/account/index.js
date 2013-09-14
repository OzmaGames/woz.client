define(['plugins/router', 'knockout'], function(router, ko) {
    var childRouter = router.createChildRouter()
        .makeRelative({
            moduleId:'account',
            fromParent:true
        }).map([
            { route: '',            moduleId: 'login',    title: 'Login' },
            { route: 'login',       moduleId: 'login',    title: 'Login',   type: 'nav',   nav: true},
            { route: 'sign-up',     moduleId: 'signUp',   title: 'Sign Up', type: 'nav',   nav: true}
        ]).buildNavigationModel();

    return {
        router: childRouter,
        navBar: ko.computed(function () {
            return ko.utils.arrayFilter(childRouter.navigationModel(), function (route) {
                return route.type == 'nav';
            });            
        })
    };
});