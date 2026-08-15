export function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

export function isTermuxInstalled(): boolean {
  return isAndroid() && !!(window as any).Android?.termuxInstalled?.();
}

export async function runTermuxCommand(command: string): Promise<string> {
  if (!isAndroid()) return "Termux bridge is only available on Android.";
  const android = (window as any).Android;
  if (!android?.runTermux) return "Termux bridge not found. Install Termux from F-Droid.";
  try {
    return await android.runTermux(command);
  } catch {
    return "Failed to communicate with Termux.";
  }
}

export function openTermuxInstall() {
  window.open("https://f-droid.org/en/packages/com.termux/", "_blank");
}
