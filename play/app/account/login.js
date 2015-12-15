define( ['durandal/app', 'api/datacontext', 'api/constants', './oAuth/FB'], function ( app, ctx, constants, FB ) {

   function ctor() {
        this.loading = app.loading;
        this.facebookLogin = ko.observable(true);
        this.hasUsername = (ctx.username && ctx.username.length > 2 && ctx.username.length < 20);

        this.username = ko.observable(this.hasUsername ? ctx.username : '').extend({
            required: "You need to enter you username or e-mail",
            stringLength: { minLength: 3, message: "Incorrect e-mail or username" }
        });
        this.password = ko.observable().extend({
            required: "You need to enter your password",
        });
        this.errorMessage = ko.observable();

        this.getFormModels = function () {
            return [
                this.username,
                this.password
            ];
        }
    }

    ctor.prototype.signUp = function () {
        if (app.loading()) return;
        app.trigger('account:view:change', 'account/sign-up');
    };

    ctor.prototype.recover = function () {
        app.trigger('account:view:change', 'account/recovery');
    };

    ctor.prototype.facebook = function () {
        if (!this.facebookLogin() || app.loading()) return;
        var page = this;

        app.loading(true);

        FB.login().then(function (facebook) {
            if (facebook.status != 2) {
                app.loading(false);
                page.errorMessage("Something went wrong!");
            } else {
                page.facebookLogin(false);
                facebook.getProfile().then(function (profile) {
                    page.username(profile.email ? profile.email : (profile.username ? (profile.username + '@facebook.com') : ''));
                    //page.username(profile.email ? profile.email : (profile.username ? (profile.username + '@facebook.com') : ''));
                    //page.username(profile.username + '@facebook.com');
                    page.password(facebook.authResponse.signedRequest);

                    app.trigger("server:account:fb", {
                        fbToken: app.facebook.authResponse
                    }, function (res) {
                        //app.loading(false);
                        if (res.success && !res.username) {
                            app.trigger('account:view:change', 'account/facebook');
                        } else if (res.success) {
                            app.trigger('account:login', res);
                        }
                    });
                });
            }
        });
    };

    ctor.prototype.login = function (el) {
        app.loading(true);

        var data = {
            username: this.username(),
            password: CryptoJS.SHA3(constants.salt + this.password()).toString()
        };

        var base = this;
        app.trigger("server:account:login", data, function (res) {
            if (res.success) {
                app.trigger('account:login', res);
            } else {
                app.loading(false);
                base.errorMessage(res.message);
            }
        });
    }

    return ctor;

} );