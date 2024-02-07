const crypto = require('crypto');
const EncryptionService = require('./EncryptionService');

class MD5EncryptionServiceImpl extends EncryptionService {
  encrypt(data) {
    return crypto.createHash('md5').update(data).digest('hex');
  }
}

module.exports = MD5EncryptionServiceImpl;
