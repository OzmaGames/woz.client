define(['durandal/app', 'api/constants'], function (app, constants) {

  var username = ko.observable(),
      password = ko.observable(),
      errorMessage = ko.observable();

  function login(e) {
    app.loading(true);

    var data = {
      username: username(),
      //password: CryptoJS.SHA3(constants.salt + username() + password()).toString()
      password: 12345
    };

    app.trigger("server:account:login", data, function (res) {

      app.loading(false);

      if (res.success) {
        res.username = username();
        app.trigger('account:login', res);
      } else {
        errorMessage('Error: ' + res.errorMessage);
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
      console.log(dialog.css({ marginTop: (height - 300) / 2 }));
    },
    compositionComplete: function (view) {
      app.loading(false);
    },

    loading: app.loading,
    username: username,
    password: password,
    errorMessage: errorMessage,
    login: login,

    signUp: function () {
      app.trigger('account:view:change', 'account/sign-up');
    }
  };
});