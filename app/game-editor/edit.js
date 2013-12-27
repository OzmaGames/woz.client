define(['durandal/app', 'durandal/system', 'plugins/router', 'api/datacontext', './Tile', './_server', 'game/canvas'],
  function (app, system, router, ctx, Tile) {

     var lastID = 0;
     var entity = { words: [{ "id": 17, "angle": -3.7593988655135036, "x": 0.66, "y": 0.10304030562518166, "isRelated": false, "lemma": "mmmmmm", "points": 4 }, { "id": 12, "angle": -3.4063681517727673, "x": 0.21, "y": 0.10582611734513193, "isRelated": false, "lemma": "mmmmm", "points": 1 }, { "id": 18, "angle": -1.4734306372702122, "x": 0.75, "y": 0.09065341219073161, "isRelated": false, "lemma": "ppppppppppppp", "points": 2 }, { "id": 8, "angle": -1.205036765895784, "x": 0.75, "y": -0.005974720227532089, "isRelated": false, "lemma": "pppppppppp", "points": 1 }, { "id": 13, "angle": 2.648484369274229, "x": 0.30000000000000004, "y": 0.09659385376377032, "isRelated": false, "lemma": "bb", "points": 4 }, { "id": 1, "angle": 2.1487802150659263, "x": 0.12, "y": -0.0012193915154784917, "isRelated": false, "lemma": "bb", "points": 4 }, { "id": 19, "angle": 0.41890177642926574, "x": 0.84, "y": 0.10237198378425091, "isRelated": false, "lemma": "bb", "points": 1 }, { "id": 10, "angle": -4.26587772089988, "x": 0.03, "y": 0.10073526226216928, "isRelated": false, "lemma": "ccc", "points": 4 }, { "id": 15, "angle": 0.4335586610250175, "x": 0.48, "y": 0.09012758530676365, "isRelated": false, "lemma": "ccc", "points": 3 }, { "id": 3, "angle": 0.11435552965849638, "x": 0.30000000000000004, "y": 0.00413871304364875, "isRelated": false, "lemma": "dddd", "points": 3 }, { "id": 6, "angle": 4.282350090797991, "x": 0.5700000000000001, "y": -0.0017783761210739613, "isRelated": false, "lemma": "dddd", "points": 1 }, { "id": 11, "angle": 4.6806065598502755, "x": 0.12, "y": 0.10505832111695781, "isRelated": false, "lemma": "eeeee", "points": 3 }, { "id": 16, "angle": 4.599650478921831, "x": 0.5700000000000001, "y": 0.09557405668077991, "isRelated": true, "lemma": "eeeee", "points": 1 }, { "id": 7, "angle": -0.7446857844479382, "x": 0.66, "y": -0.000411419621668756, "isRelated": false, "lemma": "gggggg", "points": 2 }, { "id": 2, "angle": 2.2331691347062588, "x": 0.21, "y": -0.009482073495164514, "isRelated": false, "lemma": "gggggg", "points": 3 }, { "id": 9, "angle": 0.24570417124778032, "x": 0.84, "y": -0.0014767247764393688, "isRelated": false, "lemma": "hhhhhhh", "points": 1 }, { "id": 14, "angle": 2.116484788712114, "x": 0.39, "y": 0.10969814801588655, "isRelated": false, "lemma": "hhhhhhh", "points": 0 }, { "id": 4, "angle": -1.8087744829244912, "x": 0.39, "y": 0.006773537730332464, "isRelated": false, "lemma": "kkkkkkkkk", "points": 3 }, { "id": 5, "angle": 4.207501553464681, "x": 0.48, "y": -0.003607121885288507, "isRelated": false, "lemma": "kkkkkkkkk", "points": 3 }, { "id": 0, "angle": 4.444658893626183, "x": 0.03, "y": -0.0062058544321917, "isRelated": false, "lemma": "care", "points": 2 }] };
     ko.utils.arrayForEach(entity.words, function (word) {
        word.isSelected = ko.observable(false);
     });

     var GameBoard = function (id) {
        var base = this;

        base.id = id;
        base.level = ko.observable(0);
        base.draft = ko.observable(true);

        lastID = 0;
     }

     GameBoard.prototype.debugMode = ko.observable(false);
     GameBoard.prototype.debug = function () {
        var base = this;
        system.acquire("game/canvas/vm/Path").then(function (CanvasPath) {
           base.debugMode(CanvasPath.options.debug ^= true);
           var paths = ctx.paths();
           for (var i = 0; i < paths.length; i++) {
              paths[i].phrase.words.valueHasMutated();
           }
        });
     }

     GameBoard.prototype.portraitMode = ko.observable(false);
     GameBoard.prototype.portrait = function () {
        var base = this;
        base.portraitMode(!base.portraitMode());

        //if (base.portraitMode()) {
        //   base.innerWidth = window.innerWidth;
        //   window.innerWidth = 768;
        //} else {
        //   window.innerWidth = base.innerWidth;
        //}
     }

     GameBoard.prototype.addTile = function () {
        var tile = new Tile(lastID++);
        ctx.tiles.push(tile);
     }

     GameBoard.prototype.back = function () {
        router.navigate('game-editor');
     }

     GameBoard.prototype.save = function () {
        if (app.loading()) return;

        var tiles = ko.utils.arrayMap(ctx.tiles(), function (t) {
           return {
              id: t.id,
              x: t.x.toFixed(2) * 1,
              y: t.y.toFixed(2) * 1,
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

        var json = {
           command: 'set',
           id: this.id,
           tiles: tiles,
           paths: paths,
           level: this.level() * 1,
           draft: this.draft() * 1
        };

        var base = this;

        app.loading(true);
        app.trigger("server:manager:boards", json, function (data) {
           if (data.success) {
              base.id = data.id;
              app.dialog.show("alert", { content: 'Game Board Saved' });
           }
           else {
              app.dialog.show("alert", { content: 'Failed to save the board' });
           }
           app.loading(false);
        });
     }

     system.extend(GameBoard.prototype, {
        activate: function (id) {
           this.id = id == "new" ? -1 : id * 1;

           ctx.players([
             { "username": "player", "score": 100, "active": ko.observable(true) },
             { "username": "opponent", "score": 0, "active": ko.observable(false) }
           ]);
           ctx.player = ctx.players()[0];
           ctx.words(entity.words);

           if (this.id == -1) return;

           var base = this;
           ctx.loading(true);
           app.trigger("server:manager:boards", { command: 'get', id: this.id }, function (data) {
              ctx.loading(false);
              if (data.success) {
                 var board = data.board;
                 ko.utils.arrayForEach(board.tiles, function (t) {
                    if (t.id > lastID) lastID = t.id + 1;
                    ctx.tiles.push(new Tile(t.id, t.x * 1, t.y * 1, t.angle));
                 });

                 ko.utils.arrayForEach(board.paths, function (path) {
                    var sTile = ko.utils.arrayFirst(ctx.tiles(), function (t) { return t.id == path.startTile });
                    var eTile = ko.utils.arrayFirst(ctx.tiles(), function (t) { return t.id == path.endTile });

                    eTile.addPath(sTile, null, path.nWords, path.cw);
                 });

                 base.level(board.level);
                 base.draft(board.draft);
              }
           });
        },

        binding: function () {
           return { cacheViews: false };
        },

        compositionComplete: function (view) {

        },

        loading: app.loading,

        deactivate: function () {
           var paths = ctx.paths();
           for (var i = 0; i < paths.length; i++) {
              paths[i].dispose();
           }
           ctx.paths.removeAll();
           ctx.tiles.removeAll();
           ctx.words.removeAll();

           $('#menu').remove();
        }
     });

     return GameBoard;
  });