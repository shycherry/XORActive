var assert = require('assert');
var XORActive = require('../index.js');

var testMask20Bytes = new Buffer([48,49,50,51,52,53,54,55,56,57,48,49,50,51,52,53,54,55,56,57]) // <=> "01234567890123456789"
var testMask10Bytes =  new Buffer([48,49,50,51,52,53,54,55,56,57]) // <=> "0123456789"
var testMutator = new Buffer([77,85,84,65]) // <=> "MUTA"
var testPayload = new Buffer('secret');
var testNopSendCb = function(data, cb){cb(null, data);};
var connexA = null;
var connexB = null;

describe('test creation', function(){
  before(function(){
    connexA = new XORActive();
  });

  it('has null mask', function(){
    assert.equal(connexA._mask, null);
  });

  it('has null sendItf', function(){
    assert.equal(connexA._sendItf, null);
  });
});

describe('test bad masks', function(){
  before(function(){
    connexA = new XORActive();
    connexA.setSendCb(testNopSendCb);
  });

   it('cant encrypt with null mask', function(){
    connexA.send(testPayload, function(err, result){
      assert.equal(err, "no mask provided");
      assert.equal(result, null);
    });
  });

  it('cant encrypt with a mask too short', function(){
    connexA.setMask(testMask10Bytes);
    connexA.send(testPayload, function(err, result){
      assert.equal(err, "mask is too short, an upgrade is needed");
      assert.equal(result, null);
    });
  });
});

describe('test bad sendCb', function(){
  before(function(){
    connexA = new XORActive();
    connexA.setMask(testMask20Bytes);
  });

   it('cant encrypt with null sendCb', function(){
    connexA.send(function(err, result){
      assert.equal(err, "no sendCb provided");
      assert.equal(result, null);
    });
  });
});

describe('test with known mask', function(){
  before(function(){
    connexA = new XORActive();
    connexA.setMask(testMask20Bytes);
    connexA.setSendCb(testNopSendCb);
  });

  it('has expected size', function(){
    connexA.send(testPayload, function(err, result){
        assert.equal(err, null);
        assert.equal(result.length, 20);
    });
  });  
});

describe('test basic communication', function(){
  before(function(){
    var sendCbA = function(data, cb){
      connexB.receive(data, cb);
    };
    var sendCbB = function(data, cb){
      connexA.receive(data, cb);
    };

    connexA = new XORActive();
    connexA.setMask(testMask20Bytes);
    connexA.setSendCb(sendCbA);
    
    connexB = new XORActive();
    connexB.setMask(testMask20Bytes);
    connexB.setSendCb(sendCbB);
  });

  it('B receive expected message', function(){
    connexB.setReceiveCb(function(err, data){
      assert.equal(err, null);
      assert.equal(data.toString(), "secretA");
    });

    connexA.send(new Buffer("secretA"), function(err, result){
        assert.equal(err, null);
    });
  });  

  it('A receive expected message', function(){
    connexA.setReceiveCb(function(err, data){
      assert.equal(err, null);
      assert.equal(data.toString(), "secretB");
    });

    connexB.send(new Buffer("secretB"), function(err, result){
        assert.equal(err, null);
    });
  });
});
