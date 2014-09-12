define('shell', ['durandal/app', 'durandal/activator', 'knockout'], function (app, activator, ko) {

    var page = ko.observable('account/login');

    app.on('account:login', function (json) {
        if (json.success) {
            console.log(json);
            localStorage.setItem('token', json.token);
            localStorage.setItem('username', json.username);

            if (json.signedup) {
                localStorage.setItem('login-mode', 'signup');
                window.location = location.origin + '/play/#tutorial';
            } else {
                localStorage.setItem('login-mode', 'login');
                window.location = location.origin + '/play/#lobby';
            }
        }
    });

    function animateMe(p) {
        setTimeout(function () {
            p.animate({ opacity: 1 }, 4000, function () {
                setTimeout(function () {
                    p.animate({ opacity: 0 }, 4000, function () {
                        animateMe(p);
                    });
                }, 0 + Math.random() * 1000);
            });
        }, Math.random() * 10000);
    }

    return {
        activate: function (route) {
            this.trigViewChange = app.on('account:view:change').then(function (module) {
                page(module);
            });

            app.trigger('server:top-phrases', {}, function (phrases) {
                $('.phrases').empty();
                var i = 0;
                phrases.topPhrases.forEach(function (phrase) {
                    if (i == 10) return;
                    var p = $('<div/>', { 'class': 'phrase p' + i++, text: phrase});
                    $('.phrases').append(p);

                    //p.css({ opacity: 0 });
                    //animateMe(p);
                });
            });
        },

        page: page,

        compositionComplete: function () {

        },

        detached: function (view) {
            this.trigViewChange.off();
        }
    }
});