define(['durandal/app', 'api/datacontext'], function (app, ctx) {      
   
   var gameOptions = [
      {
         id: 0,
         title: 'play with friend',
         description: 'Choose from my friends list',
         playerCount: 2
      }, {
         id: 1,
         title: 'random opponent',
         description: 'Find an opponent automatically',
         playerCount: 2
      }, {
         id: 2,
         title: 'single play',
         description: 'Compete with yourself',
         playerCount: 1
      }
   ];   

   return {
      gameOptions: gameOptions,
      gameOptionId: ko.observable(0),
      friends: ko.observableArray(),
      query: ko.observable(''),
      activate: function () {
         var base = this;
         app.trigger("server:friends", { username: 'ali', command: 'getAll' }, function (data) {
            base.friends(data);
         });
      },
      binding: function () {
         return { cacheViews: false };
      },
      search: function () {
         var base = this;
         app.trigger("server:friends", {
            username: 'ali', command: 'search', friend: base.query()
         }, function (data) {
            base.friends(data);
         });
      },
      start: function () {
         var gameOptionId = this.gameOptionId();
   
         ctx.playerCount = gameOptions[gameOptionId].playerCount;
         
         app.navigate("game")
      }
   }
});