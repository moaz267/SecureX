import { Card } from "@/components/ui/card";
import { ArrowRight, Plus, Shield } from "lucide-react";

interface NonceCombinationVisualizationProps {
  ciphertextPreview: string;
  nonce: string;
  isComplete?: boolean;
}

const NonceCombinationVisualization = ({
  ciphertextPreview,
  nonce,
  isComplete = false,
}: NonceCombinationVisualizationProps) => {
  return (
    <Card className="p-6 glass-card border-crypto-nonce/30 animate-fade-in">
      <h4 className="text-lg font-bold text-crypto-nonce mb-6 flex items-center gap-2">
        <Shield className="w-5 h-5" /> Ciphertext + Nonce Combination
      </h4>

      <div className="space-y-4">
        {/* Explanation */}
        <p className="text-sm text-muted-foreground text-center">
          The nonce ensures each encryption produces unique ciphertext, even for identical messages.
        </p>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-4">
          {/* Ciphertext */}
          <div className="p-4 rounded-xl border-2 border-crypto-ciphertext bg-crypto-ciphertext/10 flex-1 max-w-xs">
            <div className="text-xs text-muted-foreground mb-2 text-center font-medium">
              Ciphertext (Encrypted Data)
            </div>
            <div className="font-mono text-xs text-crypto-ciphertext break-all text-center">
              {ciphertextPreview.length > 32 ? `${ciphertextPreview.substring(0, 32)}...` : ciphertextPreview}
            </div>
          </div>

          {/* Plus */}
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-crypto-nonce/20 border-2 border-crypto-nonce flex items-center justify-center">
              <Plus className="w-5 h-5 text-crypto-nonce" />
            </div>
          </div>

          {/* Nonce */}
          <div className="p-4 rounded-xl border-2 border-crypto-nonce bg-crypto-nonce/10 flex-1 max-w-xs">
            <div className="text-xs text-muted-foreground mb-2 text-center font-medium">
              Nonce (24 bytes)
            </div>
            <div className="font-mono text-xs text-crypto-nonce break-all text-center">
              {nonce.length > 32 ? `${nonce.substring(0, 32)}...` : nonce}
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowRight className="w-6 h-6 text-primary rotate-90" />
        </div>

        {/* Combined Output */}
        <div
          className={`p-4 rounded-xl border-2 transition-all duration-500 ${
            isComplete
              ? "border-primary bg-primary/10"
              : "border-border bg-secondary/50"
          }`}
        >
          <div className="text-xs text-muted-foreground mb-2 text-center font-medium">
            Final Encrypted Package
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xs text-crypto-nonce mb-1">Nonce</div>
              <div className="font-mono text-xs text-muted-foreground">
                {nonce.substring(0, 8)}...
              </div>
            </div>
            <div>
              <div className="text-xs text-crypto-ciphertext mb-1">Ciphertext</div>
              <div className="font-mono text-xs text-muted-foreground">
                {ciphertextPreview.substring(0, 8)}...
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 text-center">
            <span className="text-xs text-muted-foreground">
              Both parts required for decryption
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default NonceCombinationVisualization;
