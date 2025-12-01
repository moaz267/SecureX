import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import XorVisualization from "@/components/XorVisualization";
import {
  generateKeyPair,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
} from "@/utils/x25519-cipher";
import { soundEffects } from "@/utils/soundEffects";
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
  Zap,
  Volume2,
  VolumeX,
} from "lucide-react";

interface VisualizationStep {
  charIndex: number;
  char: string;
  charCode: number;
  encrypted: string;
  stage: "original" | "numeric" | "xor-operation" | "operation" | "encrypted";
  stageLabel: string;
  charBytes?: number[];
  sharedSecretHex?: string;
  keystreamHex?: string;
  ciphertextBytes?: number[];
  keystreamByte?: number;
  plaintextByte?: number;
}

type Speed = "slow" | "medium" | "fast";

const speedSettings = {
  slow: { step: 2500, xor: 3000, complete: 2500 },
  medium: { step: 1200, xor: 1200, complete: 1200 },
  fast: { step: 600, xor: 600, complete: 450 },
};

const stagesOrder: VisualizationStep["stage"][] = [
  "original",
  "numeric",
  "xor-operation",
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
  const [showXorAnimation, setShowXorAnimation] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.3);

  const [encryptedInput, setEncryptedInput] = useState("");
  const [nonceInput, setNonceInput] = useState("");
  const [decryptedText, setDecryptedText] = useState("");

  const [alicePrivateKey, setAlicePrivateKey] = useState<string>("");
  const [bobPublicKey, setBobPublicKey] = useState<string>("");

  const timeoutRef = useRef<number | null>(null);
  const runIdRef = useRef(0);

  /* ===== Manual-mode related states ===== */
  const [manualMode, setManualMode] = useState(false);
  const [manualPrepared, setManualPrepared] = useState(false);
  const [manualCharIndex, setManualCharIndex] = useState(0);
  const [manualStageIndex, setManualStageIndex] = useState(0);
  const [manualPreviews, setManualPreviews] = useState<VisualizationStep[]>([]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      runIdRef.current++;
    };
  }, []);

  useEffect(() => {
    soundEffects.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    soundEffects.setVolume(soundVolume);
  }, [soundVolume]);

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

  /* ===== Manual preparation ===== */

  const prepareManualEncryption = () => {
    if (!inputText) return;
    const aliceKeys = generateKeyPair();
    const bobKeys = generateKeyPair();
    const sharedSecret = deriveSharedSecret(aliceKeys.privateKey, bobKeys.publicKey);

    setAlicePrivateKey(aliceKeys.privateKey);
    setBobPublicKey(bobKeys.publicKey);

    const { ciphertext: fullCiphertext, nonce } = encryptMessage(inputText, sharedSecret);
    setEncryptionNonce(nonce);
    setFinalEncryptedText(fullCiphertext);

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
        plaintextByte: charBytesArr[0] || 0,
        keystreamByte: keystreamBytes[0] || 0,
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
        plaintextByte: charBytesArr[0] || 0,
        keystreamByte: keystreamBytes[0] || 0,
      });
    }

    setManualPreviews(previews);
    setManualPrepared(true);
    setManualCharIndex(0);
    setManualStageIndex(0);
    setCurrentStep({
      ...previews[0],
      stage: "encrypted",
      stageLabel: "Encrypted Value",
    });
  };

  /* ===== Manual stepping controls ===== */

  const updateCurrentStepFromManual = (charIndex: number, stageIndex: number, base = "encrypt") => {
    if (!manualPreviews.length) return;
    const preview = manualPreviews[charIndex];
    const stage = stagesOrder[stageIndex];
    const stageLabelMap: Record<string, string> = {
      original: "Original Character",
      numeric: "Numeric Mapping (bytes)",
      "xor-operation": "XOR Operation (bit-by-bit)",
      operation: base === "encrypt" ? "Encryption Applied" : "Decryption Applied",
      encrypted: base === "encrypt" ? "Final Encrypted Value" : "Encrypted Value",
    };
    setCurrentStep({
      ...preview,
      stage,
      stageLabel: stageLabelMap[stage] || stage,
    });
    
    // Show XOR animation when entering xor-operation stage
    setShowXorAnimation(stage === "xor-operation");
  };

  const manualStepForward = (base = "encrypt") => {
    if (!manualPrepared || !manualPreviews.length) return;
    let sIdx = manualStageIndex;
    let cIdx = manualCharIndex;
    if (sIdx < stagesOrder.length - 1) {
      sIdx++;
    } else {
      if (cIdx < manualPreviews.length - 1) {
        cIdx++;
        sIdx = 0;
      } else {
        return;
      }
    }
    setManualStageIndex(sIdx);
    setManualCharIndex(cIdx);
    updateCurrentStepFromManual(cIdx, sIdx, base);
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

  /* ===== Auto visualization ===== */

  const visualizeEncryption = async () => {
    if (!inputText || isPlaying) return;
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
    setShowXorAnimation(false);

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
        { stage: "numeric", stageLabel: "Numeric Mapping (bytes)" },
        { stage: "xor-operation", stageLabel: "XOR Operation (bit-by-bit)" },
        { stage: "encrypted", stageLabel: "Final Encrypted Value" },
      ];

      for (const { stage, stageLabel } of stages) {
        if (runIdRef.current !== myRunId) break;
        
        const stepData = {
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
          plaintextByte: charBytesArr[0] || 0,
          keystreamByte: keystreamBytes[0] || 0,
        };
        
        setCurrentStep(stepData);
        setShowXorAnimation(stage === "xor-operation");
        
        // Play sounds for stage transitions
        if (stage === "xor-operation") {
          soundEffects.playXorOperation();
        } else if (stage !== "original") {
          soundEffects.playStageTransition();
        }
        
        const waitTime = stage === "xor-operation" ? speedSettings[speed].xor : speedSettings[speed].step;
        await wait(waitTime);
      }

      if (runIdRef.current !== myRunId) break;

      // Play completion chime
      soundEffects.playCompletionChime();
      
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
          plaintextByte: charBytesArr[0] || 0,
          keystreamByte: keystreamBytes[0] || 0,
        },
      ]);
      setCurrentStep(null);
      setShowXorAnimation(false);
      await wait(speedSettings[speed].complete);
      if (runIdRef.current !== myRunId) break;
    }

    if (runIdRef.current === myRunId) {
      setFinalEncryptedText(fullCiphertext);
      soundEffects.playEncryptionComplete();
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
    setShowXorAnimation(false);

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
          { stage: "xor-operation", stageLabel: "XOR Operation (bit-by-bit)" },
          { stage: "numeric", stageLabel: "Numeric Mapping (bytes)" },
          { stage: "original", stageLabel: "Original Character Recovered" },
        ];

        for (const { stage, stageLabel } of stages) {
          if (runIdRef.current !== myRunId) break;
          
          const stepData = {
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
            plaintextByte: charBytesArr[0] || 0,
            keystreamByte: keystreamBytes[0] || 0,
          };
          
          setCurrentStep(stepData);
          setShowXorAnimation(stage === "xor-operation");
          
          // Play sounds for stage transitions
          if (stage === "xor-operation") {
            soundEffects.playXorOperation();
          } else if (stage !== "encrypted") {
            soundEffects.playStageTransition();
          }
          
          const waitTime = stage === "xor-operation" ? speedSettings[speed].xor : speedSettings[speed].step;
          await wait(waitTime);
        }

        if (runIdRef.current !== myRunId) break;

        // Play completion chime
        soundEffects.playCompletionChime();
        
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
            plaintextByte: charBytesArr[0] || 0,
            keystreamByte: keystreamBytes[0] || 0,
          },
        ]);
        setCurrentStep(null);
        setShowXorAnimation(false);
        await wait(speedSettings[speed].complete);
        if (runIdRef.current !== myRunId) break;
      }

      if (runIdRef.current === myRunId) {
        setDecryptedText(fullDecryptedText);
        soundEffects.playDecryptionComplete();
      }
    } catch (error) {
      console.error("Decryption failed:", error);
      soundEffects.playError();
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
    setShowXorAnimation(false);
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
    setManualPrepared(false);
    setManualPreviews([]);
    setManualCharIndex(0);
    setManualStageIndex(0);
    setManualMode(false);
    setShowXorAnimation(false);
  };

  /* ===== Render UI ===== */

  return (
    <div className="min-h-screen py-12 sm:py-20 bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">XOR Cipher Visualization</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 gradient-text">
            Encryption Virtualization
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Watch encryption happen bit-by-bit with detailed XOR operation visualization
          </p>

          {/* Sound Controls */}
          <Card className="max-w-md mx-auto mt-6 p-4 glass-card border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-primary" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
                <Label htmlFor="sound-toggle" className="text-sm font-medium">
                  Sound Effects
                </Label>
              </div>
              <Switch
                id="sound-toggle"
                checked={soundEnabled}
                onCheckedChange={(checked) => {
                  setSoundEnabled(checked);
                  if (checked) soundEffects.playClick();
                }}
              />
            </div>
            {soundEnabled && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="volume-slider" className="text-xs text-muted-foreground">
                  Volume
                </Label>
                <Slider
                  id="volume-slider"
                  value={[soundVolume]}
                  onValueChange={(values) => setSoundVolume(values[0])}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>
            )}
          </Card>
        </div>

        <Tabs defaultValue="encrypt" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 glass-card">
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
            <Card className="p-6 sm:p-8 glass-card animate-fade-in space-y-4 border-primary/20">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Input Text</label>
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
                    Manual
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
                    onClick={() => {
                      soundEffects.playClick();
                      visualizeEncryption();
                    }}
                    disabled={!inputText || isPlaying}
                    className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {manualMode ? "Prepare Manual" : "Visualize"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      soundEffects.playClick();
                      stopVisualization();
                    }}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                )}

                <Button
                  onClick={() => {
                    soundEffects.playClick();
                    reset();
                  }}
                  variant="outline"
                  disabled={isPlaying}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>

              {/* Manual Controls */}
              {manualMode && manualPrepared && manualPreviews.length > 0 && (
                <Card className="p-4 glass-card bg-primary/5 border-primary/20 animate-slide-in">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div className="flex gap-2 items-center">
                      <Button onClick={() => manualStepBack("encrypt")} title="Step Back" size="sm">
                        <StepBack className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => manualStepForward("encrypt")} title="Step Forward" size="sm">
                        <StepForward className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => manualGotoChar(manualCharIndex - 1, "encrypt")} title="Prev Char" size="sm" disabled={manualCharIndex <= 0}>
                        <Rewind className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => manualGotoChar(manualCharIndex + 1, "encrypt")} title="Next Char" size="sm" disabled={manualCharIndex >= manualPreviews.length - 1}>
                        <FastForward className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Char <strong className="text-primary">{manualCharIndex + 1}</strong> / {manualPreviews.length} • Stage:{" "}
                      <strong className="text-primary">{stagesOrder[manualStageIndex]}</strong>
                    </div>
                  </div>
                </Card>
              )}
            </Card>

            {/* Current Step Visualization */}
            {currentStep && (
              <Card className="p-6 sm:p-8 glass-card border-primary/50 shadow-lg animate-fade-in crypto-glow">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-primary">
                      Character {currentStep.charIndex + 1}: {currentStep.char}
                    </h3>
                    <div className="px-3 py-1 bg-primary/20 rounded-full text-xs font-medium text-primary border border-primary/30">
                      {currentStep.stageLabel}
                    </div>
                  </div>

                  {/* Original Character */}
                  {(currentStep.stage === "original" || currentStep.stage === "numeric" || currentStep.stage === "xor-operation" || currentStep.stage === "encrypted") && (
                    <div className="p-6 bg-crypto-plaintext/10 rounded-xl border-2 border-crypto-plaintext/30 animate-scale-in">
                      <div className="text-xs text-muted-foreground mb-2 font-medium">Original Character</div>
                      <div className="text-5xl font-bold text-center text-crypto-plaintext">{currentStep.char}</div>
                      <div className="text-center text-sm text-muted-foreground mt-2">
                        UTF-16: <span className="font-mono text-crypto-plaintext">{currentStep.charCode}</span>
                      </div>
                    </div>
                  )}

                  {/* Numeric Bytes */}
                  {(currentStep.stage === "numeric" || currentStep.stage === "xor-operation" || currentStep.stage === "encrypted") && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center justify-center">
                        <div className="text-3xl text-primary animate-pulse-glow">↓</div>
                      </div>
                      <div className="p-6 bg-crypto-plaintext/10 rounded-xl border border-crypto-plaintext/20">
                        <div className="text-xs text-muted-foreground mb-3 font-medium">Plaintext Byte (UTF-8)</div>
                        <div className="flex justify-center gap-2">
                          {currentStep.charBytes?.map((byte, idx) => (
                            <div key={idx} className="px-4 py-2 bg-crypto-plaintext/20 rounded-lg border border-crypto-plaintext/30">
                              <div className="text-sm font-mono font-bold text-crypto-plaintext">{byte}</div>
                              <div className="text-xs text-muted-foreground mt-1">0x{byte.toString(16).toUpperCase()}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* XOR Operation Visualization */}
                  {currentStep.stage === "xor-operation" && showXorAnimation && currentStep.plaintextByte !== undefined && currentStep.keystreamByte !== undefined && (
                    <div className="animate-fade-in">
                      <div className="flex items-center justify-center mb-4">
                        <div className="text-3xl text-crypto-operation animate-pulse-glow">↓</div>
                      </div>
                      <XorVisualization
                        plaintextByte={currentStep.plaintextByte}
                        keystreamByte={currentStep.keystreamByte}
                        label="XOR Encryption Operation"
                        speed={speedSettings[speed].xor / 10}
                      />
                    </div>
                  )}

                  {/* Final Encrypted Value */}
                  {currentStep.stage === "encrypted" && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center justify-center">
                        <div className="text-3xl text-crypto-ciphertext animate-pulse-glow">↓</div>
                      </div>
                      <div className="p-6 bg-crypto-ciphertext/10 rounded-xl border-2 border-crypto-ciphertext/30">
                        <div className="text-xs text-muted-foreground mb-3 font-medium">Encrypted Value (Base64)</div>
                        <div className="text-sm font-mono text-center break-all text-crypto-ciphertext font-bold">
                          {currentStep.encrypted}
                        </div>
                        <div className="text-xs text-muted-foreground mt-3 text-center">
                          Result byte: {currentStep.ciphertextBytes?.[0]} (0x{currentStep.ciphertextBytes?.[0]?.toString(16).toUpperCase()})
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Completed Characters */}
            {completedSteps.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-crypto-ciphertext">✓</span> Completed Characters
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {completedSteps.map((step, index) => (
                    <Card key={index} className="p-4 glass-card bg-crypto-ciphertext/5 border-crypto-ciphertext/20 animate-scale-in hover:border-crypto-ciphertext/40 transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Char {step.charIndex + 1}</span>
                          <span className="text-2xl font-bold text-crypto-ciphertext">{step.char}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Byte: <span className="text-primary font-medium font-mono">{step.charBytes?.[0]}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          Encrypted: <span className="font-mono text-crypto-ciphertext">{step.encrypted}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Final Encrypted Result */}
            {finalEncryptedText && (
              <Card className="p-6 sm:p-8 glass-card bg-gradient-to-br from-crypto-ciphertext/10 to-crypto-ciphertext/5 border-crypto-ciphertext/30 animate-fade-in crypto-glow">
                <h3 className="text-lg font-bold mb-4 text-crypto-ciphertext flex items-center gap-2">
                  <Lock className="w-5 h-5" /> Final Encrypted Text
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-background/50 rounded-lg border border-crypto-ciphertext/20">
                    <div className="text-xs text-muted-foreground mb-2">Original Text</div>
                    <div className="text-base font-medium break-all">{inputText}</div>
                  </div>

                  <div className="flex justify-center">
                    <div className="text-3xl text-crypto-ciphertext">↓</div>
                  </div>

                  <div className="p-4 bg-background/50 rounded-lg border border-crypto-ciphertext/30">
                    <div className="text-xs text-muted-foreground mb-2">Encrypted (Base64)</div>
                    <div className="text-sm font-mono break-all text-crypto-ciphertext select-all font-bold">
                      {finalEncryptedText}
                    </div>
                  </div>

                  <div className="p-4 bg-background/50 rounded-lg border border-primary/30">
                    <div className="text-xs text-muted-foreground mb-2">Nonce (Required for Decryption)</div>
                    <div className="text-sm font-mono break-all text-primary select-all">
                      {encryptionNonce}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigator.clipboard.writeText(finalEncryptedText)}
                      variant="outline"
                      className="flex-1 border-crypto-ciphertext/30 hover:bg-crypto-ciphertext/10"
                    >
                      Copy Encrypted
                    </Button>
                    <Button
                      onClick={() => navigator.clipboard.writeText(encryptionNonce)}
                      variant="outline"
                      className="flex-1 border-primary/30 hover:bg-primary/10"
                    >
                      Copy Nonce
                    </Button>
                  </div>

                  <Button
                    onClick={() => {
                      setEncryptedInput(finalEncryptedText);
                      setNonceInput(encryptionNonce);
                      const decryptTab = document.querySelector('[value="decrypt"]') as HTMLElement;
                      if (decryptTab) decryptTab.click();
                    }}
                    className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90"
                  >
                    Test Decryption →
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ===== Decryption Tab ===== */}
          <TabsContent value="decrypt" className="space-y-8">
            <Card className="p-6 sm:p-8 glass-card animate-fade-in space-y-4 border-accent/20">
              <div>
                <label className="block text-sm font-medium mb-2">Encrypted Text (Base64)</label>
                <Textarea
                  value={encryptedInput}
                  onChange={(e) => setEncryptedInput(e.target.value)}
                  placeholder="Paste encrypted text here..."
                  className="w-full min-h-[100px] font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nonce (Base64)</label>
                <Input
                  type="text"
                  value={nonceInput}
                  onChange={(e) => setNonceInput(e.target.value)}
                  placeholder="Paste nonce here..."
                  className="w-full font-mono text-sm"
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
                    Manual
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Speed</label>
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
                    onClick={() => {
                      soundEffects.playClick();
                      visualizeDecryption();
                    }}
                    disabled={!encryptedInput || !nonceInput || isPlaying}
                    className="flex-1 bg-gradient-to-r from-accent to-primary hover:opacity-90"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {manualMode ? "Prepare Manual" : "Visualize Decryption"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      soundEffects.playClick();
                      stopVisualization();
                    }}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                )}
                <Button
                  onClick={() => {
                    soundEffects.playClick();
                    reset();
                  }}
                  variant="outline"
                  disabled={isPlaying}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>

              {manualMode && manualPrepared && manualPreviews.length > 0 && (
                <Card className="p-4 glass-card bg-accent/5 border-accent/20 animate-slide-in">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div className="flex gap-2 items-center">
                      <Button onClick={() => manualStepBack("decrypt")} title="Step Back" size="sm">
                        <StepBack className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => manualStepForward("decrypt")} title="Step Forward" size="sm">
                        <StepForward className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => manualGotoChar(manualCharIndex - 1, "decrypt")} title="Prev Char" size="sm" disabled={manualCharIndex <= 0}>
                        <Rewind className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => manualGotoChar(manualCharIndex + 1, "decrypt")} title="Next Char" size="sm" disabled={manualCharIndex >= manualPreviews.length - 1}>
                        <FastForward className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Char <strong className="text-accent">{manualCharIndex + 1}</strong> / {manualPreviews.length} • Stage:{" "}
                      <strong className="text-accent">{stagesOrder[manualStageIndex]}</strong>
                    </div>
                  </div>
                </Card>
              )}
            </Card>

            {/* Current Step for Decryption - Similar structure but reversed flow */}
            {currentStep && (
              <Card className="p-6 sm:p-8 glass-card border-accent/50 shadow-lg animate-fade-in crypto-glow">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-accent">
                      Character {currentStep.charIndex + 1}: {currentStep.char}
                    </h3>
                    <div className="px-3 py-1 bg-accent/20 rounded-full text-xs font-medium text-accent border border-accent/30">
                      {currentStep.stageLabel}
                    </div>
                  </div>

                  {/* Show stages in reverse for decryption */}
                  {currentStep.stage === "encrypted" && (
                    <div className="p-6 bg-crypto-ciphertext/10 rounded-xl border-2 border-crypto-ciphertext/30 animate-scale-in">
                      <div className="text-xs text-muted-foreground mb-3 font-medium">Encrypted Value</div>
                      <div className="text-sm font-mono text-center break-all text-crypto-ciphertext font-bold">
                        {currentStep.encrypted}
                      </div>
                    </div>
                  )}

                  {currentStep.stage === "xor-operation" && showXorAnimation && currentStep.plaintextByte !== undefined && currentStep.keystreamByte !== undefined && (
                    <div className="animate-fade-in">
                      <XorVisualization
                        plaintextByte={currentStep.plaintextByte}
                        keystreamByte={currentStep.keystreamByte}
                        label="XOR Decryption Operation"
                        speed={speedSettings[speed].xor / 10}
                      />
                    </div>
                  )}

                  {(currentStep.stage === "numeric" || currentStep.stage === "original") && (
                    <div className="p-6 bg-crypto-plaintext/10 rounded-xl border border-crypto-plaintext/20 animate-scale-in">
                      <div className="text-xs text-muted-foreground mb-3 font-medium">Plaintext Byte</div>
                      <div className="flex justify-center gap-2">
                        {currentStep.charBytes?.map((byte, idx) => (
                          <div key={idx} className="px-4 py-2 bg-crypto-plaintext/20 rounded-lg border border-crypto-plaintext/30">
                            <div className="text-sm font-mono font-bold text-crypto-plaintext">{byte}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentStep.stage === "original" && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center justify-center">
                        <div className="text-3xl text-accent animate-pulse-glow">↓</div>
                      </div>
                      <div className="p-6 bg-accent/10 rounded-xl border-2 border-accent/30">
                        <div className="text-xs text-muted-foreground mb-2 font-medium">Original Character Recovered</div>
                        <div className="text-5xl font-bold text-center text-accent">{currentStep.char}</div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {completedSteps.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-accent">✓</span> Completed Characters
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {completedSteps.map((step, index) => (
                    <Card key={index} className="p-4 glass-card bg-accent/5 border-accent/20 animate-scale-in hover:border-accent/40 transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Char {step.charIndex + 1}</span>
                          <span className="text-2xl font-bold text-accent">{step.char}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Byte: <span className="text-primary font-medium font-mono">{step.charBytes?.[0]}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {decryptedText && (
              <Card className="p-6 sm:p-8 glass-card bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30 animate-fade-in crypto-glow">
                <h3 className="text-lg font-bold mb-4 text-accent flex items-center gap-2">
                  <Unlock className="w-5 h-5" /> Final Decrypted Text
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-background/50 rounded-lg border border-accent/20">
                    <div className="text-xs text-muted-foreground mb-2">Encrypted Text</div>
                    <div className="text-sm font-mono break-all text-muted-foreground">
                      {encryptedInput.substring(0, 50)}...
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="text-3xl text-accent">↓</div>
                  </div>

                  <div className="p-4 bg-background/50 rounded-lg border border-accent/30">
                    <div className="text-xs text-muted-foreground mb-2">Decrypted Text</div>
                    <div className="text-base font-medium break-all text-accent select-all font-bold">
                      {decryptedText}
                    </div>
                  </div>

                  <Button
                    onClick={() => navigator.clipboard.writeText(decryptedText)}
                    variant="outline"
                    className="w-full border-accent/30 hover:bg-accent/10"
                  >
                    Copy Decrypted Text
                  </Button>
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
