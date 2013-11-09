define(['durandal/app', 'api/constants', 'durandal/plugins/router'], function (app, constants, router) {

  var username = ko.observable(),
      password = ko.observable(),
      errorMessage = ko.observable();

  username.verify = function (username) {
    if (username == "") {
      return "You need to enter you username or e-mail"
    }
    if (username.length < 3) {
      return "Incorrect e-mail or username";
    }
    return "";
  }

  password.verify = function (password) {
    if (password == "") {
      return "You need to enter your password";
    }
    return "";
  }

  function login(el) {    
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
        router.navigate("newGame");
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