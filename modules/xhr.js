let oldXHR = window.XMLHttpRequest
    , config
    , xhr = function () {
            let tempReq = new oldXHR()
                , request = {}
                , rtn = {}

                , pathIn = '/api'

                , passThroughFunction = function (key) {
                    return function () {
                        tempReq[key].apply(tempReq, arguments);
                    };
                }
                , key;

            for (key in tempReq){
                if(typeof tempReq[key] === 'function'){
                    request[key] = passThroughFunction(key);
                } else {
                    request[key] = tempReq[key];
                }
            }

            request.oldSend = request.send;

            request.send = function () {

                //first run through the request stack
                config.request.reduce(function (prev, curr) {
                    return prev.then(function (request) {
                        return new Promise(function (resolve, reject) {
                            var p = curr.apply({}, [{request: request, original: originalRequest}, resolve]);

                            if(p instanceof Promise){
                                p.then(function(resp){
                                    resolve(resp);
                                });
                            }
                        });
                    });

                }, new Promise(function(res, rej){res({request: request, original: originalRequest})}))
                    .then(function (request) {
                        //check for request.response
                        //  if it exists return it in the body
                        //  if not then make the request

                    })

                //run through the response stack and trigger the
                //  correct event when done


                localforage.getItem(pathIn).then(function (doc) {
                    if(doc === null){
                        request.addEventListener('load', function (data) {
                            if(typeof config.encrypt !== 'undefined' && config.encrypt){
                                localforage.setItem(pathIn, crypto.encrypt(request.response));
                            } else {
                                localforage.setItem(pathIn, request.response);
                            }
                        });

                        request.oldSend();
                    } else {
                        if(typeof config.encrypt !== 'undefined' && config.encrypt){
                            request.response = crypto.decrypt(doc);
                        } else {
                            request.response = doc;
                        }
                        request.status = 200;
                        request.responseText = JSON.stringify(request.response);
                        request.statusText = '200 OK';

                        request.dispatchEvent(new Event('load'));
                        request.onload();
                    }
                });
            };


            return request;
        }

        , configurator = function (configObj) {
            config = configObj
            return xhr;
        };

export default configurator;
