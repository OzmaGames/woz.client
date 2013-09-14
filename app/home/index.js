define(['plugins/router', 'durandal/app'], function (router, app) {

    var model = ko.observable('account/login');

    var viewChanger = app.on('account:view:change').then(function (viewModel) {
        model(viewModel);
    });

    var loginListener = app.on('account:login').then(function (login) {        
        if (login.success) {
            model('');
        }
    });

    return {
        model: model,

        binding: function () {
            return { cacheViews: false };
        },

        detached: function (view) {
            viewChanger.off();
            loginListener.off();
        },

        playSolo: function () {
            router.navigate('game');
        },

        playMulti: function () {
            router.navigate('game')
        }
    }
});