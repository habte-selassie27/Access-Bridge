import { useState, useCallback, useRef } from "react";
import { Camera } from "lucide-react";

export interface CameraCaptureProps {
  onPhotoCapture: (file: File) => void;
}

export function CameraCapture({ onPhotoCapture }: CameraCaptureProps) {
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError("Camera access is not available. Please upload a file instead.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob: Blob | null) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      stopCamera();
      onPhotoCapture(file);
    }, "image/jpeg");
  }, [onPhotoCapture, stopCamera]);

  return (
    <div className="space-y-3">
      {stream && videoRef.current && (
        <>
          <div className="relative rounded-lg border border-border bg-background overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-64 object-cover"
            />
            <button
              type="button"
              onClick={capturePhoto}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 touch-target rounded-full bg-accent p-3 text-accent-foreground shadow-lg"
              aria-label="Capture photo"
            >
              <Camera size={24} strokeWidth={2.5} />
            </button>
          </div>
          <button
            type="button"
            onClick={stopCamera}
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-secondary hover:bg-surface-muted"
          >
            Cancel camera
          </button>
        </>
      )}
      {!stream && (
        <button
          type="button"
          onClick={startCamera}
          className="touch-target w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-4 text-sm text-text-secondary hover:bg-surface-muted"
        >
          <Camera size={20} strokeWidth={2} />
          <span>Take photo</span>
        </button>
      )}
      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-danger text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
