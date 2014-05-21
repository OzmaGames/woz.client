define( 'game/poem/index', [], function () {
   var dir = 'game/poem/';
   var pages = ['phrase', 'title', 'background', 'share'];
   var index = 0;

   var page = ko.observable( dir + pages[index] );      

   return window.vm = {
      page: page,
      hasBack: ko.computed( function () {
         page();
         return index != 0;
      }),
      next: function () {         
         page( dir + pages[++index] );
      },
      back: function () {
         page( dir + pages[--index] );
      }
   };

} );