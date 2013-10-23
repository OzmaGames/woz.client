define(['plugins/router', 'durandal/app', 'api/datacontext'], function (router, app, ctx) {

  return {
    binding: function () {
      return { cacheViews: false };
    }    
  }
});