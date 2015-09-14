(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _modulesFetch = require('./modules/fetch');

var _modulesFetch2 = _interopRequireDefault(_modulesFetch);

var _modulesXhr = require('./modules/xhr');

var _modulesXhr2 = _interopRequireDefault(_modulesXhr);

window.jayne = function (config) {
    if (typeof window.fetch === 'function') {
        window.fetch = (0, _modulesFetch2['default'])(config);
    }

    window.XMLHttpRequest = (0, _modulesXhr2['default'])(config);
};

},{"./modules/fetch":2,"./modules/xhr":3}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _bernstein = require('bernstein');

var bernstein = _interopRequireWildcard(_bernstein);

var config = undefined,
    fetchAPI = window.fetch //the original fetch

,
    fetch = function fetch(pathIn, options) {
    var promise = new Promise(function (resolve, reject) {
        var fetchPromise = undefined,
            requestStack = bernstein.create(config.request),
            responseStack = bernstein.create(config.response);

        requestStack({ path: pathIn, options: options }).then(function (req) {
            //we have run through the request stack... now decide if we should
            //  make the request by looking for
            //  req.response

            fetchPromise = !req.response ? fetchAPI(req.path, req.options) : new Promise(function (res, rej) {
                return res(new Response(JSON.stringify(req.response)));
            });

            //now we need to run through the responseStack
            //  get the data out of the Response object we will re-wrap it later
            fetchPromise.then(function (fetchRes) {
                return fetchRes.json().then(function (data) {
                    return responseStack(data).then(function (finishedData) {
                        return (
                            // Rewrap the result in a response so that the
                            // external stuff can deal with it as a normal
                            // fetch response... yeah
                            resolve(new Response(JSON.stringify(finishedData)))
                        );
                    });
                })['catch'](function (err) {
                    return reject(err);
                });
            })['catch'](function (err) {
                return reject(err);
            });
        })['catch'](function (err) {
            return reject(err);
        });
    });

    return promise;
},
    configurator = function configurator(configObj) {
    config = configObj;

    return fetch;
};

exports['default'] = configurator;
module.exports = exports['default'];

},{"bernstein":4}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _bernstein = require('bernstein');

var bernstein = _interopRequireWildcard(_bernstein);

var oldXHR = window.XMLHttpRequest,
    config = undefined,
    xhr = function xhr() {
    var tempReq = new oldXHR(),
        secondaryReq = new oldXHR(),
        request = {},
        rtn = {},
        pathIn = '/api',
        passThroughFunction = function passThroughFunction(key) {
        return function () {
            tempReq[key].apply(tempReq, arguments);
        };
    },
        key = undefined,
        args = undefined;

    //copy the object over while severing ties
    for (key in tempReq) {
        if (typeof tempReq[key] === 'function') {
            request[key] = passThroughFunction(key);
        } else {
            request[key] = tempReq[key];
        }
    }

    request.open = function () {
        args = arguments;

        tempReq['open'].apply(tempReq, arguments);
    };

    request.oldSend = request.send;

    request.send = function () {
        //first run through the request stack
        var requestStack = bernstein.create(config.request),
            responseStack = bernstein.create(config.response);

        requestStack(request).then(function (req) {
            if (req.response !== '') {
                //a response has been set

                //request = req; //needs to merge not overwrite
                Object.keys(req).forEach(function (key) {
                    request[key] = req[key];
                });

                request.status = 200;
                request.responseText = JSON.stringify(request.response);
                request.statusText = '200 OK';

                responseStack(request).then(function (req) {
                    Object.keys(req).forEach(function (key) {
                        request[key] = req[key];
                    });

                    request.dispatchEvent(new Event('load'));
                    request.onload();
                });
            } else {
                //send the real request out the door
                //  this needs to be a whole new request object so I can grab the data before
                //  anyone else does for the response stack
                secondaryReq.onload = function () {
                    responseStack(secondaryReq).then(function (req) {
                        Object.keys(req).forEach(function (key) {
                            request[key] = req[key];
                        });

                        request.dispatchEvent(new Event('load'));
                        request.onload();
                    });
                };

                secondaryReq.open.apply(secondaryReq, args);
                secondaryReq.send();
            }
        });
    };

    return request;
},
    configurator = function configurator(configObj) {
    config = configObj;
    return xhr;
};

exports['default'] = configurator;
module.exports = exports['default'];

},{"bernstein":4}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
var create = function create(functions) {
    return function (data) {

        if (typeof functions !== 'object') {
            return new Promise(function (res, rej) {
                //immediate promise to start the stack off right
                res(JSON.parse(JSON.stringify(data)));
            });
        } else {
            return functions.reduce(function (prev, curr) {
                return prev.then(function (request) {
                    return new Promise(function (resolve, reject) {
                        var p = curr.apply(null, [request, data, resolve]);

                        if (p instanceof Promise) {
                            p.then(function (resp) {
                                resolve(resp);
                            });
                        }
                    });
                });
            }, new Promise(function (res, rej) {
                //immediate promise to start the stack off right
                res(JSON.parse(JSON.stringify(data)));
            }));
        }
    };
};

exports['default'] = { create: create };
module.exports = exports['default'];
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZGVzaWduZnJvbnRpZXIvcHJvamVjdHMvamF5bmUvaW5kZXguanMiLCIvVXNlcnMvZGVzaWduZnJvbnRpZXIvcHJvamVjdHMvamF5bmUvbW9kdWxlcy9mZXRjaC5qcyIsIi9Vc2Vycy9kZXNpZ25mcm9udGllci9wcm9qZWN0cy9qYXluZS9tb2R1bGVzL3hoci5qcyIsIm5vZGVfbW9kdWxlcy9iZXJuc3RlaW4vZGlzdC9iZXJuc3RlaW4uY2pzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs0QkNBa0IsaUJBQWlCOzs7OzBCQUNuQixlQUFlOzs7O0FBRS9CLE1BQU0sQ0FBQyxLQUFLLEdBQUcsVUFBVSxNQUFNLEVBQUU7QUFDN0IsUUFBRyxPQUFPLE1BQU0sQ0FBQyxLQUFLLEtBQUssVUFBVSxFQUFDO0FBQ2xDLGNBQU0sQ0FBQyxLQUFLLEdBQUcsK0JBQU0sTUFBTSxDQUFDLENBQUM7S0FDaEM7O0FBRUQsVUFBTSxDQUFDLGNBQWMsR0FBRyw2QkFBSSxNQUFNLENBQUMsQ0FBQztDQUN2QyxDQUFDOzs7Ozs7Ozs7Ozt5QkNUeUIsV0FBVzs7SUFBMUIsU0FBUzs7QUFFckIsSUFBSSxNQUFNLFlBQUE7SUFDSixRQUFRLEdBQUcsTUFBTSxDQUFDLEtBQUs7O0FBQUE7SUFFdkIsS0FBSyxHQUFHLFNBQVIsS0FBSyxDQUFhLE1BQU0sRUFBRSxPQUFPLEVBQUU7QUFDakMsUUFBSSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUUsVUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFLO0FBQzVDLFlBQUksWUFBWSxZQUFBO1lBQ1YsWUFBWSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztZQUMvQyxhQUFhLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7O0FB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QUcsRUFBSztBQUN0Qyw4QkFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQyxHQUFHLEVBQUs7QUFDOUIsbUNBQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7eUJBQzNCLENBQUMsQ0FBQzs7QUFFSCwrQkFBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLCtCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7cUJBQ3BCLENBQUMsQ0FBQztpQkFDTixDQUFDOztBQUVGLDRCQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDNUMsNEJBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUN2QjtTQUNKLENBQUMsQ0FBQztLQUVOLENBQUM7O0FBRUYsV0FBTyxPQUFPLENBQUM7Q0FDbEI7SUFFQyxZQUFZLEdBQUcsU0FBZixZQUFZLENBQUksU0FBUyxFQUFLO0FBQzVCLFVBQU0sR0FBRyxTQUFTLENBQUM7QUFDbkIsV0FBTyxHQUFHLENBQUM7Q0FDZCxDQUFDOztxQkFFSyxZQUFZOzs7O0FDN0YzQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IGZldGNoIGZyb20gJy4vbW9kdWxlcy9mZXRjaCc7XG5pbXBvcnQgeGhyIGZyb20gJy4vbW9kdWxlcy94aHInO1xuXG53aW5kb3cuamF5bmUgPSBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgaWYodHlwZW9mIHdpbmRvdy5mZXRjaCA9PT0gJ2Z1bmN0aW9uJyl7XG4gICAgICAgIHdpbmRvdy5mZXRjaCA9IGZldGNoKGNvbmZpZyk7XG4gICAgfVxuXG4gICAgd2luZG93LlhNTEh0dHBSZXF1ZXN0ID0geGhyKGNvbmZpZyk7XG59O1xuIiwiaW1wb3J0ICogYXMgYmVybnN0ZWluIGZyb20gJ2Jlcm5zdGVpbic7XG5cbmxldCBjb25maWdcbiAgICAsIGZldGNoQVBJID0gd2luZG93LmZldGNoIC8vdGhlIG9yaWdpbmFsIGZldGNoXG5cbiAgICAsIGZldGNoID0gZnVuY3Rpb24gKHBhdGhJbiwgb3B0aW9ucykge1xuICAgICAgICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBsZXQgZmV0Y2hQcm9taXNlXG4gICAgICAgICAgICAgICAgLCByZXF1ZXN0U3RhY2sgPSBiZXJuc3RlaW4uY3JlYXRlKGNvbmZpZy5yZXF1ZXN0KVxuICAgICAgICAgICAgICAgICwgcmVzcG9uc2VTdGFjayA9IGJlcm5zdGVpbi5jcmVhdGUoY29uZmlnLnJlc3BvbnNlKTtcblxuICAgICAgICAgICAgcmVxdWVzdFN0YWNrKHtwYXRoOiBwYXRoSW4sIG9wdGlvbnM6IG9wdGlvbnN9KS50aGVuKChyZXEpID0+IHtcbiAgICAgICAgICAgICAgICAvL3dlIGhhdmUgcnVuIHRocm91Z2ggdGhlIHJlcXVlc3Qgc3RhY2suLi4gbm93IGRlY2lkZSBpZiB3ZSBzaG91bGRcbiAgICAgICAgICAgICAgICAvLyAgbWFrZSB0aGUgcmVxdWVzdCBieSBsb29raW5nIGZvclxuICAgICAgICAgICAgICAgIC8vICByZXEucmVzcG9uc2VcblxuICAgICAgICAgICAgICAgIGZldGNoUHJvbWlzZSA9ICFyZXEucmVzcG9uc2UgP1xuICAgICAgICAgICAgICAgICAgICBmZXRjaEFQSShyZXEucGF0aCwgcmVxLm9wdGlvbnMpIDpcbiAgICAgICAgICAgICAgICAgICAgbmV3IFByb21pc2UoIChyZXMsIHJlaikgPT4gcmVzKFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHJlcS5yZXNwb25zZSkpIClcbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIC8vbm93IHdlIG5lZWQgdG8gcnVuIHRocm91Z2ggdGhlIHJlc3BvbnNlU3RhY2tcbiAgICAgICAgICAgICAgICAvLyAgZ2V0IHRoZSBkYXRhIG91dCBvZiB0aGUgUmVzcG9uc2Ugb2JqZWN0IHdlIHdpbGwgcmUtd3JhcCBpdCBsYXRlclxuICAgICAgICAgICAgICAgIGZldGNoUHJvbWlzZS50aGVuKFxuICAgICAgICAgICAgICAgICAgICAoZmV0Y2hSZXMpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICBmZXRjaFJlcy5qc29uKCkudGhlbiggKGRhdGEpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VTdGFjayhkYXRhKS50aGVuKCAoZmluaXNoZWREYXRhKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXdyYXAgdGhlIHJlc3VsdCBpbiBhIHJlc3BvbnNlIHNvIHRoYXQgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGV4dGVybmFsIHN0dWZmIGNhbiBkZWFsIHdpdGggaXQgYXMgYSBub3JtYWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmV0Y2ggcmVzcG9uc2UuLi4geWVhaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeShmaW5pc2hlZERhdGEpKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgICApLmNhdGNoKChlcnIpID0+IHJlamVjdChlcnIpIClcbiAgICAgICAgICAgICAgICApLmNhdGNoKChlcnIpID0+IHJlamVjdChlcnIpKTtcblxuICAgICAgICAgICAgfSkuY2F0Y2goIChlcnIpID0+IHJlamVjdChlcnIpICk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgICwgY29uZmlndXJhdG9yID0gZnVuY3Rpb24gKGNvbmZpZ09iaikge1xuICAgICAgICBjb25maWcgPSBjb25maWdPYmo7XG5cbiAgICAgICAgcmV0dXJuIGZldGNoO1xuICAgIH07XG5cbmV4cG9ydCBkZWZhdWx0IGNvbmZpZ3VyYXRvcjtcbiIsImltcG9ydCAqIGFzIGJlcm5zdGVpbiBmcm9tICdiZXJuc3RlaW4nO1xuXG5sZXQgb2xkWEhSID0gd2luZG93LlhNTEh0dHBSZXF1ZXN0XG4gICAgLCBjb25maWdcbiAgICAsIHhociA9ICgpID0+IHtcbiAgICAgICAgICAgIGxldCB0ZW1wUmVxID0gbmV3IG9sZFhIUigpXG4gICAgICAgICAgICAgICAgLCBzZWNvbmRhcnlSZXEgPSBuZXcgb2xkWEhSKClcbiAgICAgICAgICAgICAgICAsIHJlcXVlc3QgPSB7fVxuICAgICAgICAgICAgICAgICwgcnRuID0ge31cblxuICAgICAgICAgICAgICAgICwgcGF0aEluID0gJy9hcGknXG5cbiAgICAgICAgICAgICAgICAsIHBhc3NUaHJvdWdoRnVuY3Rpb24gPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wUmVxW2tleV0uYXBwbHkodGVtcFJlcSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLCBrZXlcbiAgICAgICAgICAgICAgICAsIGFyZ3M7XG5cbiAgICAgICAgICAgIC8vY29weSB0aGUgb2JqZWN0IG92ZXIgd2hpbGUgc2V2ZXJpbmcgdGllc1xuICAgICAgICAgICAgZm9yIChrZXkgaW4gdGVtcFJlcSl7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIHRlbXBSZXFba2V5XSA9PT0gJ2Z1bmN0aW9uJyl7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3Rba2V5XSA9IHBhc3NUaHJvdWdoRnVuY3Rpb24oa2V5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0W2tleV0gPSB0ZW1wUmVxW2tleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXF1ZXN0Lm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgYXJncyA9IGFyZ3VtZW50cztcblxuICAgICAgICAgICAgICAgIHRlbXBSZXFbJ29wZW4nXS5hcHBseSh0ZW1wUmVxLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmVxdWVzdC5vbGRTZW5kID0gcmVxdWVzdC5zZW5kO1xuXG4gICAgICAgICAgICByZXF1ZXN0LnNlbmQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy9maXJzdCBydW4gdGhyb3VnaCB0aGUgcmVxdWVzdCBzdGFja1xuICAgICAgICAgICAgICAgIGxldCByZXF1ZXN0U3RhY2sgPSBiZXJuc3RlaW4uY3JlYXRlKGNvbmZpZy5yZXF1ZXN0KVxuICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlU3RhY2sgPSBiZXJuc3RlaW4uY3JlYXRlKGNvbmZpZy5yZXNwb25zZSk7XG5cbiAgICAgICAgICAgICAgICByZXF1ZXN0U3RhY2socmVxdWVzdCkudGhlbigocmVxKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHJlcS5yZXNwb25zZSAhPT0gJycpe1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9hIHJlc3BvbnNlIGhhcyBiZWVuIHNldFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3JlcXVlc3QgPSByZXE7IC8vbmVlZHMgdG8gbWVyZ2Ugbm90IG92ZXJ3cml0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMocmVxKS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0W2tleV0gPSByZXFba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LnN0YXR1cyA9IDIwMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QucmVzcG9uc2VUZXh0ID0gSlNPTi5zdHJpbmdpZnkocmVxdWVzdC5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LnN0YXR1c1RleHQgPSAnMjAwIE9LJztcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VTdGFjayhyZXF1ZXN0KS50aGVuKChyZXEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhyZXEpLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0W2tleV0gPSByZXFba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2xvYWQnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5vbmxvYWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9zZW5kIHRoZSByZWFsIHJlcXVlc3Qgb3V0IHRoZSBkb29yXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgdGhpcyBuZWVkcyB0byBiZSBhIHdob2xlIG5ldyByZXF1ZXN0IG9iamVjdCBzbyBJIGNhbiBncmFiIHRoZSBkYXRhIGJlZm9yZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gIGFueW9uZSBlbHNlIGRvZXMgZm9yIHRoZSByZXNwb25zZSBzdGFja1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vjb25kYXJ5UmVxLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZVN0YWNrKHNlY29uZGFyeVJlcSkudGhlbigocmVxKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHJlcSkuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0W2tleV0gPSByZXFba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnbG9hZCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5vbmxvYWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZGFyeVJlcS5vcGVuLmFwcGx5KHNlY29uZGFyeVJlcSwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmRhcnlSZXEuc2VuZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0O1xuICAgICAgICB9XG5cbiAgICAgICAgLCBjb25maWd1cmF0b3IgPSAoY29uZmlnT2JqKSA9PiB7XG4gICAgICAgICAgICBjb25maWcgPSBjb25maWdPYmo7XG4gICAgICAgICAgICByZXR1cm4geGhyO1xuICAgICAgICB9O1xuXG5leHBvcnQgZGVmYXVsdCBjb25maWd1cmF0b3I7XG4iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG52YXIgY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKGZ1bmN0aW9ucykge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuXG4gICAgICAgIGlmICh0eXBlb2YgZnVuY3Rpb25zICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMsIHJlaikge1xuICAgICAgICAgICAgICAgIC8vaW1tZWRpYXRlIHByb21pc2UgdG8gc3RhcnQgdGhlIHN0YWNrIG9mZiByaWdodFxuICAgICAgICAgICAgICAgIHJlcyhKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRhdGEpKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbnMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjdXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByZXYudGhlbihmdW5jdGlvbiAocmVxdWVzdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHAgPSBjdXJyLmFwcGx5KG51bGwsIFtyZXF1ZXN0LCBkYXRhLCByZXNvbHZlXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHAudGhlbihmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMsIHJlaikge1xuICAgICAgICAgICAgICAgIC8vaW1tZWRpYXRlIHByb21pc2UgdG8gc3RhcnQgdGhlIHN0YWNrIG9mZiByaWdodFxuICAgICAgICAgICAgICAgIHJlcyhKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRhdGEpKSk7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuZXhwb3J0c1snZGVmYXVsdCddID0geyBjcmVhdGU6IGNyZWF0ZSB9O1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107Il19
