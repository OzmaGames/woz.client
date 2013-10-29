define(['durandal/app', 'durandal/system', 'api/datacontext', 'api/constants', 'api/model/Path'],
  function (app, system, ctx, consts, Path, cPath, cDynamicPath) {

    var entity = { "id": 864, "players": [{ "username": "ali", "score": 0, "active": true }], "gameOver": false, "tiles": [{ "id": 0, "x": 0.1, "y": 0.35, "imageName": "stream", "instruction": "Adjective", "description": "The phrase must contain (at least) one adjective", "bonus": 10, "mult": 0 }, { "id": 1, "x": 0.9, "y": 0.35, "imageName": "girl_in_white_dress", "instruction": "First letter: S", "description": "The phrase must contain (at least) one word that begins with S", "bonus": 10, "mult": 0 }, { "id": 2, "x": 0.4, "y": 0.85, "imageName": "golden_forest", "instruction": "Animal", "description": "The phrase must contain (at least) one word that represents an animal", "bonus": 0, "mult": 2 }], "paths": [{ "id": 1, "nWords": 3, "startTile": 2, "endTile": 1, "cw": true }, { "id": 3, "nWords": 4, "startTile": 0, "endTile": 2, "cw": false }, { "id": 2, "nWords": 5, "startTile": 2, "endTile": 1, "cw": false }, { "id": 0, "nWords": 0, "startTile": 0, "endTile": 1, "cw": true }], "words": [{ "id": 17, "angle": -3.7593988655135036, "x": 0.66, "y": 0.10304030562518166, "isRelated": false, "lemma": "deer", "points": 4 }, { "id": 12, "angle": -3.4063681517727673, "x": 0.21, "y": 0.10582611734513193, "isRelated": false, "lemma": "near", "points": 1 }, { "id": 18, "angle": -1.4734306372702122, "x": 0.75, "y": 0.09065341219073161, "isRelated": false, "lemma": "is", "points": 2 }, { "id": 8, "angle": -1.205036765895784, "x": 0.75, "y": -0.005974720227532089, "isRelated": false, "lemma": "those", "points": 1 }, { "id": 13, "angle": 2.648484369274229, "x": 0.30000000000000004, "y": 0.09659385376377032, "isRelated": false, "lemma": "until", "points": 4 }, { "id": 1, "angle": 2.1487802150659263, "x": 0.12, "y": -0.0012193915154784917, "isRelated": false, "lemma": "tell", "points": 4 }, { "id": 19, "angle": 0.41890177642926574, "x": 0.84, "y": 0.10237198378425091, "isRelated": false, "lemma": "the", "points": 1 }, { "id": 10, "angle": -4.26587772089988, "x": 0.03, "y": 0.10073526226216928, "isRelated": false, "lemma": "once", "points": 4 }, { "id": 15, "angle": 0.4335586610250175, "x": 0.48, "y": 0.09012758530676365, "isRelated": false, "lemma": "spots", "points": 3 }, { "id": 3, "angle": 0.11435552965849638, "x": 0.30000000000000004, "y": 0.00413871304364875, "isRelated": false, "lemma": "share", "points": 3 }, { "id": 6, "angle": 4.282350090797991, "x": 0.5700000000000001, "y": -0.0017783761210739613, "isRelated": false, "lemma": "my", "points": 1 }, { "id": 11, "angle": 4.6806065598502755, "x": 0.12, "y": 0.10505832111695781, "isRelated": false, "lemma": "off", "points": 3 }, { "id": 16, "angle": 4.599650478921831, "x": 0.5700000000000001, "y": 0.09557405668077991, "isRelated": true, "lemma": "forest", "points": 1 }, { "id": 7, "angle": -0.7446857844479382, "x": 0.66, "y": -0.000411419621668756, "isRelated": false, "lemma": "something", "points": 2 }, { "id": 2, "angle": 2.2331691347062588, "x": 0.21, "y": -0.009482073495164514, "isRelated": false, "lemma": "wait", "points": 3 }, { "id": 9, "angle": 0.24570417124778032, "x": 0.84, "y": -0.0014767247764393688, "isRelated": false, "lemma": "better", "points": 1 }, { "id": 14, "angle": 2.116484788712114, "x": 0.39, "y": 0.10969814801588655, "isRelated": false, "lemma": "chest", "points": 0 }, { "id": 4, "angle": -1.8087744829244912, "x": 0.39, "y": 0.006773537730332464, "isRelated": false, "lemma": "were", "points": 3 }, { "id": 5, "angle": 4.207501553464681, "x": 0.48, "y": -0.003607121885288507, "isRelated": false, "lemma": "under", "points": 3 }, { "id": 0, "angle": 4.444658893626183, "x": 0.03, "y": -0.0062058544321917, "isRelated": false, "lemma": "care", "points": 2 }] };

    entity.players[0].active = ko.observable(true);
    ctx.player = entity.players[0];
    var gameLevel = ko.observable(1);

    var game = {

      level: gameLevel,

      debugMode: ko.observable(false),

      debug: function () {
        system.acquire("game/canvas/vm/Path").then(function (CanvasPath) {
          game.debugMode(CanvasPath.options.debug ^= true);
          var paths = ctx.paths();
          for (var i = 0; i < paths.length; i++) {
            paths[i].phrase.words.valueHasMutated();
          }
        });
      },

      addTile: function () {
        createTile();
      },

      exportJSON: function () {
        var tiles = ko.utils.arrayMap(ctx.tiles(), function (t) {
          return {
            id: t.id,
            x: t.x.toFixed(2), y: t.y.toFixed(2),
            instructionAngle: t.instructionAngle()
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
        var json = { tiles: tiles, paths: paths, level: gameLevel() };
        
        var div =
          $('<div/>', { text: 'Copy this and give it to Pedro :)' })
            .append($('<textarea/>', { text: JSON.stringify(json), style:"margin:10px" }));
            
        app.dialog.show("window", { content: div.html(), draggable: false });
      }
    };

    var lastID = 0, lastPathID = 0;
    var createTile = function () {
      var tile = {
        id: lastID++,
        x: 0.5, y: 0.5,
        imageName: consts.images[lastID - 1].imageName,
        instruction: 'tile image',
        instructionAngle:  ko.observable(0)
      };
      tile.info = tile.id;

      tile.rest = ko.computed(function () {        
        var paths = ctx.paths();
        return ko.utils.arrayFilter(ctx.tiles(), function (t) {
          var len = 0;
          for (var i = 0; i < paths.length; i++) {
            var p = paths[i];
            if ((p.startTile.id == tile.id && p.endTile.id == t.id) ||
                 (p.startTile.id == t.id && p.endTile.id == tile.id))
              len++;
          }
          return t.id != tile.id && len < 4;
        });
      });

      tile.addPath = function (t, el, nWords, cw, words) {
        cw = (cw !== undefined) ? cw :
          null == ko.utils.arrayFirst(ctx.paths(), function (p) {
            return (p.startTile.id == tile.id && p.endTile.id == t.id) ||
                   (p.startTile.id == t.id && p.endTile.id == tile.id);
          }),
        startTile = t.x < tile.x ? t : tile,
        endTile = t.x > tile.x ? t : tile;

        nWords = nWords === undefined ? 3 : nWords;

        var path = new Path(ctx, lastPathID++, nWords, startTile.id, endTile.id, cw, words);

        path.onEnter = function (hasData, cPoint) {
          if (!hasData && ctx.activeWord() == null) {
            app.dialog.show("control", {
              left: cPoint.x, top: cPoint.y,
              nWords: path.nWords,
              changed: function (nWordsNew) {
                if (nWordsNew == "cw") {
                  path.cw ^= 1;
                  path.phrase.words.valueHasMutated();
                } else {
                  if (nWordsNew != null) {
                    if ((nWordsNew == 0 && nWords > 0) || (nWordsNew > 0 && nWords == 0)) {
                      var pathPos = ctx.paths.indexOf(path);
                      app.dialog.close("control");
                      path.onEnter = path.onLeave = null;
                      path.dispose();
                      ctx.paths.splice(pathPos, 1);
                      tile.addPath(t, el, nWordsNew, path.cw, path.phrase.words());
                      return;
                    }
                    path.nWords = nWordsNew;
                    path.phrase.words.valueHasMutated();
                  } else {
                    var pathPos = ctx.paths.indexOf(path);
                    app.dialog.close("control");
                    path.onEnter = path.onLeave = null;
                    path.dispose();
                    ctx.paths.splice(pathPos, 1);
                    return;
                  }
                }
              }
            });
          }
        }
        path.onLeave = function () {          
          app.dialog.close("control");
        }

        ctx.paths.push(path);
      }
      
      ctx.tiles.push(tile);
    }

    return system.extend(game, {
      activate: function () {
        ko.utils.arrayForEach(entity.words, function (word) {
          word.isSelected = ko.observable(false);
        });

        entity.tiles = [];
        ctx.tiles(entity.tiles);

        ctx.words(entity.words);
        ctx.players(entity.players);
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
      }
    });

  });