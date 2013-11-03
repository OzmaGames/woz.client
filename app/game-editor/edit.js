define(['durandal/app', 'durandal/system', 'api/datacontext', './Tile', './_server'],
  function (app, system, ctx, Tile) {

    var entity = { "tiles": [{ "id": 0, "x": 0.1, "y": 0.35, "imageName": "stream", "instruction": "Adjective", "description": "The phrase must contain (at least) one adjective", "bonus": 10, "mult": 0 }, { "id": 1, "x": 0.9, "y": 0.35, "imageName": "girl_in_white_dress", "instruction": "First letter: S", "description": "The phrase must contain (at least) one word that begins with S", "bonus": 10, "mult": 0 }, { "id": 2, "x": 0.4, "y": 0.85, "imageName": "golden_forest", "instruction": "Animal", "description": "The phrase must contain (at least) one word that represents an animal", "bonus": 0, "mult": 2 }], "paths": [{ "id": 1, "nWords": 3, "startTile": 2, "endTile": 1, "cw": true }, { "id": 3, "nWords": 4, "startTile": 0, "endTile": 2, "cw": false }, { "id": 2, "nWords": 5, "startTile": 2, "endTile": 1, "cw": false }, { "id": 0, "nWords": 0, "startTile": 0, "endTile": 1, "cw": true }], "words": [{ "id": 17, "angle": -3.7593988655135036, "x": 0.66, "y": 0.10304030562518166, "isRelated": false, "lemma": "deer", "points": 4 }, { "id": 12, "angle": -3.4063681517727673, "x": 0.21, "y": 0.10582611734513193, "isRelated": false, "lemma": "near", "points": 1 }, { "id": 18, "angle": -1.4734306372702122, "x": 0.75, "y": 0.09065341219073161, "isRelated": false, "lemma": "is", "points": 2 }, { "id": 8, "angle": -1.205036765895784, "x": 0.75, "y": -0.005974720227532089, "isRelated": false, "lemma": "those", "points": 1 }, { "id": 13, "angle": 2.648484369274229, "x": 0.30000000000000004, "y": 0.09659385376377032, "isRelated": false, "lemma": "until", "points": 4 }, { "id": 1, "angle": 2.1487802150659263, "x": 0.12, "y": -0.0012193915154784917, "isRelated": false, "lemma": "tell", "points": 4 }, { "id": 19, "angle": 0.41890177642926574, "x": 0.84, "y": 0.10237198378425091, "isRelated": false, "lemma": "the", "points": 1 }, { "id": 10, "angle": -4.26587772089988, "x": 0.03, "y": 0.10073526226216928, "isRelated": false, "lemma": "once", "points": 4 }, { "id": 15, "angle": 0.4335586610250175, "x": 0.48, "y": 0.09012758530676365, "isRelated": false, "lemma": "spots", "points": 3 }, { "id": 3, "angle": 0.11435552965849638, "x": 0.30000000000000004, "y": 0.00413871304364875, "isRelated": false, "lemma": "share", "points": 3 }, { "id": 6, "angle": 4.282350090797991, "x": 0.5700000000000001, "y": -0.0017783761210739613, "isRelated": false, "lemma": "my", "points": 1 }, { "id": 11, "angle": 4.6806065598502755, "x": 0.12, "y": 0.10505832111695781, "isRelated": false, "lemma": "off", "points": 3 }, { "id": 16, "angle": 4.599650478921831, "x": 0.5700000000000001, "y": 0.09557405668077991, "isRelated": true, "lemma": "forest", "points": 1 }, { "id": 7, "angle": -0.7446857844479382, "x": 0.66, "y": -0.000411419621668756, "isRelated": false, "lemma": "something", "points": 2 }, { "id": 2, "angle": 2.2331691347062588, "x": 0.21, "y": -0.009482073495164514, "isRelated": false, "lemma": "wait", "points": 3 }, { "id": 9, "angle": 0.24570417124778032, "x": 0.84, "y": -0.0014767247764393688, "isRelated": false, "lemma": "better", "points": 1 }, { "id": 14, "angle": 2.116484788712114, "x": 0.39, "y": 0.10969814801588655, "isRelated": false, "lemma": "chest", "points": 0 }, { "id": 4, "angle": -1.8087744829244912, "x": 0.39, "y": 0.006773537730332464, "isRelated": false, "lemma": "were", "points": 3 }, { "id": 5, "angle": 4.207501553464681, "x": 0.48, "y": -0.003607121885288507, "isRelated": false, "lemma": "under", "points": 3 }, { "id": 0, "angle": 4.444658893626183, "x": 0.03, "y": -0.0062058544321917, "isRelated": false, "lemma": "care", "points": 2 }] };
    var lastID = 0;

    var GameBoard = function (id) {
      var base = this;

      base.id = id;
      base.level = ko.observable(1);

      lastID = 0;
    }

    GameBoard.prototype.debugMode = ko.observable(false);
    GameBoard.prototype.debug = function () {
      system.acquire("game/canvas/vm/Path").then(function (CanvasPath) {
        game.debugMode(CanvasPath.options.debug ^= true);
        var paths = ctx.paths();
        for (var i = 0; i < paths.length; i++) {
          paths[i].phrase.words.valueHasMutated();
        }
      });
    }

    GameBoard.prototype.addTile = function () {
      var tile = new Tile(lastID++);
      ctx.tiles.push(tile);
    }

    GameBoard.prototype.save = function () {
      var tiles = ko.utils.arrayMap(ctx.tiles(), function (t) {
        return {
          id: t.id,
          x: t.x.toFixed(2), y: t.y.toFixed(2),
          angle: t.angle()
        };
      });
      var paths = ko.utils.arrayMap(ctx.paths(), function (p) {
        return {
          id: p.id,
          startTile: p.startTile.id,
          endTile: p.endTile.id,
          cw: p.cw,
          nWords: p.nWords
        };
      });
      var json = { id: this.id, tiles: tiles, paths: paths, level: this.level() };
      
      json = JSON.parse(JSON.stringify(json));

      app.trigger("server:manager:setBoard", json, function (data) {
        app.dialog.show("alert", { content: 'Game Board Saved' });
      });

      //var div =
      //  $('<div/>', { text: 'Copy this and give it to Pedro :)' })
      //    .append($('<textarea/>', { text: JSON.stringify(json), style: "margin:10px" }));

      //app.dialog.show("window", { content: div.html(), draggable: false });      
    }

    system.extend(GameBoard.prototype, {
      activate: function (id) {
        this.id = id == "new" ? -1 : id * 1;
        
        ko.utils.arrayForEach(entity.words, function (word) {
          word.isSelected = ko.observable(false);
        });
        ctx.players = [{ "username": "ali", "score": 0, "active": ko.observable(true) }];
        ctx.player = ctx.players[0];

        ctx.words(entity.words);

        app.dialog.show("alert", { content: 1 });
        app.dialog.show("alert", { content: 12 });
        app.dialog.show("alert", { content: 123 });
      },

      binding: function () {
        return { cacheViews: false };
      },

      compositionComplete: function (view) {
        $('#menu').appendTo('body');
        var h = $(window).innerHeight();

        $('#palette-right, #palette-left').each(function (i, el) {
          var $el = $(el);
          $el.css('top', (h - $el.outerHeight()) / 2);
        });

        if ($.support.touch)
          $('#workspace').touchPunch();
      },

      deactivate: function () {
        $('#menu').remove();
        var paths = ctx.paths.splice(0, ctx.paths().length);
        for (var i = 0; i < paths.length; i++) {
          paths[i].dispose();
        }
      }
    });

    return GameBoard;
  });