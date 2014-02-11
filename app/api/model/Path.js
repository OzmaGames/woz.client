define(['durandal/app', 'api/constants', 'api/utils', 'paper'], function (app, constants, utils) {
   function Path(model, id, nWords, startTile, endTile, cw, phrase) {
      var base = this;

      base.id = id;
      base.nWords = nWords;
      base.startTile = utils.find(model.tiles(), { id: startTile });
      base.endTile = utils.find(model.tiles(), { id: endTile });
      base.cw = (cw === undefined ? true : cw);      
                  
      base.phrase = {
         _complete: ko.observable(false),
         playerId: 0,
         score: 0,         
         words: ko.observableArray()
      };

      base.phrase.toString = function () {         
         var str = "", len = base.phrase.words().length;
         for (var i = 0; i < len; i++) {
            str += i + (i == len - 1 ? '' : ' ');
         }
         for (var i = 0; i < len; i++) {
            str = str.replace(base.phrase.words()[i].index, base.phrase.words()[i].word.lemma)
         }
         return str;
      }

      base.phrase.update = function (words) {
         base.completeSub.dispose();
         if (base.phrase.complete()) return;
         ko.utils.arrayForEach(words, function (word) {
            base.addWord(word, undefined, true);
         })
      }      

      base.phrase.complete = ko.computed(function () {
         return this.phrase._complete() === true || this.phrase.words().length == 6 || (this.nWords != 0 && this.phrase.words().length == this.nWords);
      }, base).extend({ throttle: 1 }); //let exchange happends if any
      
      base.completeSub = base.phrase.complete.subscribe(function (complete) {
         if (complete) {
            app.dialog.close("slipper");
            app.dialog.show("confirm", {
               modal: true,
               content: 'Do you want to place <br/><b>"' + base.phrase.toString() + '"</b>?',
               doneText: 'YES',
               cancelText: 'NO'
            }).then(function (result) {
               model.activeWords(null);
               paper.tool.remove();
               if (result == "done") {
                  app.loading(true);
                  model.player.active(false);
                  base.phrase.words().sort(function (a, b) { return a.index - b.index });
                  //console.log(ko.utils.arrayMap(base.phrase.words(), function (word) { return word.word.lemma; }));

                  var data = {
                     gameID: model.gameID,
                     pathID: base.id,
                     username: model.player.username,
                     words: ko.utils.arrayMap(base.phrase.words(), function (word) { return word.word.id; })
                  };
                  base.completeSub.dispose();
                  model.lastPath = base;
                  app.trigger("server:game:place-phrase", data);
                  app.scrollUp(); 
               } else {
                  base.phrase._complete(false);
                  base.removeAll();
               }
            });
         }
         ko.utils.arrayForEach(base.phrase.words(), function (word) {
            word.word.isPlayed = (complete ? 2 : 1);
         });
      });

      base.hasWordAt = function (index) {
         var entity = base._getEntityAt(index);
         return entity != null ? true : false;
      }

      base.getWordAt = function (index) {
         var entity = base._getEntityAt(index);
         return entity != null ? entity.word : null;
      }

      base._getEntityAt = function (index) {
         return ko.utils.arrayFirst(base.phrase.words(), function (entity) {
            return entity.index == index;
         });
      }

      base.addWord = function (word, index, force) {
         if (!model.player.active() && force !== true) {
            return false;
         }

         if (index === undefined) {
            for (var i = 0; i < 10; i++) {
               if (null == ko.utils.arrayFirst(base.phrase.words(), function (entity) { return entity.index === i; })) {
                  index = i;
                  break;
               }
            }
         }

         if ((base.nWords == 0 && index >= 6) || (base.nWords != 0 && index >= base.nWords)) return false;

         if (null != ko.utils.arrayFirst(base.phrase.words(), function (entity) { return entity.index === index; })) {
            base.removeWordAt(index);
            //return false;
         }

         word.isPlayed = 1;
         base.phrase.words.push({ word: word, index: index });

         model.words.valueHasMutated();

         return true;
      }

      base.removeAll = function () {
         var words = base.phrase.words();
         for (var i = 0; i < words.length; i++) {
            words[i].word.isPlayed = 0;
         }
         base.phrase.words.removeAll();

         model.words.valueHasMutated();
      }

      base._removeEntity = function (entity, opt) {
         if (entity == null) return false;

         opt = opt || {};

         if (!opt.keepUnplayed) {
            entity.word.isPlayed = 0;
         }
         base.phrase.words.remove(entity);

         model.words.valueHasMutated();
      }

      base.removeWordAt = function (index, opt) {
         var entity = base._getEntityAt(index);
         base._removeEntity(entity, opt);
         if (base.nWords == 0) {
            for (var i = entity.index + 1; i < 10; i++) {
               if ((entity = base._getEntityAt(i)) == null) break;
               entity.index--;
            }
            base.phrase.words.valueHasMutated();
         }
      }

      if (phrase) {
         //setTimeout(function (data) {
         base.phrase.update(phrase.words);
         //}, 100, { base: base, words: phrase.words });
      }
   }

   return Path;
});