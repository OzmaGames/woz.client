define( 'api/ui/palette', [], function () {

   function Palette() {
      var base = this;

      this.items = ko.observableArray( [
         new Palette.Icon( "currency", "command", "fixed", 0 ),
         new Palette.Icon( "menu", "command", "fixed", null, "menu" ),
         new Palette.Icon( "fullscreen", "command", "fixed" )
      ] );

      this.fixedItemsCount = 3;

      this.fixedItems = ko.computed( function () {
         return ko.utils.arrayFilter( base.items(), function ( item ) { return item.place == "fixed"; } );
      } );

      this.rightItems = ko.computed( function () {
         return ko.utils.arrayFilter( base.items(), function ( item ) { return item.place == "right"; } );
      } );

      this.leftItems = ko.computed( function () {
         return ko.utils.arrayFilter( base.items(), function ( item ) { return item.place == "left"; } );
      } );

      this.get = function ( name ) {
         return ko.utils.arrayFirst( base.items(), function ( item ) {
            return item.name == name;
         } );
      }

      this.visible = ko.observable( true );
      this.hide = function ( obj ) {
         if ( obj ) base.visible.duration = obj.duration;
         base.visible( false );
         delete base.visible.duration;
      };
      this.show = function () {
         base.visible( true );
         base.adjustPalettes();
      };

      this.add = function () {
         var icon = new Palette.Icon( arguments[0], arguments[1], arguments[2], arguments[3], arguments[4] );
         base.items.push( icon );
         base.adjustPalettes();
         return icon;
      }

      this.dispose = function () {
         this.items.splice( this.fixedItemsCount );
      }
   }

   Palette.prototype.adjustPalettes = function ( value ) {
      $( '.palette:not(.fixed)' ).each( function ( i ) {
         var $el = $( this );
         if ( value === undefined ) {
            $el.css( 'y', ( window.innerHeight - $el.outerHeight() ) / 2 );
         } else {
            $el.css( 'y', value );
         }
      } );
   }

   Palette.prototype.compositionComplete = function () {
      var base = this;

      base.adjustPalettes();
      app.on( "app:resized" ).then( function () { base.adjustPalettes() } );
   }

   Palette.Icon = function ( name, type, place, content, title ) {
      var base = this;

      this.name = name;
      this.type = type || "command";
      this.place = place || "fixed";
      this.title = title || "";
      this.content = ko.observable( content || "" );

      var clickEvent, visible = ko.observable( true ),
         css = ko.observable( this.type + ' ' + this.name );

      this.click = function ( func ) {
         if ( typeof func == "function" ) {
            clickEvent = func;
            clickEvent.owner = this;
            return base;
         }
         if ( clickEvent ) {
            if ( base.type == "command" ) {
               app.Sound.play( app.Sound.sounds.click.command );
            } else {
               app.Sound.play( app.Sound.sounds.click.action );
            }
            clickEvent.apply( clickEvent.owner, arguments );
         }
      };

      this.visible = ko.computed( {
         read: visible,
         write: function ( value ) {
            if ( ko.isSubscribable( value ) ) {
               value.subscribe( function ( value ) {
                  visible( value );
               } );
            } else {
               visible( value );
            }
            return base;
         },
         owner: this
      } );

      this.css = ko.computed( {
         read: css,
         write: function ( value ) {
            if ( ko.isObservable( value ) ) {
            } else {
               value[base.type] = true;
               value[base.name] = true;
               css( value );
            }
            return base;
         }
      } );

      this.hide = function () { base.visible( false ); };
      this.show = function () { base.visible( true ); };
   }

   var p = new Palette();

   p.get( "fullscreen" ).click( function () {
      app.trigger( "app:fullscreen" );
   } ).hide();

   return p;
} );