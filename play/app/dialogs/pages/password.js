define(['durandal/app', 'api/datacontext', 'api/constants'], function (app, ctx, constants) {

    function validateEmail(email) {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }

    function ctor() {
        this.loading = ko.observable(false);
        this.password = ko.observable().extend({
            required: "Enter your current password"
        });

        this.newPassword = ko.observable().extend({
            required: "Enter your new password"
        });

        var base = this;

        this.send = function () {
            var pass = CryptoJS.SHA3(constants.salt + base.password()).toString();
            var newpass = CryptoJS.SHA3(constants.salt + base.newPassword()).toString();

            app.trigger("server:account:change-password", { password: pass, newPassword: newpass }, function (json) {
                if (json.success) {
                    app.dialog.show('alert', { content: 'Your password is changed successfuly!' });
                } else {
                    app.dialog.show('alert', { content: 'There was a problem with your action!' });
                }
            });
            app.dialog.close('notice');
        }
    }

    return ctor;
});