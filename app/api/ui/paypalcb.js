define('api/ui/paypalcb', [], function () {
    return {
        activate: function () {
            var json = arguments[0];

            json.payerID = json.payerID || json.PayerID;
            delete json.PayerID;

            app.trigger('server:payment:paypal-confirm', {
                paypal: {
                    payerID: json.payerID,
                    token: json.token
                }
            }, function (res) {
                if (res.success) {
                    ctx.user.refresh();
                    app.navigate((localStorage.getItem('returnedHash') || ''));
                    Task.run(function () {
                        app.dialog.showBesozBought();
                    }, 1000);
                } else {
                    app.navigate('#newGame');
                    Task.run(function () {
                        app.dialog.showBesozCancel();
                    }, 1000);
                }
            });
        },
        loading: app.loading
    };
});