import * as bernstein from 'bernstein';

let config
    , fetchAPI = window.fetch //the original fetch

    , fetch = function (pathIn, options) {
        let promise = new Promise(function (resolve, reject){
            let fetchPromise
                , requestStack = bernstein.create(config.request)
                , responseStack = bernstein.create(config.response);


            requestStack({path: pathIn, options: options}).then((req) => {
                //we have run through the request stack... now decide if we should
                //  make the request by looking for
                //  req.response
                if(typeof req.response !== 'undefined'){
                    //on to the resolve stack!
                    fetchPromise = new Promise(function (res, rej) {
                        res(new Response(JSON.stringify(req.response)));
                    });
                } else {
                    fetchPromise = fetchAPI(pathIn, options);
                }

                //now we need to run through the responseStack
                //  get the data out of the Response object we will re-wrap it later
                fetchPromise.json().then((data) => {
                    responseStack(data).then((finishedData) => {
                        //Rewrap the result in a response so that the external stuff can deal with it
                        //  as a normal fetch response... yeah
                        resolve(new Response(JSON.stringify(finishedData)));
                    });
                });

                fetchPromise.catch((err) => {
                    reject(err);
                });

            }).catch((err) => {
                reject(err);
            });
        });

        return promise;
    }

    , configurator = function (configObj) {
        config = configObj;

        return fetch;
    };

export default configurator;
