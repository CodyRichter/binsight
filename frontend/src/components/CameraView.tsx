import type { RefObject } from "react";
import classes from "./CameraView.module.css";

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** One line under the picture: what to do, or why nothing happened. */
  status: string;
}

/** What the camera sees while scanning, with a line saying what it found. */
export function CameraView({ videoRef, status }: CameraViewProps) {
  return (
    <div className={classes.camera}>
      <video ref={videoRef} className={classes.video} aria-label="Camera" muted playsInline />
      <p className={classes.status} role="status">
        {status}
      </p>
    </div>
  );
}
