define( 'game/poem/index', ['durandal/activator', './phrase', './background', './share', 'api/datacontext'],
   function ( activator, p1, p2, p3, ctx ) {

      var pages = [new p1, new p2, new p3], index = 0;

      var page = activator.create();

      var heading = ko.computed( function () {
         var pg = page();
         return pg && pg.heading ? pg.heading : 'Make a poem!';
      } );

      var btnNextCaption = ko.computed( function () {
         var pg = page();
         return pg && pg.btnNextCaption ? pg.btnNextCaption : 'Next >';
      } );

      //pages[0].activate(); var i = 2;
      //ctx.poem.chosenPhrases( ctx.poem.phrases().filter( function () { return i--; }) );

      return {
         activate: function () {
            return ctx.auth.then( function () {
               pages.forEach( function ( p ) { p.reset() } );
               pages[0].activate();
               page( pages[index = 0] );
            } );            
         },
         heading: heading,
         btnNextCaption: btnNextCaption,
         page: page,
         hasBack: ko.computed( function () {
            page();
            return index != 0;
         } ).extend( { throttle: 150 } ),
         canNext: ko.computed( function () {
            var pg = page();
            return pg && pg.valid ? pg.valid() : false;
         } ).extend( { throttle: 150 } ),
         next: function () {
            app.Sound.play( app.Sound.sounds.click.button );

            if ( index >= pages.length - 1 ) {
               this.save();
               app.trigger( "notice:close" );
            } else {
               page( pages[++index] );
            }
         },
         save: function () {
            var model = {};
            model.phraseIDs = ctx.poem.chosenPhrases().map( function ( p ) { return p.id } );
            model.gameID = ctx.poem.gameID;
            model.username = ctx.username;
            model.title = ctx.poem.title();
            model.tileID = ctx.poem.tile().id == undefined ? false : ctx.poem.tile().id;
            //model.imageID = Number(ctx.poem.tile().imageID);
            model.size = ctx.poem.settings.size.value();
            model.shadow = ctx.poem.settings.shade.value();
            model.light = ctx.poem.settings.lightColor();
            model.command = "set";
            app.trigger("server:user:poem", model, function (json) {
                if (json.success) {
                    app.trigger('game:bubble', 'poemMenu');
                }
               app.dialog.show( "alert", {
                  content: json.success ? 'Your poem has been saved!' : 'Oh, Something went wrong!'
               } );
            } );
         },
         back: function () {
            app.Sound.play( app.Sound.sounds.click.button );

            page( pages[--index] );
         }
      };

   } );