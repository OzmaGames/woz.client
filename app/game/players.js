define(['api/datacontext'], function (db) {
  return {
    players: db.players,
    activate: function (data) {
    },
    binding: function () {
      return { cacheViews: false };
    },
    deactivate: function () {

    }
  }
});