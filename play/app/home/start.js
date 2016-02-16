define(['plugins/router', 'durandal/app', 'api/datacontext'],
  function (router, app, ctx) {

    var $el, navInProgress = false;

    return {
      activate: function () {
        app.palette.dispose();
        app.dialog.closeAll();
        app.trigger("game:dispose");
      },
      binding: function () {
        return { cacheViews: false };
      },
      attached: function () {
        app.Sound.play(app.Sound.sounds.pageTransition);
      },
      compositionComplete: function(el) {
        $el = $(el).removeClass('page-init');
        navInProgress = false;
      },
      goto: function(type) {
        if (navInProgress) {
          return;
        }

        navInProgress = true;

        app.Sound.play(app.Sound.sounds.click.button);

        $el.addClass('page-init').delay(300).promise().done(function() {
          switch (type) {
            case 1:
              app.navigate('newGame');
              break;
            case 2:
              router.navigate('lobby');
              break;
            case 3:
              app.navigate('poems');
              break;
            case 4:
              app.navigate('shop');
              break;
          }
        });
      }
    }
  });