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
            if (typeof req.response !== 'undefined') {
                //on to the resolve stack!
                fetchPromise = new Promise(function (res, rej) {
                    res(new Response(JSON.stringify(req.response)));
                });
            } else {
                fetchPromise = fetchAPI(pathIn, options);
            }

            //now we need to run through the responseStack
            //  get the data out of the Response object we will re-wrap it later
            fetchPromise.then(function (fetchRes) {
                fetchRes.json().then(function (data) {
                    responseStack(data).then(function (finishedData) {
                        //Rewrap the result in a response so that the external stuff can deal with it
                        //  as a normal fetch response... yeah
                        resolve(new Response(JSON.stringify(finishedData)));
                    });
                })['catch'](function (err) {
                    reject(err);
                });
            })['catch'](function (err) {
                reject(err);
            });
        })['catch'](function (err) {
            reject(err);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvd2FzcG9zZWxsZXJzL3Byb2plY3RzL2pheW5lL2luZGV4LmpzIiwiL1VzZXJzL3dhc3Bvc2VsbGVycy9wcm9qZWN0cy9qYXluZS9tb2R1bGVzL2ZldGNoLmpzIiwiL1VzZXJzL3dhc3Bvc2VsbGVycy9wcm9qZWN0cy9qYXluZS9tb2R1bGVzL3hoci5qcyIsIm5vZGVfbW9kdWxlcy9iZXJuc3RlaW4vZGlzdC9iZXJuc3RlaW4uY2pzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs0QkNBa0IsaUJBQWlCOzs7OzBCQUNuQixlQUFlOzs7O0FBRS9CLE1BQU0sQ0FBQyxLQUFLLEdBQUcsVUFBVSxNQUFNLEVBQUU7QUFDN0IsUUFBRyxPQUFPLE1BQU0sQ0FBQyxLQUFLLEtBQUssVUFBVSxFQUFDO0FBQ2xDLGNBQU0sQ0FBQyxLQUFLLEdBQUcsK0JBQU0sTUFBTSxDQUFDLENBQUM7S0FDaEM7O0FBRUQsVUFBTSxDQUFDLGNBQWMsR0FBRyw2QkFBSSxNQUFNLENBQUMsQ0FBQztDQUN2QyxDQUFDOzs7Ozs7Ozs7Ozt5QkNUeUIsV0FBVzs7SUFBMUIsU0FBUzs7QUFFckIsSUFBSSxNQUFNLFlBQUE7SUFDSixRQUFRLEdBQUcsTUFBTSxDQUFDLEtBQUs7O0FBQUE7SUFFdkIsS0FBSyxHQUFHLFNBQVIsS0FBSyxDQUFhLE1BQU0sRUFBRSxPQUFPLEVBQUU7QUFDakMsUUFBSSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsVUFBVSxPQUFPLEVBQUUsTUFBTSxFQUFDO0FBQ2hELFlBQUksWUFBWSxZQUFBO1lBQ1YsWUFBWSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztZQUMvQyxhQUFhLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7O0FBRXhELG9C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QUNOLE1BQU07Ozs7QUFJSCw0QkFBWSxDQUFDLE1BQU0sR0FBRyxZQUFZO0FBQzlCLGlDQUFhLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsR0FBRyxFQUFLO0FBQ3RDLDhCQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFDLEdBQUcsRUFBSztBQUM5QixtQ0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzt5QkFDM0IsQ0FBQyxDQUFDOztBQUVILCtCQUFPLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDekMsK0JBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztxQkFDcEIsQ0FBQyxDQUFDO2lCQUNOLENBQUM7O0FBRUYsNEJBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM1Qyw0QkFBWSxDQUFDLElBQUksRUFBRSxDQUFDO2FBQ3ZCO1NBQ0osQ0FBQyxDQUFDO0tBRU4sQ0FBQzs7QUFFRixXQUFPLE9BQU8sQ0FBQztDQUNsQjtJQUVDLFlBQVksR0FBRyxTQUFmLFlBQVksQ0FBSSxTQUFTLEVBQUs7QUFDNUIsVUFBTSxHQUFHLFNBQVMsQ0FBQztBQUNuQixXQUFPLEdBQUcsQ0FBQztDQUNkLENBQUM7O3FCQUVLLFlBQVk7Ozs7QUM3RjNCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgZmV0Y2ggZnJvbSAnLi9tb2R1bGVzL2ZldGNoJztcbmltcG9ydCB4aHIgZnJvbSAnLi9tb2R1bGVzL3hocic7XG5cbndpbmRvdy5qYXluZSA9IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICBpZih0eXBlb2Ygd2luZG93LmZldGNoID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgd2luZG93LmZldGNoID0gZmV0Y2goY29uZmlnKTtcbiAgICB9XG5cbiAgICB3aW5kb3cuWE1MSHR0cFJlcXVlc3QgPSB4aHIoY29uZmlnKTtcbn07XG4iLCJpbXBvcnQgKiBhcyBiZXJuc3RlaW4gZnJvbSAnYmVybnN0ZWluJztcblxubGV0IGNvbmZpZ1xuICAgICwgZmV0Y2hBUEkgPSB3aW5kb3cuZmV0Y2ggLy90aGUgb3JpZ2luYWwgZmV0Y2hcblxuICAgICwgZmV0Y2ggPSBmdW5jdGlvbiAocGF0aEluLCBvcHRpb25zKSB7XG4gICAgICAgIGxldCBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgICAgICBsZXQgZmV0Y2hQcm9taXNlXG4gICAgICAgICAgICAgICAgLCByZXF1ZXN0U3RhY2sgPSBiZXJuc3RlaW4uY3JlYXRlKGNvbmZpZy5yZXF1ZXN0KVxuICAgICAgICAgICAgICAgICwgcmVzcG9uc2VTdGFjayA9IGJlcm5zdGVpbi5jcmVhdGUoY29uZmlnLnJlc3BvbnNlKTtcblxuICAgICAgICAgICAgcmVxdWVzdFN0YWNrKHtwYXRoOiBwYXRoSW4sIG9wdGlvbnM6IG9wdGlvbnN9KS50aGVuKChyZXEpID0+IHtcbiAgICAgICAgICAgICAgICAvL3dlIGhhdmUgcnVuIHRocm91Z2ggdGhlIHJlcXVlc3Qgc3RhY2suLi4gbm93IGRlY2lkZSBpZiB3ZSBzaG91bGRcbiAgICAgICAgICAgICAgICAvLyAgbWFrZSB0aGUgcmVxdWVzdCBieSBsb29raW5nIGZvclxuICAgICAgICAgICAgICAgIC8vICByZXEucmVzcG9uc2VcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgcmVxLnJlc3BvbnNlICE9PSAndW5kZWZpbmVkJyl7XG4gICAgICAgICAgICAgICAgICAgIC8vb24gdG8gdGhlIHJlc29sdmUgc3RhY2shXG4gICAgICAgICAgICAgICAgICAgIGZldGNoUHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMsIHJlaikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzKG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeShyZXEucmVzcG9uc2UpKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZldGNoUHJvbWlzZSA9IGZldGNoQVBJKHBhdGhJbiwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy9ub3cgd2UgbmVlZCB0byBydW4gdGhyb3VnaCB0aGUgcmVzcG9uc2VTdGFja1xuICAgICAgICAgICAgICAgIC8vICBnZXQgdGhlIGRhdGEgb3V0IG9mIHRoZSBSZXNwb25zZSBvYmplY3Qgd2Ugd2lsbCByZS13cmFwIGl0IGxhdGVyXG4gICAgICAgICAgICAgICAgZmV0Y2hQcm9taXNlLnRoZW4oKGZldGNoUmVzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGZldGNoUmVzLmpzb24oKS50aGVuKChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZVN0YWNrKGRhdGEpLnRoZW4oKGZpbmlzaGVkRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vUmV3cmFwIHRoZSByZXN1bHQgaW4gYSByZXNwb25zZSBzbyB0aGF0IHRoZSBleHRlcm5hbCBzdHVmZiBjYW4gZGVhbCB3aXRoIGl0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gIGFzIGEgbm9ybWFsIGZldGNoIHJlc3BvbnNlLi4uIHllYWhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeShmaW5pc2hlZERhdGEpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICAsIGNvbmZpZ3VyYXRvciA9IGZ1bmN0aW9uIChjb25maWdPYmopIHtcbiAgICAgICAgY29uZmlnID0gY29uZmlnT2JqO1xuXG4gICAgICAgIHJldHVybiBmZXRjaDtcbiAgICB9O1xuXG5leHBvcnQgZGVmYXVsdCBjb25maWd1cmF0b3I7XG4iLCJpbXBvcnQgKiBhcyBiZXJuc3RlaW4gZnJvbSAnYmVybnN0ZWluJztcblxubGV0IG9sZFhIUiA9IHdpbmRvdy5YTUxIdHRwUmVxdWVzdFxuICAgICwgY29uZmlnXG4gICAgLCB4aHIgPSAoKSA9PiB7XG4gICAgICAgICAgICBsZXQgdGVtcFJlcSA9IG5ldyBvbGRYSFIoKVxuICAgICAgICAgICAgICAgICwgc2Vjb25kYXJ5UmVxID0gbmV3IG9sZFhIUigpXG4gICAgICAgICAgICAgICAgLCByZXF1ZXN0ID0ge31cbiAgICAgICAgICAgICAgICAsIHJ0biA9IHt9XG5cbiAgICAgICAgICAgICAgICAsIHBhdGhJbiA9ICcvYXBpJ1xuXG4gICAgICAgICAgICAgICAgLCBwYXNzVGhyb3VnaEZ1bmN0aW9uID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcFJlcVtrZXldLmFwcGx5KHRlbXBSZXEsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICwga2V5XG4gICAgICAgICAgICAgICAgLCBhcmdzO1xuXG4gICAgICAgICAgICAvL2NvcHkgdGhlIG9iamVjdCBvdmVyIHdoaWxlIHNldmVyaW5nIHRpZXNcbiAgICAgICAgICAgIGZvciAoa2V5IGluIHRlbXBSZXEpe1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiB0ZW1wUmVxW2tleV0gPT09ICdmdW5jdGlvbicpe1xuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0W2tleV0gPSBwYXNzVGhyb3VnaEZ1bmN0aW9uKGtleSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdFtrZXldID0gdGVtcFJlcVtrZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVxdWVzdC5vcGVuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgICAgICAgICAgICB0ZW1wUmVxWydvcGVuJ10uYXBwbHkodGVtcFJlcSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJlcXVlc3Qub2xkU2VuZCA9IHJlcXVlc3Quc2VuZDtcblxuICAgICAgICAgICAgcmVxdWVzdC5zZW5kID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vZmlyc3QgcnVuIHRocm91Z2ggdGhlIHJlcXVlc3Qgc3RhY2tcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdFN0YWNrID0gYmVybnN0ZWluLmNyZWF0ZShjb25maWcucmVxdWVzdClcbiAgICAgICAgICAgICAgICAgICAgLCByZXNwb25zZVN0YWNrID0gYmVybnN0ZWluLmNyZWF0ZShjb25maWcucmVzcG9uc2UpO1xuXG4gICAgICAgICAgICAgICAgcmVxdWVzdFN0YWNrKHJlcXVlc3QpLnRoZW4oKHJlcSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZihyZXEucmVzcG9uc2UgIT09ICcnKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vYSByZXNwb25zZSBoYXMgYmVlbiBzZXRcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy9yZXF1ZXN0ID0gcmVxOyAvL25lZWRzIHRvIG1lcmdlIG5vdCBvdmVyd3JpdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHJlcSkuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdFtrZXldID0gcmVxW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5zdGF0dXMgPSAyMDA7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVGV4dCA9IEpTT04uc3RyaW5naWZ5KHJlcXVlc3QucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5zdGF0dXNUZXh0ID0gJzIwMCBPSyc7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlU3RhY2socmVxdWVzdCkudGhlbigocmVxKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMocmVxKS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdFtrZXldID0gcmVxW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdsb2FkJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3Qub25sb2FkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vc2VuZCB0aGUgcmVhbCByZXF1ZXN0IG91dCB0aGUgZG9vclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gIHRoaXMgbmVlZHMgdG8gYmUgYSB3aG9sZSBuZXcgcmVxdWVzdCBvYmplY3Qgc28gSSBjYW4gZ3JhYiB0aGUgZGF0YSBiZWZvcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICBhbnlvbmUgZWxzZSBkb2VzIGZvciB0aGUgcmVzcG9uc2Ugc3RhY2tcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZGFyeVJlcS5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VTdGFjayhzZWNvbmRhcnlSZXEpLnRoZW4oKHJlcSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhyZXEpLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdFtrZXldID0gcmVxW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2xvYWQnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3Qub25sb2FkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmRhcnlSZXEub3Blbi5hcHBseShzZWNvbmRhcnlSZXEsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vjb25kYXJ5UmVxLnNlbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gcmVxdWVzdDtcbiAgICAgICAgfVxuXG4gICAgICAgICwgY29uZmlndXJhdG9yID0gKGNvbmZpZ09iaikgPT4ge1xuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnT2JqO1xuICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgfTtcblxuZXhwb3J0IGRlZmF1bHQgY29uZmlndXJhdG9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xudmFyIGNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShmdW5jdGlvbnMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGRhdGEpIHtcblxuICAgICAgICBpZiAodHlwZW9mIGZ1bmN0aW9ucyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzLCByZWopIHtcbiAgICAgICAgICAgICAgICAvL2ltbWVkaWF0ZSBwcm9taXNlIHRvIHN0YXJ0IHRoZSBzdGFjayBvZmYgcmlnaHRcbiAgICAgICAgICAgICAgICByZXMoSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkYXRhKSkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb25zLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY3Vycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcmV2LnRoZW4oZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwID0gY3Vyci5hcHBseShudWxsLCBbcmVxdWVzdCwgZGF0YSwgcmVzb2x2ZV0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocCBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwLnRoZW4oZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXNwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzLCByZWopIHtcbiAgICAgICAgICAgICAgICAvL2ltbWVkaWF0ZSBwcm9taXNlIHRvIHN0YXJ0IHRoZSBzdGFjayBvZmYgcmlnaHRcbiAgICAgICAgICAgICAgICByZXMoSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkYXRhKSkpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgfTtcbn07XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IHsgY3JlYXRlOiBjcmVhdGUgfTtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyJdfQ==
