define('api/datacontext',
  ['durandal/system', 'plugins/router', 'durandal/app', 'api/constants', 'dialogs/_constants', 'api/model/Path',
     'api/context/lobby', 'api/context/user', 'api/context/shop'],
  function (system, router, app, consts, DIALOGS, Path, ctxLobby, ctxUser, ctxShop) {

      app.on("game:update").then(function (data) { app.trigger("game:update:ctx", data) });

      var model =
      {
          lobby: ctxLobby,
          user: ctxUser,
          shop: ctxShop,

          gameID: 0,

          player: { active: ko.observable() },
          players: ko.observableArray(),

          tiles: ko.observableArray(),
          paths: ko.observableArray(),
          words: ko.observableArray(),

          loading: ko.observable(null),
          loadingStatus: ko.observable(''),
          loadingBox: ko.observable(false),

          activeWord: ko.observable(null),
          activeWords: ko.observable(null),

          playerCount: 1,

          tickets: {
              swapWords: ko.observable(1),
              versions: ko.observable(1),
              addWords: ko.observable(1),
              reset: function (tickets) {
                  model.tickets.swapWords(tickets.swapWords);
                  model.tickets.addWords(tickets.addWords);
                  model.tickets.versions(tickets.versions);
              }
          },

          allowCircle: ko.observable(true)
      };
      model.collection = {
          name: ko.observable("woz"),
          size: ko.observable(30)
      };

      app.ctx = model;

      model.username = localStorage.getItem("username");
      model.token = localStorage.getItem("token");
      model.auth = $.Deferred(function (dfd) {
          app.trigger("server:user:info", { targetUsername: model.username }, function (json) {
              if (json.success) {
                  app.trigger("user:authenticated", { username: model.username, online: 1 });
                  dfd.resolve();
              } else {
                  var next = location.hash.substr(1);
                  //if (next != "" && !next.match(/login/ig) && next.indexOf('/') == -1) {
                  //    app.navigate('login/' + next);
                  //} else {
                  //    app.navigate('login');
                  //}
                  model.logout();
                  dfd.reject();
              }

              app.on('access:forbidden', function (eventName) {
                  //console.log('access forbidden called');
                  model.auth = $.Deferred(function (dfd) { dfd.reject() }).promise();
                  app.navigate('account/logout');
              });
          });
      }).promise();

      model.logout = function () {
        app.dialog.closeAll();
              
          model.auth = $.Deferred(function (dfd) {
              dfd.reject();

              app.loading(false);
              model.loading(false);
              model.token = null;
              localStorage.removeItem("token");
              app.navigate('', { replace: true, trigger: true });
              history.replaceState({}, '', location.origin);
              //console.log('redirecting to login');

              //TODO: remove the following if you want to deply to web
              //window.location = 'http://' + location.host;

          }).promise();
      }

      app.on('toContext:account:login', function (res) {
          model.auth = $.Deferred(function (dfd) {
              if (res.success) {
                  model.username = res.username;
                  model.token = res.token;

                  sessionStorage.removeItem("lobby");
                  localStorage.setItem("username", model.username);
                  localStorage.setItem("token", model.token);

                  dfd.resolve();
              } else {
                  dfd.reject();
              }
          }).promise();
      });

      model._gameOver = ko.observable(false);
      model.gameOver = ko.computed(function () {
          var completedPaths = ko.utils.arrayFilter(this.paths(), function (path) {
              return path.phrase.complete() === true;
          });
          if (completedPaths.length !== 0 && completedPaths.length === this.paths().length) return true;
          return this._gameOver();
      }, model);

      model.mode = ko.observable(''); //swap;
      model.words.immovable = ko.computed(function () { return model.mode() === 'swapWords'; });
      model.tutorialMode = ko.observable(false);
      model.tutorialObject = ko.observable();

      app.on("lobby:changed", function (game) {
          if (game.gameID == model.gameID) {
              var hasUnknown = ko.utils.arrayFirst(ctx.players(), function (p) { return p.username == 'unknown'; });
              if (hasUnknown) {
                  var oponent = ko.utils.arrayFirst(game.players, function (p) { return p.username != model.username; });
                  if (oponent) {
                      app.trigger("game:random-player:update", oponent.username);
                  }
              }
          }
      });

      app.on("game:random-player:update", function (username) {
          for (var i = 0, player; player = model.players()[i++];) {
              if (player.username == 'unknown') {
                  player.username = username;
                  ctx.players.splice(i - 1, 1);
                  ctx.players.splice(i - 1, 0, player);
              }
          }
      });

      model.load = function (id) {
          var loadingSound = app.Sound.play(app.Sound.sounds.game.loading);
          //console.log("loading game..");
          app.off("game:start game:update:ctx game:swap-words");
          model.loading(true);
          app.dialog.show("loading");

          if (id === "" || id === undefined) id = -1;

          if (location.hash.match(/tutorial/ig)) {
              model.tutorialMode(true);
              if (id.toString().toLowerCase() == "next") {
                  id = +localStorage.getItem("tutorial-index") + 1;
              } else if (id.toString().toLowerCase() == "new") {
                  id = +localStorage.getItem("tutorial-index");
                  if (id >= 5) id = 0;
              }
              id = isNaN(id) ? 0 : id * 1;

              var obj = model.tutorialObject();
              if (obj) {
                  obj.title = "";
                  obj.description = "";
              }
          }
          else {
              model.tutorialMode(false);
              id = isNaN(id) ? -1 : id * 1;
          }

          model.activeWord(null);
          model.activeWords(null);

          var gamestartedDFD = $.Deferred();

          app.on("game:start", function (json) {
              if (json.success == false) return;
              app.Sound.fade(loadingSound);

              app.Sound.play(app.Sound.sounds.game.unfolding);
              if (model.tutorialMode()) {
                  history.replaceState(null, "", "#tutorial/" + json.id);
                  //router.navigate( 'tutorial/' + json.id, { trigger: false, replace: true } );

                  json.skip = function () {
                      app.dialog.show("confirm", {
                          modal: true,
                          content: 'Do you want to skip all tutorials?',
                          doneText: 'YES',
                          cancelText: 'NO'
                      }).then(function (result) {
                          if (result == "done") {
                              app.trigger("server:tutorial:skip", { username: model.username });
                              app.navigate("newGame");
                          }
                      });
                  }
                  json.description = json.description.replace('<b>select tool</b>', '<b>select tool </b><i class="action circleWords inline"></i>');
                  model.tutorialObject(json);
                  localStorage.setItem("tutorial-index", json.id);

              } else {
                  history.replaceState(null, "", "#game/" + json.id);
                  //router.navigate( 'game/' + json.id, { trigger: false, replace: true } );
              }

              model.loadingStatus("Starting The Game...");

              model.gameID = json.id;
              model.playerCount = json.playerCount;
              model.collection.name((json.collection && json.collection.shortName) ? json.collection.shortName : "woz");
              model.collection.size((json.collection && json.collection.size) ? json.collection.size : 30);

              model.resumedGame = json.resumedGame || false;

              ko.utils.arrayForEach(json.players, function (player) {
                  if (player.username === model.username) {
                      model.player.active(player.active);
                      player.active = model.player.active;
                  } else {
                      player.active = ko.observable(player.active);
                  }
                  player.resigned = ko.observable(player.resigned || false);
                  player.score = ko.observable(player.score);
              });

              model.player = find(json.players, { username: model.username });
              model.players(json.players);

              if (model.playerCount > 1 && !json.over) {
                  if (model.players().length == 1) {
                      model.players.unshift({
                          active: ko.observable(false),
                          resigned: ko.observable(false),
                          score: ko.observable(0),
                          username: 'unknown'
                      });
                  }
                  var dialogData;
                  if (model.player.active())
                      dialogData = DIALOGS.YOUR_TURN_FIRST_ROUND;
                  else
                      dialogData = DIALOGS.THEIR_TURN;

                  var tmp = app.on("game:started:ready").then(function () {
                      if (location.hash.match(/#game/ig)) {
                          app.dialog.show("slipper-fixed", dialogData);
                      }
                      tmp.off();
                  });
              }

              if (json.allowCircle == undefined) json.allowCircle = true;
              if (json.tickets == undefined) {
                  json.tickets = {
                      swapWords: json.swapWord,
                      versions: json.version,
                      addWords: json.addWord,
                  }
              }
              model.tickets.reset(json.tickets);
              model.allowCircle(json.allowCircle);

              ko.utils.arrayForEach(json.words, function (word) {
                  word.isSelected = ko.observable(false);
                  word.css = "";
                  if (ko.utils.arrayFilter(json.words, function (w) { return word.id === w.id }).length > 1) {
                      word.isPlayed = true;
                  }
              });
              model.words(json.words);

              for (var i = 0; i < json.tiles.length; i++) {
                  json.tiles[i].imageId = json.tiles[i].imageID;
                  json.tiles[i].imageName = consts.bigImageURL(model.collection.name(), json.tiles[i].imageId);
                  json.tiles[i].info = (json.tiles[i].bonus !== 0 ? '+' + json.tiles[i].bonus : 'X' + json.tiles[i].mult);
                  json.tiles[i].active = ko.observable(false);
              }
              model.tiles(json.tiles);

              //alert( json.paths[0].nWords );
              //json.paths[0].nWords = 0;
              json.paths = ko.utils.arrayMap(json.paths, function (p) {
                  return new Path(model, p.id, p.nWords, p.startTile, p.endTile, p.cw, p.phrase);
              });
              model.paths(json.paths);

              model._gameOver(json.over);

              model.winner = function () {
                  if (model.gameOver()) {
                      var maxScore = -1, winner = null;
                      ko.utils.arrayForEach(model.players(), function (player) {
                          if (maxScore < player.score() && !player.resigned()) {
                              winner = player;
                              maxScore = player.score();
                          }
                      });
                      return winner;
                  }
                  return null;
              };

              model.loading(false);
              model.loadingStatus("Ready");
              app.dialog.close("loading");
              app.trigger("game:started", json);
              gamestartedDFD.resolve();
          });

          app.on("game:update:ctx", function (json) {
              app.loading(false);

              if (!json.success && json.gameID == model.gameID) {
                  app.dialog.show("alert", { content: "Your phrase has been rejected by the server." });
                  ctx.lastPath.removeAll();
                  ctx.player.active(true);
              }

              if (json.success && json.gameID == model.gameID) {

                  if (json.allowCircle == undefined) json.allowCircle = true;
                  if (json.tickets == undefined) {
                      json.tickets = {
                          swapWords: json.swapWord === undefined ? 1 : json.swapWord,
                          versions: json.version === undefined ? 1 : json.version,
                          addWords: json.addWord === undefined ? 1 : json.addWord,
                      }
                  }
                  model.tickets.reset(json.tickets);
                  model.allowCircle(json.allowCircle);

                  model._gameOver(json.over || false);
                  if (model.gameOver()) {
                      app.dialog.closeAll();

                      var dfd = $.Deferred(function (dfd) {
                          system.acquire("dialogs/pages/GameOver").then(function (module) {
                              var winner = model.winner(), data;
                              if (winner === model.player) {
                                  if (model.playerCount == 1) {
                                      data = module.SOLO();
                                  } else {
                                      data = module.WON();
                                  }
                              } else {
                                  data = module.LOST();
                              }
                              if (model.player.resigned()) {
                                  app.navigate("lobby");
                                  return;
                              } else if (model.players()[0].resigned() || (model.playerCount == 2 && model.players()[1].resigned())) {
                                  data = module.RESIGNED();
                              }

                              dfd.resolve(data);
                          });
                      });

                      var sub;
                      sub = app.on("game:score:done").then(function () {
                          dfd.then(function (data) {
                              app.trigger("game:tiles:visible", false);

                              //if someone resignes, then stats is null
                              json.stats = json.stats || {
                                  xp: -1,
                                  levelUp: false
                              };

                              data.xp = json.stats.xp;

                              app.dialog.showProfileNoOverlay(ctx.player.username);
                              app.dialog.show("notice", { model: data, view: 'dialogs/pages/GameOver', closeOnClick: false }).then(function (nextStepFunc) {
                                  if (json.stats.levelUp) {
                                      if (json.stats.title) {
                                          json.stats.imageName = 'images/game/level/' + json.stats.title.toLowerCase() + '.png';
                                          app.Sound.play(app.Sound.sounds.game.levelUpTitle);
                                      } else {
                                          app.Sound.play(app.Sound.sounds.game.levelUp);
                                      }

                                      app.dialog.show("notice", {
                                          model: json.stats, view: json.stats.title ? 'dialogs/pages/LevelUpTitle' : 'dialogs/pages/LevelUp'
                                      }).then(function () {
                                          app.dialog.close('slipper-profile');
                                          if (typeof nextStepFunc == 'function') {
                                              nextStepFunc();
                                          } else {
                                              app.dialog.show("menu");
                                          }
                                      });
                                  } else {
                                      app.dialog.close('slipper-profile');
                                      if (typeof nextStepFunc == 'function') {
                                          nextStepFunc();
                                      } else {
                                          app.dialog.show("menu");
                                      }
                                  }
                              });
                              sub.off();

                              app.Sound.play(
                                  data.stats == 'won' ? app.Sound.sounds.game.overWin :
                                  data.stats == 'lost' ? app.Sound.sounds.game.overLose :
                                  app.Sound.sounds.game.overResigned
                              );
                          });
                      });

                  }

                  var waitingForStars = false;
                  for (var i = 0; i < json.players.length; i++) {
                      var jplayer = json.players[i];
                      var cplayer = find(model.players(), { username: jplayer.username });
                      if (!cplayer) {
                          app.trigger("game:random-player:update", jplayer.username);
                      }
                      var scored = jplayer.score - cplayer.score();

                      cplayer.scored = scored;
                      cplayer.score(jplayer.score);
                      cplayer.active(jplayer.active);
                      cplayer.resigned(jplayer.resigned || false);

                      if (cplayer.username === model.player.username && scored) {
                          waitingForStars = true;
                          (function (scored) {
                              var sub;
                              sub = app.on("game:stars:done").then(function () {
                                  app.Sound.play(app.Sound.sounds.scoring.message);
                                  app.dialog.show("alert", {
                                      content: "You scored <b>" + scored + "</b> points!",
                                      delay: 3000
                                  }).then(function () {
                                      app.trigger("game:score:done");
                                  });

                                  sub.off();
                              });
                          })(scored)
                      }
                  }

                  if (!waitingForStars && model.gameOver()) {
                      app.trigger("game:score:done");
                  }

                  if (json.path) {
                      var path = ko.utils.arrayFirst(model.paths(), function (path) { return path.id == json.path.id });
                      path.phrase.update(json.path.phrase);
                      path.phrase.id = json.path.phraseID;
                  }

                  if (json.words) {
                      for (var j = 0; j < json.words.length; j++) {
                          json.words[j].isSelected = ko.observable(false);
                          json.words[j].css = "";
                          model.words.push(json.words[j]);
                      }
                  }

                  if (model.playerCount > 1 && !model.gameOver() && location.hash.match(/#game/ig)) {
                      if (model.player.active())
                          app.dialog.show("slipper-fixed", DIALOGS.YOUR_TURN);
                      else
                          app.dialog.show("slipper-fixed", DIALOGS.THEIR_TURN);
                  }

                  model.players.valueHasMutated();

                  app.trigger("game:updated", json);
              }

          });

          app.on("game:swap-words", function (json) {
              if (json.success && json.words) {
                  for (var j = 0; j < json.oldWords.length; j++) {
                      var word = ko.utils.arrayFirst(model.words(), function (w) { return w.id === json.oldWords[j]; });
                      model.words.remove(word);
                  }
                  for (var j = 0; j < json.words.length; j++) {
                      json.words[j].isSelected = ko.observable(false);
                      json.words[j].css = json.words[j].css || "";
                      model.words.push(json.words[j]);
                  }
              }
          });

          model.loadingStatus("Waiting for the server...");

          if (model.tutorialMode()) {
              model.loadingStatus("Gathering learning materials...");
              app.trigger("server:tutorial:start", { username: model.username, level: id });
          } else {
              if (id >= 0) {
                  model.loadingStatus("Waiting for awesomeness...");
                  app.trigger("server:game:resume", { username: model.username, id: id });
              } else {
                  app.trigger("server:game:queue", {
                      username: model.username,
                      playerCount: model.playerCount,
                      friendUsername: model.friendUsername,
                      collection: model.collection.name() || 'woz'
                  }, function () {
                      model.loadingStatus("Waiting for awesomeness...");
                  });
              }
          }

          return gamestartedDFD.promise();
      };

      model.unload = function () {
          model._gameOver(false);
          app.off("game:start game:update:ctx game:swap-words");
          model.words.removeAll();
          var paths = ctx.paths();
          for (var i = 0; i < paths.length; i++) {
              paths[i].dispose();
          }
          model.paths.removeAll();
          model.tiles.removeAll();
      }

      model.playedWords = ko.computed(function () {
          return ko.utils.arrayFilter(model.words(), function (word) { return (word.isPlayed || false); });
      });

      model.unplayedWords = ko.computed(function () {
          return ko.utils.arrayFilter(model.words(), function (word) { return !(word.isPlayed || false); });
      });

      model.selectedWords = ko.computed(function () {
          return ko.utils.arrayFilter(model.words(), function (word) { return word.isSelected(); });
      });

      return window.ctx = model;

      function find(arr, data) {
          for (var i = 0; i < arr.length; i++)
              if (match(arr[i], data)) return arr[i];

          function match(item, data) {
              for (var key in data)
                  if (item[key] !== data[key]) return false;
              return true;
          }
      }
  });