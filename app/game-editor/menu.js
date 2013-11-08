define(['plugins/router', 'durandal/app', 'api/datacontext', './_server'], function (router, app, ctx) {

  var activeItem = ko.observable();
  var Groups = ko.observableArray();

  return {
    activate: function () {
      Groups([]);
      app.trigger("server:manager:manageBoards", { command: 'getAll' }, function (data) {
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
          app.trigger("server:manager:manageBoards", {
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
      if(el.tagName == 'DIV') $(el).fadeOut(300);
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