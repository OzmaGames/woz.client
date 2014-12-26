define(['api/datacontext', 'api/constants', 'api/model/Path'], function (ctx, consts, Path) {

  var Tile = function (id, x, y, angle) {
    this.id = id,
    this.x = x || 0.5;
    this.y = y || 0.5;
    this.imageName = consts.bigImageURL('woz', id);
    this.imageId = id;
    this.instruction = 'tile image';
    this.angle = ko.observable(angle || 0);
    this.info = id;

    var base = this;
    this.rest = ko.computed(function () {
      var paths = ctx.paths(), tiles = ctx.tiles();
      return ko.utils.arrayFilter(tiles, function (t) {
        if (t.id == base.id) return false;
        var len = 0;
        for (var i = 0; i < paths.length; i++) {
          var p = paths[i];
          if ((p.startTile.id == base.id && p.endTile.id == t.id) ||
               (p.startTile.id == t.id && p.endTile.id == base.id))
            len++;
        }
        return len < 4;
      });
    });
  }, lastPathID = 0;

  Tile.prototype.addPath = function (t, el, nWords, cw, words) {
    if (this.id == t.id || (this.x == t.x && this.y == t.y)) return;

    var p;
    cw = (cw !== undefined) ? (cw ? 1 : 0) :
      (p = ko.utils.arrayFirst(ctx.paths(), function (p) {
        //console.log(p, this.id, t.id);
        return (p.startTile.id == this.id && p.endTile.id == t.id) ||
               (p.startTile.id == t.id && p.endTile.id == this.id);
      }, this)) != null ? (p.cw ? 0 : 1) : 1,
    startTile = t.x < this.x ? t : this,
    endTile = t.x > this.x ? t : this;
    nWords = nWords === undefined ? 3 : nWords;

    var path = new Path(ctx, lastPathID++, nWords, startTile.id, endTile.id, cw, words);

    ctx.paths.push(path);
  }

  Path.prototype.onLeave = function () {
    app.dialog.close("control");
  }

  Path.prototype.onEnter = function (cPoint) {
    var path = this;
    app.dialog.show("control", {
      left: cPoint.x, top: cPoint.y,
      nWords: path.nWords,
      changed: function (nWordsNew) {
        if (nWordsNew == "cw") {
          path.cw ^= 1;
          path.phrase.words.valueHasMutated();
        } else {
          if (nWordsNew != null) {
            if ((nWordsNew == 0 && path.nWords > 0) || (nWordsNew > 0 && path.nWords == 0)) {
              var pathPos = ctx.paths.indexOf(path);
              app.dialog.close("control");
              path.onEnter = path.onLeave = null;
              path.dispose();
              ctx.paths.splice(pathPos, 1);
              path.startTile.addPath(path.endTile, null, nWordsNew, path.cw, path.phrase.words());
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
            return
          }
        }
      }
    });
  };
  return Tile;
});