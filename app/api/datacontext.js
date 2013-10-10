define(['durandal/app', 'api/constants', 'const/DIALOGS', 'api/model/Path'], function (app, consts, DIALOGS, Path) {
  var entity = { "id": 236, "players": [{ "username": "ali", "score": 0, "active": true }], "gameOver": false, "tiles": [{ "id": 2, "x": 0.4, "y": 0.85, "imageName": "stream", "instruction": "Color", "bonus": 0, "mult": 2 }, { "id": 1, "x": 0.9, "y": 0.35, "imageName": "couple", "instruction": "Feeling", "bonus": 40, "mult": 0 }, { "id": 0, "x": 0.1, "y": 0.35, "imageName": "girl_in_white_dress", "instruction": "First letter: S", "bonus": 10, "mult": 0 }], "paths": [{ "id": 1, "nWords": 3, "startTile": 2, "endTile": 1, "cw": true }, { "id": 0, "nWords": 0, "startTile": 0, "endTile": 1, "cw": true }, { "id": 3, "nWords": 4, "startTile": 0, "endTile": 2, "cw": false }, { "id": 2, "nWords": 0, "startTile": 2, "endTile": 1, "cw": false }], "words": [{ "id": 4, "angle": -2.4890747712925076, "x": 0.39, "y": 0.003343725830782205, "isRelated": false, "lemma": "know", "points": 4 }, { "id": 12, "angle": 4.855778703931719, "x": 0.21, "y": 0.09589990348787979, "isRelated": false, "lemma": "with", "points": 2 }, { "id": 7, "angle": -2.4682276509702206, "x": 0.66, "y": -0.007052935170941055, "isRelated": false, "lemma": "each", "points": 1 }, { "id": 17, "angle": 4.709716886281967, "x": 0.66, "y": 0.09448966444004328, "isRelated": true, "lemma": "girl", "points": 1 }, { "id": 19, "angle": -0.23343893699347973, "x": 0.84, "y": 0.1046301837451756, "isRelated": false, "lemma": "oh", "points": 1 }, { "id": 14, "angle": 1.87691809842363, "x": 0.39, "y": 0.09287928053643554, "isRelated": true, "lemma": "youth", "points": 3 }, { "id": 0, "angle": 1.6466690693050623, "x": 0.03, "y": 0.000015345604624599217, "isRelated": false, "lemma": "hurt", "points": 1 }, { "id": 18, "angle": -4.867282954510301, "x": 0.75, "y": 0.09992109081009404, "isRelated": false, "lemma": "a", "points": 3 }, { "id": 11, "angle": 4.181145133916289, "x": 0.12, "y": 0.10506282772636041, "isRelated": false, "lemma": "around", "points": 1 }, { "id": 1, "angle": 4.117214216385037, "x": 0.12, "y": -0.009585593082010747, "isRelated": false, "lemma": "felt", "points": 3 }, { "id": 6, "angle": 4.663377797696739, "x": 0.5700000000000001, "y": 0.009682223065756262, "isRelated": false, "lemma": "which", "points": 3 }, { "id": 2, "angle": -1.1340026301331818, "x": 0.21, "y": -0.005864166335668415, "isRelated": false, "lemma": "say", "points": 1 }, { "id": 5, "angle": 3.7477757944725454, "x": 0.48, "y": 0.00022682620445266366, "isRelated": false, "lemma": "rather", "points": 4 }, { "id": 10, "angle": 2.1617804397828877, "x": 0.03, "y": 0.10985446009552106, "isRelated": false, "lemma": "most", "points": 2 }, { "id": 15, "angle": 0.19423096207901835, "x": 0.48, "y": 0.09967015598202125, "isRelated": false, "lemma": "haze", "points": 1 }, { "id": 9, "angle": -0.7203417737036943, "x": 0.84, "y": -0.002250864589586854, "isRelated": false, "lemma": "mere", "points": 2 }, { "id": 8, "angle": 1.9881664728745818, "x": 0.75, "y": 0.005816076390910894, "isRelated": false, "lemma": "blue", "points": 2 }, { "id": 13, "angle": 2.1646230202168226, "x": 0.30000000000000004, "y": 0.10688139397650957, "isRelated": false, "lemma": "than", "points": 1 }, { "id": 3, "angle": -2.371837324462831, "x": 0.30000000000000004, "y": -0.008298882383387536, "isRelated": false, "lemma": "hope", "points": 3 }, { "id": 16, "angle": 3.146291032899171, "x": 0.5700000000000001, "y": 0.10912946958560497, "isRelated": false, "lemma": "bear", "points": 0 }] };

  var username = 'ali';

  app.on('account:login', function (res) {
    if (res.success) username = res.username;
  });

  var model =
  {
    gameID: 0,

    player: { active: ko.observable() },
    players: ko.observableArray([]),
    
    words: ko.observableArray([]),
    tiles: ko.observableArray([]),

    paths: ko.observableArray([]),

    loading: ko.observable(null),
    loadingStatus: ko.observable(''),

    activeWord: ko.observable(null),
    activeWords: ko.observable(null),

    playerCount: 1
  };
  model._gameOver = ko.observable(false);
  model.gameOver = ko.computed(function () {
    var completedPaths = ko.utils.arrayFilter(this.paths(), function (path) {
      return path.phrase.complete() === true;
    });
    if (completedPaths.length !== 0 && completedPaths.length === this.paths().length) return true;
    return this._gameOver();
  }, model);

  model.mode = ko.observable(''); //swap;
  model.words.immovable = ko.computed(function () { return model.mode() === 'swap'; });

  model.load = function (playerCount) {

    model.loading(true);

    app.on("game:start", function (json) {

      model.loadingStatus("Starting The Game...");

      model.gameID = json.id;

      ko.utils.arrayForEach(json.players, function (player) {
        if (player.username === username) {
          model.player.active(player.active);
          player.active = model.player.active;
          player.tickets = {
            swap: 1
          };
          app.woz.dialog.show("slipper", DIALOGS.YOUR_TURN_FIRST_ROUND);
        } else {
          player.active = ko.observable(player.active);
          app.woz.dialog.show("slipper", DIALOGS.THEIR_TURN_FIRST_ROUND);
        }
        player.resigned = ko.observable(player.resigned || false);
        player.score = ko.observable(player.score);
      });

      model.player = find(json.players, { username: username });
      model.players(json.players);

      ko.utils.arrayForEach(json.words, function (word) {
        word.isSelected = ko.observable(false);
        if (ko.utils.arrayFilter(json.words, function (w) { return word.id === w.id }).length > 1) {
          word.isPlayed = true;
        }
      });
      model.words(json.words);

      for (var i = 0; i < json.tiles.length; i++) {
        json.tiles[i].imageName = consts.getURL(json.tiles[i].imageName);
        json.tiles[i].info = (json.tiles[i].bonus !== 0 ? '+' + json.tiles[i].bonus : 'X' + json.tiles[i].mult);
        json.tiles[i].active = ko.observable(false);
      }
      model.tiles(json.tiles);

      json.paths = ko.utils.arrayMap(json.paths, function (p) {
        return new Path(model, p.id, p.nWords, p.startTile, p.endTile, p.cw, p.phrase);
      });
      model.paths(json.paths);

      model._gameOver(json.gameOver);



      model.winner = function () {
        if (model.gameOver()) {
          var maxScore = -1, winner = null;
          ko.utils.arrayForEach(this.players(), function (player) {
            if (maxScore < player.score() && !player.resigned()) {
              winner = player;
              maxScore = player.score();
            }
          });
          return winner;
        }
        return null;
      };

      model.loadingStatus("Ready");

      setTimeout(function () { model.loading(false); }, 100);
    });

    app.on("game:update", function (json) {
      app.loading(false);
      if (json.success) {
        for (var i = 0; i < json.playerInfo.length; i++) {
          var jplayer = json.playerInfo[i];
          var cplayer = find(model.players(), { username: jplayer.username });
          var scored = jplayer.score - cplayer.score();

          cplayer.score(jplayer.score);
          cplayer.active(jplayer.active);
          cplayer.resigned(jplayer.resigned || false);

          if (jplayer.active) {
            if (jplayer.username === model.player.username) {
              app.woz.dialog.show("slipper", DIALOGS.YOUR_TURN);
            } else {
              app.woz.dialog.show("slipper", DIALOGS.THEIR_TURN);
            }
          }

          if (cplayer.username === model.player.username) {
            if (scored) app.woz.dialog.show("alert", { content: "You scored <b>" + scored + "</b> points!" });

            if (json.words) {
              for (var j = 0; j < json.words.length; j++) {
                json.words[j].isSelected = ko.observable(false);
                model.words.push(json.words[j]);
              }
            }

          }
        }
        if (model.player.active()) {
          model.player.tickets.swap = 1;
        }

        model._gameOver(json.gameOver || false);
        if (model.gameOver()) {
          app.woz.dialog.close("slipper");
          var winner = model.winner(), data;
          if (winner === model.player) {
            data = DIALOGS.GAME_OVER_YOU_WON;
          } else if(winner === null){
            data = DIALOGS.GAME_OVER_SOLO_YOU_RESIGNED;
          } else {
            data = DIALOGS.GAME_OVER_THEY_WON;
          }
          data.content = $('<b/>', { text: data.content }).prepend('<br/>').html();
          app.woz.dialog.show("notice", data);
        }

        model.players.valueHasMutated();
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
          model.words.push(json.words[j]);
        }
      }
    });

    model.loadingStatus("Waiting for the server...");

    setTimeout(function () {
      app.trigger("server:game:queue", { username: username, password: 12345, playerCount: playerCount }, function () {
        model.loadingStatus("Waiting to pair up...");
      });
    }, 2000);
    //app.trigger("game:start", entity);
  };

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