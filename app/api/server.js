define(['socket', 'durandal/app'], function (socket, app) {

  var connected = $.Deferred();

  socket = io.connect("http://wordstesting.herokuapp.com:80");  
  socket.on('connect', function () {
    connected.resolve();
    console.log("connected");
  });
  socket.on('disconnect', function () {
    connected.reject();
    console.log("disconnected");
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
      socket.emit("game:swap-words", data, function (res) {
        res.oldWords = data.words;
        app.trigger("game:swap-words", res);
        if(callback) callback(res);
      });
    },

    /// data = {gameId: #, username: ''}
    /// res = {success: true|false, errorMessage: ''}
    "server:game:skip-turn": function (data, callback) {
      socket.emit("game:skip-turn", data, callback);
    },

    "server:game:resign": function (data, callback) {
      socket.emit("game:resign", data, callback);        
    },

    /// data = {username: ''}
    /// res = {success: true|false, errorMessage: ''}
    "server:game:queue": function (data, callback) {     
        /// res = {players: [{id: #, score: #},..], phrases: [{id: #, words:[]},..]}
        socket.on("game:update", function (data) {
          console.log('%cgame:update', 'background: #222; color: #bada55', data);
          app.trigger("game:update", data);
        });

        /// res = game object, the big bad ass object
        socket.on("game:start", function (data) {
          console.log('%cgame:start', 'background: #222; color: #bada55', data);
          app.trigger("game:start", data);
        });

        //TODO: level: 1,2,3
        socket.emit("game:queue", data, callback);                
    }
  };

  for (var event in applicationEvents) {
    addEvent(event, applicationEvents[event]);
  }

  function addEvent(event, func) {
    app.on(event).then(function (data, callback) {
      connected.promise().then(function () {
        console.log('%c' + event + ' sent:', 'background: #222; color: #bada55', data);
        func(data, function (sdata) {
          console.log('%c' + event + ' received:', 'background: #222; color: #bada55', sdata);
          if (callback) callback(sdata);
        });
      });
    });
  }
});