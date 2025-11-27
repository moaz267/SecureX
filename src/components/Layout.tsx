import { Link, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/algorithm", label: "Algorithm" },
    { path: "/tool", label: "Tool" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--hero-bg-start))] to-[hsl(var(--hero-bg-end))]">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/30">
        <div className="container mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2 group">
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <span className="text-base sm:text-xl font-bold gradient-text">SecureX</span>
            </Link>

            <div className="flex gap-1 sm:gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-base font-medium transition-all duration-200 ${
                    location.pathname === link.path
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-14 sm:pt-16">
        {children}
      </main>

      <footer className="mt-12 sm:mt-20 py-6 sm:py-8 border-t border-border/30">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-xs sm:text-sm">
          <p>© All rights reserved to Moaz Elhenawy .</p>
          <p>© 2026 cryptograph project FCAI .</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
