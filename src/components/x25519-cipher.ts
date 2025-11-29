// x25519-cipher.ts
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

export function generateKeyPair() {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: keyPair.publicKey,     // Uint8Array
    privateKey: keyPair.secretKey,    // Uint8Array
  };
}

export function deriveSharedSecret(privateKey: Uint8Array, publicKey: Uint8Array) {
  return nacl.box.before(publicKey, privateKey); // Uint8Array (32 bytes)
}

export function encryptMessage(plaintext: string, sharedSecret: Uint8Array) {
  const nonce = nacl.randomBytes(24);
  const messageUint8 = naclUtil.decodeUTF8(plaintext);

  const encrypted = nacl.box.after(messageUint8, nonce, sharedSecret);

  return {
    ciphertext: naclUtil.encodeBase64(encrypted),
    nonce: naclUtil.encodeBase64(nonce),
  };
}

export function decryptMessage(ciphertextBase64: string, nonceBase64: string, sharedSecret: Uint8Array) {
  const ciphertext = naclUtil.decodeBase64(ciphertextBase64);
  const nonce = naclUtil.decodeBase64(nonceBase64);

  const decrypted = nacl.box.open.after(ciphertext, nonce, sharedSecret);

  if (!decrypted) {
    throw new Error("Failed to decrypt message.");
  }

  return naclUtil.encodeUTF8(decrypted);
}
