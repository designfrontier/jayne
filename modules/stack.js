let execute = (functions, data) => {
   return functions.reduce(function (prev, curr) {
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

        }, new Promise(function(res, rej){res({request: originalRequest, original: originalRequest})}));
};

export default {execute}
