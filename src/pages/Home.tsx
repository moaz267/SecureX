import { Link } from "react-router-dom";
import { ArrowRight, Lock, Bolt, Key, Shield, Check } from "lucide-react"; // تأكد من استيراد Bolt
import { Button } from "@/components/ui/button";

const Home = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Hero Section */}
      <section className="min-h-[80vh] sm:min-h-[90vh] flex items-center justify-center px-4">
        <div className="text-center max-w-4xl mx-auto">
          <div className="animate-fade-in">
            <div className="inline-block mb-4 sm:mb-6 px-3 sm:px-4 py-1.5 sm:py-2 glass-card">
              <span className="text-xs sm:text-sm text-primary font-semibold">
                Modern Encryption Platform
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight px-2">
              Secure Your Data with{" "}
              <span className="gradient-text">Advanced Cryptography</span>
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Experience the power of the X25519 algorithm. Encrypt and decrypt 
              your messages with mathematical precision and unbreakable security.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
              <Link to="/visualization" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 animate-glow-pulse group"
                >
                  let us see the visualization
                  <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <Link to="/tool" className="w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full sm:w-auto border-2 border-border hover:bg-secondary/50 font-semibold px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-xl"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-20 animate-fade-in-delay px-4">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">

          {/* High Security */}
          <div className="glass-card p-6 sm:p-8 hover:scale-105 transition-transform duration-300">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6">
              <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">High Security</h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Military-grade key exchange ensuring your communications remain private and secure.
            </p>
          </div>

          {/* Fast & Efficient */}
          <div className="glass-card p-6 sm:p-8 hover:scale-105 transition-transform duration-300">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6">
              <Bolt className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Fast & Efficient</h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Optimized for speed and low resource usage, perfect for mobile devices and modern applications.
            </p>
          </div>

          {/* Compact Keys */}
          <div className="glass-card p-6 sm:p-8 hover:scale-105 transition-transform duration-300">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6">
              <Key className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Compact Keys</h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Small key sizes without compromising security, making data transfer faster and lighter.
            </p>
          </div>

          {/* Side-Channel Resistant */}
          <div className="glass-card p-6 sm:p-8 hover:scale-105 transition-transform duration-300">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Side-Channel Resistant</h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Engineered to resist timing and power-based attacks for maximum safety.
            </p>
          </div>

          {/* Trusted & Proven */}
          <div className="glass-card p-6 sm:p-8 hover:scale-105 transition-transform duration-300">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6">
              <Check className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Trusted & Proven</h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Built on the well-studied Curve25519, trusted by major protocols like TLS 1.3, Signal, and WireGuard.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
};

export default Home;
