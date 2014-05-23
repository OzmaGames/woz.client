define(['plugins/router'], function(router) {
    var childRouter = router.createChildRouter()
        .makeRelative({
            moduleId: 'account',
            fromParent: true
        }).map([            
            { route: 'facebook', moduleId: 'oAuth/facebook', title: 'Login via Facebook', nav: true }
        ]).buildNavigationModel();

    return {
        router: childRouter        
    };
});