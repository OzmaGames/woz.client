define(['durandal/system', 'durandal/app', 'durandal/composition', 'durandal/activator'],
  function (system, app, composition, activator) {

     var className = 'dialogs';
     var dialogs = {};

     function createBaseHost() {        
        var body = $('#app'), host = body.children('.' + className).get(0);
        if (host === undefined) {
           return $('<div/>', { 'class': className }).appendTo(body).get(0);
        }
        return host;
     }

     function getHost(moduleId, singleton) {
        var baseHost = createBaseHost();

        return system.defer(function (dfd) {
           if (singleton) {
              close(moduleId, { msg: 'queue' }).then(createHost);
           } else {
              createHost();
           }

           function createHost() {
              var host = $('<div/>', { 'module': moduleId }).appendTo(baseHost).get(0);
              dfd.resolve(host);
           }
        }).promise();
     }

     function ensureInstance(objOrModuleId) {
        return system.defer(function (dfd) {
           if (system.isString(objOrModuleId)) {
              system.acquire(objOrModuleId).then(function (module) {
                 dfd.resolve(system.resolveObject(module));
              });
           } else {
              dfd.resolve(objOrModuleId);
           }
        }).promise();
     }

     function createCompositionSettings(moduleId, dialogContext) {
        var settings = {
           model: moduleId,
           activate: false
        };

        if (dialogContext) {
           if (dialogContext.compositionComplete)
              settings.compositionComplete = dialogContext.compositionComplete;          
        }
        settings.bindingComplete = function () {
           var base = this.model;
           if (base.images) {
              var img = new Image;
              img.onload = function () {
                 base.load.apply(base);
              };
              img.src = base.el.css('background-image').replace(/url|[\'\"\(\)]/g, '');
           }
        }
        
        return settings;
     }

     function setup(key) {
        return close(key, { msg: 'new' }).pipe(function () {
           dialogs[key] = {
              ready: system.defer()
           };
        });
     }

     function show(obj, activationData, context) {
        return system.defer(function (dfd) {
           $.when(ensureInstance(obj), getHost(obj, true), setup(obj))
             .then(function (instance, host) {
                var dialogActivator = activator.create();
                dialogActivator.activateItem(instance, activationData).then(function (success) {
                   if (success) {
                      var theDialog = instance.__dialog__ = {
                         owner: instance,
                         context: context,
                         activator: dialogActivator,
                         close: function () {
                            var args = arguments, last = args.length ? args[args.length - 1] : {};

                            delete dialogs[obj];

                            if (last && last.forced) {
                               dfd.resolve.apply(dfd, args);
                            }
                            return dialogActivator.deactivateItem(instance, true).then(function () {
                               ko.removeNode(theDialog.host);
                               delete instance.__dialog__;
                               if (!last || !last.forced) {
                                  dfd.resolve.apply(dfd, args);
                               }
                            });
                         }
                      };

                      instance.onClose = function () {
                         var args = [];
                         for (var i = 0; i < arguments.length; i++) {
                            args.push(arguments[i]);
                         }
                         args.push({ forced: true });
                         theDialog.close.apply(this, args);
                      };

                      theDialog.settings = createCompositionSettings(instance, context);
                      theDialog.host = host;
                      composition.compose(theDialog.host, theDialog.settings);

                      if (dialogs[obj] && dialogs[obj].ready) {
                         dialogs[obj].ready.resolve(theDialog);
                      } else {
                         theDialog.close();
                      }
                   } else {
                      dfd.resolve(false);
                   }
                });
             });
        }).promise();
     }

     function close(key, deactivationData) {
        return system.defer(function (dfd) {
           if (key == 'all') {
              for (var name in dialogs) {
                 dialogs[name].ready.then(function (dialog) {
                    dialog.close(deactivationData).then(function () {
                       dfd.resolve();
                    });
                 });
              }
           } else {
              if (dialogs.hasOwnProperty(key)) {
                 dialogs[key].ready.then(function (dialog) {
                    dialog.close(deactivationData).then(function () {
                       dfd.resolve();
                    });
                 });
              } else {
                 dfd.resolve();
              }
           }
        }).promise();
     }

     return {
        _dialogs: dialogs,
        show: function (type, activationData, context) {
           return show('dialogs/templates/' + type, activationData, context);
        },
        close: function (type, deactivationData) {
           if (type == "all") return close("all", deactivationData);
           return close('dialogs/templates/' + type, deactivationData);
        }
     };
  });