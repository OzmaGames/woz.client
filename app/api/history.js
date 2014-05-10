define( 'api/history', [], function () {

   var arr = [];

   var model = {
      pushHistory: function ( obj ) {
         obj.time = new Date().toUTCString();
         obj.hash = location.hash;

         return arr.push( obj );
      },

      pushIssue: function ( obj ) {
         obj.time = new Date().toUTCString();
         obj.hash = location.hash;
         obj.event = 'issue';
         obj.index = arr.length;

         arr.push( obj );

         model.onError( obj );
      },

      onError: function () { },

      getHistory: function () {
         return arr;
      },

      getIssues: function () {
         return arr.filter( function ( item ) { return item.event == 'issue' } );
      }
   };


   return model;
} );