import fetch from './modules/fetch';
import xhr from './modules/xhr';

window.jayne = function (config) {
    if(typeof window.fetch === 'function'){
        window.fetch = fetch(config);
    }

    window.XMLHttpRequest = xhr(config);
};
