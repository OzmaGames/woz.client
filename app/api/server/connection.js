define(['socket', 'durandal/app'], function (socket, app) {

   socket = io.connect("http://wordsdevel.herokuapp.com:80");
   //socket = io.connect("http://wordstesting.herokuapp.com:80");
   //socket = io.connect("http://localhost:8080");

   var state;

   socket.on('connect', function () {
      console.log("%c" + "connected", "background: green; color: white");
      app.trigger("socket:status", "connect");
      state = true;
   });

   socket.on('disconnect', function () {
      console.log("%c" + "disconnected", "background: red; color: white");
      app.trigger("socket:status", "disconnect");
      state = false;
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
      app.on(event).then(function (data, callback) {
         server.connected.then(function () {
            console.log('%c' + event + ' sent:', 'background: #222; color: #bada55', data);
            func(data, function (sdata) {
               console.log('%c' + event + ' received:', 'background: #222; color: #bada55', sdata);
               if (callback) callback(sdata);
            }, socket);
         });
      });
   }

   return server;
});