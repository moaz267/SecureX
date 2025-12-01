import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  generateKeyPair,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
} from "@/utils/x25519-cipher";
import {
  Play,
  RotateCcw,
  Pause,
  Lock,
  Unlock,
  StepForward,
  StepBack,
  FastForward,
  Rewind,
} from "lucide-react";

interface VisualizationStep {
  charIndex: number;
  char: string;
  charCode: number;
  encrypted: string;
  stage: "original" | "numeric" | "operation" | "encrypted";
  stageLabel: string;
  charBytes?: number[];
  sharedSecretHex?: string;
  keystreamHex?: string;
  ciphertextBytes?: number[];
}

type Speed = "slow" | "medium" | "fast";

const speedSettings = {
  slow: { step: 2200, complete: 1600 },
  medium: { step: 1000, complete: 800 },
  fast: { step: 550, complete: 450 },
};

const stagesOrder: VisualizationStep["stage"][] = [
  "original",
  "numeric",
  "operation",
  "encrypted",
];

const Virtualization = () => {
  /* ===== States ===== */
  const [inputText, setInputText] = useState("");
  const [currentStep, setCurrentStep] = useState<VisualizationStep | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<VisualizationStep[]>([]);
  const [speed, setSpeed] = useState<Speed>("medium");
  const [finalEncryptedText, setFinalEncryptedText] = useState<string>("");
  const [encryptionNonce, setEncryptionNonce] = useState<string>("");

  const [encryptedInput, setEncryptedInput] = useState("");
  const [nonceInput, setNonceInput] = useState("");
  const [decryptedText, setDecryptedText] = useState("");

  const [alicePrivateKey, setAlicePrivateKey] = useState<string>("");
  const [bobPublicKey, setBobPublicKey] = useState<string>("");

  const timeoutRef = useRef<number | null>(null);
  const runIdRef = useRef(0);

  /* ===== Manual-mode related states ===== */
  const [manualMode, setManualMode] = useState(false); // auto vs manual
  const [manualPrepared, setManualPrepared] = useState(false);
  const [manualCharIndex, setManualCharIndex] = useState(0);
  const [manualStageIndex, setManualStageIndex] = useState(0);
  // precomputed per-char previews for manual stepping
  const [manualPreviews, setManualPreviews] = useState<VisualizationStep[]>([]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      runIdRef.current++;
    };
  }, []);

  /* ===== Helpers ===== */

  const base64ToBytes = (b64: string): number[] => {
    try {
      const binary = atob(b64);
      const bytes: number[] = [];
      for (let i = 0; i < binary.length; i++) bytes.push(binary.charCodeAt(i));
      return bytes;
    } catch {
      return [];
    }
  };

  const bytesToHex = (bytes: number[]) => {
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const xorBytes = (a: number[], b: number[]) => {
    const len = Math.max(a.length, b.length);
    const out: number[] = new Array(len).fill(0);
    for (let i = 0; i < len; i++) {
      out[i] = (a[i] || 0) ^ (b[i] || 0);
    }
    return out;
  };

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timeoutRef.current = window.setTimeout(() => {
        resolve();
      }, ms);
    });

  /* ===== Manual preparation (precompute previews) ===== */

  const prepareManualEncryption = () => {
    if (!inputText) return;
    // generate keys & shared secret
    const aliceKeys = generateKeyPair();
    const bobKeys = generateKeyPair();
    const sharedSecret = deriveSharedSecret(aliceKeys.privateKey, bobKeys.publicKey);

    setAlicePrivateKey(aliceKeys.privateKey);
    setBobPublicKey(bobKeys.publicKey);

    // full encrypt to get final ciphertext & nonce
    const { ciphertext: fullCiphertext, nonce } = encryptMessage(inputText, sharedSecret);
    setEncryptionNonce(nonce);
    setFinalEncryptedText(fullCiphertext);

    // short preview of shared secret
    const sharedSecretPreview = (() => {
      try {
        const arr = Array.from(sharedSecret as unknown as number[]);
        return bytesToHex(arr).slice(0, 32);
      } catch {
        return "";
      }
    })();

    const encoder = new TextEncoder();
    const previews: VisualizationStep[] = [];

    for (let i = 0; i < inputText.length; i++) {
      const char = inputText[i];
      const charCode = char.charCodeAt(0);
      const charBytesArr = Array.from(encoder.encode(char));
      const { ciphertext } = encryptMessage(char, sharedSecret);
      const cipherBytes = base64ToBytes(ciphertext);
      const keystreamBytes = xorBytes(cipherBytes, charBytesArr);

      previews.push({
        charIndex: i,
        char,
        charCode,
        encrypted: ciphertext.substring(0, 16) + "...",
        stage: "original",
        stageLabel: "Prepared",
        charBytes: charBytesArr,
        sharedSecretHex: sharedSecretPreview,
        keystreamHex: bytesToHex(keystreamBytes).slice(0, 32),
        ciphertextBytes: cipherBytes,
      });
    }

    setManualPreviews(previews);
    setManualPrepared(true);
    setManualCharIndex(0);
    setManualStageIndex(0);
    setCurrentStep({
      ...previews[0],
      stage: stagesOrder[0],
      stageLabel: "Original Character",
    });
  };

  const prepareManualDecryption = () => {
    if (!encryptedInput || !nonceInput) return;

    // determine shared secret: use stored keys if present
    let sharedSecret;
    if (alicePrivateKey && bobPublicKey) {
      sharedSecret = deriveSharedSecret(alicePrivateKey, bobPublicKey);
    } else {
      const a = generateKeyPair();
      const b = generateKeyPair();
      sharedSecret = deriveSharedSecret(a.privateKey, b.publicKey);
      setAlicePrivateKey(a.privateKey);
      setBobPublicKey(b.publicKey);
    }

    // decrypt full message to get plaintext
    const fullDecryptedText = decryptMessage(encryptedInput, nonceInput, sharedSecret);

    const sharedSecretPreview = (() => {
      try {
        const arr = Array.from(sharedSecret as unknown as number[]);
        return bytesToHex(arr).slice(0, 32);
      } catch {
        return "";
      }
    })();

    const encoder = new TextEncoder();
    const previews: VisualizationStep[] = [];

    for (let i = 0; i < fullDecryptedText.length; i++) {
      const char = fullDecryptedText[i];
      const charCode = char.charCodeAt(0);
      const charBytesArr = Array.from(encoder.encode(char));
      const { ciphertext } = encryptMessage(char, sharedSecret);
      const cipherBytes = base64ToBytes(ciphertext);
      const keystreamBytes = xorBytes(cipherBytes, charBytesArr);

      previews.push({
        charIndex: i,
        char,
        charCode,
        encrypted: ciphertext.substring(0, 16) + "...",
        stage: "encrypted",
        stageLabel: "Prepared",
        charBytes: charBytesArr,
        sharedSecretHex: sharedSecretPreview,
        keystreamHex: bytesToHex(keystreamBytes).slice(0, 32),
        ciphertextBytes: cipherBytes,
      });
    }

    setManualPreviews(previews);
    setManualPrepared(true);
    setManualCharIndex(0);
    setManualStageIndex(0);
    // initial current step show encrypted stage for decryption flow
    setCurrentStep({
      ...previews[0],
      stage: "encrypted",
      stageLabel: "Encrypted Value",
    });
  };

  /* ===== Manual stepping controls ===== */

  const updateCurrentStepFromManual = (charIndex: number, stageIndex: number, base = "encrypt") => {
    // base param to choose initial stage ordering for encrypt vs decrypt
    if (!manualPreviews.length) return;
    const preview = manualPreviews[charIndex];
    const stage = stagesOrder[stageIndex];
    const stageLabelMap: Record<string, string> = {
      original: "Original Character",
      numeric: "Numeric Mapping (bytes shown)",
      operation: base === "encrypt" ? "Encryption Operation Applied" : "Decryption Operation Applied",
      encrypted: base === "encrypt" ? "Final Encrypted Value" : "Encrypted Value",
    };
    setCurrentStep({
      ...preview,
      stage,
      stageLabel: stageLabelMap[stage],
    });
  };

  const manualStepForward = (base = "encrypt") => {
    if (!manualPrepared || !manualPreviews.length) return;
    let sIdx = manualStageIndex;
    let cIdx = manualCharIndex;
    if (sIdx < stagesOrder.length - 1) {
      sIdx++;
    } else {
      // move to next char if available
      if (cIdx < manualPreviews.length - 1) {
        cIdx++;
        sIdx = 0;
      } else {
        // reached end
        return;
      }
    }
    setManualStageIndex(sIdx);
    setManualCharIndex(cIdx);
    updateCurrentStepFromManual(cIdx, sIdx, base);
    // when we reach final encrypted stage for a char, mark it as completed in completedSteps
    if (stagesOrder[sIdx] === "encrypted") {
      setCompletedSteps((prev) => {
        const already = prev.find((p) => p.charIndex === manualPreviews[cIdx].charIndex);
        if (already) return prev;
        return [
          ...prev,
          {
            ...manualPreviews[cIdx],
            stage: "encrypted",
            stageLabel: "Completed",
          },
        ];
      });
    }
  };

  const manualStepBack = (base = "encrypt") => {
    if (!manualPrepared || !manualPreviews.length) return;
    let sIdx = manualStageIndex;
    let cIdx = manualCharIndex;
    if (sIdx > 0) {
      sIdx--;
    } else {
      // go to prev char if available, and set to last stage
      if (cIdx > 0) {
        cIdx--;
        sIdx = stagesOrder.length - 1;
      } else {
        return;
      }
    }
    setManualStageIndex(sIdx);
    setManualCharIndex(cIdx);
    updateCurrentStepFromManual(cIdx, sIdx, base);
  };

  const manualGotoChar = (newIndex: number, base = "encrypt") => {
    if (!manualPrepared || !manualPreviews.length) return;
    if (newIndex < 0 || newIndex >= manualPreviews.length) return;
    setManualCharIndex(newIndex);
    setManualStageIndex(0);
    updateCurrentStepFromManual(newIndex, 0, base);
  };

  /* ===== Auto visualization (existing behavior) ===== */

  const visualizeEncryption = async () => {
    if (!inputText || isPlaying) return;
    // block if manualMode active
    if (manualMode) {
      prepareManualEncryption();
      return;
    }

    runIdRef.current++;
    const myRunId = runIdRef.current;

    setIsPlaying(true);
    setCurrentStep(null);
    setCompletedSteps([]);
    setFinalEncryptedText("");

    // Generate keys & shared secret
    const aliceKeys = generateKeyPair();
    const bobKeys = generateKeyPair();
    const sharedSecret = deriveSharedSecret(aliceKeys.privateKey, bobKeys.publicKey);

    setAlicePrivateKey(aliceKeys.privateKey);
    setBobPublicKey(bobKeys.publicKey);

    const { ciphertext: fullCiphertext, nonce } = encryptMessage(inputText, sharedSecret);
    setEncryptionNonce(nonce);

    const sharedSecretPreview = (() => {
      try {
        const arr = Array.from(sharedSecret as unknown as number[]);
        return bytesToHex(arr).slice(0, 32);
      } catch {
        return "";
      }
    })();

    for (let i = 0; i < inputText.length; i++) {
      if (runIdRef.current !== myRunId) break;
      const char = inputText[i];
      const charCode = char.charCodeAt(0);
      const encoder = new TextEncoder();
      const charBytesArr = Array.from(encoder.encode(char));
      const { ciphertext } = encryptMessage(char, sharedSecret);
      const cipherBytes = base64ToBytes(ciphertext);
      const keystreamBytes = xorBytes(cipherBytes, charBytesArr);
      const encryptedPreview = ciphertext.substring(0, 16) + "...";

      const stages = [
        { stage: "original", stageLabel: "Original Character" },
        { stage: "numeric", stageLabel: "Numeric Mapping (bytes shown)" },
        { stage: "operation", stageLabel: "Encryption Operation Applied (keystream xor)" },
        { stage: "encrypted", stageLabel: "Final Encrypted Value" },
      ];

      for (const { stage, stageLabel } of stages) {
        if (runIdRef.current !== myRunId) break;
        setCurrentStep({
          charIndex: i,
          char,
          charCode,
          encrypted: encryptedPreview,
          stage: stage as VisualizationStep["stage"],
          stageLabel,
          charBytes: charBytesArr,
          sharedSecretHex: sharedSecretPreview,
          keystreamHex: bytesToHex(keystreamBytes).slice(0, 32),
          ciphertextBytes: cipherBytes,
        });
        await wait(speedSettings[speed].step);
      }

      if (runIdRef.current !== myRunId) break;

      setCompletedSteps((prev) => [
        ...prev,
        {
          charIndex: i,
          char,
          charCode,
          encrypted: encryptedPreview,
          stage: "encrypted",
          stageLabel: "Completed",
          charBytes: charBytesArr,
          sharedSecretHex: sharedSecretPreview,
          keystreamHex: bytesToHex(keystreamBytes).slice(0, 32),
          ciphertextBytes: cipherBytes,
        },
      ]);
      setCurrentStep(null);
      await wait(speedSettings[speed].complete);
      if (runIdRef.current !== myRunId) break;
    }

    if (runIdRef.current === myRunId) {
      setFinalEncryptedText(fullCiphertext);
    }
    setIsPlaying(false);
  };

  const visualizeDecryption = async () => {
    if (!encryptedInput || !nonceInput || isPlaying) return;
    if (manualMode) {
      prepareManualDecryption();
      return;
    }

    runIdRef.current++;
    const myRunId = runIdRef.current;

    setIsPlaying(true);
    setCurrentStep(null);
    setCompletedSteps([]);
    setDecryptedText("");

    try {
      let sharedSecret: Uint8Array;

      if (alicePrivateKey && bobPublicKey) {
        sharedSecret = deriveSharedSecret(alicePrivateKey, bobPublicKey);
      } else {
        const aliceKeys = generateKeyPair();
        const bobKeys = generateKeyPair();
        sharedSecret = deriveSharedSecret(aliceKeys.privateKey, bobKeys.publicKey);
      }

      const fullDecryptedText = decryptMessage(encryptedInput, nonceInput, sharedSecret);

      const sharedSecretPreview = (() => {
        try {
          const arr = Array.from(sharedSecret as unknown as number[]);
          return bytesToHex(arr).slice(0, 32);
        } catch {
          return "";
        }
      })();

      for (let i = 0; i < fullDecryptedText.length; i++) {
        if (runIdRef.current !== myRunId) break;
        const char = fullDecryptedText[i];
        const charCode = char.charCodeAt(0);
        const { ciphertext } = encryptMessage(char, sharedSecret);
        const cipherBytes = base64ToBytes(ciphertext);
        const charBytesArr = Array.from(new TextEncoder().encode(char));
        const keystreamBytes = xorBytes(cipherBytes, charBytesArr);
        const encryptedPreview = ciphertext.substring(0, 16) + "...";

        const stages = [
          { stage: "encrypted", stageLabel: "Encrypted Value" },
          { stage: "operation", stageLabel: "Decryption Operation Applied" },
          { stage: "numeric", stageLabel: "Numeric Mapping (bytes shown)" },
          { stage: "original", stageLabel: "Original Character Recovered" },
        ];

        for (const { stage, stageLabel } of stages) {
          if (runIdRef.current !== myRunId) break;
          setCurrentStep({
            charIndex: i,
            char,
            charCode,
            encrypted: encryptedPreview,
            stage: stage as VisualizationStep["stage"],
            stageLabel,
            charBytes: charBytesArr,
            sharedSecretHex: sharedSecretPreview,
            keystreamHex: bytesToHex(keystreamBytes).slice(0, 32),
            ciphertextBytes: cipherBytes,
          });
          await wait(speedSettings[speed].step);
        }

        if (runIdRef.current !== myRunId) break;

        setCompletedSteps((prev) => [
          ...prev,
          {
            charIndex: i,
            char,
            charCode,
            encrypted: encryptedPreview,
            stage: "original",
            stageLabel: "Completed",
            charBytes: charBytesArr,
            sharedSecretHex: sharedSecretPreview,
            keystreamHex: bytesToHex(keystreamBytes).slice(0, 32),
            ciphertextBytes: cipherBytes,
          },
        ]);
        setCurrentStep(null);
        await wait(speedSettings[speed].complete);
        if (runIdRef.current !== myRunId) break;
      }

      if (runIdRef.current === myRunId) {
        setDecryptedText(fullDecryptedText);
      }
    } catch (error) {
      console.error("Decryption failed:", error);
      alert("فشل فك التشفير. تحقق من النص المشفر والـ nonce.");
    } finally {
      setIsPlaying(false);
    }
  };

  /* ===== Stop & Reset ===== */

  const stopVisualization = () => {
    runIdRef.current++;
    setIsPlaying(false);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    setCurrentStep(null);
  };

  const reset = () => {
    stopVisualization();
    setInputText("");
    setCurrentStep(null);
    setCompletedSteps([]);
    setFinalEncryptedText("");
    setEncryptionNonce("");
    setEncryptedInput("");
    setNonceInput("");
    setDecryptedText("");
    setAlicePrivateKey("");
    setBobPublicKey("");
    // manual reset
    setManualPrepared(false);
    setManualPreviews([]);
    setManualCharIndex(0);
    setManualStageIndex(0);
    setManualMode(false);
  };

  /* ===== Render UI ===== */

  return (
    <div className="min-h-screen py-12 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 gradient-text">
            Encryption Virtualization (Auto + Manual Steps)
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Toggle between Auto visualization and Manual step-by-step mode. In Manual mode you can
            advance stages and characters with Next / Prev.
          </p>
        </div>

        <Tabs defaultValue="encrypt" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="encrypt" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Encryption
            </TabsTrigger>
            <TabsTrigger value="decrypt" className="flex items-center gap-2">
              <Unlock className="w-4 h-4" />
              Decryption
            </TabsTrigger>
          </TabsList>

          {/* ===== Encryption Tab ===== */}
          <TabsContent value="encrypt" className="space-y-8">
            <Card className="p-6 sm:p-8 glass-card animate-fade-in space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Input Text</label>
                <Input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter text to visualize encryption..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mode</label>
                <div className="flex gap-2">
                  <Button
                    variant={!manualMode ? "default" : "outline"}
                    onClick={() => setManualMode(false)}
                    disabled={isPlaying}
                    className="flex-1"
                  >
                    Auto
                  </Button>
                  <Button
                    variant={manualMode ? "default" : "outline"}
                    onClick={() => setManualMode(true)}
                    disabled={isPlaying}
                    className="flex-1"
                  >
                    Manual (Step-by-step)
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Visualization Speed</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={speed === "slow" ? "default" : "outline"}
                    onClick={() => setSpeed("slow")}
                    disabled={isPlaying || manualMode}
                    className="flex-1"
                  >
                    Slow
                  </Button>
                  <Button
                    type="button"
                    variant={speed === "medium" ? "default" : "outline"}
                    onClick={() => setSpeed("medium")}
                    disabled={isPlaying || manualMode}
                    className="flex-1"
                  >
                    Medium
                  </Button>
                  <Button
                    type="button"
                    variant={speed === "fast" ? "default" : "outline"}
                    onClick={() => setSpeed("fast")}
                    disabled={isPlaying || manualMode}
                    className="flex-1"
                  >
                    Fast
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                {!isPlaying ? (
                  <Button
                    onClick={() => visualizeEncryption()}
                    disabled={!inputText || isPlaying}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {manualMode ? "Prepare Manual" : "Visualize"}
                  </Button>
                ) : (
                  <Button onClick={stopVisualization} variant="destructive" className="flex-1">
                    <Pause className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                )}

                <Button onClick={reset} variant="outline" disabled={isPlaying}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>

              {/* Manual Controls */}
              {manualMode && manualPrepared && manualPreviews.length > 0 && (
                <Card className="p-4 glass-card bg-primary/5 border-primary/10">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div className="flex gap-2 items-center">
                      <Button onClick={() => manualStepBack("encrypt")} title="Step Back">
                        <StepBack className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => manualStepForward("encrypt")} title="Step Forward">
                        <StepForward className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => manualGotoChar(manualCharIndex - 1, "encrypt")} title="Prev Char" disabled={manualCharIndex <= 0}>
                        <Rewind className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => manualGotoChar(manualCharIndex + 1, "encrypt")} title="Next Char" disabled={manualCharIndex >= manualPreviews.length - 1}>
                        <FastForward className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Char <strong>{manualCharIndex + 1}</strong> / {manualPreviews.length} • Stage:{" "}
                      <strong>{stagesOrder[manualStageIndex]}</strong>
                    </div>
                  </div>
                </Card>
              )}

            </Card>

            {/* Current Step / Completed / Final display (same layout as before, reacts to currentStep) */}
            {(currentStep || completedSteps.length > 0) && (
              <div className="space-y-6">
                {currentStep && (
                  <Card className="p-6 sm:p-8 glass-card border-primary/50 shadow-lg animate-fade-in">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-primary">
                          Character {currentStep.charIndex + 1}: Processing
                        </h3>
                        <div className="px-3 py-1 bg-primary/20 rounded-full text-xs font-medium text-primary">
                          {currentStep.stageLabel}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {(currentStep.stage === "original" ||
                          currentStep.stage === "numeric" ||
                          currentStep.stage === "operation" ||
                          currentStep.stage === "encrypted") && (
                          <div className="p-4 bg-secondary/20 rounded-lg animate-fade-in">
                            <div className="text-xs text-muted-foreground mb-2">Original Character</div>
                            <div className="text-4xl font-bold text-center">{currentStep.char}</div>
                          </div>
                        )}

                        {(currentStep.stage === "numeric" ||
                          currentStep.stage === "operation" ||
                          currentStep.stage === "encrypted") && (
                          <div className="flex items-center gap-2 animate-fade-in">
                            <div className="text-2xl text-primary">↓</div>
                            <div className="flex-1 p-4 bg-primary/10 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-2">Numeric Bytes (TextEncoder)</div>
                              <div className="text-sm font-mono text-center">
                                {currentStep.charBytes ? currentStep.charBytes.join(" ") : "—"}
                              </div>
                            </div>
                          </div>
                        )}

                        {(currentStep.stage === "operation" || currentStep.stage === "encrypted") && (
                          <div className="flex flex-col gap-2 animate-fade-in">
                            <div className="flex items-center gap-2">
                              <div className="text-2xl text-primary">↓</div>
                              <div className="flex-1 p-4 bg-accent/10 rounded-lg">
                                <div className="text-xs text-muted-foreground mb-2">Operation (illustration)</div>
                                <div className="text-sm text-center font-medium">
                                  Shared secret (preview): <span className="font-mono">{currentStep.sharedSecretHex ?? "—"}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                  Conceptually: <em>plaintext bytes XOR keystream → ciphertext bytes</em>.
                                </div>
                                <div className="text-sm font-mono text-center mt-2">
                                  Keystream (hex preview): {currentStep.keystreamHex ?? "—"}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {currentStep.stage === "encrypted" && (
                          <div className="flex items-center gap-2 animate-fade-in">
                            <div className="text-2xl text-primary">↓</div>
                            <div className="flex-1 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                              <div className="text-xs text-muted-foreground mb-2">Final Encrypted Value (Base64)</div>
                              <div className="text-sm font-mono text-center break-all text-green-600 dark:text-green-400">
                                {currentStep.encrypted}
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">Ciphertext bytes preview: {currentStep.ciphertextBytes ? currentStep.ciphertextBytes.slice(0, 8).join(" ") : "—"}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {completedSteps.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold">Completed Characters</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {completedSteps.map((step, index) => (
                        <Card key={index} className="p-4 glass-card bg-green-500/5 border-green-500/20 animate-fade-in">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Char {step.charIndex + 1}</span>
                              <span className="text-2xl font-bold">{step.char}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">UTF-16: <span className="text-primary font-medium">{step.charCode}</span></div>
                            <div className="text-xs text-muted-foreground truncate">Encrypted: <span className="font-mono">{step.encrypted}</span></div>
                            <div className="text-xs text-muted-foreground">Keystream (hex preview): {step.keystreamHex ?? "—"}</div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {finalEncryptedText && (
              <Card className="p-6 glass-card bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30 animate-fade-in">
                <h3 className="text-lg font-bold mb-4 text-green-600 dark:text-green-400">🔒 Final Encrypted Text</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-background/50 rounded-lg border border-green-500/20">
                    <div className="text-xs text-muted-foreground mb-2">Original Text</div>
                    <div className="text-base font-medium break-all">{inputText}</div>
                  </div>

                  <div className="flex justify-center">
                    <div className="text-3xl text-green-600 dark:text-green-400">↓</div>
                  </div>

                  <div className="p-4 bg-background/50 rounded-lg border border-green-500/20">
                    <div className="text-xs text-muted-foreground mb-2">Encrypted (Base64)</div>
                    <div className="text-sm font-mono break-all text-green-600 dark:text-green-400 select-all">{finalEncryptedText}</div>
                  </div>

                  <div className="p-4 bg-background/50 rounded-lg border border-green-500/20">
                    <div className="text-xs text-muted-foreground mb-2">Nonce (Required for Decryption)</div>
                    <div className="text-sm font-mono break-all text-primary select-all">{encryptionNonce}</div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => navigator.clipboard.writeText(finalEncryptedText)} variant="outline" className="flex-1 border-green-500/30 hover:bg-green-500/10">Copy Encrypted Text</Button>
                    <Button onClick={() => navigator.clipboard.writeText(encryptionNonce)} variant="outline" className="flex-1 border-primary/30 hover:bg-primary/10">Copy Nonce</Button>
                  </div>

                  <Button onClick={() => {
                    setEncryptedInput(finalEncryptedText);
                    setNonceInput(encryptionNonce);
                    const decryptTab = document.querySelector('[value="decrypt"]') as HTMLElement;
                    if (decryptTab) decryptTab.click();
                  }} className="w-full bg-blue-600 hover:bg-blue-700">
                    Test Decryption with This Text
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ===== Decryption Tab ===== */}
          <TabsContent value="decrypt" className="space-y-8">
            <Card className="p-6 sm:p-8 glass-card animate-fade-in space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Encrypted Text (Base64)</label>
                <Textarea value={encryptedInput} onChange={(e) => setEncryptedInput(e.target.value)} placeholder="Paste encrypted text here..." className="w-full min-h-[100px] font-mono text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nonce (Base64)</label>
                <Input type="text" value={nonceInput} onChange={(e) => setNonceInput(e.target.value)} placeholder="Paste nonce here..." className="w-full font-mono text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mode</label>
                <div className="flex gap-2">
                  <Button variant={!manualMode ? "default" : "outline"} onClick={() => setManualMode(false)} disabled={isPlaying} className="flex-1">Auto</Button>
                  <Button variant={manualMode ? "default" : "outline"} onClick={() => setManualMode(true)} disabled={isPlaying} className="flex-1">Manual (Step-by-step)</Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Visualization Speed</label>
                <div className="flex gap-2">
                  <Button type="button" variant={speed === "slow" ? "default" : "outline"} onClick={() => setSpeed("slow")} disabled={isPlaying || manualMode} className="flex-1">Slow</Button>
                  <Button type="button" variant={speed === "medium" ? "default" : "outline"} onClick={() => setSpeed("medium")} disabled={isPlaying || manualMode} className="flex-1">Medium</Button>
                  <Button type="button" variant={speed === "fast" ? "default" : "outline"} onClick={() => setSpeed("fast")} disabled={isPlaying || manualMode} className="flex-1">Fast</Button>
                </div>
              </div>

              <div className="flex gap-3">
                {!isPlaying ? (
                  <Button onClick={() => visualizeDecryption()} disabled={!encryptedInput || !nonceInput || isPlaying} className="flex-1">
                    <Play className="w-4 h-4 mr-2" /> {manualMode ? "Prepare Manual" : "Visualize Decryption"}
                  </Button>
                ) : (
                  <Button onClick={stopVisualization} variant="destructive" className="flex-1">
                    <Pause className="w-4 h-4 mr-2" /> Stop
                  </Button>
                )}
                <Button onClick={reset} variant="outline" disabled={isPlaying}><RotateCcw className="w-4 h-4 mr-2" /> Reset</Button>
              </div>

              {/* Manual Controls for Decrypt */}
              {manualMode && manualPrepared && manualPreviews.length > 0 && (
                <Card className="p-4 glass-card bg-primary/5 border-primary/10">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div className="flex gap-2 items-center">
                      <Button onClick={() => manualStepBack("decrypt")} title="Step Back"><StepBack className="w-4 h-4" /></Button>
                      <Button onClick={() => manualStepForward("decrypt")} title="Step Forward"><StepForward className="w-4 h-4" /></Button>
                      <Button onClick={() => manualGotoChar(manualCharIndex - 1, "decrypt")} title="Prev Char" disabled={manualCharIndex <= 0}><Rewind className="w-4 h-4" /></Button>
                      <Button onClick={() => manualGotoChar(manualCharIndex + 1, "decrypt")} title="Next Char" disabled={manualCharIndex >= manualPreviews.length - 1}><FastForward className="w-4 h-4" /></Button>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Char <strong>{manualCharIndex + 1}</strong> / {manualPreviews.length} • Stage: <strong>{stagesOrder[manualStageIndex]}</strong>
                    </div>
                  </div>
                </Card>
              )}
            </Card>

            {/* Current / Completed / Final Decrypted */}
            {(currentStep || completedSteps.length > 0) && (
              <div className="space-y-6">
                {currentStep && (
                  <Card className="p-6 sm:p-8 glass-card border-primary/50 shadow-lg animate-fade-in">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-primary">
                          Character {currentStep.charIndex + 1}: Processing
                        </h3>
                        <div className="px-3 py-1 bg-primary/20 rounded-full text-xs font-medium text-primary">
                          {currentStep.stageLabel}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {(currentStep.stage === "encrypted" || currentStep.stage === "operation" || currentStep.stage === "numeric" || currentStep.stage === "original") && (
                          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30 animate-fade-in">
                            <div className="text-xs text-muted-foreground mb-2">Encrypted Value (Base64)</div>
                            <div className="text-sm font-mono text-center break-all text-green-600 dark:text-green-400">{currentStep.encrypted}</div>
                          </div>
                        )}

                        {(currentStep.stage === "operation" || currentStep.stage === "numeric" || currentStep.stage === "original") && (
                          <div className="flex items-center gap-2 animate-fade-in">
                            <div className="text-2xl text-primary">↓</div>
                            <div className="flex-1 p-4 bg-accent/10 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-2">Decryption Operation</div>
                              <div className="text-sm text-center font-medium">X25519 + XSalsa20-Poly1305 (illustration)</div>
                              <div className="text-xs text-muted-foreground mt-2">Shared secret (preview): <span className="font-mono">{currentStep.sharedSecretHex ?? "—"}</span></div>
                              <div className="text-sm font-mono text-center mt-2">Keystream (hex preview): {currentStep.keystreamHex ?? "—"}</div>
                            </div>
                          </div>
                        )}

                        {(currentStep.stage === "numeric" || currentStep.stage === "original") && (
                          <div className="flex items-center gap-2 animate-fade-in">
                            <div className="text-2xl text-primary">↓</div>
                            <div className="flex-1 p-4 bg-primary/10 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-2">Numeric Value (bytes)</div>
                              <div className="text-3xl font-bold text-primary text-center">{currentStep.charBytes ? currentStep.charBytes.join(" ") : "—"}</div>
                            </div>
                          </div>
                        )}

                        {currentStep.stage === "original" && (
                          <div className="flex items-center gap-2 animate-fade-in">
                            <div className="text-2xl text-primary">↓</div>
                            <div className="flex-1 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                              <div className="text-xs text-muted-foreground mb-2">Original Character</div>
                              <div className="text-4xl font-bold text-center text-blue-600 dark:text-blue-400">{currentStep.char}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {completedSteps.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold">Completed Characters</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {completedSteps.map((step, index) => (
                        <Card key={index} className="p-4 glass-card bg-blue-500/5 border-blue-500/20 animate-fade-in">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Char {step.charIndex + 1}</span>
                              <span className="text-2xl font-bold">{step.char}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">UTF-16: <span className="text-primary font-medium">{step.charCode}</span></div>
                            <div className="text-xs text-muted-foreground truncate">Encrypted: <span className="font-mono">{step.encrypted}</span></div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {decryptedText && (
              <Card className="p-6 glass-card bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30 animate-fade-in">
                <h3 className="text-lg font-bold mb-4 text-blue-600 dark:text-blue-400">🔓 Final Decrypted Text</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-background/50 rounded-lg border border-blue-500/20">
                    <div className="text-xs text-muted-foreground mb-2">Encrypted Text (Base64)</div>
                    <div className="text-sm font-mono break-all text-muted-foreground">{encryptedInput.substring(0, 50)}...</div>
                  </div>

                  <div className="flex justify-center">
                    <div className="text-3xl text-blue-600 dark:text-blue-400">↓</div>
                  </div>

                  <div className="p-4 bg-background/50 rounded-lg border border-blue-500/20">
                    <div className="text-xs text-muted-foreground mb-2">Decrypted Text</div>
                    <div className="text-base font-medium break-all text-blue-600 dark:text-blue-400 select-all">{decryptedText}</div>
                  </div>

                  <Button onClick={() => navigator.clipboard.writeText(decryptedText)} variant="outline" className="w-full border-blue-500/30 hover:bg-blue-500/10">Copy Decrypted Text</Button>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Virtualization;
