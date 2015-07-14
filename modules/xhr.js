import * as bernstein from 'bernstein';

let oldXHR = window.XMLHttpRequest
    , config
    , xhr = () => {
            let tempReq = new oldXHR()
                , request = {}
                , rtn = {}

                , pathIn = '/api'

                , passThroughFunction = (key) => {
                    return () => {
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

            request.send = () => {
                //first run through the request stack
                let requestStack = bernstein.create(config.request)
                    , responseStack = bernstein.create(config.response);

                requestStack(request).then((req) => {
                    if(req.response !== ''){
                        //a response has been set

                        //request = req; //needs to merge not overwrite
                        Object.keys(req).forEach((key) => {
                            request[key] = req[key];
                        });

                        request.status = 200;
                        request.responseText = JSON.stringify(request.response);
                        request.statusText = '200 OK';
                    } else {
                        //send the real request out the door
                        //  this needs to be a whole new request object so I can grab the data before
                        //  anyone else does for the response stack
                        request.oldSend();
                    }

                    responseStack(request).then((req) => {
                        Object.keys(req).forEach((key) => {
                            request[key] = req[key];
                        });

                        request.dispatchEvent(new Event('load'));
                        request.onload();
                    });
                });

            };


            return request;
        }

        , configurator = (configObj) => {
            config = configObj;
            return xhr;
        };

export default configurator;
