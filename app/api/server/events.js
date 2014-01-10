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
        "game:lobby",
        "game:archive",
        "friends"
      ],
      init: function(socket){
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

            if (data.friendUsername) {
               socket.emit("game:friend", data, callback);
            } else {
               delete data.friendUsername;
               socket.emit("game:queue", data, callback);
            }
         }
      }
   }

});