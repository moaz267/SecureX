import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { soundEffects } from "@/utils/soundEffects";

interface XorVisualizationProps {
  plaintextByte: number;
  keystreamByte: number;
  label?: string;
  onComplete?: () => void;
  speed?: number;
}

const XorVisualization = ({
  plaintextByte,
  keystreamByte,
  label = "XOR Operation",
  onComplete,
  speed = 100,
}: XorVisualizationProps) => {
  const [currentBit, setCurrentBit] = useState(-1);
  const [completed, setCompleted] = useState(false);

  const plaintextBits = Array.from({ length: 8 }, (_, i) => (plaintextByte >> (7 - i)) & 1);
  const keystreamBits = Array.from({ length: 8 }, (_, i) => (keystreamByte >> (7 - i)) & 1);
  const resultBits = Array.from({ length: 8 }, (_, i) => ((plaintextByte ^ keystreamByte) >> (7 - i)) & 1);

  useEffect(() => {
    setCurrentBit(-1);
    setCompleted(false);

    const timer = setTimeout(() => {
      let bit = 0;
      const interval = setInterval(() => {
        if (bit < 8) {
          setCurrentBit(bit);
          // Play bit flip sound for the result bit
          const resultBit = (plaintextByte ^ keystreamByte) >> (7 - bit) & 1;
          soundEffects.playBitFlip(resultBit);
          bit++;
        } else {
          clearInterval(interval);
          setCompleted(true);
          if (onComplete) {
            setTimeout(onComplete, 300);
          }
        }
      }, speed);

      return () => clearInterval(interval);
    }, 100);

    return () => clearTimeout(timer);
  }, [plaintextByte, keystreamByte, speed, onComplete]);

  return (
    <Card className="p-6 glass-card border-crypto-operation/30 bg-gradient-to-br from-crypto-operation/5 to-crypto-operation/10">
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-sm font-medium text-crypto-operation mb-2">{label}</div>
          <div className="text-xs text-muted-foreground">
            Each bit is XORed: 0⊕0=0, 0⊕1=1, 1⊕0=1, 1⊕1=0
          </div>
        </div>

        {/* Plaintext Bits */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="font-medium text-crypto-plaintext">Plaintext byte:</span>
            <span className="font-mono">{plaintextByte.toString().padStart(3, "0")}</span>
            <span className="text-xs opacity-50">(0x{plaintextByte.toString(16).toUpperCase().padStart(2, "0")})</span>
          </div>
          <div className="flex gap-1 justify-center">
            {plaintextBits.map((bit, i) => (
              <div
                key={`p-${i}`}
                className={`
                  w-10 h-10 flex items-center justify-center rounded-lg font-mono font-bold text-lg
                  border-2 transition-all duration-300
                  ${currentBit === i ? "scale-110 crypto-glow" : ""}
                  ${currentBit > i || completed ? "border-crypto-plaintext bg-crypto-plaintext/20 text-crypto-plaintext" : "border-border bg-muted/20 text-muted-foreground"}
                  ${currentBit === i ? "animate-pulse-glow" : ""}
                `}
                style={{
                  animationDelay: `${i * 50}ms`,
                }}
              >
                {bit}
              </div>
            ))}
          </div>
        </div>

        {/* XOR Symbol */}
        <div className="flex justify-center">
          <div
            className={`
              text-3xl font-bold text-crypto-operation transition-all duration-500
              ${currentBit >= 0 ? "scale-125 crypto-glow" : "scale-100"}
            `}
          >
            ⊕
          </div>
        </div>

        {/* Keystream Bits */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="font-medium text-crypto-keystream">Keystream byte:</span>
            <span className="font-mono">{keystreamByte.toString().padStart(3, "0")}</span>
            <span className="text-xs opacity-50">(0x{keystreamByte.toString(16).toUpperCase().padStart(2, "0")})</span>
          </div>
          <div className="flex gap-1 justify-center">
            {keystreamBits.map((bit, i) => (
              <div
                key={`k-${i}`}
                className={`
                  w-10 h-10 flex items-center justify-center rounded-lg font-mono font-bold text-lg
                  border-2 transition-all duration-300
                  ${currentBit === i ? "scale-110 crypto-glow" : ""}
                  ${currentBit > i || completed ? "border-crypto-keystream bg-crypto-keystream/20 text-crypto-keystream" : "border-border bg-muted/20 text-muted-foreground"}
                  ${currentBit === i ? "animate-pulse-glow" : ""}
                `}
                style={{
                  animationDelay: `${i * 50}ms`,
                }}
              >
                {bit}
              </div>
            ))}
          </div>
        </div>

        {/* Equals Symbol */}
        <div className="flex justify-center">
          <div className="text-2xl font-bold text-muted-foreground">=</div>
        </div>

        {/* Result Bits */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="font-medium text-crypto-ciphertext">Result (Ciphertext byte):</span>
            <span className="font-mono">{(plaintextByte ^ keystreamByte).toString().padStart(3, "0")}</span>
            <span className="text-xs opacity-50">(0x{(plaintextByte ^ keystreamByte).toString(16).toUpperCase().padStart(2, "0")})</span>
          </div>
          <div className="flex gap-1 justify-center">
            {resultBits.map((bit, i) => (
              <div
                key={`r-${i}`}
                className={`
                  w-10 h-10 flex items-center justify-center rounded-lg font-mono font-bold text-lg
                  border-2 transition-all duration-500
                  ${currentBit >= i ? "border-crypto-ciphertext bg-crypto-ciphertext/20 text-crypto-ciphertext animate-scale-in" : "border-border/50 bg-muted/10 text-transparent"}
                  ${currentBit === i ? "animate-bit-flip crypto-glow" : ""}
                  ${completed ? "border-crypto-ciphertext/80" : ""}
                `}
                style={{
                  animationDelay: `${i * 50}ms`,
                }}
              >
                {currentBit >= i ? bit : "?"}
              </div>
            ))}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="pt-2">
          <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-crypto-plaintext via-crypto-operation to-crypto-ciphertext transition-all duration-300"
              style={{
                width: `${completed ? 100 : ((currentBit + 1) / 8) * 100}%`,
              }}
            />
          </div>
          <div className="text-center text-xs text-muted-foreground mt-2">
            {completed ? "✓ Complete" : `Processing bit ${currentBit + 1} of 8`}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default XorVisualization;
