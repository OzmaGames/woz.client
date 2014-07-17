define( 'api/context/user.block', ['durandal/app'], function ( app ) {
   var model = ko.observableArray(), username;

   model.load = load;
   model.has = isBlocked;
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

      return API( 'getAll' ).then( function ( data ) {
         if ( data.success ) {
            data.foes.sort( function ( a, b ) { return a.username > b.username; } )
            model( data.foes );
         }
         model.loading( false );
      } );
   }

   function loadOnSuccess( json ) {
      if ( json.success ) load();
      return json;
   }

   function add( username ) {
      return API( 'add', username ).then( loadOnSuccess );
   }

   function remove( username ) {
      return API( 'delete', username ).then( loadOnSuccess );
   }

   function API( command, foeUsername ) {
      return $.Deferred( function ( dfd ) {
         app.trigger( "server:foes", {
            username: username,
            command: command,
            foeUsername: foeUsername
         }, function ( json ) {
            dfd.resolve( json );
         } );
      } )
   }

   function isBlocked( username ) {
      return model().some( function ( f ) { return f.username == username } )
   }

   return model;
} );