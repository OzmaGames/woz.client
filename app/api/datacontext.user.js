define( 'api/datacontext.user', ['durandal/app', './datacontext.shop'], function ( app, shop ) {
   function User() {
      var base = this, _user;

      this.username = '';
      this.besoz = ko.observable(0);
      this.level = ko.observable(0);
      this.collections = ko.observableArray();      

      this.loading = ko.observable( false );

      this.buyBesoz = function ( amount ) {
         return shop.besozes.buy( _user, { amount: amount } ).then( function () {
            base.besoz( base.besoz() + amount );
         } ).fail( function () {
            app.dialog.show( 'alert', { content: "rejected" } );
         } );
      }

      this.buyCollection = function ( type, name ) {
         return shop.collections.buy( _user, { type: type, name: name } ).then( function () {
            pullData();
         } ).fail( function () {
            
         } );
      }

      app.on( "account:login" ).then( function ( json ) {
         userAuthenticated( { username: json.username, online: 1 } );
      } );

      app.on( "user:authenticated" ).then( userAuthenticated );

      function userAuthenticated( user ) {
         base.collections.removeAll();

         if ( base.username = user.username, _user = user, _user.online ) {
            pullData();
         }
      }

      function pullData() {
         base.loading( true );

         app.trigger( "server:user:info", { username: base.username }, function ( data ) {
            if ( data.success ) {
               ko.utils.arrayForEach( data.collections, function ( collection ) {
                  collection.desc = "50/50 tiles - 150/150 words";
               } );
               base.collections( data.collections );
               base.besoz( data.besoz );
               base.level( data.level );
            }
            base.loading( false );
         } );
      }
   }

   return new User();
} );