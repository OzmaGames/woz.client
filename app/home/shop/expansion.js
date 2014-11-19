define(['durandal/app', 'api/datacontext'], function (app, ctx) {

    function ctor() {
        var base = this;

        this.userCollections = ctx.user.collections;
        this.collections = ctx.shop.collections;
        this.loading = ko.observable(false);

        ko.computed(function () {
            var userCollections = base.userCollections();
            var collections = base.collections();

            ko.utils.arrayForEach(collections, function (col) {
                var exist = ko.utils.arrayFirst(userCollections, function (uc) { return uc.shortName == col.shortName; });
                if (col.purchased) col.purchased(!!exist);
                else col.purchased = ko.observable(!!exist);

                col.flags = col.flags || (col.boosters.length ? col.boosters[0].flags : null);

                for (var i = 0; i < col.boosters.length; i++) {
                    var purchased = false;
                    if (exist) {
                        var bExist = ko.utils.arrayFirst(exist.boosters, function (booster) { return booster.shortName == col.boosters[i].shortName; });
                        purchased = !!bExist;
                    }
                    if (col.boosters[i].purchased) col.boosters[i].purchased(purchased);
                    else col.boosters[i].purchased = ko.observable(purchased);
                    col.boosters[i].collection = col;
                }
            });
        });
        ctx.shop.collections.load();

        this.buy = function (type) {
            if (this.purchased()) return;

            if (base.loading()) return;
            base.loading(true);

            var model = type;
            model.dependent = model.type == 'starter' ? null :
               model.collection.purchased() ? null : model.collection;
            model.totalPrice = +model.price + (model.dependent ? +model.dependent.price : 0);

            app.dialog.show("notice", {
                model: model,
                view: 'dialogs/pages/shop-collections',
                css: 'long',
                closeOnClick: false,
                fixed: true,
                centered: true,
                modal: true
            }).then(function (data) {
                if (data && data.confirm) {
                    if (model.dependent) {
                        ctx.user.buyCollection(model.collection.type, model.collection.shortName);
                    }
                    ctx.user.buyCollection(model.type, model.shortName).then(function () {
                        app.dialog.showAlertNote({
                            title: 'Thank you!',
                            content: 'The new collection is now available to be played.'
                        });
                    }).always(function () {
                        base.loading(false);
                    }).fail(function () {
                        app.dialog.showNoBesoz(model.totalPrice);
                    });
                } else {
                    base.loading(false);
                }
            });
        }
    }

    return ctor;
});