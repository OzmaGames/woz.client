define(['durandal/app', 'plugins/router'], function (app, router) {

    var items = [
      { text: "New Game", hash: 'newGame', icon: 'mi-new' },
      { text: "Shop", hash: 'shop', icon: 'mi-shop' },
      { text: "My Games", hash: 'lobby', icon: 'mi-lobby' },
      { text: "My Poems", hash: 'poems', icon: 'mi-poems' },
      { text: "settings", hash: 'settings', icon: 'mi-settings' },
      { text: "tutorial", hash: 'tutorial/new', icon: 'mi-tutorial' },
      {
          text: "help", click: function () {
              app.loading(true);
              app.dialog.show("panel", { module: 'account/l-faq', fixed: true, css: 'wide' }, {
                  compositionComplete: function () {
                      app.loading(false);
                  }
              });
          }, icon: 'mi-help'
      },
      { text: "Logout", hash: 'account/logout', icon: 'mi-logout' }
    ];

    if (app.ctx.username == 'niklas') {
        // DEBUG
        // items.push({ text: "sound", hash: 'sound' });
    }

    function Menu() {
        this.images = true;

        var base = this;

        this.close = function (duration) {
            //console.log(duration);

            if (base.el.is(":visible")) {
                duration = duration || 500;
                var dfd = base.el.transition({ x: -10 }, duration / 2, 'ease')
                  .transition({ x: -100, opacity: 0 }, duration).promise().then(function () {
                      base.el.css({ x: 0 }).hide();
                  });

                base.el.parent().removeClass('modal');

                return dfd;
            }

            return base.el.promise();
        };

        this.onClose = function () { };

        this.items = items;

        this.nav = function (item) {
            app.Sound.play(app.Sound.sounds.click.button);
            if (item.click) {
                item.click();
            } else {
                router.navigate(item.hash);
            }
        };
    }

    Menu.prototype.attributes = {
        fixed: true,
        singleton: true
    };

    Menu.prototype.activate = function (data) {
 
    };

    Menu.prototype.bindingComplete = function (el) {
        this.el = $('.menu', el).hide();
        this.__dialog__.settings.bindingComplete(el);
    };

    Menu.prototype.load = function () {
        app.Sound.play(app.Sound.sounds.dialog.menu);
        var base = this;
        this.el.show().css({ x: -100, opacity: 0, top: '100px' })
          .transition({ x: -10, opacity: 1 }, 400, 'ease')
          .transition({ y: 0 }, 300);
    }

    Menu.prototype.canDeactivate = function (a, s, d) {
        var base = this;
        return this.close(200);
    };

    return Menu;
});