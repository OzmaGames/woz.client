define( ['durandal/app', 'api/helper/history', 'api/helper/Log'], function ( app, history, LOG ) {

   return {
      emission: [
        "account:login",
        "account:sign-up",
        "account:recover-password",
        "account:logout",
        "game:move-word",
        "game:place-phrase",
        "game:more-words",
        "game:skip-turn",
        "game:resign",
        "game:versions",
        "game:search-word",
        "game:add-word",
        "lobby",
        "friends",
        "tutorial:place-phrase",
        "tutorial:skip",
        "user:collections",
        "shop:collections",
        "user:info",
        "user:poem",
        "shop:besoz",
        "shop:storage",
        "account:fb",
        "account:delete",
        "foes",
        "user:suggest"
      ],
      init: function ( socket ) {
         socket.on( "game:update", function ( data ) {
            LOG.instance.log( 'game:update', data, LOG.themes.black );
            app.trigger( "game:update", data );
            history.pushHistory( { event: "game:update", received: true } );
         } );
         socket.on( "lobby:update", function ( data ) {
            LOG.instance.log( 'lobby:update', data, LOG.themes.black );            
            app.trigger( "lobby:update", data );
            history.pushHistory( { event: "lobby:update", received: true } );
         } );
      },
      custom: {
         "game:swap-words": function ( data, callback, socket ) {
            socket.emit( "game:swap-words", data, function ( res ) {
               res.oldWords = data.words;
               app.trigger( "game:swap-words", res );
               if ( callback ) callback( res );
            } );
         },

         "game:resume": function ( data, callback, socket ) {
            //socket.removeAllListeners("game:update");
            //socket.removeListener("game:update", update)

            socket.emit( "game:resume", data, function ( data ) {
               data.resumedGame = true;
               callback( data );
               app.trigger( "game:start", data );
            } );
         },

         "game:queue": function ( data, callback, socket ) {
            socket.once( "game:start", function ( data ) {               
               LOG.instance.log( 'game:start', data, LOG.themes.black );
               app.trigger( "game:start", data );
               history.pushHistory( { event: "game:start", received: true } );
            } );
            
            if ( data.friendUsername ) {
               data.type = "friend";               
            } else {
               if ( data.playerCount == 1 ) {
                  data.type = "single";
               } else {
                  data.type = "random";
               }
               delete data.friendUsername;               
            }
            delete data.playerCount;

            socket.emit( "game:request", data, callback );
         },

         "tutorial:start": function ( data, callback, socket ) {
            socket.emit( "tutorial:start", data, function ( game ) {
               ko.utils.arrayForEach( game.tiles, function ( tile ) {
                  tile.instruction = tile.instruction || tile.shortDescription || "";
                  tile.description = tile.description || tile.longDescription || "";
               } );
               game.title = ( game.id + 1 ) + '. ' + game.title;
               game.page = ( game.id + 1 ) + ' / ' + game.total;

               app.trigger( "game:start", game );
               callback( game );
            } );
         }
      }
   }

} );