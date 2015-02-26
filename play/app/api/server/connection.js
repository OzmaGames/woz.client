define( ['durandal/app', 'api/helper/history', 'api/helper/Log'], function ( app, history, LOG ) {

   //var url = "http://wordsdevel.herokuapp.com:80";
   //var url = "http://wordstesting.herokuapp.com:80";
   //var url = "http://localhost:8080";
   var url = "http://wozbeta.herokuapp.com:80";

   //var url = "http://wordsprod.herokuapp.com:80";

   var socket = io.connect( url );

   var state;

   //var Log = LOG.getLog(LOG.themes.)

   socket.on( 'connect', function () {
      LOG.instance.log( "connected", null, LOG.themes.green );

      app.trigger( "socket:status", "connect" );
      app.trigger( "socket:server", url.match( /devel/gi ) );
      state = true;

      history.pushHistory( { event: 'connected' } );
   } );

   socket.on( 'disconnect', function () {
      LOG.instance.log( "disconnected", null, LOG.themes.red );

      app.trigger( "socket:status", "disconnect" );
      state = false;

      history.pushHistory( { event: 'disconnected' } );
   } );

   var server = {
      addEvent: addEvent,
      addEmission: function ( event ) {
         addEvent( event, function ( data, callback, socket ) {
            socket.emit( event, data, callback );
         } );
      },
      addToken: addToken,
      socket: socket,
      connected: $.Deferred( function ( dfd ) {
         if ( state ) dfd.resolve();
         app.on( "socket:status", resolve, dfd );

         function resolve( status ) {
            if ( status == 'connect' ) dfd.resolve();
            app.off( "socket:status", resolve, dfd );
         }
      } ).promise()
   }

   function addEvent( event, func ) {
      event = "server:" + event;
      app.on( event ).then( function ( data, callback ) {

         if ( !addToken( event, data ) ) {
            LOG.instance.log( event, 'invalid request!', LOG.themes.warn );
            return;
         }

         server.connected.then( function () {
            LOG.instance.log( event + ' sent', data, LOG.themes.black );

            history.pushHistory( { event: event, send: true } );
            func( data, function ( sdata ) {
               history.pushHistory( { event: event, received: true } );

               LOG.instance.log( event + ' received', sdata, LOG.themes.black );
               if ( sdata.success !== true ) {
                  LOG.instance.log( event, 'success failed', LOG.themes.warn );
                  if ( sdata.code == 403 ) {
                     LOG.instance.log( event, '403 forbidden', LOG.themes.red );
                     app.trigger( 'access:forbidden', event );
                     history.pushHistory( { forbidden: true, event: event, request: data, response: sdata } );                     
                  }
               }

               if ( callback ) {
                  if ( !( sdata.success === false && sdata.code === 403 ) || event == "server:user:info" ) {
                     callback( sdata );
                  }
               }
            }, socket );
         } );
      } );
   }

   function addToken( event, json ) {
      //if ( event.match( /account/i ) ) return;
      if ( app.ctx ) {
         if ( !( 'username' in json ) ) {
            json.username = app.ctx.username;
         }

         if ( json.username == undefined ) return false;

         json.token = app.ctx.token;

         return true;
      } else {
         LOG.instance.log( "* " + event, json, LOG.themes.warn );
         return false;
      }
   }

   return server;
} );