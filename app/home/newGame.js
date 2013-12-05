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

   var mode = {
      list: {
         mode: 'list',
         title: 'Friends List'
      }, search: {
         mode: 'search',
         title: 'Search Result'
      }
   }


   vm = {
      gameOptions: gameOptions,
      gameOptionId: ko.observable(0),
      friends: ko.observableArray(),
      query: ko.observable(''),
      friendListMode: ko.observable(mode.list),
      searchLoading: ko.observable(false),
      activeFriend: ko.observable(),
      friendSelected: function (friend) {
         this.activeFriend(friend);
      },
      activate: function () {
         this.activeFriend(null);                  
         app.dialog.close("all");
         $('#menu').remove();
      },
      binding: function () {
         return { cacheViews: false };
      },
      addFriend: function (friend) {
         var base = this;         
         app.trigger("server:friends", {
            username: ctx.username, command: 'add', friend: friend.username
         }, function () {
            base.query('');
         });
      },
      removeFriend: function (friend) {
         var base = this;
         app.trigger("server:friends", {
            username: ctx.username, command: 'delete', friend: friend.username
         }, function () {
            if (!base.query()) {
               base.query.valueHasMutated();
            }
         });
      },
      start: function () {
         if (vm.startEnable()) {
            var gameOptionId = this.gameOptionId();

            ctx.playerCount = gameOptions[gameOptionId].playerCount;

            app.navigate("game")
         } else {
            app.dialog.show("alert", { content: 'Please select a friend to continue.' });
         }
         
      }
   }

   vm.startEnable = ko.computed(function () {
      var gameOptionId = vm.gameOptionId(), activeFriend = vm.activeFriend();      
      return activeFriend || gameOptionId != 0;
   });

   ko.computed(function () {
      var query = vm.query();
      if (query == '') {
         app.trigger("server:friends", { username: ctx.username, command: 'getAll' }, function (data) {
            vm.friendListMode(mode.list);
            if (data.success) vm.friends(data.friends);
         });
      } else {
         vm.searchLoading(true);
         app.trigger("server:friends", {
            username: ctx.username, command: 'search', friend: vm.query()
         }, function (data) {
            vm.friendListMode(mode.search);
            vm.searchLoading(false);
            vm.friends(data.users);
         });
      }
   }).extend({ throttle: 300 });

   return vm;
});