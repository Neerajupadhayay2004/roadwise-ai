import { useState, useEffect } from "react";
import { Download, Smartphone, X, Share, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show banner on iOS after a delay
    if (iOS && !standalone) {
      const timer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    // Remember dismissal for 7 days
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Check if previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        setShowInstallBanner(false);
      }
    }
  }, []);

  if (isStandalone || !showInstallBanner) return null;

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-xl">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm">Install RoadVision AI</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Add to your home screen for offline access and a better experience
                </p>
                
                <div className="flex gap-2 mt-3">
                  {isIOS ? (
                    <Button 
                      size="sm" 
                      onClick={() => setShowIOSInstructions(true)}
                      className="gap-2"
                    >
                      <Share className="w-4 h-4" />
                      How to Install
                    </Button>
                  ) : deferredPrompt ? (
                    <Button 
                      size="sm" 
                      onClick={handleInstall}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Install Now
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={handleDismiss}>
                    Not Now
                  </Button>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 shrink-0" 
                onClick={handleDismiss}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="max-w-sm w-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Install on iOS</h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowIOSInstructions(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="text-sm text-foreground">
                      Tap the <Share className="w-4 h-4 inline text-primary" /> Share button
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      At the bottom of Safari
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="text-sm text-foreground">
                      Scroll and tap <Plus className="w-4 h-4 inline" /> "Add to Home Screen"
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="text-sm text-foreground">
                      Tap <Check className="w-4 h-4 inline text-primary" /> "Add" to confirm
                    </p>
                  </div>
                </div>
              </div>
              
              <Button 
                className="w-full mt-6" 
                onClick={() => setShowIOSInstructions(false)}
              >
                Got it!
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
