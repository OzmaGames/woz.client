﻿define( ['durandal/app', 'api/constants'], function ( app, constants ) {

   function validateEmail( email ) {
      var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test( email );
   }

   return {
      loading: app.loading,

      username: ko.observable().extend( {
         required: "Username is required",
         stringLength: { minLength: 3, message: "Incorrect e-mail or username" }
      } ),

      password: ko.observable().extend( {
         required: "Password is required"
      } ),

      email: ko.observable().extend( {
         required: "E-mail is required",
         customValidation: function ( newValue ) {
            return validateEmail( newValue ) ? "" : "Incorrect e-mail address";
         }
      } ),

      errorMessage: ko.observable(),

      signUp: function () {
         app.Sound.play( app.Sound.sounds.click.button );
         app.loading( true );

         var data = {
            username: this.username(),
            email: this.email(),
            password: CryptoJS.SHA3( constants.salt + this.password() ).toString()
         };

         var base = this;
         app.trigger( "server:account:sign-up", data, function ( res ) {
            app.loading( false );

            if ( res.success ) {
               app.trigger( "server:account:login", data, function ( res ) {
                  res.username = data.username;
                  localStorage.removeItem( "tutorial" );
                  app.dialog.close( "panel" );

                  app.trigger( 'toContext:account:login', res );
                  app.trigger( 'account:login', res );

                  app.fromSignUp = true;
                  app.navigate( "tutorial" );
               } );               
            } else {
               base.errorMessage( res.message );
            }
         } );
      },

      login: function () {
         app.trigger( 'account:view:change', 'account/login' );
      },

      terms: function () {
          app.loading(true);
          app.dialog.show("panel", { module: 'account/l-terms', fixed: true, css: 'wide' }, {
              compositionComplete: function () {
                  app.loading(false);
              }
          });          
      },

      privacy: function () {
          app.loading(true);
          app.dialog.show("panel", { module: 'account/l-privacy', fixed: true, css: 'wide' }, {
              compositionComplete: function () {
                  app.loading(false);
              }
          });
      },
   };
} );