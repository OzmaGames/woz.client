define(['durandal/app', 'api/constants', 'const/DIALOGS', 'api/model/Path'], function (app, consts, DIALOGS, Path) {
  var entity = { "id": 864, "players": [{ "username": "ali", "score": 0, "active": true }], "gameOver": false, "tiles": [{ "id": 0, "x": 0.1, "y": 0.35, "imageName": "stream", "instruction": "Adjective", "description": "The phrase must contain (at least) one adjective", "bonus": 10, "mult": 0 }, { "id": 1, "x": 0.9, "y": 0.35, "imageName": "girl_in_white_dress", "instruction": "First letter: S", "description": "The phrase must contain (at least) one word that begins with S", "bonus": 10, "mult": 0 }, { "id": 2, "x": 0.4, "y": 0.85, "imageName": "golden_forest", "instruction": "Animal", "description": "The phrase must contain (at least) one word that represents an animal", "bonus": 0, "mult": 2 }], "paths": [{ "id": 1, "nWords": 3, "startTile": 2, "endTile": 1, "cw": true }, { "id": 3, "nWords": 4, "startTile": 0, "endTile": 2, "cw": false }, { "id": 2, "nWords": 5, "startTile": 2, "endTile": 1, "cw": false }, { "id": 0, "nWords": 0, "startTile": 0, "endTile": 1, "cw": true }], "words": [{ "id": 17, "angle": -3.7593988655135036, "x": 0.66, "y": 0.10304030562518166, "isRelated": false, "lemma": "deer", "points": 4 }, { "id": 12, "angle": -3.4063681517727673, "x": 0.21, "y": 0.10582611734513193, "isRelated": false, "lemma": "near", "points": 1 }, { "id": 18, "angle": -1.4734306372702122, "x": 0.75, "y": 0.09065341219073161, "isRelated": false, "lemma": "is", "points": 2 }, { "id": 8, "angle": -1.205036765895784, "x": 0.75, "y": -0.005974720227532089, "isRelated": false, "lemma": "those", "points": 1 }, { "id": 13, "angle": 2.648484369274229, "x": 0.30000000000000004, "y": 0.09659385376377032, "isRelated": false, "lemma": "until", "points": 4 }, { "id": 1, "angle": 2.1487802150659263, "x": 0.12, "y": -0.0012193915154784917, "isRelated": false, "lemma": "tell", "points": 4 }, { "id": 19, "angle": 0.41890177642926574, "x": 0.84, "y": 0.10237198378425091, "isRelated": false, "lemma": "the", "points": 1 }, { "id": 10, "angle": -4.26587772089988, "x": 0.03, "y": 0.10073526226216928, "isRelated": false, "lemma": "once", "points": 4 }, { "id": 15, "angle": 0.4335586610250175, "x": 0.48, "y": 0.09012758530676365, "isRelated": false, "lemma": "spots", "points": 3 }, { "id": 3, "angle": 0.11435552965849638, "x": 0.30000000000000004, "y": 0.00413871304364875, "isRelated": false, "lemma": "share", "points": 3 }, { "id": 6, "angle": 4.282350090797991, "x": 0.5700000000000001, "y": -0.0017783761210739613, "isRelated": false, "lemma": "my", "points": 1 }, { "id": 11, "angle": 4.6806065598502755, "x": 0.12, "y": 0.10505832111695781, "isRelated": false, "lemma": "off", "points": 3 }, { "id": 16, "angle": 4.599650478921831, "x": 0.5700000000000001, "y": 0.09557405668077991, "isRelated": true, "lemma": "forest", "points": 1 }, { "id": 7, "angle": -0.7446857844479382, "x": 0.66, "y": -0.000411419621668756, "isRelated": false, "lemma": "something", "points": 2 }, { "id": 2, "angle": 2.2331691347062588, "x": 0.21, "y": -0.009482073495164514, "isRelated": false, "lemma": "wait", "points": 3 }, { "id": 9, "angle": 0.24570417124778032, "x": 0.84, "y": -0.0014767247764393688, "isRelated": false, "lemma": "better", "points": 1 }, { "id": 14, "angle": 2.116484788712114, "x": 0.39, "y": 0.10969814801588655, "isRelated": false, "lemma": "chest", "points": 0 }, { "id": 4, "angle": -1.8087744829244912, "x": 0.39, "y": 0.006773537730332464, "isRelated": false, "lemma": "were", "points": 3 }, { "id": 5, "angle": 4.207501553464681, "x": 0.48, "y": -0.003607121885288507, "isRelated": false, "lemma": "under", "points": 3 }, { "id": 0, "angle": 4.444658893626183, "x": 0.03, "y": -0.0062058544321917, "isRelated": false, "lemma": "care", "points": 2 }] };

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
          app.dialog.show("slipper-fixed", DIALOGS.YOUR_TURN_FIRST_ROUND);
        } else {
          player.active = ko.observable(player.active);
          app.dialog.show("slipper-fixed", DIALOGS.THEIR_TURN_FIRST_ROUND);
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
        //json.tiles[i].imageName = consts.getURL(json.tiles[i].imageName);
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
              app.dialog.show("slipper-fixed", DIALOGS.YOUR_TURN);
            } else {
              app.dialog.show("slipper-fixed", DIALOGS.THEIR_TURN);
            }
          }

          if (cplayer.username === model.player.username) {
            if (scored) app.dialog.show("alert", { content: "You scored <b>" + scored + "</b> points!" });

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
          app.dialog.close("slipper");
          var winner = model.winner(), data;
          if (winner === model.player) {
            data = DIALOGS.GAME_OVER_YOU_WON;
          } else if(winner === null){
            data = DIALOGS.GAME_OVER_SOLO_YOU_RESIGNED;
          } else {
            data = DIALOGS.GAME_OVER_THEY_WON;
          }
          data.content = $('<b/>', { text: data.content }).prepend('<br/>').html();
          app.dialog.show("notice", data);
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
      //app.trigger("server:game:queue", { username: username, password: 12345, playerCount: playerCount }, function () {
      //  model.loadingStatus("Waiting to pair up...");
      //});
    }, 2000);
    app.trigger("game:start", entity);
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