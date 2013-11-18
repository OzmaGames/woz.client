define(['durandal/app', 'api/datacontext'], function (app, ctx) {

  return {
    binding: function () {
      return { cacheViews: false };
    },
    start: function () {
      app.navigate("game")
    }    
  }
});