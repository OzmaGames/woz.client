define( ['durandal/app', 'api/datacontext', 'api/constants', './oAuth/FB'], function ( app, ctx, constants, FB ) {

   function updateProfile() {
      $( 'button.facebook' ).transition( { y: -50 } );
      $( '.facebook.profile' ).delay( 500 ).transition( { y: 60 } );
   }

   function ctor() {
      this.loading = app.loading;
      this.facebookLogin = true;
      this.hasUsername = ( ctx.username && ctx.username.length > 2 && ctx.username.length < 20 );

      this.username = ko.observable( this.hasUsername ? ctx.username : '' ).extend( {
         required: "You need to enter you username or e-mail",
         stringLength: { minLength: 3, message: "Incorrect e-mail or username" }
      } );
      this.password = ko.observable().extend( {
         required: "You need to enter your password",
      } );
      this.errorMessage = ko.observable();
      this.facebookProfile = ko.observable( undefined );
   }

   ctor.prototype.signUp = function () {
      if ( app.loading() ) return;
      app.trigger( 'account:view:change', 'account/sign-up' );
   };

   ctor.prototype.recover = function () {
      app.trigger( 'account:view:change', 'account/recovery' );
   };

   ctor.prototype.facebook = function () {
      if ( !this.facebookLogin ) return;
      var page = this;

      app.loading( true );
      FB.login().then( function ( facebook ) {
         if ( facebook.status != 2 ) {
            app.loading( false );
            page.errorMessage( "Something went wrong!" );
         } else {
            facebook.getProfile().then( function ( profile ) {
               page.facebookProfile( profile );
               page.username( profile.email? profile.email: (profile.username? (profile.username + '@facebook.com'): '') );
               page.password( facebook.authResponse.signedRequest );
               updateProfile();

               app.trigger( "server:account:fb", { fbToken: app.facebook.authResponse }, function ( res ) {
                  app.loading( false );
                  if ( res.success && !res.username ) {
                     app.trigger( 'account:view:change', 'account/facebook' );
                  } else if ( res.success ) {
                     app.ctx.besoz = res.besoz || 0;
                     app.ctx.needTutorial = res.tutorial || false;

                     app.dialog.close( "panel" );

                     app.trigger( 'toContext:account:login', res );
                     app.trigger( 'account:login', res );

                     if ( app.ctx.needTutorial ) {
                        app.navigate( "tutorial" );
                        //app.trigger("server:tutorial:start", { username: res.username });
                     } else {
                        if ( ctx.nextRoute ) {
                           app.navigate( ctx.nextRoute );
                        } else {
                           app.navigate( "lobby" );
                        }                        
                     }
                  }
               } );
            } );
         }
      } );
   };

   ctor.prototype.login = function ( el ) {
      app.Sound.play( app.Sound.sounds.click.button );
      app.loading( true );

      var data = {
         username: this.username(),
         password: CryptoJS.SHA3( constants.salt + this.password() ).toString()
      };

      var base = this;
      app.trigger( "server:account:login", data, function ( res ) {

         app.loading( false );

         if ( res.success ) {
            app.ctx.besoz = res.besoz || 0;
            app.ctx.needTutorial = res.tutorial || false;

            app.dialog.close( "panel" );
            app.trigger( 'toContext:account:login', res );
            app.trigger( 'account:login', res );

            if ( app.ctx.needTutorial ) {
               app.navigate( "tutorial" );
               //app.trigger("server:tutorial:start", { username: res.username });
            } else {
               if ( ctx.nextRoute ) {
                  app.navigate( ctx.nextRoute );
               } else {
                  app.navigate( "lobby" );
               }
            }
         } else {
            base.errorMessage( res.message );
         }
      } );
   }

   return ctor;

} );