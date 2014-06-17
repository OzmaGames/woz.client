define( ['durandal/app', 'api/constants', './oAuth/FB'], function ( app, constants, FB ) {

   function validateEmail( email ) {
      var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test( email );
   }

   function updateProfile() {
      $( 'button.facebook' ).transition( { y: -50 } );
      $( '.facebook.profile' ).delay( 500 ).transition( { y: 60 } );
   }

   return window.page = {
      loading: app.loading,
      
      username: ko.observable().extend( {
         required: "Username is required",
         stringLength: { minLength: 3, message: "Incorrect e-mail or username" }
      } ),

      email: ko.observable().extend( {
         customValidation: function ( newValue ) {
            return newValue ? ( validateEmail( newValue ) ? "" : "Incorrect e-mail address" ) : "";
         }
      } ),

      errorMessage: ko.observable(),

      activate: function () {
         this.username( app.facebook.profile.username );
      },

      gologin: function () {
         app.trigger( 'account:view:change', 'account/login' );
      },
      
      facebookProfile: app.facebook.profile,

      signup: function () {
         app.Sound.play( app.Sound.sounds.click.button );
         app.loading( true );
         
         var data = {
            fbToken: app.facebook.authResponse,
            username: this.username(),
            email: this.email() ? this.email() : false
         };

         var base = this;
         app.trigger( "server:account:fb", data, function ( res ) {

            app.loading( false );

            if ( res.success ) {
               res.username = data.username;
               localStorage.removeItem( "tutorial" );
               app.dialog.close( "panel" );
               app.trigger( 'account:login', res );

               app.fromSignUp = true;
               app.navigate( "tutorial" );
            } else {
               base.errorMessage( res.message );
            }
         } );
      }      

   };
} );