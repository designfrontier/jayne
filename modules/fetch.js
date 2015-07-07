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
            }

            config.response.forEach(function (currentFn) {
                previousResponse = currentFn.apply({}, [previousResponse, originalResponse]);
            });

            // if(typeof config.store === 'undefined' || config.store) {
            //     localforage.getItem(pathIn).then(function (doc) {
            //         if(doc === null){
            //             fetchPromise = fetchAPI(pathIn, options);

            //             fetchPromise.then(function (response) {
            //                 if(response.status >= 200 && response.status <= 300) {
            //                     response.json().then(function (data) {

            //                         localforage.setItem(pathIn, crypto.encrypt(data));
            //                     }).catch(function (err) {
            //                         console.log('not json');
            //                     });
            //                 }

            //                 resolve(response);
            //             }).catch(function (err) {
            //                 reject(err);
            //             });
            //         } else {
            //             resolve(new window.Response(JSON.stringify(doc)));
            //         }
            //     });
            // } else {
            //     fetchPromise = fetchAPI(pathIn, options);

            //     fetchPromise.then(function (response) {
            //         resolve(response);
            //     }).catch(function (err) {
            //         reject(err);
            //     });
            // }

        });

        return promise;
    }

    , configurator = function (configObj) {
        config = configObj;

        return fetch;
    };

export default configurator;
