define(['durandal/app', 'api/constants', './oAuth/FB', 'knockout'], function (app, constants, FB, ko) {

    function validateEmail(email) {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }

    return {
        loading: app.loading,

        username: ko.observable().extend({
            required: "Username is required",
            stringLength: { minLength: 3, message: "Incorrect e-mail or username" }
        }),

        email: ko.observable().extend({
            customValidation: function (newValue) {
                return newValue ? (validateEmail(newValue) ? "" : "Incorrect e-mail address") : "";
            }
        }),

        errorMessage: ko.observable(),

        activate: function () {
            app.loading(false);
            this.username(app.facebook.profile.username.replace('.', ''));
        },

        back: function () {
            app.trigger('account:view:change', 'account/login');
        },

        facebookProfile: app.facebook.profile,

        signup: function () {
            app.loading(true);

            var data = {
                fbToken: app.facebook.authResponse,
                username: this.username(),
                email: this.email() ? this.email() : false
            };

            var base = this;
            app.trigger("server:account:fb", data, function (res) {
                if (res.success) {
                    app.trigger("server:account:fb", {
                        fbToken: app.facebook.authResponse
                    }, function (res) {
                        //app.loading(false);
                        if (res.success) {
                            res.signedup = true;
                            app.trigger('account:login', res);
                        } else {
                            app.loading(false);
                            base.errorMessage(res.message);
                        }
                    });

                } else {
                    app.loading(false);
                    base.errorMessage(res.message);
                }
            });
        }

    };
});