define(['socket', 'durandal/app'], function (socket, app) {

  return {
    emission: [
      /// data = {playerID: '', password: ''}
      /// res = {success: true|false, errorMessage: ''}
      "account:login",
      /// data = {username: '', password: '', email: ''}
      /// res = {success: true|false, errorMessage: ''}
      "account:sign-up",
      /// data = {username: '', email: ''}
      /// res = {success: true|false, errorMessage: ''}
      "account:recover-password",
      /// data = {username: ''}
      /// res = {success: true|false, errorMessage: ''}
      "account:logout",
      /// data = {gameId: #, username: '', word: {id: #, x: #.#, y: #.#}}
      "game:move-word",
      /// data = {gameId: #, username: '', phrase: { words: [#, #, #, ..] }, path: #}
      /// res = {success: true|false, errorMessage: ''}
      "game:place-phrase",
      /// data = { gameId: #, username: '' }
      /// res = { words: [#, #, #, ..] }
      "game:more-words",
      /// data = {gameId: #, username: ''}
      /// res = {success: true|false, errorMessage: ''}
      "game:skip-turn",
      "game:resign",
      "game:lobby"
    ],
    custom: {
      /// data = {gameId: #, username: '', words: [#, #, #, ..]}
      /// res = {success: true|false, errorMessage: '', newWords: [#, #, #, ..]}
      "game:swap-words": function (data, callback, socket) {
        socket.emit("game:swap-words", data, function (res) {
          res.oldWords = data.words;
          app.trigger("game:swap-words", res);
          if (callback) callback(res);
        });
      },
      /// data = {username: ''}
      /// res = {success: true|false, errorMessage: ''}
      "game:queue": function (data, callback, socket) {
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

        socket.emit("game:queue", data, callback);
      }
    }
  }
});