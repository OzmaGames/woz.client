define(['plugins/router', 'durandal/app', 'api/datacontext'], function (router, app, ctx) {

   var games = ko.observableArray(),
     activeGame = ko.observable();

   function getPlayer(players) {
      if (players[0].username === ctx.username) return players[0];
      return players[1];
   }

   function getOpponent(players) {
      if (players.length == 1) return null;
      if (players[0].username !== ctx.username) return players[0];
      return players[1];
   }

   return {
      loading: ko.observable(true),      
      activate: function () {
         var base = this;
         app.trigger("server:game:lobby", { username: ctx.username }, function (data) {
            if (data.success) {
               data.games.sort(function (a, b) { return b.lastMod - a.lastMod; });
               ko.utils.arrayForEach(data.games, function (game) {
                  if (game.lastPhrase.username == ctx.username) {
                     game.lastPhrase.username = "You";
                  }
               })
               games(data.games);
               base.loading(false);
            }
         });

         activeGame(null);
         app.dialog.close("all");
         app.palette.dispose();
      },

      lobby: [
        {
           title: 'My Turn',
           games: ko.computed(function () {
              return ko.utils.arrayFilter(games(), function (g) {
                 return getPlayer(g.players).active;
              })
           })
        }, {
           title: 'Their Turn',
           games: ko.computed(function () {
              return ko.utils.arrayFilter(games(), function (g) {
                 return !getPlayer(g.players).active;
              })
           })
        }
      ],
      getPlayer: function (game) { return getPlayer((game || this).players); },
      getOpponent: function (game) { return getOpponent((game || this).players); },
      start: function () {
         app.navigate("newGame");
      },
      loadGame: function (game) {
         app.navigate("game/" + game.gameID);
      },
      select: function (game, e) {
         activeGame(game);
         app.navigate("game/" + game.gameID);
      },
      activeGame: activeGame,
      binding: function () {
         return { cacheViews: false };
      }
   }
});