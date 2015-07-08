let oldXHR = window.XMLHttpRequest
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
                if(typeof config.store === 'undefined' || config.store) {
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
                } else {
                    request.oldSend();
                }
            };

            return request;
        }

        , configurator = function (config) {
            return xhr;
        };

export default configurator;
