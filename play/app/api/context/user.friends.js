define( 'api/context/user.friends', ['durandal/app'], function ( app ) {
   var model = ko.observableArray(), username;

   model.load = load;
   model.has = isFriendWith;
   model.search = search;
   model.add = add;
   model.del = remove;
   model.loading = ko.observable( false );

   app.on( "account:login" ).then( function ( json ) {
      userAuthenticated( { username: json.username, online: 1 } );
   } );

   app.on( "user:authenticated" ).then( userAuthenticated );

   function userAuthenticated( user ) {
      model.removeAll();

      if ( username = user.username, user.online ) {
         load();
      }
   }

   function load() {
      model.loading( true );

      return API( 'getAll' ).then( function (data) {
         if ( data.success ) {
            data.friends.sort( function ( a, b ) {
              // return a.username > b.username;
              return a.username.localeCompare(b.username, 'en', {'sensitivity': 'base'});
            } )
            data.friends.forEach( function ( f ) {
               f.isFriend = true;
            } )
            model( data.friends );
         }
         model.loading( false );
         return data.friends || [];
      } );
   }

   function search( query ) {
      return API( 'search', query ).then( function ( data ) {
         if ( data.users ) {
            data.users.forEach( function ( user ) {
               user.isFriend = isFriendWith( user.username ) ? true : false;
            } );
         }
         return data.users || [];
      } );
   }

   function loadOnSuccess( json ) {
      if ( json.success ) load();
      return json;
   }

   function add( friendUsername ) {
      return API( 'add', friendUsername ).then( loadOnSuccess );
   }

   function remove( friendUsername ) {
      return API( 'delete', friendUsername ).then( loadOnSuccess );
   }

   function API( command, friendUsername ) {
      return $.Deferred( function ( dfd ) {
         app.trigger( "server:friends", {
            username: username,
            command: command,
            friendUsername: friendUsername
         }, function ( json ) {
            dfd.resolve( json );
         } );
      } )
   }

   function isFriendWith( username ) {
      return model().some( function ( f ) { return f.username == username } )
   }

   return model;
} );