define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   var res = {
      playedWith: 'Played with {{opponent}} - Using {{collection}} collection',
      playedSolo: 'Played solo - Using {{collection}} collection',
      gameEnded: 'Game ended {{lastMod, date}}',
      gameStarted: 'Game started {{lastMod, date}}',
      phrasePlaced: '{{lastPlayer}} placed: {{lastPhrase}} for {{lastScore}} points',
      noPhrase: 'has not been played yet',
      playerScored: '{{winner}} scored {{winnerScore}} points.',
      playerWon: '{{winner}} won the game with {{winnerScore}} over {{loserScore}} points.'
   }

   var augment = {
      collection: function (g, style) {
         return $("<span/>", { 'class': 'collection', text: g.collection }).get(0).outerHTML;
      },
      opponent: function (g, style) {
         return $("<span/>", { 'class': 'bold', text: getOpponent(g).username }).get(0).outerHTML;
      },
      lastMod: function (g, style) {
         if (style == "date") {
            var el = $("<span/>", { 'class': 'date' });
            ko.bindingHandlers.date.init(el, function () { return g.lastMod; });
            return el.get(0).outerHTML;
         }
      },
      lastPlayer: function (g, style) {
         return g.lastPhrase.username == ctx.username ? 'You' :
            $("<span/>", { 'class': 'bold', text: g.lastPhrase.username }).get(0).outerHTML;
      },
      lastPhrase: function (g, style) {
         return $("<span/>", { 'class': 'phrase', text: g.lastPhrase.phrase }).get(0).outerHTML;
      },
      lastScore: function (g, style) {
         return $("<span/>", { 'class': 'point', text: g.lastPhrase.score }).get(0).outerHTML;
      },
      winner: function (g, style) {
         var winner = getWinner(g);
         if (winner.username == ctx.username) return 'You';
         return $("<span/>", { 'class': 'bold', text: winner.username }).get(0).outerHTML;
      },
      winnerScore: function (g, style) {
         var winner = getWinner(g);
         return $("<span/>", { 'class': 'point', text: winner.score }).get(0).outerHTML;
      },
      loserScore: function (g, style) {
         var loser = getLoser(g);
         return $("<span/>", { 'class': 'point', text: loser.score }).get(0).outerHTML;
      }
   }

   function load(event, gameMode) {
      return $.Deferred(function (dfd) {
         app.trigger(event, { username: ctx.username }, function (data) {
            if (data.success) {
               data.games.sort(function (a, b) { return b.lastMod - a.lastMod; });
               ko.utils.arrayForEach(data.games, function (g) {
                  g.gameOver = gameMode == "archive";

                  g.summary = [
                     g.players.length > 1 ? resolveRes(res.playedWith, g) : resolveRes(res.playedSolo, g),
                     g.gameOver ? resolveRes(res.gameEnded, g) : resolveRes(res.gameStarted, g),
                     g.gameOver ?
                        g.players.length > 1 ? resolveRes(res.playerWon, g) : resolveRes(res.playerScored, g) :
                        g.lastPhrase.username ? resolveRes(res.phrasePlaced, g) : resolveRes(res.noPhrase, g)
                  ];
               });
               dfd.resolve(data.games);
            }
         });
      });
   }

   function getPlayer(game) {
      return game.players[0].username === ctx.username ? game.players[0] : game.players[1];
   }

   function getOpponent(game) {
      return game.players[0].username === ctx.username ? game.players[1] : game.players[0];
   }

   function getWinner(game) {
      return game.players.length == 1 ? game.players[0] :
         game.players[0].score > game.players[1].score ? game.players[0] : game.players[1];
   }

   function getLoser(game) {
      return game.players.length == 1 ? game.players[0] :
         game.players[0].score > game.players[1].score ? game.players[1] : game.players[0];
   }

   function resolveRes(str, g) {
      return str.replace(/\{\{([a-z]*),?\s*([a-z]*)\}\}/gi, function (match, key, style, index, str) {
         return augment[key](g, style);
      });
   }

   function Games() {
      this.games = ko.observableArray();
      this.activeGame = ko.observable();
      this.type = ko.observable();

      this.loadGames = function () {
         var base = this;
         return load("server:game:lobby", "ongoing").then(function (games) {
            base.games(games)
            base.message("You can have up to 10 ongoing games at the time. <a>Get more space</a>!");
            base.list(base.ongoing);
            base.type("ongoing");
         });
      }

      this.loadArchive = function () {
         var base = this;
         return load("server:game:archive", "archive").then(function (games) {
            base.games(games);
            base.message("Your archive have room for 10 games right now. <a>Get more space</a>!");
            base.list(base.archive);
            base.type("archive");
         });
      }

      var base = this;

      this.list = ko.observableArray();
      this.ongoing = [
           {
              title: 'My Turn',
              empty: 'You have no ongoing games where it\'s your turn.',
              games: ko.computed(function () {
                 return ko.utils.arrayFilter(base.games(), function (g) {
                    return getPlayer(g).active;
                 })
              })
           }, {
              title: 'Their Turn',
              empty: 'You have no ongoing games where it\'s your opponents turn.',
              games: ko.computed(function () {
                 return ko.utils.arrayFilter(base.games(), function (g) {
                    return !getPlayer(g).active;
                 })
              })
           }
      ];

      this.archive = [
            {
               title: 'two player',
               empty: 'You have not finished any game.',
               games: ko.computed(function () {
                  return ko.utils.arrayFilter(base.games(), function (g) {
                     return g.players.length == 2;
                  })
               })
            }, {
               title: 'Single player',
               empty: 'You have not finished any game.',
               games: ko.computed(function () {
                  return ko.utils.arrayFilter(base.games(), function (g) {
                     return g.players.length == 1;
                  })
               })
            }
      ]

      this.selectGame = function (game) {
         base.activeGame(game);
         app.navigate("game/" + game.gameID);
      }

      this.resign = function (game) {
         var base = this;
         app.dialog.show("confirm", {
            content: "Are you sure you want to delete this game?", modal: true,
            doneText: 'YES', cancelText: 'NO'
         }).then(function (res) {
            if (res != "cancel") {               
               base.games.remove(game);

               app.trigger("server:game:resign", {
                  username: ctx.username,
                  gameID: game.gameID,
               }, function () {
                  //base.games.remove(game);
               });
            }
         });
      }

      this.message = ko.observable();
   }

   return new Games();
});