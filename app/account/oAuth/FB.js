define(["durandal/app"/*,"facebook"*/], function (app) {

   app.facebook = app.facebook || {
      authResponse: undefined,
      getProfile: function () {
         return $.Deferred(function (dfd) {
            FB.api('/me', function (response) {
               console.log(response);
               dfd.resolve(response);
            });
         });
      },
      getFriends: function () {
         return $.Deferred(function (dfd) {
            FB.api('/me/friends', function (response) {
               console.log(response);
               dfd.resolve(response);
            });
         });
      },
      status: 0
   };
   
   //FB.init({
   //   appId: '447561982032834',
   //   status: false, // check login status
   //   cookie: true,  // enable cookies to allow the server to access the session
   //   xfbml: false   // parse XFBML
   //});

   //FB.Event.subscribe('auth.authResponseChange', check);   

   return {
      getStatus: function (force) {
         return $.Deferred(function (dfd) {
            FB.getLoginStatus(function (response) {
               check(response);
               dfd.resolve(app.facebook);
            }, force);
         });         
      },
      login: function () {
         return $.Deferred(function (dfd) {
            FB.login(function (response) {
               check(response);
               dfd.resolve(app.facebook);
            });
         });
      }
   }

   function check(response) {
      app.facebook.authResponse = response.authResponse;

      if (response.status === 'connected') {
         app.facebook.status = 2;
      } else if (response.status === 'not_authorized') {
         app.facebook.status = 1;
      } else {
         app.facebook.status = 0;
      }

      app.trigger("oAuth:login", {
         gateway: 'facebook',
         response: app.facebook
      });
   }
});