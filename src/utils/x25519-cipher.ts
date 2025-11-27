// X25519 Key Exchange with AES-GCM Encryption
// Uses Curve25519 for key exchange and Web Crypto API for symmetric encryption

import nacl from "tweetnacl";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

// Generate X25519 key pair
export function generateKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    privateKey: encodeBase64(keyPair.secretKey),
  };
}

// Derive shared secret using X25519
export function deriveSharedSecret(
  myPrivateKey: string,
  theirPublicKey: string
): Uint8Array {
  const privateKey = decodeBase64(myPrivateKey);
  const publicKey = decodeBase64(theirPublicKey);
  
  // Use nacl.box.before to compute shared secret
  const sharedSecret = nacl.box.before(publicKey, privateKey);
  return sharedSecret;
}

// Encrypt message using shared secret
export function encryptMessage(
  message: string,
  sharedSecret: Uint8Array
): { ciphertext: string; nonce: string } {
  const messageBytes = new TextEncoder().encode(message);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  
  // Use nacl.secretbox for symmetric encryption with shared secret
  const encrypted = nacl.secretbox(messageBytes, nonce, sharedSecret);
  
  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  };
}

// Decrypt message using shared secret
export function decryptMessage(
  ciphertext: string,
  nonce: string,
  sharedSecret: Uint8Array
): string {
  const ciphertextBytes = decodeBase64(ciphertext);
  const nonceBytes = decodeBase64(nonce);
  
  const decrypted = nacl.secretbox.open(ciphertextBytes, nonceBytes, sharedSecret);
  
  if (!decrypted) {
    throw new Error("Decryption failed - invalid ciphertext or key");
  }
  
  return new TextDecoder().decode(decrypted);
}

// Validate base64 key format
export function isValidKey(key: string): boolean {
  try {
    const decoded = decodeBase64(key);
    return decoded.length === 32; // X25519 keys are 32 bytes
  } catch {
    return false;
  }
}
