import { useEffect, useRef, useState } from "react";

const lookEveryMs = 200;

type Look = (video: HTMLVideoElement) => Promise<string | undefined>;

async function openCamera(): Promise<MediaStream | null> {
  // Without a secure address the browser offers no camera at all.
  if (!navigator.mediaDevices) return null;
  return navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" }, audio: false })
    .catch(() => null);
}

async function qrLook(): Promise<Look> {
  const { qrDetector } = await import("./detector");
  const detector = qrDetector();
  return async (video) => (await detector.detect(video))[0]?.rawValue;
}

/** Shows the camera in a video and reports each new QR code's text it sees. */
export function useScanner(onText: (text: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [refused, setRefused] = useState(false);
  const latest = useRef(onText);
  useEffect(() => {
    latest.current = onText;
  });
  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let last: string | undefined;
    async function start() {
      stream = await openCamera();
      const video = videoRef.current;
      if (stopped || !video) return;
      if (!stream) return setRefused(true);
      video.srcObject = stream;
      await video.play();
      const look = await qrLook();
      const next = async () => {
        if (stopped) return;
        const text = video.readyState >= 2 ? await look(video) : undefined;
        if (text && text !== last) latest.current(text);
        last = text ?? last;
        timer = window.setTimeout(() => void next(), lookEveryMs);
      };
      void next();
    }
    void start();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  return { videoRef, refused };
}
