(function () {
/**
 * almond 0.2.6 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    function onResourceLoad(name, defined, deps){
        if(requirejs.onResourceLoad && name){
            requirejs.onResourceLoad({defined:defined}, {id:name}, deps);
        }
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }

        onResourceLoad(name, defined, args);
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../lib/almond-custom", function(){});

define('text',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});
define('text!account/index.html',[],function () { return '<div>    \r\n    <div data-bind="router: { transition: \'entrance\', cacheViews: false }"></div>\r\n</div>';});

define('durandal/system',["require","jquery"],function(e,t){function n(e){var t="[object "+e+"]";o["is"+e]=function(e){return s.call(e)==t}}var o,i=!1,r=Object.keys,a=Object.prototype.hasOwnProperty,s=Object.prototype.toString,l=!1,c=Array.isArray,u=Array.prototype.slice;if(Function.prototype.bind&&("object"==typeof console||"function"==typeof console)&&"object"==typeof console.log)try{["log","info","warn","error","assert","dir","clear","profile","profileEnd"].forEach(function(e){console[e]=this.call(console[e],console)},Function.prototype.bind)}catch(d){l=!0}e.on&&e.on("moduleLoaded",function(e,t){o.setModuleId(e,t)}),"undefined"!=typeof requirejs&&(requirejs.onResourceLoad=function(e,t){o.setModuleId(e.defined[t.id],t.id)});var p=function(){},h=function(){try{if("undefined"!=typeof console&&"function"==typeof console.log)if(window.opera)for(var e=0;e<arguments.length;)console.log("Item "+(e+1)+": "+arguments[e]),e++;else 1==u.call(arguments).length&&"string"==typeof u.call(arguments)[0]?console.log(u.call(arguments).toString()):console.log.apply(console,u.call(arguments));else Function.prototype.bind&&!l||"undefined"==typeof console||"object"!=typeof console.log||Function.prototype.call.call(console.log,console,u.call(arguments))}catch(t){}},f=function(e){if(e instanceof Error)throw e;throw new Error(e)};o={version:"2.0.1",noop:p,getModuleId:function(e){return e?"function"==typeof e?e.prototype.__moduleId__:"string"==typeof e?null:e.__moduleId__:null},setModuleId:function(e,t){return e?"function"==typeof e?(e.prototype.__moduleId__=t,void 0):("string"!=typeof e&&(e.__moduleId__=t),void 0):void 0},resolveObject:function(e){return o.isFunction(e)?new e:e},debug:function(e){return 1==arguments.length&&(i=e,i?(this.log=h,this.error=f,this.log("Debug:Enabled")):(this.log("Debug:Disabled"),this.log=p,this.error=p)),i},log:p,error:p,assert:function(e,t){e||o.error(new Error(t||"Assert:Failed"))},defer:function(e){return t.Deferred(e)},guid:function(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(e){var t=0|16*Math.random(),n="x"==e?t:8|3&t;return n.toString(16)})},acquire:function(){var t,n=arguments[0],i=!1;return o.isArray(n)?(t=n,i=!0):t=u.call(arguments,0),this.defer(function(n){e(t,function(){var e=arguments;setTimeout(function(){e.length>1||i?n.resolve(u.call(e,0)):n.resolve(e[0])},1)},function(e){n.reject(e)})}).promise()},extend:function(e){for(var t=u.call(arguments,1),n=0;n<t.length;n++){var o=t[n];if(o)for(var i in o)e[i]=o[i]}return e},wait:function(e){return o.defer(function(t){setTimeout(t.resolve,e)}).promise()}},o.keys=r||function(e){if(e!==Object(e))throw new TypeError("Invalid object");var t=[];for(var n in e)a.call(e,n)&&(t[t.length]=n);return t},o.isElement=function(e){return!(!e||1!==e.nodeType)},o.isArray=c||function(e){return"[object Array]"==s.call(e)},o.isObject=function(e){return e===Object(e)},o.isBoolean=function(e){return"boolean"==typeof e},o.isPromise=function(e){return e&&o.isFunction(e.then)};for(var g=["Arguments","Function","String","Number","Date","RegExp"],v=0;v<g.length;v++)n(g[v]);return o});
define('durandal/viewEngine',["durandal/system","jquery"],function(e,t){var n;return n=t.parseHTML?function(e){return t.parseHTML(e)}:function(e){return t(e).get()},{viewExtension:".html",viewPlugin:"text",isViewUrl:function(e){return-1!==e.indexOf(this.viewExtension,e.length-this.viewExtension.length)},convertViewUrlToViewId:function(e){return e.substring(0,e.length-this.viewExtension.length)},convertViewIdToRequirePath:function(e){return this.viewPlugin+"!"+e+this.viewExtension},parseMarkup:n,processMarkup:function(e){var t=this.parseMarkup(e);return this.ensureSingleElement(t)},ensureSingleElement:function(e){if(1==e.length)return e[0];for(var n=[],o=0;o<e.length;o++){var i=e[o];if(8!=i.nodeType){if(3==i.nodeType){var r=/\S/.test(i.nodeValue);if(!r)continue}n.push(i)}}return n.length>1?t(n).wrapAll('<div class="durandal-wrapper"></div>').parent().get(0):n[0]},createView:function(t){var n=this,o=this.convertViewIdToRequirePath(t);return e.defer(function(i){e.acquire(o).then(function(e){var o=n.processMarkup(e);o.setAttribute("data-view",t),i.resolve(o)}).fail(function(e){n.createFallbackView(t,o,e).then(function(e){e.setAttribute("data-view",t),i.resolve(e)})})}).promise()},createFallbackView:function(t,n){var o=this,i='View Not Found. Searched for "'+t+'" via path "'+n+'".';return e.defer(function(e){e.resolve(o.processMarkup('<div class="durandal-view-404">'+i+"</div>"))}).promise()}}});
define('durandal/viewLocator',["durandal/system","durandal/viewEngine"],function(e,t){function n(e,t){for(var n=0;n<e.length;n++){var o=e[n],i=o.getAttribute("data-view");if(i==t)return o}}function o(e){return(e+"").replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g,"\\$1")}return{useConvention:function(e,t,n){e=e||"viewmodels",t=t||"views",n=n||t;var i=new RegExp(o(e),"gi");this.convertModuleIdToViewId=function(e){return e.replace(i,t)},this.translateViewIdToArea=function(e,t){return t&&"partial"!=t?n+"/"+t+"/"+e:n+"/"+e}},locateViewForObject:function(t,n,o){var i;if(t.getView&&(i=t.getView()))return this.locateView(i,n,o);if(t.viewUrl)return this.locateView(t.viewUrl,n,o);var r=e.getModuleId(t);return r?this.locateView(this.convertModuleIdToViewId(r),n,o):this.locateView(this.determineFallbackViewId(t),n,o)},convertModuleIdToViewId:function(e){return e},determineFallbackViewId:function(e){var t=/function (.{1,})\(/,n=t.exec(e.constructor.toString()),o=n&&n.length>1?n[1]:"";return"views/"+o},translateViewIdToArea:function(e){return e},locateView:function(o,i,r){if("string"==typeof o){var a;if(a=t.isViewUrl(o)?t.convertViewUrlToViewId(o):o,i&&(a=this.translateViewIdToArea(a,i)),r){var s=n(r,a);if(s)return e.defer(function(e){e.resolve(s)}).promise()}return t.createView(a)}return e.defer(function(e){e.resolve(o)}).promise()}}});
define('durandal/binder',["durandal/system","knockout"],function(e,t){function n(t){return void 0===t?{applyBindings:!0}:e.isBoolean(t)?{applyBindings:t}:(void 0===t.applyBindings&&(t.applyBindings=!0),t)}function o(o,c,d,u){if(!c||!d)return i.throwOnErrors?e.error(a):e.log(a,c,u),void 0;if(!c.getAttribute)return i.throwOnErrors?e.error(r):e.log(r,c,u),void 0;var p=c.getAttribute("data-view");try{var h;return o&&o.binding&&(h=o.binding(c)),h=n(h),i.binding(u,c,h),h.applyBindings?(e.log("Binding",p,u),t.applyBindings(d,c)):o&&t.utils.domData.set(c,l,{$data:o}),i.bindingComplete(u,c,h),o&&o.bindingComplete&&o.bindingComplete(c),t.utils.domData.set(c,s,h),h}catch(f){f.message=f.message+";\nView: "+p+";\nModuleId: "+e.getModuleId(u),i.throwOnErrors?e.error(f):e.log(f.message)}}var i,a="Insufficient Information to Bind",r="Unexpected View Type",s="durandal-binding-instruction",l="__ko_bindingContext__";return i={binding:e.noop,bindingComplete:e.noop,throwOnErrors:!1,getBindingInstruction:function(e){return t.utils.domData.get(e,s)},bindContext:function(e,t,n){return n&&e&&(e=e.createChildContext(n)),o(n,t,e,n||(e?e.$data:null))},bind:function(e,t){return o(e,t,e,e)}}});
define('durandal/activator',["durandal/system","knockout"],function(e,t){function n(e){return void 0==e&&(e={}),e.closeOnDeactivate||(e.closeOnDeactivate=c.defaults.closeOnDeactivate),e.beforeActivate||(e.beforeActivate=c.defaults.beforeActivate),e.afterDeactivate||(e.afterDeactivate=c.defaults.afterDeactivate),e.affirmations||(e.affirmations=c.defaults.affirmations),e.interpretResponse||(e.interpretResponse=c.defaults.interpretResponse),e.areSameItem||(e.areSameItem=c.defaults.areSameItem),e}function o(t,n,o){return e.isArray(o)?t[n].apply(t,o):t[n](o)}function i(t,n,o,i,a){if(t&&t.deactivate){e.log("Deactivating",t);var r;try{r=t.deactivate(n)}catch(s){return e.error(s),i.resolve(!1),void 0}r&&r.then?r.then(function(){o.afterDeactivate(t,n,a),i.resolve(!0)},function(t){e.log(t),i.resolve(!1)}):(o.afterDeactivate(t,n,a),i.resolve(!0))}else t&&o.afterDeactivate(t,n,a),i.resolve(!0)}function a(t,n,i,a){if(t)if(t.activate){e.log("Activating",t);var r;try{r=o(t,"activate",a)}catch(s){return e.error(s),i(!1),void 0}r&&r.then?r.then(function(){n(t),i(!0)},function(t){e.log(t),i(!1)}):(n(t),i(!0))}else n(t),i(!0);else i(!0)}function r(t,n,o){return o.lifecycleData=null,e.defer(function(i){if(t&&t.canDeactivate){var a;try{a=t.canDeactivate(n)}catch(r){return e.error(r),i.resolve(!1),void 0}a.then?a.then(function(e){o.lifecycleData=e,i.resolve(o.interpretResponse(e))},function(t){e.error(t),i.resolve(!1)}):(o.lifecycleData=a,i.resolve(o.interpretResponse(a)))}else i.resolve(!0)}).promise()}function s(t,n,i,a){return i.lifecycleData=null,e.defer(function(r){if(t==n())return r.resolve(!0),void 0;if(t&&t.canActivate){var s;try{s=o(t,"canActivate",a)}catch(l){return e.error(l),r.resolve(!1),void 0}s.then?s.then(function(e){i.lifecycleData=e,r.resolve(i.interpretResponse(e))},function(t){e.error(t),r.resolve(!1)}):(i.lifecycleData=s,r.resolve(i.interpretResponse(s)))}else r.resolve(!0)}).promise()}function l(o,l){var c,d=t.observable(null);l=n(l);var u=t.computed({read:function(){return d()},write:function(e){u.viaSetter=!0,u.activateItem(e)}});return u.__activator__=!0,u.settings=l,l.activator=u,u.isActivating=t.observable(!1),u.canDeactivateItem=function(e,t){return r(e,t,l)},u.deactivateItem=function(t,n){return e.defer(function(e){u.canDeactivateItem(t,n).then(function(o){o?i(t,n,l,e,d):(u.notifySubscribers(),e.resolve(!1))})}).promise()},u.canActivateItem=function(e,t){return s(e,d,l,t)},u.activateItem=function(t,n){var o=u.viaSetter;return u.viaSetter=!1,e.defer(function(r){if(u.isActivating())return r.resolve(!1),void 0;u.isActivating(!0);var s=d();return l.areSameItem(s,t,c,n)?(u.isActivating(!1),r.resolve(!0),void 0):(u.canDeactivateItem(s,l.closeOnDeactivate).then(function(p){p?u.canActivateItem(t,n).then(function(p){p?e.defer(function(e){i(s,l.closeOnDeactivate,l,e)}).promise().then(function(){t=l.beforeActivate(t,n),a(t,d,function(e){c=n,u.isActivating(!1),r.resolve(e)},n)}):(o&&u.notifySubscribers(),u.isActivating(!1),r.resolve(!1))}):(o&&u.notifySubscribers(),u.isActivating(!1),r.resolve(!1))}),void 0)}).promise()},u.canActivate=function(){var e;return o?(e=o,o=!1):e=u(),u.canActivateItem(e)},u.activate=function(){var e;return o?(e=o,o=!1):e=u(),u.activateItem(e)},u.canDeactivate=function(e){return u.canDeactivateItem(u(),e)},u.deactivate=function(e){return u.deactivateItem(u(),e)},u.includeIn=function(e){e.canActivate=function(){return u.canActivate()},e.activate=function(){return u.activate()},e.canDeactivate=function(e){return u.canDeactivate(e)},e.deactivate=function(e){return u.deactivate(e)}},l.includeIn?u.includeIn(l.includeIn):o&&u.activate(),u.forItems=function(t){l.closeOnDeactivate=!1,l.determineNextItemToActivate=function(e,t){var n=t-1;return-1==n&&e.length>1?e[1]:n>-1&&n<e.length-1?e[n]:null},l.beforeActivate=function(e){var n=u();if(e){var o=t.indexOf(e);-1==o?t.push(e):e=t()[o]}else e=l.determineNextItemToActivate(t,n?t.indexOf(n):0);return e},l.afterDeactivate=function(e,n){n&&t.remove(e)};var n=u.canDeactivate;u.canDeactivate=function(o){return o?e.defer(function(e){function n(){for(var t=0;t<a.length;t++)if(!a[t])return e.resolve(!1),void 0;e.resolve(!0)}for(var i=t(),a=[],r=0;r<i.length;r++)u.canDeactivateItem(i[r],o).then(function(e){a.push(e),a.length==i.length&&n()})}).promise():n()};var o=u.deactivate;return u.deactivate=function(n){return n?e.defer(function(e){function o(o){u.deactivateItem(o,n).then(function(){a++,t.remove(o),a==r&&e.resolve()})}for(var i=t(),a=0,r=i.length,s=0;r>s;s++)o(i[s])}).promise():o()},u},u}var c,d={closeOnDeactivate:!0,affirmations:["yes","ok","true"],interpretResponse:function(n){return e.isObject(n)&&(n=n.can||!1),e.isString(n)?-1!==t.utils.arrayIndexOf(this.affirmations,n.toLowerCase()):n},areSameItem:function(e,t){return e==t},beforeActivate:function(e){return e},afterDeactivate:function(e,t,n){t&&n&&n(null)}};return c={defaults:d,create:l,isActivator:function(e){return e&&e.__activator__}}});
define('durandal/composition',["durandal/system","durandal/viewLocator","durandal/binder","durandal/viewEngine","durandal/activator","jquery","knockout"],function(e,t,n,o,i,a,r){function s(e){for(var t=[],n={childElements:t,activeView:null},o=r.virtualElements.firstChild(e);o;)1==o.nodeType&&(t.push(o),o.getAttribute(x)&&(n.activeView=o)),o=r.virtualElements.nextSibling(o);return n.activeView||(n.activeView=t[0]),n}function l(){T--,0===T&&setTimeout(function(){for(var t=k.length;t--;)try{k[t]()}catch(n){e.error(n)}k=[]},1)}function c(e){delete e.activeView,delete e.viewElements}function d(t,n,o){if(o)n();else if(t.activate&&t.model&&t.model.activate){var i;try{i=e.isArray(t.activationData)?t.model.activate.apply(t.model,t.activationData):t.model.activate(t.activationData),i&&i.then?i.then(n,function(t){e.error(t),n()}):i||void 0===i?n():(l(),c(t))}catch(a){e.error(a)}}else n()}function u(){var t=this;if(t.activeView&&t.activeView.removeAttribute(x),t.child)try{t.model&&t.model.attached&&(t.composingNewView||t.alwaysTriggerAttach)&&t.model.attached(t.child,t.parent,t),t.attached&&t.attached(t.child,t.parent,t),t.child.setAttribute(x,!0),t.composingNewView&&t.model&&t.model.detached&&r.utils.domNodeDisposal.addDisposeCallback(t.child,function(){try{t.model.detached(t.child,t.parent,t)}catch(n){e.error(n)}})}catch(n){e.error(n)}t.triggerAttach=e.noop}function p(t){if(e.isString(t.transition)&&t.model&&t.model.noTransite!==!0){if(t.activeView){if(t.activeView==t.child)return!1;if(!t.child)return!0;if(t.skipTransitionOnSameViewId){var n=t.activeView.getAttribute("data-view"),o=t.child.getAttribute("data-view");return n!=o}}return!0}return!1}function h(e){for(var t=0,n=e.length,o=[];n>t;t++){var i=e[t].cloneNode(!0);o.push(i)}return o}function f(e){var t=h(e.parts),n=w.getParts(t,null,!0),o=w.getParts(e.child);for(var i in n)a(o[i]).replaceWith(n[i])}function g(t){var n,o,i=r.virtualElements.childNodes(t.parent);if(!e.isArray(i)){var a=[];for(n=0,o=i.length;o>n;n++)a[n]=i[n];i=a}for(n=1,o=i.length;o>n;n++)r.removeNode(i[n])}function m(e){r.utils.domData.set(e,$,e.style.display),e.style.display="none"}function v(e){e.style.display=r.utils.domData.get(e,$)}function y(e){var t=e.getAttribute("data-bind");if(!t)return!1;for(var n=0,o=D.length;o>n;n++)if(t.indexOf(D[n])>-1)return!0;return!1}var w,b={},x="data-active-view",k=[],T=0,C="durandal-composition-data",S="data-part",_=["model","view","transition","area","strategy","activationData"],$="durandal-visibility-data",D=["compose:"],A={complete:function(e){k.push(e)}};return w={composeBindings:D,convertTransitionToModuleId:function(e){return"transitions/"+e},defaultTransitionName:null,current:A,addBindingHandler:function(e,t,n){var o,i,a="composition-handler-"+e;t=t||r.bindingHandlers[e],n=n||function(){return void 0},i=r.bindingHandlers[e]={init:function(e,o,i,s,l){if(T>0){var c={trigger:r.observable(null)};w.current.complete(function(){t.init&&t.init(e,o,i,s,l),t.update&&(r.utils.domData.set(e,a,t),c.trigger("trigger"))}),r.utils.domData.set(e,a,c)}else r.utils.domData.set(e,a,t),t.init&&t.init(e,o,i,s,l);return n(e,o,i,s,l)},update:function(e,t,n,o,i){var s=r.utils.domData.get(e,a);return s.update?s.update(e,t,n,o,i):(s.trigger&&s.trigger(),void 0)}};for(o in t)"init"!==o&&"update"!==o&&(i[o]=t[o])},getParts:function(e,t,n){if(t=t||{},!e)return t;void 0===e.length&&(e=[e]);for(var o=0,i=e.length;i>o;o++){var a=e[o];if(a.getAttribute){if(!n&&y(a))continue;var r=a.getAttribute(S);r&&(t[r]=a),!n&&a.hasChildNodes()&&w.getParts(a.childNodes,t)}}return t},cloneNodes:h,finalize:function(t){if(void 0===t.transition&&(t.transition=this.defaultTransitionName),t.child||t.activeView)if(p(t)){var o=this.convertTransitionToModuleId(t.transition);e.acquire(o).then(function(e){t.transition=e,e(t).then(function(){if(t.cacheViews){if(t.activeView){var e=n.getBindingInstruction(t.activeView);e&&void 0!=e.cacheViews&&!e.cacheViews&&r.removeNode(t.activeView)}}else t.child?g(t):r.virtualElements.emptyNode(t.parent);t.triggerAttach(),l(),c(t)})}).fail(function(t){e.error("Failed to load transition ("+o+"). Details: "+t.message)})}else{if(t.child!=t.activeView){if(t.cacheViews&&t.activeView){var i=n.getBindingInstruction(t.activeView);!i||void 0!=i.cacheViews&&!i.cacheViews?r.removeNode(t.activeView):m(t.activeView)}t.child?(t.cacheViews||g(t),v(t.child)):t.cacheViews||r.virtualElements.emptyNode(t.parent)}t.triggerAttach(),l(),c(t)}else t.cacheViews||r.virtualElements.emptyNode(t.parent),t.triggerAttach(),l(),c(t)},bindAndShow:function(e,t,i){t.child=e,t.composingNewView=t.cacheViews?-1==r.utils.arrayIndexOf(t.viewElements,e):!0,d(t,function(){if(t.binding&&t.binding(t.child,t.parent,t),t.preserveContext&&t.bindingContext)t.composingNewView&&(t.parts&&f(t),m(e),r.virtualElements.prepend(t.parent,e),n.bindContext(t.bindingContext,e,t.model));else if(e){var i=t.model||b,a=r.dataFor(e);if(a!=i){if(!t.composingNewView)return r.removeNode(e),o.createView(e.getAttribute("data-view")).then(function(e){w.bindAndShow(e,t,!0)}),void 0;t.parts&&f(t),m(e),r.virtualElements.prepend(t.parent,e),n.bind(i,e)}}w.finalize(t)},i)},defaultStrategy:function(e){return t.locateViewForObject(e.model,e.area,e.viewElements)},getSettings:function(t){var n,a=t(),s=r.utils.unwrapObservable(a)||{},l=i.isActivator(a);if(e.isString(s))return s=o.isViewUrl(s)?{view:s}:{model:s,activate:!0};if(n=e.getModuleId(s))return s={model:s,activate:!0};!l&&s.model&&(l=i.isActivator(s.model));for(var c in s)s[c]=-1!=r.utils.arrayIndexOf(_,c)?r.utils.unwrapObservable(s[c]):s[c];return l?s.activate=!1:void 0===s.activate&&(s.activate=!0),s},executeStrategy:function(e){e.strategy(e).then(function(t){w.bindAndShow(t,e)})},inject:function(n){return n.model?n.view?(t.locateView(n.view,n.area,n.viewElements).then(function(e){w.bindAndShow(e,n)}),void 0):(n.strategy||(n.strategy=this.defaultStrategy),e.isString(n.strategy)?e.acquire(n.strategy).then(function(e){n.strategy=e,w.executeStrategy(n)}).fail(function(t){e.error("Failed to load view strategy ("+n.strategy+"). Details: "+t.message)}):this.executeStrategy(n),void 0):(this.bindAndShow(null,n),void 0)},compose:function(n,o,i,a){T++,a||(o=w.getSettings(function(){return o},n)),o.compositionComplete&&k.push(function(){o.compositionComplete(o.child,o.parent,o)}),k.push(function(){o.composingNewView&&o.model&&o.model.compositionComplete&&o.model.compositionComplete(o.child,o.parent,o)});var r=s(n);o.activeView=r.activeView,o.parent=n,o.triggerAttach=u,o.bindingContext=i,o.cacheViews&&!o.viewElements&&(o.viewElements=r.childElements),o.model?e.isString(o.model)?e.acquire(o.model).then(function(t){o.model=e.resolveObject(t),w.inject(o)}).fail(function(t){e.error("Failed to load composed module ("+o.model+"). Details: "+t.message)}):w.inject(o):o.view?(o.area=o.area||"partial",o.preserveContext=!0,t.locateView(o.view,o.area,o.viewElements).then(function(e){w.bindAndShow(e,o)})):this.bindAndShow(null,o)}},r.bindingHandlers.compose={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,i,a){var s=w.getSettings(t,e);if(s.mode){var l=r.utils.domData.get(e,C);if(!l){var c=r.virtualElements.childNodes(e);l={},"inline"===s.mode?l.view=o.ensureSingleElement(c):"templated"===s.mode&&(l.parts=h(c)),r.virtualElements.emptyNode(e),r.utils.domData.set(e,C,l)}"inline"===s.mode?s.view=l.view.cloneNode(!0):"templated"===s.mode&&(s.parts=l.parts),s.preserveContext=!0}w.compose(e,s,a,!0)}},r.virtualElements.allowedBindings.compose=!0,w});
define('durandal/events',["durandal/system"],function(e){var t=/\s+/,n=function(){},o=function(e,t){this.owner=e,this.events=t};return o.prototype.then=function(e,t){return this.callback=e||this.callback,this.context=t||this.context,this.callback?(this.owner.on(this.events,this.callback,this.context),this):this},o.prototype.on=o.prototype.then,o.prototype.off=function(){return this.owner.off(this.events,this.callback,this.context),this},n.prototype.on=function(e,n,i){var a,r,s;if(n){for(a=this.callbacks||(this.callbacks={}),e=e.split(t);r=e.shift();)s=a[r]||(a[r]=[]),s.push(n,i);return this}return new o(this,e)},n.prototype.off=function(n,o,i){var a,r,s,l;if(!(r=this.callbacks))return this;if(!(n||o||i))return delete this.callbacks,this;for(n=n?n.split(t):e.keys(r);a=n.shift();)if((s=r[a])&&(o||i))for(l=s.length-2;l>=0;l-=2)o&&s[l]!==o||i&&s[l+1]!==i||s.splice(l,2);else delete r[a];return this},n.prototype.trigger=function(e){var n,o,i,a,r,s,l,c;if(!(o=this.callbacks))return this;for(c=[],e=e.split(t),a=1,r=arguments.length;r>a;a++)c[a-1]=arguments[a];for(;n=e.shift();){if((l=o.all)&&(l=l.slice()),(i=o[n])&&(i=i.slice()),i)for(a=0,r=i.length;r>a;a+=2)i[a].apply(i[a+1]||this,c);if(l)for(s=[n].concat(c),a=0,r=l.length;r>a;a+=2)l[a].apply(l[a+1]||this,s)}return this},n.prototype.proxy=function(e){var t=this;return function(n){t.trigger(e,n)}},n.includeIn=function(e){e.on=n.prototype.on,e.off=n.prototype.off,e.trigger=n.prototype.trigger,e.proxy=n.prototype.proxy},n});
define('durandal/app',["durandal/system","durandal/viewEngine","durandal/composition","durandal/events","jquery"],function(e,t,n,o,i){function a(){return e.defer(function(t){return 0==s.length?(t.resolve(),void 0):(e.acquire(s).then(function(n){for(var o=0;o<n.length;o++){var i=n[o];if(i.install){var a=l[o];e.isObject(a)||(a={}),i.install(a),e.log("Plugin:Installed "+s[o])}else e.log("Plugin:Loaded "+s[o])}t.resolve()}).fail(function(t){e.error("Failed to load plugin(s). Details: "+t.message)}),void 0)}).promise()}var r,s=[],l=[];return r={title:"Application",configurePlugins:function(t,n){var o=e.keys(t);n=n||"plugins/",-1===n.indexOf("/",n.length-1)&&(n+="/");for(var i=0;i<o.length;i++){var a=o[i];s.push(n+a),l.push(t[a])}},start:function(){return e.log("Application:Starting"),this.title&&(document.title=this.title),e.defer(function(t){i(function(){a().then(function(){t.resolve(),e.log("Application:Started")})})}).promise()},setRoot:function(o,i,a){var r,s={activate:!0,transition:i};r=!a||e.isString(a)?document.getElementById(a||"applicationHost"):a,e.isString(o)?t.isViewUrl(o)?s.view=o:s.model=o:s.model=o,n.compose(r,s)}},o.includeIn(r),r});
define('plugins/history',["durandal/system","jquery"],function(e,t){function n(e,t,n){if(n){var o=e.href.replace(/(javascript:|#).*$/,"");e.replace(o+"#"+t)}else e.hash="#"+t}var o=/^[#\/]|\s+$/g,i=/^\/+|\/+$/g,a=/msie [\w.]+/,r=/\/$/,s={interval:50,active:!1};return"undefined"!=typeof window&&(s.location=window.location,s.history=window.history),s.getHash=function(e){var t=(e||s).location.href.match(/#(.*)$/);return t?t[1]:""},s.getFragment=function(e,t){if(null==e)if(s._hasPushState||!s._wantsHashChange||t){e=s.location.pathname+s.location.search;var n=s.root.replace(r,"");e.indexOf(n)||(e=e.substr(n.length))}else e=s.getHash();return e.replace(o,"")},s.activate=function(n){s.active&&e.error("History has already been activated."),s.active=!0,s.options=e.extend({},{root:"/"},s.options,n),s.root=s.options.root,s._wantsHashChange=s.options.hashChange!==!1,s._wantsPushState=!!s.options.pushState,s._hasPushState=!!(s.options.pushState&&s.history&&s.history.pushState);var r=s.getFragment(),l=document.documentMode,c=a.exec(navigator.userAgent.toLowerCase())&&(!l||7>=l);s.root=("/"+s.root+"/").replace(i,"/"),c&&s._wantsHashChange&&(s.iframe=t('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo("body")[0].contentWindow,s.navigate(r,!1)),s._hasPushState?t(window).on("popstate",s.checkUrl):s._wantsHashChange&&"onhashchange"in window&&!c?t(window).on("hashchange",s.checkUrl):s._wantsHashChange&&(s._checkUrlInterval=setInterval(s.checkUrl,s.interval)),s.fragment=r;var d=s.location,u=d.pathname.replace(/[^\/]$/,"$&/")===s.root;if(s._wantsHashChange&&s._wantsPushState){if(!s._hasPushState&&!u)return s.fragment=s.getFragment(null,!0),s.location.replace(s.root+s.location.search+"#"+s.fragment),!0;s._hasPushState&&u&&d.hash&&(this.fragment=s.getHash().replace(o,""),this.history.replaceState({},document.title,s.root+s.fragment+d.search))}return s.options.silent?void 0:s.loadUrl()},s.deactivate=function(){t(window).off("popstate",s.checkUrl).off("hashchange",s.checkUrl),clearInterval(s._checkUrlInterval),s.active=!1},s.checkUrl=function(){var e=s.getFragment();return e===s.fragment&&s.iframe&&(e=s.getFragment(s.getHash(s.iframe))),e===s.fragment?!1:(s.iframe&&s.navigate(e,!1),s.loadUrl(),void 0)},s.loadUrl=function(e){var t=s.fragment=s.getFragment(e);return s.options.routeHandler?s.options.routeHandler(t):!1},s.navigate=function(t,o){if(!s.active)return!1;if(void 0===o?o={trigger:!0}:e.isBoolean(o)&&(o={trigger:o}),t=s.getFragment(t||""),s.fragment!==t){s.fragment=t;var i=s.root+t;if(""===t&&"/"!==i&&(i=i.slice(0,-1)),s._hasPushState)s.history[o.replace?"replaceState":"pushState"]({},document.title,i);else{if(!s._wantsHashChange)return s.location.assign(i);n(s.location,t,o.replace),s.iframe&&t!==s.getFragment(s.getHash(s.iframe))&&(o.replace||s.iframe.document.open().close(),n(s.iframe.location,t,o.replace))}return o.trigger?s.loadUrl(t):void 0}},s.navigateBack=function(){s.history.back()},s});
define('plugins/router',["durandal/system","durandal/app","durandal/activator","durandal/events","durandal/composition","plugins/history","knockout","jquery"],function(e,t,n,o,i,a,r,s){function l(e){return e=e.replace(m,"\\$&").replace(f,"(?:$1)?").replace(g,function(e,t){return t?e:"([^/]+)"}).replace(v,"(.*?)"),new RegExp("^"+e+"$")}function c(e){var t=e.indexOf(":"),n=t>0?t-1:e.length;return e.substring(0,n)}function u(e,t){return-1!==e.indexOf(t,e.length-t.length)}function d(e,t){if(!e||!t)return!1;if(e.length!=t.length)return!1;for(var n=0,o=e.length;o>n;n++)if(e[n]!=t[n])return!1;return!0}var p,h,f=/\((.*?)\)/g,g=/(\(\?)?:\w+/g,v=/\*\w+/g,m=/[\-{}\[\]+?.,\\\^$|#\s]/g,y=/\/$/,w=function(){function i(e){return e.router&&e.router.parent==M}function s(e){I&&I.config.isActive&&I.config.isActive(e)}function f(t,n){e.log("Navigation Complete",t,n);var o=e.getModuleId(A);o&&M.trigger("router:navigation:from:"+o),A=t,s(!1),I=n,s(!0);var a=e.getModuleId(A);a&&M.trigger("router:navigation:to:"+a),i(t)||M.updateDocumentTitle(t,n),h.explicitNavigation=!1,h.navigatingBack=!1,M.trigger("router:navigation:complete",t,n,M)}function g(t,n){e.log("Navigation Cancelled"),M.activeInstruction(I),I&&M.navigate(I.fragment,!1),P(!1),h.explicitNavigation=!1,h.navigatingBack=!1,M.trigger("router:navigation:cancelled",t,n,M)}function v(t){e.log("Navigation Redirecting"),P(!1),h.explicitNavigation=!1,h.navigatingBack=!1,M.navigate(t,{trigger:!0,replace:!0})}function m(t,n,o){h.navigatingBack=!h.explicitNavigation&&A!=o.fragment,M.trigger("router:route:activating",n,o,M),t.activateItem(n,o.params).then(function(e){if(e){var a=A;if(f(n,o),i(n)){var r=o.fragment;o.queryString&&(r+="?"+o.queryString),n.router.loadUrl(r)}a==n&&(M.attached(),M.compositionComplete())}else t.settings.lifecycleData&&t.settings.lifecycleData.redirect?v(t.settings.lifecycleData.redirect):g(n,o);p&&(p.resolve(),p=null)}).fail(function(t){e.error(t)})}function b(t,n,o){var i=M.guardRoute(n,o);i?i.then?i.then(function(i){i?e.isString(i)?v(i):m(t,n,o):g(n,o)}):e.isString(i)?v(i):m(t,n,o):g(n,o)}function x(e,t,n){M.guardRoute?b(e,t,n):m(e,t,n)}function k(e){return I&&I.config.moduleId==e.config.moduleId&&A&&(A.canReuseForRoute&&A.canReuseForRoute.apply(A,e.params)||!A.canReuseForRoute&&A.router&&A.router.loadUrl)}function _(){if(!P()){var t=D.shift();D=[],t&&(P(!0),M.activeInstruction(t),k(t)?x(n.create(),A,t):e.acquire(t.config.moduleId).then(function(n){var o=e.resolveObject(n);x(E,o,t)}).fail(function(n){e.error("Failed to load routed module ("+t.config.moduleId+"). Details: "+n.message)}))}}function T(e){D.unshift(e),_()}function C(e,t,n){for(var o=e.exec(t).slice(1),i=0;i<o.length;i++){var a=o[i];o[i]=a?decodeURIComponent(a):null}var r=M.parseQueryString(n);return r&&o.push(r),{params:o,queryParams:r}}function S(t){M.trigger("router:route:before-config",t,M),e.isRegExp(t)?t.routePattern=t.route:(t.title=t.title||M.convertRouteToTitle(t.route),t.moduleId=t.moduleId||M.convertRouteToModuleId(t.route),t.hash=t.hash||M.convertRouteToHash(t.route),t.routePattern=l(t.route)),t.isActive=t.isActive||r.observable(!1),M.trigger("router:route:after-config",t,M),M.routes.push(t),M.route(t.routePattern,function(e,n){var o=C(t.routePattern,e,n);T({fragment:e,queryString:n,config:t,params:o.params,queryParams:o.queryParams})})}function $(t){if(e.isArray(t.route))for(var n=t.isActive||r.observable(!1),o=0,i=t.route.length;i>o;o++){var a=e.extend({},t);a.route=t.route[o],a.isActive=n,o>0&&delete a.nav,S(a)}else S(t);return M}var A,I,D=[],P=r.observable(!1),E=n.create(),M={handlers:[],routes:[],navigationModel:r.observableArray([]),activeItem:E,isNavigating:r.computed(function(){var e=E(),t=P(),n=e&&e.router&&e.router!=M&&e.router.isNavigating()?!0:!1;return t||n}),activeInstruction:r.observable(null),__router__:!0};return o.includeIn(M),E.settings.areSameItem=function(e,t,n,o){return e==t?d(n,o):!1},M.parseQueryString=function(e){var t,n;if(!e)return null;if(n=e.split("&"),0==n.length)return null;t={};for(var o=0;o<n.length;o++){var i=n[o];if(""!==i){var a=i.split("=");t[a[0]]=a[1]&&decodeURIComponent(a[1].replace(/\+/g," "))}}return t},M.route=function(e,t){M.handlers.push({routePattern:e,callback:t})},M.loadUrl=function(t){var n=M.handlers,o=null,i=t,r=t.indexOf("?");if(-1!=r&&(i=t.substring(0,r),o=t.substr(r+1)),M.relativeToParentRouter){var s=this.parent.activeInstruction();i=s.params.join("/"),i&&"/"==i.charAt(0)&&(i=i.substr(1)),i||(i=""),i=i.replace("//","/").replace("//","/")}i=i.replace(y,"");for(var l=0;l<n.length;l++){var c=n[l];if(c.routePattern.test(i))return c.callback(i,o),!0}return e.log("Route Not Found"),M.trigger("router:route:not-found",t,M),I&&a.navigate(I.fragment,{trigger:!1,replace:!0}),h.explicitNavigation=!1,h.navigatingBack=!1,!1},M.updateDocumentTitle=function(e,n){n.config.title?document.title=t.title?n.config.title+" | "+t.title:n.config.title:t.title&&(document.title=t.title)},M.navigate=function(e,t){return e&&-1!=e.indexOf("://")?(window.location.href=e,!0):(h.explicitNavigation=!0,a.navigate(e,t))},M.navigateBack=function(){a.navigateBack()},M.attached=function(){M.trigger("router:navigation:attached",A,I,M)},M.compositionComplete=function(){P(!1),M.trigger("router:navigation:composition-complete",A,I,M),_()},M.convertRouteToHash=function(e){if(M.relativeToParentRouter){var t=M.parent.activeInstruction(),n=t.config.hash+"/"+e;return a._hasPushState&&(n="/"+n),n=n.replace("//","/").replace("//","/")}return a._hasPushState?e:"#"+e},M.convertRouteToModuleId=function(e){return c(e)},M.convertRouteToTitle=function(e){var t=c(e);return t.substring(0,1).toUpperCase()+t.substring(1)},M.map=function(t,n){if(e.isArray(t)){for(var o=0;o<t.length;o++)M.map(t[o]);return M}return e.isString(t)||e.isRegExp(t)?(n?e.isString(n)&&(n={moduleId:n}):n={},n.route=t):n=t,$(n)},M.buildNavigationModel=function(t){for(var n=[],o=M.routes,i=t||100,a=0;a<o.length;a++){var r=o[a];r.nav&&(e.isNumber(r.nav)||(r.nav=++i),n.push(r))}return n.sort(function(e,t){return e.nav-t.nav}),M.navigationModel(n),M},M.mapUnknownRoutes=function(t,n){var o="*catchall",i=l(o);return M.route(i,function(r,s){var l=C(i,r,s),c={fragment:r,queryString:s,config:{route:o,routePattern:i},params:l.params,queryParams:l.queryParams};if(t)if(e.isString(t))c.config.moduleId=t,n&&a.navigate(n,{trigger:!1,replace:!0});else if(e.isFunction(t)){var u=t(c);if(u&&u.then)return u.then(function(){M.trigger("router:route:before-config",c.config,M),M.trigger("router:route:after-config",c.config,M),T(c)}),void 0}else c.config=t,c.config.route=o,c.config.routePattern=i;else c.config.moduleId=r;M.trigger("router:route:before-config",c.config,M),M.trigger("router:route:after-config",c.config,M),T(c)}),M},M.reset=function(){return I=A=void 0,M.handlers=[],M.routes=[],M.off(),delete M.options,M},M.makeRelative=function(t){return e.isString(t)&&(t={moduleId:t,route:t}),t.moduleId&&!u(t.moduleId,"/")&&(t.moduleId+="/"),t.route&&!u(t.route,"/")&&(t.route+="/"),t.fromParent&&(M.relativeToParentRouter=!0),M.on("router:route:before-config").then(function(e){t.moduleId&&(e.moduleId=t.moduleId+e.moduleId),t.route&&(e.route=""===e.route?t.route.substring(0,t.route.length-1):t.route+e.route)}),M},M.createChildRouter=function(){var e=w();return e.parent=M,e},M};return h=w(),h.explicitNavigation=!1,h.navigatingBack=!1,h.targetIsThisWindow=function(e){var t=s(e.target).attr("target");return!t||t===window.name||"_self"===t||"top"===t&&window===window.top?!0:!1},h.activate=function(t){return e.defer(function(n){if(p=n,h.options=e.extend({routeHandler:h.loadUrl},h.options,t),a.activate(h.options),a._hasPushState)for(var o=h.routes,i=o.length;i--;){var r=o[i];r.hash=r.hash.replace("#","")}s(document).delegate("a","click",function(e){if(a._hasPushState){if(!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&h.targetIsThisWindow(e)){var t=s(this).attr("href");null==t||"#"===t.charAt(0)||/^[a-z]+:/i.test(t)||(h.explicitNavigation=!0,e.preventDefault(),a.navigate(t))}}else h.explicitNavigation=!0}),a.options.silent&&p&&(p.resolve(),p=null)}).promise()},h.deactivate=function(){a.deactivate()},h.install=function(){r.bindingHandlers.router={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,o,a){var s=r.utils.unwrapObservable(t())||{};if(s.__router__)s={model:s.activeItem(),attached:s.attached,compositionComplete:s.compositionComplete,activate:!1};else{var l=r.utils.unwrapObservable(s.router||o.router)||h;s.model=l.activeItem(),s.attached=l.attached,s.compositionComplete=l.compositionComplete,s.activate=!1}i.compose(e,s,a)}},r.virtualElements.allowedBindings.router=!0},h});
define('account/index',["plugins/router","knockout"],function(o){var e=o.createChildRouter().makeRelative({moduleId:"account",fromParent:!0}).map([{route:"facebook",moduleId:"oAuth/facebook",title:"Login via Facebook",nav:!0}]).buildNavigationModel();return{router:e}});
define('text!account/login.html',[],function () { return '<!--<h1>Join The Game!</h1>-->\r\n<div style="position:relative; overflow:hidden;">\r\n   <button class="facebook" data-bind="click: facebook, enable: facebookLogin && !loading()">login with facebook</button>\r\n   <div class="facebook profile" data-bind="if: facebookProfile">\r\n      <div class="avatar btn"></div>\r\n      <div class="avatar" data-bind="style: {backgroundImage: \'url(\\\'https://graph.facebook.com/\'+ facebookProfile().id +\'/picture?width=100&height=100\\\')\'}"></div>\r\n      <div class="name" data-bind="text: facebookProfile().name">Ali Arafati</div>\r\n   </div>\r\n</div>\r\n<p>or</p>\r\n\r\n<form data-bind="verifiableSubmit: login">\r\n   <input type="text" placeholder="Username or e-mail" data-bind="verifiableValue: username, disable: loading" autofocus autocorrect="off" autocapitalize="off" />\r\n   <span class="error" data-bind="text: username.validationMessage"></span>\r\n   <input type="password" placeholder="Password" data-bind="verifiableValue: password, disable: loading" />\r\n   <span class="error" data-bind="text: password.validationMessage"></span>\r\n\r\n   <p class="error" data-bind="text: errorMessage"></p>\r\n\r\n   <button class="blue" type="submit" data-bind="disable: loading">\r\n      <span>LOG IN</span>\r\n      <!--<i data-bind="visible: loading()" class="icon-spinner icon-spin"></i>-->\r\n   </button>\r\n</form>\r\n\r\n<a class="block link big space" data-bind="click: signUp">SIGN UP</a>\r\n<!--<a class="block link small" data-bind="click: recover">recover password</a>-->';});

define('api/constants',[],function(){var e={bigImageURL:function(e,n){return"images/tiles/"+e+"/"+n+".jpg"},salt:"!XXX.666.ozma,is,awesome.666.XXX!"};return e});
define('account/oAuth/FB',["durandal/app"],function(e){function o(o){e.facebook.authResponse=o.authResponse,e.facebook.status="connected"===o.status?2:"not_authorized"===o.status?1:0,e.trigger("oAuth:login",{gateway:"facebook",response:e.facebook})}return e.facebook=e.facebook||{authResponse:void 0,getProfile:function(){return $.Deferred(function(e){FB.api("/me",function(o){console.log(o),e.resolve(o)})})},getFriends:function(){return $.Deferred(function(e){FB.api("/me/friends",function(o){console.log(o),e.resolve(o)})})},status:0},{getStatus:function(n){return $.Deferred(function(t){FB.getLoginStatus(function(n){o(n),t.resolve(e.facebook)},n)})},login:function(){return $.Deferred(function(n){FB.login(function(t){o(t),n.resolve(e.facebook)})})}}});
define('account/login',["durandal/app","api/constants","./oAuth/FB"],function(e,o,n){function a(){$("button.facebook").transition({y:-50}),$(".facebook.profile").delay(500).transition({y:60})}return window.page={loading:e.loading,facebookLogin:!1,username:ko.observable().extend({required:"You need to enter you username or e-mail",stringLength:{minLength:3,message:"Incorrect e-mail or username"}}),password:ko.observable().extend({required:"You need to enter your password"}),errorMessage:ko.observable(),signUp:function(){e.trigger("account:view:change","account/sign-up")},recover:function(){e.trigger("account:view:change","account/recovery")},facebookProfile:ko.observable(void 0),facebook:function(){e.loading(!0),n.login().then(function(o){2!=o.status?(e.loading(!1),page.errorMessage("Something went wrong!")):o.getProfile().then(function(e){page.facebookProfile(e),page.username("@"+e.username),page.password(o.authResponse.signedRequest),a()})})},login:function(){e.loading(!0);var n={username:this.username(),password:CryptoJS.SHA3(o.salt+this.username()+this.password()).toString()},a=this;e.trigger("server:account:login",n,function(o){e.loading(!1),o.success?(e.dialog.close("panel"),e.trigger("account:login",o),e.navigate("lobby")):a.errorMessage(o.message)})}}});
define('text!account/oAuth/facebook.html',[],function () { return '<div>\r\n   <fb:login-button show-faces="true" width="200" max-rows="1"></fb:login-button>\r\n   <button class="blue" data-bind="click: login">facebook</button>\r\n</div>';});

define('account/oAuth/facebook',["durandal/app","./FB"],function(e,o){function n(){this.login=function(){o.login().then(function(e){console.log(e)})}}return o.getStatus(!0).then(function(e){console.log(e)}),n.prototype.activate=function(){palette.get("menu").visible(!1),palette.get("currency").visible(!1)},n.prototype.detached=function(){palette.get("menu").visible(!0),palette.get("currency").visible(!0)},n});
define('text!account/recovery.html',[],function () { return '<h1>Recover password</h1>\r\n\r\n<i class="command close" data-bind="click:login"></i>\r\n\r\n<form data-bind="verifiableSubmit: recover">   \r\n   <p>Enter your email address bellow and you will receive an e-mail shortly giving you instruction to change your password.</p>\r\n   <br />\r\n   <input type="email" placeholder="email" data-bind="verifiableValue: email" autofocus />\r\n   <span class="error" data-bind="text: email.errorMessage"></span>\r\n\r\n   <p class="error" data-bind="text: errorMessage"></p>\r\n\r\n   <button class="blue" type="submit" data-bind="disable: loading()">\r\n      <span>Send Request</span>\r\n      <!--<i data-bind="visible: loading()" class="icon-spinner icon-spin"></i>-->\r\n   </button>\r\n</form>';});

define('account/recovery',["durandal/app","api/constants"],function(e){function o(e){var o=/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;return o.test(e)}var n=ko.observable(),t=ko.observable();return n.verify=function(e){return""==e?"E-mail is required":o(e)?"":"Incorrect e-mail address"},{loading:e.loading,errorMessage:t,email:n,recover:function(){e.loading(!0)},login:function(){e.trigger("account:view:change","account/login")}}});
define('text!account/sign-up.html',[],function () { return '<h1>Join The Game!</h1>\r\n\r\n<i class="command close" data-bind="click:login"></i>\r\n\r\n<form data-bind="verifiableSubmit: signUp">\r\n   <input type="text" placeholder="Username" data-bind="verifiableValue: username" autofocus autocorrect="off" autocapitalize="off" />\r\n   <span class="error" data-bind="text: username.validationMessage"></span>\r\n   <input type="email" placeholder="E-mail" data-bind="verifiableValue: email" autocorrect="off" autocapitalize="off" />\r\n   <span class="error" data-bind="text: email.validationMessage"></span>\r\n   <input type="password" placeholder="Password" data-bind="verifiableValue: password">\r\n   <span class="error" data-bind="text: password.validationMessage"></span>\r\n\r\n   <p class="error" data-bind="text: errorMessage"></p>\r\n\r\n   <button type="submit" class="blue" data-bind="disable: loading()">\r\n      <span>SIGN UP</span>\r\n      <!--<i data-bind="visible: loading()" class="icon-spinner icon-spin"></i>-->\r\n   </button>\r\n</form>\r\n\r\n<p class="agreement">\r\n   By clicking <i>sign up</i> you agree to our <br /><b>Terms of Use</b> and <b>Privacy Policy</b>.\r\n</p>';});

define('account/sign-up',["durandal/app","api/constants"],function(e,o){function n(e){var o=/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;return o.test(e)}return{loading:e.loading,username:ko.observable().extend({required:"Username is required",stringLength:{minLength:3,message:"Incorrect e-mail or username"}}),password:ko.observable().extend({required:"Password is required"}),email:ko.observable().extend({required:"E-mail is required",customValidation:function(e){return n(e)?"":"Incorrect e-mail address"}}),errorMessage:ko.observable(),signUp:function(){e.loading(!0);var n={username:this.username(),email:this.email(),password:CryptoJS.SHA3(o.salt+this.username()+this.password()).toString()},t=this;e.trigger("server:account:sign-up",n,function(o){e.loading(!1),o.success?(o.username=n.username,localStorage.removeItem("tutorial"),e.dialog.close("panel"),e.trigger("account:login",o),e.navigate("newGame"),setTimeout(function(){e.dialog.show("notice",{model:{},view:"dialogs/pages/welcome",modal:!0})},200)):t.errorMessage(o.message)})},login:function(){e.trigger("account:view:change","account/login")}}});
define('text!account/static/login.html',[],function () { return '<!--<h1>Join The Game!</h1>-->\r\n<div style="position:relative; overflow:hidden;">\r\n   <button class="facebook" data-bind="click: facebook, enable: facebookLogin && !loading()">login with facebook</button>\r\n   <div class="facebook profile" data-bind="if: facebookProfile">\r\n      <div class="avatar btn"></div>\r\n      <div class="avatar" data-bind="style: {backgroundImage: \'url(\\\'https://graph.facebook.com/\'+ facebookProfile().id +\'/picture?width=100&height=100\\\')\'}"></div>\r\n      <div class="name" data-bind="text: facebookProfile().name">Ali Arafati</div>\r\n   </div>\r\n</div>\r\n<p>or</p>\r\n\r\n<form data-bind="verifiableSubmit: login">\r\n   <input type="text" placeholder="Username or e-mail" data-bind="verifiableValue: username, disable: loading" autofocus autocorrect="off" autocapitalize="off" />\r\n   <span class="error" data-bind="text: username.validationMessage"></span>\r\n   <input type="password" placeholder="Password" data-bind="verifiableValue: password, disable: loading" />\r\n   <span class="error" data-bind="text: password.validationMessage"></span>\r\n\r\n   <p class="error" data-bind="text: errorMessage"></p>\r\n\r\n   <button class="blue" type="submit" data-bind="disable: loading">\r\n      <span>LOG IN</span>\r\n      <!--<i data-bind="visible: loading()" class="icon-spinner icon-spin"></i>-->\r\n   </button>\r\n</form>\r\n\r\n<a class="block link big space" data-bind="click: signUp">SIGN UP</a>\r\n<!--<a class="block link small" data-bind="click: recover">recover password</a>-->';});

define('text!account/static/sign-up.html',[],function () { return '<h1>Join The Game!</h1>\r\n\r\n<i class="command close" data-bind="click:login"></i>\r\n\r\n<form data-bind="verifiableSubmit: signUp">\r\n   <input type="text" placeholder="Username" data-bind="verifiableValue: username" autofocus autocorrect="off" autocapitalize="off" />\r\n   <span class="error" data-bind="text: username.validationMessage"></span>\r\n   <input type="email" placeholder="E-mail" data-bind="verifiableValue: email" autocorrect="off" autocapitalize="off" />\r\n   <span class="error" data-bind="text: email.validationMessage"></span>\r\n   <input type="password" placeholder="Password" data-bind="verifiableValue: password">\r\n   <span class="error" data-bind="text: password.validationMessage"></span>\r\n\r\n   <p class="error" data-bind="text: errorMessage"></p>\r\n\r\n   <button type="submit" class="blue" data-bind="disable: loading()">\r\n      <span>SIGN UP</span>\r\n      <!--<i data-bind="visible: loading()" class="icon-spinner icon-spin"></i>-->\r\n   </button>\r\n</form>\r\n\r\n<p class="agreement">\r\n   By clicking <i>sign up</i> you agree to our <br /><b>Terms of Use</b> and <b>Privacy Policy</b>.\r\n</p>';});

define('dialogs/_constants',[],function(){return{YOUR_TURN_FIRST_ROUND:{heading:"IT'S YOUR TURN!",content:"Place a phrase on the game board to score. Use action buttons to the left."},YOUR_TURN:{heading:"IT'S YOUR TURN!",content:"Place a phrase on the game board to score. Use action buttons to the left."},THEIR_TURN:{heading:"IT'S YOUR OPPONENT'S TURN!",content:"Work on your masterpiece while you wait for your opponent to place a phrase."},CIRCLE_WORDS:{heading:"SELECT A PHRASE",content:'Place a whole phrase on the game board, by circling it and then choose a path to place it. <div class="select-pic"></div>'},CHOOSE_PATH:{heading:"CHOOSE A PATH",content:"Choose a path to place your phrase."},SWAP_WORDS:{heading:"SWAP WORDS",content:"Select the words you like to swap to exchange them for new ones."},TUT:{BONUS:{heading:"Bonus points",content:"Each phrase can<br>receive up to<br>two bonuses<br>by fulfilling the<br>bonus rules linked<br>to the images<br>it is placed in between."},RELATED:{heading:"Related words",content:"Marked words will<br>score 15 extra points<br>when put in a phrase<br>connected to the<br>right image."},ACTIONS:{heading:"Actions",content:"These are the<br>actions you can do<br>during your turn."},SWAP_WORDS:{heading:"Swap words",content:"Use this function to<br> swap any number of words<br> for random new ones."},ADD_WORDS:{heading:"Add word",content:"Add a word of<br>your choice."},WORD_ENDING:{heading:"Word ending",content:"Change a word to<br>the form of your<br>choice."},SELECT_PHRASE:{heading:"Select phrase",content:"Use this function to <br> circle a whole phrase <br> to place it all at once. <br> Words can also be placed <br> one by one."},WORKSPACE:{heading:"Workspace",content:"Scroll down to see<br>the whole of your<br>workspace."},GAMEBOARD:{heading:"Game board",content:"Place a phrase on<br>the game board to<br>score."},PLACE_PHRASE:{heading:"Place a phrase",content:"To score in this game<br>you need to <br>fill the paths <br>on the game board, <br> one at the time."},FILL_PATH:{heading:"Fill in the path",content:"Once the path is full,<br>the phrase will be accepted."},ARCHIVE_GAMES:{heading:"Game Archive",content:'To find your<br>finished games go<br>to "My Games" and<br>check out the tab<br>called:<br>"Game Archive".'}}}});
define('api/utils',[],function(){function e(e,t){for(var n in t)if(e[n]!=t[n])return!1;return!0}return{find:function(t,n){for(var o=0;o<t.length;o++)if(e(t[o],n))return t[o]}}});
define('api/model/Path',["durandal/app","api/constants","api/utils","paper"],function(e,t,o){function n(t,n,r,a,i,s,l){var u=this;u.id=n,u.nWords=r,u.startTile=o.find(t.tiles(),{id:a}),u.endTile=o.find(t.tiles(),{id:i}),u.cw=void 0===s?!0:s,u.phrase={_complete:ko.observable(!1),playerId:0,score:0,words:ko.observableArray()},u.phrase.toString=function(){for(var e="",t=u.phrase.words().length,o=0;t>o;o++)e+=o+(o==t-1?"":" ");for(var o=0;t>o;o++)e=e.replace(u.phrase.words()[o].index,u.phrase.words()[o].word.lemma);return e},u.phrase.update=function(e){u.completeSub.dispose(),u.phrase.complete()||ko.utils.arrayForEach(e,function(e){u.addWord(e,void 0,!0)})},u.phrase.complete=ko.computed(function(){return this.phrase._complete()===!0||6==this.phrase.words().length||0!=this.nWords&&this.phrase.words().length==this.nWords},u).extend({throttle:1}),u.completeSub=u.phrase.complete.subscribe(function(o){o&&(e.dialog.close("slipper"),e.dialog.show("confirm",{modal:!0,content:'Do you want to place <br/><b>"'+u.phrase.toString()+'"</b>?',doneText:"YES",cancelText:"NO"}).then(function(o){if(t.activeWords(null),paper.tool.remove(),"done"==o){e.loading(!0),t.player.active(!1),u.phrase.words().sort(function(e,t){return e.index-t.index});var n={gameID:t.gameID,pathID:u.id,username:t.player.username,words:ko.utils.arrayMap(u.phrase.words(),function(e){return e.word.id})};u.completeSub.dispose(),t.lastPath=u,e.trigger("server:game:place-phrase",n),e.scrollUp()}else u.phrase._complete(!1),u.removeAll()})),ko.utils.arrayForEach(u.phrase.words(),function(e){e.word.isPlayed=o?2:1})}),u.hasWordAt=function(e){var t=u._getEntityAt(e);return null!=t?!0:!1},u.getWordAt=function(e){var t=u._getEntityAt(e);return null!=t?t.word:null},u._getEntityAt=function(e){return ko.utils.arrayFirst(u.phrase.words(),function(t){return t.index==e})},u.addWord=function(e,o,n){if(!t.player.active()&&n!==!0)return!1;if(void 0===o)for(var r=0;10>r;r++)if(null==ko.utils.arrayFirst(u.phrase.words(),function(e){return e.index===r})){o=r;break}return 0==u.nWords&&o>=6||0!=u.nWords&&o>=u.nWords?!1:(null!=ko.utils.arrayFirst(u.phrase.words(),function(e){return e.index===o})&&u.removeWordAt(o),e.isPlayed=1,u.phrase.words.push({word:e,index:o}),t.words.valueHasMutated(),!0)},u.removeAll=function(){for(var e=u.phrase.words(),o=0;o<e.length;o++)e[o].word.isPlayed=0;u.phrase.words.removeAll(),t.words.valueHasMutated()},u._removeEntity=function(e,o){return null==e?!1:(o=o||{},o.keepUnplayed||(e.word.isPlayed=0),u.phrase.words.remove(e),t.words.valueHasMutated(),void 0)},u.removeWordAt=function(e,t){var o=u._getEntityAt(e);if(u._removeEntity(o,t),0==u.nWords){for(var n=o.index+1;10>n&&null!=(o=u._getEntityAt(n));n++)o.index--;u.phrase.words.valueHasMutated()}},l&&u.phrase.update(l.words)}return n});
define('api/datacontext',["durandal/system","plugins/router","durandal/app","api/constants","dialogs/_constants","api/model/Path"],function(e,o,r,a,n,t){function i(e,o){function r(e,o){for(var r in o)if(e[r]!==o[r])return!1;return!0}for(var a=0;a<e.length;a++)if(r(e[a],o))return e[a]}var s={gameID:0,player:{active:ko.observable()},players:ko.observableArray(),tiles:ko.observableArray(),paths:ko.observableArray(),words:ko.observableArray(),loading:ko.observable(null),loadingStatus:ko.observable(""),activeWord:ko.observable(null),activeWords:ko.observable(null),playerCount:1};return s.collection={name:ko.observable("woz"),size:ko.observable(20)},s.username=sessionStorage.getItem("username")||"ali",r.on("account:login",function(e){e.success&&(s.username=e.username,sessionStorage.removeItem("lobby"),sessionStorage.setItem("username",s.username))}),s._gameOver=ko.observable(!1),s.gameOver=ko.computed(function(){var e=ko.utils.arrayFilter(this.paths(),function(e){return e.phrase.complete()===!0});return 0!==e.length&&e.length===this.paths().length?!0:this._gameOver()},s),s.mode=ko.observable(""),s.words.immovable=ko.computed(function(){return"swapWords"===s.mode()}),s.load=function(l){console.log("loading game.."),r.off("game:start game:update game:swap-words"),s.loading(!0),r.dialog.show("loading"),""===l&&(l=-1),l=isNaN(l)?-1:1*l,r.on("game:start",function(e){if(o.navigate("game/"+e.id,{trigger:!1,replace:!0}),s.loadingStatus("Starting The Game..."),s.gameID=e.id,s.playerCount=e.players.length,s.collection.name(e.collection&&e.collection.name?e.collection.name:"woz"),s.collection.size(e.collection&&e.collection.size?e.collection.size:20),s.actionDone=e.actionDone,s.resumedGame=e.resumedGame||!1,ko.utils.arrayForEach(e.players,function(e){e.username===s.username?(s.player.active(e.active),e.active=s.player.active):e.active=ko.observable(e.active),e.resigned=ko.observable(e.resigned||!1),e.score=ko.observable(e.score)}),s.playerCount>1&&!e.over){var l;l=s.player.active()?n.YOUR_TURN_FIRST_ROUND:n.THEIR_TURN;var u=r.on("game:started:ready").then(function(){r.dialog.show("slipper-fixed",l),u.off()})}s.player=i(e.players,{username:s.username}),s.players(e.players),ko.utils.arrayForEach(e.words,function(o){o.isSelected=ko.observable(!1),ko.utils.arrayFilter(e.words,function(e){return o.id===e.id}).length>1&&(o.isPlayed=!0)}),s.words(e.words);for(var c=0;c<e.tiles.length;c++)e.tiles[c].imageId=e.tiles[c].imageID||e.tiles[c].id,e.tiles[c].imageName=a.bigImageURL(s.collection.name(),e.tiles[c].imageId),e.tiles[c].info=0!==e.tiles[c].bonus?"+"+e.tiles[c].bonus:"X"+e.tiles[c].mult,e.tiles[c].active=ko.observable(!1);s.tiles(e.tiles),e.paths=ko.utils.arrayMap(e.paths,function(e){return new t(s,e.id,e.nWords,e.startTile,e.endTile,e.cw,e.phrase)}),s.paths(e.paths),s._gameOver(e.over),s.winner=function(){if(s.gameOver()){var e=-1,o=null;return ko.utils.arrayForEach(s.players(),function(r){e<r.score()&&!r.resigned()&&(o=r,e=r.score())}),o}return null},s.loading(!1),s.loadingStatus("Ready"),r.dialog.close("loading"),r.trigger("game:started")}),r.on("game:update",function(o){if(r.loading(!1),o.success&&o.gameID==s.gameID){s._gameOver(o.over||!1),s.gameOver()&&(r.dialog.closeAll(),e.acquire("dialogs/pages/GameOver").then(function(e){var o,a=s.winner();if(a===s.player)o=1==s.playerCount?e.SOLO:e.WON;else{if(null===a)return r.navigate("lobby"),void 0;o=e.LOST}setTimeout(function(){r.dialog.show("notice",{model:o,view:"dialogs/pages/GameOver"})},3e3)}),setTimeout(function(){r.trigger("game:tiles:visible",!1)},3e3));for(var a=0;a<o.players.length;a++){var t=o.players[a],l=i(s.players(),{username:t.username}),u=t.score-l.score();if(l.scored=u,l.score(t.score),l.active(t.active),l.resigned(t.resigned||!1),l.username===s.player.username&&u){var c=ko.observable("");r.dialog.show("alert",{content:c,delay:3e3}),c("You scored <b>"+u+"</b> points!")}}if(o.path){var d=ko.utils.arrayFirst(s.paths(),function(e){return e.id==o.path.id});d.phrase.update(o.path.phrase)}if(o.words)for(var g=0;g<o.words.length;g++)o.words[g].isSelected=ko.observable(!1),s.words.push(o.words[g]);s.playerCount>1&&!s.gameOver()&&(s.player.active()?r.dialog.show("slipper-fixed",n.YOUR_TURN):r.dialog.show("slipper-fixed",n.THEIR_TURN)),s.players.valueHasMutated(),r.trigger("game:updated",o)}}),r.on("game:swap-words",function(e){if(e.success&&e.words){for(var o=0;o<e.oldWords.length;o++){var r=ko.utils.arrayFirst(s.words(),function(r){return r.id===e.oldWords[o]});s.words.remove(r)}for(var o=0;o<e.words.length;o++)e.words[o].isSelected=ko.observable(!1),s.words.push(e.words[o])}}),s.loadingStatus("Waiting for the server..."),l>=0?(s.loadingStatus("Waiting for awesomeness..."),r.trigger("server:game:resume",{username:s.username,id:l},function(){})):r.trigger("server:game:queue",{username:s.username,password:12345,playerCount:s.playerCount,friendUsername:s.friendUsername},function(){s.loadingStatus("Waiting for awesomeness...")})},s.unload=function(){s._gameOver(!1),r.off("game:start game:update game:swap-words")},s.playedWords=ko.computed(function(){return ko.utils.arrayFilter(s.words(),function(e){return e.isPlayed||!1})}),s.unplayedWords=ko.computed(function(){return ko.utils.arrayFilter(s.words(),function(e){return!e.isPlayed})}),s.selectedWords=ko.computed(function(){return ko.utils.arrayFilter(s.words(),function(e){return e.isSelected()})}),window.ctx=s});
define('api/draggable',["jquery"],function(e){e.fn.draggable=function(o){function t(){return n.data("immovable")&&n.data("immovable")()}function a(o){if(e.support.touch){var t=o.originalEvent.changedTouches[0];o.clientX=o.pageX=t.pageX,o.clientY=o.pageY=t.pageY,o.preventDefault()}}o=e.extend({},e.fn.draggable.defaults,o);var n=e(this),r=!1;this.immovable=t;var i={mousedown:function(r){if(r.preventDefault(),r.stopPropagation(),n.addClass("drag"),a(r),o.withinEl){var s=o.withinEl[0].scrollHeight,l=o.withinEl.innerWidth(),u=parseInt(o.withinEl.css("padding-left")),c=parseInt(o.withinEl.css("padding-top")),d=parseInt(o.withinEl.css("padding-right")),g=parseInt(o.withinEl.css("padding-bottom"));o.within={l:u,t:c,r:l-u-d,b:s-c-g}}var p={h:n.outerHeight(),w:n.outerWidth(),t:n.position().top-r.pageY,l:n.position().left-r.pageX,scrollTop:o.parent.scrollTop(),scrollTopChange:0,scrollTopTarget:0};if(p.scrollTopTarget=p.scrollTop,o.centerBased&&(o.within.t+=p.h/2,o.within.b+=p.h/2,o.within.l+=p.w/2,o.within.r+=p.w/2),o.dragStart.call(this,r,o.within),!t()){var f=e.support.touch?"touchmove":"mousemove";o.parent.bind(f,p,i.mousemove),o.parent.bind("scroll",p,i.scroll)}var m=e.support.touch?"touchend":"mouseup";return o.parent.one(m,p,i.mouseup),p},mouseup:function(e){if(n.hasClass("drag")){a(e),o.parent.unbind("mousemove touchmove",i.mousemove),o.parent.unbind("scroll",i.scroll),n.removeClass("drag");var t=i.isWithinBoundaries(e),s=t?e.data.t+e.pageY+e.data.scrollTopChange:n.position().top,l=t?e.data.l+e.pageX:n.position().left;n.position().top<o.within.t&&(s=o.within.t,n.css({top:s})),r&&o.usePercentage&&(s=100*s/(o.within.b-o.within.t),l=100*l/(o.within.r-o.within.l),n.css({top:s+"%",left:l+"%"})),o.dropped(e,{top:s,left:l,hasMoved:r,within:o.within,scrollTopChange:e.data.scrollTopChange}),r=!1}},scroll:function(){o.lastEvent.data.scrollTopChange=o.parent.scrollTop()-o.lastEvent.data.scrollTop,i.mousemove(o.lastEvent)},mousemove:function(e){a(e);var t=e.pageY+e.data.t+e.data.scrollTopChange,i=e.pageX+e.data.l;if(o.lastEvent=e,o.topLimit&&t<o.within.t&&(t=o.within.t),i<o.within.l&&(i=o.within.l),t+e.data.h>o.within.b&&(t=o.within.b-e.data.h),i+e.data.w>o.within.r&&(i=o.within.r-e.data.w),o.move(e,{top:t,left:i})&&(n.css({top:t,left:i}),r=!0,0!=e.data.scrollTop+e.data.scrollTopChange&&e.pageY<100)){var s=e.data.scrollTop+e.data.scrollTopChange;if(e.data.scrollTopTarget==s){var l=s-50;0>l&&(l=0),e.data.scrollTopTarget=l,console.log("scrolled",l),o.parent.animate({scrollTop:l},"fast",function(){})}}},isWithinBoundaries:function(e){var t=e.pageY+e.data.t+e.data.scrollTopChange,a=e.pageX+e.data.l;return t<o.within.t||t+e.data.h>o.within.b||a<o.within.l||a+e.data.w>o.within.r?!1:!0}},s=e.support.touch?"touchstart":"mousedown";return n.bind(s,i.mousedown),n.data("draggable",this),this.dispose=function(){n.unbind(),i.mouseup()},n.css("cursor",o.cursor)},e.fn.draggable.defaults={within:{l:0,r:window.innerWidth,t:0,b:window.innerHeight},withinEl:null,dragStart:function(){},dropped:function(){},move:function(){return!0},parent:e("#app"),dragable:!0,usePercentage:!0,cursor:"pointer",centerBased:!1,topLimit:!1}});
define('api/knockout',[],function(){function e(e,t,n,o){function a(e){for(var n in t.rules){var o=t.rules[n],a=o.validate(t,e,o.data);if(a)return t.hasError(!0),t.validationMessage(a),void 0}t.hasError(!1),t.validationMessage("")}t.hasOwnProperty("validate")||(t.rules={},t.hasError=ko.observable(),t.validationMessage=ko.observable(),t.validate=function(){a(t())},t.subscribe(a)),t.rules[e]={validate:n,data:o}}ko.bindingHandlers.fadeVisible={init:function(e,t){var n=t();$(e).toggle(ko.utils.unwrapObservable(n))},update:function(e,t,n){var o,a,r=t();others=n(),void 0===others.duration&&(others.duration=r.duration),void 0!==others.duration&&("number"==typeof others.duration?o=a=others.duration:(o=others.duration.fadeIn||200,a=others.duration.fadeOut||500)),ko.utils.unwrapObservable(r)?$(e).fadeIn(o):$(e).fadeOut(a)}},ko.bindingHandlers.dVisible={init:function(e,t){var n=t();$(e).toggle(ko.utils.unwrapObservable(n))},update:function(e,t,n){var o,a,r=t();others=n(),void 0===others.duration&&(others.duration=r.duration),void 0!==others.duration?"number"==typeof others.duration?o=a=others.duration:(o=others.duration.fadeIn||0,a=others.duration.fadeOut||500):o=a=0;var i=ko.utils.unwrapObservable(r);setTimeout(function(){$(e).toggle(i)},i?o:a)}},ko.bindingHandlers.timeAgo={init:function(e,t){function n(e,t,n){return e+" "+t+(e>1?n||"s":"")+" "}function o(e){var t="",o=0;return e/864e5>1&&(t+=n(Math.floor(e/864e5),"day"),o++),e%=864e5,(t||e/36e5>1)&&(t+=n(Math.floor(e/36e5),"hour"),o++),e%=36e5,2==o?t:((t||e/6e4>1)&&(t+=n(Math.floor(e/6e4),"min"," "),o++),e%=6e4,2==o||t?t:"few seconds ")}var a=setInterval(function(e){if(ko.dataFor(e.element)){var t=(new Date).getTime()-e.time;$(e.element).text(o(t)+"ago")}else clearInterval(a)},5e3,{element:e,time:t()}),r=new Date((new Date).getTime()-t());$(e).text(o(r)+"ago")}},ko.bindingHandlers.date={init:function(e,t){var n=new Date(t()),o="";o+=ko.bindingHandlers.date.months[n.getMonth()]+" ",o+=n.getDate()+" ",o+=n.getHours()+":"+("0"+n.getUTCMinutes()).substr(-2),$(e).text(o)},months:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]},ko.bindingHandlers.dropdown={init:function(e,t){var n=t(),o=$(e).hide(),a={};"function"!=typeof n.selected&&(n.selected=ko.observable(n.selected||o.find("option[selected]").text())),n.options=n.options||o.find("option").map(function(){return $(this).text()}).get(),a.selectedItem=n.selected();for(var r=$("<ul/>",{"class":"container y scroll"}).hide(),i=0;i<n.options.length;i++){var s=$("<li/>",{text:n.options[i]}).on("click",function(){var e=$(this).text();n.selected()!=e&&(n.selected(e),r.slideUp(200))}).appendTo(r);a[n.options[i]]=s}var l=$("<label/>",{"class":"select"}).on("click",function(){r.slideToggle(200)}).append(a.selectedText=$("<span/>",{"class":"selected",text:n.selected()})).append($("<span/>",{"class":"description",text:n.inst}));l.insertAfter(o),r.insertAfter(l),ko.computed({disposeWhenNodeIsRemoved:e,read:function(){var e=n.selected();a[a.selectedItem].removeClass("active"),a[e].addClass("active"),a.selectedItem=e,a.selectedText.text(e)}})}},ko.bindingHandlers.search={init:function(e,t,n,o){e.addEventListener("search",function(e){t().call(o,e)})}},ko.bindingHandlers.tab={init:function(e,t,n,o){var a=t(),r=ko.observable(a.activeTab||0),i=$(e).find("nav li:not(:last)").each(function(e,t){$(t).data("index",e)});ko.computed({disposeWhenNodeIsRemoved:e,read:function(){for(var t=r(),n=0;n<i.length;n++)i[n].classList.remove("active");if(i[t].classList.add("active"),"function"==typeof a.nav){var s=$(".content",e).slideUp().promise(),l=a.nav.call(o,t,s);l&&l.then&&l.then(function(){$(".content",e).slideDown()})}}}),$(e).find("li:not(:last)").click(function(){r($(this).data("index"))})}};var t=ko.bindingHandlers.click.init;ko.bindingHandlers.click.init=function(e,n,o,a){$.support.touch?($(e).bind("touchstart",function(e){e.preventDefault(),e.stopPropagation()}),$(e).touchPunch(),e.onlyClick=function(e){n().apply(a,[a,e])!==!0&&e.preventDefault()}):t.apply(this,arguments)},ko.bindingHandlers.verifiableValue={init:function(e,t,n){ko.bindingHandlers.value.init(e,t,n)},update:function(e,t){ko.bindingHandlers.value.update(e,t),e.setCustomValidity(t().validationMessage()||"")}},ko.bindingHandlers.verifiableSubmit={init:function(e,t,n,o){ko.utils.registerEventHandler(e,"submit",function(n){for(var a in o){var r=o[a];ko.isObservable(r)&&r.validate&&r.validate()}e.checkValidity()&&t().call(o,e)===!0||n.preventDefault()})}},ko.extenders.required=function(t,n){return e("required",t,function(e,t,n){return t?"":n||"This field is required"},n),t},ko.extenders.stringLength=function(t,n){return e("stringLength",t,function(e,t,n){return t.length>=n.minLength?"":n.message||"min length is "+n.minLength},n),t},ko.extenders.customValidation=function(t,n){return e("stringLength",t,function(e,t,n){return n(t)},n),t}});
define('api/server/connection',["socket","durandal/app"],function(e,t){function o(o,n){o="server:"+o,t.on(o).then(function(t,a){r.connected.then(function(){console.log("%c"+o+" sent:","background: #222; color: #bada55",t),n(t,function(e){console.log("%c"+o+" received:","background: #222; color: #bada55",e),a&&a(e)},e)})})}e=io.connect("http://wordstesting.herokuapp.com:80");var n;e.on("connect",function(){console.log("%cconnected","background: green; color: white"),t.trigger("socket:status","connect"),n=!0}),e.on("disconnect",function(){console.log("%cdisconnected","background: red; color: white"),t.trigger("socket:status","disconnect"),n=!1});var r={addEvent:o,addEmission:function(e){o(e,function(t,o,n){n.emit(e,t,o)})},socket:e,connected:$.Deferred(function(e){function o(n){"connect"==n&&e.resolve(),t.off("socket:status",o,e)}n&&e.resolve(),t.on("socket:status",o,e)}).promise()};return r});
define('api/server/events',["durandal/app"],function(e){return{emission:["account:login","account:sign-up","account:recover-password","account:logout","game:move-word","game:place-phrase","game:more-words","game:skip-turn","game:resign","game:lobby","game:archive","friends"],init:function(t){t.on("game:update",function(t){console.log("%cgame:update","background: #222; color: #bada55",t),e.trigger("game:update",t)})},custom:{"game:swap-words":function(t,o,n){n.emit("game:swap-words",t,function(n){n.oldWords=t.words,e.trigger("game:swap-words",n),o&&o(n)})},"game:resume":function(t,o,n){n.emit("game:resume",t,function(t){t.resumedGame=!0,o(t),e.trigger("game:start",t)})},"game:queue":function(t,o,n){n.once("game:start",function(t){console.log("%cgame:start","background: #222; color: #bada55",t),e.trigger("game:start",t)}),t.friendUsername?t.type="friend":(t.type=1==t.playerCount?"single":"random",delete t.friendUsername),delete t.playerCount,console.log(t),n.emit("game:request",t,o)}}}});
define('api/server/setup',["./connection","./events"],function(e,t){for(var o=0;o<t.emission.length;o++)e.addEmission(t.emission[o]);for(var n in t.custom)e.addEvent(n,t.custom[n]);t.init(e.socket)});
define('api/transitions/slidedown',["durandal/system","durandal/composition","jquery"],function(e,t,o){var n=100,r={top:"-100px",opacity:0,display:"block"},a={top:"20px",opacity:.9},i={top:0,opacity:1},s={top:"",opacity:"",display:""},l=function(t){return e.defer(function(e){function l(){e.resolve()}function u(){t.keepScrollPosition||o(document).scrollTop(0)}function d(){u(),t.triggerAttach();var e=t.el?o(t.el,t.child):o(t.child);e.css(r),e.animate(a,c,"swing",function(){e.animate(i,c/2,"swing",function(){e.css(s),l()})}),t.el&&o(t.child).fadeIn(c)}if(t.child){var c=t.duration||500;t.activeView?o(t.activeView).fadeOut(n,d):d()}else o(t.activeView).fadeOut(n,l)}).promise()};return l});
define('dialogs/_builder',["durandal/system","durandal/app","durandal/composition","durandal/activator"],function(e,t,n,o){function r(e){var t=document.getElementById(e?"fixed":"app"),n=t.querySelector("."+d);return n||(n=document.createElement("div"),n.className=d,t.appendChild(n)),n}function i(t,n){var o=t.attributes.fixed;"object"==typeof n&&(o=void 0===n.fixed?o:n.fixed);var i=r(o);return e.defer(function(n){function o(){var o=$("<div/>",{module:t.__moduleId__}).appendTo(i).get(0);g[t.__moduleId__]={ready:e.defer()},n.resolve(o)}t.attributes.singleton?u(t.__moduleId__,{msg:"queue"}).then(o):o()}).promise()}function a(t){return e.defer(function(n){function o(e){e.attributes=e.attributes||{fixed:!1,singleton:!0},n.resolve(e)}e.isString(t)?e.acquire(t).then(function(t){o(e.resolveObject(t))}):o(t)}).promise()}function s(e,t){var n={model:e,activate:!1};return t&&t.compositionComplete&&(n.compositionComplete=t.compositionComplete),n.bindingComplete=function(){var e=this.model;if(e.images){var t=new Image;t.onload=function(){e.load.apply(e)},t.src=e.el.css("background-image").replace(/url|[\'\"\(\)]/g,"")}},n}function l(t,r,l){return e.defer(function(e){a(t).then(function(a){i(a,r).then(function(i){var u=o.create();u.activateItem(a,r).then(function(t){t||e.reject()}).then(function(){var o=a.__dialog__={owner:a,context:l,activator:u,host:i,settings:s(a,l)};o.close=function(){var n=arguments,r=n.length?n[n.length-1]:{};return delete g[t],r&&r.forced&&e.resolve.apply(e,n),u.deactivateItem(o.owner,!0).then(function(){ko.removeNode(o.host),delete o.owner.__dialog__,r&&r.forced||e.resolve.apply(e,n)})},a.onClose=a.forceClose=function(){for(var e=[],t=0;t<arguments.length;t++)e.push(arguments[t]);e.push({forced:!0}),o.close.apply(this,e)},g[t].ready.resolve(o),n.compose(o.host,o.settings)})})}).promise()})}function u(t,n){return e.defer(function(e){t in g?g[t].ready.then(function(t){t.close(n).then(function(){e.resolve()})},function(){e.resolve()}):e.resolve()}).promise()}function c(){return e.defer(function(e){var t=[];for(var n in g)t.push(u(n,{force:!0}));$.when.apply(this,t).always(function(){e.resolve()})}).promise()}var d="dialogs",g={};return{_dialogs:g,show:function(e,t,n){return l("dialogs/templates/"+e,t,n)},close:function(e,t){return u("dialogs/templates/"+e,t)},closeAll:c}});
define('palette',[],function(){function e(){var t=this;this.items=ko.observableArray([new e.Icon("currency","command","fixed",123),new e.Icon("menu"),new e.Icon("fullscreen","command","fixed")]),this.fixedItemsCount=3,this.fixedItems=ko.computed(function(){return ko.utils.arrayFilter(t.items(),function(e){return"fixed"==e.place})}),this.rightItems=ko.computed(function(){return ko.utils.arrayFilter(t.items(),function(e){return"right"==e.place})}),this.leftItems=ko.computed(function(){return ko.utils.arrayFilter(t.items(),function(e){return"left"==e.place})}),this.get=function(e){return ko.utils.arrayFirst(t.items(),function(t){return t.name==e})},this.visible=ko.observable(!0),this.hide=function(e){e&&(t.visible.duration=e.duration),t.visible(!1),delete t.visible.duration},this.show=function(){t.visible(!0),t.adjustPalettes()},this.add=function(){var n=new e.Icon(arguments[0],arguments[1],arguments[2],arguments[3]);return t.items.push(n),t.adjustPalettes(),n},this.dispose=function(){this.items.splice(this.fixedItemsCount)}}e.prototype.adjustPalettes=function(e){$(".palette:not(.fixed)").each(function(t,n){var o=$(n);void 0===e?o.css("y",(window.innerHeight-o.outerHeight())/2):o.css("y",e)})},e.prototype.compositionComplete=function(){var e=this;e.adjustPalettes(),app.on("app:resized").then(function(){e.adjustPalettes()})},e.Icon=function(e,t,n,o){var i=this;this.name=e,this.type=t||"command",this.place=n||"fixed",this.content=ko.observable(o||"");var a,r=ko.observable(!0),s=ko.observable(this.type+" "+this.name);this.click=function(e){return"function"==typeof e?(a=e,a.owner=this,i):(a&&a.apply(a.owner,arguments),void 0)},this.visible=ko.computed({read:r,write:function(e){return ko.isObservable(e)?this.visible.dep=ko.computed(function(){r(e())}):(this.visible.dep&&this.visible.dep.dispose(),r(e)),i},owner:this}),this.css=ko.computed({read:s,write:function(e){return ko.isObservable(e)||(e[i.type]=!0,e[i.name]=!0,s(e)),i}}),this.hide=function(){i.visible(!1)},this.show=function(){i.visible(!0)}};var t=new e;return t.get("fullscreen").click(function(){app.trigger("app:fullscreen")}),t});
/*!
 * jQuery Transit - CSS3 transitions and transformations
 * (c) 2011-2012 Rico Sta. Cruz <rico@ricostacruz.com>
 * MIT Licensed.
 *
 * http://ricostacruz.com/jquery.transit
 * http://github.com/rstacruz/jquery.transit
 */

(function($) {
  $.transit = {
    version: "0.9.9",

    // Map of $.css() keys to values for 'transitionProperty'.
    // See https://developer.mozilla.org/en/CSS/CSS_transitions#Properties_that_can_be_animated
    propertyMap: {
      marginLeft    : 'margin',
      marginRight   : 'margin',
      marginBottom  : 'margin',
      marginTop     : 'margin',
      paddingLeft   : 'padding',
      paddingRight  : 'padding',
      paddingBottom : 'padding',
      paddingTop    : 'padding'
    },

    // Will simply transition "instantly" if false
    enabled: true,

    // Set this to false if you don't want to use the transition end property.
    useTransitionEnd: false
  };

  var div = document.createElement('div');
  var support = {};

  // Helper function to get the proper vendor property name.
  // (`transition` => `WebkitTransition`)
  function getVendorPropertyName(prop) {
    // Handle unprefixed versions (FF16+, for example)
    if (prop in div.style) return prop;
        
    var prefixes = ['Moz', 'Webkit', 'O', 'Ms', 'ms'];
    var prop_ = prop.charAt(0).toUpperCase() + prop.substr(1);

    for (var i=0; i<prefixes.length; ++i) {
      var vendorProp = prefixes[i] + prop_;
      if (vendorProp in div.style) { return vendorProp; }
    }
  }

  // Helper function to check if transform3D is supported.
  // Should return true for Webkits and Firefox 10+.
  function checkTransform3dSupport() {
    div.style[support.transform] = '';
    div.style[support.transform] = 'rotateY(90deg)';    
    return div.style[support.transform] !== '';
  }

  var transitionEnd;

  function testTransitionEnd() {
     var eventNamesDic = {
        'transition': 'transitionend',
        'MozTransition': 'transitionend',
        'OTransition': 'oTransitionEnd',
        'WebkitTransition': 'webkitTransitionEnd',
        'msTransition': 'MSTransitionEnd'
     };

     transitionEnd = support.transitionEnd = eventNamesDic[support.transition] || null;

     var div = document.createElement('div');
     document.body.appendChild(div);

     var eventNames = ['transitionend', 'transitionEnd', 'oTransitionEnd', 'webkitTransitionEnd', 'MSTransitionEnd'];

     for (var i = 0; i < eventNames.length; i++) {
        div.addEventListener(eventNames[i], onTransitionEnd);
     }

     div.style[support.transition] = 'all .01s';
     setTimeout(function () {
        div.style[support.transform] = 'translateX(1px)';
     }, 0);

     function onTransitionEnd(e) {
        //elapsedTime, eventPhase, propertyName,
        transitionEnd = support.transitionEnd = e.type;
        document.body.removeChild(div);
        div = null;
     }
  }

  var isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;

  // Check for the browser's transitions support.
  support.transition      = getVendorPropertyName('transition');
  support.transitionDelay = getVendorPropertyName('transitionDelay');
  support.transform       = getVendorPropertyName('transform');
  support.transformOrigin = getVendorPropertyName('transformOrigin');
  support.filter          = getVendorPropertyName('Filter');
  support.transform3d = checkTransform3dSupport();  

  testTransitionEnd()

  // Populate jQuery's `$.support` with the vendor prefixes we know.
  // As per [jQuery's cssHooks documentation](http://api.jquery.com/jQuery.cssHooks/),
  // we set $.support.transition to a string of the actual property name used.
  for (var key in support) {
    if (support.hasOwnProperty(key) && typeof $.support[key] === 'undefined') {
      $.support[key] = support[key];
    }
  }

  // Avoid memory leak in IE.
  div = null;

  // ## $.cssEase
  // List of easing aliases that you can use with `$.fn.transition`.
  $.cssEase = {
    '_default':       'ease',
    'in':             'ease-in',
    'out':            'ease-out',
    'in-out':         'ease-in-out',
    'snap':           'cubic-bezier(0,1,.5,1)',
    // Penner equations
    'easeOutCubic':   'cubic-bezier(.215,.61,.355,1)',
    'easeInOutCubic': 'cubic-bezier(.645,.045,.355,1)',
    'easeInCirc':     'cubic-bezier(.6,.04,.98,.335)',
    'easeOutCirc':    'cubic-bezier(.075,.82,.165,1)',
    'easeInOutCirc':  'cubic-bezier(.785,.135,.15,.86)',
    'easeInExpo':     'cubic-bezier(.95,.05,.795,.035)',
    'easeOutExpo':    'cubic-bezier(.19,1,.22,1)',
    'easeInOutExpo':  'cubic-bezier(1,0,0,1)',
    'easeInQuad':     'cubic-bezier(.55,.085,.68,.53)',
    'easeOutQuad':    'cubic-bezier(.25,.46,.45,.94)',
    'easeInOutQuad':  'cubic-bezier(.455,.03,.515,.955)',
    'easeInQuart':    'cubic-bezier(.895,.03,.685,.22)',
    'easeOutQuart':   'cubic-bezier(.165,.84,.44,1)',
    'easeInOutQuart': 'cubic-bezier(.77,0,.175,1)',
    'easeInQuint':    'cubic-bezier(.755,.05,.855,.06)',
    'easeOutQuint':   'cubic-bezier(.23,1,.32,1)',
    'easeInOutQuint': 'cubic-bezier(.86,0,.07,1)',
    'easeInSine':     'cubic-bezier(.47,0,.745,.715)',
    'easeOutSine':    'cubic-bezier(.39,.575,.565,1)',
    'easeInOutSine':  'cubic-bezier(.445,.05,.55,.95)',
    'easeInBack':     'cubic-bezier(.6,-.28,.735,.045)',
    'easeOutBack':    'cubic-bezier(.175, .885,.32,1.275)',
    'easeInOutBack':  'cubic-bezier(.68,-.55,.265,1.55)'
  };

  // ## 'transform' CSS hook
  // Allows you to use the `transform` property in CSS.
  //
  //     $("#hello").css({ transform: "rotate(90deg)" });
  //
  //     $("#hello").css('transform');
  //     //=> { rotate: '90deg' }
  //
  $.cssHooks['transit:transform'] = {
    // The getter returns a `Transform` object.
    get: function(elem) {
      return $(elem).data('transform') || new Transform();
    },

    // The setter accepts a `Transform` object or a string.
    set: function(elem, v) {
      var value = v;
      
      if (!(value instanceof Transform)) {
        value = new Transform(value);
      }

      // We've seen the 3D version of Scale() not work in Chrome when the
      // element being scaled extends outside of the viewport.  Thus, we're
      // forcing Chrome to not use the 3d transforms as well.  Not sure if
      // translate is affectede, but not risking it.  Detection code from
      // http://davidwalsh.name/detecting-google-chrome-javascript
      if (support.transform === 'WebkitTransform' && !isChrome) {
        elem.style[support.transform] = value.toString(true);
      } else {
        elem.style[support.transform] = value.toString(true);
      }

      $(elem).data('transform', value);
    }
  };

  // Add a CSS hook for `.css({ transform: '...' })`.
  // In jQuery 1.8+, this will intentionally override the default `transform`
  // CSS hook so it'll play well with Transit. (see issue #62)
  $.cssHooks.transform = {
    set: $.cssHooks['transit:transform'].set
  };

  // ## 'filter' CSS hook
  // Allows you to use the `filter` property in CSS.
  //
  //     $("#hello").css({ filter: 'blur(10px)' });
  //
  $.cssHooks.filter = {
    get: function(elem) {
      return elem.style[support.filter];
    },
    set: function(elem, value) {
      elem.style[support.filter] = value;
    }
  };

  // jQuery 1.8+ supports prefix-free transitions, so these polyfills will not
  // be necessary.
  if ($.fn.jquery < "1.8") {
    // ## 'transformOrigin' CSS hook
    // Allows the use for `transformOrigin` to define where scaling and rotation
    // is pivoted.
    //
    //     $("#hello").css({ transformOrigin: '0 0' });
    //
    $.cssHooks.transformOrigin = {
      get: function(elem) {
        return elem.style[support.transformOrigin];
      },
      set: function(elem, value) {
        elem.style[support.transformOrigin] = value;
      }
    };

    // ## 'transition' CSS hook
    // Allows you to use the `transition` property in CSS.
    //
    //     $("#hello").css({ transition: 'all 0 ease 0' });
    //
    $.cssHooks.transition = {
      get: function(elem) {
        return elem.style[support.transition];
      },
      set: function(elem, value) {
        elem.style[support.transition] = value;
      }
    };
  }

  // ## Other CSS hooks
  // Allows you to rotate, scale and translate.
  registerCssHook('scale');
  registerCssHook('translate');
  registerCssHook('rotate');
  registerCssHook('rotateX');
  registerCssHook('rotateY');
  registerCssHook('rotate3d');
  registerCssHook('perspective');
  registerCssHook('skewX');
  registerCssHook('skewY');
  registerCssHook('x', true);
  registerCssHook('y', true);

  // ## Transform class
  // This is the main class of a transformation property that powers
  // `$.fn.css({ transform: '...' })`.
  //
  // This is, in essence, a dictionary object with key/values as `-transform`
  // properties.
  //
  //     var t = new Transform("rotate(90) scale(4)");
  //
  //     t.rotate             //=> "90deg"
  //     t.scale              //=> "4,4"
  //
  // Setters are accounted for.
  //
  //     t.set('rotate', 4)
  //     t.rotate             //=> "4deg"
  //
  // Convert it to a CSS string using the `toString()` and `toString(true)` (for WebKit)
  // functions.
  //
  //     t.toString()         //=> "rotate(90deg) scale(4,4)"
  //     t.toString(true)     //=> "rotate(90deg) scale3d(4,4,0)" (WebKit version)
  //
  function Transform(str) {
    if (typeof str === 'string') { this.parse(str); }
    return this;
  }

  Transform.prototype = {
    // ### setFromString()
    // Sets a property from a string.
    //
    //     t.setFromString('scale', '2,4');
    //     // Same as set('scale', '2', '4');
    //
    setFromString: function(prop, val) {
      var args =
        (typeof val === 'string')  ? val.split(',') :
        (val.constructor === Array) ? val :
        [ val ];

      args.unshift(prop);

      Transform.prototype.set.apply(this, args);
    },

    // ### set()
    // Sets a property.
    //
    //     t.set('scale', 2, 4);
    //
    set: function(prop) {
      var args = Array.prototype.slice.apply(arguments, [1]);
      if (this.setter[prop]) {
        this.setter[prop].apply(this, args);
      } else {
        this[prop] = args.join(',');
      }
    },

    get: function(prop) {
      if (this.getter[prop]) {
        return this.getter[prop].apply(this);
      } else {
        return this[prop] || 0;
      }
    },

    setter: {
      // ### rotate
      //
      //     .css({ rotate: 30 })
      //     .css({ rotate: "30" })
      //     .css({ rotate: "30deg" })
      //     .css({ rotate: "30deg" })
      //
      rotate: function(theta) {
        this.rotate = unit(theta, 'deg');
      },

      rotateX: function(theta) {
        this.rotateX = unit(theta, 'deg');
      },

      rotateY: function(theta) {
        this.rotateY = unit(theta, 'deg');
      },

      // ### scale
      //
      //     .css({ scale: 9 })      //=> "scale(9,9)"
      //     .css({ scale: '3,2' })  //=> "scale(3,2)"
      //
      scale: function(x, y) {
        if (y === undefined) { y = x; }
        this.scale = x + "," + y;
      },

      // ### skewX + skewY
      skewX: function(x) {
        this.skewX = unit(x, 'deg');
      },

      skewY: function(y) {
        this.skewY = unit(y, 'deg');
      },

      // ### perspectvie
      perspective: function(dist) {
        this.perspective = unit(dist, 'px');
      },

      // ### x / y
      // Translations. Notice how this keeps the other value.
      //
      //     .css({ x: 4 })       //=> "translate(4px, 0)"
      //     .css({ y: 10 })      //=> "translate(4px, 10px)"
      //
      x: function(x) {
        this.set('translate', x, null);
      },

      y: function(y) {
        this.set('translate', null, y);
      },

      // ### translate
      // Notice how this keeps the other value.
      //
      //     .css({ translate: '2, 5' })    //=> "translate(2px, 5px)"
      //
      translate: function(x, y) {
        if (this._translateX === undefined) { this._translateX = 0; }
        if (this._translateY === undefined) { this._translateY = 0; }

        if (x !== null && x !== undefined) { this._translateX = unit(x, 'px'); }
        if (y !== null && y !== undefined) { this._translateY = unit(y, 'px'); }

        this.translate = this._translateX + "," + this._translateY;
      }
    },

    getter: {
      x: function() {
        return this._translateX || 0;
      },

      y: function() {
        return this._translateY || 0;
      },

      scale: function() {
        var s = (this.scale || "1,1").split(',');
        if (s[0]) { s[0] = parseFloat(s[0]); }
        if (s[1]) { s[1] = parseFloat(s[1]); }

        // "2.5,2.5" => 2.5
        // "2.5,1" => [2.5,1]
        return (s[0] === s[1]) ? s[0] : s;
      },

      rotate3d: function() {
        var s = (this.rotate3d || "0,0,0,0deg").split(',');
        for (var i=0; i<=3; ++i) {
          if (s[i]) { s[i] = parseFloat(s[i]); }
        }
        if (s[3]) { s[3] = unit(s[3], 'deg'); }

        return s;
      }
    },

    // ### parse()
    // Parses from a string. Called on constructor.
    parse: function(str) {
      var self = this;
      str.replace(/([a-zA-Z0-9]+)\((.*?)\)/g, function(x, prop, val) {
        self.setFromString(prop, val);
      });
    },

    // ### toString()
    // Converts to a `transition` CSS property string. If `use3d` is given,
    // it converts to a `-webkit-transition` CSS property string instead.
    toString: function(use3d) {
      var re = [];
      
      for (var i in this) {
        if (this.hasOwnProperty(i)) {
          // Don't use 3D transformations if the browser can't support it.
          if ((!support.transform3d) && (
            (i === 'rotateX') ||
            (i === 'rotateY') ||
            (i === 'perspective') ||
            (i === 'transformOrigin'))) { continue; }

          if (i[0] !== '_') {
            if (use3d && (i === 'scale')) {
              re.push(i + "3d(" + this[i] + ",1)");
            } else if (use3d && (i === 'translate')) {
              re.push(i + "3d(" + this[i] + ",0)");
            } else {
              re.push(i + "(" + this[i] + ")");
            }
          }
        }
      }

      return re.join(" ");
    }
  };

  function callOrQueue(self, queue, fn) {
    if (queue === true) {
      self.queue(fn);
    } else if (queue) {
      self.queue(queue, fn);
    } else {
      fn();
    }
  }

  // ### getProperties(dict)
  // Returns properties (for `transition-property`) for dictionary `props`. The
  // value of `props` is what you would expect in `$.css(...)`.
  function getProperties(props) {
    var re = [];

    $.each(props, function(key) {
      key = $.camelCase(key); // Convert "text-align" => "textAlign"
      key = $.transit.propertyMap[key] || $.cssProps[key] || key;
      key = uncamel(key); // Convert back to dasherized

      // Get vendor specify propertie
      if (support[key])
        key = uncamel(support[key]);

      if ($.inArray(key, re) === -1) { re.push(key); }
    });

    return re;
  }

  // ### getTransition()
  // Returns the transition string to be used for the `transition` CSS property.
  //
  // Example:
  //
  //     getTransition({ opacity: 1, rotate: 30 }, 500, 'ease');
  //     //=> 'opacity 500ms ease, -webkit-transform 500ms ease'
  //
  function getTransition(properties, duration, easing, delay) {
    // Get the CSS properties needed.
    var props = getProperties(properties);

    // Account for aliases (`in` => `ease-in`).
    if ($.cssEase[easing]) { easing = $.cssEase[easing]; }

    // Build the duration/easing/delay attributes for it.
    var attribs = '' + toMS(duration) + ' ' + easing;
    if (parseInt(delay, 10) > 0) { attribs += ' ' + toMS(delay); }

    // For more properties, add them this way:
    // "margin 200ms ease, padding 200ms ease, ..."
    var transitions = [];
    $.each(props, function(i, name) {
      transitions.push(name + ' ' + attribs);
    });

    return transitions.join(', ');
  }

  // ## $.fn.transition
  // Works like $.fn.animate(), but uses CSS transitions.
  //
  //     $("...").transition({ opacity: 0.1, scale: 0.3 });
  //
  //     // Specific duration
  //     $("...").transition({ opacity: 0.1, scale: 0.3 }, 500);
  //
  //     // With duration and easing
  //     $("...").transition({ opacity: 0.1, scale: 0.3 }, 500, 'in');
  //
  //     // With callback
  //     $("...").transition({ opacity: 0.1, scale: 0.3 }, function() { ... });
  //
  //     // With everything
  //     $("...").transition({ opacity: 0.1, scale: 0.3 }, 500, 'in', function() { ... });
  //
  //     // Alternate syntax
  //     $("...").transition({
  //       opacity: 0.1,
  //       duration: 200,
  //       delay: 40,
  //       easing: 'in',
  //       complete: function() { /* ... */ }
  //      });
  //
  $.fn.transition = $.fn.transit = function(properties, duration, easing, callback) {
    var self  = this;
    var delay = 0;
    var queue = true;

    var theseProperties = jQuery.extend(true, {}, properties);

    // Account for `.transition(properties, callback)`.
    if (typeof duration === 'function') {
      callback = duration;
      duration = undefined;
    }

    // Account for `.transition(properties, options)`.
    if (typeof duration === 'object') {
      easing = duration.easing;
      delay = duration.delay || 0;
      queue = duration.queue || true;
      callback = duration.complete;
      duration = duration.duration;
    }

    // Account for `.transition(properties, duration, callback)`.
    if (typeof easing === 'function') {
      callback = easing;
      easing = undefined;
    }

    // Alternate syntax.
    if (typeof theseProperties.easing !== 'undefined') {
      easing = theseProperties.easing;
      delete theseProperties.easing;
    }

    if (typeof theseProperties.duration !== 'undefined') {
      duration = theseProperties.duration;
      delete theseProperties.duration;
    }

    if (typeof theseProperties.complete !== 'undefined') {
      callback = theseProperties.complete;
      delete theseProperties.complete;
    }

    if (typeof theseProperties.queue !== 'undefined') {
      queue = theseProperties.queue;
      delete theseProperties.queue;
    }

    if (typeof theseProperties.delay !== 'undefined') {
      delay = theseProperties.delay;
      delete theseProperties.delay;
    }

    // Set defaults. (`400` duration, `ease` easing)
    if (typeof duration === 'undefined') { duration = $.fx.speeds._default; }
    if (typeof easing === 'undefined')   { easing = $.cssEase._default; }

    duration = toMS(duration);

    // Build the `transition` property.
    var transitionValue = getTransition(theseProperties, duration, easing, delay);

    // Compute delay until callback.
    // If this becomes 0, don't bother setting the transition property.
    var work = $.transit.enabled && support.transition;
    var i = work ? (parseInt(duration, 10) + parseInt(delay, 10)) : 0;

    // If there's nothing to do...
    if (i === 0) {
      var fn = function(next) {
        self.css(theseProperties);
        if (callback) { callback.apply(self); }
        if (next) { next(); }
      };

      callOrQueue(self, queue, fn);
      return self;
    }

    // Save the old transitions of each element so we can restore it later.
    var oldTransitions = {};

    var run = function(nextCall) {
      var bound = false;

      // Prepare the callback.
      var cb = function() {
        if (bound) { self.unbind(transitionEnd, cb); }

        if (i > 0) {
          self.each(function() {
            this.style[support.transition] = (oldTransitions[this] || null);
          });
        }

        if (typeof callback === 'function') { callback.apply(self); }
        if (typeof nextCall === 'function') { nextCall(); }
      };

      if ((i > 0) && (transitionEnd) && ($.transit.useTransitionEnd)) {
        // Use the 'transitionend' event if it's available.
        bound = true;
        self.bind(transitionEnd, cb);
      } else {
        // Fallback to timers if the 'transitionend' event isn't supported.
        window.setTimeout(cb, i);
      }

      // Apply transitions.
      self.each(function() {
        if (i > 0) {
          this.style[support.transition] = transitionValue;
        }
        $(this).css(properties);
      });
    };

    // Defer running. This allows the browser to paint any pending CSS it hasn't
    // painted yet before doing the transitions.
    var deferredRun = function(next) {
        this.offsetWidth; // force a repaint
        run(next);
    };

    // Use jQuery's fx queue.
    callOrQueue(self, queue, deferredRun);

    // Chainability.
    return this;
  };

  function registerCssHook(prop, isPixels) {
    // For certain properties, the 'px' should not be implied.
    if (!isPixels) { $.cssNumber[prop] = true; }

    $.transit.propertyMap[prop] = support.transform;

    $.cssHooks[prop] = {
      get: function(elem) {
        var t = $(elem).css('transit:transform');
        return t.get(prop);
      },

      set: function(elem, value) {
        var t = $(elem).css('transit:transform');
        t.setFromString(prop, value);

        $(elem).css({ 'transit:transform': t });
      }
    };

  }

  // ### uncamel(str)
  // Converts a camelcase string to a dasherized string.
  // (`marginLeft` => `margin-left`)
  function uncamel(str) {
    return str.replace(/([A-Z])/g, function(letter) { return '-' + letter.toLowerCase(); });
  }

  // ### unit(number, unit)
  // Ensures that number `number` has a unit. If no unit is found, assume the
  // default is `unit`.
  //
  //     unit(2, 'px')          //=> "2px"
  //     unit("30deg", 'rad')   //=> "30deg"
  //
  function unit(i, units) {
    if ((typeof i === "string") && (!i.match(/^[\-0-9\.]+$/))) {
      return i;
    } else {
      return "" + i + units;
    }
  }

  // ### toMS(duration)
  // Converts given `duration` to a millisecond string.
  //
  // toMS('fast') => $.fx.speeds[i] => "200ms"
  // toMS('normal') //=> $.fx.speeds._default => "400ms"
  // toMS(10) //=> '10ms'
  // toMS('100ms') //=> '100ms'  
  //
  function toMS(duration) {
    var i = duration;

    // Allow string durations like 'fast' and 'slow', without overriding numeric values.
    if (typeof i === 'string' && (!i.match(/^[\-0-9\.]+/))) { i = $.fx.speeds[i] || $.fx.speeds._default; }

    return unit(i, 'ms');
  }

  // Export some functions for testable-ness.
  $.transit.getTransitionValue = getTransition;
})(jQuery);

define("../lib/jquery.transit", function(){});

/*!
 * jQuery UI Touch Punch 0.2.2
 *
 * Copyright 2011, Dave Furfero
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Depends:
 *  jquery.ui.widget.js
 *  jquery.ui.mouse.js
 */
(function ($) {
   // Detect touch support
   $.support.touch = 'ontouchend' in document;

   // Ignore browsers without touch support
   if (!$.support.touch) {
      return;
   }

   var mouseProto = {}, touchHandled;

   /**
    * Simulate a mouse event based on a corresponding touch event
    * @param {Object} event A touch event
    * @param {String} simulatedType The corresponding mouse event
    */
   function simulateMouseEvent(event, simulatedType) {

      // Ignore multi-touch events
      if (event.originalEvent.touches.length > 1) {
         return;
      }

      if (event.currentTarget.onlyClick || self._clickOnly) {
         if (simulatedType == 'click') {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.onlyClick(event);
         }
         return;
      }
      event.preventDefault();      

      var touch = event.originalEvent.changedTouches[0],
          simulatedEvent = document.createEvent('MouseEvents');

      // Initialize the simulated mouse event using the touch event's coordinates
      simulatedEvent.initMouseEvent(
        simulatedType,    // type
        true,             // bubbles                    
        true,             // cancelable                 
        window,           // view                       
        1,                // detail                     
        touch.screenX,    // screenX                    
        touch.screenY,    // screenY                    
        touch.clientX,    // clientX                    
        touch.clientY,    // clientY                    
        false,            // ctrlKey                    
        false,            // altKey                     
        false,            // shiftKey                   
        false,            // metaKey                    
        0,                // button                     
        null              // relatedTarget              
      );

      // Dispatch the simulated event to the target element
      event.target.dispatchEvent(simulatedEvent);
   }

   /**
    * Handle the jQuery UI widget's touchstart events
    * @param {Object} event The widget element's touchstart event
    */
   mouseProto._touchStart = function (event) {
      var self = this;

      // Ignore the event if another widget is already being handled
      if (touchHandled) return;
      touchHandled = true;

      // Track movement to determine if interaction was a click
      self._touchMoved = false;
      
      if (event.currentTarget.immovable) {
         if (event.currentTarget.immovable()) {
            self._clickOnly = true;            
         } else {
            self._clickOnly = false;
         }
      }

      // Simulate the mouseover event
      simulateMouseEvent(event, 'mouseover');

      // Simulate the mousemove event
      //simulateMouseEvent(event, 'mousemove');

      // Simulate the mousedown event
      simulateMouseEvent(event, 'mousedown');
   };

   /**
    * Handle the jQuery UI widget's touchmove events
    * @param {Object} event The document's touchmove event
    */
   mouseProto._touchMove = function (event) {

      // Ignore event if not handled
      if (!touchHandled) {
         return;
      }
      //var str = "";
      //for (var i in event) {
      //   str += i + ': ' + event[i] +  '<br/>'
      //}
      //app.console.log( event.currentTarget.onlyClick +'<br/>' + str);
      // Interaction was not a click
      this._touchMoved = true;

      // Simulate the mousemove event
      simulateMouseEvent(event, 'mousemove');
   };

   /**
    * Handle the jQuery UI widget's touchend events
    * @param {Object} event The document's touchend event
    */
   mouseProto._touchEnd = function (event) {
      // Ignore event if not handled
      if (!touchHandled) {
         return;
      }

      // Simulate the mouseup event
      simulateMouseEvent(event, 'mouseup');

      // Simulate the mouseout event
      simulateMouseEvent(event, 'mouseout');

      // If the touch interaction did not move, it should trigger a click
      if (!this._touchMoved) {
         simulateMouseEvent(event, 'click');
         event.preventDefault();
      }

      touchHandled = false;
   };

   /**
    * A duck punch of the $.ui.mouse _mouseInit method to support touch events.
    * This method extends the widget with bound touch event handlers that
    * translate touch events to mouse events and pass them to the widget's
    * original mouse event handling methods.
    */
   mouseProto.touchInit = function (element, options) {

      var self = this;

      // Delegate the touch handlers to the widget's element
      element
        .bind('touchstart', $.proxy(self, '_touchStart'))
        .bind('touchcancel', $.proxy(self, '_touchEnd'))
        .bind('touchmove', $.proxy(self, '_touchMove'))
        .bind('touchend', $.proxy(self, '_touchEnd'));
   };

   $.fn.touchPunch = function (options) {
      return this.each(function () {
         mouseProto.touchInit($(this), options);
      });
   }


   //mouseProto.touchInit($(window));

})(jQuery);
define("../lib/jquery.touch-punch", function(){});

/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(v,p){var d={},u=d.lib={},r=function(){},f=u.Base={extend:function(a){r.prototype=this;var b=new r;a&&b.mixIn(a);b.hasOwnProperty("init")||(b.init=function(){b.$super.init.apply(this,arguments)});b.init.prototype=b;b.$super=this;return b},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var b in a)a.hasOwnProperty(b)&&(this[b]=a[b]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
s=u.WordArray=f.extend({init:function(a,b){a=this.words=a||[];this.sigBytes=b!=p?b:4*a.length},toString:function(a){return(a||y).stringify(this)},concat:function(a){var b=this.words,c=a.words,j=this.sigBytes;a=a.sigBytes;this.clamp();if(j%4)for(var n=0;n<a;n++)b[j+n>>>2]|=(c[n>>>2]>>>24-8*(n%4)&255)<<24-8*((j+n)%4);else if(65535<c.length)for(n=0;n<a;n+=4)b[j+n>>>2]=c[n>>>2];else b.push.apply(b,c);this.sigBytes+=a;return this},clamp:function(){var a=this.words,b=this.sigBytes;a[b>>>2]&=4294967295<<
32-8*(b%4);a.length=v.ceil(b/4)},clone:function(){var a=f.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var b=[],c=0;c<a;c+=4)b.push(4294967296*v.random()|0);return new s.init(b,a)}}),x=d.enc={},y=x.Hex={stringify:function(a){var b=a.words;a=a.sigBytes;for(var c=[],j=0;j<a;j++){var n=b[j>>>2]>>>24-8*(j%4)&255;c.push((n>>>4).toString(16));c.push((n&15).toString(16))}return c.join("")},parse:function(a){for(var b=a.length,c=[],j=0;j<b;j+=2)c[j>>>3]|=parseInt(a.substr(j,
2),16)<<24-4*(j%8);return new s.init(c,b/2)}},e=x.Latin1={stringify:function(a){var b=a.words;a=a.sigBytes;for(var c=[],j=0;j<a;j++)c.push(String.fromCharCode(b[j>>>2]>>>24-8*(j%4)&255));return c.join("")},parse:function(a){for(var b=a.length,c=[],j=0;j<b;j++)c[j>>>2]|=(a.charCodeAt(j)&255)<<24-8*(j%4);return new s.init(c,b)}},q=x.Utf8={stringify:function(a){try{return decodeURIComponent(escape(e.stringify(a)))}catch(b){throw Error("Malformed UTF-8 data");}},parse:function(a){return e.parse(unescape(encodeURIComponent(a)))}},
t=u.BufferedBlockAlgorithm=f.extend({reset:function(){this._data=new s.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=q.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var b=this._data,c=b.words,j=b.sigBytes,n=this.blockSize,e=j/(4*n),e=a?v.ceil(e):v.max((e|0)-this._minBufferSize,0);a=e*n;j=v.min(4*a,j);if(a){for(var f=0;f<a;f+=n)this._doProcessBlock(c,f);f=c.splice(0,a);b.sigBytes-=j}return new s.init(f,j)},clone:function(){var a=f.clone.call(this);
a._data=this._data.clone();return a},_minBufferSize:0});u.Hasher=t.extend({cfg:f.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){t.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(b,c){return(new a.init(c)).finalize(b)}},_createHmacHelper:function(a){return function(b,c){return(new w.HMAC.init(a,
c)).finalize(b)}}});var w=d.algo={};return d}(Math);
(function(v){var p=CryptoJS,d=p.lib,u=d.Base,r=d.WordArray,p=p.x64={};p.Word=u.extend({init:function(f,s){this.high=f;this.low=s}});p.WordArray=u.extend({init:function(f,s){f=this.words=f||[];this.sigBytes=s!=v?s:8*f.length},toX32:function(){for(var f=this.words,s=f.length,d=[],p=0;p<s;p++){var e=f[p];d.push(e.high);d.push(e.low)}return r.create(d,this.sigBytes)},clone:function(){for(var f=u.clone.call(this),d=f.words=this.words.slice(0),p=d.length,r=0;r<p;r++)d[r]=d[r].clone();return f}})})();
(function(v){for(var p=CryptoJS,d=p.lib,u=d.WordArray,r=d.Hasher,f=p.x64.Word,d=p.algo,s=[],x=[],y=[],e=1,q=0,t=0;24>t;t++){s[e+5*q]=(t+1)*(t+2)/2%64;var w=(2*e+3*q)%5,e=q%5,q=w}for(e=0;5>e;e++)for(q=0;5>q;q++)x[e+5*q]=q+5*((2*e+3*q)%5);e=1;for(q=0;24>q;q++){for(var a=w=t=0;7>a;a++){if(e&1){var b=(1<<a)-1;32>b?w^=1<<b:t^=1<<b-32}e=e&128?e<<1^113:e<<1}y[q]=f.create(t,w)}for(var c=[],e=0;25>e;e++)c[e]=f.create();d=d.SHA3=r.extend({cfg:r.cfg.extend({outputLength:512}),_doReset:function(){for(var a=this._state=
[],b=0;25>b;b++)a[b]=new f.init;this.blockSize=(1600-2*this.cfg.outputLength)/32},_doProcessBlock:function(a,b){for(var e=this._state,f=this.blockSize/2,h=0;h<f;h++){var l=a[b+2*h],m=a[b+2*h+1],l=(l<<8|l>>>24)&16711935|(l<<24|l>>>8)&4278255360,m=(m<<8|m>>>24)&16711935|(m<<24|m>>>8)&4278255360,g=e[h];g.high^=m;g.low^=l}for(f=0;24>f;f++){for(h=0;5>h;h++){for(var d=l=0,k=0;5>k;k++)g=e[h+5*k],l^=g.high,d^=g.low;g=c[h];g.high=l;g.low=d}for(h=0;5>h;h++){g=c[(h+4)%5];l=c[(h+1)%5];m=l.high;k=l.low;l=g.high^
(m<<1|k>>>31);d=g.low^(k<<1|m>>>31);for(k=0;5>k;k++)g=e[h+5*k],g.high^=l,g.low^=d}for(m=1;25>m;m++)g=e[m],h=g.high,g=g.low,k=s[m],32>k?(l=h<<k|g>>>32-k,d=g<<k|h>>>32-k):(l=g<<k-32|h>>>64-k,d=h<<k-32|g>>>64-k),g=c[x[m]],g.high=l,g.low=d;g=c[0];h=e[0];g.high=h.high;g.low=h.low;for(h=0;5>h;h++)for(k=0;5>k;k++)m=h+5*k,g=e[m],l=c[m],m=c[(h+1)%5+5*k],d=c[(h+2)%5+5*k],g.high=l.high^~m.high&d.high,g.low=l.low^~m.low&d.low;g=e[0];h=y[f];g.high^=h.high;g.low^=h.low}},_doFinalize:function(){var a=this._data,
b=a.words,c=8*a.sigBytes,e=32*this.blockSize;b[c>>>5]|=1<<24-c%32;b[(v.ceil((c+1)/e)*e>>>5)-1]|=128;a.sigBytes=4*b.length;this._process();for(var a=this._state,b=this.cfg.outputLength/8,c=b/8,e=[],h=0;h<c;h++){var d=a[h],f=d.high,d=d.low,f=(f<<8|f>>>24)&16711935|(f<<24|f>>>8)&4278255360,d=(d<<8|d>>>24)&16711935|(d<<24|d>>>8)&4278255360;e.push(d);e.push(f)}return new u.init(e,b)},clone:function(){for(var a=r.clone.call(this),b=a._state=this._state.slice(0),c=0;25>c;c++)b[c]=b[c].clone();return a}});
p.SHA3=r._createHelper(d);p.HmacSHA3=r._createHmacHelper(d)})(Math);

define("../lib/crypto.sha3", function(){});

define("common",["durandal/system","durandal/app","plugins/router","dialogs/_builder","api/server/setup","api/datacontext","./palette","../lib/jquery.transit","../lib/jquery.touch-punch","../lib/crypto.sha3","api/knockout"],function(e,t,n,o,r,a,i){function s(){var e=document.getElementById("shell");$(e).delay(1).promise().then(function(){$(e).css({y:0,transition:"all .5s ease-in-out"}).delay(500).promise().then(function(){$(e).css({transition:"none",transform:"none"}),$("#app, body").trigger("scroll")})})}navigator&&navigator.splashscreen&&navigator.splashscreen.hide(),function(e){e.browser={},e.browser.iPad=navigator.userAgent.match(/iPad/i),e.browser.kindle=navigator.vendor.match(/amazon\.com/i),e.browser.android=navigator.userAgent.match(/android/i)||e.browser.kindle,e.browser.tablet=e.browser.iPad||e.browser.android,e.el=document.getElementById("app")}(t),function(e){function t(){var t=e.screen.size.width-window.innerWidth,n=e.screen.size.height-window.innerHeight;return e.screen.size.width-=t,e.screen.size.height-=n,t||n}var n=null,o=200;if(e.screen={size:{width:0,height:0}},t(),window.addEventListener("resize",function(r){t()&&(e.trigger("app:resized:hook",r),clearTimeout(n),n=setTimeout(function(t){e.trigger("app:resized",t)},o,r))},!1),window.addEventListener("orientationchange",function(n){setTimeout(function(){var o=54==window.outerHeight-window.innerHeight?window.outerHeight:window.innerHeight;$(e.el).css({minHeight:o+"px"}),t()&&(e.trigger("app:resized:hook",n),e.trigger("app:resized",n))},600)}),e.browser.tablet){var r=54==window.outerHeight-window.innerHeight?window.outerHeight:window.innerHeight;$(e.el).css({minHeight:r+"px"})}var i=ko.observable(!1);e.inlineLoading=ko.observable(!1),e.loading=ko.computed({read:function(){return i()||a.loading()===!0},write:function(e){i(e)},owner:this})}(t);var l=t.el;t.scrollUp=function(e){if(console.log("Scrolling UP"),e=e||{},e.noAnimate)return l.scrollTop=0,void 0;var t=document.getElementById("shell");0!=l.scrollTop&&($(t).css({y:-l.scrollTop}),l.scrollTop=0,s())},t.scrollDown=function(e){console.log("Scrolling Down");var t=document.getElementById("shell"),n=l.scrollHeight-l.clientHeight;if($("#gameboard").length){var o=$("#gameboard").outerHeight()-100;n>o&&(n=o)}e=e||n-l.scrollTop,e>n-l.scrollTop&&(e=n-l.scrollTop),0!=e&&($(t).css({y:e}),l.scrollTop=e+l.scrollTop,s())},t.navigate=function(e,t){n.navigate(e,t)},t.dialog=o,t.palette=i,t.palette.get("menu").click(function(){t.dialog.show("menu")}),t.browser.tablet&&t.palette.get("fullscreen").hide(),t.console={log:function(e){$("#console").html(e)}};var u=!1;t.on("app:fullscreen").then(function(){var e=$("html")[0];u?e.webkitCancelFullscreen():e.webkitRequestFullscreen?e.webkitRequestFullscreen():e.webkitEnterFullScreen&&e.webkitEnterFullscreen()})});
define('text!dialogs/pages/GameOver.html',[],function () { return '<i class="command close"></i>\r\n\r\n<h1 data-bind="text: heading"></h1>\r\n<div data-bind="text: content"></div>\r\n<br />\r\n<div class="strong">You received:</div>\r\n<div>\r\n   5 XP\r\n</div>\r\n<br />\r\n<button class="blue enableGPU" data-bind="text: btnText, click: gotoLobby, clickBubble: false"></button>';});

define('dialogs/pages/GameOver',["durandal/app"],function(e){function t(t){this.heading=t.heading,this.content=t.content,this.btnText=t.btnText,this.experience=t.experience||0,this.gotoLobby=function(){e.dialog.close("notice"),t.target?e.navigate(t.target):e.navigate("lobby")}}var n={WON:{heading:"Congratulations!",content:"You won the game.",btnText:"Great!"},LOST:{heading:"Good luck next time!",content:"You lost the game.",btnText:"Dismiss!"},SOLO:{heading:"Well done!",content:"You completed the game board.",btnText:"continue playing",target:"singlePlayer"},RESIGNED:{heading:"Meh, Good luck next time!",content:"You resigned the game.",btnText:"Dismiss"}};return t.WON=new t(n.WON),t.LOST=new t(n.LOST),t.SOLO=new t(n.SOLO),t.RESIGNED=new t(n.RESIGNED),t});
define('text!dialogs/pages/LevelUp.html',[],function () { return '<i class="command close"></i>\r\n\r\n<h1>Congratulations!</h1>\r\n<div>You have reached <br />the next difficulty level.</div>\r\n<h2 class="curly" data-bind="text: message"></h2>\r\n<div class="badge" data-bind="style: {backgroundImage: \'url(\\\'\' + imageName + \'\\\')\'}"></div>\r\n<button class="blue" data-bind="click: close, clickBubble: false">OK, GREAT</button>';});

define('text!dialogs/pages/welcome.html',[],function () { return '<i class="command close"></i>\r\n\r\n<h1>Welcome to Words of Oz!</h1>\r\n<div>\r\n   We are excited to have you as a  <br />\r\n   new player. From here you can <br />\r\n   start your first game.\r\n</div>\r\n<br />\r\n<h3 class="bold">Good luck!</h3>\r\n<br />\r\n<button class="blue">Thanks</button>';});

define('dialogs/templates/_Effects',["durandal/app"],function(){return{downCustom:function(e,t){e.css({y:-100,opacity:0}).transition({y:20,opacity:.8},t,"ease").transition({y:0,opacity:1},t/2,"ease")},zoom:function(e){e.css({scale:.5,opacity:0}),e.transition({scale:1,opacity:1})},middle:function(e){e.css({top:($(window).innerHeight()-e.outerHeight())/2})},bottom:function(){},down:function(e,t,n){n||e.css({opacity:0}),e.transition({y:0},1*t/4).transition({y:100,opacity:n?0:1},3*t/4)},up:function(e,t,n){n||e.css({opacity:0}),e.transition({y:-100,opacity:n?0:1},3*t/4)}}});
define('dialogs/templates/_Dialog',["durandal/app","./_Effects"],function(e,t){function n(e,t){this.type=e,this.content=null,this.modal=null,this._closing=!1,this.attributes=$.extend({fixed:!0,singleton:!0},t)}function o(e){for(var n=this.attributes["effect"+e].split(" "),o=0;o<n.length;o++)t[n[o]](this.el,this.attributes["effect"+e+"Duration"]||s.effectDuration,this._closing);var r=this.attributes["effect"+e+"Done"];r&&r.call(this,this.el)}function r(){this.attributes.effectStart&&o.call(this,"Start")}function a(){return this.attributes.effectClose&&o.call(this,"Close"),this.el.promise()}var i=$.Deferred(function(e){e.resolve()}).promise(),s={effectDuration:500};return n.Inherit=function(e,t,o){return e.prototype=new n(t||e.name.toLowerCase(),o),e.prototype.constructor=e,e.prototype.super=n.prototype,e},n.Create=function(e,t){var o=function(){};return n.Inherit(o,e,t)},n.prototype.activate=function(e){this.content=e.content,this.modal=e.modal||!1,this.attributes.activate&&this.attributes.activate.apply(this,arguments)},n.prototype.attached=function(e){if(this.el=$("."+this.type,e),this._closing)throw"Unexpected Error: dialog attached before former one is closed!";r.apply(this),this.attributes.attached&&this.attributes.attached.apply(this,arguments)},n.prototype.close=function(e){return this._closing=!0,e&&e.forced?i:a.apply(this)},n.prototype.canDeactivate=function(){var e=this;return $.Deferred(function(t){e.el&&!e._closing&&e.close().then(function(){t.resolve()})}).promise()},n});
define('text!dialogs/templates/alert.html',[],function () { return '<div class="dialog top-center">\r\n    <div class="alert" data-bind="html: content"></div>\r\n</div>\r\n';});

define('dialogs/templates/alert',["./_Dialog","durandal/app"],function(e){var t=e.Create("alert",{effectStart:"middle zoom",effectStartDuration:500,effectStartDone:function(e){var t=this;e.delay(this.delay).fadeOut(function(){t.forceClose()})},activate:function(e){this.delay=e.delay||2e3}});return t});
define('text!dialogs/templates/confirm.html',[],function () { return '<div class="dialog bottom-center">\r\n    <div class="ui-overlay"></div>\r\n    <div class="confirm">\r\n        <p data-bind="html:content, visible:content"></p>\r\n        <button class="flat orange" data-bind="click: cancel, text:cancelText">CANCEL</button>\r\n        <button class="flat blue" data-bind="click: done, text: doneText">DONE</button>\r\n    </div>\r\n</div>\r\n';});

define('dialogs/templates/confirm',["./_Dialog","durandal/app"],function(){function e(){this.content="",this.cancelText="CANCEL",this.doneText="DONE",this.duration=400,this.modal=!1,this.images=!0;var e=this;this.done=function(){e.close("done")},this.cancel=function(){e.close("cancel")},this.close=function(t){this._closing||(this._closing=!0,e.el.transition({y:0},300).transition({y:100,opacity:0}).promise().then(function(){e.el.hide().css({opacity:""})}),e.el.parent().removeClass("modal"),e.onClose(t))},this.onClose=function(){}}return e.prototype.activate=function(e){e&&(this.modal=e.modal||this.modal,this.duration=e.duration||this.duration,this.content=e.content||this.content,this.doneText=e.doneText||this.doneText,this.cancelText=e.cancelText||this.cancelText)},e.prototype.bindingComplete=function(e){this.el=$(".confirm",e).css({opacity:0,y:100}),this.modal&&this.el.parent().addClass("modal"),this.__dialog__.settings.bindingComplete(e)},e.prototype.load=function(){var e=this;e.el.addClass("transit0-25").css({y:0,opacity:1}),e.el.one($.support.transitionEnd,function(){e.el.css({y:10},200),e.el.one($.support.transitionEnd,function(){e.el.removeClass("transit0-25")})})},e.prototype.canDeactivate=function(){var e=this;return $.Deferred(function(t){e.el&&(e.close(),e.el.promise().then(function(){t.resolve(!0)}))}).promise()},e.prototype.attributes={fixed:!0,singleton:!0},e});
define('text!dialogs/templates/control.html',[],function () { return '<div class="dialog top-center">\r\n    <div class="control">\r\n        <div class="nWords">\r\n            <div class="up" data-bind="click: up"></div>\r\n            <div class="number" data-bind="text: nWords"></div>\r\n            <div class="down" data-bind="click: down"></div>\r\n            <div style="clear: both"></div>\r\n        </div>\r\n        <div class="btnDel" data-bind="click: del">X</div>\r\n        <div class="btnCW" data-bind="click: cw">CW</div>\r\n        <div style="clear: both"></div>\r\n    </div>\r\n</div>\r\n';});

define('dialogs/templates/control',["durandal/app"],function(){function e(){this.nWords=ko.observable()}return e.prototype.activate=function(e){this.content=e.content||"",this.left=e.left||0,this.top=e.top||0,this.nWords(e.nWords),this.up=function(){var t=this.nWords();9>t&&(0==t&&(t=2),this.nWords(t+1),e.changed(this.nWords()))},this.down=function(){var t=this.nWords();t>3?(this.nWords(t-1),e.changed(this.nWords())):3==t&&(this.nWords(0),e.changed(0))},this.del=function(){e.changed(null),this.onClose()},this.cw=function(){e.changed("cw")}},e.prototype.attached=function(e){this.el=$(".control",e).css({left:this.left,top:this.top})},e.prototype.canDeactivate=function(){return $.Deferred(function(e){e.resolve(!0)})},e});
define('text!dialogs/templates/loading.html',[],function () { return '<div class="dialog top-center modal">\r\n    <div class="ui-overlay" data-bind="fadeVisible: loading"></div>\r\n    <div class="loading" data-bind="fadeVisible: loading">\r\n       <div class="block">\r\n          <h1 data-bind="text: loadingStatus"></h1>\r\n          <i data-bind="visible: loading" class="icon-spinner icon-2x icon-spin active"></i>\r\n       </div>\r\n    </div>\r\n</div>\r\n';});

define('dialogs/templates/loading',["durandal/app","api/datacontext"],function(e,t){function n(){this.loadingStatus=t.loadingStatus,this.loading=t.loading,this.duration=400}return n.prototype.activate=function(){},n.prototype.binding=function(e){this.el=$(".loading",e)},n.prototype.bindingComplete=function(e){this.el=$(".loading",e),$(".block",this.el).css({scale:.5,opacity:0})},n.prototype.compositionComplete=function(t){this.el=$(".loading",t),e.inlineLoading(!0),this.el.css({top:($(window).innerHeight()-this.el.outerHeight())/2}),$(".block",this.el).css({opacity:1,scale:1})},n.prototype.canDeactivate=function(){return $.Deferred(function(t){e.inlineLoading(!1),t.resolve(!0)}).promise()},n});
define('text!dialogs/templates/menu.html',[],function () { return '<div class="dialog top-right modal">\r\n    <div class="ui-overlay transparent" data-bind="click: close"></div>\r\n    <div class="menu" data-bind="click: close, foreach: items">\r\n        <button class="menuItem float left" data-bind="click: $root.nav, text: text"></button>\r\n        <div class="clear"></div>\r\n    </div>\r\n</div>\r\n';});

define('dialogs/templates/menu',["durandal/app","plugins/router"],function(e,t){function n(){this.images=!0;var e=this;this.close=function(t){if(console.log(t),e.el.is(":visible")){t=t||500;var n=e.el.transition({x:-10},t/2,"ease").transition({x:100,opacity:0},t).promise().then(function(){e.el.css({x:0}).hide()});return e.el.parent().removeClass("modal"),n}return e.el.promise()},this.onClose=function(){},this.items=o,this.nav=function(e){t.navigate(e.hash)}}var o=[{text:"New Game",hash:"newGame"},{text:"My Games",hash:"lobby"},{text:"Shop",hash:"shop"},{text:"settings",hash:"settings"},{text:"help",hash:"help"}];return n.prototype.attributes={fixed:!0,singleton:!0},n.prototype.activate=function(){},n.prototype.bindingComplete=function(e){this.el=$(".menu",e).hide(),this.__dialog__.settings.bindingComplete(e)},n.prototype.load=function(){this.el.show().css({x:100,opacity:0,top:"100px"}).transition({x:-10,opacity:1},400,"ease").transition({y:0},300)},n.prototype.canDeactivate=function(){return this.close(200)},n});
define('text!dialogs/templates/notice.html',[],function () { return '<div class="dialog top-center" data-bind="css: {modal: modal}">\r\n   <div class="ui-overlay"></div>\r\n   <div class="notice" data-bind="click: close, compose: {model: model, view: view}"></div>\r\n</div>\r\n';});

define('dialogs/templates/notice',["durandal/app"],function(){function e(){this.modal=!1,this.model={},this.view="",this.images=!0;var e=this;this.close=function(){t=t||500;var n=e.el.transition({y:10},t/2,"ease").transition({y:-100,opacity:0},t).promise().then(function(){e.el.css({y:0,display:"none"})});return this.onClose&&this.onClose(),n}}var t=400;return e.prototype.activate=function(e){this.modal=e.modal||this.modal,this.view=e.view,this.model=e.model,this.model.close||(this.model.close=this.close)},e.prototype.bindingComplete=function(e){this.el=$(".notice",e).hide(),this.__dialog__.settings.bindingComplete(e)},e.prototype.load=function(){this.el.show().css({y:0,opacity:0,scale:.8}).transition({scale:1.1,opacity:1},400,"ease").transition({scale:1},300,"ease")},e.prototype.canDeactivate=function(){var e=this;return $.Deferred(function(t){e.el.promise().then(function(){t.resolve(!0)})}).promise()},e});
define('text!dialogs/templates/panel.html',[],function () { return '<div class="dialog top-center absolute">\r\n    <div class="ui-overlay"></div>\r\n    <div class="panel" data-bind="compose: { model: modelName}"></div>\r\n</div>\r\n\r\n';});

define('dialogs/templates/panel',["durandal/app"],function(e){function t(){if(n){var e=window.innerHeight,t=(e-n.outerHeight())/2;0>t||n.css({y:t})}}var n,o;return{activate:function(n){n&&(this.modelName(n),o=e.on("app:resized").then(t))},bindingComplete:function(e){return $(".panel",e).hide(),{cacheViews:!1}},compositionComplete:function(e){n=this.el=$(".panel",e);var t=window.innerHeight,o=(t-n.outerHeight())/2;n.css({y:o}).show(),n.css({y:o-100,opacity:0}).transition({y:o+10,opacity:1}).transition({y:o})},canDeactivate:function(){return o.off(),this.el.fadeOut("fast").promise()},modelName:ko.observable(),loading:e.loading,attributes:{fixed:!1,singleton:!0}}});
define('text!dialogs/templates/slipper-fixed.html',[],function () { return '<div class="dialog top-center absolute">\r\n    <div class="ui-overlay"></div>\r\n    <div class="slipper" data-bind="click: collapse">\r\n        <h1 data-bind="text: heading"></h1>\r\n        <div class="content" data-bind="html: content"></div>\r\n    </div>\r\n</div>\r\n';});

define('dialogs/templates/slipper-fixed',["durandal/app"],function(){function e(){this.heading="",this.content="",this.images=!0;var e=this;this.close=function(t){if(t=t||500,!e.el)return $.Deferred(function(e){e.resolve()});var n=e.el.transition({y:10},t/2,"ease").transition({y:-100,opacity:0},t).promise().then(function(){e.el.css({y:0,display:"none"})});return e.el.parent().removeClass("modal"),n},this.collapse=function(t,n){n.preventDefault(),n.stopPropagation(),e.el.toggleClass("minimized")},this.onClose=function(){}}return e.prototype.attributes={fixed:!1,singleton:!0},e.prototype.activate=function(e){this.heading=e.heading,this.content=e.content,e.modal===!0&&this.el.parent().addClass("modal")},e.prototype.bindingComplete=function(e){this.el=$(".slipper",e).hide(),this.__dialog__.settings.bindingComplete(e)},e.prototype.load=function(){var e=this;this.el.show().css({y:-100,display:"block",opacity:0}).transition({y:10,opacity:1},500,"ease").transition({y:0},300),setTimeout(function(){e.el.toggleClass("minimized")},5e3)},e.prototype.canDeactivate=function(){return this.close(200)},e});
define('text!dialogs/templates/slipper.html',[],function () { return '<div class="dialog top-center">\r\n    <div class="ui-overlay"></div>\r\n    <div class="slipper" data-bind="click: collapse">\r\n        <h1 data-bind="text: heading"></h1>\r\n        <div class="content" data-bind="html: content"></div>\r\n        <!--<div class="btnCommand" data-bind="click: collapse"></div>-->\r\n    </div>\r\n</div>\r\n';});

define('dialogs/templates/slipper',["durandal/app"],function(){function e(){this.heading="",this.content="",this.images=!0;var e=this;this.close=function(t){t=t||500;var n=e.el.transition({y:10},t/2,"ease").transition({y:-100,opacity:0},t).promise().then(function(){e.el.css({y:0,display:"none"})});return e.el.parent().removeClass("modal"),n},this.collapse=function(t,n){n.preventDefault(),n.stopPropagation(),e.el.toggleClass("minimized")},this.onClose=function(){}}return e.prototype.attributes={fixed:!0,singleton:!0},e.prototype.activate=function(e){this.heading=e.heading,this.content=e.content,e.modal===!0&&this.el.parent().addClass("modal")},e.prototype.bindingComplete=function(e){var t=this;t.el=$(".slipper",e).hide(),this.__dialog__.settings.bindingComplete(e)},e.prototype.load=function(){this.el.show().css({y:-100,opacity:0}).transition({y:10,opacity:1},500,"ease").transition({y:0},300)},e.prototype.canDeactivate=function(){return this.close(200)},e});
define('text!dialogs/templates/tutorial.html',[],function () { return '<div class="dialog absolute low top-left">\r\n   <div class="tutorial" data-bind="css: css, click: onClose">\r\n      <button><i class="command close"></i></button>\r\n      <div class="content">\r\n         <h1 data-bind="text: heading"></h1>\r\n         <div data-bind="html: content"></div>\r\n      </div>\r\n      <h1 data-bind="text: heading"></h1>\r\n      <div data-bind="html: content" style="white-space:nowrap"></div>\r\n   </div>\r\n</div>\r\n';});

define('dialogs/templates/tutorial',["durandal/app","api/draggable"],function(){function e(){this.heading="",this.content="",this.css="",this.close=function(){return $.Deferred(function(e){e.resolve()})},this.onClose=function(){}}return e.prototype.activate=function(e){this.heading=e.heading,this.content=e.content,this.left=e.left||0,this.top=e.top||0,this.css=e.css||"",this.attributes.fixed=e.fixed||!1},e.prototype.attached=function(e){this.el=$(".tutorial",e),this.el.css({x:100,opacity:0,top:this.top,left:this.left}).transition({x:-10,opacity:1},500,"ease").transition({x:0},300).promise().then(function(){this.css({x:0})})},e.prototype.canDeactivate=function(){return this.close()},e.prototype.attributes={fixed:!1,singleton:!0},e});
define('text!dialogs/templates/window.html',[],function () { return '<div class="dialog absolute low top-left">\r\n   <div class="window">\r\n      <div style="position:absolute; top:0; right:0; width:32px; height: 32px; z-index: 2" data-bind="click: close">\r\n         <i class="command close"></i>\r\n      </div>\r\n      <h1 data-bind="text: heading"></h1>\r\n      <div data-bind="html: content"></div>\r\n   </div>\r\n</div>\r\n';});

define('dialogs/templates/window',["durandal/app","api/draggable"],function(){function e(){this.heading="",this.content="";var e=this;this.close=function(){return $.Deferred(function(t){return e.el?(e.draggable&&e.el.data("draggable").dispose(),e.el.animate({height:0,opacity:0},250).promise().then(function(){$(this).hide(),t.resolve()}),void 0):(t.resolve(),void 0)})},this.onClose=function(){}}return e.prototype.activate=function(e){this.heading=e.heading,this.content=e.content,this.left=e.left||0,this.top=e.top||0,this.draggable=void 0===e.draggable?!0:e.draggable;var t=$(window).innerWidth();t-this.left<300&&(this.left=t-350)},e.prototype.bindingComplete=function(e){this.el=$(".window",e),this.el.css({x:100,opacity:0,top:this.top,left:this.left})},e.prototype.compositionComplete=function(e){this.el=$(".window",e),this.left=($(window).innerWidth()-this.el.outerWidth())/2,this.top+=document.getElementById("app").scrollTop,this.el.css({x:100,opacity:0,top:this.top,left:this.left}).transition({x:-10,opacity:1},500,"ease").transition({x:0},300).promise().then(function(){this.css({x:0})}),this.draggable&&this.el.draggable({usePercentage:!1,topLimit:!0,withinEl:$("#app")})},e.prototype.canDeactivate=function(){return this.close(200)},e});
define('text!dialogs/templates/ztutorial.html',[],function () { return '<div class="dialog bottom-center modal">\r\n    <div class="overlay visible"></div>\r\n    <div class="tutorial">\r\n        <p data-bind="text:content, visible:content"></p>\r\n    </div>\r\n</div>\r\n';});

define('dialogs/templates/ztutorial',["durandal/app"],function(){function e(){this.content="",this.close=function(e){base.el.transition({y:0},300).transition({y:100,opacity:0}).promise().then(function(){base.el.hide().css({opacity:""})}),base.el.parent().fadeOut(),base.expose.removeClass("tutorial-expose"),base.overlay.fadeOut(),base.onClose(e)},this.onClose=function(){}}return e.prototype.activate=function(e){this.content=e.content,this.expose=e.expose},e.prototype.compositionComplete=function(e){this.el=$(".tutorial",e),this.overlay=$(".overlay",e),this.el.css({y:100,opacity:0}).transition({y:0,opacity:1},300,"ease").transition({y:10},200);var t=this.expose.parent(),n=this.expose;do"relative"==t.css("position")&&(n.addClass("tutorial-expose"),n=t),t=t.parent();while("BODY"!=t[0].tagName);t.append(this.overlay)},e.prototype.canDeactivate=function(){var e=this;return $.Deferred(function(t){e.el.promise().then(function(){t.resolve(!0)})}).promise()},e});
define('text!error/not-found.html',[],function () { return '<div style="width:100%">\r\n    <div id=splash>\r\n        <h1>Page not found</h1>\r\n    </div>\r\n</div>';});

define('error/not-found',[],function(){return{}});
define('game-editor/Tile',["api/datacontext","api/constants","api/model/Path"],function(e,t,n){var o=function(n,o,i,a){this.id=n,this.x=o||.5,this.y=i||.5,this.imageName=t.bigImageURL("woz",n),this.imageId=n,this.instruction="tile image",this.angle=ko.observable(a||0),this.info=n;var r=this;this.rest=ko.computed(function(){var t=e.paths(),n=e.tiles();return ko.utils.arrayFilter(n,function(e){if(e.id==r.id)return!1;for(var n=0,o=0;o<t.length;o++){var i=t[o];(i.startTile.id==r.id&&i.endTile.id==e.id||i.startTile.id==e.id&&i.endTile.id==r.id)&&n++}return 4>n})})},i=0;return o.prototype.addPath=function(t,o,a,r,s){if(this.id!=t.id&&(this.x!=t.x||this.y!=t.y)){var l;r=void 0!==r?r?1:0:null!=(l=ko.utils.arrayFirst(e.paths(),function(e){return console.log(e,this.id,t.id),e.startTile.id==this.id&&e.endTile.id==t.id||e.startTile.id==t.id&&e.endTile.id==this.id},this))?l.cw?0:1:1,startTile=t.x<this.x?t:this,endTile=t.x>this.x?t:this,a=void 0===a?3:a;var c=new n(e,i++,a,startTile.id,endTile.id,r,s);e.paths.push(c)}},n.prototype.onLeave=function(){app.dialog.close("control")},n.prototype.onEnter=function(t){var n=this;app.dialog.show("control",{left:t.x,top:t.y,nWords:n.nWords,changed:function(t){if("cw"==t)n.cw^=1,n.phrase.words.valueHasMutated();else{if(null==t){var o=e.paths.indexOf(n);return app.dialog.close("control"),n.onEnter=n.onLeave=null,n.dispose(),e.paths.splice(o,1),void 0}if(0==t&&n.nWords>0||t>0&&0==n.nWords){var o=e.paths.indexOf(n);return app.dialog.close("control"),n.onEnter=n.onLeave=null,n.dispose(),e.paths.splice(o,1),n.startTile.addPath(n.endTile,null,t,n.cw,n.phrase.words()),void 0}n.nWords=t,n.phrase.words.valueHasMutated()}}})},o});
define('game-editor/_server',["api/server/connection"],function(e){e.addEmission("manager:boards")});
define('text!game-editor/edit.html',[],function () { return '<div>\r\n   <div id="game-main">\r\n      <!--ko compose: { model: \'game/canvas\', mode: \'inline\' }--><canvas></canvas><!--/ko-->\r\n      <div class="logo page"></div>\r\n      <!--ko compose: \'game-editor/tiles\'--><!--/ko-->\r\n      <hr />\r\n      <!--ko compose: \'game/words\'--><!--/ko-->\r\n   </div>\r\n   <div id="game-players" data-bind="compose: \'game/players\'"></div>\r\n   <div id="menu">\r\n      <div class="palette left">\r\n         <div class="actions">\r\n            <label class="sm">\r\n               Game Level\r\n               <input type="number" data-bind="value: level" max="2" min="0"\r\n                      style="position:absolute; width: 2em; padding: .5em; border: 1px solid #d7bea2; background-color: #F9F8F4; border-radius: 5px; float:right; top:.7em;right:2em" />\r\n            </label>\r\n            <label class="sm">\r\n               Draft\r\n               <input type="checkbox" data-bind="checked: draft" /> <span></span>\r\n            </label>\r\n            <i class="command green" data-bind="click: addTile"><span>add tile</span></i>\r\n            <i class="command pink" data-bind="click: save, css: {disabled: loading}"><span>save</span></i>\r\n            <i class="action" data-bind="click: debug, css: { cancel: debugMode }"><span>debug</span></i>\r\n            <i class="action" data-bind="click: portrait, css: { cancel: portraitMode }"><span>portrait</span></i>\r\n         </div>\r\n      </div>\r\n\r\n      <div class="palette right">\r\n         <div class="actions">\r\n            <i class="command back" data-bind="click: back"><span>BACK</span></i>\r\n         </div>\r\n      </div>\r\n   </div>\r\n</div>\r\n';});

define('game/canvas/vm/Box',["durandal/app","api/datacontext","paper"],function(e,t){function n(e,t,n,o){var i=this;i.index=e,i.active=!1,i.cPoint=n||a,i.angle=o||0,i.prevAngle=0,i.scale=1,i.prevScale=1,i.isCircle=!1,i.isButton=!1,i._guiRect=null,i._guiElem=null,i.pathModel=i.wordModel=i.hasData=null,this.updateModel(t)}var o=paper,i=new o.Color(0,0),a=new o.Point(-100,-100);return n.prototype.button=function(e){this.hasData=!0,this.isButton=!0,this.isCircle=!1,this.pathModel=e},n.prototype.hideIfEmpty=function(){!this.hasData&&this._guiRect&&this._guiRect.hide()},n.prototype.showIfEmpty=function(){!this.hasData&&this._guiRect&&this._guiRect.show()},n.prototype.updateModel=function(e){if(void 0!==e&&null!=e&&(this.pathModel=e,this.wordModel=e.getWordAt(this.index),this.hasData=null!=this.wordModel,this.isCircle=0==e.nWords,this.hasData)){if(!this.pathModel.cPoint)return;var t=this.wordModel.lastBox;t&&t!=this&&t.pathModel.removeWordAt(t.index,{keepUnplayed:!0}),this.wordModel.lastBox=this,this.show()}},n.prototype.show=function(){this.hasData?(this.active=!1,null!=this._guiRect&&(this._guiRect.remove(),this._guiRect=null),this.isButton?null==this._guiElem?this.createBtn():this.updateBtn():(this.prevAngle=0,null==this._guiElem?this.createElem():this.updateElem())):(null!=this._guiElem&&(this._guiElem.remove(),this._guiElem=null),null==this._guiRect?this.createRect():this.updateRect())},n.prototype.width=function(){return this.hasData&&this._guiElem?this._guiElem.outerWidth():this.isCircle?n.options.circle.radius:60},n.prototype.height=function(){return this.hasData&&this._guiElem?this._guiElem.outerHeight():this.isCircle?n.options.circle.radius:23},n.prototype.enter=function(e){return this.hasData||null==e?null:(this.wordModel=e,this.active=!0,clearInterval(this._hoverHandler),this._hoverHandler=setTimeout(function(e){e._guiRect&&e._guiRect.addClass("hover")},1,this),this)},n.prototype.leave=function(){!this.hasData&&this.active&&(this.active=!1,clearInterval(this._hoverHandler),this._hoverHandler=setTimeout(function(e){e._guiRect.removeClass("hover"),e.isCircle||e._guiRect.children(".box").text("")},1,this))},n.prototype.drop=function(){this.active&&!this.hasData&&null!=this.wordModel&&(this.pathModel.addWord(this.wordModel,this.index)||e.dialog.show("alert",{content:"It's not your turn!"}))},n.prototype.put=function(e){if(!this.hasData&&null!=e.obsWords()){var t=this.pathModel.nWords,n=e.obsWords();if(n.length==t)for(var o=0;o<n.length;o++)this.pathModel.addWord(n[o],o+1)}},n.prototype.updateBtn=function(){var e={x:this.cPoint.x-n.pathOptions.container.left-this._guiElem.outerWidth()/2,y:this.cPoint.y-n.pathOptions.container.top-this._guiElem.outerHeight()/2},t=this._guiElem.find(".button");this.scale*=.5;var o=this._guiElem;o.css(e),t.transition({scale:this.scale,rotate:this.angle},500,"ease").promise().then(function(){o.addClass("ready")})},n.prototype.createBtn=function(){var e=$("<div/>",{"class":"confirm-box"}),t=this,o=this.pathModel.cw?" cw":"";e.append($("<div/>",{"class":"button",title:"Done!"}).append($("<div/>",{"class":"tooltip"+o,text:"Click me when you are done!"}).delay(4e3).fadeOut(1e3))),e.css({x:this.pathModel.cPoint.x-n.pathOptions.container.left,y:this.pathModel.cPoint.y-n.pathOptions.container.top}),e.appendTo("#tiles"),e.find(".button").one("click",this,function(){n.options.animate=!0,t.pathModel.phrase._complete(!0),t.pathModel.phrase.words.valueHasMutated(),n.options.animate=!1}).transition({rotateY:"360deg"},500,"ease"),this.width=function(){return e.outerWidth()/2},null!=this._guiElem&&this._guiElem.remove(),this._guiElem=e,this.updateBtn()},n.prototype.updateElem=function(){this.pathModel.phrase.complete()&&(this._guiElem.find(".magnet").addClass("complete"),this._guiElem.off("click"));var e={x:this.cPoint.x-n.pathOptions.container.left-this._guiElem.outerWidth()/2,y:this.cPoint.y-n.pathOptions.container.top-this._guiElem.outerHeight()/2,rotate:this.angle+"deg"};e.scale=.8*this.scale,this._guiElem.stop(),this._guiElem.transition(e,500,"ease")},n.prototype.createElem=function(){var o,i=$("<div/>",{"class":"magnet-placeholder elem"});if(this.pathModel.phrase.complete()||!this.wordModel.$el)o=$("<div/>",{"class":"magnet",text:this.wordModel.lemma}),this.wordModel.isRelated&&o.addClass("related");else{o=this.wordModel.$el.clone(),o.css({left:0,top:0});var a=this.wordModel,r=this.pathModel,s=this.index,l=this;i.data("immovable",function(){return r.phrase.complete()}),i.draggable({usePercentage:!1,centerBased:!1,withinEl:$("#app"),dragStart:function(e,n){if(!r.phrase.complete()){t.activeWord(a),a.tX=i.css("x"),a.tY=i.css("y"),i.css({rotate:0,scale:1,x:0,y:0,left:a.tX,top:a.tY});var o=$("#tiles").offset().left,s=$("#tiles").offset().top;n.l-=o,n.r-=o,n.t-=s,n.b-=s}},dropped:function(n,o){if(!r.phrase.complete())if(t.activeWord(null),o.hasMoved){var c=$("#workspace").offset();if(o.top-=o.within.t+o.scrollTopChange,o.left-=o.within.l,console.log(o.top,o.left,c.top,o.within),c.top<o.top+20){var d=$("#workspace").innerWidth(),u=$("#workspace").innerHeight();a.originalY=1*((o.top-c.top)/u).toFixed(4),a.originalX=1*((o.left-c.left)/d).toFixed(4),a.originalX<0&&(a.originalX=0),a.originalY<0&&(a.originalY=0),e.trigger("server:game:move-word",{username:t.username,gameID:t.gameID,word:{id:a.id,x:a.originalX,y:a.originalY}}),delete a.lastBox,r.removeWordAt(s)}else i.css({rotate:l.angle,scale:.8,left:0,top:0,x:a.tX,y:a.tY})}else delete a.lastBox,r.removeWordAt(s)}})}o.addClass("placed"),i.css({x:this.pathModel.cPoint.x-n.pathOptions.container.left,y:this.pathModel.cPoint.y-n.pathOptions.container.top,scale:.8}),i.appendTo("#tiles"),o.appendTo(i),null!=this._guiElem&&this._guiElem.remove(),this._guiElem=i,this.updateElem()},n.prototype.updateRect=function(){this._guiRect.css({x:this.cPoint.x-n.pathOptions.container.left-this._guiRect.outerWidth()/2,y:this.cPoint.y-n.pathOptions.container.top-this._guiRect.outerHeight()/2,rotate:this.angle,scale:this.scale})},n.prototype.createRect=function(){var e=$("<div/>",{"class":"magnet-placeholder"}),t=this.isCircle?"circle":"box";e.append($("<div/>",{"class":t})),e.css({x:this.pathModel.cPoint.x-n.pathOptions.container.left,y:this.pathModel.cPoint.y-n.pathOptions.container.top,zIndex:0}),e.appendTo("#tiles"),this._guiRect=e,this.updateRect()},n.prototype._clear=function(){this._guiRect&&this._guiRect.remove(),this._guiElem&&this._guiElem.remove(),this._guiElem=null,this._guiRect=null},n.prototype.remove=function(){this._clear()},n.options={animate:!1,rect:{style:{strokeColor:"#CBB28F",strokeWidth:1,fillColor:i,shadowColor:i},activeStyle:{strokeWidth:2,shadowColor:"#CBB28F",shadowBlur:5,shadowOffset:new o.Point(0,0)},size:new o.Point(30,15)},circle:{radius:8,margin:16,width:23,style:{fillColor:"#CBB28F",shadowBlur:0,strokeWidth:0},activeStyle:{strokeWidth:2,strokeColor:"#CBB28F",shadowBlur:20,shadowColor:"#CBB28F",shadowOffset:new o.Point(0,0)}},textStyle:{fillColor:"grey",justification:"center",fontSize:14,font:"CopseRegular"}},n});
define('game/canvas/vm/Path',["durandal/app","api/datacontext","game/canvas/vm/Box","paper"],function(e,t,o){function n(e){this._displayItems=[],this._trash=[],this.pathModel=e}var i=t.activeWord,a=t.activeWords,r=new paper.Color(0,0),s=null;return i.subscribe(function(e){null==e&&null!=s&&s.drop()}),n.activePath=null,n.prototype.isActive=!1,n.prototype.leavingHandler=0,n.prototype.enter=function(){var e=null!=a(),t=this.pathModel;if(e){var o=a();if(o.length!=t.nWords)return;for(var i=0;i<t.guiBoxes.length;i++)t.guiBoxes[i].enter(o[i])}else t&&t.onEnter&&(this.isActive||(n.activePath&&n.activePath!=this&&(n.activePath.isActive=!1),this.isActive=!0,n.activePath=this,t.onEnter(this.midPath)),this.leavingHandler&&(clearTimeout(this.leavingHandler),this.leavingHandler=0))},n.prototype.leave=function(){var e=this.pathModel;if(null!=a()){var t=a();if(t.length!=e.nWords)return;for(var o=0;o<e.guiBoxes.length;o++)e.guiBoxes[o].leave()}else e&&e.onLeave&&(this.leavingHandler&&clearTimeout(this.leavingHandler),this.leavingHandler=setTimeout(function(t){t.isActive&&(t.isActive=!1,e.onLeave(),n.activePath==t&&(n.activePath=null))},1,this))},n.prototype._canPut=!0,n.prototype.put=function(){if(e.console.log(++this._putFlags),this._canPut&&null!=a()){this._canPut=!1,setTimeout(function(e){e._canPut=!0},500,this);var t=a(),o=this.pathModel;if(t.length!=o.nWords)return t.length>o.nWords?e.dialog.show("alert",{content:"too many words"}):e.dialog.show("alert",{content:"need more words"}),void 0;a(null);for(var n=0;n<o.guiBoxes.length;n++)o.addWord(t[n],n)}},n.prototype.events={boxHoverEvents:{mouseenter:function(e){s=this.data.enter(i()),this.data.pathModel.canvas.enter(e)},mouseleave:function(){this.data.leave(),this.data.pathModel.canvas&&this.data.pathModel.canvas.leave()},mousedown:function(){this.data.pathModel.canvas.put()}}},n.prototype.dispose=function(){this.remove(),this._removeAll(this.pathModel.guiBoxes),delete this.pathModel.guiBoxes},n.prototype.setup=function(){console.log("%cPath Setup","background: orange; color: white",this.pathModel.id);var e=this.pathModel,t=e.nWords;if(0==e.nWords&&(t=6),e.guiBoxes&&e.guiBoxes.length==t)for(var n=0;t>n;n++){var i=e.guiBoxes[n];i.updateModel(e)}else if(e.guiBoxes)if(e.guiBoxes.length>t)e.guiBoxes[t].remove(),e.removeWordAt(t),e.guiBoxes.splice(t,1);else{var i=new o(t-1,e);e.guiBoxes.push(i),this._displayItems.push(i)}else{e.guiBoxes=[];for(var n=0;t>n;n++){var i=new o(n,e);e.guiBoxes.push(i),this._displayItems.push(i)}}},n.prototype.show=function(){console.log("%cPath","background: orange; color: white",this.pathModel.id+" is being drawn");var e=this.pathModel,t=e.nWords;if(null!=e.guiBoxes){this._cleanCycle();var o=n.getDesiredLength(e.guiBoxes);path=n.getBestArc(e.startTile.center,e.endTile.center,o,e.cw,t),this.midPath=path.getPointAt(path.length/2);for(var i=path.length-o,a=(path.length-2*(n.options.tileMargin+n.options.tileRadius),n.options.tileRadius+n.options.tileMargin),r=a,s=0;t>s;s++){var l=e.guiBoxes[s],c=l.width()/2+n.options.rectMargin+i/(2*t);r+=c;var d=path.getPointAt(r),u=path.getTangentAt(r),p=0,h=path.getNormalAt(r).normalize((e.cw?1:-1)*p),g=this.createHoverArea(path,r,l.width()+2*n.options.rectMargin+i/t);g.data=l,r+=c,l.cPoint=d.add(h),l.angle=u.angle,l.scale=i>=0?1:path.length/o,l.show(),n.options.debug&&(g.strokeColor="lightgreen")}if(n.options.debug){this._trash.push(path);for(var s=0;s<n._trash.length;s++)this._trash.push(n._trash[s]);n._trash=[]}else path.remove();paper.view.draw()}},n.prototype.createHoverArea=function(e,t,o){var i=t-o/2,a=e.getPointAt(i),s=e.getNormalAt(i).normalize(n.options.hoverMargin),l=t+o/2,c=e.getPointAt(l),d=e.getNormalAt(l).normalize(n.options.hoverMargin),u=new paper.Path(a.add(s),a.subtract(s),c.subtract(d),c.add(d));return u.closePath(),u.fillColor=r,u.on(this.events.boxHoverEvents),this._trash.push(u),u},n.prototype._cleanCycle=function(){this._removeAll(this._trash),this._trash=[],n.options.debug&&n._clear()},n.prototype._removeAll=function(e){if(null!=e)for(var t=0;t<e.length;t++)e[t].remove()},n.prototype.remove=function(){this._removeAll(this._trash),this._removeAll(this._displayItems),this._displayItems=[],this._trash=[]},n._trash=[],n.getBestArc=function(e,t,o,i,a,r){var s=t.subtract(e).length,l=n.options.minArc*(a/2),c=n.options.maxArc*(a/3),d=new paper.Path.Line(e,t),u=d.getPointAt(d.length/2),p=d.getNormalAt(d.length/2);d.remove(),s>550&&(c*=550/s,l=n.options.minArc*(a/4)),c>150&&(c=150),c=30*a,l=c-40,d=new paper.Path.Line(u.subtract(p.normalize(-l*(i?1:-1))),u.subtract(p.normalize(-c*(i?1:-1))));var h,g=0,f=d.length,v=1e4,m=d.length/2;r=r||10;for(var w=0;r>w;w++,m/=2){var y=d.getPointAt((g+f)/2),b=new paper.Path.Arc(e,y,t);Math.abs(b.length-o)<v?(h&&h.remove(),v=Math.abs(b.length-o),h=b):b.remove(),b.length>o?f-=m:g+=m}if(n.options.debug){var x=new paper.Path.Circle(u,5);x.fillColor="orange",d.strokeColor="orange",d.strokeWidth=2,h.strokeColor="grey",n._trash.push(x),n._trash.push(d)}else d.remove();return h},n.getDesiredLength=function(e,t){for(var o=2*(n.options.tileMargin+n.options.tileRadius),i=0;i<(t||e.length);i++)o+=e[i].width()+2*n.options.rectMargin;return o},n._clear=function(){for(var e=0;e<n._trash.length;e++){var t=n._trash[e];t.remove()}n._trash=[]},n.options={tileRadius:80,tileMargin:10,hoverMargin:48,rectMargin:0,minArc:33,maxArc:99,debug:0,container:null},n.Box=o,n.Box.pathOptions=n.options,n});
define('game/canvas/vm/confirm-box',["./Path","./Box"],function(e){var t=paper,o=function(e){this._trash=[],this.hide=function(){for(var e=0;e<this._trash.length;e++)this._trash[e].remove()},t=e};return o.prototype.events={mouseenter:function(){this.style={shadowColor:"#b8b0a3",shadowBlur:3,shadowOffset:new t.Point(0,0)}},mouseleave:function(){this.style={shadowBlur:0}},mousedown:function(){}},o.prototype.show=function(e){this.hide(),this.showDoneCenter(e)},o.prototype.showBox=function(o,n){for(var i,a=0;a<n.length&&n[a].hasData;a++)i=n[a];var r=i.cPoint.add(o.getNormalAt(o.length/2).normalize(-60)).add([50,0]),s=this.createDoneContainer(),l=this.createDoneButton(new t.Point(0,0));s.position=r,l.position=r.add([0,15]);var c=new t.PointText({point:r.add([0,-15]),content:"Are you done?"});c.style=e.Box.options.textStyle,c.fontSize=12,c.fillColor="black",this._trash.push(c)},o.prototype.createDoneContainer=function(){var e=new t.Point(60,40),o=new t.Path.Rectangle(e.negate(),e);return this._trash.push(o),o.style={fillColor:"white",strokeColor:"#e8e0d3",shadowColor:"#b8b0a3",shadowBlur:5,shadowOffset:new t.Point(1,1)},o.bringToFront(),o},o.prototype.showDoneCenter=function(e){var t=50,o=e.length/2,n=e.getNormalAt(o).normalize(t),i=e.getPointAt(o).add(n),a=this.createDoneButton(i);a.rotate(e.getTangentAt(o).angle,i),this._trash.push(a)},o.prototype.createDoneButton=function(o){var n=new t.Group,i=new t.Point(30,15),a=new t.Path.Rectangle(o.subtract(i),o.add(i));a.strokeColor="#e8e0d3",a.fillColor="orange",a.strokeWidth=2;var r=new t.PointText({point:o,content:"Done"});return r.style=e.Box.options.textStyle,r.fillColor="white",r.position.y+=4,r.characterStyle.fontStyle="bold",n.addChild(a),a=a.clone(),n.addChild(a),n.addChild(r),a.fillColor=new t.Color(0,0),a.bringToFront(),a.on(this.events),this._trash.push(n),n},o});
define('game/canvas/vm/DynamicPath',["api/datacontext","./Box","./Path","./confirm-box","paper"],function(e,t,n){function o(e){var t=this;this.pathModel=e,this.activeWord=null,this.activeWords=null,this.events={mouseenter:function(){if(null!=i()){for(var e=t.pathModel.guiBoxes,n=i(),o=0;o<e.length;o++)e[o].enter(n);r=t,t.activeWord=n}else if(null!=a()){var s=a();if(s.length>=3&&s.length<=6){for(var e=t.pathModel.guiBoxes,o=0;o<e.length;o++)e[o].enter({});r=t,t.activeWords=s}}else{var l=t.pathModel;l&&l.onEnter&&l.onEnter(t.midPath)}},mouseleave:function(){if(r==t){for(var e=t.pathModel.guiBoxes,n=0;n<e.length;n++)e[n].leave();r=null,t.activeWord=null,t.activeWords=null}else{var o=t.pathModel;o&&o.onLeave&&o.onLeave()}}},this.events.mousedown=function(e){if(null!=t.activeWord)t.pathModel.addWord(t.activeWord),t.events.mouseleave(e);else if(null!=t.activeWords){for(var n=t.activeWords,o=0;o<n.length;o++)t.pathModel.addWord(n[o]);t.pathModel.phrase._complete(!0),t.pathModel.phrase.words.valueHasMutated(),t.events.mouseleave(e)}},this.drop=function(){t.events.mousedown()},this.draw=this.show}var i=e.activeWord,a=e.activeWords;new paper.Color(0,0);var r=null;return i.subscribe(function(e){null==e&&null!=r&&r.drop()}),o.prototype=new n,o.prototype.constructor=o,o.prototype.show=function(){console.log("%cDynamic Path","background: orange; color: white",this.pathModel.id+" is being drawn");var e=this.pathModel,o=6,i=e.phrase.words().length>=3&&!e.phrase.complete();i?(void 0==this.confirmBox&&(this.confirmBox=new t(-1,null),this.confirmBox.button(e),this.confirmBox.show()),e.guiBoxes.splice(o,0,this.confirmBox),o++):this.confirmBox&&(this.confirmBox.remove(),this.confirmBox=void 0),e.phrase.complete()===!0?(o=e.phrase.words().length,this._hideCircles()):this._showCircles(),this._cleanCycle();var a=n.getDesiredLength(e.guiBoxes,o),r=n.getBestArc(e.startTile.center,e.endTile.center,a,e.cw,o);this.cPoint=n.cPoint,this.midPath=r.getPointAt(r.length/2);var s=r.length-a,l=(r.length-2*(n.options.tileMargin+n.options.tileRadius),n.options.tileRadius+n.options.tileMargin),c=l,d=new paper.Path;d.add(e.startTile.center);for(var u=0;o>u;u++){var p=e.guiBoxes[u],h=p.width()/2+n.options.rectMargin+s/(2*o);c+=h;var g=r.getPointAt(c),f=r.getNormalAt(c).normalize(n.options.hoverMargin/1.5);d.add(g.subtract(f)),d.insert(0,g.add(f)),c+=h,p.cPoint=g,p.angle=f.angle+90,p.scale=s>=0?1:r.length/a,p.show()}if(d.on(this.events),d.fillColor=new paper.Color(0,0),d.add(e.endTile.center),d.closePath(),this._trash.push(d),i){for(var u=0;o>u;u++){var p=e.guiBoxes[u];if(p.isButton)break}e.guiBoxes.splice(u,1)}n.options.debug?(d.strokeColor="lightgreen",this._trash.push(r)):r.remove(),paper.view.draw()},o.prototype._hideCircles=function(){for(var e=0;e<this.pathModel.guiBoxes.length;e++)this.pathModel.guiBoxes[e].isCircle&&this.pathModel.guiBoxes[e].hideIfEmpty()},o.prototype._showCircles=function(){for(var e=0;e<this.pathModel.guiBoxes.length;e++)this.pathModel.guiBoxes[e].isCircle&&this.pathModel.guiBoxes[e].showIfEmpty()},o});
define('game/canvas/paths',["durandal/app","api/datacontext","game/canvas/vm/Path","game/canvas/vm/DynamicPath","paper"],function(e,t,n,o){function i(e){paper.dfd.promise().then(function(){console.log("UpdateModel");var o=$("#tiles"),i=o.parent();n.options.container={width:o.width(),height:o.height(),left:i.position().left,top:i.position().top},a(e);for(var r=t.paths(),s=0;s<r.length;s++){var l=r[s],c=l.startTile.center,d=l.endTile.center;l.cPoint=l.cPoint||new paper.Point,l.cPoint.x=(c.x+d.x)/2,l.cPoint.y=(c.y+d.y)/2}})}function a(e){function o(e,t){var o=new paper.Point;return o.x=n.options.container.width*e+n.options.container.left,o.y=n.options.container.height*t+n.options.container.top,o}e=e||t.tiles();for(var i=0;i<e.length;i++){var a=e[i];a.center=o(a.x,a.y)}}function r(e){paper.dfd.promise().then(function(){e.hasOwnProperty("canvas")||(e.canvas=0===e.nWords?new o(e):new n(e),s.call(e),e.canvasSub=e.phrase.words.subscribe(s,e),e.dispose=function(){console.log("%cPath Disposed","background: orange; color: white",e.id),e.canvasSub&&(e.canvasSub.dispose(),delete e.canvasSub),e.canvas&&(e.canvas.dispose(),delete e.canvas)})})}function s(){i();var e=this;paper.dfd.promise().then(function(){e.canvas.setup(),e.canvas.show()})}function l(e){console.log("paths setup"),paper.setup(e),paper.pathsCSize={w:$(e).width(),h:$(e).height()},p=e,paper.dfd.resolve()}function c(){var e=p.getContext("2d");e.canvas.width=$(p).width(),e.canvas.height=$(p).height(),i();for(var n=t.paths(),o=0;o<n.length;o++)n[o].canvas.show();paper.view.draw()}function d(){var e={w:$(p).width(),h:$(p).height()};paper.pathsCSize.w!=e.w||paper.pathsCSize.h!=e.h?(paper.pathsCSize=e,paper.setup(p),c(),console.log("resized occurred")):console.log("resized ignored")}function u(){console.log("paths disposed"),paper.dfd=$.Deferred()}var p;return e.on("app:resized").then(d),t.tiles.subscribe(function(e){t.paths().length&&i(e)}),t.paths.subscribe(function(e){for(var t=0;t<e.length;t++)r(e[t])}),paper.dfd=$.Deferred(),t.tiles().length&&t.tiles.notifySubscribers(t.tiles()),t.paths().length&&t.paths.notifySubscribers(t.paths()),e.on("game:tiles:update").then(a),e.on("app:force-resize").then(c),{setup:l,redraw:c,dispose:u}});
define('game/canvas',["api/datacontext","paper","game/canvas/paths"],function(e,t,n){function o(e){var t=e.getContext("2d");t.canvas.width=$(e).width(),t.canvas.height=$(e).height(),n.setup&&n.setup(e)}return{compositionComplete:function(e){o(e)},binding:function(){return{cacheViews:!1}},detached:function(){n.dispose()}}});
define('game-editor/edit',["durandal/app","durandal/system","plugins/router","api/datacontext","./Tile","./_server","game/canvas"],function(e,t,n,o,i){var a=0,r={words:[{id:17,angle:-3.7593988655135036,x:.66,y:.10304030562518166,isRelated:!1,lemma:"mmmmmm",points:4},{id:12,angle:-3.4063681517727673,x:.21,y:.10582611734513193,isRelated:!1,lemma:"mmmmm",points:1},{id:18,angle:-1.4734306372702122,x:.75,y:.09065341219073161,isRelated:!1,lemma:"ppppppppppppp",points:2},{id:8,angle:-1.205036765895784,x:.75,y:-.005974720227532089,isRelated:!1,lemma:"pppppppppp",points:1},{id:13,angle:2.648484369274229,x:.30000000000000004,y:.09659385376377032,isRelated:!1,lemma:"bb",points:4},{id:1,angle:2.1487802150659263,x:.12,y:-.0012193915154784917,isRelated:!1,lemma:"bb",points:4},{id:19,angle:.41890177642926574,x:.84,y:.10237198378425091,isRelated:!1,lemma:"bb",points:1},{id:10,angle:-4.26587772089988,x:.03,y:.10073526226216928,isRelated:!1,lemma:"ccc",points:4},{id:15,angle:.4335586610250175,x:.48,y:.09012758530676365,isRelated:!1,lemma:"ccc",points:3},{id:3,angle:.11435552965849638,x:.30000000000000004,y:.00413871304364875,isRelated:!1,lemma:"dddd",points:3},{id:6,angle:4.282350090797991,x:.5700000000000001,y:-.0017783761210739613,isRelated:!1,lemma:"dddd",points:1},{id:11,angle:4.6806065598502755,x:.12,y:.10505832111695781,isRelated:!1,lemma:"eeeee",points:3},{id:16,angle:4.599650478921831,x:.5700000000000001,y:.09557405668077991,isRelated:!0,lemma:"eeeee",points:1},{id:7,angle:-.7446857844479382,x:.66,y:-.000411419621668756,isRelated:!1,lemma:"gggggg",points:2},{id:2,angle:2.2331691347062588,x:.21,y:-.009482073495164514,isRelated:!1,lemma:"gggggg",points:3},{id:9,angle:.24570417124778032,x:.84,y:-.0014767247764393688,isRelated:!1,lemma:"hhhhhhh",points:1},{id:14,angle:2.116484788712114,x:.39,y:.10969814801588655,isRelated:!1,lemma:"hhhhhhh",points:0},{id:4,angle:-1.8087744829244912,x:.39,y:.006773537730332464,isRelated:!1,lemma:"kkkkkkkkk",points:3},{id:5,angle:4.207501553464681,x:.48,y:-.003607121885288507,isRelated:!1,lemma:"kkkkkkkkk",points:3},{id:0,angle:4.444658893626183,x:.03,y:-.0062058544321917,isRelated:!1,lemma:"care",points:2}]};ko.utils.arrayForEach(r.words,function(e){e.isSelected=ko.observable(!1)});var s=function(e){var t=this;t.id=e,t.level=ko.observable(0),t.draft=ko.observable(!0),a=0};return s.prototype.debugMode=ko.observable(!1),s.prototype.debug=function(){var e=this;t.acquire("game/canvas/vm/Path").then(function(t){e.debugMode(t.options.debug^=!0);for(var n=o.paths(),i=0;i<n.length;i++)n[i].phrase.words.valueHasMutated()})},s.prototype.portraitMode=ko.observable(!1),s.prototype.portrait=function(){var e=this;e.portraitMode(!e.portraitMode())},s.prototype.addTile=function(){var e=new i(a++);o.tiles.push(e)},s.prototype.back=function(){n.navigate("game-editor")},s.prototype.save=function(){if(!e.loading()){var t=ko.utils.arrayMap(o.tiles(),function(e){return{id:e.id,x:1*e.x.toFixed(2),y:1*e.y.toFixed(2),angle:e.angle()}}),n=ko.utils.arrayMap(o.paths(),function(e){return{id:e.id,startTile:e.startTile.id,endTile:e.endTile.id,cw:e.cw,nWords:e.nWords}}),i={command:"set",id:this.id,tiles:t,paths:n,level:1*this.level(),draft:1*this.draft()},a=this;e.loading(!0),e.trigger("server:manager:boards",i,function(t){t.success?(a.id=t.id,e.dialog.show("alert",{content:"Game Board Saved"})):e.dialog.show("alert",{content:"Failed to save the board"}),e.loading(!1)})}},t.extend(s.prototype,{activate:function(t){if(this.id="new"==t?-1:1*t,o.players([{username:"player",score:100,active:ko.observable(!0)},{username:"opponent",score:0,active:ko.observable(!1)}]),o.player=o.players()[0],o.words(r.words),-1!=this.id){var n=this;o.loading(!0),e.trigger("server:manager:boards",{command:"get",id:this.id},function(e){if(o.loading(!1),e.success){var t=e.board;ko.utils.arrayForEach(t.tiles,function(e){e.id>a&&(a=e.id+1),o.tiles.push(new i(e.id,1*e.x,1*e.y,e.angle))}),ko.utils.arrayForEach(t.paths,function(e){var t=ko.utils.arrayFirst(o.tiles(),function(t){return t.id==e.startTile}),n=ko.utils.arrayFirst(o.tiles(),function(t){return t.id==e.endTile});n.addPath(t,null,e.nWords,e.cw)}),n.level(t.level),n.draft(t.draft)}})}},binding:function(){return{cacheViews:!1}},compositionComplete:function(){},loading:e.loading,deactivate:function(){for(var e=o.paths(),t=0;t<e.length;t++)e[t].dispose();o.paths.removeAll(),o.tiles.removeAll(),o.words.removeAll(),$("#menu").remove()}}),s});
define('text!game-editor/menu.html',[],function () { return '<div>\r\n   <div style="margin: 30px 0 0 30px">\r\n      <button class="orange flat" data-bind="click: createNew">Create New Game Board</button>\r\n      <div class="loader active" data-bind="visible: !groups().length">\r\n         <i class="icon-spinner icon-2x icon-spin"></i>\r\n      </div>\r\n   </div>\r\n   <div class="grid container y scroll auto" data-bind="foreach: groups, style:{\'max-height\': height() + \'px\'}" style="max-width:550px">\r\n      <!-- ko if: $data -->\r\n      <h1>Level <span data-bind="text: key"></span></h1>\r\n      <div class="table compact" data-bind="foreach: { data: value, beforeRemove: $root.beingRemove }">\r\n         <div class="game-item">\r\n            <div class="cell" style="width: 500px" data-bind="click: $root.edit">\r\n               <div class="float left"\r\n                    style="height: 3em; width: 4em; position: relative; margin-right: 10px; box-shadow: 0 0 1px #986B31; background-color: #F1EAD7"\r\n                    data-bind="foreach: tiles">\r\n                  <a data-bind="style: { left: 100 * x + \'%\', top: 100 * y + \'%\' }"\r\n                     style="display: block; background-color: rgba(255, 106, 0, .5); width: 10px; height: 10px; border-radius: 100%; position: absolute; margin-left: -5px; margin-top: -5px"></a>\r\n               </div>\r\n               <div class="float left">\r\n                  <div>#Tiles: <span class="bold" data-bind="text: tiles.length"></span></div>\r\n                  <div>#Paths: <span class="bold" data-bind="text: paths.length"></span></div>\r\n               </div>\r\n               <div class="float left">\r\n                  <div style="margin-left:2em">\r\n                     <span data-bind="timeAgo: lastMod, attr:{title: new Date(lastMod)}"></span>\r\n                  </div>\r\n                  <div style="margin-left:2em">\r\n                     <span data-bind="if: draft">Draft</span>\r\n                     <span data-bind="ifnot: draft">Published</span>\r\n                  </div>\r\n               </div>\r\n               <div class="float right visibleOnHover visibleOnActive">\r\n                  <button class="right blue flat" data-bind="click: $root.remove, clickBubble: false">Remove</button>\r\n               </div>\r\n            </div>\r\n         </div>\r\n      </div>\r\n      <!-- /ko -->\r\n   </div>\r\n</div>\r\n';});

define('game-editor/menu',["plugins/router","durandal/app","api/datacontext","./_server"],function(e,t){var n=ko.observableArray();return{height:ko.observable(100),activate:function(){n([]),t.trigger("server:manager:boards",{command:"getAll"},function(e){for(var t=n(),o=e.boards,i=0;i<o.length;i++){var a=o[i],r=a.level;t.hasOwnProperty(r)||(t[r]={key:r,value:ko.observableArray()}),t[r].value.push(a)}n.valueHasMutated()})},groups:n,edit:function(t){e.navigate("game-editor/edit/"+t.id)},remove:function(e){t.dialog.show("confirm",{content:"Are you sure you want to remove this game board?",modal:!0,doneText:"YES",cancelText:"NO"}).then(function(o){if("done"==o){t.trigger("server:manager:boards",{id:e.id,command:"delete"});var i=n()[e.level].value,a=i.indexOf(e);i.splice(a,1)}})},beingRemove:function(e){"DIV"==e.tagName&&$(e).fadeOut(300)},createNew:function(){e.navigate("game-editor/edit/new")},binding:function(){return{cacheViews:!1}},compositionComplete:function(){$(window).bind("resize",this,this.resize),this.resize({data:this})},resize:function(e){e.data.height($(window).innerHeight()-120)},deactivate:function(){$(window).unbind("resize",this.resize)}}});
define('text!game-editor/tiles.html',[],function () { return '<div id="gameboard">\r\n   <div id="tiles-max">\r\n      <div id="tiles-aspect">\r\n         <div id="tiles" data-bind="css: collection.name" style="border: 1px solid orange">\r\n            <div class="container" style="border: 1px solid blue" data-bind="foreach: { data: tiles, afterRender: afterRender }">\r\n               <div class="tile">\r\n                  <div class="tile-circle">\r\n                     <div style="position:relative; width: 100%; height:100%">\r\n                        <div class="cloud drag">\r\n                           <div class="rule">\r\n                              <span data-bind="text: instruction"></span>\r\n                              <div class="info" data-bind="text: info"></div>\r\n                              <div class="help"></div>\r\n                           </div>\r\n                        </div>\r\n                        <div class="mask norm" data-bind="style: { backgroundPosition: ((100 / 29) * imageId).toFixed(2) + \'% 0\' }"></div>\r\n                        <div class="rest" data-bind="foreach: rest">\r\n                           <div class="thumbnail"\r\n                                data-bind="style: { backgroundImage: \'url(\\\'\' + imageName + \'\\\')\' }, click: $parent.addPath.bind($parent)">\r\n                           </div>\r\n                        </div>\r\n                        <div class="control">\r\n                           <div style="width: 30px; position: relative; top: 10px;">\r\n                              <div class="up" data-bind="click: $parent.tileAngleUp, clickBubble: false"></div>\r\n                              <div class="number" data-bind="text: angle"></div>\r\n                              <div class="down" data-bind="click: $parent.tileAngleDown, clickBubble: false"></div>\r\n                              <div style="clear: both"></div>\r\n                           </div>\r\n                           <div style="width: 20px; position: absolute; top: 20px; right: 0">\r\n                              <div class="btnDel" data-bind="click: $parent.del">X</div>\r\n                           </div>\r\n                        </div>\r\n                     </div>\r\n                  </div>\r\n               </div>\r\n            </div>\r\n         </div>\r\n      </div>\r\n   </div>\r\n</div>\r\n';});

define('game-editor/tiles',["durandal/app","api/datacontext","api/draggable"],function(e,t){function n(){for(var e=0;e<i.length;e++){var t=i[e].$el,n=i[e].tile;t.css({left:100*n.x+"%",top:100*n.y+"%"}),t.find(".mask").css({scale:1,fontSize:"1em"}),n.ruleOffset={x:0,y:0},o(n,!0)}i=[]}function o(e,t){var n=e.angle();return e.$inst.css({rotate:n}),n>90||-90>n?e.$inst.find(".rule").css({rotate:180}):e.$inst.find(".rule").css({rotate:0}),void 0}var i=[];return{tiles:t.tiles,collection:t.collection,tileAngleUp:function(e){e.angle(e.angle()+1),o(e)},tileAngleDown:function(e){e.angle(e.angle()-1),o(e)},del:function(n){e.dialog.show("confirm",{content:"Delete tile?",modal:!0,doneText:"YES",cancelText:"NO"}).then(function(e){if("done"==e){for(var o=t.paths(),i=0;i<o.length;i++){var a=o[i];(a.startTile.id==n.id||a.endTile.id==n.id)&&(t.paths.splice(t.paths.indexOf(a),1),a.dispose(),i--)}t.tiles.splice(t.tiles.indexOf(n),1)}})},afterRender:function(a,r){var s=$(a).filter(".tile:first");r.$el=s,r.$inst=s.find(".cloud"),r.$el.draggable({withinEl:s.parent(),centerBased:!0,topLimit:!0,dragStart:function(){r.lastAngle=r.angle(),r.lastX=r.x},move:function(e,t){return r.x=t.left/s.parent().innerWidth(),r.y=t.top/s.parent().innerHeight(),r.lastAngle>90||r.lastAngle<-90?r.angle(r.lastAngle-Math.floor(90*(r.x-r.lastX))):r.angle(r.lastAngle+Math.floor(90*(r.x-r.lastX))),o(r),!0},dropped:function(n,o){if(o.hasMoved){e.trigger("game:tiles:update");for(var i=t.paths(),a=0;a<i.length;a++){var r=i[a];if(r.startTile.x>r.endTile.x){var s=r.startTile;r.startTile=r.endTile,r.endTile=s,r.cw^=1}r.phrase.words.valueHasMutated()}}}}),r.$inst.find(".rule").draggable({withinEl:$(document),centerBased:!0,usePercentage:!1,topLimit:!1,move:function(e,t){var n=Math.ceil(90+Math.atan2(t.top,t.left)*(180/Math.PI));return r.angle(n),o(r),!1}}),0==i.length&&setTimeout(n,100),i.push({$el:s,tile:r})}}});
define('game/canvas/circleWords',["durandal/system","durandal/app","api/datacontext","paper"],function(e,t,n){function o(){$("canvas").unbind("mouseup"),paper.tool.remove()}function i(){s=new paper.Tool,stars=[],path,s.minDistance=16,s.maxDistance=32,s.onMouseDown=function(e){e.event.preventDefault(),path=new paper.Path,path.add(e.point),stars=[],addStarAt(e.point)},s.onMouseDrag=function(e){e.event.preventDefault(),path.add(e.point),addStarAt(e.point)},s.onMouseUp=function(){if(0!=path.length){path.closePath();var e=r(path,c());if(e.length<3)console.log("Too few words!");else if(e.length>9)console.log("Too many words!"),t.dialog.show("alert",{content:"Too many words!"});else{e=a(e);for(var n=0;n<e.length;n++)console.log(e[n].id,e[n].lemma);l.resolve(e)}path.remove(),t.trigger("app:force-resize")}},addStarAt=function(e){star=new paper.Raster("star"),star.position=e,star.rotate(Math.floor(360*Math.random())),star.scale(.4+.6*Math.random()),star.removeOnUp()}}function a(e){function t(e){upper=e[0],slightY=0;for(var t=1;t<e.length;t++){var n=e[t],o=upper.y-n.y;o-slightY>.06?(upper.x-n.x>.06,upper=n,slightY=0):o>0&&(slightY+=o)}return e.splice(e.indexOf(upper),1),upper}function n(e,t){return e.x-t.x}var o=[];for(e.sort(n);e.length;)o.push(t(e));return o}function r(e,t){var n=$("#app").scrollTop();return ko.utils.arrayFilter(t,function(t){var o=t.$el.offset().left+t.$el.innerWidth()/2,i=t.$el.offset().top+n+t.$el.innerHeight()/2;return e.contains(o,i)})}var s,l,c=n.unplayedWords;return circleWords={load:function(){return l=e.defer(),t.trigger("app:force-resize"),o(),i(),l.promise()},unload:o}});
define('text!game/game.html',[],function () { return '<div>   \r\n   <img id="star" src="images/app/star.png" style="display: none;" />\r\n\r\n   <div id="game-main" data-bind="css: { loading: loading }">\r\n      <div class="logo page"></div>\r\n      <div id="game-players" data-bind="compose: \'game/players\'"></div>\r\n      <!--ko compose: { model: \'game/canvas\', mode: \'inline\' }--><canvas></canvas><!--/ko-->\r\n      <!--ko compose: \'game/tiles\'--><!--/ko-->\r\n      <!--ko compose: \'game/words\'--><!--/ko-->\r\n   </div>\r\n</div>\r\n';});

define('game/tutorial',["durandal/app","api/datacontext","dialogs/_constants"],function(e,t,o){function n(){this.swapWords=function(){var t=$(".palette.left .btn:first"),o=TUT.SWAP_WORDS;return o.css="left",o.top=t.offset().top,o.left=t.offset().left+60,o.fixed=!0,e.dialog.show("tutorial",o)},this.circleWords=function(){var t=$(".palette.left .btn:nth-child(2)"),o=TUT.SELECT_PHRASE;return o.css="left",o.top=t.offset().top,o.left=t.offset().left+60,o.fixed=!0,e.dialog.show("tutorial",o)},this.archivedGames=function(){var t=$(".palette.right .menu"),o=TUT.ARCHIVE_GAMES;return o.css="right",o.top=t.offset().top+i.scrollTop-10,o.left=t.offset().left-150,o.fixed=!0,e.dialog.show("tutorial",o)},this.placePhrase=function(){var t=window.innerWidth-300,o=$(".magnet-placeholder").filter(function(){return $(this).offset().top>200&&$(this).offset().left<t&&$(this).offset().left>70?!0:!1}),n=TUT.PLACE_PHRASE;return n.css="bottom left",n.top=o.offset().top-170+i.scrollTop,n.left=o.offset().left,e.dialog.show("tutorial",n)},this.fillPath=function(){var t=window.innerWidth-300,o=$(".magnet-placeholder").filter(function(){return $(this).offset().top>200&&$(this).offset().left<t&&$(this).offset().left>70?!0:!1}),n=TUT.FILL_PATH;return n.css="bottom left",n.top=o.offset().top-110+i.scrollTop,n.left=o.offset().left,e.dialog.show("tutorial",n)},this.workspace=function(){var t=$("#workspace"),o=TUT.WORKSPACE;return o.css="bottom right",o.top=t.offset().top-150+i.scrollTop,o.left=200,e.dialog.show("tutorial",o)},this.gameboard=function(){var t=$(".magnet-placeholder:first"),o=TUT.GAMEBOARD;return o.css="bottom left",o.top=t.offset().top-130+i.scrollTop,o.left=t.offset().left,e.dialog.show("tutorial",o)},this.bonus=function(){var t=window.innerWidth-300,o=$(".cloud .info").filter(function(){return $(this).offset().top>220&&$(this).offset().left<t&&$(this).offset().left>70?!0:!1}),n=TUT.BONUS;return n.css="bottom left",n.top=o.offset().top-220+i.scrollTop,n.left=o.offset().left+20,e.dialog.show("tutorial",n)},this.relatedWords=function(){var t=$(".magnet.related:first");if(0==t.length)return $.Deferred(function(e){e.reject()});var o=TUT.RELATED;return o.css="bottom right",o.top=t.offset().top-170+i.scrollTop,o.left=t.offset().left-120,o.fixed=!1,e.dialog.show("tutorial",o)}}TUT=o.TUT;var i=document.getElementById("app");n.prototype.getNext=function(){return this.qIndex=this.qIndex||0,[this.placePhrase,this.fillPath,this.bonus,this.swapWords,this.circleWords,this.relatedWords][this.qIndex++]},n.prototype.showNext=function(){var e=this.getNext();if(!e)return localStorage.setItem("tutorial","end"),$.Deferred();var t=this;return e().then(function(e){return e&&e.force?$.Deferred():t.showNext()},function(){localStorage.setItem("tutorial","related")})},n.prototype.show=function(){this.qIndex=0;var e=localStorage.getItem("tutorial");switch(e||this.showNext(),e){case"related":this.qIndex=5,this.showNext()}};var a=new n;return t._gameOver.subscribe(function(e){e&&!t.player.resigned()&&(localStorage.getItem("tutorial-menu")||setTimeout(function(){a.archivedGames(),localStorage.setItem("tutorial-menu",!0)},4e3))}),a});
define('game/game',["durandal/app","durandal/system","api/datacontext","dialogs/_constants","./tutorial"],function(e,t,o,n,i){function a(e,t,o){var n,i;$(".player").each(function(t,o){return ko.dataFor(o)==e?(n=$(o),void 0):void 0}),i=ko.utils.arrayMap(t.guiBoxes,function(e){return e});for(var a=n.offset().left+20,r=n.offset().top,s=0;s<i.length;s++){var l=$(i[s]._guiElem),c=i[s].wordModel.lemma,d=ko.utils.arrayFirst(o.words,function(e){return e.lemma==c}).points;console.log(d);for(var u=0;3*d>u;u++){var p=$("<div/>",{"class":"star"}),h=(5*Math.random()+3)/10,g=l.offset();p.css({scale:h,x:g.left*(1/h),y:g.top*(1/h),backgroundColor:"#"+Math.floor(16777215*Math.random()).toString(16)}),setTimeout(function(e){$("#app").append(e[0]),setTimeout(function(e){function t(){(n.parentNode||n.parentElement)&&(n.removeEventListener($.support.transitionEnd),n.remove?n.remove():(n.parentElement?n.parentElement.removeChild(n):n.parentNode.removeChild(n),console.log("second attempt")))}var o=1.3*Math.random()+.4;e[0].css({x:a*(o/e[1]),y:r*(o/e[1]),scale:e[1]/o,opacity:0});var n=e[0][0];n.addEventListener($.support.transitionEnd,t),setTimeout(t,1e3)},0,e)},700*Math.random(),[p,h])}}}function r(e){var t,n,i;$(".rule").each(function(a,r){return ko.dataFor(r)==e?(t=$(r),n=t.parent(),i=2*(e.bonus||(o.player.scored||o.player.score())*e.mul||20),void 0):void 0}),0==c++%2?t.transition({scale:1.2},{easing:"ease-in-out"}).transition({scale:.9},{easing:"ease-in-out"}).transition({scale:1},{easing:"ease-in-out"}):t.transition({rotate:"+=15"},{easing:"ease-in-out"}).transition({rotate:"-=30"},{easing:"ease-in-out"}).transition({rotate:"+=15"},{easing:"ease-in-out"});for(var a=0;i>a;a++){var r=$("<div/>",{"class":"star"}),s=(5*Math.random()+3)/10;t.position(),t.offset(),r.css({scale:s,left:60,top:-20});var l=200;setTimeout(function(e){n.append(e[0]),setTimeout(function(e){var t=1.3*Math.random()+.4,o=360*Math.random(),n=l*Math.cos(o*Math.PI/180),i=l*Math.sin(o*Math.PI/180);e[0].css({x:n*(t/e[1]),y:i*(t/e[1]),scale:e[1]/t,opacity:.1});var a=e[0][0];a.addEventListener($.support.transitionEnd,function(){(a.parentNode||a.parentElement)&&(a.removeEventListener($.support.transitionEnd),a.remove?a.remove():(a.parentElement?a.parentElement.removeChild(a):a.parentNode.removeChild(a),console.log("second attempt")))})},0,e)},700*Math.random(),[r,s])}}function s(){return o.gameOver()||o.resumedGame?(e.trigger("game:started:ready"),void 0):(document.getElementById("app").classList.add("noScroll"),setTimeout(function(){e.scrollDown(window.innerHeight,!0),setTimeout(e.scrollUp,800,!0),setTimeout(function(){document.getElementById("app").classList.remove("noScroll"),e.trigger("game:started:ready")},1500)},800),void 0)}o.canSwap=ko.observable(!1),o.loading.subscribe(function(t){t===!0?e.loading(!1):t===!1&&e.palette.show()});var l=null;o.activeWords.subscribe(function(e){if(e)for(var t=0;t<e.length;t++)e[t].isSelected(!0);else{e=l;for(var t=0;t<e.length;t++)e[t].isSelected(!1);e=null}l=e}),$(document).keydown(function(t){location.hash.match(/game/gi)&&(84==t.keyCode?(localStorage.removeItem("tutorial"),i.show()):83==t.keyCode?s():85==t.keyCode||(86==t.keyCode?e.trigger("game:rule:toggle"):87==t.keyCode&&(r(o.tiles()[0]),r(o.tiles()[1]))))});var c=0;e.on("game:updated").then(function(e){o.canSwap(o.player.active()),console.log(e),o.player.scored&&(a(o.player,o.lastPath,e.path.score),e.path.score.startTile.satisfied&&r(o.lastPath.startTile),e.path.score.endTile.satisfied&&r(o.lastPath.endTile))}),e.on("game:started").then(function(){o.canSwap(o.player.active()&&!o.actionDone),setTimeout(function(){s()},1e3)}),e.on("game:started:ready").then(function(){setTimeout(function(){i.show()},500)});var d=function(){e.dialog.close("confirm"),e.dialog.close("slipper"),o.canSwap(!0),o.mode("");for(var t=o.selectedWords(),n=0;n<t.length;n++)t[n].isSelected(!1);paper.tool.remove()},u=ko.computed(function(){return!o.gameOver()}),p=ko.computed(function(){return o.player.active()}),h={loadingStatus:o.loadingStatus,loading:o.loading,player:o.player,allowSwap:ko.computed(function(){return u()&&p()&&o.canSwap()&&(""===o.mode()||"swapWords"===o.mode())}),allowResign:ko.computed(function(){return u()}),allowCircle:ko.computed(function(){return u()&&p()&&(""===o.mode()||"circleWords"==o.mode())}),mode:o.mode,swapWords:function(){if("swapWords"==o.mode())d(),h._wordsSub&&(h._wordsSub.dispose(),h._wordsSub=null);else if(h.allowSwap()){e.dialog.show("slipper",n.SWAP_WORDS),o.mode("swapWords"),e.scrollDown();var t=!1,i=h;i._wordsSub=o.selectedWords.subscribe(function(n){"swapWords"!=o.mode()&&h._wordsSub.dispose(),n.length>0&&!t?(t=!0,e.dialog.show("confirm",{content:"",doneText:"Swap Words",cancelText:"Cancel"}).then(function(t){if("cancel"==t)i._wordsSub.dispose(),d();else if("done"==t){i._wordsSub.dispose(),e.dialog.close("slipper"),o.loadingStatus("Swapping words"),e.loading(!0);var n={username:o.player.username,gameID:o.gameID,words:ko.utils.arrayMap(o.selectedWords(),function(e){return e.id})};e.trigger("server:game:swap-words",n,function(t){t.success?o.canSwap(!1):d(),o.mode(""),e.loading(!1)})}})):n.length<=0&&t&&(t=!1,e.dialog.close("confirm"))})}},resign:function(){if(!o.gameOver()){var t=1==o.playerCount?"Are you sure you want to delete this game?":"Are you sure you want to resign?";e.dialog.show("confirm",{content:t,modal:!0,doneText:1==o.playerCount?"Delete":"Resign",cancelText:1==o.playerCount?"Cancel":"Cancel"}).then(function(t){"cancel"!=t&&e.trigger("server:game:resign",{username:o.player.username,gameID:o.gameID})})}},circleWords:function(){if(h.allowCircle()){if(o.activeWords())return o.activeWords(null),e.dialog.close("slipper"),void 0;var i={load:function(){e.dialog.show("slipper",n.CIRCLE_WORDS),e.scrollDown(),t.acquire("game/canvas/circleWords").then(function(t){t.load().then(function(t){e.scrollUp(),o.activeWords(t),i.unload(),e.dialog.show("slipper",n.CHOOSE_PATH)})}),o.activeWords(null)},unload:function(){e.dialog.close("slipper"),o.mode(""),paper.tool.remove()}};"circleWords"==o.mode()?i.unload():(o.mode("circleWords"),i.load())}}};return t.extend(h,{noTransite:!0,activate:function(t){e.loading(!0),e.trigger("game:dispose"),e.palette.dispose(),e.dialog.closeAll(),e.palette.hide({duration:0}),e.palette.add("quit","command","right").click(h.resign).css({disabled:ko.computed(function(){return!h.allowResign()})}),e.palette.add("swapWords","action","left").click(h.swapWords).css({cancel:ko.computed(function(){return"swapWords"===h.mode()}),disabled:ko.computed(function(){return!h.allowSwap()})}),e.palette.add("circleWords","action","left").click(h.circleWords).css({cancel:ko.computed(function(){return"circleWords"===h.mode()||o.activeWords()}),disabled:ko.computed(function(){return!h.allowCircle()})}),o.load(t)},binding:function(){return e.scrollUp({noAnimate:!0}),{cacheViews:!1}},compositionComplete:function(){},detached:function(){o.unload(),e.dialog.closeAll();for(var t=o.paths(),n=0;n<t.length;n++)t[n].dispose();o.paths.removeAll(),o.tiles.removeAll(),o.words.removeAll(),e.palette.dispose()}})});
define('text!game/players.html',[],function () { return '<div id="game-players">\r\n   <div id="players" data-bind="foreach: players, visible: !loading()">\r\n      <div class="player">\r\n         <div class="decoration">\r\n            <div class="score">\r\n               <p data-bind="text: score"></p>\r\n            </div>\r\n         </div>\r\n         <div class="name">\r\n            <p data-bind="text: username"></p>\r\n         </div>\r\n      </div>\r\n   </div>\r\n</div>\r\n';});

define('game/players',["api/datacontext"],function(e){return{players:e.players,loading:e.loading,binding:function(){return{cacheViews:!1}}}});
define('text!game/tiles.html',[],function () { return '<div id="gameboard" data-bind="css: {carry: carryingWords}">\r\n   <div id="tiles-max">\r\n      <div id="tiles-aspect">\r\n         <div id="tiles" data-bind="css: collection.name">\r\n            <div class="container" data-bind="foreach: { data: tiles, afterRender: afterRender }">\r\n               <div class="tile" data-bind="css: { active: active }, click: $root.toggleTile">\r\n                  <div class="tile-circle">\r\n                     <div class="cloud" data-bind="">\r\n                        <div class="rule" data-bind="click: $root.help, clickBubble: false, fadeVisible: !$root.gameOver() || $root.forceVisible()">\r\n                           <span data-bind="text: instruction"></span>\r\n                           <div class="info" data-bind="text: info"></div>\r\n                           <i class="command help sm"></i>\r\n                        </div>\r\n                     </div>\r\n                     <div class="mask" data-bind="style: { \'backgroundPosition\': ((100 / 29) * imageId).toFixed(2) + \'% 0\' }">\r\n                        <div class="big visibleOnActive" data-bind="style: { backgroundImage: \'url(\\\'\' + imageName + \'\\\')\' }"></div>\r\n                     </div>\r\n                  </div>\r\n               </div>\r\n            </div>\r\n         </div>\r\n      </div>\r\n   </div>\r\n   <div class="ui-overlay" data-bind="fadeVisible: disabled"></div>\r\n</div>\r\n<hr data-bind="visible: !loading()" />\r\n';});

define('game/tiles',["durandal/app","api/datacontext","api/draggable"],function(e,t){function o(e,t){if(h){var o=e.$inst,n=e.topOffset;n-t>0&&(o.appendTo(e.$parent).removeClass("fixed").css({left:0,top:0}),delete e.isFixed)}}function n(e,t){if(h){var o=e.$inst,n=o.find(".rule");if(elTop=n.offset().top,0>=elTop){var i=0,a=n.offset().left;e.topOffset=t+elTop,e.$parent=o.parent(),e.isFixed=!0,o.offset({left:a,top:i}).addClass("fixed").appendTo("body"),o.offset({left:a,top:i})}}}function i(){if(h)for(var e=document.getElementById("app").scrollTop,t=0;t<u.length;t++)u[t].active()||(u[t].$inst,u[t].isFixed?o(u[t],e):n(u[t],e))}function a(){r();for(var e=t.tiles(),o=0;o<e.length;o++)e[o].active()||(l(e[o]),s(e[o],!1))}function r(){p.w=$("#tiles").innerWidth(),p.h=$("#tiles").innerHeight(),p.ww=$("#tiles-max").innerWidth(),p.hh=$("#tiles-max").innerHeight(),p.hh>window.innerHeight?(p.hh=window.innerHeight-20,p.top=-$("#tiles-aspect").position().top,p.top+=30):p.top=0,e.el.clientWidth<900}function s(e,t){0!=p.h&&(t||e.$mask.addClass("noTransition"),e.origin=e.origin||{scale:1,h:e.$mask.outerHeight()},e.active()?(e.origin.scale=e.origin.h/p.hh,e.$mask.css({fontSize:1/e.origin.scale+"em"})):(e.origin.scale=e.origin.h/p.hh,e.$mask.css({scale:e.origin.scale,fontSize:1/e.origin.scale+"em"})),t||setTimeout(function(){e.$mask.removeClass("noTransition")},1))}function l(e,t){0!=p.h&&(t?p.top?e.$el.css({x:0,y:p.top}):e.$el.css({transform:""}):e.$el.css({x:e.x*p.w-p.w/2,y:e.y*p.h-p.h/2}))}function c(e){var t=e.angle;e.$inst.css({rotate:t}),(t>90||-90>t)&&e.$inst.find(".rule").css({rotate:180})}function d(){$("#app").unbind("scroll",i);for(var e=0;e<u.length;e++){var t=u[e].$inst;u[e].$mask.unbind($.support.transitionEnd),u[e].isFixed&&ko.removeNode(t[0])}u.splice(0,u.length)}var u=[],p={w:0,h:0,ww:0,hh:0,top:0},h=!1;e.on("game:rule:toggle").then(function(){if(h)for(var e=0;e<u.length;e++)o(u[e],0);h=!h}),e.on("app:resized").then(a),e.on("game:dispose").then(d);var g=ko.observable(!0);return e.on("game:started").then(function(){t.gameOver()&&t.resumedGame&&g(!1)}),e.on("game:tiles:visible",function(e){g(e)}),{loading:t.loading,tiles:t.tiles,gameOver:t.gameOver,forceVisible:g,collection:t.collection,carryingWords:ko.computed(function(){return t.activeWords()||t.activeWord()}),disabled:ko.computed(function(){var e=t.mode();return"swapWords"==e||"circleWords"==e}),activate:function(){$("#app, body").bind("scroll",i)},binding:function(){return{cacheViews:!1}},compositionComplete:function(){a()},toggleTile:function(t){var n=this.active();n?(setTimeout(i,500),l(t,!1),t.$mask.css({scale:t.origin.scale})):(s(t,!1),setTimeout(function(){t.isFixed&&o(t,0),l(t,!0),t.$mask.css({scale:1}),e.scrollUp()},0)),t.active(!n)},help:function(t,o){if(t.active())return o.stopPropagation=!1,!0;var n=t.$inst.offset(),i=n.left,a=n.top+200-$("#app").scrollTop();t.isFixed&&(a-=120),a=150,e.dialog.show("window",{heading:t.instruction,content:t.description,left:i,top:a})},afterRender:function(e,t){var o=$(e).filter(".tile:first");t.$el=o,t.$inst=o.find(".cloud"),t.$mask=o.find(".mask"),t.ruleOffset={x:0,y:0},t.$mask.bind($.support.transitionEnd,function(){t.active()||(t.$mask.addClass("noTransition"),t.$mask.css({transform:"",fontSize:""}),setTimeout(function(){t.$mask.removeClass("noTransition")},0))}),setTimeout(function(){c(t),l(t),u.push(t)},0)},detached:d}});
define('text!game/words.html',[],function () { return '<div id="workspace">    \r\n    <!--ko foreach: {data:words, afterRender: afterRender}--><div class="magnet" data-bind="css: { related: isRelated, selected: isSelected }"><span data-bind="text: lemma"></span><div class="points" data-bind="text: points"></div></div><!--/ko-->\r\n</div>';});

define('game/words',["api/datacontext","jquery","api/draggable"],function(e,t){({l:0,r:window.innerWidth,t:0,b:window.innerHeight/2});var o=e.unplayedWords,n=[],i=function(){function e(){n.length&&n.pop().call(this,e)}n=n.sort(function(){return.5-Math.random()}),setTimeout(e,75),setTimeout(e,200),setTimeout(e,280)};return{words:o,binding:function(){return{cacheViews:!1}},bindingComplete:function(){},detached:function(e){t(".magnet",e).each(function(e,o){t(o).data("draggable").dispose()})},afterRender:function(o,a){var r=t(o);void 0===a.originalX&&(a.originalX=a.x),void 0===a.originalY&&(a.originalY=a.y),a.x=a.originalX,a.y=a.originalY,r.css({left:(100*a.x).toFixed(2)+"%",top:(100*a.y).toFixed(2)+"%"}),r.data("immovable",e.words.immovable),r.draggable({withinEl:r.parent(),parent:t("#app"),dragStart:function(){"swapWords"==e.mode()?a.isSelected(1^a.isSelected()):(e.activeWord(a),r.css({rotate:0})),a.originalX=a.x,a.originalY=a.y},dropped:function(t,o){e.activeWord(null),a.x=1*(o.hasMoved?o.left/100:a.x).toFixed(4),a.y=1*(o.hasMoved?o.top/100:a.y).toFixed(4),!a.isPlayed&&o.hasMoved&&(a.originalX=a.x,a.originalY=a.y,app.trigger("server:game:move-word",{username:e.username,gameID:e.gameID,word:{id:a.id,x:a.x,y:a.y}}))}}),0==n.length&&setTimeout(i,100),n.push(function(e){r.css({rotate:a.angle,scale:1,opacity:1}).delay(100).promise().then(e)}),a.$el=r}}});
define('text!home/index.html',[],function () { return '<div>\r\n   <div id="login-page">\r\n      <div class="top">\r\n         <div id="bKey" class="background logo"></div>\r\n      </div>\r\n      <div class="bottom">\r\n         <div id="fKey" class="background footer"></div>\r\n      </div>\r\n   </div>   \r\n</div>\r\n';});

define('home/index',["durandal/app","durandal/activator","palette","api/datacontext","dialogs/templates/panel"],function(e,t,o,n){var i=e.on("account:view:change").then(function(t){e.loading(!0),e.dialog.show("panel",t,{compositionComplete:function(){$("input[autofocus]").focus(),e.loading(!1)}})});return{activate:function(){o.get("menu").visible(!1),o.get("currency").visible(!1)},binding:function(){return{cacheViews:!1}},compositionComplete:function(){e.trigger("account:view:change","account/login")},detached:function(){i.off(),e.dialog.close("panel"),o.get("menu").visible(!0),o.get("currency").visible(!0)},playSolo:function(){n.playerCount=1,router.navigate("game")},playMulti:function(){n.playerCount=2,router.navigate("game")}}});
define('text!home/lobby/games.html',[],function () { return '\r\n<div class="note pull-right" data-bind="html: message()"></div>\r\n\r\n<div data-bind="foreach: list" style="margin-bottom:20px;">\r\n   <h1 data-bind="text: title" class="archive"></h1>\r\n   <!-- ko if: games().length -->\r\n   <div class="" data-bind1="css: {\'container y scroll games\': $root.type() == \'archive\'}">\r\n      <div class="table" data-bind="foreach: games">\r\n         <div class="game-item" data-bind="click: $root.selectGame, css: {active: $root.activeGame() == $data}">\r\n            <div class="cell left">\r\n               <div class="subCell">\r\n                  <div class="pic" data-bind="css: collection"></div>\r\n               </div><div class="subCell" style="width:100%">\r\n                  <div class="flow" data-bind="foreach: summary">\r\n                     <div data-bind="html: $data"></div>\r\n                  </div>\r\n               </div>\r\n            </div>\r\n            <div class="cell right">\r\n               <div class="wrapper">\r\n                  <div class="btn" data-bind="click: $root.resign.bind($root, $data), clickBubble: false, visible: $root.type() == \'ongoing\'">\r\n                     <i class="command close compact" title="Resign the game"></i>\r\n                  </div>\r\n                  <div class="box">\r\n                     <div class="time" title="" data-bind="timeAgo: modDate"></div>\r\n                     <div class="chat" title="Number of unread messages">\r\n                        <div data-bin1d="text: unreads"></div>\r\n                     </div>\r\n                  </div>\r\n                  <div class="players" data-bind="foreach: players">\r\n                     <div>\r\n                        <span class="player" data-bind="text: username"></span>\r\n                        <span class="score" data-bind="text: score"></span>\r\n                     </div>\r\n                  </div>\r\n               </div>\r\n            </div>\r\n         </div>\r\n      </div>\r\n   </div>\r\n   <!-- /ko -->\r\n   <!-- ko ifnot: games().length -->\r\n   <div class="grid">\r\n      <i class="message" data-bind="text: empty"></i>\r\n   </div>\r\n   <!-- /ko -->\r\n</div>';});

define('home/lobby/games',["durandal/app","api/datacontext"],function(e,t){function o(o,i){return $.Deferred(function(a){e.trigger(o,{username:t.username},function(e){e.success&&(e.games.sort(function(e,t){return t.modDate-e.modDate}),ko.utils.arrayForEach(e.games,function(e){e.gameOver="archive"==i,n(e)}),a.resolve(e.games))})})}function n(e){e.summary=[e.players.length>1?l(d.playedWith,e):l(d.playedSolo,e),e.gameOver?l(d.gameEnded,e):l(d.gameStarted,e),e.gameOver?e.players.length>1?l(d.playerWon,e):l(d.playerScored,e):e.lastPhrase.username?l(d.phrasePlaced,e):l(d.noPhrase,e)]}function i(e){return e.players[0].username===t.username?e.players[0]:e.players[1]}function a(e){return e.players[0].username===t.username?e.players[1]:e.players[0]}function r(e){return 1==e.players.length?e.players[0]:e.players[0].score>e.players[1].score?e.players[0]:e.players[1]}function s(e){return 1==e.players.length?e.players[0]:e.players[0].score>e.players[1].score?e.players[1]:e.players[0]}function l(e,t){return e.replace(/\{\{([a-z]*),?\s*([a-z]*)\}\}/gi,function(e,o,n){return u[o](t,n)})}function c(){this.games=ko.observableArray(),this.activeGame=ko.observable(),this.type=ko.observable(),this.binding=function(){return{cacheViews:!1}},this.detached=function(){console.log("detached")};var a=this;e.on("game:update1").then(function(e){if(location.hash.match(/lobby/gi)){console.log("lobby games being updated");var t=a.type(),i=ko.utils.arrayFirst(a.games(),function(t){return t.gameID==e.gameID}),r=$.Deferred();if(i){for(var s="",l=0;l<e.path.phrase.length;l++)s+=e.path.phrase[l].lemma+" ";i.modDate=(new Date).getTime(),i.lastPhrase.phrase=s.substr(0,s.length-1),i.lastPhrase.username=ko.utils.arrayFirst(e.players,function(e){return!e.active}).username;var c=ko.utils.arrayFirst(i.players,function(e){return e.username==i.lastPhrase.username}),d=ko.utils.arrayFirst(e.players,function(e){return e.username==i.lastPhrase.username});i.lastPhrase.score=d.score-c.score,c.score=d.score,n(i),r.resolve()}else o("server:game:lobby",t).then(function(t){i=ko.utils.arrayFirst(t,function(t){return t.gameID==e.gameID}),i&&a.games().unshift(i),r.resolve()});r.then(function(){var o=a.games.indexOf(i);0!=o&&(a.games().splice(o,1),a.games().unshift(i)),"ongoing"==t&&e.gameOver&&a.games().splice(0,1),a.games.valueHasMutated(),a.list.valueHasMutated()})}}),this.loadGames=function(){return o("server:game:lobby","ongoing").then(function(e){a.games(e),a.message("You can have up to 10 ongoing games at the time. <a>Get more space</a>!"),a.list(a.ongoing),a.type("ongoing")})},this.loadArchive=function(){return o("server:game:archive","archive").then(function(e){a.games(e),a.message("Your archive have room for 10 games right now. <a>Get more space</a>!"),a.list(a.archive),a.type("archive")})},this.list=ko.observableArray(),this.ongoing=[{title:"My Turn",empty:"You have no ongoing games where it's your turn.",games:ko.computed(function(){return ko.utils.arrayFilter(a.games(),function(e){return i(e).active})})},{title:"Their Turn",empty:"You have no ongoing games where it's your opponents turn.",games:ko.computed(function(){return ko.utils.arrayFilter(a.games(),function(e){return!i(e).active})})}],this.archive=[{title:"two player",empty:"You have not finished any game.",games:ko.computed(function(){return ko.utils.arrayFilter(a.games(),function(e){return 2==e.players.length})})},{title:"Single player",empty:"You have not finished any game.",games:ko.computed(function(){return ko.utils.arrayFilter(a.games(),function(e){return 1==e.players.length})})}],this.selectGame=function(t){a.activeGame(t),e.navigate("game/"+t.gameID)},this.resign=function(o){var n=this;e.dialog.show("confirm",{content:"Are you sure you want to delete this game?",modal:!0,doneText:"Delete",cancelText:"No"}).then(function(i){"done"==i&&(n.games.remove(o),e.trigger("server:game:resign",{username:t.username,gameID:o.gameID},function(){}))})},this.message=ko.observable()}var d={playedWith:"Played with {{opponent}} - Using {{collection}} collection",playedSolo:"Played solo - Using {{collection}} collection",gameEnded:"Game ended {{modDate, date}}",gameStarted:"Game started {{modDate, date}}",phrasePlaced:"{{lastPlayer}} placed: {{lastPhrase}} for {{lastScore}} points",noPhrase:"has not been played yet",playerScored:"{{winner}} scored {{winnerScore}} points.",playerWon:"{{winner}} won the game with {{winnerScore}} over {{loserScore}} points."},u={collection:function(e){return $("<span/>",{"class":"collection",text:e.collection}).get(0).outerHTML},opponent:function(e){return $("<span/>",{"class":"bold",text:a(e).username}).get(0).outerHTML},modDate:function(e,t){if("date"==t){var o=$("<span/>",{"class":"date"});return ko.bindingHandlers.date.init(o,function(){return e.modDate}),o.get(0).outerHTML}},lastPlayer:function(e){return e.lastPhrase.username==t.username?"You":$("<span/>",{"class":"bold",text:e.lastPhrase.username}).get(0).outerHTML},lastPhrase:function(e){return $("<span/>",{"class":"phrase",text:e.lastPhrase.phrase}).get(0).outerHTML},lastScore:function(e){return $("<span/>",{"class":"point",text:e.lastPhrase.score}).get(0).outerHTML},winner:function(e){var o=r(e);return o.username==t.username?"You":$("<span/>",{"class":"bold",text:o.username}).get(0).outerHTML},winnerScore:function(e){var t=r(e);return $("<span/>",{"class":"point",text:t.score}).get(0).outerHTML},loserScore:function(e){var t=s(e);return $("<span/>",{"class":"point",text:t.score}).get(0).outerHTML}};return new c});
define('text!home/lobby/index.html',[],function () { return '<div>\r\n   <div class="logo page"></div>\r\n   <div class="grid page noLeft">\r\n      <button class="orange sm" style="position:relative; float: right; top: -2em; right: 1.3em; z-index: 1; /* for tablets z-index required*/" data-bind="click: $root.start">\r\n         Start New Game\r\n      </button>\r\n      <br />\r\n      <div class="tab responsive" data-bind="tab: {nav: navigate, activeTab: activeTab}">\r\n         <nav>\r\n            <ul>\r\n               <li><span>ongoing games</span></li>\r\n               <li><span>notifications</span></li>\r\n               <li><span>game archive</span></li>\r\n               <li class="ending"><span>ending</span></li>\r\n            </ul>\r\n            <div class="loader-bar" data-bind="fadeVisible: $root.loading"><i></i><i></i><i></i></div>\r\n         </nav>\r\n         <div class="content">\r\n            <div>\r\n               <div data-bind="compose: {model: games, view: module(), cacheViews:false}"></div>\r\n            </div>\r\n         </div>\r\n      </div>\r\n   </div>\r\n\r\n</div>\r\n';});

define('home/lobby/index',["durandal/app","api/datacontext","./games"],function(e,t,o){var n=$.Deferred();return o.compositionComplete=function(){n.resolve(),console.log("resolved")},{loading:ko.observable(!0),module:ko.observable(),mode:ko.observable(),activeTab:0,games:o,navigate:function(e,t){var i=this;switch(i.loading(!0),e*=1,t.then(function(){i.module(null),i.module(0===e?"home/lobby/games":1===e?"home/lobby/notifications":"home/lobby/games"),i.mode(e)}),e){case 0:return sessionStorage.setItem("lobby",0),n=$.Deferred(),o.loadGames().then(function(){return i.loading(!1),n});case 1:sessionStorage.setItem("lobby",1),i.loading(!1);break;case 2:return sessionStorage.setItem("lobby",2),n=$.Deferred(),o.loadArchive().then(function(){return i.loading(!1),n})}return t},activate:function(){e.trigger("game:dispose"),e.dialog.closeAll(),e.palette.dispose(),sessionStorage.getItem("lobby")?this.activeTab=sessionStorage.getItem("lobby"):sessionStorage.setItem("lobby",0)},start:function(){e.navigate("newGame")},binding:function(){return{cacheViews:!1}}}});
define('text!home/lobby/notifications.html',[],function () { return '<div style="text-align:center">\r\n   <div>\r\n      <div class="note" style="display:block; position:relative; top: 3em">Notifications are not implemented yet. Coming soon!</div>\r\n   </div>\r\n</div>';});

define('home/lobby/notifications',["durandal/app","api/datacontext"],function(){return{}});
define('text!home/newGame.html',[],function () { return '<div class="enableGPU">\r\n   <div class="logo page"></div>\r\n   <br />\r\n   <div class="grid page">\r\n      <!--<button class="orange sm" style="position:absolute; top: -2em; right:0;z-index:1">Buy Collection</button>-->\r\n      <div class="container">\r\n         <article>\r\n            <h1>start new game</h1>\r\n            <div class="container group" data-bind="foreach: gameOptions">\r\n               <label class="radio">\r\n                  <span class="title" data-bind="text: title"></span>\r\n                  <span class="description" data-bind="text: description"></span>\r\n                  <input type="radio" name="gameOption" data-bind="value: id, checked: $root.gameOptionId" /><span></span>\r\n               </label>\r\n            </div>\r\n            <h1>choose friend</h1>\r\n            <div class="container group ">\r\n               <div class="input-box">\r\n                  <input type="search" placeholder="Search for a friend" data-bind="value: query, valueUpdate: \'afterkeydown\', search: queryChanged" autocorrect="off" autocapitalize="off" />\r\n                  <i class="command find" data-bind1="click: search"></i>\r\n                  <i class="icon-spinner icon-spin" data-bind="css: {hidden: !searchLoading()}"></i>\r\n               </div>\r\n            </div>\r\n            <div class="container y scroll compact friends" style="margin-left: .5em; width: auto;">\r\n               <ul class="list">\r\n                  <li class="header" data-bind="text: friendListMode().title"></li>\r\n                  <!-- ko if: $root.friendListMode().mode == \'list\' -->\r\n                  <!-- ko foreach: friends -->\r\n                  <li data-bind="css:{ active: $root.activeFriend() == $data }, click: $root.friendSelected.bind($root, $data)">\r\n                     <span data-bind="text: username"></span>\r\n                     <div class="btn" data-bind="click: $root.removeFriend.bind($root, $data)">\r\n                        <i class="command delete xxsm"></i>\r\n                     </div>\r\n                  </li>\r\n                  <!-- /ko -->\r\n                  <!-- ko if: friends().length == 0 -->\r\n                  <li class="inst">\r\n                     At the moment you have no friends!<br />\r\n                     You can search for new friends <br />\r\n                     and add them to your list.\r\n                  </li>\r\n                  <!-- /ko -->\r\n                  <!-- /ko -->\r\n                  <!-- ko if: $root.friendListMode().mode == \'search\' -->\r\n                  <!-- ko foreach: friends -->\r\n                  <li data-bind="css:{ active: $root.activeFriend() == $data }, click: $root.friendSelected.bind($root, $data)">\r\n                     <span data-bind="text: username"></span>\r\n                     <!-- ko ifnot: isFriend -->\r\n                     <div class="btn" data-bind="click: $root.addFriend.bind($root, $data)">\r\n                        <i class="command addFriend sm"></i>\r\n                     </div>\r\n                     <!-- /ko -->\r\n                     <!-- ko if: isFriend -->\r\n                     <span class="grayed pull-right">friend</span>\r\n                     <!-- /ko -->\r\n                  </li>\r\n                  <!-- /ko -->\r\n                  <!-- ko if: friends().length == 0 -->\r\n                  <li class="inst">\r\n                     Your query results in no result!<br />\r\n                  </li>\r\n                  <!-- /ko -->\r\n                  <!-- /ko -->\r\n               </ul>\r\n            </div>\r\n         </article><article>\r\n            <h1>choose collection</h1>\r\n            <div class="container y scroll">\r\n               <label class="radio">\r\n                  <span class="pic woz"></span>\r\n                  <span class="text">\r\n                     <span class="title">Words of Oz</span>\r\n                     <span class="description">50/50 tiles - 150/150 words</span>\r\n                  </span>\r\n                  <input type="radio" name="c" checked /><span></span>\r\n               </label>\r\n               <label class="radio">\r\n                  <span class="pic nf"></span>\r\n                  <span class="text">\r\n                     <span class="title">NightFall</span>\r\n                     <span class="description">50/50 tiles - 150/150 words</span>\r\n                  </span>\r\n                  <input type="radio" name="c" /><span></span>\r\n               </label>\r\n               <label class="radio">\r\n                  <span class="pic loc"></span>\r\n                  <span class="text">\r\n                     <span class="title">Life of Color</span>\r\n                     <span class="description">50/50 tiles - 150/150 words</span>\r\n                  </span>\r\n                  <input type="radio" name="c" /><span></span>\r\n               </label>\r\n               <label class="radio">\r\n                  <span class="pic"></span>\r\n                  <span class="text">\r\n                     <span class="title">More..</span>\r\n                     <span class="description">3/15 collections</span>\r\n                  </span>\r\n                  <input type="radio" name="c" /><span></span>\r\n               </label>\r\n            </div>\r\n            <!--<h1>set language</h1>\r\n            <div class="container group">\r\n               <select class="woz" data-bind="dropdown: { inst: \'Change Language\', options: null, selected: null }">\r\n                  <option selected>English</option>\r\n                  <option>German</option>\r\n                  <option>Portuguese</option>\r\n                  <option>Spanish</option>\r\n                  <option>Swedish</option>\r\n               </select>\r\n            </div>-->\r\n            <div class="container group">\r\n               <button data-bind="click: $root.start" class="blue" style="position:absolute;right:1.1em;top:12em;">Start Game</button>\r\n            </div>\r\n         </article>\r\n      </div>\r\n   </div>\r\n</div>\r\n';});

define('home/newGame',["durandal/app","api/datacontext"],function(e,t){var o=[{id:0,title:"play with friend",description:"Choose from my friends list",playerCount:2},{id:1,title:"random opponent",description:"Find an opponent automatically",playerCount:2},{id:2,title:"single play",description:"Compete with yourself",playerCount:1}],n={list:{mode:"list",title:"Friends List"},search:{mode:"search",title:"Search Result"}};return vm={gameOptions:o,gameOptionId:ko.observable(0),friends:ko.observableArray(),query:ko.observable(""),friendListMode:ko.observable(n.list),searchLoading:ko.observable(!1),activeFriend:ko.observable(),friendSelected:function(e){this.activeFriend()==e?this.activeFriend(null):e.isFriend&&this.activeFriend(e)},queryChanged:function(e){this.query(e.target.value)},activate:function(){this.activeFriend(null),e.dialog.closeAll(),e.trigger("game:dispose"),e.palette.dispose()},binding:function(){return{cacheViews:!1}},addFriend:function(o){var n=this;e.trigger("server:friends",{username:t.username,command:"add",friendUsername:o.username},function(){n.query("")})},removeFriend:function(o){var n=this;e.trigger("server:friends",{username:t.username,command:"delete",friendUsername:o.username},function(){n.query()||n.query.valueHasMutated()})},start:function(){if(vm.startEnable()){var n=this.gameOptionId();t.playerCount=o[n].playerCount,0==n?t.friendUsername=this.activeFriend().username:(t.friendUsername="",delete t.friendUsername),e.navigate("game")}else e.dialog.show("alert",{content:"Please select a friend to continue."})}},vm.startEnable=ko.computed(function(){var e=vm.gameOptionId(),t=vm.activeFriend();return t||0!=e}),ko.computed(function(){var o=vm.query();""==o?e.trigger("server:friends",{username:t.username,command:"getAll"},function(e){vm.friends([]),vm.activeFriend(null),vm.friendListMode(n.list),e.success&&(e.friends.sort(function(e,t){return e.username>t.username}),ko.utils.arrayForEach(e.friends,function(e){e.isFriend=!0}),vm.friends(e.friends),vm.knownFriends=e.friends)}):(vm.searchLoading(!0),e.trigger("server:friends",{username:t.username,command:"search",friendUsername:vm.query()},function(e){ko.utils.arrayForEach(e.users,function(e){e.isFriend=ko.utils.arrayFirst(vm.knownFriends,function(t){return t.username==e.username})?!0:!1}),vm.friends([]),vm.activeFriend(null),vm.friendListMode(n.search),vm.searchLoading(!1),vm.friends(e.users)}))}).extend({throttle:300}),vm});
define('text!home/settings.html',[],function () { return '<div>\r\n  <div class="grid">\r\n    <article>\r\n      <h1>Profile:</h1>\r\n      <div class="container group">\r\n      </div>\r\n      <h1>change password:</h1>\r\n      <div class="container group">\r\n      </div>\r\n    </article>\r\n    <article>\r\n      <h1>Misc:</h1>\r\n      <div class="container">\r\n        <label>connect to facebook<input type="checkbox" checked /><span></span></label>\r\n        <label>push notification<input type="checkbox" /><span></span></label>\r\n        <label>email notification<input type="checkbox" checked /><span></span></label>\r\n      </div>\r\n      <br />\r\n      <h1>set language</h1>\r\n      <div class="container">\r\n        <select class="woz" data-bind="dropdown: { inst: \'Change Language\', options: null, selected: null }">\r\n          <option selected>English</option>\r\n          <option>German</option>\r\n          <option>Portuguese</option>\r\n          <option>Spanish</option>\r\n          <option>Swedish</option>\r\n        </select>\r\n      </div>\r\n    </article>\r\n  </div>\r\n</div>\r\n';});

define('home/settings',["plugins/router","durandal/app","api/datacontext"],function(e,t){return{activate:function(){t.palette.dispose()},binding:function(){return{cacheViews:!1}}}});
define('home/singlePlayer',["durandal/app","api/datacontext"],function(e,t){return{getView:function(){return $("<div/>").get(0)},activate:function(){t.playerCount=1,e.navigate("game")}}});
define('text!home/test.html',[],function () { return '<div>\r\n   <div class="loader-bar"><i></i><i></i><i></i></div>\r\n   <div style="padding: 40px;">\r\n      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin scelerisque turpis sem, sit amet posuere libero blandit at. Quisque adipiscing posuere lacus at laoreet. Pellentesque orci felis, placerat non turpis quis, tempus fringilla justo. Interdum et malesuada fames ac ante ipsum primis in faucibus. Aliquam erat volutpat. Praesent nec metus vitae dolor iaculis lacinia at eu neque. Pellentesque viverra cursus purus. Nulla volutpat cursus magna, eu semper leo egestas ut. Proin vitae velit purus. Morbi aliquet neque nunc, eu gravida quam auctor et. Fusce eget turpis adipiscing, vehicula massa eget, eleifend lacus. Suspendisse aliquet nibh felis, non tincidunt orci tristique quis. In ultrices urna nec lacus porta, ac commodo arcu bibendum. Sed a bibendum eros, nec mollis mi. Praesent dignissim nulla nulla, in elementum neque porta id.\r\n\r\n      Suspendisse potenti. In porta ante id lacus commodo, a pulvinar eros mattis. Quisque feugiat turpis vitae gravida molestie. Donec bibendum tincidunt cursus. Etiam in pulvinar est, a lobortis mi. Vestibulum ullamcorper lectus at massa viverra, quis congue quam mollis. Vivamus ultrices risus ac massa fringilla consequat. Nulla non nibh ut augue fringilla congue iaculis semper odio.\r\n\r\n      Cras malesuada ultrices mi at sollicitudin. Curabitur eu molestie ante. Nulla porttitor augue nec imperdiet tincidunt. Integer feugiat porta elementum. Suspendisse vel rhoncus nibh. Aliquam rhoncus turpis id iaculis porttitor. Quisque tristique vulputate orci, dictum mattis mauris condimentum eu. Donec eget erat sed nisl egestas hendrerit. Etiam nunc elit, interdum vitae consequat vitae, sodales faucibus libero.\r\n\r\n      Etiam et orci a tortor dignissim porta id id risus. Fusce interdum, metus non convallis fermentum, ipsum lacus varius arcu, sed sodales lorem lorem eu eros. Praesent elit odio, dictum quis neque non, vehicula venenatis mi. Nunc egestas libero sit amet tempus porta. Nulla sem leo, aliquet et suscipit eget, ultricies bibendum magna. Sed convallis augue lorem. Fusce eros lorem, pharetra nec lorem sit amet, adipiscing pretium augue. Ut eu nulla mi. Mauris iaculis adipiscing eros nec laoreet. Proin adipiscing congue velit, at pellentesque ante vulputate quis. Quisque nec elit a dolor sollicitudin hendrerit nec ut lectus. Aliquam fringilla erat sed turpis porta condimentum. Curabitur non sem sit amet nulla laoreet consectetur eu ut lacus. Integer aliquet est sed dolor scelerisque volutpat. Proin in ullamcorper nisi.\r\n\r\n      Curabitur vitae congue ipsum. Vivamus risus nisl, vehicula non felis nec, pharetra facilisis magna. Fusce congue congue risus ac vulputate. Fusce pulvinar nunc iaculis nunc scelerisque, varius porta felis adipiscing. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vestibulum aliquet nisl justo, hendrerit bibendum arcu auctor eget. Sed a lorem sed nisl aliquam ornare. Etiam sed blandit ligula. Suspendisse suscipit, lorem in adipiscing mollis, purus odio euismod diam, nec mollis tortor nibh vel nisl. Donec condimentum neque non dapibus volutpat.\r\n\r\n      Etiam tempus luctus risus nec sollicitudin. Duis eu pretium purus. Curabitur turpis eros, ultricies vitae ultrices id, ultrices id magna. Mauris volutpat lacinia orci in tempus. Pellentesque hendrerit sapien vitae leo adipiscing facilisis tristique sed purus. Quisque non ullamcorper dui. Duis at pharetra massa. Vestibulum ornare velit quis malesuada gravida. Curabitur facilisis tortor purus. Praesent quis nulla quis massa volutpat venenatis a a sem. Etiam bibendum et purus et porttitor. Phasellus aliquam dignissim neque, vehicula imperdiet lorem pretium vel. Vivamus aliquam pretium malesuada. Suspendisse potenti. In convallis purus a mollis tristique. Aenean ut lorem nec quam sodales egestas quis vel est.\r\n\r\n      Nulla facilisi. Suspendisse venenatis erat erat, at sodales mi lobortis a. Sed id lorem aliquet est adipiscing dictum ut nec orci. Sed eu leo eu sem eleifend lacinia. Proin lobortis ut ante id dignissim. Vestibulum lacinia, urna ut posuere commodo, nulla massa congue nisl, sed consequat libero elit ut risus. Nam tempor id diam eu viverra. Nulla sed rutrum risus, vitae pharetra massa. Aliquam mattis nec mauris id commodo. Vestibulum dui lectus, commodo nec sem et, eleifend lobortis lectus. Phasellus pulvinar tincidunt neque, id luctus elit tempor vitae. In quis ullamcorper lectus. Curabitur vulputate facilisis nunc vitae egestas.\r\n\r\n      Cras suscipit, turpis in fermentum tempus, lectus odio euismod elit, vel sollicitudin metus mauris id nunc. Vestibulum porta, sem vel fringilla tristique, nisl sapien rutrum erat, in tempus massa velit a elit. Vestibulum sollicitudin gravida nisi nec pretium. Ut tempor sem ut quam fringilla condimentum. Vestibulum quam magna, dictum nec luctus eget, varius non ipsum. Praesent vehicula feugiat magna, quis laoreet turpis tincidunt ac. Curabitur pharetra volutpat suscipit. Proin diam ipsum, hendrerit quis mi in, vestibulum malesuada tortor. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Cras gravida quis nisl ac pretium. Aliquam tristique, libero ac consequat malesuada, lacus diam adipiscing risus, et aliquet enim felis ac nunc.\r\n\r\n      Pellentesque tempor tellus posuere arcu lobortis, quis porta est suscipit. Curabitur quis turpis quis elit feugiat porta eget eu eros. Aliquam erat volutpat. Nunc accumsan, orci aliquet euismod vulputate, sapien eros blandit lacus, sit amet aliquet lacus risus at orci. Nam diam velit, cursus ut ante eget, vehicula ornare magna. Pellentesque purus quam, semper a semper eu, hendrerit non nibh. Mauris posuere nibh sit amet dui tempor, eget semper magna sodales. Nam blandit sed nunc in pellentesque. Pellentesque mollis vestibulum odio, eget euismod est tristique blandit. Phasellus eu consequat sem, venenatis aliquam mi. Pellentesque elementum volutpat nisi eu sagittis. Vivamus in nisi semper, tristique mauris at, aliquet odio. In mauris quam, consequat sit amet nunc sit amet, rhoncus laoreet tellus. Proin et adipiscing tellus. Integer pulvinar lectus velit, ac condimentum est pretium et. Sed id sagittis urna.\r\n\r\n      Aenean feugiat enim non turpis interdum rhoncus. Donec metus ligula, auctor a venenatis a, suscipit sit amet lectus. Donec pharetra enim eget ipsum ornare, eu blandit lacus volutpat. Nullam magna libero, ultricies ac fermentum et, mollis porta augue. Quisque dolor massa, accumsan vitae scelerisque in, congue in nibh. Nullam a tincidunt lectus, et mattis augue. Nam sem odio, aliquam id mattis id, mattis ut nulla.\r\n\r\n      Phasellus commodo dui eget iaculis fringilla. Aenean mollis, purus vel pellentesque vulputate, enim metus dapibus orci, quis egestas nulla ligula vitae sapien. Donec et risus odio. Cras ut varius nisl, tincidunt ornare dui. Aliquam mollis auctor purus, at lobortis arcu lobortis at. Donec mattis mauris vel odio convallis auctor sed et orci. Aliquam ultricies, nisi eget tempus faucibus, lacus justo faucibus leo, eu tristique urna nibh quis erat. Pellentesque placerat tempus diam, ac adipiscing leo convallis et. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vestibulum sit amet mi eget felis euismod pretium. Integer ut vestibulum dui. Suspendisse a venenatis velit, sed blandit erat. Sed ut nisl at turpis mollis vulputate at ac nibh. Vivamus eget libero faucibus, porttitor magna porttitor, aliquam metus. Morbi quam augue, vehicula vel auctor ac, facilisis ac dui. Cras venenatis ligula at aliquet dignissim.\r\n\r\n      Vivamus euismod, tellus et mollis ornare, ante arcu luctus lacus, vitae sollicitudin ligula diam eu arcu. Donec velit purus, sodales a ipsum nec, malesuada volutpat mauris. Donec sagittis, ipsum et ornare iaculis, augue justo bibendum justo, sed viverra leo nisi ac odio. Vivamus et suscipit sapien, adipiscing varius eros. Nullam volutpat semper urna, eget euismod dui semper ac. Aenean non facilisis leo, aliquam ornare libero. Nunc eget placerat quam, a gravida ipsum. Maecenas ultrices facilisis nisi, a ullamcorper dolor sagittis at. Nullam hendrerit elit ipsum, id condimentum erat accumsan eget. In fermentum nec lacus id rhoncus. Aenean eu bibendum mi. Maecenas metus sem, suscipit sit amet tempus non, feugiat nec nulla.\r\n\r\n      Morbi volutpat pretium ligula in rhoncus. Nam pretium est ut erat aliquet tempor. Quisque quis semper nisi. Aliquam imperdiet scelerisque elit sed cursus. Sed rhoncus risus vel quam adipiscing porta. Suspendisse aliquam sem eu mollis semper. Duis aliquet lacus eu justo varius, vel dictum leo pellentesque. Quisque ut magna non ligula pharetra laoreet non in turpis. Aenean feugiat odio in faucibus tristique. Quisque malesuada hendrerit tellus, sit amet imperdiet sapien aliquam in. Cras eu felis mi. Vivamus et malesuada ligula, vitae pharetra lorem. Morbi molestie leo a nulla blandit aliquam. Aliquam fermentum, lectus eu molestie dictum, est purus convallis orci, eget tempus eros odio a felis. Interdum et malesuada fames ac ante ipsum primis in faucibus.\r\n\r\n      Praesent ut diam condimentum, molestie quam a, mollis neque. Cras elementum enim turpis, a lacinia enim luctus ac. Cras faucibus eros sapien, nec consectetur magna pharetra sit amet. Maecenas varius interdum mi quis pulvinar. Cras justo est, accumsan ac pharetra eu, mattis sed nisi. Suspendisse sed consectetur dui, eu rutrum ligula. Nullam mattis eleifend orci, non facilisis diam. Suspendisse sit amet ultricies augue, eu sollicitudin magna. Fusce facilisis commodo lectus vel pharetra. Praesent a posuere nulla. Cras quis posuere erat, vitae dapibus orci.\r\n\r\n      Praesent dictum, est sed sodales aliquet, est turpis consectetur justo, vel ultricies enim metus at nunc. In varius velit ac felis posuere feugiat. Donec id scelerisque dui, quis tempor ligula. Mauris iaculis volutpat pretium. Nullam semper vehicula nulla, in bibendum eros facilisis quis. Duis rutrum tempus massa, non feugiat dui gravida vel. Suspendisse ut mi lobortis, cursus quam bibendum, mollis metus. Vivamus sed mi eros. Suspendisse viverra ipsum id nibh varius, quis dictum neque porttitor. Etiam eu orci ut diam cursus pretium in sed felis.\r\n\r\n      Sed a erat non nisl porta semper. Vivamus id magna leo. Nunc augue diam, interdum at est sed, convallis suscipit tellus. Mauris sed fermentum nibh, ac pharetra mauris. Nulla commodo ornare massa ac elementum. Mauris congue nunc felis, in pharetra nulla sollicitudin et. Nulla facilisi. Phasellus faucibus risus at mollis hendrerit. Sed tempus vulputate nisl eu ullamcorper.\r\n\r\n      Sed congue malesuada accumsan. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Proin scelerisque erat sit amet tellus feugiat, non vestibulum magna fringilla. Fusce a turpis aliquam odio tincidunt iaculis. In hac habitasse platea dictumst. Aenean rutrum mauris quis urna vehicula imperdiet. Sed non magna auctor metus dapibus consectetur vitae eu enim. Nulla facilisi. Vestibulum pretium erat ligula, id gravida leo ultricies at. Fusce tincidunt, dolor eu aliquam eleifend, felis tortor convallis sapien, eu congue arcu est nec nunc. Phasellus sagittis mauris et nisi facilisis, eu cursus est blandit. Sed id felis vel dui convallis porttitor. Phasellus ut arcu nunc. Duis a elit ac risus convallis ultricies ac a mi. Nam sit amet est quis sapien accumsan pellentesque. Integer volutpat nec erat eu tempor.\r\n\r\n      Sed accumsan diam elit, sed egestas tortor suscipit sit amet. Aenean vehicula augue aliquet nulla ultrices bibendum. Nam dignissim metus sapien, quis lacinia nunc ultrices vel. Duis porta sem sed dui aliquam blandit. Vivamus aliquet, nisl sed venenatis rhoncus, arcu mi sodales eros, vel eleifend libero massa eget mi. Cras tempor sem quis mauris ornare, eu rutrum risus aliquam. Donec dapibus sapien id consequat luctus. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Donec fermentum auctor nibh, et vulputate velit malesuada vitae. Duis vitae lectus malesuada, pulvinar odio aliquam, posuere mauris. Ut a libero ac mauris elementum gravida. Vestibulum nec ultrices leo, tristique consequat dolor. Maecenas ut commodo lacus.\r\n\r\n      Pellentesque egestas mauris scelerisque congue accumsan. Pellentesque ornare consectetur dapibus. Suspendisse ornare pharetra ligula id rutrum. In venenatis blandit tortor, vitae consectetur ipsum hendrerit sit amet. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Sed ut elit ornare, rutrum odio quis, facilisis quam. Pellentesque mollis porta massa, sit amet ultrices nisl accumsan id. Integer rutrum augue a est suscipit volutpat. Fusce enim magna, consectetur et laoreet eu, porta non arcu. Nam blandit ut quam quis semper. Cras suscipit justo non mi volutpat feugiat. Etiam ut orci facilisis, molestie odio vitae, placerat eros. Cras at condimentum turpis. Suspendisse vitae facilisis libero.\r\n\r\n      Sed lacinia aliquam sapien, ultricies bibendum justo viverra quis. Proin dapibus, nulla in pulvinar ullamcorper, purus ligula cursus justo, eget dapibus orci turpis eu lorem. Maecenas pharetra arcu tellus, nec fermentum metus semper fringilla. Nulla pulvinar luctus eros, non scelerisque augue. Suspendisse potenti. Pellentesque pretium bibendum imperdiet. Praesent tempus viverra orci, id dictum purus aliquam ut. Donec ut fringilla quam, eu eleifend leo.\r\n\r\n      Curabitur a urna in nisl sollicitudin egestas non eu diam. Nulla suscipit hendrerit ante, vel adipiscing orci. Suspendisse placerat turpis diam, sit amet viverra quam ullamcorper vel. Sed augue orci, fermentum nec tempor sit amet, volutpat facilisis ipsum. In quis magna sit amet leo posuere laoreet sit amet faucibus eros. Nunc et eros non mauris scelerisque cursus. Vivamus accumsan neque non varius tempor. Ut quis ante lorem. Donec eget elit nec lectus luctus lobortis.\r\n\r\n      Integer convallis sapien risus, in semper mauris cursus ut. Praesent aliquet eu mauris blandit rhoncus. Pellentesque venenatis a felis vitae lacinia. Nullam rutrum at diam at lacinia. Nullam aliquam vehicula aliquet. Phasellus aliquam ornare sodales. Cras nulla diam, blandit non odio eget, vulputate pretium nulla. Sed nulla dui, volutpat ut lectus ac, rutrum feugiat purus. Aenean vitae vehicula velit, et tempor diam. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nunc vitae risus feugiat, aliquam odio sed, tristique justo.\r\n\r\n      Vivamus et feugiat mi, vel ornare sem. Aliquam dapibus urna vel dolor dapibus, nec pretium ante gravida. Ut pretium eu velit vitae egestas. Fusce sodales egestas elit ac posuere. Mauris posuere, odio quis venenatis pulvinar, purus sem laoreet ante, vel sodales sem lorem sed purus. Maecenas quam quam, luctus vestibulum neque a, vulputate tempus augue. Donec aliquam tortor sed aliquam tincidunt. Integer commodo commodo est. Etiam ornare erat et porttitor elementum. Donec eleifend vel mi sed scelerisque. Morbi porta non elit elementum facilisis. In a dolor nulla.\r\n\r\n      Fusce posuere, lectus eu blandit bibendum, nibh massa lobortis urna, nec consectetur ante nulla a mi. Mauris dictum magna nisi, vel scelerisque sapien placerat sollicitudin. Donec porttitor lectus metus, in vestibulum lacus accumsan vitae. In eu purus augue. Sed sed leo pharetra metus feugiat ornare eget ut dui. Cras placerat dictum consequat. Sed consequat tellus in velit viverra, sit amet feugiat nunc porttitor. Nulla facilisi. Praesent venenatis nunc vel blandit fringilla. Nullam sed aliquet lacus, nec pellentesque augue. Vivamus nulla dolor, hendrerit in gravida non, aliquet nec lectus. In et nisl enim. Fusce faucibus vitae dolor non posuere. Nulla tempus lorem turpis, quis luctus turpis vulputate tempor. Duis enim nulla, tempus fermentum vulputate eu, ullamcorper at augue. Duis a felis ornare, tempus dui at, rhoncus lectus.\r\n   </div>\r\n\r\n   <!--<div style="margin: 100px" class="shine"></div>\r\n   <div style="width: 100px; height: 100px" class="star-box">\r\n\r\n   </div>-->\r\n\r\n   <!--<div style="max-width:800px;margin:0 auto;">\r\n      <div class="tab responsive" data-bind="tab: {}">\r\n         <nav>\r\n            <ul>\r\n               <li>ongoing games</li>\r\n               <li>notifications</li>\r\n               <li>game archive</li>\r\n               <li class="ending">ending</li> \r\n               <li class="load">\r\n                  <div class="loader-bar"><i></i><i></i><i></i></div>\r\n               </li>\r\n            </ul>\r\n         </nav>\r\n         <article></article>\r\n      </div>\r\n   </div>-->\r\n</div>\r\n<!--<div>\r\n    <button class="blue">Sign up</button><br /><br />\r\n    <button class="blue" disabled>Sign up</button><br /><br />\r\n    <button class="orange">Sign up</button><br /><br />\r\n    <button class="orange" disabled>Sign up</button><br /><br />\r\n</div>\r\n<h1 id="debug">choose collection</h1>\r\n<div class="container y scroll">\r\n   <label class="radio">\r\n      <span class="pic woz"></span>\r\n      <span class="text">\r\n         <span class="title">Words of Oz</span>\r\n         <span class="description">50/50 tiles - 150/150 words</span>\r\n      </span>\r\n      <input type="radio" name="c" checked /><span></span>\r\n   </label>\r\n   <label class="radio">\r\n      <span class="pic nf"></span>\r\n      <span class="text">\r\n         <span class="title">NightFall</span>\r\n         <span class="description">50/50 tiles - 150/150 words</span>\r\n      </span>\r\n      <input type="radio" name="c" /><span></span>\r\n   </label>\r\n   <label class="radio">\r\n      <span class="pic loc"></span>\r\n      <span class="text">\r\n         <span class="title">Life of Color</span>\r\n         <span class="description">50/50 tiles - 150/150 words</span>\r\n      </span>\r\n      <input type="radio" name="c" /><span></span>\r\n   </label>\r\n   <label class="radio">\r\n      <span class="pic"></span>\r\n      <span class="text">\r\n         <span class="title">More..</span>\r\n         <span class="description">3/15 collections - 450/7600 words</span>\r\n      </span>\r\n      <input type="radio" name="c" /><span></span>\r\n   </label>\r\n</div>\r\n<div>\r\n   <label>\r\n      on <input type="checkbox" />\r\n      <span></span>\r\n   </label>\r\n   <label>\r\n      off <input type="checkbox" checked />\r\n      <span></span>\r\n   </label>\r\n</div>\r\n\r\n<div class="loader-bar"><i></i><i></i><i></i></div>-->\r\n';});

define('home/test',["durandal/app","api/datacontext"],function(){return{binding:function(){return{cacheViews:!1}},compositionComplete:function(e){for(var t=0;16>t;t++){var o=$("<div/>",{"class":"shiny"});o.addClass(0==t%5?"typeA":1==t%5?"typeB":2==t%5?"typeC":3==t%5?"typeD":"typeE");var n=40*Math.random();o.css({width:n,left:50-n/2,opacity:0,scale:.99}),$(".shine",e).append(o),setTimeout(function(e){e.l.css({opacity:1,width:e.w,left:50-e.w/2})},300*t,{l:o,w:n+30}),setTimeout(function(e){e.css({opacity:0})},200*t+2e3,o)}}}});
requirejs.config({paths:{text:"../lib/requirejs-text/text",durandal:"../lib/durandal",plugins:"../lib/durandal/plugins",transitions:"../lib/durandal/transitions","crypto.sha3":"../lib/crypto.sha3",facebook:"//connect.facebook.net/en_US/all"},urlArgs:"t"+(new Date).getTime(),shim:{facebook:{"export":"FB"}}}),define("jquery",[],function(){return jQuery}),define("knockout",ko),define("socket",io),define("paper",paper),define('main',["durandal/system","durandal/app","plugins/router","durandal/viewLocator","common"],function(e,t,o,n){function i(e){var t=document.createElement("link");t.type="text/css",t.rel="stylesheet",t.href="css/"+e+".css",document.getElementsByTagName("head")[0].appendChild(t)}e.debug(!0),t.title="Words of Oz",t.configurePlugins({router:!0}),t.start().then(function(){n.useConvention(),t.setRoot("shell",null,"app")}),void 0===document.body.style.backgroundPositionX&&i("_sprites"),void 0!==document.body.style.MozAppearance&&i("_firefox"),t.browser.android||i("_ipad"),$.support.touch&&i("_touch"),$.support.kindle&&screen.lockOrientation&&screen.lockOrientation(["landscape-primary","landscape-secondary"]),window.app=t});
define('text!palette.html',[],function () { return '<!--ko with: menu-->\r\n<div class="palette right fixed" data-bind="foreach: fixedItems, fadeVisible: visible">\r\n   <i data-bind="click: click, css: css, visible: visible, text: content"></i>\r\n</div>\r\n\r\n<div class="palette left">\r\n   <div class="actions" data-bind="foreach: leftItems, fadeVisible: visible">\r\n      <div class="btn" data-bind="click: click">\r\n         <i data-bind="css: css, visible: visible"></i>\r\n      </div>\r\n   </div>\r\n</div>\r\n<div class="palette right" data-bind="foreach: rightItems, fadeVisible: visible">\r\n   <i data-bind="click: click, css: css, visible: visible"></i>\r\n</div>\r\n<!--/ko-->';});

define('text!shell.html',[],function () { return '<div id="shell">\r\n   <div id="fixed">\r\n      <!--ko compose: "palette"--><!--/ko-->\r\n      <div class="loader page" data-bind="css: { active: loading }">\r\n         <i class="icon-spinner icon-2x icon-spin"></i>\r\n      </div>\r\n      <div class="status-box">\r\n         <div class="switch">\r\n            <span></span>\r\n         </div>\r\n         <div class="switch" data-bind="css: { b: status.cnn }">\r\n            <span class="bad">Offline</span>\r\n            <span class="good">Online</span>\r\n         </div>\r\n         <div class="switch" data-bind="css: { b: errors().length }">\r\n            <span class="good"></span>\r\n            <span class="bad" data-bind="attr:{title: $root.summary}, click: $root.showSummary">\r\n               Errors on the page: <span data-bind="text: errors().length"></span>\r\n            </span>\r\n         </div>\r\n      </div>\r\n   </div>\r\n   <div id="console" style="position:fixed; top:300px; left: 100px; display:block;z-index:10000"></div>\r\n   <!--ko router: { transition: \'entrance\', cacheViews: true }--><!--/ko-->\r\n</div>\r\n';});

define('shell',["plugins/router","durandal/app"],function(e,t){var o=ko.observable(!1),n=ko.observable(!1),i=ko.observableArray();return t.on("socket:status").then(function(e){o("connect"==e)}),window.addEventListener("online",function(){n(!0)}),window.addEventListener("offline",function(){n(!1)}),window.addEventListener("error",function(e){i.push(e)}),{router:e,loading:ko.computed(function(){return(e.isNavigating()||t.loading())&&!t.inlineLoading()}),status:{cnn:o,online:n},errors:i,summary:ko.computed(function(){var e="";return ko.utils.arrayForEach(i(),function(t){e+=t.message,e+="\n",e+=t.lineno+" "+t.filename,e+="\n"}),e}),showSummary:function(){t.dialog.show("alert",{content:$("<div/>").css({fontSize:"12px"}).html(this.summary())[0].outerHTML,delay:5e3})},activate:function(){return window.router=e.map([{route:["","home"],moduleId:"home/index",title:"",nav:!0},{route:"test",moduleId:"home/test",title:"Test",nav:!0},{route:"lobby",moduleId:"home/lobby/index",title:"My Games",nav:!0},{route:"settings",moduleId:"home/settings",title:"Settings",nav:!0},{route:"newGame",moduleId:"home/newGame",title:"New Game",nav:!0},{route:"singlePlayer",moduleId:"home/singlePlayer",title:"Loading the game",nav:!0},{route:"not-found",moduleId:"error/not-found",title:"Not Found",nav:!0},{route:"game",moduleId:"game/game",title:"Play",nav:!0},{route:"game/:id",moduleId:"game/game",title:"Play",nav:!0},{route:"game-editor",moduleId:"game-editor/menu",title:"Game Editor",nav:!0},{title:"Game Editor - Edit",route:"game-editor/edit/:id",moduleId:"game-editor/edit"},{route:"account*details",moduleId:"account/index",title:"Account Settings",hash:"#account",nav:!0},{route:"facebook",moduleId:"account/oAuth/facebook",title:"Words of Oz"}]).buildNavigationModel().mapUnknownRoutes("error/not-found","not-found").activate(),window.router},compositionComplete:function(){$("#fixed").prependTo("body")}}});
define('plugins/dialog',["durandal/system","durandal/app","durandal/composition","durandal/activator","durandal/viewEngine","jquery","knockout"],function(e,t,n,o,i,a,r){function s(t){return e.defer(function(n){e.isString(t)?e.acquire(t).then(function(t){n.resolve(e.resolveObject(t))}).fail(function(n){e.error("Failed to load dialog module ("+t+"). Details: "+n.message)}):n.resolve(t)}).promise()}var l,c={},d=0,u=function(e,t,n){this.message=e,this.title=t||u.defaultTitle,this.options=n||u.defaultOptions};return u.prototype.selectOption=function(e){l.close(this,e)},u.prototype.getView=function(){return i.processMarkup(u.defaultViewMarkup)},u.setViewUrl=function(e){delete u.prototype.getView,u.prototype.viewUrl=e},u.defaultTitle=t.title||"Application",u.defaultOptions=["Ok"],u.defaultViewMarkup=['<div data-view="plugins/messageBox" class="messageBox">','<div class="modal-header">','<h3 data-bind="text: title"></h3>',"</div>",'<div class="modal-body">','<p class="message" data-bind="text: message"></p>',"</div>",'<div class="modal-footer" data-bind="foreach: options">','<button class="btn" data-bind="click: function () { $parent.selectOption($data); }, text: $data, css: { \'btn-primary\': $index() == 0, autofocus: $index() == 0 }"></button>',"</div>","</div>"].join("\n"),l={MessageBox:u,currentZIndex:1050,getNextZIndex:function(){return++this.currentZIndex},isOpen:function(){return d>0},getContext:function(e){return c[e||"default"]},addContext:function(e,t){t.name=e,c[e]=t;var n="show"+e.substr(0,1).toUpperCase()+e.substr(1);this[n]=function(t,n){return this.show(t,n,e)}},createCompositionSettings:function(e,t){var n={model:e,activate:!1,transition:!1};return t.attached&&(n.attached=t.attached),t.compositionComplete&&(n.compositionComplete=t.compositionComplete),n},getDialog:function(e){return e?e.__dialog__:void 0},close:function(e){var t=this.getDialog(e);if(t){var n=Array.prototype.slice.call(arguments,1);t.close.apply(t,n)}},show:function(t,i,a){var r=this,l=c[a||"default"];return e.defer(function(e){s(t).then(function(t){var a=o.create();a.activateItem(t,i).then(function(o){if(o){var i=t.__dialog__={owner:t,context:l,activator:a,close:function(){var n=arguments;a.deactivateItem(t,!0).then(function(o){o&&(d--,l.removeHost(i),delete t.__dialog__,0===n.length?e.resolve():1===n.length?e.resolve(n[0]):e.resolve.apply(e,n))})}};i.settings=r.createCompositionSettings(t,l),l.addHost(i),d++,n.compose(i.host,i.settings)}else e.resolve(!1)})})}).promise()},showMessage:function(t,n,o){return e.isString(this.MessageBox)?l.show(this.MessageBox,[t,n||u.defaultTitle,o||u.defaultOptions]):l.show(new this.MessageBox(t,n,o))},install:function(e){t.showDialog=function(e,t,n){return l.show(e,t,n)},t.showMessage=function(e,t,n){return l.showMessage(e,t,n)},e.messageBox&&(l.MessageBox=e.messageBox),e.messageBoxView&&(l.MessageBox.prototype.getView=function(){return e.messageBoxView})}},l.addContext("default",{blockoutOpacity:.2,removeDelay:200,addHost:function(e){var t=a("body"),n=a('<div class="modalBlockout"></div>').css({"z-index":l.getNextZIndex(),opacity:this.blockoutOpacity}).appendTo(t),o=a('<div class="modalHost"></div>').css({"z-index":l.getNextZIndex()}).appendTo(t);if(e.host=o.get(0),e.blockout=n.get(0),!l.isOpen()){e.oldBodyMarginRight=t.css("margin-right"),e.oldInlineMarginRight=t.get(0).style.marginRight;var i=a("html"),r=t.outerWidth(!0),s=i.scrollTop();a("html").css("overflow-y","hidden");var c=a("body").outerWidth(!0);t.css("margin-right",c-r+parseInt(e.oldBodyMarginRight,10)+"px"),i.scrollTop(s)}},removeHost:function(e){if(a(e.host).css("opacity",0),a(e.blockout).css("opacity",0),setTimeout(function(){r.removeNode(e.host),r.removeNode(e.blockout)},this.removeDelay),!l.isOpen()){var t=a("html"),n=t.scrollTop();t.css("overflow-y","").scrollTop(n),e.oldInlineMarginRight?a("body").css("margin-right",e.oldBodyMarginRight):a("body").css("margin-right","")}},attached:function(e){a(e).css("visibility","hidden")},compositionComplete:function(e,t,n){var o=l.getDialog(n.model),i=a(e),r=i.find("img").filter(function(){var e=a(this);return!(this.style.width&&this.style.height||e.attr("width")&&e.attr("height"))});i.data("predefinedWidth",i.get(0).style.width);var s=function(){setTimeout(function(){i.data("predefinedWidth")||i.css({width:""});var e=i.outerWidth(!1),t=i.outerHeight(!1),n=a(window).height(),r=Math.min(t,n);i.css({"margin-top":(-r/2).toString()+"px","margin-left":(-e/2).toString()+"px"}),i.data("predefinedWidth")||i.outerWidth(e),t>n?i.css("overflow-y","auto"):i.css("overflow-y",""),a(o.host).css("opacity",1),i.css("visibility","visible"),i.find(".autofocus").first().focus()},1)};s(),r.load(s),i.hasClass("autoclose")&&a(o.blockout).click(function(){o.close()})}}),l});
define('plugins/http',["jquery","knockout"],function(e,t){return{callbackParam:"callback",get:function(t,n){return e.ajax(t,{data:n})},jsonp:function(t,n,o){return-1==t.indexOf("=?")&&(o=o||this.callbackParam,t+=-1==t.indexOf("?")?"?":"&",t+=o+"=?"),e.ajax({url:t,dataType:"jsonp",data:n})},post:function(n,o){return e.ajax({url:n,data:t.toJSON(o),type:"POST",contentType:"application/json",dataType:"json"})}}});
define('plugins/observable',["durandal/system","durandal/binder","knockout"],function(e,t,n){function o(e){var t=e[0];return"_"===t||"$"===t}function i(t){return!(!t||void 0===t.nodeType||!e.isNumber(t.nodeType))}function a(e){if(!e||i(e)||e.ko===n||e.jquery)return!1;var t=p.call(e);return-1==h.indexOf(t)&&!(e===!0||e===!1)}function r(e,t){var n=e.__observable__,o=!0;if(!n||!n.__full__){n=n||(e.__observable__={}),n.__full__=!0,f.forEach(function(n){e[n]=function(){o=!1;var e=y[n].apply(t,arguments);return o=!0,e}}),g.forEach(function(n){e[n]=function(){o&&t.valueWillMutate();var i=v[n].apply(e,arguments);return o&&t.valueHasMutated(),i}}),m.forEach(function(n){e[n]=function(){for(var i=0,a=arguments.length;a>i;i++)s(arguments[i]);o&&t.valueWillMutate();var r=v[n].apply(e,arguments);return o&&t.valueHasMutated(),r}}),e.splice=function(){for(var n=2,i=arguments.length;i>n;n++)s(arguments[n]);o&&t.valueWillMutate();var a=v.splice.apply(e,arguments);return o&&t.valueHasMutated(),a};for(var i=0,a=e.length;a>i;i++)s(e[i])}}function s(t){var i,s;if(a(t)&&(i=t.__observable__,!i||!i.__full__)){if(i=i||(t.__observable__={}),i.__full__=!0,e.isArray(t)){var l=n.observableArray(t);r(t,l)}else for(var d in t)o(d)||i[d]||(s=t[d],e.isFunction(s)||c(t,d,s));w&&e.log("Converted",t)}}function l(e,t,n){var o;e(t),o=e.peek(),n?o?o.destroyAll||r(o,e):(o=[],e(o),r(o,e)):s(o)}function c(t,o,i){var a,c,d=t.__observable__||(t.__observable__={});if(void 0===i&&(i=t[o]),e.isArray(i))a=n.observableArray(i),r(i,a),c=!0;else if("function"==typeof i){if(!n.isObservable(i))return null;a=i}else e.isPromise(i)?(a=n.observable(),i.then(function(t){if(e.isArray(t)){var o=n.observableArray(t);r(t,o),t=o}a(t)})):(a=n.observable(i),s(i));return Object.defineProperty(t,o,{configurable:!0,enumerable:!0,get:a,set:n.isWriteableObservable(a)?function(t){t&&e.isPromise(t)?t.then(function(t){l(a,t,e.isArray(t))}):l(a,t,c)}:void 0}),d[o]=a,a}function d(t,o,i){var a,r={owner:t,deferEvaluation:!0};return"function"==typeof i?r.read=i:("value"in i&&e.error('For defineProperty, you must not specify a "value" for the property. You must provide a "get" function.'),"function"!=typeof i.get&&e.error('For defineProperty, the third parameter must be either an evaluator function, or an options object containing a function called "get".'),r.read=i.get,r.write=i.set),a=n.computed(r),t[o]=a,c(t,o,a)}var u,p=Object.prototype.toString,h=["[object Function]","[object String]","[object Boolean]","[object Number]","[object Date]","[object RegExp]"],f=["remove","removeAll","destroy","destroyAll","replace"],g=["pop","reverse","sort","shift","splice"],m=["push","unshift"],v=Array.prototype,y=n.observableArray.fn,w=!1;return u=function(e,t){var o,i,a;return e?(o=e.__observable__,o&&(i=o[t])?i:(a=e[t],n.isObservable(a)?a:c(e,t,a))):null},u.defineProperty=d,u.convertProperty=c,u.convertObject=s,u.install=function(e){var n=t.binding;t.binding=function(e,t,o){o.applyBindings&&!o.skipConversion&&s(e),n(e,t)},w=e.logConversion},u});
define('plugins/serializer',["durandal/system"],function(e){return{typeAttribute:"type",space:void 0,replacer:function(e,t){if(e){var n=e[0];if("_"===n||"$"===n)return void 0}return t},serialize:function(t,n){return n=void 0===n?{}:n,(e.isString(n)||e.isNumber(n))&&(n={space:n}),JSON.stringify(t,n.replacer||this.replacer,n.space||this.space)},getTypeId:function(e){return e?e[this.typeAttribute]:void 0},typeMap:{},registerType:function(){var t=arguments[0];if(1==arguments.length){var n=t[this.typeAttribute]||e.getModuleId(t);this.typeMap[n]=t}else this.typeMap[t]=arguments[1]},reviver:function(e,t,n,o){var i=n(t);if(i){var a=o(i);if(a)return a.fromJSON?a.fromJSON(t):new a(t)}return t},deserialize:function(e,t){var n=this;t=t||{};var o=t.getTypeId||function(e){return n.getTypeId(e)},i=t.getConstructor||function(e){return n.typeMap[e]},a=t.reviver||function(e,t){return n.reviver(e,t,o,i)};return JSON.parse(e,a)}}});
define('plugins/widget',["durandal/system","durandal/composition","jquery","knockout"],function(e,t,n,o){function i(e,n){var i=o.utils.domData.get(e,l);i||(i={parts:t.cloneNodes(o.virtualElements.childNodes(e))},o.virtualElements.emptyNode(e),o.utils.domData.set(e,l,i)),n.parts=i.parts}var a={},r={},s=["model","view","kind"],l="durandal-widget-data",c={getSettings:function(t){var n=o.utils.unwrapObservable(t())||{};if(e.isString(n))return{kind:n};for(var i in n)n[i]=-1!=o.utils.arrayIndexOf(s,i)?o.utils.unwrapObservable(n[i]):n[i];return n},registerKind:function(e){o.bindingHandlers[e]={init:function(){return{controlsDescendantBindings:!0}},update:function(t,n,o,a,r){var s=c.getSettings(n);s.kind=e,i(t,s),c.create(t,s,r,!0)}},o.virtualElements.allowedBindings[e]=!0,t.composeBindings.push(e+":")},mapKind:function(e,t,n){t&&(r[e]=t),n&&(a[e]=n)},mapKindToModuleId:function(e){return a[e]||c.convertKindToModulePath(e)},convertKindToModulePath:function(e){return"widgets/"+e+"/viewmodel"},mapKindToViewId:function(e){return r[e]||c.convertKindToViewPath(e)},convertKindToViewPath:function(e){return"widgets/"+e+"/view"},createCompositionSettings:function(e,t){return t.model||(t.model=this.mapKindToModuleId(t.kind)),t.view||(t.view=this.mapKindToViewId(t.kind)),t.preserveContext=!0,t.activate=!0,t.activationData=t,t.mode="templated",t},create:function(e,n,o,i){i||(n=c.getSettings(function(){return n},e));var a=c.createCompositionSettings(e,n);t.compose(e,a,o)},install:function(e){if(e.bindingName=e.bindingName||"widget",e.kinds)for(var n=e.kinds,a=0;a<n.length;a++)c.registerKind(n[a]);o.bindingHandlers[e.bindingName]={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,o,a){var r=c.getSettings(t);i(e,r),c.create(e,r,a,!0)}},t.composeBindings.push(e.bindingName+":"),o.virtualElements.allowedBindings[e.bindingName]=!0}};return c});
define('transitions/entrance',["durandal/system","durandal/composition","jquery"],function(e,t,n){var o=100,i={marginRight:0,marginLeft:0,opacity:1},a={marginLeft:"",marginRight:"",opacity:"",display:""},r=function(t){return e.defer(function(e){function r(){e.resolve()}function s(){t.keepScrollPosition||n(document).scrollTop(0)}function l(){s(),t.triggerAttach();var e={marginLeft:u?"0":"20px",marginRight:u?"0":"-20px",opacity:0,display:"block"},o=n(t.child);o.css(e),o.animate(i,{duration:c,easing:"swing",always:function(){o.css(a),r()}})}if(t.child){var c=t.duration||500,u=!!t.fadeOnly;t.activeView?n(t.activeView).fadeOut({duration:o,always:l}):l()}else n(t.activeView).fadeOut(o,r)}).promise()};return r});
require(["main"]);
}());