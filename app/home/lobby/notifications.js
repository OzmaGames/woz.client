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

   function loadActiveGames() {
      return $.Deferred(function (dfd) {
         app.trigger("server:game:lobby", { username: ctx.username }, function (data) {
            if (data.success) {
               data.games.sort(function (a, b) { return b.lastMod - a.lastMod; });
               ko.utils.arrayForEach(data.games, function (game) {
                  if (game.lastPhrase.username == ctx.username) {
                     game.lastPhrase.username = "You";
                  }
               })
               games(data.games);
               dfd.resolve();
            }
         });
      });      
   }

   return {
      loading: ko.observable(true),
      activate: function () {
         app.dialog.closeAll();
         app.palette.dispose();

         activeGame(null);
      },
      tabName: ko.observable('lobbyGames'),
      lobby: [
        {
           title: 'My Turn',
           empty: 'You have no ongoing games where it\'s your turn.',
           games: ko.computed(function () {
              return ko.utils.arrayFilter(games(), function (g) {
                 return getPlayer(g.players).active;
              })
           })
        }, {
           title: 'Their Turn',
           empty: 'You have no ongoing games where it\'s your opponents turn.',
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
      navigate: function (tabIndex, dfd) {
         var base = this;
         base.loading(true);

         dfd.then(function () {
            base.tabName(tabIndex == 0 ? 'lobbyGames' : tabIndex == 1 ? 'lobbyNotifications' : 'lobbyArchive');
         });

         switch (tabIndex) {
            case 0:
               return loadActiveGames().then(function () {
                  base.loading(false)
               });
               break;
            case 1:
               break;
            case 2:
               break;
         }

         return dfd;
      },
      activeGame: activeGame,
      binding: function () {
         return { cacheViews: false };
      }
   }
});