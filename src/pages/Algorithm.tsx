import { Code, Lock, Unlock, BookOpen, Key, Shield } from "lucide-react";

const Algorithm = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16 animate-fade-in">
          <div className="inline-block mb-4 sm:mb-6 px-3 sm:px-4 py-1.5 sm:py-2 glass-card">
            <span className="text-xs sm:text-sm text-primary font-semibold">Modern Cryptography</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-2">
            <span className="gradient-text">X25519 Key Exchange</span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground px-4">
            Elliptic Curve Diffie-Hellman for secure key exchange
          </p>
        </div>

        {/* What is it */}
        <section className="mb-6 sm:mb-8 lg:mb-12 animate-slide-in-left">
          <div className="glass-card p-5 sm:p-6 lg:p-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">What is X25519?</h2>
            </div>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed mb-3 sm:mb-4">
              X25519 is a modern elliptic curve Diffie-Hellman (ECDH) key exchange protocol that allows 
              two parties to establish a shared secret over an insecure channel. It uses Curve25519, 
              designed by Daniel J. Bernstein for high-speed, constant-time implementations.
            </p>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed">
              Unlike traditional encryption algorithms, X25519 enables secure communication without 
              pre-shared secrets. Each party generates a public-private key pair, exchanges public keys, 
              and computes the same shared secret independently - which can then be used for symmetric encryption.
            </p>
          </div>
        </section>

        {/* Key Generation */}
        <section className="mb-6 sm:mb-8 lg:mb-12 animate-fade-in">
          <div className="glass-card p-5 sm:p-6 lg:p-8 gradient-border">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
                <Key className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">Key Generation</h2>
            </div>
            <div className="bg-background/40 rounded-xl p-4 sm:p-5 lg:p-6 mb-4 sm:mb-6 border border-border/30 overflow-x-auto">
              <code className="text-base sm:text-lg lg:text-xl text-primary font-mono block whitespace-pre-wrap break-all">
                (private_key, public_key) = generateKeyPair()
              </code>
            </div>
            <div className="space-y-2 sm:space-y-3 text-sm sm:text-base text-muted-foreground">
              <p className="flex items-start gap-2">
                <span className="text-primary font-semibold min-w-[120px] sm:min-w-[140px]">private_key:</span>
                <span>32-byte secret scalar (keep private)</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-semibold min-w-[120px] sm:min-w-[140px]">public_key:</span>
                <span>32-byte curve point (share publicly)</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-semibold min-w-[120px] sm:min-w-[140px]">Security:</span>
                <span>128-bit security level (equivalent to ~3072-bit RSA)</span>
              </p>
            </div>
          </div>
        </section>

        {/* Shared Secret Derivation */}
        <section className="mb-6 sm:mb-8 lg:mb-12 animate-fade-in">
          <div className="glass-card p-5 sm:p-6 lg:p-8 gradient-border">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">Shared Secret</h2>
            </div>
            <div className="bg-background/40 rounded-xl p-4 sm:p-5 lg:p-6 mb-4 sm:mb-6 border border-border/30 overflow-x-auto">
              <code className="text-base sm:text-lg lg:text-xl text-primary font-mono block whitespace-pre-wrap break-all">
                shared_secret = X25519(my_private_key, their_public_key)
              </code>
            </div>
            <div className="space-y-2 sm:space-y-3 text-sm sm:text-base text-muted-foreground">
              <p className="flex items-start gap-2">
                <span className="text-primary font-semibold min-w-[140px] sm:min-w-[160px]">shared_secret:</span>
                <span>32-byte shared key computed by both parties</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-semibold min-w-[140px] sm:min-w-[160px]">Property:</span>
                <span>Both parties compute the same secret without transmitting it</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-semibold min-w-[140px] sm:min-w-[160px]">Usage:</span>
                <span>Used with symmetric encryption (AES-GCM, ChaCha20-Poly1305)</span>
              </p>
            </div>
          </div>
        </section>

        {/* Example */}
        <section className="animate-fade-in">
          <div className="glass-card p-5 sm:p-6 lg:p-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
                <Code className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">How It Works</h2>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-primary">Alice and Bob:</h3>
                <div className="bg-background/40 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3 text-sm sm:text-base text-muted-foreground border border-border/30">
                  <div>
                    <p className="font-semibold text-cyan-400 mb-1">1. Key Generation (Private)</p>
                    <p className="pl-4">• Alice generates: private_A, public_A</p>
                    <p className="pl-4">• Bob generates: private_B, public_B</p>
                  </div>
                  <div>
                    <p className="font-semibold text-purple-400 mb-1">2. Public Key Exchange (Over Internet)</p>
                    <p className="pl-4">• Alice sends public_A → Bob</p>
                    <p className="pl-4">• Bob sends public_B → Alice</p>
                  </div>
                  <div>
                    <p className="font-semibold text-green-400 mb-1">3. Shared Secret Computation (Private)</p>
                    <p className="pl-4">• Alice computes: X25519(private_A, public_B) = shared_secret</p>
                    <p className="pl-4">• Bob computes: X25519(private_B, public_A) = shared_secret</p>
                  </div>
                  <div>
                    <p className="font-semibold text-pink-400 mb-1">4. Secure Communication</p>
                    <p className="pl-4">• Both use shared_secret for symmetric encryption</p>
                    <p className="pl-4">• Messages encrypted with AES-GCM or ChaCha20-Poly1305</p>
                  </div>
                </div>
              </div>

              <div className="text-center p-4 sm:p-5 lg:p-6 bg-primary/10 rounded-xl border border-primary/30">
                <p className="text-sm sm:text-base lg:text-lg">
                  <span className="text-muted-foreground">Key Property:</span>{" "}
                  <span className="text-base sm:text-lg font-bold text-primary block mt-2">
                    Same shared secret computed by both parties without transmitting it!
                  </span>
                </p>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-primary">Security Benefits:</h3>
                <div className="bg-background/40 rounded-lg p-3 sm:p-4 space-y-1.5 sm:space-y-2 text-sm sm:text-base text-muted-foreground border border-border/30">
                  <p>✓ <span className="text-green-400">Perfect Forward Secrecy</span> - New keys for each session</p>
                  <p>✓ <span className="text-blue-400">Constant-Time</span> - Resistant to timing attacks</p>
                  <p>✓ <span className="text-purple-400">Small Keys</span> - Only 32 bytes for high security</p>
                  <p>✓ <span className="text-pink-400">Fast</span> - Orders of magnitude faster than RSA</p>
                  <p>✓ <span className="text-cyan-400">Quantum-Resistant Ready</span> - Easy to upgrade to post-quantum</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Algorithm;
