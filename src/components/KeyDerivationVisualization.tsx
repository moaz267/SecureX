import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Key, ArrowRight, Shield } from "lucide-react";

interface KeyDerivationVisualizationProps {
  alicePrivateKey: string;
  bobPublicKey: string;
  sharedSecret?: string;
  speed?: number;
}

const KeyDerivationVisualization = ({
  alicePrivateKey,
  bobPublicKey,
  sharedSecret,
  speed = 300,
}: KeyDerivationVisualizationProps) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    
    for (let i = 1; i <= 3; i++) {
      const timeout = setTimeout(() => setStage(i), i * speed);
      timeouts.push(timeout);
    }

    return () => timeouts.forEach(clearTimeout);
  }, [speed]);

  return (
    <Card className="p-6 sm:p-8 glass-card border-primary/30 animate-fade-in">
      <h3 className="text-lg font-bold mb-6 text-center flex items-center justify-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        X25519 Key Exchange
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Alice's Private Key */}
        <div className={`p-4 rounded-lg border-2 transition-all duration-500 ${
          stage >= 1 ? "bg-crypto-plaintext/10 border-crypto-plaintext/50 scale-105" : "bg-muted/30 border-border"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-crypto-plaintext" />
            <span className="text-xs font-semibold text-crypto-plaintext">Alice's Private Key</span>
          </div>
          <div className="text-xs font-mono break-all text-muted-foreground">
            {alicePrivateKey.substring(0, 24)}...
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowRight className={`w-8 h-8 transition-all duration-500 ${
            stage >= 2 ? "text-primary animate-pulse" : "text-muted-foreground/30"
          }`} />
        </div>

        {/* Bob's Public Key */}
        <div className={`p-4 rounded-lg border-2 transition-all duration-500 ${
          stage >= 1 ? "bg-crypto-keystream/10 border-crypto-keystream/50 scale-105" : "bg-muted/30 border-border"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-crypto-keystream" />
            <span className="text-xs font-semibold text-crypto-keystream">Bob's Public Key</span>
          </div>
          <div className="text-xs font-mono break-all text-muted-foreground">
            {bobPublicKey.substring(0, 24)}...
          </div>
        </div>
      </div>

      {/* Shared Secret */}
      {stage >= 3 && sharedSecret && (
        <div className="mt-6 p-4 bg-primary/10 rounded-lg border-2 border-primary/50 animate-scale-in">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Shared Secret Derived</span>
          </div>
          <div className="text-xs font-mono text-center break-all text-muted-foreground">
            {sharedSecret}...
          </div>
        </div>
      )}
    </Card>
  );
};

export default KeyDerivationVisualization;
