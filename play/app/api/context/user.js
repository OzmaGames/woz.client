﻿define('api/context/user', ['durandal/app', './shop',
   'api/context/user.friends', 'api/context/user.block', 'api/context/user.poems'],
   function (app, shop, friends, block, poems) {

       return new User();

       function User() {
           var base = this, _user;

           this.username = '';
           this.besoz = ko.observable(0);
           this.email = ko.observable('');
           this.emailEnd = ko.observable(false);
           this.emailNew = ko.observable(false);
           this.emailPhrase = ko.observable(false);
           this.storage = ko.observable(0);
           this.level = ko.observable(0);
           this.xp = ko.observable(0);
           this.xpMax = ko.observable(100);
           this.title = ko.observable('');
           this.collections = ko.observableArray();
           this.friends = friends;
           this.poems = poems;
           this.ready = $.Deferred();

           this.loading = ko.observable(false);

           this.buyBesoz = function (amount) {
               return shop.besozes.buy(_user, { amount: amount }).then(function () {
                   base.besoz(base.besoz() + amount);
               }).fail(function () {
                   app.dialog.show('alert', { content: "rejected" });
               });
           }

           this.buyCollection = function (type, name) {
               return shop.collections.buy(_user, { type: type, name: name }).then(function () {
                   pullData();
               }).fail(function () {

               });
           }

           this.buyStorageSpace = function (storageObj) {
               return shop.storageSpaceList.buy(_user, storageObj).then(function () {
                   pullData();
               }).fail(function () {
                   app.dialog.showNoBesoz(storageObj.price);
               });
           }

           this.block = block;

           this.refresh = function () {
               pullData();
           }

           app.on("account:login").then(function (json) {
               userAuthenticated({ username: json.username, online: 1 });
           });

           app.on("user:authenticated").then(userAuthenticated);

           function userAuthenticated(user) {
               base.collections.removeAll();

               if (base.username = user.username, _user = user, _user.online) {
                   pullData();
               }
           }

           function pullData() {
               base.loading(true);

               app.trigger("server:user:info", { username: base.username, targetUsername: base.username }, function (data) {
                   if (data.success) {
                       ko.utils.arrayForEach(data.collections, function (collection) {
                           collection.desc = (collection.boosters && collection.boosters.length) ? ('+ ' + collection.boosters.map(function (b) { return b.longName })) : 'No boosters';
                       });
                       base.collections(data.collections);
                       base.besoz(data.besoz);
                       base.email(data.email);
                       base.emailNew(data.emailNew);
                       base.emailEnd(data.emailEnd);
                       base.emailPhrase(data.emailPhrase);
                       base.level(data.level);
                       base.storage(data.storage);
                       base.xp(data.xp);
                       base.xpMax(data.xpMax || 100);
                       base.title(data.title);

                       //if (data.besoz == 0) {
                       //    app.trigger('game:bubble', 'zeroBesoz');
                       //}
                       base.ready.resolve();
                   }
                   base.loading(false);
               });
           }
       }
   });