import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  totalChars: number;
  currentCharIndex: number;
  currentStageIndex: number;
  totalStages: number;
  stages: string[];
}

const ProgressIndicator = ({
  totalChars,
  currentCharIndex,
  currentStageIndex,
  totalStages,
  stages,
}: ProgressIndicatorProps) => {
  return (
    <div className="p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 space-y-4">
      {/* Stage Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Stage Progress</span>
          <span className="font-mono">{currentStageIndex + 1}/{totalStages}</span>
        </div>
        <div className="flex gap-1">
          {stages.map((stage, idx) => (
            <div
              key={stage}
              className={cn(
                "flex-1 h-2 rounded-full transition-all duration-300",
                idx < currentStageIndex
                  ? "bg-crypto-ciphertext"
                  : idx === currentStageIndex
                  ? "bg-primary animate-pulse"
                  : "bg-muted"
              )}
              title={stage}
            />
          ))}
        </div>
        <div className="text-xs text-center text-primary font-medium">
          {stages[currentStageIndex]?.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
        </div>
      </div>

      {/* Character Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Character Progress</span>
          <span className="font-mono">{currentCharIndex + 1}/{totalChars}</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: totalChars }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-300 cursor-pointer hover:scale-125",
                idx < currentCharIndex
                  ? "bg-crypto-ciphertext"
                  : idx === currentCharIndex
                  ? "bg-primary ring-2 ring-primary/50 ring-offset-2 ring-offset-background animate-pulse"
                  : "bg-muted"
              )}
              title={`Character ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-2 border-t border-border/50">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">←</kbd>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">→</kbd>
          Step
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑</kbd>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↓</kbd>
          Char
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Space</kbd>
          Next
        </span>
      </div>
    </div>
  );
};

export default ProgressIndicator;
