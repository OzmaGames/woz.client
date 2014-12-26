define( 'api/helper/Log', [], function () {

   var themes = {
      black: 'background: #222; color: #bada55',
      green: 'background: green; color: white',
      red: 'background: red; color: white',
      warn: 'background: orange; color: white',
      sound: 'background: blue; color: white'
   }

   function Log( theme ) {
      if ( theme == undefined ) theme = {};

      this.log = function ( title, data, _theme ) {         
         if ( _theme == undefined ) _theme = theme;         
         
         //console.log( '%c' + title, _theme, data );
      }
   }
   
   return {
      themes: themes,
      createLog: function ( theme ) {
         return new Log( theme );
      },
      instance: new Log
   }
} );