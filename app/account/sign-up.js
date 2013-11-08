define(['durandal/app', 'api/constants'], function (app, constants) {
  var username = ko.observable(),
      password = ko.observable(),
      email = ko.observable(),
      errorMessage = ko.observable();

  function signUp() {
    app.loading(true);

    var data = {
      username: username(),
      email: email(),
      password: CryptoJS.SHA3(constants.salt + username() + password()).toString()
    };

    app.trigger("server:account:sign-up", data, function (res) {
      app.loading(false);

      if (res.success) {
        app.trigger('account:login', res);
      } else {
        errorMessage(res.errorMessage);
      }
    });
  }

  return {
    activate: function () {
      app.loading(true);
    },
    bindingComplete: function (view) {
      var dialog = $('.popup-dialog', view);
      var height = $(window).innerHeight();
      console.log(dialog.css({ marginTop: (height - 500) / 2 }));
    },
    compositionComplete: function (view) {
      app.loading(false);
    },

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