import { Scan, Shield, Zap } from "lucide-react";

export const Header = () => {
  return (
    <header className="relative border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-glow opacity-30 pointer-events-none" />
      
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 rounded-xl bg-gradient-primary shadow-glow-sm">
                <Scan className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="absolute -inset-1 bg-primary/20 rounded-xl blur-lg -z-10" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Road<span className="text-gradient">Vision</span> AI
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Intelligent Damage Detection
              </p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4 text-success" />
              <span>RDD2022 Dataset</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4 text-primary" />
              <span>Powered by Gemini</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
