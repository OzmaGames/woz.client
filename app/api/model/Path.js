define(['durandal/app', 'api/constants', 'api/utils'], function (app, constants, utils) {

  //{id, nWords, startTile, endTile, cw, phrase: { words: [ {[words-object], index},.. ] } }
  function Path(model, id, nWords, startTile, endTile, cw, phrase) {
    var base = this;

    base.id = id;
    base.nWords = nWords;
    base.startTile = utils.find(model.tiles(), { id: startTile });
    base.endTile = utils.find(model.tiles(), { id: endTile });
    base.cw = (cw === undefined ? true : cw);
    //base.cw = (base.startTile.y - base.endTile.y) < 0.1;
    //base.cw = (Math.abs(base.startTile.y - base.endTile.y) < 0.2) || base.startTile.x > base.endTile.x;

    var words = (phrase && phrase.words) ? phrase.words : [];
    base.phrase = {
      _complete: ko.observable(false),
      playerId: 0,
      score: 0,
      words: ko.observableArray(words)
    };

    base.phrase.complete = ko.computed(function () {
      return this.phrase._complete() === true || (this.nWords != 0 && this.phrase.words().length == this.nWords);
    }, base);

    base.phrase.complete.subscribe(function (complete) {
      if (complete) {
        app.trigger("confirm:show", { modal: true });

        var sub = app.on("confirm:dialog-result").then(function (result) {
          model.activeWords(null);
          if (result == "cancel") {
            base.phrase._complete(false);
            base.removeAll();            
          }
          else {
            app.loading(true);
            $("html, body").animate({ scrollTop: 0 }, "slow");
            model.player.active(false);
            var data = {
              gameID: model.gameID,
              pathID: base.id,
              username: model.player.username,
              words: ko.utils.arrayMap(base.phrase.words(), function (word) { return word.word.id; })
            };
            app.trigger("server:game:place-phrase", data, function () { console.log('server got it') });
          }
          sub.off();
        });
      }
      ko.utils.arrayForEach(base.phrase.words(), function (word) {
        word.word.isPlayed = (complete ? 2 : 1);
      });
    });

    base.hasWordAt = function (index) {
      var entity = base.getEntityAt(index);
      return entity != null ? true : false;
    }

    base.getWordAt = function (index) {
      var entity = base.getEntityAt(index);
      return entity != null ? entity.word : null;
    }

    base.getEntityAt = function (index) {
      return ko.utils.arrayFirst(base.phrase.words(), function (entity) {
        return entity.index == index;
      });
    }

    base.addWord = function (word, index) {
      if (index === undefined) {
        for (var i = 0; i < 10; i++) {
          if (null == ko.utils.arrayFirst(base.phrase.words(), function (entity) { return entity.index === i; })) {
            index = i;
            break;
          }
        }
      }
      if (null != ko.utils.arrayFirst(base.phrase.words(), function (entity) { return entity.index === index; })) return;

      word.isPlayed = 1;
      base.phrase.words.push({ word: word, index: index });

      model.words.valueHasMutated();
    }

    base.removeAll = function () {
      var words = base.phrase.words();
      for (var i = 0; i < base.nWords; i++) {
        words[i].word.isPlayed = 0;
      }
      base.phrase.words.removeAll();

      model.words.valueHasMutated();
    }

    base.removeWord = function (entity, silence) {
      entity.word.isPlayed = 0;
      base.phrase.words.remove(entity);

      model.words.valueHasMutated();
    }
  
    base.removeWordAt = function (index) {
      var entity = base.getEntityAt(index);
      base.removeWord(entity);
      if (base.nWords == 0) {
        for (var i = entity.index + 1; i < 10; i++) {
          if ((entity = base.getEntityAt(i)) == null) break;
          entity.index--;
        }
        base.phrase.words.valueHasMutated();
      }      
    }    
  }


  return window.myPath = Path;
});