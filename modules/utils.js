let stringToArrayBuffer = function (str) {
        let buffer = new ArrayBuffer(str.length*2); // 2 bytes for each char
        let bufferView = new Uint16Array(buffer);

        [].forEach.call(str, function (item, index){
            bufferView[index] = item.charCodeAt(0);
        });

        return buffer;
    }

    , arrayBufferToString = function (buffer) {
      return String.fromCharCode.apply(null, new Uint16Array(buffer));
    }

    , usingNative = function () {
        return false; //TODO: take out this line... only there for testing
        return (typeof window.crypto !== 'undefined' && typeof window.crypto.subtle !== 'undefined' && typeof window.Uint16Array !== 'undefined');
    };

export default {stringToArrayBuffer, usingNative, arrayBufferToString};
