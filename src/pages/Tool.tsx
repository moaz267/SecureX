import { useState } from "react";
import { Copy, Key, Lock, Unlock, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  generateKeyPair,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
  isValidKey,
  type KeyPair,
} from "@/utils/x25519-cipher";

const Tool = () => {
  const [myKeys, setMyKeys] = useState<KeyPair | null>(null);
  const [theirPublicKey, setTheirPublicKey] = useState("");
  const [plaintext, setPlaintext] = useState("");
  const [ciphertext, setCiphertext] = useState("");
  const [nonce, setNonce] = useState("");
  const [sharedSecret, setSharedSecret] = useState<Uint8Array | null>(null);

  const handleGenerateKeys = () => {
    const keys = generateKeyPair();
    setMyKeys(keys);
    setSharedSecret(null);
    toast.success("Keys Generated", { description: "X25519 key pair has been generated successfully." });
  };

  const handleDeriveSecret = () => {
    if (!myKeys) {
      toast.error("Error", { description: "Please generate your keys first." });
      return;
    }
    if (!isValidKey(theirPublicKey)) {
      toast.error("Error", { description: "Invalid public key (must be 32 bytes base64)." });
      return;
    }
    try {
      const secret = deriveSharedSecret(myKeys.privateKey, theirPublicKey);
      setSharedSecret(secret);
      toast.success("Shared Secret Derived", { description: "You can now encrypt and decrypt messages." });
    } catch {
      toast.error("Error", { description: "Failed to derive shared secret." });
    }
  };

  const handleEncrypt = () => {
    if (!sharedSecret) {
      toast.error("Error", { description: "You need to derive the shared secret first." });
      return;
    }
    if (!plaintext.trim()) {
      toast.error("Error", { description: "Enter text to encrypt." });
      return;
    }
    try {
      const encrypted = encryptMessage(plaintext, sharedSecret);
      setCiphertext(encrypted.ciphertext);
      setNonce(encrypted.nonce);
      toast.success("Encrypted", { description: "Message encrypted successfully." });
    } catch {
      toast.error("Error", { description: "Encryption failed." });
    }
  };

  const handleDecrypt = () => {
    if (!sharedSecret) {
      toast.error("Error", { description: "You need to derive the shared secret first." });
      return;
    }
    if (!ciphertext.trim() || !nonce.trim()) {
      toast.error("Error", { description: "Enter ciphertext and nonce." });
      return;
    }
    try {
      const decrypted = decryptMessage(ciphertext, nonce, sharedSecret);
      setPlaintext(decrypted);
      toast.success("Decrypted", { description: "Message decrypted successfully." });
    } catch {
      toast.error("Error", { description: "Decryption failed – check keys and ciphertext." });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied", { description: `${label} copied to clipboard.` });
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <div className="inline-block mb-4 sm:mb-6 px-3 sm:px-4 py-1.5 sm:py-2 glass-card">
            <span className="text-xs sm:text-sm text-primary font-semibold">X25519 Encryption</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-2">
            <span className="gradient-text">Encryption Tool</span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground px-4">
            Use X25519 to securely exchange keys and encrypt your messages.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Key Generation */}
          <div className="glass-card p-4 sm:p-6 space-y-4 sm:space-y-6 animate-slide-in-left">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
                <Key className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">Key Generation</h2>
            </div>

            <Button onClick={handleGenerateKeys} className="w-full gap-2 text-sm sm:text-base" size="lg">
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              Generate New Key Pair
            </Button>

            {myKeys && (
              <div className="space-y-3 sm:space-y-4 animate-fade-in">
                <div>
                  <label className="text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 block">
                    Public Key (share with others)
                  </label>
                  <div className="flex gap-2">
                    <Input value={myKeys.publicKey} readOnly className="font-mono text-xs sm:text-sm" />
                    <Button onClick={() => copyToClipboard(myKeys.publicKey, "Public Key")} variant="outline" size="icon" className="shrink-0">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 block text-destructive">
                    Private Key (keep secret)
                  </label>
                  <div className="flex gap-2">
                    <Input value={myKeys.privateKey} readOnly type="password" className="font-mono text-xs sm:text-sm" />
                    <Button onClick={() => copyToClipboard(myKeys.privateKey, "Private Key")} variant="outline" size="icon" className="shrink-0">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Shared Secret */}
          <div className="glass-card p-4 sm:p-6 space-y-4 sm:space-y-6 animate-slide-in-right">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">Derive Shared Secret</h2>
            </div>

            <div>
              <label className="text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 block">
                Other Party's Public Key
              </label>
              <Textarea
                value={theirPublicKey}
                onChange={(e) => setTheirPublicKey(e.target.value)}
                placeholder="Paste public key here..."
                className="font-mono text-xs sm:text-sm resize-none"
                rows={3}
              />
            </div>

            <Button onClick={handleDeriveSecret} className="w-full gap-2 text-sm sm:text-base" size="lg" disabled={!myKeys}>
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              Derive Shared Secret
            </Button>

            {sharedSecret && (
              <div className="p-3 sm:p-4 bg-primary/10 border border-primary/30 rounded-lg animate-fade-in">
                <p className="text-xs sm:text-sm text-center">
                  ✓ Shared secret derived successfully
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Encryption/Decryption */}
        <div className="mt-6 lg:mt-8 glass-card p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 animate-fade-in">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Encrypt & Decrypt</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Use the shared secret to encrypt and decrypt messages
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Plaintext */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <label className="text-sm sm:text-base font-semibold">Plaintext</label>
              </div>
              <Textarea
                value={plaintext}
                onChange={(e) => setPlaintext(e.target.value)}
                placeholder="Enter your text here..."
                className="text-sm sm:text-base min-h-[150px] sm:min-h-[200px]"
              />
              <Button onClick={handleEncrypt} className="w-full gap-2 text-sm sm:text-base" disabled={!sharedSecret}>
                <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                Encrypt
              </Button>
            </div>

            {/* Ciphertext */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <label className="text-sm sm:text-base font-semibold">Ciphertext</label>
              </div>
              <Textarea
                value={ciphertext}
                onChange={(e) => setCiphertext(e.target.value)}
                placeholder="Ciphertext..."
                className="font-mono text-xs sm:text-sm min-h-[100px] sm:min-h-[120px]"
              />
              <div>
                <label className="text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 block">Nonce</label>
                <Input
                  value={nonce}
                  onChange={(e) => setNonce(e.target.value)}
                  placeholder="Nonce..."
                  className="font-mono text-xs sm:text-sm"
                />
              </div>
              <Button onClick={handleDecrypt} className="w-full gap-2 text-sm sm:text-base" variant="outline" disabled={!sharedSecret}>
                <Unlock className="w-4 h-4 sm:w-5 sm:h-5" />
                Decrypt
              </Button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 lg:mt-8 glass-card p-4 sm:p-6 lg:p-8 animate-fade-in">
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">How to Use:</h3>
          <ol className="space-y-2 sm:space-y-3 text-sm sm:text-base text-muted-foreground list-decimal list-inside">
            <li>Click "Generate New Key Pair" to create your keys.</li>
            <li>Share your public key with the other party and get their public key.</li>
            <li>Paste the other party's public key and click "Derive Shared Secret".</li>
            <li>You can now securely encrypt and decrypt messages.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Tool;
