import { Smartphone, ExternalLink, CheckCircle } from "lucide-react";
import { isAndroid, isTermuxInstalled, openTermuxInstall } from "@/lib/termuxBridge";

export default function TermuxSetup() {
  const android = isAndroid();
  const installed = isTermuxInstalled();

  if (!android) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center">
          <Smartphone className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Termux — Android Only</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
            The Termux bridge works on Android devices. On desktop, use Cloud Shell or the built-in terminal tabs.
          </p>
        </div>
      </div>
    );
  }

  if (installed) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-success" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Termux Detected</p>
          <p className="text-xs text-muted-foreground mt-1">Use the Termux terminal tab to run commands on your device.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Smartphone className="w-7 h-7 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Install Termux</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
          Install Termux from F-Droid for a full Linux shell on your Android device. Free, no Play Store required.
        </p>
      </div>
      <div className="space-y-2 w-full max-w-[240px]">
        <button
          onClick={openTermuxInstall}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Install from F-Droid
        </button>
        <p className="text-[11px] text-muted-foreground">
          After installing, return here and the bridge connects automatically.
        </p>
      </div>
    </div>
  );
}
