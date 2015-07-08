let config
    , fetchAPI = window.fetch //the original fetch

    , fetch = function (pathIn, options) {
        let promise = new Promise(function (resolve, reject){
            let fetchPromise
                , originalRequest = {path: pathIn, options: options}
                , previousRequest = originalRequest
                , originalResponse;


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

            }, new Promise(function(res, rej){res({request: originalRequest, original: originalRequest})}))
                .then(function (request) {

                    if(typeof request.response !== 'undefined') {
                        //short circuit and fake the response
                        //  need a promise here to allow for the code below to be identical
                        //  between a faked request and a network involved request
                        fetchPromise = new Promise(function (res, rej) {
                                res(new Response(JSON.stringify(request.response)));
                        });
                    } else {
                        fetchPromise = fetchAPI(pathIn, options);
                    }

                    fetchPromise.then(function (response) {

                        originalResponse = response;

                        config.response.reduce(function (prev, curr) {
                            return prev.then(function (responseIn) {
                                return new Promise(function (resolve, reject) {
                                    var p = curr.apply({}, [{response: responseIn, original: originalReponse}, resolve]);

                                    if(p instanceof Promise){
                                        p.then(function(resp){
                                            resolve(resp);
                                        });
                                    }
                                });
                            });

                        }, new Promise(function(res, rej){res({response: response, original: originalResponse})}))
                            .then(function (responseFinal){

                                resolve(responseFinal);
                            });
                    }).catch(function (err) {
                        reject(err);
                    });
                });
        });

        return promise;
    }

    , configurator = function (configObj) {
        config = configObj;

        return fetch;
    };

export default configurator;
