define( 'api/datacontext.shop', ['durandal/app', './datacontext.storage'], function ( app, Storage ) {

   var version = 0.1;

   function Shop() {
      var base = this, _user, storage;

      this.collections = ko.observableArray();
      this.besozes = ko.observableArray();
      this.loading = ko.observable( false );

      this.collections.load = function () {
         if ( base.collections().length ) return true;

         base.loading( true );
         app.trigger( "server:shop:collections", {}, function ( data ) {
            base.collections( data );
            base.loading( false );
         } );
      }

      this.besozes.load = function () {
         if ( base.besozes().length ) return;

         base.loading( true );
         app.trigger( "server:shop:besoz", {}, function ( data ) {
            base.besozes( data );
            base.loading( false );
         } );
      }

      this.besozes.buy = function ( user, obj ) {
         return $.Deferred( function ( dfd ) {
            base.loading( true );

            obj.command = "buy";
            obj.username = user.username;
            app.trigger( "server:shop:besoz", obj, function ( json ) {
               if ( json.success ) {
                  dfd.resolve( obj );
               } else {
                  dfd.reject( obj );
               }
               base.loading( false );
            } );
         } )
      }

      this.collections.buy = function ( user, obj ) {
         return $.Deferred( function ( dfd ) {
            base.loading( true );

            obj.command = "buy";
            obj.username = user.username;
            app.trigger( "server:shop:collections", obj, function ( json ) {
               if ( json.success ) {
                  dfd.resolve( obj );
               } else {
                  dfd.reject( obj );
               }
               base.loading( false );
            } );
         } )
      }
   }

   return new Shop();
} );