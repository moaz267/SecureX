import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import EnhancedXorVisualization from "@/components/EnhancedXorVisualization"; 
import KeyDerivationVisualization from "@/components/KeyDerivationVisualization";
import NonceCombinationVisualization from "@/components/NonceCombinationVisualization";
import FinalEncryptedPackage from "@/components/FinalEncryptedPackage";
import ProgressIndicator from "@/components/ProgressIndicator";
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
  Shield,
} from "lucide-react";

interface VisualizationStep {
  charIndex: number;
  char: string;
  charCode: number;
  encrypted: string;
  stage: "original" | "numeric" | "xor-operation" | "nonce-combine" | "encrypted";
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
  slow: { step: 12000, xor: 12000, complete: 8000 },
  medium: { step: 6000, xor: 5000, complete: 3500 },
  fast: { step: 3000, xor: 2500, complete: 1500 },
};

const stagesOrder: VisualizationStep["stage"][] = [
  "original",
  "numeric",
  "xor-operation",
  "nonce-combine",
  "encrypted",
];

const Index = () => {
  const [inputText, setInputText] = useState("");
  const [currentStep, setCurrentStep] = useState<VisualizationStep | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<VisualizationStep[]>([]);
  const [speed, setSpeed] = useState<Speed>("medium");
  const [finalEncryptedText, setFinalEncryptedText] = useState<string>("");
  const [encryptionNonce, setEncryptionNonce] = useState<string>("");
  const [showXorAnimation, setShowXorAnimation] = useState(false);
  const [showNonceCombine, setShowNonceCombine] = useState(false);
  const [showKeyDerivation, setShowKeyDerivation] = useState(false);
  const [activeTab, setActiveTab] = useState("encrypt");

  const [encryptedInput, setEncryptedInput] = useState("");
  const [nonceInput, setNonceInput] = useState("");
  const [decryptedText, setDecryptedText] = useState("");

  const [alicePrivateKey, setAlicePrivateKey] = useState<string>("");
  const [bobPublicKey, setBobPublicKey] = useState<string>("");

  const timeoutRef = useRef<number | null>(null);
  const runIdRef = useRef(0);

  // Refs for auto-scrolling
  const keyDerivationRef = useRef<HTMLDivElement>(null);
  const currentStepRef = useRef<HTMLDivElement>(null);
  const completedStepsRef = useRef<HTMLDivElement>(null);
  const finalPackageRef = useRef<HTMLDivElement>(null);
  const keyDerivationShownRef = useRef(false);
  const lastScrolledCharRef = useRef<number>(-1);
  const isFirstManualStepRef = useRef(true);

  const [manualMode, setManualMode] = useState(false);
  const [manualPrepared, setManualPrepared] = useState(false);
  const [manualCharIndex, setManualCharIndex] = useState(0);
  const [manualStageIndex, setManualStageIndex] = useState(0);
  const [manualPreviews, setManualPreviews] = useState<VisualizationStep[]>([]);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  // Auto-scroll helper function
  const scrollToElement = (ref: React.RefObject<HTMLDivElement>, delay: number = 0) => {
    if (!autoScrollEnabled) return;
    setTimeout(() => {
      if (ref.current) {
        ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, delay);
  };

  // Auto-scroll when key derivation shows
  useEffect(() => {
    if (showKeyDerivation && alicePrivateKey && bobPublicKey) {
      keyDerivationShownRef.current = true;
      lastScrolledCharRef.current = -1;
      isFirstManualStepRef.current = true;
      scrollToElement(keyDerivationRef, 100);
      // Reset after enough time for animation
      setTimeout(() => {
        keyDerivationShownRef.current = false;
      }, 2000);
    }
  }, [showKeyDerivation, alicePrivateKey, bobPublicKey]);

  // Auto-scroll when current step changes (for both auto and manual modes)
  useEffect(() => {
    if (currentStep) {
      if (manualMode && manualPrepared) {
        // In manual mode: always scroll to current step when it changes
        const delay = isFirstManualStepRef.current && keyDerivationShownRef.current ? 2200 : 100;
        if (isFirstManualStepRef.current) {
          isFirstManualStepRef.current = false;
        }
        scrollToElement(currentStepRef, delay);
        lastScrolledCharRef.current = currentStep.charIndex;
      } else if (!manualMode && isPlaying) {
        // In auto mode: scroll with delay if key derivation just showed
        const delay = keyDerivationShownRef.current ? 2500 : 100;
        scrollToElement(currentStepRef, delay);
      }
    }
  }, [currentStep, manualMode, manualPrepared, manualCharIndex, manualStageIndex, isPlaying]);

  // Auto-scroll when final package shows (only in auto mode when complete)
  useEffect(() => {
    if (finalEncryptedText && !manualMode && !isPlaying) {
      scrollToElement(finalPackageRef, 100);
    }
  }, [finalEncryptedText, manualMode, isPlaying]);

  // Auto-scroll when decrypted text shows (for decryption tab)
  useEffect(() => {
    if (decryptedText && activeTab === "decrypt" && !isPlaying) {
      scrollToElement(finalPackageRef, 100);
    }
  }, [decryptedText, activeTab, isPlaying]);

  // Auto-scroll during decryption visualization
  const decryptionStepRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeTab === "decrypt" && currentStep && isPlaying) {
      scrollToElement(currentStepRef, 100);
    }
  }, [currentStep, activeTab, isPlaying]);

  // Reset scroll tracking when mode changes or reset
  useEffect(() => {
    lastScrolledCharRef.current = -1;
    isFirstManualStepRef.current = true;
  }, [manualMode, inputText]);

  // Keyboard shortcuts for manual mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!manualMode || !manualPrepared) return;
      
      // Prevent scrolling when using arrow keys
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          manualStepForwardRef.current?.();
          break;
        case 'ArrowLeft':
          manualStepBackRef.current?.();
          break;
        case 'ArrowDown':
          manualGotoCharRef.current?.(manualCharIndex + 1);
          break;
        case 'ArrowUp':
          manualGotoCharRef.current?.(manualCharIndex - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manualMode, manualPrepared, manualCharIndex]);

  // Refs for keyboard handler functions
  const manualStepForwardRef = useRef<() => void>();
  const manualStepBackRef = useRef<() => void>();
  const manualGotoCharRef = useRef<(idx: number) => void>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      runIdRef.current++;
    };
  }, []);

  useEffect(() => {
    soundEffects.setEnabled(true);
    soundEffects.setVolume(1);
  }, []);

  const base64ToBytes = (b64: string): number[] => {
    try {
      const binary = atob(b64);
      return Array.from(binary, (c) => c.charCodeAt(0));
    } catch {
      return [];
    }
  };

  const bytesToHex = (bytes: number[]) =>
    bytes.map((b) => b.toString(16).padStart(2, "0")).join("");

  const xorBytes = (a: number[], b: number[]) => {
    const len = Math.max(a.length, b.length);
    return Array.from({ length: len }, (_, i) => (a[i] || 0) ^ (b[i] || 0));
  };

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timeoutRef.current = window.setTimeout(resolve, ms);
    });

  const prepareManualEncryption = () => {
    if (!inputText) return;
    const aliceKeys = generateKeyPair();
    const bobKeys = generateKeyPair();
    const sharedSecret = deriveSharedSecret(aliceKeys.privateKey, bobKeys.publicKey);

    setAlicePrivateKey(aliceKeys.privateKey);
    setBobPublicKey(bobKeys.publicKey);
    setShowKeyDerivation(true);

    const { ciphertext: fullCiphertext, nonce } = encryptMessage(inputText, sharedSecret);
    setEncryptionNonce(nonce);
    setFinalEncryptedText(fullCiphertext);

    const sharedSecretPreview = bytesToHex(Array.from(sharedSecret)).slice(0, 32);
    const encoder = new TextEncoder();
    const previews: VisualizationStep[] = [];

    for (let i = 0; i < inputText.length; i++) {
      const char = inputText[i];
      const charBytesArr = Array.from(encoder.encode(char));
      const { ciphertext } = encryptMessage(char, sharedSecret);
      const cipherBytes = base64ToBytes(ciphertext);
      const keystreamBytes = xorBytes(cipherBytes, charBytesArr);

      previews.push({
        charIndex: i,
        char,
        charCode: char.charCodeAt(0),
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
    setCurrentStep({ ...previews[0], stage: stagesOrder[0], stageLabel: "Original Character" });
  };

  const updateCurrentStepFromManual = (charIndex: number, stageIndex: number) => {
    if (!manualPreviews.length) return;
    const preview = manualPreviews[charIndex];
    const stage = stagesOrder[stageIndex];
    const stageLabelMap: Record<string, string> = {
      original: "Original Character",
      numeric: "Numeric Mapping (bytes)",
      "xor-operation": "XOR Operation (bit-by-bit)",
      "nonce-combine": "Nonce Combination",
      encrypted: "Final Encrypted Value",
    };
    setCurrentStep({ ...preview, stage, stageLabel: stageLabelMap[stage] || stage });
    setShowXorAnimation(stage === "xor-operation");
    setShowNonceCombine(stage === "nonce-combine");
  };

  const manualStepForward = () => {
    if (!manualPrepared || !manualPreviews.length) return;
    let sIdx = manualStageIndex;
    let cIdx = manualCharIndex;
    if (sIdx < stagesOrder.length - 1) {
      sIdx++;
    } else if (cIdx < manualPreviews.length - 1) {
      cIdx++;
      sIdx = 0;
    } else {
      return;
    }
    setManualStageIndex(sIdx);
    setManualCharIndex(cIdx);
    updateCurrentStepFromManual(cIdx, sIdx);
    if (stagesOrder[sIdx] === "encrypted") {
      setCompletedSteps((prev) => {
        if (prev.find((p) => p.charIndex === manualPreviews[cIdx].charIndex)) return prev;
        return [...prev, { ...manualPreviews[cIdx], stage: "encrypted", stageLabel: "Completed" }];
      });
    }
  };

  const manualStepBack = () => {
    if (!manualPrepared || !manualPreviews.length) return;
    let sIdx = manualStageIndex;
    let cIdx = manualCharIndex;
    if (sIdx > 0) {
      sIdx--;
    } else if (cIdx > 0) {
      cIdx--;
      sIdx = stagesOrder.length - 1;
    } else {
      return;
    }
    setManualStageIndex(sIdx);
    setManualCharIndex(cIdx);
    updateCurrentStepFromManual(cIdx, sIdx);
  };

  const manualGotoChar = (newIndex: number) => {
    if (!manualPrepared || newIndex < 0 || newIndex >= manualPreviews.length) return;
    setManualCharIndex(newIndex);
    setManualStageIndex(0);
    updateCurrentStepFromManual(newIndex, 0);
  };

  // Assign functions to refs for keyboard handler
  useEffect(() => {
    manualStepForwardRef.current = manualStepForward;
    manualStepBackRef.current = manualStepBack;
    manualGotoCharRef.current = manualGotoChar;
  });

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
    setShowNonceCombine(false);
    setShowKeyDerivation(true);

    const aliceKeys = generateKeyPair();
    const bobKeys = generateKeyPair();
    const sharedSecret = deriveSharedSecret(aliceKeys.privateKey, bobKeys.publicKey);

    setAlicePrivateKey(aliceKeys.privateKey);
    setBobPublicKey(bobKeys.publicKey);

    const { ciphertext: fullCiphertext, nonce } = encryptMessage(inputText, sharedSecret);
    setEncryptionNonce(nonce);

    const sharedSecretPreview = bytesToHex(Array.from(sharedSecret)).slice(0, 32);

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
        { stage: "nonce-combine", stageLabel: "Nonce Combination" },
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
          plaintextByte: charBytesArr[0] || 0,
          keystreamByte: keystreamBytes[0] || 0,
        });
        setShowXorAnimation(stage === "xor-operation");
        setShowNonceCombine(stage === "nonce-combine");

        if (stage === "xor-operation") soundEffects.playXorOperation();
        else if (stage !== "original") soundEffects.playStageTransition();

        await wait(stage === "xor-operation" ? speedSettings[speed].xor : speedSettings[speed].step);
      }

      if (runIdRef.current !== myRunId) break;
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
      setShowNonceCombine(false);
      await wait(speedSettings[speed].complete);
    }

    if (runIdRef.current === myRunId) {
      setFinalEncryptedText(fullCiphertext);
      soundEffects.playEncryptionComplete();
    }
    setIsPlaying(false);
  };

  const visualizeDecryption = async () => {
    if (!encryptedInput || !nonceInput || isPlaying) return;

    runIdRef.current++;
    const myRunId = runIdRef.current;

    setIsPlaying(true);
    setCurrentStep(null);
    setCompletedSteps([]);
    setDecryptedText("");
    setShowXorAnimation(false);
    setShowNonceCombine(false);

    try {
      let sharedSecret: Uint8Array;
      if (alicePrivateKey && bobPublicKey) {
        sharedSecret = deriveSharedSecret(alicePrivateKey, bobPublicKey);
      } else {
        const a = generateKeyPair();
        const b = generateKeyPair();
        sharedSecret = deriveSharedSecret(a.privateKey, b.publicKey);
      }

      const fullDecryptedText = decryptMessage(encryptedInput, nonceInput, sharedSecret);
      const sharedSecretPreview = bytesToHex(Array.from(sharedSecret)).slice(0, 32);

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
          { stage: "nonce-combine", stageLabel: "Extract from Nonce" },
          { stage: "xor-operation", stageLabel: "XOR Operation (bit-by-bit)" },
          { stage: "numeric", stageLabel: "Numeric Mapping (bytes)" },
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
            plaintextByte: charBytesArr[0] || 0,
            keystreamByte: keystreamBytes[0] || 0,
          });
          setShowXorAnimation(stage === "xor-operation");
          setShowNonceCombine(stage === "nonce-combine");

          if (stage === "xor-operation") soundEffects.playXorOperation();
          else if (stage !== "encrypted") soundEffects.playStageTransition();

          await wait(stage === "xor-operation" ? speedSettings[speed].xor : speedSettings[speed].step);
        }

        if (runIdRef.current !== myRunId) break;
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
        setShowNonceCombine(false);
        await wait(speedSettings[speed].complete);
      }

      if (runIdRef.current === myRunId) {
        setDecryptedText(fullDecryptedText);
        soundEffects.playDecryptionComplete();
      }
    } catch {
      soundEffects.playError();
      alert("Decryption failed. Check your encrypted text and nonce.");
    } finally {
      setIsPlaying(false);
    }
  };

  const stopVisualization = () => {
    runIdRef.current++;
    setIsPlaying(false);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setCurrentStep(null);
    setShowXorAnimation(false);
    setShowNonceCombine(false);
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
    setShowNonceCombine(false);
    setShowKeyDerivation(false);
  };

  return (
    <div className="min-h-screen py-12 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <header className="text-center mb-12 sm:mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-primary/15 border border-primary/30 mb-8 backdrop-blur-sm">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary tracking-wide">ChaCha20-Poly1305 Encryption</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold mb-5 gradient-text tracking-tight">
            Encryption Visualizer
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Watch encryption happen bit-by-bit with detailed XOR operation visualization
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-10 glass-card h-14 p-1.5">
            <TabsTrigger value="encrypt" className="flex items-center gap-2 h-full text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Lock className="w-4 h-4" />
              Encryption
            </TabsTrigger>
            <TabsTrigger value="decrypt" className="flex items-center gap-2 h-full text-base font-semibold data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-all">
              <Unlock className="w-4 h-4" />
              Decryption
            </TabsTrigger>
          </TabsList>

          {/* Encryption Tab */}
          <TabsContent value="encrypt" className="space-y-8">
            <Card className="p-6 sm:p-8 glass-card animate-fade-in space-y-4 border-primary/20">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Input Text</label>
                <Input
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

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Speed</label>
                  <div className="flex gap-2">
                    {(["slow", "medium", "fast"] as Speed[]).map((s) => (
                      <Button
                        key={s}
                        variant={speed === s ? "default" : "outline"}
                        onClick={() => setSpeed(s)}
                        disabled={isPlaying}
                        className="flex-1 capitalize"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-end">
                  <label className="text-sm font-medium mb-2">Auto-Scroll</label>
                  <Button
                    variant={autoScrollEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                    className={`w-16 ${autoScrollEnabled ? "bg-primary" : ""}`}
                  >
                    {autoScrollEnabled ? "On" : "Off"}
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
                    disabled={!inputText}
                    className="flex-1 bg-gradient-to-r from-primary to-crypto-nonce text-primary-foreground hover:opacity-90"
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

              {manualMode && manualPrepared && manualPreviews.length > 0 && (
                <div className="space-y-4 animate-slide-in">
                  {/* Progress Indicator */}
                  <ProgressIndicator
                    totalChars={manualPreviews.length}
                    currentCharIndex={manualCharIndex}
                    currentStageIndex={manualStageIndex}
                    totalStages={stagesOrder.length}
                    stages={stagesOrder}
                  />
                  
                  {/* Manual Controls */}
                  <Card className="p-4 glass-card bg-primary/5 border-primary/20">
                    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                      <div className="flex gap-2 items-center">
                        <Button onClick={manualStepBack} size="sm" title="Previous Step (←)">
                          <StepBack className="w-4 h-4" />
                        </Button>
                        <Button onClick={manualStepForward} size="sm" title="Next Step (→ or Space)">
                          <StepForward className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => manualGotoChar(manualCharIndex - 1)}
                          size="sm"
                          disabled={manualCharIndex <= 0}
                          title="Previous Character (↑)"
                        >
                          <Rewind className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => manualGotoChar(manualCharIndex + 1)}
                          size="sm"
                          disabled={manualCharIndex >= manualPreviews.length - 1}
                          title="Next Character (↓)"
                        >
                          <FastForward className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Char <strong className="text-primary">{manualCharIndex + 1}</strong> /{" "}
                        {manualPreviews.length} • Stage:{" "}
                        <strong className="text-primary">{stagesOrder[manualStageIndex]}</strong>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </Card>

            {/* Key Derivation - show at start or when keys are available */}
            {showKeyDerivation && alicePrivateKey && bobPublicKey && (
              <div ref={keyDerivationRef}>
                <KeyDerivationVisualization
                  alicePrivateKey={alicePrivateKey}
                  bobPublicKey={bobPublicKey}
                  sharedSecret={currentStep?.sharedSecretHex}
                  speed={speedSettings[speed].step / 4}
                />
              </div>
            )}

            {currentStep && (
              <Card ref={currentStepRef} className="p-6 sm:p-8 glass-card border-primary/50 shadow-lg animate-fade-in crypto-glow">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-primary">
                      Character {currentStep.charIndex + 1}: "{currentStep.char}"
                    </h3>
                    <div className="px-3 py-1 bg-primary/20 rounded-full text-xs font-medium text-primary border border-primary/30">
                      {currentStep.stageLabel}
                    </div>
                  </div>

                  {(currentStep.stage === "original" ||
                    currentStep.stage === "numeric" ||
                    currentStep.stage === "xor-operation" ||
                    currentStep.stage === "nonce-combine" ||
                    currentStep.stage === "encrypted") && (
                    <div className="p-6 bg-crypto-plaintext/10 rounded-xl border-2 border-crypto-plaintext/30 animate-scale-in">
                      <div className="text-xs text-muted-foreground mb-2 font-medium">
                        Original Character
                      </div>
                      <div className="text-5xl font-bold text-center text-crypto-plaintext">
                        {currentStep.char}
                      </div>
                      <div className="text-center text-sm text-muted-foreground mt-2">
                        UTF-16:{" "}
                        <span className="font-mono text-crypto-plaintext">{currentStep.charCode}</span>
                      </div>
                    </div>
                  )}

                  {(currentStep.stage === "numeric" ||
                    currentStep.stage === "xor-operation" ||
                    currentStep.stage === "nonce-combine" ||
                    currentStep.stage === "encrypted") && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center justify-center">
                        <div className="text-3xl text-primary animate-pulse-glow">↓</div>
                      </div>
                      <div className="p-6 bg-crypto-plaintext/10 rounded-xl border border-crypto-plaintext/20">
                        <div className="text-xs text-muted-foreground mb-3 font-medium">
                          Plaintext Byte (UTF-8)
                        </div>
                        <div className="flex justify-center gap-2">
                          {currentStep.charBytes?.map((byte, idx) => (
                            <div
                              key={idx}
                              className="px-4 py-2 bg-crypto-plaintext/20 rounded-lg border border-crypto-plaintext/30"
                            >
                              <div className="text-sm font-mono font-bold text-crypto-plaintext">
                                {byte}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                0x{byte.toString(16).toUpperCase()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep.stage === "xor-operation" &&
                    showXorAnimation &&
                    currentStep.plaintextByte !== undefined &&
                    currentStep.keystreamByte !== undefined && (
                      <div className="animate-fade-in">
                        <div className="flex items-center justify-center mb-4">
                          <div className="text-3xl text-crypto-operation animate-pulse-glow">↓</div>
                        </div>
                        <EnhancedXorVisualization
                          plaintextByte={currentStep.plaintextByte}
                          keystreamByte={currentStep.keystreamByte}
                          label="XOR Encryption Operation"
                          speed={speedSettings[speed].xor / 10}
                          showExplanation
                        />
                      </div>
                    )}

                  {currentStep.stage === "nonce-combine" && showNonceCombine && encryptionNonce && (
                    <div className="animate-fade-in">
                      <div className="flex items-center justify-center mb-4">
                        <div className="text-3xl text-crypto-nonce animate-pulse-glow">↓</div>
                      </div>
                      <NonceCombinationVisualization
                        ciphertextPreview={currentStep.encrypted}
                        nonce={encryptionNonce}
                        isComplete={currentStep.stage === "nonce-combine"}
                      />
                    </div>
                  )}

                  {currentStep.stage === "encrypted" && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center justify-center">
                        <div className="text-3xl text-crypto-ciphertext animate-pulse-glow">↓</div>
                      </div>
                      <div className="p-6 bg-crypto-ciphertext/10 rounded-xl border-2 border-crypto-ciphertext/30">
                        <div className="text-xs text-muted-foreground mb-3 font-medium">
                          Encrypted Value (Base64)
                        </div>
                        <div className="text-sm font-mono text-center break-all text-crypto-ciphertext font-bold">
                          {currentStep.encrypted}
                        </div>
                        <div className="text-xs text-muted-foreground mt-3 text-center">
                          Result byte: {currentStep.ciphertextBytes?.[0]} (0x
                          {currentStep.ciphertextBytes?.[0]?.toString(16).toUpperCase()})
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {completedSteps.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-crypto-ciphertext">✓</span> Completed Characters
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {completedSteps.map((step, index) => (
                    <Card
                      key={index}
                      className="p-4 glass-card bg-crypto-ciphertext/5 border-crypto-ciphertext/20 animate-scale-in hover:border-crypto-ciphertext/40 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Char {step.charIndex + 1}</span>
                          <span className="text-2xl font-bold text-crypto-ciphertext">{step.char}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Byte:{" "}
                          <span className="text-primary font-medium font-mono">
                            {step.charBytes?.[0]}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          Encrypted:{" "}
                          <span className="font-mono text-crypto-ciphertext">{step.encrypted}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {finalEncryptedText && (
              <div ref={finalPackageRef}>
                <FinalEncryptedPackage
                  originalText={inputText}
                  encryptedText={finalEncryptedText}
                  nonce={encryptionNonce}
                  onTestDecryption={() => {
                    setEncryptedInput(finalEncryptedText);
                    setNonceInput(encryptionNonce);
                    setActiveTab("decrypt");
                  }}
                />
              </div>
            )}
          </TabsContent>

          {/* Decryption Tab */}
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
                  value={nonceInput}
                  onChange={(e) => setNonceInput(e.target.value)}
                  placeholder="Paste nonce here..."
                  className="w-full font-mono text-sm"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Speed</label>
                  <div className="flex gap-2">
                    {(["slow", "medium", "fast"] as Speed[]).map((s) => (
                      <Button
                        key={s}
                        variant={speed === s ? "default" : "outline"}
                        onClick={() => setSpeed(s)}
                        disabled={isPlaying}
                        className="flex-1 capitalize"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-end">
                  <label className="text-sm font-medium mb-2">Auto-Scroll</label>
                  <Button
                    variant={autoScrollEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                    className={`w-16 ${autoScrollEnabled ? "bg-accent" : ""}`}
                  >
                    {autoScrollEnabled ? "On" : "Off"}
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
                    disabled={!encryptedInput || !nonceInput}
                    className="flex-1 bg-gradient-to-r from-accent to-primary text-accent-foreground hover:opacity-90"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Visualize Decryption
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
            </Card>

            {currentStep && (
              <Card className="p-6 sm:p-8 glass-card border-accent/50 shadow-lg animate-fade-in crypto-glow-accent">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-accent">
                      Character {currentStep.charIndex + 1}: "{currentStep.char}"
                    </h3>
                    <div className="px-3 py-1 bg-accent/20 rounded-full text-xs font-medium text-accent border border-accent/30">
                      {currentStep.stageLabel}
                    </div>
                  </div>

                  {currentStep.stage === "encrypted" && (
                    <div className="p-6 bg-crypto-ciphertext/10 rounded-xl border-2 border-crypto-ciphertext/30 animate-scale-in">
                      <div className="text-xs text-muted-foreground mb-3 font-medium">
                        Encrypted Value
                      </div>
                      <div className="text-sm font-mono text-center break-all text-crypto-ciphertext font-bold">
                        {currentStep.encrypted}
                      </div>
                    </div>
                  )}

                  {currentStep.stage === "nonce-combine" && showNonceCombine && nonceInput && (
                    <NonceCombinationVisualization
                      ciphertextPreview={currentStep.encrypted}
                      nonce={nonceInput}
                      isComplete
                    />
                  )}

                  {currentStep.stage === "xor-operation" &&
                    showXorAnimation &&
                    currentStep.plaintextByte !== undefined &&
                    currentStep.keystreamByte !== undefined && (
                      <EnhancedXorVisualization
                        plaintextByte={currentStep.plaintextByte}
                        keystreamByte={currentStep.keystreamByte}
                        label="XOR Decryption Operation"
                        speed={speedSettings[speed].xor / 10}
                        showExplanation
                      />
                    )}

                  {(currentStep.stage === "numeric" || currentStep.stage === "original") && (
                    <div className="p-6 bg-crypto-plaintext/10 rounded-xl border border-crypto-plaintext/20 animate-scale-in">
                      <div className="text-xs text-muted-foreground mb-3 font-medium">
                        Plaintext Byte
                      </div>
                      <div className="flex justify-center gap-2">
                        {currentStep.charBytes?.map((byte, idx) => (
                          <div
                            key={idx}
                            className="px-4 py-2 bg-crypto-plaintext/20 rounded-lg border border-crypto-plaintext/30"
                          >
                            <div className="text-sm font-mono font-bold text-crypto-plaintext">
                              {byte}
                            </div>
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
                        <div className="text-xs text-muted-foreground mb-2 font-medium">
                          Original Character Recovered
                        </div>
                        <div className="text-5xl font-bold text-center text-accent">
                          {currentStep.char}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {completedSteps.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-accent">✓</span> Completed Characters
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {completedSteps.map((step, index) => (
                    <Card
                      key={index}
                      className="p-4 glass-card bg-accent/5 border-accent/20 animate-scale-in hover:border-accent/40 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Char {step.charIndex + 1}</span>
                          <span className="text-2xl font-bold text-accent">{step.char}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Byte:{" "}
                          <span className="text-primary font-medium font-mono">
                            {step.charBytes?.[0]}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {decryptedText && (
              <Card ref={finalPackageRef} className="p-6 sm:p-8 glass-card bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30 animate-fade-in crypto-glow-accent">
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

export default Index;
