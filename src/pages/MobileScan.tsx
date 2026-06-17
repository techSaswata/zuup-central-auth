import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanFace, Loader2, CheckCircle2, Camera, Upload, AlertCircle } from "lucide-react";
import QrScanner from 'qr-scanner';
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MobileScan() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  
  const [isScanning, setIsScanning] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  const handleScanSuccess = async (decodedText: string) => {
    setIsScanning(false);
    setIsSending(true);
    
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }

    try {
      // Broadcast the decoded text to the laptop
      const channel = supabase.channel(`aadhaar_session_${sessionId}`);
      
      await new Promise<void>((resolve, reject) => {
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            try {
              await channel.send({
                type: 'broadcast',
                event: 'scan_success',
                payload: { qrData: decodedText }
              });
              resolve();
            } catch (e) {
              reject(e);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(new Error(`Channel error: ${status}`));
          }
        });
      });
      
      setSuccess(true);
      toast.success("Sent to laptop!");
    } catch (err) {
      console.error("Broadcast error:", err);
      toast.error("Failed to sync with laptop. Try again.");
      setIsScanning(true);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!sessionId) {
      toast.error("No session ID found. Please scan the QR from your laptop again.");
      setIsScanning(false);
      return;
    }

    if (isScanning && !success && videoRef.current) {
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          if (result && result.data) {
            handleScanSuccess(result.data);
          }
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
          maxScansPerSecond: 30,
          preferredCamera: 'environment',
        }
      );

      scannerRef.current = scanner;

      scanner.start().catch((err) => {
        console.error("Camera start error:", err);
        setCameraError("Camera blocked or unavailable. Please use the upload button.");
        if (scannerRef.current) {
          scannerRef.current.stop();
          scannerRef.current.destroy();
          scannerRef.current = null;
        }
      });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [isScanning, sessionId, success]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      if (result && result.data) {
        handleScanSuccess(result.data);
      } else {
        toast.error("No QR code found in image.");
      }
    } catch (err) {
      console.error("Image scan error:", err);
      toast.error("Could not read QR code from image.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white p-4 font-mono flex flex-col items-center justify-center">
      <Card className="w-full max-w-md bg-[#151822] border-2 border-[#2a2f42] rounded-xl shadow-[8px_8px_0px_0px_rgba(42,47,66,1)]">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl font-bold uppercase tracking-wide text-white">Mobile Scanner</CardTitle>
          <CardDescription className="text-gray-400 text-sm">
            Point your camera at the Aadhaar QR code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 flex flex-col items-center">
          
          {!sessionId && (
            <div className="text-red-400 text-center text-sm font-bold p-4">
              Missing session. Scan the code from your laptop to pair.
            </div>
          )}

          {isScanning && sessionId && (
            <div className="w-full space-y-4">
              <div className="w-full bg-[#0d0f14] border-2 border-[#2a2f42] rounded-md overflow-hidden relative min-h-[300px] flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover"></video>
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/80">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-sm font-bold text-white">{cameraError}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => captureInputRef.current?.click()}
                  className="w-full font-bold uppercase tracking-wide h-14 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                >
                  <Camera className="mr-2 h-5 w-5" /> Snap Clear Photo
                </Button>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  ref={captureInputRef} 
                  onChange={handleFileUpload}
                  className="hidden" 
                />

                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full font-bold uppercase tracking-wide bg-primary/20 text-primary hover:bg-primary/30 h-10"
                  variant="secondary"
                >
                  <Upload className="mr-2 h-4 w-4" /> Upload from Gallery
                </Button>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload}
                  className="hidden" 
                />
              </div>
            </div>
          )}

          {isSending && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="text-blue-400 font-bold uppercase">Syncing to laptop...</p>
            </div>
          )}

          {success && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <p className="text-green-400 font-bold uppercase text-lg">Scan Complete</p>
              <p className="text-gray-400 text-sm text-center">
                You can now look at your laptop screen to see the details.
              </p>
              <Button 
                onClick={() => {
                  setSuccess(false);
                  setIsScanning(true);
                  setCameraError(null);
                }}
                variant="outline"
                className="mt-4 border-[#2a2f42] text-gray-300 hover:text-white"
              >
                Scan Another
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
