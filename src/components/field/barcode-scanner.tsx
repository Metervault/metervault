"use client";

import { useEffect, useRef, useState } from "react";

type Detector = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> };

export function BarcodeScanner({ onResult, onClose }: { onResult: (value: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onResultRef = useRef(onResult);
  const [message, setMessage] = useState("Point the camera at the barcode.");
  onResultRef.current = onResult;

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    let raf = 0;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        setMessage("Camera permission is blocked. Type the number instead.");
        return;
      }
      const video = videoRef.current;
      if (!video || stopped) return;
      video.srcObject = stream;
      await video.play();

      const BarcodeDetector = (window as Window & { BarcodeDetector?: new (options?: { formats?: string[] }) => Detector }).BarcodeDetector;
      if (BarcodeDetector) {
        const detector = new BarcodeDetector({ formats: ["qr_code", "code_128", "code_39", "ean_13", "codabar", "data_matrix"] });
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes.find((code) => code.rawValue)?.rawValue;
            if (value) {
              onResultRef.current(value);
              return;
            }
          } catch {
            setMessage("The scanner could not read that frame. Hold steady.");
          }
          raf = window.setTimeout(() => void tick(), 250);
        };
        void tick();
        return;
      }

      setMessage("Starting the backup scanner…");
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (stopped) return;
      const reader = new BrowserMultiFormatReader();
      await reader.decodeFromVideoElement(video, (result) => {
        const value = result?.getText();
        if (value && !stopped) onResultRef.current(value);
      });
    }

    void start();
    return () => {
      stopped = true;
      window.clearTimeout(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black text-white">
      <video ref={videoRef} className="min-h-0 flex-1 object-cover" muted playsInline />
      <div className="space-y-3 p-4">
        <p className="text-center text-sm">{message}</p>
        <button type="button" onClick={onClose} className="min-h-12 w-full rounded-md bg-white text-base font-semibold text-black">
          Type it instead
        </button>
      </div>
    </div>
  );
}
