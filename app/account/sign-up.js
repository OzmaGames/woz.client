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
      return "Incorrect e-mail address"
    }
    return "";
  }

  function validateEmail(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  } 

  
  return {    
    loading: app.loading,
    username: username,
    password: password,
    errorMessage: errorMessage,
    email: email,
   
    signUp: function() {
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
          app.dialog.close("panel");
          app.trigger('account:login', res);
          router.navigate("newGame");
          app.dialog.show("notice", { model: {}, view: "dialogs/pages/welcome" });
        } else {
          errorMessage(res.message);
        }
      });
    },

    login: function () {
      app.trigger('account:view:change', 'account/login');
    }
};
});