define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   function AddWords() {
      this.loading = ko.observable(false);
      this.message = ko.observable();      
      this.words = ko.observableArray();
      this.activeWord = ko.observable();

      var base = this;

      this.search = function () {
         this.loading(true);


         app.trigger("server:game:search-words", {
            username: ctx.username,
            lemma: word.lemma
         }, function (data) {
            //data.words = ['version1', 'version2', 'version3'];
            if (data.words.length == 0) {
               data.message = data.message || '<p>Sorry that word is not in our database at the moment.</p>';
               base.message(data.message);                             
               return;
            }
            base.activeWord(data.words[0]);
            base.words(data.words);

            base.loading(false);
         });
      }

      this.drop = function () {
         var word = ctx.activeWord();

         word.isPlayed = true;
         ctx.words.valueHasMutated();

         base.word = word;
         base.lemma = word.lemma;
         base.dropped(true);

         app.trigger("server:game:versions", {
            command: 'get',
            username: ctx.username,
            lemma: word.lemma
         }, function (data) {
            //data.versions = ['version1', 'version2', 'version3'];
            if (data.versions.length == 0) {
               data.message = data.message || '<p>Only words that are <b>verbs</b> can be changed at the moment.</p><br/><p class=sm>Verbs are doing words like "talk", "run" and "smile", or being words like "wish", "feel" and "know".</p>';
               base.message(data.message);
               base.dropped(false);

               base.word.isPlayed = false;
               ctx.words.valueHasMutated();

               return;
            }
            base.activeVersion = ko.observable(data.versions[0]);
            base.versions = ko.observableArray(data.versions);

            //if (data.versions.length > 0) {
            //   app.trigger("server:game:versions", {
            //      command: 'set',
            //      username: ctx.username,
            //      gameID: ctx.gameID,
            //      wordID: word.id,
            //      version: data.versions[0]
            //   });
            //}
            base.step(2);
         });
      }

      this.done = function () {
         base.loading(true);
         app.trigger("server:game:versions", {
            command: 'set',
            username: ctx.username,
            gameID: ctx.gameID,
            wordID: base.word.id,
            version: base.activeVersion()
         }, function (data) {
            base.loading(false);
            if (data.success) {
               base.close();
               base.word.isPlayed = false;
               base.word.lemma = data.version;
               ctx.words.valueHasMutated();
            }
         });
      }

      this.select = function (version) {
         base.activeVersion(version);
      }
   }

   return AddWords;
});