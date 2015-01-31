var xor = require('bitwise-xor');
var mtwister = require('mersenne-twister');
var _twister = new mtwister();


function _nop (){};

function _randomFillBuffer(ioBuffer){
  if(!Buffer.isBuffer(ioBuffer)){
    return;
  }
  
  var bufferSize = ioBuffer.length;
  while(bufferSize){
    ioBuffer.writeUInt32BE(_twister.random_int(), _twister.random_int() % bufferSize, true);
    bufferSize--;
  }
}

function XORActive(){
  this._flags = 0;
  this._mask = null;
  this._sendCb = null;
  this._mutator = null;
}

XORActive.prototype.setMask = function(iMask) {
  this._mask = Buffer.isBuffer(iMask)? iMask : new Buffer(iMask);
};

XORActive.prototype.setSendCb = function(iSendCb) {
  this._sendCb = iSendCb;
};

XORActive.prototype._getFormatedPacket = function(iNewMutator,
iPrevMutator, iPayload, iDesiredSize) {
  var buffers = [];
  var totalSize = 0;

  var flagsBuf = new Buffer(1);
  var flagsValue = this._flags || 0;
  flagsBuf.writeInt8(flagsValue, 0);
  buffers.push(flagsBuf);
  totalSize += 1;

  var mutatorSizeBuf = new Buffer(1);
  var mutatorSizeValue = Buffer.isBuffer(iNewMutator) ? iNewMutator.length : 0;
  mutatorSizeBuf.writeUInt8(mutatorSizeValue, 0);
  buffers.push(mutatorSizeBuf);
  totalSize += 1;

  if(mutatorSizeValue){
    buffers.push(iNewMutator);
    totalSize += mutatorSizeValue;
  }

  var prevMutatorSizeBuf = new Buffer(1);
  var prevMutatorSizeValue = Buffer.isBuffer(iPrevMutator) ? iPrevMutator.length : 0;
  prevMutatorSizeBuf.writeUInt8(prevMutatorSizeValue, 0);
  buffers.push(prevMutatorSizeBuf);
  totalSize += 1;

  if(prevMutatorSizeValue){
    buffers.push(iPrevMutator);
    totalSize += prevMutatorSizeValue;
  }

  var payloadSizeBuf = new Buffer(2);
  var payloadSizeValue = Buffer.isBuffer(iPayload) ? iPayload.length : 0;
  payloadSizeBuf.writeUInt16BE(payloadSizeValue, 0);
  buffers.push(payloadSizeBuf);
  totalSize += 2;

  if(payloadSizeValue){
    buffers.push(iPayload);
    totalSize += payloadSizeValue;
  }

  if(iDesiredSize > totalSize){
    var paddingBuf = new Buffer(iDesiredSize - totalSize);
    _randomFillBuffer(paddingBuf);
    buffers.push(paddingBuf);
  }

  return new Buffer.concat(buffers);
};

XORActive.prototype._getUnPackedFormat = function(iBuffer) {
  var results = {};

  var offset = 0;
  var flagsValue = iBuffer.readInt8(offset);
  offset += 1;
  results['flags'] = flagsValue;

  var mutatorSizeValue = iBuffer.readInt8(offset);
  offset += 1;
  if(mutatorSizeValue > (iBuffer.length - offset)) return null;

  // results['mutator_size'] = mutatorSizeValue;
  
  var mutatorBuf = null;
  if(mutatorSizeValue){
    mutatorBuf = new Buffer(mutatorSizeValue);
    iBuffer.copy(mutatorBuf, 0, offset, offset+mutatorSizeValue);
    offset += mutatorSizeValue;
  }
  results['mutator'] = mutatorBuf;

  var prevMutatorSizeValue = iBuffer.readInt8(offset);
  offset += 1;
  if(prevMutatorSizeValue > (iBuffer.length - offset)) return null;
  
  // results['prev_mutator_size'] = prevMutatorSizeValue;

  var prevMutatorBuf = null;
  if(prevMutatorSizeValue){
    prevMutatorBuf = new Buffer(prevMutatorSizeValue);
    iBuffer.copy(prevMutatorBuf, 0, offset, offset+prevMutatorSizeValue);
    offset += mutatorSizeValue;
  }
  results['prev_mutator'] = prevMutatorBuf;

  var payloadSizeValue = iBuffer.readUInt16BE(offset);
  offset += 2;
  if(payloadSizeValue > (iBuffer.length - offset)) return null;

  // results['payload_size'] = payloadSizeValue;

  var payloadBuf = null;
  if(payloadSizeValue){
    payloadBuf = new Buffer(payloadSizeValue);
    iBuffer.copy(payloadBuf, 0, offset, offset+payloadSizeValue);
    offset += mutatorSizeValue;
  }
  results['payload'] = payloadBuf;

  return results;
};

XORActive.prototype.regenMutator = function() {
  var mutatorBuf = (this._mutator)? new Buffer(this._mutator.length) : new Buffer(4);
  
  _randomFillBuffer(mutatorBuf);
  return mutatorBuf;
};

XORActive.prototype.send = function(iPayload, iCb) {
  iCb = iCb || _nop;

  if(!Buffer.isBuffer(this._mask)){
    iCb("no mask provided");
    return;
  }
  
  if(!this._sendCb){
    iCb("no sendCb provided");
    return;
  }

  var newMutator = this.regenMutator();
  var prevMutator = this._mutator;

  var formattedBuf = this._getFormatedPacket(newMutator, prevMutator, iPayload, this._mask.length);
  if(!Buffer.isBuffer(formattedBuf)){
    iCb("unknown error");
    return;
  }

  if(formattedBuf.length > this._mask.length){
    iCb("mask is too short, an upgrade is needed");
    return;
  }

  var xorBuf = xor(formattedBuf, this._mask);

  var sentCallback = function(err, data){
    this._mutateMask(newMutator);
    iCb(err, data);
  }.bind(this);

  this._sendCb(xorBuf, sentCallback);
};

XORActive.prototype._mutateMask = function(iMutator){
  this._mutator = iMutator;
  this._mask.writeInt8(69,0);
}

XORActive.prototype.receive = function(iPacket, iCb) {

  if(!Buffer.isBuffer(this._mask)){
    iCb("no mask provided");
    return;
  }
  
  var packetBuf = Buffer.isBuffer(iPacket)? iPacket : new Buffer(iPacket);
  if(packetBuf.length != this._mask.length){
    iCb("bad packet size");
    return;
  }

  var unXorBuf = xor(packetBuf, this._mask);
  
  var unpacked = this._getUnPackedFormat(unXorBuf);
  if(!unpacked){
    iCb('invalid packet format');
    return;
  }

  if(unpacked['prev_mutator'] && this._mutator){
    if(unpacked['prev_mutator'].inspect() != this._mutator.inspect()){
      console.log(unpacked['prev_mutator'].inspect(),this._mutator.inspect());
      iCb('previous mutator doesnt match');
      return;
    }
  }
  
  this._mutateMask(unpacked['mutator']);

  iCb(null, unpacked['payload']);
};

module.exports = XORActive;
