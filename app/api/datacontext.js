define(['durandal/app', 'api/constants', 'api/model/Path'], function (app, consts, Path) {
  var entity = { "id": 62, "players": [{ "username": "ali", "score": 0, "active": true }], "gameOver": false, "tiles": [{ "id": 2, "x": 0.43993822231423113, "y": 0.8845929021248594, "imageID": 0, "imageName": "moon", "instruction": "Animal", "bonus": 0, "mult": 2 }, { "id": 1, "x": 0.8382714773062616, "y": 0.22801022497005757, "imageID": 1, "imageName": "goat", "instruction": "Color", "bonus": 0, "mult": 2 }, { "id": 0, "x": 0.14760901876725255, "y": 0.23710495643317697, "imageID": 2, "imageName": "frozen_cattai", "instruction": "First letter: R * 2", "bonus": 15, "mult": 0 }], "paths": [{ "id": 0, "nWords": 0, "startTile": 2, "endTile": 1, "cw": true }, { "id": 2, "nWords": 4, "startTile": 0, "endTile": 1, "cw": true }, { "id": 1, "nWords": 5, "startTile": 0, "endTile": 2, "cw": true }], "words": [{ "id": 17, "angle": 7.553277058526874, "x": 0.44706671014428134, "y": 0.496058055665344, "isRelated": false, "lemma": "when", "points": 0 }, { "id": 15, "angle": -4.637773255817592, "x": 0.4545704622752964, "y": 0.3054003214929253, "isRelated": false, "lemma": "than", "points": 1 }, { "id": 5, "angle": -20.333526792936027, "x": 0.24070624565938487, "y": 0.3854101828765124, "isRelated": false, "lemma": "fallen", "points": 3 }, { "id": 10, "angle": 14.294656636193395, "x": 0.7015428271377459, "y": 0.26688883325550705, "isRelated": false, "lemma": "our", "points": 4 }, { "id": 23, "angle": -7.543886444531381, "x": 0.3304653938161209, "y": 0.007981031900271773, "isRelated": false, "lemma": "are", "points": 1 }, { "id": 18, "angle": -0.9059076029807329, "x": 0.16618628076976164, "y": 0.18740970140788704, "isRelated": true, "lemma": "winter", "points": 0 }, { "id": 19, "angle": -21.451390463858843, "x": 0.10424689184874296, "y": 0.41166461224202067, "isRelated": false, "lemma": "wall", "points": 4 }, { "id": 14, "angle": -15.164917626418173, "x": 0.25928230688441545, "y": 0.49592204217333347, "isRelated": false, "lemma": "true", "points": 1 }, { "id": 24, "angle": 21.722650265321136, "x": 0.025516607263125476, "y": 0.15358795085921884, "isRelated": false, "lemma": "a", "points": 3 }, { "id": 9, "angle": 19.058700690977275, "x": 0.8573713526711799, "y": 0.2570310782175511, "isRelated": false, "lemma": "this", "points": 1 }, { "id": 22, "angle": -14.35429691337049, "x": 0.14048537210328504, "y": 0.1084639448672533, "isRelated": false, "lemma": "child", "points": 1 }, { "id": 2, "angle": -13.07545108627528, "x": 0.3917357131023891, "y": 0.3795041625853628, "isRelated": false, "lemma": "beach", "points": 3 }, { "id": 20, "angle": 19.63388666510582, "x": 0.8820536932209506, "y": 0.18018567853141576, "isRelated": false, "lemma": "deer", "points": 4 }, { "id": 6, "angle": -15.248865604400635, "x": 0.6223145339405164, "y": 0.309382603620179, "isRelated": false, "lemma": "can", "points": 4 }, { "id": 11, "angle": 10.481568219140172, "x": 0.20344329419312998, "y": 0.33284762944094837, "isRelated": false, "lemma": "high", "points": 2 }, { "id": 1, "angle": -4.724600832909346, "x": 0.45349328966112806, "y": 0.09873836860060692, "isRelated": false, "lemma": "stillness", "points": 3 }, { "id": 0, "angle": -11.93944638967514, "x": 0.5179809470195323, "y": 0.29453191673383117, "isRelated": false, "lemma": "freedom", "points": 1 }, { "id": 13, "angle": 8.9474832508713, "x": 0.5637847134610637, "y": 0.28310390817932785, "isRelated": false, "lemma": "these", "points": 0 }, { "id": 8, "angle": -17.689384745433927, "x": 0.7328529563033953, "y": 0.22677066759206355, "isRelated": false, "lemma": "no", "points": 3 }, { "id": 21, "angle": 12.949642459861934, "x": 0.49898531526559964, "y": 0.1994509322103113, "isRelated": false, "lemma": "neck", "points": 4 }, { "id": 16, "angle": -11.563277670182288, "x": 0.6667018179199659, "y": 0.13959915842860937, "isRelated": false, "lemma": "after", "points": 3 }, { "id": 4, "angle": 8.524152441881597, "x": 0.2801222835667431, "y": 0.41665184777230024, "isRelated": false, "lemma": "note", "points": 3 }, { "id": 12, "angle": 7.802403052337468, "x": 0.4177498383796774, "y": 0.1112453662790358, "isRelated": false, "lemma": "evening", "points": 3 }, { "id": 7, "angle": -15.60585882421583, "x": 0.8982782865874469, "y": 0.1712717809714377, "isRelated": false, "lemma": "woke", "points": 1 }, { "id": 3, "angle": 3.5747553212568164, "x": 0.09429505092557519, "y": 0.26460135425440967, "isRelated": false, "lemma": "told", "points": 3 }] };

  var username = 'ali';

  app.on('account:login', function (res) {
    if (res.success) username = res.username;
  });

  var model =
  {
    gameID: 0,
    players: ko.observableArray([]),

    gameOver: ko.observable(false),

    words: ko.observableArray([]),
    tiles: ko.observableArray([]),

    paths: ko.observableArray([]),

    loading: ko.observable(null),
    loadingStatus: ko.observable(''),

    activeWord: ko.observable(null),
    activeWords: ko.observable(null)
  };

  model.load = function (playerCount) {

    model.loading(true);

    app.on("game:start", function (json) {

      model.loadingStatus("Starting The Game...");

      model.gameID = json.id;

      ko.utils.arrayForEach(json.players, function (player) {
        player.active = ko.observable(player.active);
        player.score = ko.observable(player.score);
      })
      model.player = find(json.players, { username: username });
      model.players(json.players);

      model.words(json.words);

      for (var i = 0; i < json.tiles.length; i++) { 
        json.tiles[i].imageName = consts.getURL(json.tiles[i].imageName);
        
      }
      model.tiles(json.tiles);

      json.paths = ko.utils.arrayMap(json.paths, function (p) {
        return new Path(model, p.id, p.nWords, p.startTile, p.endTile, p.cw, p.phrase);
      });
      model.paths(json.paths);

      model.gameOver(json.gameOver);
      
      model.loadingStatus("Ready");

      setTimeout(function () { model.loading(false); }, 10);
    });

    app.on("game:update", function (json) {
      app.loading(false);
      if (json.success) {
        find(model.players(), { username: json.active }).active(true);        
        for (var i = 0; i < json.playerInfo.length; i++) {
          var player = json.playerInfo[i];
          if (player.username == model.player.username) {
            var score = player.score - model.players.score;
            app.trigger("alert:show", "You scored " + score + "!");
          }
          find(model.players(), { username: player.username }).score(player.score);
        }
        model.player.score(model.player.score() + json.score);
        model.players.valueHasMutated();
      }
    });

    model.loadingStatus("Waiting for server...");
    app.trigger("server:game:queue", { username: username, password: 12345, playerCount: playerCount });

    //app.trigger("game:start", entity);
  }

  model.playedWords = ko.computed(function () {
    return ko.utils.arrayFilter(model.words(), function (word) { return (word.isPlayed || false); });
  });

  model.unplayedWords = ko.computed(function () {
    return ko.utils.arrayFilter(model.words(), function (word) { return !(word.isPlayed || false); });
  });

  return model;

  function find(arr, data) {
    for (var i = 0; i < arr.length; i++)
      if (match(arr[i], data)) return arr[i];

    function match(item, data) {
      for (var key in data)
        if (item[key] != data[key]) return false;
      return true;
    }
  }
});