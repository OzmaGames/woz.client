define(['durandal/app', 'api/constants', 'api/model/Path'], function (app, constants, Path) {
  var entity = { "id": 61, "players": [{ "username": "ali", "score": 0, "active": true }], "gameOver": false, "tiles": [{ "id": 1, "imageID": 2, "instruction": "Color", "x": 0.85, "y": 0.3 }, { "id": 2, "imageID": 0, "instruction": "Two Verbs", "x": 0.4, "y": 0.8 }, { "id": 0, "imageID": 1, "instruction": "Animal", "x": 0.15, "y": 0.3 }], "paths": [{ "id": 0, "nWords": 4, "startTile": 0, "endTile": 1 }, { "id": 2, "nWords": 0, "startTile": 0, "endTile": 2 }, { "id": 1, "nWords": 5, "startTile": 2, "endTile": 1 }], "words": [{ "id": 26, "angle": -15.495281136594713, "x": 0.7007089344784617, "y": 0.22972331583732739, "isRelated": false, "lemma": "the", "points": 1 }, { "id": 21, "angle": 16.916789050213993, "x": 0.4055559679865838, "y": 0.16035052235238254, "isRelated": false, "lemma": "whiskers", "points": 2 }, { "id": 16, "angle": 12.81387863215059, "x": 0.8016051704064012, "y": 0.6565097948536277, "isRelated": false, "lemma": "wild", "points": 2 }, { "id": 7, "angle": -7.254205428995192, "x": 0.5160309400409461, "y": 0.18448862687218934, "isRelated": false, "lemma": "wake", "points": 2 }, { "id": 14, "angle": -6.588958063162863, "x": 0.5095418402925134, "y": 0.8219126596581191, "isRelated": false, "lemma": "cold", "points": 1 }, { "id": 24, "angle": -16.83654911722988, "x": 0.7648840695619583, "y": 0.349346067965962, "isRelated": false, "lemma": "spring", "points": 1 }, { "id": 19, "angle": -14.40544798411429, "x": 0.12002415042370558, "y": 0.8076314647682011, "isRelated": false, "lemma": "around", "points": 2 }, { "id": 27, "angle": 0.6362226856872439, "x": 0.39170383512973783, "y": 0.5599211187567562, "isRelated": false, "lemma": "a", "points": 2 }, { "id": 23, "angle": 13.414636648260057, "x": 0.3763386085629463, "y": 0.22313145522493869, "isRelated": false, "lemma": "tiles", "points": 3 }, { "id": 15, "angle": -2.1091905226930976, "x": 0.1545402705669403, "y": 0.778934099629987, "isRelated": false, "lemma": "big", "points": 2 }, { "id": 5, "angle": 3.7517388984560966, "x": 0.7843131095170975, "y": 0.6690550298430026, "isRelated": false, "lemma": "kerchief", "points": 0 }, { "id": 10, "angle": 3.0457779560238123, "x": 0.5773046573624016, "y": 0.6685968097066507, "isRelated": false, "lemma": "need", "points": 3 }, { "id": 18, "angle": -12.676598406396806, "x": 0.5491847174242139, "y": 0.4312772706965916, "isRelated": false, "lemma": "until", "points": 1 }, { "id": 25, "angle": 21.06796308234334, "x": 0.6263212895020842, "y": 0.8508232385851443, "isRelated": false, "lemma": "bubbles", "points": 1 }, { "id": 11, "angle": -3.8102350747212768, "x": 0.12430711127817631, "y": 0.22966752274660393, "isRelated": false, "lemma": "within", "points": 3 }, { "id": 6, "angle": 21.534306672401726, "x": 0.17982362266629937, "y": 0.35228128141025083, "isRelated": false, "lemma": "distance", "points": 3 }, { "id": 9, "angle": -8.521131857298315, "x": 0.4550089590251446, "y": 0.7841091227950528, "isRelated": false, "lemma": "snow", "points": 2 }, { "id": 20, "angle": -0.34907534159719944, "x": 0.7480431446805597, "y": 0.8473099083406851, "isRelated": false, "lemma": "while", "points": 0 }, { "id": 4, "angle": -0.29647526144981384, "x": 0.8457211056724191, "y": 0.8715903407195583, "isRelated": false, "lemma": "question", "points": 2 }, { "id": 22, "angle": -18.65970923844725, "x": 0.5932764755561948, "y": 0.7494713509571739, "isRelated": false, "lemma": "head", "points": 2 }, { "id": 17, "angle": -15.60951219405979, "x": 0.8639706481248141, "y": 0.5501616386231035, "isRelated": false, "lemma": "young", "points": 4 }, { "id": 12, "angle": -16.707421267405152, "x": 0.1932828364893794, "y": 0.7278997050365433, "isRelated": false, "lemma": "these", "points": 1 }, { "id": 8, "angle": 5.990446358919144, "x": 0.497814510203898, "y": 0.5916940860101022, "isRelated": false, "lemma": "live", "points": 3 }, { "id": 3, "angle": -17.60131897125393, "x": 0.6149749608710409, "y": 0.19700306936865672, "isRelated": false, "lemma": "right", "points": 3 }, { "id": 13, "angle": -11.189981952309608, "x": 0.8647659063339234, "y": 0.8996711704297923, "isRelated": false, "lemma": "anybody", "points": 1 }] };

  var playerID = 'ali';

  var model =
  {
    gameID: 0,
    players: ko.observableArray([]),

    gameOver: ko.observable(false),

    words: ko.observableArray([]),
    tiles: ko.observableArray([]),

    paths: ko.observableArray([]),

    loading: ko.observable(null),

    activeWord: ko.observable(null),
    activeWords: ko.observable(null)
  };

  model.load = function (playerCount) {

    model.loading(true);

    app.on("game:start", function (json) {
      model.gameID = json.id;

      console.log(json.players);
      model.player = find(json.players, { username: playerID });
      model.player.active = ko.observable(model.player.active);
      model.players(json.players);

      model.words(json.words);

      for (var i = 0; i < json.tiles.length; i++) {
        var metadata = find(constants.images, { id: json.tiles[i].imageID });

        json.tiles[i].description = json.tiles[i].instruction;
        json.tiles[i].imageName = metadata.imageName;
      }
      model.tiles(json.tiles);

      json.paths = ko.utils.arrayMap(json.paths, function (p) {
        return new Path(model, p.id, p.nWords, p.startTile, p.endTile, p.cw, p.phrase);
      });
      model.paths(json.paths);

      model.gameOver(json.gameOver);
      
      model.loading(false);
    });

    app.trigger("server:game:queue", { username: playerID, password: 12345, playerCount: playerCount }, function (res) {
        if (res.success) {

        }
    });

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