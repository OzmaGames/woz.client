define(['plugins/router', 'durandal/app', 'api/datacontext'], function (router, app, ctx) {

  var games = ko.observableArray(),
    activeGame = ko.observable();

  var username = 'ali';
  function getPlayer(players) {
    if (players[0].username === username) return players[0];
    return players[1];
  }

  function getOpponent(playes) {
    if (playes.length == 1) return null;
    if (playes[0].username !== username) return players[0];
    return players[1];
  }

  return {
    activate: function () {
      app.trigger("server:game:lobby", { username: username }, function (data) {
        if (!data || !data.success) {
          return;
        }
        games(data.games);
        app.loading(false);
      });
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
    select: function (game, e) {
      activeGame(game);
    },
    activeGame: activeGame,
    binding: function () {
      return { cacheViews: false };
    }
  }
});