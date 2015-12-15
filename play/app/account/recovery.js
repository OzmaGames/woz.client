define(['durandal/app', 'api/constants'], function (app, constants) {
  function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

  return {
    loading: app.loading,
    errorMessage: ko.observable(),
    success: ko.observable(false),
    email: ko.observable().extend({
        required: "E-mail is required",
        customValidation: function (newValue) {
            return validateEmail(newValue) ? "" : "Incorrect e-mail address";
        }
    }),
    activate: function(){
        this.errorMessage('');
        this.email(undefined);
        this.success(false);
    },

    recover: function () {
      app.loading(true);

      var data = {
        email: this.email()
      };

      var self = this;
      app.trigger("server:account:recover-password", data, function (res) {
        app.loading(false);

        if (res.success) {
            self.success(true);
        } else {
            self.errorMessage(res.message);
        }
      });
    },

    back: function () {
      app.trigger('account:view:change', 'account/login');
    }
  };
});