var xor = require('bitwise-xor');
var mtwister = require('mersenne-twister');


function _nop (){};

function reset(){
  this.twister = new mtwister();
  this.flags = 0;
  this.mask = null;
  this.updateMutator();
};

function XORActive(){
  reset.call(this);
}

XORActive.prototype.isStateOK = function() {
  if(!this.mask)
    return false;
  if(this.mutator){
    if(this.mask.length < this.mutator.length)
      return false;
  }
  return ();
};

XORActive.prototype.setMask = function(iMask) {
  this.mask = Buffer.isBuffer(iMask)? iMask : new Buffer(iMask);
};

XORActive.prototype.setMutator = function(iMutator){
  this.mutator = Buffer.isBuffer(iMutator)? iMutator : new Buffer(iMutator);
};

XORActive.prototype.format = function(iBuffer) {
  var flagsBuf = new Buffer(1);
  flagsBuf.writeInt8(this.flags, 0);

  var mutatorLengthBuf = new Buffer(2);


  return new Buffer.concat([iBuffer]);
};

XORActive.prototype.encrypt = function(iBuffer, iCb) {
  iCb = iCb || _nop;

  if(!this.isStateOK()){
    iCb("internal state is not OK");
    return;
  }

  iBuffer = new Buffer(iBuffer);
  if(!iBuffer || (iBuffer.length + this.mutator.length) > this.mask.length){
    iCb("invalid input buffer");
    return;
  }

  var result = Buffer.concat([this.mutator, iBuffer]);
  iCb(null, result);
};

XORActive.prototype.updateMutator = function() {
  this.prev_mutator = this.mutator;
  this.mutator = this.mutator || new Buffer(4);
  this.mutator.set(0,this.twister.random_int());
};

module.exports = XORActive;
