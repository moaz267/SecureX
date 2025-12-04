import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";

interface EnhancedXorVisualizationProps {
  plaintextByte: number;
  keystreamByte: number;
  label?: string;
  speed?: number;
  showExplanation?: boolean;
}

const EnhancedXorVisualization = ({
  plaintextByte,
  keystreamByte,
  label = "XOR Operation",
  speed = 100,
  showExplanation = true,
}: EnhancedXorVisualizationProps) => {
  const [currentBitIndex, setCurrentBitIndex] = useState(-1);
  const [isComplete, setIsComplete] = useState(false);

  const plaintextBits = plaintextByte.toString(2).padStart(8, "0").split("");
  const keystreamBits = keystreamByte.toString(2).padStart(8, "0").split("");
  const resultByte = plaintextByte ^ keystreamByte;
  const resultBits = resultByte.toString(2).padStart(8, "0").split("");

  useEffect(() => {
    setCurrentBitIndex(-1);
    setIsComplete(false);

    const animateBits = async () => {
      for (let i = 0; i < 8; i++) {
        await new Promise((resolve) => setTimeout(resolve, speed));
        setCurrentBitIndex(i);
      }
      await new Promise((resolve) => setTimeout(resolve, speed * 2));
      setIsComplete(true);
    };

    animateBits();
  }, [plaintextByte, keystreamByte, speed]);

  const getBitStyle = (index: number, isResult: boolean = false) => {
    if (index > currentBitIndex) {
      return "opacity-30";
    }
    if (index === currentBitIndex && !isComplete) {
      return isResult ? "animate-bit-flip scale-125" : "animate-xor-highlight";
    }
    return "";
  };

  return (
    <Card className="p-6 glass-card border-crypto-operation/30 overflow-hidden">
      <div className="text-center mb-6">
        <h4 className="text-lg font-bold text-crypto-operation mb-2">{label}</h4>
        {showExplanation && (
          <p className="text-xs text-muted-foreground">
            Each bit is XORed: 0⊕0=0, 0⊕1=1, 1⊕0=1, 1⊕1=0
          </p>
        )}
      </div>

      <div className="space-y-4 font-mono">
        {/* Plaintext Row */}
        <div className="flex items-center gap-3">
          <div className="w-24 text-right text-xs text-crypto-plaintext font-medium">
            Plaintext
          </div>
          <div className="flex gap-1">
            {plaintextBits.map((bit, i) => (
              <div
                key={`p-${i}`}
                className={`w-8 h-10 flex items-center justify-center rounded-lg border-2 transition-all duration-200 ${
                  getBitStyle(i)
                } ${
                  bit === "1"
                    ? "bg-crypto-plaintext/20 border-crypto-plaintext text-crypto-plaintext"
                    : "bg-secondary border-border text-muted-foreground"
                }`}
              >
                <span className="text-lg font-bold">{bit}</span>
              </div>
            ))}
          </div>
          <div className="w-16 text-left text-sm text-crypto-plaintext font-bold">
            {plaintextByte}
          </div>
        </div>

        {/* XOR Symbol Row */}
        <div className="flex items-center gap-3">
          <div className="w-24 text-right text-2xl text-crypto-operation font-bold">⊕</div>
          <div className="flex gap-1">
            {Array(8)
              .fill(null)
              .map((_, i) => (
                <div
                  key={`xor-${i}`}
                  className={`w-8 h-4 flex items-center justify-center transition-all duration-200 ${
                    i <= currentBitIndex && !isComplete ? "text-crypto-operation" : "text-muted-foreground/30"
                  }`}
                >
                  <span className="text-xs">⊕</span>
                </div>
              ))}
          </div>
        </div>

        {/* Keystream Row */}
        <div className="flex items-center gap-3">
          <div className="w-24 text-right text-xs text-crypto-keystream font-medium">
            Keystream
          </div>
          <div className="flex gap-1">
            {keystreamBits.map((bit, i) => (
              <div
                key={`k-${i}`}
                className={`w-8 h-10 flex items-center justify-center rounded-lg border-2 transition-all duration-200 ${
                  getBitStyle(i)
                } ${
                  bit === "1"
                    ? "bg-crypto-keystream/20 border-crypto-keystream text-crypto-keystream"
                    : "bg-secondary border-border text-muted-foreground"
                }`}
              >
                <span className="text-lg font-bold">{bit}</span>
              </div>
            ))}
          </div>
          <div className="w-16 text-left text-sm text-crypto-keystream font-bold">
            {keystreamByte}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-2 border-dashed border-crypto-operation/30 my-2" />

        {/* Result Row */}
        <div className="flex items-center gap-3">
          <div className="w-24 text-right text-xs text-crypto-ciphertext font-medium">
            Result
          </div>
          <div className="flex gap-1">
            {resultBits.map((bit, i) => (
              <div
                key={`r-${i}`}
                className={`w-8 h-10 flex items-center justify-center rounded-lg border-2 transition-all duration-200 ${
                  getBitStyle(i, true)
                } ${
                  i <= currentBitIndex
                    ? bit === "1"
                      ? "bg-crypto-ciphertext/20 border-crypto-ciphertext text-crypto-ciphertext"
                      : "bg-secondary border-crypto-ciphertext/50 text-crypto-ciphertext"
                    : "bg-secondary/50 border-border/50 text-muted-foreground/30"
                }`}
              >
                <span className="text-lg font-bold">
                  {i <= currentBitIndex ? bit : "?"}
                </span>
              </div>
            ))}
          </div>
          <div className="w-16 text-left text-sm text-crypto-ciphertext font-bold">
            {isComplete ? resultByte : "..."}
          </div>
        </div>
      </div>

      {/* Hex representation */}
      <div className="mt-6 pt-4 border-t border-border/50">
        <div className="flex justify-center gap-8 text-sm">
          <div className="text-center">
            <div className="text-crypto-plaintext font-mono font-bold">
              0x{plaintextByte.toString(16).toUpperCase().padStart(2, "0")}
            </div>
            <div className="text-xs text-muted-foreground">Plaintext</div>
          </div>
          <div className="text-crypto-operation text-xl">⊕</div>
          <div className="text-center">
            <div className="text-crypto-keystream font-mono font-bold">
              0x{keystreamByte.toString(16).toUpperCase().padStart(2, "0")}
            </div>
            <div className="text-xs text-muted-foreground">Keystream</div>
          </div>
          <div className="text-crypto-operation text-xl">=</div>
          <div className="text-center">
            <div className={`font-mono font-bold transition-all ${isComplete ? "text-crypto-ciphertext" : "text-muted-foreground"}`}>
              {isComplete ? `0x${resultByte.toString(16).toUpperCase().padStart(2, "0")}` : "0x??"}
            </div>
            <div className="text-xs text-muted-foreground">Ciphertext</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default EnhancedXorVisualization;
