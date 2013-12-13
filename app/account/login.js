define(['durandal/app', 'api/constants'], function (app, constants) {

   return window.page = {
      loading: app.loading,

      username: ko.observable().extend({
         required: "You need to enter you username or e-mail",
         stringLength: { minLength: 3, message: "Incorrect e-mail or username" }
      }),

      password: ko.observable().extend({
         required: "You need to enter your password",
      }),

      errorMessage: ko.observable(),

      signUp: function () {
         app.trigger('account:view:change', 'account/sign-up');
      },

      recover: function () {
         app.trigger('account:view:change', 'account/recovery');
      },

      login: function (el) {
         app.loading(true);

         var data = {
            username: this.username(),
            password: CryptoJS.SHA3(constants.salt + this.username() + this.password()).toString()            
         };

         var base = this;
         app.trigger("server:account:login", data, function (res) {

            app.loading(false);

            if (res.success) {
               res.username = data.username;
               app.dialog.close("panel");
               app.trigger('account:login', res);
               app.navigate("lobby");
            } else {
               base.errorMessage(res.message);
            }
         });
      }

   };
});