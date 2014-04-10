define( ['durandal/app', 'api/datacontext'], function ( app, ctx ) {

   function AddWords() {
      this.loading = ko.observable( false );
      this.message = ko.observable();
      this.words = ko.observableArray();
      this.activeWord = ko.observable();
      this.lemma = ko.observable();

      this.tMode = ctx.tutorialMode;

      var base = this;

      this.search = function () {
         this.loading( true );

         base.lemma( base.lemma().trim() );

         app.trigger( "server:game:search-word", {
            username: ctx.username,
            lemma: base.lemma()
         }, function ( data ) {
            //data.words = ['word1', 'word2', 'word3'];

            base.loading( false );
            if ( data.words.length == 0 ) {
               data.message = data.message || '<p>Sorry! <b>{word}</b> does not exist in our database at the moment.</p>';
               base.message( data.message.replace( '{word}', base.lemma() ) );
               return;
            }
            base.activeWord( data.words[0] );
            base.words( data.words );
         } );

         return false;
      }

      this.done = function () {
         base.loading( true );
         if ( ctx.tutorialMode() ) {
            var json = {
               success: true,
               word: {
                  id: 10, x: 0.50, y: 0.20, lemma: base.activeWord(), points: 3, isRelated: false, angle: 3, altLemma: base.activeWord()
               }
            };

            publishWord( json );
         } else {
            app.trigger( "server:game:add-word", {
               username: ctx.username,
               gameID: ctx.gameID,
               lemma: base.activeWord()
            }, function ( data ) {
               publishWord( data );
            } );
         }

         function publishWord( data ) {
            
            base.loading( false );
            data.word.css = "new";
            data.words = [data.word];
            data.oldWords = [];
            if ( data.success ) {
               base.ticket( false );
               app.trigger( "game:swap-words", data );
               app.scrollDown();
               base.close();
            }
         }
      }

      this.select = function ( version ) {
         base.activeWord( version );
      }
   }

   return AddWords;
} );