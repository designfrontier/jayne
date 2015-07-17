(function () {
    jayne({
        request: [
            function (data, orig, next) {
                console.log(data, 'request');
                next(data);
            }
        ]
        , response: [
            function (data, orig, next) {
                console.log(data, 'response');
                next(data);
            }
        ]
    });

    window.getit = function () {
        fetch('/api.json').then(function (res){
            res.json().then(function (data) {
                console.log(data, 'fetch data');
            });
        });
    };
})();
