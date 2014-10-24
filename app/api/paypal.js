define('api/paypal', [], function () {    

    var model = {
        getToken: function (obj) {
            return $.Deferred(function (dfd) {
                app.trigger("server:payment:paypal-token", obj, function () {
                    dfd.resolve.apply(this, arguments);
                });
            });
            
        }
    };


    return model;
});