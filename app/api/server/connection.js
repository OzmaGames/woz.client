define(['socket', 'durandal/app'], function (socket, app) {

  var dfd = $.Deferred();

  socket = io.connect("http://wordsdevel.herokuapp.com:80");
//socket = io.connect("http://localhost:8080");

  socket.on('connect', function () {
    console.log("%c" + "connected", "background: green; color: white");
    app.trigger("socket:status", "connect");
    dfd.resolve();
  });

  socket.on('disconnect', function () {
    console.log("%c" + "disconnected", "background: red; color: white");
    app.trigger("socket:status", "disconnect");
    dfd.reject();
  });

  return {
    addEvent: addEvent,
    addEmission: function (event) {
      addEvent(event, function (data, callback, socket) {
        socket.emit(event, data, callback);
      });
    },
    connected: dfd.promise()
  }
  
  function addEvent(event, func) {
    event = "server:" + event;
    app.on(event).then(function (data, callback) {
      dfd.promise().then(function () {
        console.log('%c' + event + ' sent:', 'background: #222; color: #bada55', data);
        func(data, function (sdata) {
          console.log('%c' + event + ' received:', 'background: #222; color: #bada55', sdata);
          if (callback) callback(sdata);
        }, socket);
      });
    });
  }
});