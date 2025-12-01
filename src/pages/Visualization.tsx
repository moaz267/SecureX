import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { generateKeyPair, deriveSharedSecret, encryptMessage, decryptMessage } from "@/utils/x25519-cipher";
import { Play, RotateCcw, Pause, Lock, Unlock } from "lucide-react";

interface VisualizationStep {
  charIndex: number;
  char: string;
  charCode: number;
  encrypted: string;
  stage: "original" | "numeric" | "operation" | "encrypted";
  stageLabel: string;
}

type Speed = "slow" | "medium" | "fast";

const speedSettings = {
  slow: { step: 1200, complete: 800 },
  medium: { step: 800, complete: 600 },
  fast: { step: 400, complete: 300 },
};

const Virtualization = () => {
  // Encryption states
  const [inputText, setInputText] = useState("");
  const [currentStep, setCurrentStep] = useState<VisualizationStep | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<VisualizationStep[]>([]);
  const [speed, setSpeed] = useState<Speed>("medium");
  const [finalEncryptedText, setFinalEncryptedText] = useState<string>("");
  const [encryptionNonce, setEncryptionNonce] = useState<string>("");
  
  // Decryption states
  const [encryptedInput, setEncryptedInput] = useState("");
  const [nonceInput, setNonceInput] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  
  // Store keys for decryption
  const [alicePrivateKey, setAlicePrivateKey] = useState<string>("");
  const [bobPublicKey, setBobPublicKey] = useState<string>("");
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const visualizeEncryption = async () => {
    if (!inputText || isPlaying) return;

    setIsPlaying(true);
    setCurrentStep(null);
    setCompletedSteps([]);
    setFinalEncryptedText("");

    // Generate keys for visualization
    const aliceKeys = generateKeyPair();
    const bobKeys = generateKeyPair();
    const sharedSecret = deriveSharedSecret(aliceKeys.privateKey, bobKeys.publicKey);

    // Store keys for later decryption
    setAlicePrivateKey(aliceKeys.privateKey);
    setBobPublicKey(bobKeys.publicKey);

    // Encrypt full text for final display
    const { ciphertext: fullCiphertext, nonce } = encryptMessage(inputText, sharedSecret);
    setEncryptionNonce(nonce);

    // Process each character with animated steps
    for (let i = 0; i < inputText.length; i++) {
      const char = inputText[i];
      const charCode = char.charCodeAt(0);
      const { ciphertext } = encryptMessage(char, sharedSecret);
      const encryptedPreview = ciphertext.substring(0, 16) + "...";

      const stages: Array<{ stage: VisualizationStep["stage"]; stageLabel: string }> = [
        { stage: "original", stageLabel: "Original Character" },
        { stage: "numeric", stageLabel: "Numeric Mapping (UTF-16)" },
        { stage: "operation", stageLabel: "Encryption Operation Applied" },
        { stage: "encrypted", stageLabel: "Final Encrypted Value" },
      ];

      for (const { stage, stageLabel } of stages) {
        await new Promise<void>((resolve) => {
          timeoutRef.current = setTimeout(() => {
            setCurrentStep({
              charIndex: i,
              char,
              charCode,
              encrypted: encryptedPreview,
              stage,
              stageLabel,
            });
            resolve();
          }, speedSettings[speed].step);
        });
      }

      // Mark character as complete and move to next
      await new Promise<void>((resolve) => {
        timeoutRef.current = setTimeout(() => {
          setCompletedSteps((prev) => [
            ...prev,
            {
              charIndex: i,
              char,
              charCode,
              encrypted: encryptedPreview,
              stage: "encrypted",
              stageLabel: "Completed",
            },
          ]);
          setCurrentStep(null);
          resolve();
        }, speedSettings[speed].complete);
      });
    }

    // Show final encrypted text
    setFinalEncryptedText(fullCiphertext);
    setIsPlaying(false);
  };

  const visualizeDecryption = async () => {
    if (!encryptedInput || !nonceInput || isPlaying) return;

    setIsPlaying(true);
    setCurrentStep(null);
    setCompletedSteps([]);
    setDecryptedText("");

    try {
      // Use stored keys from encryption or generate new ones
      let sharedSecret: Uint8Array;
      
      if (alicePrivateKey && bobPublicKey) {
        // Use the same keys from encryption
        sharedSecret = deriveSharedSecret(alicePrivateKey, bobPublicKey);
      } else {
        // Generate new keys if none stored (for manual input)
        const aliceKeys = generateKeyPair();
        const bobKeys = generateKeyPair();
        sharedSecret = deriveSharedSecret(aliceKeys.privateKey, bobKeys.publicKey);
      }

      // Decrypt full text
      const fullDecryptedText = decryptMessage(encryptedInput, nonceInput, sharedSecret);

      // Process each character with animated steps (reverse order)
      for (let i = 0; i < fullDecryptedText.length; i++) {
        const char = fullDecryptedText[i];
        const charCode = char.charCodeAt(0);
        const { ciphertext } = encryptMessage(char, sharedSecret);
        const encryptedPreview = ciphertext.substring(0, 16) + "...";

        const stages: Array<{ stage: VisualizationStep["stage"]; stageLabel: string }> = [
          { stage: "encrypted", stageLabel: "Encrypted Value" },
          { stage: "operation", stageLabel: "Decryption Operation Applied" },
          { stage: "numeric", stageLabel: "Numeric Mapping (UTF-16)" },
          { stage: "original", stageLabel: "Original Character Recovered" },
        ];

        for (const { stage, stageLabel } of stages) {
          await new Promise<void>((resolve) => {
            timeoutRef.current = setTimeout(() => {
              setCurrentStep({
                charIndex: i,
                char,
                charCode,
                encrypted: encryptedPreview,
                stage,
                stageLabel,
              });
              resolve();
            }, speedSettings[speed].step);
          });
        }

        // Mark character as complete and move to next
        await new Promise<void>((resolve) => {
          timeoutRef.current = setTimeout(() => {
            setCompletedSteps((prev) => [
              ...prev,
              {
                charIndex: i,
                char,
                charCode,
                encrypted: encryptedPreview,
                stage: "original",
                stageLabel: "Completed",
              },
            ]);
            setCurrentStep(null);
            resolve();
          }, speedSettings[speed].complete);
        });
      }

      // Show final decrypted text
      setDecryptedText(fullDecryptedText);
      setIsPlaying(false);
    } catch (error) {
      console.error("Decryption failed:", error);
      setIsPlaying(false);
      alert("فشل فك التشفير. تحقق من النص المشفر والـ nonce.");
    }
  };

  const stopVisualization = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsPlaying(false);
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
  };

  return (
    <div className="min-h-screen py-12 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 gradient-text">
            Encryption Virtualization
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Visualize how X25519 encryption and decryption transforms each character step by step
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

          {/* Encryption Tab */}
          <TabsContent value="encrypt" className="space-y-8">
            <Card className="p-6 sm:p-8 glass-card animate-fade-in">
              <div className="space-y-6">
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
                  <label className="block text-sm font-medium mb-2">Visualization Speed</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={speed === "slow" ? "default" : "outline"}
                      onClick={() => setSpeed("slow")}
                      disabled={isPlaying}
                      className="flex-1"
                    >
                      Slow
                    </Button>
                    <Button
                      type="button"
                      variant={speed === "medium" ? "default" : "outline"}
                      onClick={() => setSpeed("medium")}
                      disabled={isPlaying}
                      className="flex-1"
                    >
                      Medium
                    </Button>
                    <Button
                      type="button"
                      variant={speed === "fast" ? "default" : "outline"}
                      onClick={() => setSpeed("fast")}
                      disabled={isPlaying}
                      className="flex-1"
                    >
                      Fast
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  {!isPlaying ? (
                    <Button
                      onClick={visualizeEncryption}
                      disabled={!inputText || isPlaying}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Visualize
                    </Button>
                  ) : (
                    <Button
                      onClick={stopVisualization}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  )}
                  <Button
                    onClick={reset}
                    variant="outline"
                    disabled={isPlaying}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            </Card>

            {(currentStep || completedSteps.length > 0) && (
              <div className="space-y-6">
                {/* Current Active Step */}
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
                        {/* Original Character */}
                        {(currentStep.stage === "original" || 
                          currentStep.stage === "numeric" || 
                          currentStep.stage === "operation" || 
                          currentStep.stage === "encrypted") && (
                          <div className="p-4 bg-secondary/20 rounded-lg animate-fade-in">
                            <div className="text-xs text-muted-foreground mb-2">Original Character</div>
                            <div className="text-4xl font-bold text-center">{currentStep.char}</div>
                          </div>
                        )}

                        {/* Numeric Mapping */}
                        {(currentStep.stage === "numeric" || 
                          currentStep.stage === "operation" || 
                          currentStep.stage === "encrypted") && (
                          <div className="flex items-center gap-2 animate-fade-in">
                            <div className="text-2xl text-primary">↓</div>
                            <div className="flex-1 p-4 bg-primary/10 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-2">Numeric Value (UTF-16)</div>
                              <div className="text-3xl font-bold text-primary text-center">{currentStep.charCode}</div>
                            </div>
                          </div>
                        )}

                        {/* Operation Applied */}
                        {(currentStep.stage === "operation" || currentStep.stage === "encrypted") && (
                          <div className="flex items-center gap-2 animate-fade-in">
                            <div className="text-2xl text-primary">↓</div>
                            <div className="flex-1 p-4 bg-accent/10 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-2">Encryption Operation</div>
                              <div className="text-sm text-center font-medium">
                                X25519 + XSalsa20-Poly1305
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Final Encrypted */}
                        {currentStep.stage === "encrypted" && (
                          <div className="flex items-center gap-2 animate-fade-in">
                            <div className="text-2xl text-primary">↓</div>
                            <div className="flex-1 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                              <div className="text-xs text-muted-foreground mb-2">Final Encrypted Value (Base64)</div>
                              <div className="text-sm font-mono text-center break-all text-green-600 dark:text-green-400">
                                {currentStep.encrypted}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Completed Steps Summary */}
                {completedSteps.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold">Completed Characters</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {completedSteps.map((step, index) => (
                        <Card
                          key={index}
                          className="p-4 glass-card bg-green-500/5 border-green-500/20 animate-fade-in"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Char {step.charIndex + 1}</span>
                              <span className="text-2xl font-bold">{step.char}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              UTF-16: <span className="text-primary font-medium">{step.charCode}</span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              Encrypted: <span className="font-mono">{step.encrypted}</span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Final Encrypted Text */}
            {finalEncryptedText && (
              <Card className="p-6 glass-card bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30 animate-fade-in">
                <h3 className="text-lg font-bold mb-4 text-green-600 dark:text-green-400">
                  🔒 Final Encrypted Text
                </h3>
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
                    <div className="text-sm font-mono break-all text-green-600 dark:text-green-400 select-all">
                      {finalEncryptedText}
                    </div>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border border-green-500/20">
                    <div className="text-xs text-muted-foreground mb-2">Nonce (Required for Decryption)</div>
                    <div className="text-sm font-mono break-all text-primary select-all">
                      {encryptionNonce}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(finalEncryptedText);
                      }}
                      variant="outline"
                      className="flex-1 border-green-500/30 hover:bg-green-500/10"
                    >
                      Copy Encrypted Text
                    </Button>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(encryptionNonce);
                      }}
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
                      // Switch to decrypt tab
                      const decryptTab = document.querySelector('[value="decrypt"]') as HTMLElement;
                      if (decryptTab) decryptTab.click();
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Test Decryption with This Text
                  </Button>
                </div>
              </Card>
            )}

            {/* Info Card */}
            <Card className="p-4 sm:p-6 glass-card bg-primary/5 border-primary/20">
              <h3 className="text-sm font-semibold mb-2 text-primary">
                Encryption Process
              </h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>1. <strong>Key Generation:</strong> X25519 keypairs generated</p>
                <p>2. <strong>Shared Secret:</strong> ECDH derives shared key</p>
                <p>3. <strong>Character Encoding:</strong> UTF-8 byte conversion</p>
                <p>4. <strong>Encryption:</strong> XSalsa20-Poly1305 symmetric cipher</p>
                <p>5. <strong>Encoding:</strong> Base64 for transmission</p>
              </div>
            </Card>
          </TabsContent>

          {/* Decryption Tab */}
          <TabsContent value="decrypt" className="space-y-8">
            <Card className="p-6 sm:p-8 glass-card animate-fade-in">
              <div className="space-y-6">
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
                  <label className="block text-sm font-medium mb-2">Visualization Speed</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={speed === "slow" ? "default" : "outline"}
                      onClick={() => setSpeed("slow")}
                      disabled={isPlaying}
                      className="flex-1"
                    >
                      Slow
                    </Button>
                    <Button
                      type="button"
                      variant={speed === "medium" ? "default" : "outline"}
                      onClick={() => setSpeed("medium")}
                      disabled={isPlaying}
                      className="flex-1"
                    >
                      Medium
                    </Button>
                    <Button
                      type="button"
                      variant={speed === "fast" ? "default" : "outline"}
                      onClick={() => setSpeed("fast")}
                      disabled={isPlaying}
                      className="flex-1"
                    >
                      Fast
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  {!isPlaying ? (
                    <Button
                      onClick={visualizeDecryption}
                      disabled={!encryptedInput || !nonceInput || isPlaying}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Visualize Decryption
                    </Button>
                  ) : (
                    <Button
                      onClick={stopVisualization}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  )}
                  <Button
                    onClick={reset}
                    variant="outline"
                    disabled={isPlaying}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            </Card>

            {(currentStep || completedSteps.length > 0) && (
              <div className="space-y-6">
                {/* Current Active Step */}
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
                        {/* Encrypted Value */}
                        {(currentStep.stage === "encrypted" || 
                          currentStep.stage === "operation" || 
                          currentStep.stage === "numeric" || 
                          currentStep.stage === "original") && (
                          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30 animate-fade-in">
                            <div className="text-xs text-muted-foreground mb-2">Encrypted Value (Base64)</div>
                            <div className="text-sm font-mono text-center break-all text-green-600 dark:text-green-400">{currentStep.encrypted}</div>
                          </div>
                        )}

                        {/* Operation Applied */}
                        {(currentStep.stage === "operation" || currentStep.stage === "numeric" || currentStep.stage === "original") && (
                          <div className="flex items-center gap-2 animate-fade-in">
                            <div className="text-2xl text-primary">↓</div>
                            <div className="flex-1 p-4 bg-accent/10 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-2">Decryption Operation</div>
                              <div className="text-sm text-center font-medium">
                                X25519 + XSalsa20-Poly1305
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Numeric Mapping */}
                        {(currentStep.stage === "numeric" || currentStep.stage === "original") && (
                          <div className="flex items-center gap-2 animate-fade-in">
                            <div className="text-2xl text-primary">↓</div>
                            <div className="flex-1 p-4 bg-primary/10 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-2">Numeric Value (UTF-16)</div>
                              <div className="text-3xl font-bold text-primary text-center">{currentStep.charCode}</div>
                            </div>
                          </div>
                        )}

                        {/* Original Character Recovered */}
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

                {/* Completed Steps Summary */}
                {completedSteps.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold">Completed Characters</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {completedSteps.map((step, index) => (
                        <Card
                          key={index}
                          className="p-4 glass-card bg-blue-500/5 border-blue-500/20 animate-fade-in"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Char {step.charIndex + 1}</span>
                              <span className="text-2xl font-bold">{step.char}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              UTF-16: <span className="text-primary font-medium">{step.charCode}</span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              Encrypted: <span className="font-mono">{step.encrypted}</span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Final Decrypted Text */}
            {decryptedText && (
              <Card className="p-6 glass-card bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30 animate-fade-in">
                <h3 className="text-lg font-bold mb-4 text-blue-600 dark:text-blue-400">
                  🔓 Final Decrypted Text
                </h3>
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
                    <div className="text-base font-medium break-all text-blue-600 dark:text-blue-400 select-all">
                      {decryptedText}
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(decryptedText);
                    }}
                    variant="outline"
                    className="w-full border-blue-500/30 hover:bg-blue-500/10"
                  >
                    Copy Decrypted Text
                  </Button>
                </div>
              </Card>
            )}

            {/* Info Card */}
            <Card className="p-4 sm:p-6 glass-card bg-primary/5 border-primary/20">
              <h3 className="text-sm font-semibold mb-2 text-primary">
                Decryption Process
              </h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>1. <strong>Input:</strong> Encrypted text and nonce (Base64)</p>
                <p>2. <strong>Key Recovery:</strong> X25519 keypairs and shared secret</p>
                <p>3. <strong>Decryption:</strong> XSalsa20-Poly1305 cipher reversed</p>
                <p>4. <strong>Decode:</strong> UTF-8 bytes to characters</p>
                <p>5. <strong>Output:</strong> Original plaintext recovered</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Virtualization;
