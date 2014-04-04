define(['durandal/app'], function (app) {

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
        "tutorial:skip"
      ],
      init: function (socket) {
         socket.on("game:update", function (data) {
            console.log('%cgame:update', 'background: #222; color: #bada55', data);
            app.trigger("game:update", data);
         });
      },
      custom: {
         "game:swap-words": function (data, callback, socket) {
            socket.emit("game:swap-words", data, function (res) {
               res.oldWords = data.words;
               app.trigger("game:swap-words", res);
               if (callback) callback(res);
            });
         },

         "game:resume": function (data, callback, socket) {
            //socket.removeAllListeners("game:update");
            //socket.removeListener("game:update", update)

            socket.emit("game:resume", data, function (data) {
               data.resumedGame = true;
               callback(data);
               app.trigger("game:start", data);
            });
         },

         "game:queue": function (data, callback, socket) {
            socket.once("game:start", function (data) {
               console.log('%cgame:start', 'background: #222; color: #bada55', data);
               app.trigger("game:start", data);
            });

            //game:request, type: "single"/"random"/"friend"
            if (data.friendUsername) {
               data.type = "friend";
               //socket.emit("game:friend", data, callback);
            } else {
               if (data.playerCount == 1) {
                  data.type = "single";
               } else {
                  data.type = "random";
               }
               delete data.friendUsername;
               //socket.emit("game:queue", data, callback);
            }
            delete data.playerCount;

            console.log(data);
            socket.emit("game:request", data, callback);
         },

         "tutorial:start": function (data, callback, socket) {
            //socket.once("game:start", function (data) {
            //   console.log('%cgame:start', 'background: #222; color: #bada55', data);
            //   app.trigger("game:start", data);
            //});

            socket.emit("tutorial:start", data, function (game) {
               ko.utils.arrayForEach(game.tiles, function (tile) {
                  tile.instruction = tile.instruction || tile.shortDescription || "";
                  tile.description = tile.description || tile.longDescription || "";
               });
               game.title = (game.id + 1) + '. ' + game.title;
               game.page = (game.id + 1) + ' / ' + game.total;
               game.tutorialIndex = game.id;
               game.id = 't' + game.id;

               app.trigger("game:start", game);
               callback(game);
            });
         }
      }
   }

});