import { MapPin, Menu, Scan, Camera, BarChart3, History, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface HeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const Header = ({ activeTab = "scanner", onTabChange }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: "scanner", label: "Scanner", icon: Scan },
    { id: "camera", label: "Camera", icon: Camera },
    { id: "map", label: "Map", icon: MapPin },
    { id: "history", label: "History", icon: History },
    { id: "stats", label: "Analytics", icon: BarChart3 },
    { id: "dataset", label: "Dataset", icon: Database },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-sm">
                <Scan className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success border-2 border-background flex items-center justify-center">
                <span className="text-[8px] font-bold text-success-foreground">AI</span>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                RoadVision<span className="text-primary">AI</span>
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                IIT Bombay
              </p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 bg-secondary/50 p-1 rounded-xl">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onTabChange?.(tab.id)}
                className={`gap-2 ${activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Button>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 space-y-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => {
                  onTabChange?.(tab.id);
                  setMobileMenuOpen(false);
                }}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};
