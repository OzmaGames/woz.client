define(['durandal/app', 'api/constants'], function (app, constants) {
  var username = ko.observable(),
      password = ko.observable(),
      email = ko.observable(),
      errorMessage = ko.observable();

  username.verify = function (username) {
    if (username == "") {
      return "Username is required"
    }
    if (username.length < 3) {
      return "Incorrect e-mail or username";
    }
    return "";
  }

  password.verify = function (password) {
    if (password == "") {
      return "Password is required";
    }
    return "";
  }

  email.verify = function (email) {
    if (email == "") {
      return "E-mail is required";
    }
    if (!validateEmail(email)) {
      return "Incorrect E-mail address"
    }
    return "";
  }

  function validateEmail(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  } 

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
        res.username = username();
        app.trigger('account:login', res);
        router.navigate("newGame");
      } else {
        errorMessage(res.message);
      }
    });
  }

  return {
    activate: function () {
      
    },
    binding: function () {
      app.loading(true);
    },
    bindingComplete: function (view) {
      var dialog = $('.popup-dialog', view);
      var height = $(window).innerHeight();
      dialog.css({ marginTop: (height - 500) / 2 });
    },
    compositionComplete: function (view) {
      app.loading(false);
    },
    attached: function () {
      
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