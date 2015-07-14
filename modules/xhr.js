import * as bernstein from 'bernstein';

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

            //copy the object over while severing ties
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
                let requestStack = bernstein.create(config.request)
                    , responseStack = bernstein.create(config.response);

                requestStack(request).then((req) => {
                    if(typeof req.response !== 'undefined'){
                        //a response has been set

                        request = req;
                        request.status = 200;
                        request.responseText = JSON.stringify(request.response);
                        request.statusText = '200 OK';

                    } else {
                        //send the real request out the door
                        //  this needs to be a whole new request object so I can grab the data before
                        //  anyone else does for the response stack

                    }

                    responseStack(request).then((req) => {
                        req.dispatchEvent(new Event('load'));
                        req.onload();
                    });
                });


                //         request.addEventListener('load', function (data) {
                //             if(typeof config.encrypt !== 'undefined' && config.encrypt){
                //                 localforage.setItem(pathIn, crypto.encrypt(request.response));
                //             } else {
                //                 localforage.setItem(pathIn, request.response);
                //             }
                //         });

                //         request.oldSend();
            };


            return request;
        }

        , configurator = function (configObj) {
            config = configObj
            return xhr;
        };

export default configurator;
