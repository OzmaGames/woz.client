define('shell', ['durandal/app', 'durandal/activator', 'knockout'], function (app, activator, ko) {

    var page = ko.observable('account/login');

    return {
        activate: function (route) {
            this.trigViewChange = app.on('account:view:change').then(function () {

            });            
        },

        page: 'account/login',

        compositionComplete: function () {
            app.trigger("account:view:change", "account/login");
        },

        detached: function (view) {
            this.trigViewChange.off();
        }
    }
});