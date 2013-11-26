define(['plugins/router', 'durandal/app', 'api/datacontext', './_server'], function (router, app, ctx) {

   var Groups = ko.observableArray();

   return {
      height: ko.observable(100),
      activate: function () {
         Groups([]);
         app.trigger("server:manager:boards", { command: 'getAll' }, function (data) {
            var groups = Groups(), boards = data.boards;
            for (var i = 0; i < boards.length; i++) {               
               var board = boards[i], level = board.level;
               if (!groups.hasOwnProperty(level)) {
                  groups[level] = {
                     key: level,
                     value: ko.observableArray()
                  };
               }
               groups[level].value.push(board);
            }
            Groups.valueHasMutated();
         });
      },

      groups: Groups,

      edit: function (gameObject) {
         router.navigate('game-editor/edit/' + gameObject.id);
      },

      remove: function (gameObject) {
         app.dialog.show("confirm", {
            content: "Are you sure you want to remove this game board?", modal: true,
            doneText: 'YES', cancelText: 'NO'
         }).then(function (res) {
            if (res != "cancel") {
               app.trigger("server:manager:boards", {
                  id: gameObject.id,
                  command: 'delete'
               });
               var arr = Groups()[gameObject.level].value,
                 pos = arr.indexOf(gameObject);

               arr.splice(pos, 1);
            }
         });
      },

      beingRemove: function (el) {
         if (el.tagName == 'DIV') $(el).fadeOut(300);
      },

      createNew: function () {
         router.navigate('game-editor/edit/new');
      },

      binding: function () {
         return { cacheViews: false };
      },

      compositionComplete: function () {
         $(window).bind("resize", this, this.resize);
         this.resize({ data: this });
      },

      resize: function (e) {
         e.data.height($(window).innerHeight() - 120);
      },

      deactivate: function () {
         $(window).unbind("resize", this.resize);
      }
   }
});