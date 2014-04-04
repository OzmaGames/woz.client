define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   var archive = ko.observableArray();
   var onGoings = ko.observableArray();
   var notifications = ko.observableArray();

   ctx.games.subscribe(function (games) {
      notifications.removeAll();
      onGoings.removeAll();
      archive.removeAll();

      ko.utils.arrayForEach(games, function (g) {
         if (g.summary) {

         } else {
            g.playerCount = g.playerCount || g.players.length;
            if (g.playerCount > 1 && g.players.length == 1) {
               g.players.push({ username: 'unknown', active: !g.players[0].active, resigned: false, score: 0 });
            }
            g.resigned = g.players[0].resigned || (g.players.length > 1 && g.players[1].resigned);
            g.summary = getSummary(g);
            if (!g.resigned) {
               if (g.over) {
                  archive().push(g);
               } else {
                  onGoings().push(g);
               }
            }
            if (g.playerCount == 2) {
               if (g.over) {
                  notifications().push(getNotification(g));

                  //var gCopy = $.extend(true, {}, g);
                  //gCopy.modDate = gCopy.creationDate;
                  //gCopy.over = false;
                  //gCopy.resigned = false;
                  //notifications().push(getNotification(gCopy));
               }
            }
         }
      });

      notifications().sort(function (a, b) { return b.modDate - a.modDate; });

      onGoings.valueHasMutated();
      archive.valueHasMutated();
      notifications.valueHasMutated();
   });

   var res = {
      playedWith: 'Played with {{opponent}} - Using {{collection}} collection',
      playedSolo: 'Played solo - Using {{collection}} collection',
      gameEnded: 'Game ended {{modDate, date}}',
      gameStarted: 'Game started {{modDate, date}}',
      phrasePlaced: '{{lastPlayer}} placed: {{lastPhrase}} for {{lastScore}} points',
      noPhrase: 'has not been played yet',
      playerScored: '{{winner}} scored {{winnerScore}} points.',
      playerWon: '{{winner}} won the game with {{winnerScore}} over {{loserScore}} points.'
   }

   var augments = {
      collection: function (g, style) {
         return $("<span/>", { 'class': 'collection', text: g.collection }).get(0).outerHTML;
      },
      opponent: function (g, style) {
         return $("<span/>", { 'class': 'bold', text: getOpponent(g).username }).get(0).outerHTML;
      },
      modDate: function (g, style) {
         if (style == "date") {
            var el = $("<span/>", { 'class': 'date' });
            ko.bindingHandlers.date.init(el, function () { return g.modDate; });
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
      loser: function (g, style) {
         var loser = getLoser(g);
         if (loser.username == ctx.username) return 'You';
         return $("<span/>", { 'class': 'bold', text: loser.username }).get(0).outerHTML;
      },
      winnerScore: function (g, style) {
         var winner = getWinner(g);
         return $("<span/>", { 'class': 'point', text: winner.score }).get(0).outerHTML;
      },
      loserScore: function (g, style) {
         var loser = getLoser(g);
         return $("<span/>", { 'class': 'point', text: loser.score }).get(0).outerHTML;
      },
      player: function () {
         return $("<span/>", { 'class': 'bold', text: 'You' }).get(0).outerHTML;
      }
   }

   function getNotification(g) {
      var str = resolveRes("{{modDate, date}} ", g);
      if (g.resigned) {
         return str + resolveRes("{{loser}} resigned from your game.", g);
      } else {
         if (g.over) {
            if (getWinner(g).username == ctx.username) {
               return str + resolveRes('You won a game against {{opponent}}. Score: {{winnerScore}} over {{loserScore}} points.', g);
            } else {
               return str + resolveRes('You lost a game against {{opponent}}. Score: {{winnerScore}} over {{loserScore}} points.', g);
            }
         } else {
            return str + "A game has started.";
         }
      }
   }

   function getSummary(g) {
      return [
         g.playerCount > 1 ? resolveRes(res.playedWith, g) : resolveRes(res.playedSolo, g),
         g.over ? resolveRes(res.gameEnded, g) : resolveRes(res.gameStarted, g),
         g.over ?
            g.playerCount > 1 ? resolveRes(res.playerWon, g) : resolveRes(res.playerScored, g) :
            g.lastPhrase.username ? resolveRes(res.phrasePlaced, g) : resolveRes(res.noPhrase, g)
      ];
   }

   function getPlayer(game) {
      return game.players[0].username === ctx.username ? game.players[0] : game.players[1];
   }

   function getOpponent(game) {
      return game.players[0].username === ctx.username ? game.players[1] : game.players[0];
   }

   function getWinner(game) {
      return game.players.length == 1 ? game.players[0] :
         game.players[0].score > game.players[1].score && !game.players[0].resigned ? game.players[0] : game.players[1];
   }

   function getLoser(game) {
      return game.players.length == 1 ? game.players[0] :
         game.players[0].score > game.players[1].score && !game.players[0].resigned? game.players[1] : game.players[0];
   }

   function resolveRes(str, g) {
      return str.replace(/\{\{([a-z]*),?\s*([a-z]*)\}\}/gi, function (match, key, style, index, str) {
         return augments[key](g, style);
      });
   }

   function Games() {

      this.activeGame = ko.observable();
      this.type = ko.observable();
      this.notifications = notifications;

      var base = this;
      
      this.binding = function () {
         return { cacheViews: false };
      }

      this.detached = function () {
         console.log('detached');
      }

      this.loadNotification = function () {
         base.message("You can have up to 10 notification games at the time. <a>Get more space</a>!");
         base.type("notification");
      }

      this.loadOnGoing = function () {
         base.message("You can have up to 10 ongoing games at the time. <a>Get more space</a>!");
         base.list(base.ongoing);
         base.type("ongoing");
      }

      this.loadArchive = function () {
         base.message("Your archive have room for 10 games right now. <a>Get more space</a>!");
         base.list(base.archive);
         base.type("archive");
      }

      this.list = ko.observableArray();
      this.ongoing = [
           {
              title: 'My Turn',
              empty: 'You have no ongoing games where it\'s your turn.',
              games: ko.computed(function () {
                 return ko.utils.arrayFilter(onGoings(), function (g) {
                    return getPlayer(g).active;
                 })
              })
           }, {
              title: 'Their Turn',
              empty: 'You have no ongoing games where it\'s your opponents turn.',
              games: ko.computed(function () {
                 return ko.utils.arrayFilter(onGoings(), function (g) {
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
                  return ko.utils.arrayFilter(archive(), function (g) {
                     return g.players.length == 2;
                  })
               })
            }, {
               title: 'Single player',
               empty: 'You have not finished any game.',
               games: ko.computed(function () {
                  return ko.utils.arrayFilter(archive(), function (g) {
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
            doneText: 'Delete', cancelText: 'No'
         }).then(function (res) {
            if (res == "done") {
               ctx.games.remove(game);

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