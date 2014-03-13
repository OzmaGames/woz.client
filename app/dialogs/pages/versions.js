define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   function Versions() {
      this.step = ko.observable(1);
      this.dropped = ko.observable(false);
      this.loading = app.loading;

      var base = this;

      this.enter = function () {
         console.log("enter")
      }
      this.leave = function () {
         console.log("leave")
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
            //data.versions = ['version1', 'version2', 'version3', 'version4'];
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

   return Versions;
});