define(['durandal/app', 'api/constants'], function (app, constants) {

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

      password: ko.observable().extend({
         required: "Password is required"
      }),

      email: ko.observable().extend({
         required: "E-mail is required",
         customValidation: function (newValue) {
            return validateEmail(newValue) ? "" : "Incorrect e-mail address";
         }
      }),

      errorMessage: ko.observable(),

      signUp: function () {
         app.loading(true);

         var data = {
            username: this.username(),
            email: this.email(),
            password: CryptoJS.SHA3(constants.salt + this.username() + this.password()).toString()
         };

         var base = this;
         app.trigger("server:account:sign-up", data, function (res) {
            app.loading(false);

            if (res.success) {
               res.username = data.username;
               sessionStorage.setItem("newUser", true);
               app.dialog.close("panel");
               app.trigger('account:login', res);
               app.navigate("newGame");
               setTimeout(function () {
                  app.dialog.show("notice", { model: {}, view: "dialogs/pages/welcome", modal: true });
               }, 200);               
            } else {
               base.errorMessage(res.message);
            }
         });
      },

      login: function () {
         app.trigger('account:view:change', 'account/login');
      }
   };
});