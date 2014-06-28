define( 'api/datacontext.user', ['durandal/app', './datacontext.shop'], function ( app, shop ) {
   function User() {
      var base = this, _user;

      this.username = '';
      this.besoz = ko.observable( 0 );
      this.storage = ko.observable( 0 );
      this.level = ko.observable( 0 );
      this.xp = ko.observable( 0 );
      this.xpMax = ko.observable( 100 );
      this.title = ko.observable( '' );
      this.collections = ko.observableArray();
      this.friends = ko.observableArray();

      this.loading = ko.observable( 0 );

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

      this.buyStorageSpace = function ( storageObj ) {
         return shop.storageSpaceList.buy( _user, storageObj ).then( function () {
            pullData();
         } ).fail( function () {
            app.dialog.showNoBesoz( storageObj.price );
         } );
      }

      this.refresh = function () {
         pullData();
      }

      this.friends.load = loadFriends;
      this.friends.has = isFriendWith;
      this.friends.search = searchFriends;

      app.on( "account:login" ).then( function ( json ) {
         userAuthenticated( { username: json.username, online: 1 } );
      } );

      app.on( "user:authenticated" ).then( userAuthenticated );

      function userAuthenticated( user ) {
         base.collections.removeAll();

         if ( base.username = user.username, _user = user, _user.online ) {
            pullData();
            loadFriends();
         }
      }

      function pullData() {
         base.loading( base.loading() + 1 );

         app.trigger( "server:user:info", { username: base.username }, function ( data ) {
            if ( data.success ) {
               ko.utils.arrayForEach( data.collections, function ( collection ) {
                  collection.desc = "50/50 tiles - 150/150 words";
               } );
               base.collections( data.collections );
               base.besoz( data.besoz );
               base.level( data.level );
               base.storage( data.storage );
               base.xp( data.xp );
               base.xpMax( data.xpMax || 100 );
               base.title( data.title );
               //base.storage( 5 );
            }
            base.loading( base.loading() - 1 );
         } );
      }

      function loadFriends() {
         base.loading( base.loading() + 1 );

         return $.Deferred( function ( dfd ) {
            app.trigger( "server:friends", { username: base.username, command: 'getAll' }, function ( data ) {
               if ( data.success ) {
                  data.friends.sort( function ( a, b ) { return a.username > b.username; } )
                  data.friends.forEach( function ( f ) {
                     f.isFriend = true;
                  } )
                  base.friends( data.friends );
                  dfd.resolve( data.friends );
               }               
               base.loading( base.loading() - 1 );
            } );
         } );
      }

      function searchFriends( query ) {
         return $.Deferred( function ( dfd ) {
            app.trigger( "server:friends", { username: base.username, command: 'search', friendUsername: query }, function ( data ) {
               if ( data.users ) {
                  data.users.forEach( function ( user ) {
                     user.isFriend = isFriendWith( user.username ) ? true : false;
                  } );
               }

               dfd.resolve( data.users );
            } );
         } )
      }

      function isFriendWith( username ) {
         return base.friends().some( function ( f ) { return f.username == username } )
      }
   }

   return new User();
} );