import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Copy, ArrowRight, Package, Shield, Key, Sparkles } from "lucide-react";

interface FinalEncryptedPackageProps {
  originalText: string;
  encryptedText: string;
  nonce: string;
  onTestDecryption: () => void;
}

const FinalEncryptedPackage = ({
  originalText,
  encryptedText,
  nonce,
  onTestDecryption,
}: FinalEncryptedPackageProps) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="p-8 glass-card border-crypto-ciphertext/40 animate-fade-in overflow-hidden relative">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, hsl(270 100% 70% / 0.5) 0%, transparent 70%)'
          }}
        />
        <div 
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, hsl(165 100% 55% / 0.5) 0%, transparent 70%)'
          }}
        />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-crypto-ciphertext/30 to-crypto-ciphertext/10 border border-crypto-ciphertext/30">
            <Package className="w-7 h-7 text-crypto-ciphertext" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-crypto-ciphertext flex items-center gap-2">
              Final Encrypted Package
              <Sparkles className="w-5 h-5 animate-pulse-glow" />
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your message is now securely encrypted
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Original Text */}
          <div className="group relative p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 transition-all hover:border-primary/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Original Message</span>
            </div>
            <div className="text-lg font-medium break-all text-foreground/90 bg-background/40 p-4 rounded-xl border border-primary/20">
              {originalText}
            </div>
          </div>

          {/* Transformation Arrow */}
          <div className="flex justify-center py-2">
            <div className="flex flex-col items-center gap-2">
              <div className="w-px h-8 bg-gradient-to-b from-primary/50 to-crypto-ciphertext/50" />
              <div className="p-3 rounded-full bg-crypto-operation/20 border border-crypto-operation/30 animate-float">
                <Lock className="w-5 h-5 text-crypto-operation" />
              </div>
              <div className="w-px h-8 bg-gradient-to-b from-crypto-operation/50 to-crypto-ciphertext/50" />
            </div>
          </div>

          {/* Encrypted Output */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-crypto-ciphertext/15 to-crypto-ciphertext/5 border-2 border-crypto-ciphertext/40 crypto-glow-accent">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-crypto-ciphertext" />
                <span className="text-sm font-semibold text-crypto-ciphertext uppercase tracking-wider">Ciphertext (Base64)</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(encryptedText)}
                className="text-crypto-ciphertext hover:bg-crypto-ciphertext/20"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
            <div className="font-mono text-sm break-all text-crypto-ciphertext/90 bg-background/50 p-4 rounded-xl border border-crypto-ciphertext/20 select-all leading-relaxed">
              {encryptedText}
            </div>
          </div>

          {/* Nonce */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-crypto-nonce/15 to-crypto-nonce/5 border-2 border-crypto-nonce/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-crypto-nonce" />
                <span className="text-sm font-semibold text-crypto-nonce uppercase tracking-wider">Nonce (Required)</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(nonce)}
                className="text-crypto-nonce hover:bg-crypto-nonce/20"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
            <div className="font-mono text-sm break-all text-crypto-nonce/90 bg-background/50 p-4 rounded-xl border border-crypto-nonce/20 select-all">
              {nonce}
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-crypto-nonce animate-pulse" />
              The nonce is essential for decryption - never reuse it with the same key
            </p>
          </div>

          {/* Action Button */}
          <Button
            onClick={onTestDecryption}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-crypto-ciphertext to-accent hover:opacity-90 transition-all group"
          >
            <span>Test Decryption</span>
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default FinalEncryptedPackage;
