import { useCallback, useRef, useEffect } from "react";
import { Camera } from "lucide-react";
import { downscaleImage } from "../../lib/image.ts";
import { useMachine, cameraReducer, initialCameraState } from "../../lib/state/index.ts";

export interface CameraCaptureProps {
  onPhotoCapture: (file: File) => void;
}

export function CameraCapture({ onPhotoCapture }: CameraCaptureProps) {
  const [cam, send] = useMachine(cameraReducer, initialCameraState);
  const stream = cam.stream;
  const error = cam.error;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    send({ type: "REQUEST" });
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      send({ type: "GRANTED", stream: mediaStream });
    } catch {
      send({ type: "DENIED", error: "Camera access is not available. Upload a file instead." });
    }
  }, [send]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    send({ type: "STOP" });
  }, [stream, send]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(async (blob: Blob | null) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      const processed = await downscaleImage(file);
      stopCamera();
      onPhotoCapture(processed);
    }, "image/jpeg", 0.8);
  }, [onPhotoCapture, stopCamera]);

  return (
    <div>
      {stream ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg border border-border bg-background">
            <video ref={videoRef} autoPlay playsInline muted className="h-56 w-full object-cover" />
            <button
              type="button"
              onClick={capturePhoto}
              className="touch-target absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-brand p-3 text-inverse shadow-sm"
              aria-label="Capture photo"
            >
              <Camera size={24} strokeWidth={2.5} />
            </button>
          </div>
          <button
            type="button"
            onClick={stopCamera}
            className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-subtle transition-colors hover:bg-neutral-subtle-hovered"
          >
            Cancel camera
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startCamera}
          className="touch-target flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-3 text-sm font-medium text-text transition-colors hover:border-brand hover:bg-surface-muted hover:text-brand"
        >
          <Camera size={16} strokeWidth={2} aria-hidden="true" />
          <span>Take a photo</span>
        </button>
      )}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      {error && (
        <p role="alert" className="mt-2 text-[0.75rem] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
