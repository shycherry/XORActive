var assert = require('assert');
var XORActive = require('../index.js');

var testMask = "0123456789";
var testMutator = "MUTA";
var connexA = new XORActive();
var connexB = new XORActive();

describe('test creation', function(){

  it('has null mask', function(){
    assert.equal(connexA.mask, null);
  });

  it('cant encrypt with null mask', function(){
    connexA.encrypt('secret message', function(err, result){
      assert.equal(err, "internal state is not OK");
      assert.equal(result, null);
    });
  });

  it('can encrypt with a mask', function(){
    connexA.setMask(testMask);
    connexA.setMutator(testMutator);
    connexA.encrypt('secret', function(err, result){
      assert.equal(err, null);
      assert.equal(result, new Buffer([2,1]));
    });
  });


})
