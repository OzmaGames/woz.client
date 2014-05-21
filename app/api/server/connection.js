define(['socket', 'durandal/app', 'api/history'], function (socket, app, history) {
   
   //var url = "http://wordsdevel.herokuapp.com:80";
   //var url = "http://wordstesting.herokuapp.com:80";
   //var url = "http://localhost:8080";
   var url = "http://wozbeta.herokuapp.com:80";
   
   socket = io.connect(url);   
   
   var state;

   socket.on('connect', function () {
      console.log("%c" + "connected", "background: green; color: white");
      app.trigger( "socket:status", "connect" );
      app.trigger("socket:server", url.match(/devel/gi));
      state = true;

      history.pushHistory( { event: 'connected' } );
   });

   socket.on('disconnect', function () {
      console.log("%c" + "disconnected", "background: red; color: white");
      app.trigger("socket:status", "disconnect");
      state = false;

      history.pushHistory( { event: 'disconnected' } );
   });

   var server = {
      addEvent: addEvent,
      addEmission: function (event) {
         addEvent(event, function (data, callback, socket) {
            socket.emit(event, data, callback);
         });
      },
      socket: socket,
      connected: $.Deferred(function (dfd) {
         if (state) dfd.resolve();
         app.on("socket:status", resolve, dfd);

         function resolve(status) {
            if (status == 'connect') dfd.resolve();
            app.off("socket:status", resolve, dfd);
         }
      }).promise()
   }

   function addEvent(event, func) {
      event = "server:" + event;
      app.on( event ).then( function ( data, callback ) {
         server.connected.then(function () {
            console.log( '%c' + event + ' sent:', 'background: #222; color: #bada55', data );
            history.pushHistory( { event: event, send: true } );
            func( data, function ( sdata ) {
               console.log( '%c' + event + ' received:', 'background: #222; color: #bada55', sdata );
               history.pushHistory( { event: event, received: true } );
               if (callback) callback(sdata);
            }, socket );            
         });
      });
   }

   return server;
});