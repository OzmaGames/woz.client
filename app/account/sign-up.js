define(['durandal/app'], function (app) {
    var username = ko.observable(),
        password = ko.observable(),
        email = ko.observable(),
        errorMessage = ko.observable();

    function signUp()
    {
        app.loading(true);

        var data = {
            username: username(),
            email: email(),
            password: CryptoJS.SHA3(constants.salt + username() + password()).toString()
        };

        app.trigger("server:account:sign-up", data, function (res) {
            res = JSON.parse(res);

            app.loading(false);

            if (res.success) {
                app.trigger('account:login', res);
            } else {
                errorMessage(res.errorMessage);
            }
        });
    }

    return {
        activate: function () { app.loading(true); },
        compositionComplete: function (view) { app.loading(false); },

        loading: app.loading,
        username: username,
        password: password,
        errorMessage: errorMessage,
        email: email,
        signUp: signUp,

        login: function () {
            app.trigger('account:view:change', 'account/login');
        }
    };
});