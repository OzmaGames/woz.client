define(['plugins/router', 'durandal/app', 'api/datacontext'], function (router, app, ctx) {

  var games = [
    {
      players: [{ username: 'bobbisan', score: 240 }, { username: 'CrainFuzzrain', score: 210 }],
      collection: {
        name: 'Nightfall',
        short: 'nf'
      },
      startDate: 'Sep 24 13:14',
      timeAgo: '30m',
      unreads: 1,
      lastPhrase: {
        username: 'CrainFuzzrain',
        phrase: "bitter with decoy",
        score: 9
      }
    },
    {
      players: [{ username: 'bobbisan', score: 0 }, { username: 'Ali', score: 20 }],
      collection: {
        name: 'Life Of Color',
        short: 'loc'
      },
      startDate: 'Sep 24 13:14',
      timeAgo: '2h',
      unreads: 5,
      lastPhrase: {
        username: 'Ali',
        phrase: "this is working",
        score: 20
      }
    },
    {
      players: [{ username: 'bobbisan', score: 25 }, { username: 'Pedro', score: 0 }],
      collection: {
        name: 'Words Of Oz',
        short: 'woz'
      },
      startDate: 'Sep 24 13:14',
      timeAgo: '2d',
      unreads: 5,
      lastPhrase: {
        username: 'bobbisan',
        phrase: "we need server support now ad ad adasd af asfasf asf asf",
        score: 25
      }
    }
  ];

  var activeGame = ko.observable(games[0]);

  return {
    lobby: [
      {
        title: 'My Turn',
        games: ko.computed(function () {
          return ko.utils.arrayFilter(games, function (g) {
            return g.lastPhrase.username != 'bobbisan'
          })
        })
      },
        {
          title: 'Their Turn',
          games: ko.computed(function () {
            return ko.utils.arrayFilter(games, function (g) {
              return g.lastPhrase.username == 'bobbisan'
            })
          })
        }
    ],
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