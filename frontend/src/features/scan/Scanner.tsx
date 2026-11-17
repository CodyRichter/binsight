import { useState } from "react";
import { CameraView } from "@/components/CameraView";
import { labelCode } from "./labelCode";
import { useScanner } from "./useScanner";

interface ScannerProps {
  onCode: (code: string) => void;
  /** What the last code led to, when it did not finish the task. */
  message?: string;
}

const refusedMessage = "Allow the camera for this site in the browser's settings to scan.";

/** The camera, finding Binsight labels and handing on their codes. */
export function Scanner({ onCode, message }: ScannerProps) {
  const [notALabel, setNotALabel] = useState(false);
  const { videoRef, refused } = useScanner((text) => {
    const code = labelCode(text);
    setNotALabel(code === null);
    if (code) onCode(code);
  });
  const status = refused
    ? refusedMessage
    : notALabel
      ? "That isn't a Binsight label"
      : (message ?? "Point the camera at a label");
  return <CameraView videoRef={videoRef} status={status} />;
}
