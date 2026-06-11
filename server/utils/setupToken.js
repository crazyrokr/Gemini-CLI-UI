import crypto from 'crypto';

let currentToken = null;
let isConsumed = false;

function generateSetupToken() {
  currentToken = crypto.randomBytes(32).toString('hex');
  isConsumed = false;
  return currentToken;
}

function validateSetupToken(token) {
  if (isConsumed || !currentToken) {
    return false;
  }
  if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(currentToken))) {
    return true;
  }
  return false;
}

function consumeSetupToken() {
  isConsumed = true;
  currentToken = null;
}

function getSetupToken() {
  return currentToken;
}

export { generateSetupToken, validateSetupToken, consumeSetupToken, getSetupToken };
