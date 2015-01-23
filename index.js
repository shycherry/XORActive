var xor = require('bitwise-xor');
var mtwister = require('mersenne-twister');


function _nop (){};

function reset(){
  this.twister = new mtwister();
  this.mask = null;
  this.updateMutator();
};

function XORActive(){
  reset.call(this);
}

XORActive.prototype.isStateOK = function() {
  return (this.mask && this.mutator && this.mask.length > this.mutator.length);
};

XORActive.prototype.setMask = function(iMask) {
  this.mask = new Buffer(iMask);
};

XORActive.prototype.setMutator = function(iMutator){
  this.mutator = new Buffer(4);
  this.mutator.set(iMutator);
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
  this.mutator = this.mutator || new Buffer(4);
  this.mutator.set(0,this.twister.random_int());
};

module.exports = XORActive;
