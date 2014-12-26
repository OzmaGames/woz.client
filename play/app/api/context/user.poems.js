define( 'api/context/user.poems', ['durandal/app'], function ( app ) {
   var model = {
      mine: ko.observableArray(),
      friends: ko.observableArray(),
      load: load,
      add: add,
      del: remove,
      like: like,
      unlike: unlike,
      loading: ko.observable( false )
   };

   app.on( "account:login" ).then( userAuthenticated );
   app.on( "user:authenticated" ).then( userAuthenticated );

   function userAuthenticated() {
      model.mine.removeAll();
      model.friends.removeAll();
   }

   function update( collection, items, keys ) {
      var list = ko.unwrap( collection ), changes = false;

      items = items.reverse();
      items.forEach( function ( item ) {
         var localItems = list.filter( function ( localItem ) { return localItem.id === item.id; } );
         if ( localItems.length ) {
            var local = localItems[0];
            for ( var key in item ) {
               if ( ko.isObservable( local[key] ) ) {
                  local[key]( ko.unwrap( item[key] ) );
               } else {
                  if ( keys.indexOf( key ) != -1 ) {
                     local[key] = ko.observable( item[key] );
                  } else {
                     local[key] = item[key];
                  }
               }
            }
         } else {
            keys.forEach( function ( key ) {
               item[key] = ko.observable( item[key] );
            } );
            list.unshift( item );
            changes = true;
         }
      } );

      for ( var i = 0; i < list.length; i++ ) {
         if ( !items.some( function ( item ) { return item.id == list[i].id } ) ) {
            list.splice( i--, 1 );
            changes = true;
         }
      }

      if ( changes && ko.isObservable( collection ) ) {
         collection.valueHasMutated();
      }
   }

   function load( mine ) {
      model.loading( true );

      return API( mine ? 'getAll' : 'friends' ).then( function ( json ) {
         if ( json.success ) {
            json.poems.forEach( function ( poem ) {
               poem.imageName = ( poem.imageID ? 'images/tiles/' + poem.collection + '/' + poem.imageID + '.jpg' : undefined );
               poem.likes = poem.likes || 0;
               poem.liked = poem.liked || false;
               poem.creationDate = poem.creationDate || 0;
               poem.opponent = poem.opponent || '';               
            } )
            json.poems.sort( function ( a, b ) { return b.creationDate - a.creationDate; } );

            if ( mine )
               update( model.mine, json.poems, ['likes', 'liked'] );
            else
               update( model.friends, json.poems, ['likes', 'liked'] );
         }
         model.loading( false );
      } );
   }

   function loadOnSuccess( json ) {
      if ( json.success ) load( false );
      return json;
   }

   function add( poem ) {
      return API( 'add', poem );
   }

   function remove( id ) {
      return API( 'delete', { id: id } );
   }

   function like( id ) {
      return API( 'like', { id: id } ).then( function ( json ) {
         if ( json.success ) {
            var poems = model.friends().filter( function ( poem ) { return poem.id == id } );
            poems[0].likes( json.likes );
            poems[0].liked( true );
         }
      } );
   }

   function unlike( id ) {
      return API( 'unlike', { id: id } ).then( function ( json ) {
         if ( json.success ) {
            var poems = model.friends().filter( function ( poem ) { return poem.id == id } );
            poems[0].likes( json.likes );
            poems[0].liked( false );
         }
      } );
   }

   function API( command, options ) {
      var model = $.extend( {
         command: command
      }, options );

      return $.Deferred( function ( dfd ) {
         app.trigger( "server:user:poem", model, function ( json ) {
            dfd.resolve( json );
         } );
      } )
   }

   return model;
} );