define(['plugins/router', 'durandal/app', 'api/datacontext', './_server'], function (router, app, ctx) {
 
  var activeItem = ko.observable();
  var Groups = ko.observableArray();
  var lastId = 0;

  return {
    activate: function () {
      app.trigger("server:manager:getBoards", {}, function (data) {
        var groups = Groups(), grpBy = 'level', items = data.boards;
        for (var i = 0; i < items.length; i++) {
          var obj = groups[items[i][grpBy]];
          if (!obj) {
            obj = groups[items[i][grpBy]] = {};
            obj.key = items[i][grpBy];
            obj.value = [];
          }
          obj.value.push(items[i]);
          lastId = items[i].id + 1;
        }
        activeItem(data[0]);
        Groups.valueHasMutated();
      });
    },

    groups: Groups,

    activeItem: activeItem,

    select: function (item, e) {
      activeItem(item);
    },
    
    edit: function (gameObject) {
      router.navigate('game-editor/edit/' + gameObject.id);
    },

    remove: function (gameObject) {
      app.dialog.show("confirm", {
        content: "Are you sure you want to remove this game board?", modal: true,
        doneText: 'YES', cancelText: 'NO'
      }).then(function (res) {
        if (res != "cancel") {
          app.trigger("server:manager:setBoard", {
            id: gameObject.id,
            destroy: true
          });
        }
      });
    },

    createNew: function () {
      router.navigate('game-editor/edit/new');
    },

    binding: function () {
      return { cacheViews: false };
    },

    deactivate: function () {
      
    }
  }
});