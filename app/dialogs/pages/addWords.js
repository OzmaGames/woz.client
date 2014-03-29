define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   function AddWords() {
      this.loading = ko.observable(false);
      this.message = ko.observable();      
      this.words = ko.observableArray();
      this.activeWord = ko.observable();
      this.lemma = ko.observable();

      var base = this;

      this.search = function () {
         this.loading(true);
         
         base.lemma(base.lemma().trim());

         app.trigger("server:game:search-word", {
            username: ctx.username,
            lemma: base.lemma()
         }, function (data) {
            //data.words = ['version1', 'version2', 'version3'];

            base.loading(false);
            if (data.words.length == 0) {
               data.message = data.message || '<p>Sorry! <b>{word}</b> does not exist in our database at the moment.</p>';              
               base.message( data.message.replace('{word}', base.lemma()));
               return;
            }
            base.activeWord(data.words[0]);
            base.words(data.words);
         });         

         return false;
      }
      
      this.done = function () {
         base.loading(true);
         app.trigger("server:game:add-word", {
            username: ctx.username,
            gameID: ctx.gameID,
            lemma: base.activeWord()
         }, function (data) {
            base.loading(false);
            data.word.css = "new";
            data.words = [data.word];
            data.oldWords = [];
            if (data.success) {
               base.ticket(false);
               app.trigger("game:swap-words", data);
               app.scrollDown();
               base.close();               
            }
         });
      }

      this.select = function (version) {
         base.activeWord(version);
      }
   }

   return AddWords;
});