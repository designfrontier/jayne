import chai from 'chai';
import * as stack from './stack';

let assert = chai.assert;

describe('Stack tests', () => {

    it('should be properly defined as an object', () => {
        assert.isObject(stack);
        assert.isFunction(stack.execute);
    });
});
