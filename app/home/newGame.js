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

   var mode = { none: 'Friends List', search: 'Search Results' }

   return {
      gameOptions: gameOptions,
      gameOptionId: ko.observable(0),
      friends: ko.observableArray(),
      query: ko.observable(''),
      friendListMode: ko.observable(mode.none),
      activate: function () {
         var base = this;

         ko.computed(function () {
            var query = base.query();
            if (query == '') {
               app.trigger("server:friends", { username: 'ali', command: 'getAll' }, function (data) {
                  if (data.success) base.friends(data.friends);
               });
            } else {
               base.friendListMode(mode.search);
               app.trigger("server:friends", {
                  username: 'ali', command: 'search', friend: base.query()
               }, function (data) {
                  base.friends(data.fofs.concat(data.all));
               });
            }                        
         }).extend({ throttle: 300 });
      },
      binding: function () {
         return { cacheViews: false };
      },
      search: function () {
         var base = this;
         
      },
      addFriend: function (friend) {
         var base = this;         
         app.trigger("server:friends", {
            username: 'ali', command: 'add', friend: friend.username
         }, function () {
            base.query('');
         });
      },
      start: function () {
         var gameOptionId = this.gameOptionId();

         ctx.playerCount = gameOptions[gameOptionId].playerCount;

         app.navigate("game")
      }
   }
});