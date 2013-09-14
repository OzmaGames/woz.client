define(['socket', 'durandal/app'], function (socket, app) {

  var subscriptions = [];

  var socket = io.connect("http://wordstesting.herokuapp.com:80");
  //var socket = io.connect("http://localhost:8080");

  socket.on('connect', function () {
    console.log("connected");

    //var playerID = 'test';
    //socket.emit("account:login", { playerID: playerID, password: '12345' }, function (data) {
    //    console.log("%c login", 'background: #222; color: #bada55', data);

    //    socket.on("game:updates", function (data) {
    //        console.log('%c game:updates', 'background: #222; color: #bada55', data);
    //        app.trigger("game:updates", $.parseJSON(data));
    //    });

    //    /// res = game object, the big bad ass object
    //    socket.on("game:start", function (data) {
    //        console.log('%c game:start', 'background: #222; color: #bada55', data);
    //        console.log(JSON.stringify(data));
    //        app.trigger("game:start", $.parseJSON(data));
    //    });

    //    socket.emit("game:queue", { playerID: playerID, playerCount: 1 }, function (data) {
    //        console.log("%c queue", 'background: #222; color: #bada55', data)
    //    });
    //});
    //socket.emit("game:place-phrase", { playerID: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }, function (b) { console.log(b); });
    //console.log("connected");

  });

  var applicationEvents = {

    /// data = {playerID: '', password: ''}
    /// res = {success: true|false, errorMessage: ''}
    "server:account:login": function (data, callback) {
      socket.emit("account:login", data, callback);
    },

    /// data = {username: '', password: '', email: ''}
    /// res = {success: true|false, errorMessage: ''}
    "server:account:sign-up": function (data, callback) {
      socket.emit("account:sign-up", data, callback);
    },

    /// data = {username: '', email: ''}
    /// res = {success: true|false, errorMessage: ''}
    "server:account:recover-password": function (data, callback) {
      socket.emit("account:recover-password", data, callback);
    },

    /// data = {username: ''}
    /// res = {success: true|false, errorMessage: ''}
    "server:account:logout": function (data, callback) {
      socket.emit("account:logout", data, callback);
    },

    /// data = {gameId: #, username: '', word: {id: #, x: #.#, y: #.#}}
    "server:game:move-word": function (data) {
      socket.emit("game:move-word", data);
    },

    /// data = {gameId: #, username: '', phrase: { words: [#, #, #, ..] }, path: #}
    /// res = {success: true|false, errorMessage: ''}
    "server:game:place-phrase": function (data, callback) {
      console.log('%c game:place-phrase', 'background: #222; color: #bada55', data);
      socket.emit("game:place-phrase", data, callback);
    },

    /// data = { gameId: #, username: '' }
    /// res = { words: [#, #, #, ..] }
    "server:game:more-words": function (data, callback) {
      socket.emit("game:more-words", data, callback);
    },

    /// data = {gameId: #, username: '', words: [#, #, #, ..]}
    /// res = {success: true|false, errorMessage: '', newWords: [#, #, #, ..]}
    "server:game:swap-words": function (data, callback) {
      socket.emit("game:swap-words", data, callback);
    },

    /// data = {gameId: #, username: ''}
    /// res = {success: true|false, errorMessage: ''}
    "server:game:skip-turn": function (data, callback) {
      socket.emit("game:skip-turn", data, callback);
    },

    /// data = {username: ''}
    /// res = {success: true|false, errorMessage: ''}
    "server:game:queue": function (data, callback) {
     
      if (socket.socket.connected === true) {
        runOnce(data, callback);
      }
      else {
        socket.once('connect', function () {
          runOnce(data, callback);
        });
      }

      function runOnce(data, callback) {
        /// res = {players: [{id: #, score: #},..], phrases: [{id: #, words:[]},..]}
        socket.on("game:updates", function (data) {
          console.log('%c game:updates', 'background: #222; color: #bada55', data);
          app.trigger("game:updates", data);
        });

        /// res = game object, the big bad ass object
        socket.on("game:start", function (data) {
          console.log('%c game:start', 'background: #222; color: #bada55', data);
          app.trigger("game:start", data);
        });

        //TODO: level: 1,2,3
        socket.emit("game:queue", data, function (data) {
          console.log("%c queue", 'background: #222; color: #bada55', data);
          callback(data);
        });

        console.log('Q request Sent...');
      }
    }
  };

  for (var event in applicationEvents) {
    app.on(event).then(applicationEvents[event]);
  }

});