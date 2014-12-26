define( 'game/poem/background', ['api/datacontext'], function ( ctx ) {

   ctx.poem = ctx.poem || {};
   ctx.poem.title = ko.observable( '' );
   ctx.poem.tile = ko.observable();
   ctx.poem.settings = {
      visible: ko.observable( false ),
      shade: {
         name: "shade",
         min: 0,
         max: 3,
         value: ko.observable( 3 )
      },
      size: {
         name: "size",
         min: 17,
         max: 32,
         value: ko.observable( 22 )
      },
      current: ko.observable(),
      lightColor: ko.observable( true )
   }
   ctx.poem.settings.current( ctx.poem.settings.size );

   var tiles = ko.observableArray();
   var emptyTile = {};

   function playRangeSound() {
      app.Sound.play( app.Sound.sounds.poem.range );
   }

   ctx.poem.settings.size.value.subscribe( playRangeSound );
   ctx.poem.settings.shade.value.subscribe( playRangeSound );

   var ctor = function () {
      this.heading = 'Background and settings';
      this.valid = ko.observable( true );

      this.reset = function () {
         ctx.poem.title( '' );
         ctx.poem.tile( null );
         ctx.poem.settings.visible( false );
         ctx.poem.settings.shade.value( 3 );
         ctx.poem.settings.size.value( 22 );
         ctx.poem.settings.lightColor( true );
      }
   }

   ctor.prototype.action = function ( settingName ) {
      app.Sound.play( app.Sound.sounds.click.button );

      this.settings.visible( !!settingName );
      this.settings.current( settingName ? this.settings[settingName] : this.settings.size );
   }

   ctor.prototype.switchColor = function () {
      ctx.poem.settings.lightColor( ctx.poem.settings.lightColor() ^ true );

      app.Sound.play( app.Sound.sounds.click.button );
   }

   ctor.prototype.range = function ( min, max ) {      
      var output = [];
      while ( min != max ) {
         output.push( min++ );
      }
      output.push( min );
      return output;
   }

   ctor.prototype.activate = function () {
      this.tiles = tiles;
      this.tile = ctx.poem.tile;
      this.title = ctx.poem.title;
      this.phrases = ctx.poem.chosenPhrases;

      this.settings = ctx.poem.settings;

      tiles.removeAll();
      ko.utils.arrayPushAll( tiles, ctx.tiles() );
      tiles.push( emptyTile );
   }

   ctor.prototype.compositionComplete = function ( el ) {
      //this.el = el;
      //return $( this.el ).hide().slideDown().promise();
      //app.trigger( "dialog:adjust-size" );
      ctx.poem.title.valueHasMutated();
   }

   return ctor;

} );