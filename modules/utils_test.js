import chai from 'chai';
import * as utils from './utils';

let assert = chai.assert;

describe('utils tests', () => {

    it('should be properly defined as an object', () => {
        assert.isObject(utils);
        assert.isFunction(utils.usingNative);
        assert.isFunction(utils.stringToArrayBuffer);
        assert.isFunction(utils.arrayBufferToString);
    });

    describe('utils.usingNative tests', () => {
        it('should return true if there is window.crypto.subtle in the environment and Uint16Array is supported', () => {
            let envTest = (typeof window.crypto !== 'undefined' && typeof window.crypto.subtle !== 'undefined');

            envTest = envTest && (typeof window.Uint16Array !== 'undefined');

            assert.strictEqual(utils.usingNative(), envTest);
        });
    });

    describe('utils.stringToArrayBuffer tests', () => {
        it('should convert a string to an array buffer', () => {
            assert.instanceOf(utils.stringToArrayBuffer('this is a string'), ArrayBuffer);
        });
    });

    describe('utils.arrayBufferToString tests', () => {
        it('should convert an array buffer to a string', () => {
            assert.strictEqual(utils.arrayBufferToString(utils.stringToArrayBuffer('this is a string')), 'this is a string', 'If this is PhantomJS throwing (bug in phantom)... ignore. Otherwise fix it.');
        });
    });
});
