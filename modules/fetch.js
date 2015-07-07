let config
    , fetchAPI = window.fetch //the original fetch

    , fetch = function (pathIn, options) {
        let promise = new Promise(function (resolve, reject){
            let fetchPromise
                , originalRequest = {path: pathIn, options: options}
                , previousRequest = originalRequest
                , originalResponse
                , previousResponse;

            config.request.forEach(function (currentFn) {
                previousRequest = currentFn.apply({}, [previousRequest, originalRequest]);
            });



            if(typeof previousRequest.response !== 'undefined') {
                //short circuit and fake the response
                //  need a promise here to allow for the code below to be identical
                //  between a faked request and a network involved request
                fetchPromise = function (res, rej) {
                    setTimeout(function () {
                        res(previousRequest.response);
                    }, 0);
                };
            } else {
                fetchPromise = fetchAPI(pathIn, options);
            }

            fetchPromise.then(function (response) {
                previousResponse = response;

                config.response.forEach(function (currentFn) {
                    previousResponse = currentFn.apply({}, [previousResponse, originalResponse]);
                });

                resolve(previousResponse);
            }).catch(function (err) {
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
