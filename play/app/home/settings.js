define(['plugins/router', 'durandal/app', 'api/datacontext'], function (router, app, ctx) {
    
    return {
        activate: function () {
            var base = this;
            return ctx.auth.then(function () {
                app.palette.dispose();
                app.dialog.closeAll();
                app.trigger("game:dispose");

                base.emailNew = ko.observable(ctx.user.emailNew());
                base.emailEnd = ko.observable(ctx.user.emailEnd());
                base.emailPhrase = ko.observable(ctx.user.emailPhrase());

                ctx.user.ready.then(function () {
                    base.emailNew(ctx.user.emailNew());
                    base.emailEnd(ctx.user.emailEnd());
                    base.emailPhrase(ctx.user.emailPhrase());

                    base.emailNew.subscribe(updateServer);
                    base.emailEnd.subscribe(updateServer);
                    base.emailPhrase.subscribe(updateServer);

                    function updateServer() {
                        app.trigger("server:user:email", {
                            command: 'notifications',
                            emailNew: base.emailNew(),
                            emailEnd: base.emailEnd(),
                            emailPhrase: base.emailPhrase()
                        }, function () {
                            ctx.user.refresh();
                        });
                    }
                });                
            });
        },
        binding: function () {
            return { cacheViews: false };
        },
        username: ctx.username,
        email: ctx.user.email,
        block: ctx.user.block,
        emailNew: ko.observable(false),
        emailEnd: ko.observable(false),
        emailPhrase: ko.observable(false),
        change: function () {
            app.dialog.showEmail();
        },
        changePassword: function () {
            app.dialog.showPassword();
        },
        removeBlocked: function (player) {
            ctx.user.block.del(player.username);
        },
        //deleteUsername: function () {
        //    app.dialog.confirm("This will delete the account <b>" + ctx.username + "</b> permanently!").then(function () {
        //        app.trigger("server:account:delete", { username: ctx.username }, function () {
        //            app.navigate('');
        //        });
        //    })
        //},
        attached: function () {
            app.Sound.play(app.Sound.sounds.pageTransition);
        }
    }
});