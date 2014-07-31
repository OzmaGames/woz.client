define( ['durandal/app', 'api/datacontext'], function ( app, ctx ) {

   function validateEmail( email ) {
      var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test( email );
   }

   function ctor() {
      this.loading = ko.observable( false );
      this.email = ko.observable().extend( {
         required: "E-mail is required",
         customValidation: function ( newValue ) {
            return validateEmail( newValue ) ? "" : "Incorrect e-mail address";
         }
      } );

      var base = this;

      this.send = function () {
         app.trigger( "server:user:invite", { email: base.email() }, function ( json ) {
            app.dialog.show( 'alert', { content: 'An invitation has been sent to ' + base.email() + '!' } );
         } );
         app.dialog.close( 'notice' );
      }
   }

   return ctor;
} );