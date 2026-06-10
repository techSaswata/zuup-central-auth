import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScanFace, ShieldCheck, AlertCircle, Loader2, QrCode, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Html5QrcodeScanner } from 'html5-qrcode';
import { decodeAadhaarQR, AadhaarData } from "@/lib/aadhaar-decoder";

export default function AadhaarVerification() {
  const [qrData, setQrData] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AadhaarData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isScanning) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: {width: 250, height: 250} },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          setQrData(decodedText);
          setIsScanning(false);
          if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
          }
          toast.success("QR Scanned Successfully!");
          // Automatically verify upon scanning
          handleVerify(decodedText);
        },
        (error) => {
          // ignore continuous scan errors
        }
      );
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isScanning]);

  const handleVerify = (dataToVerify: string = qrData) => {
    if (!dataToVerify.trim()) {
      toast.error("Please enter or scan the raw QR data.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    // Give UI a tiny moment to show loading state before heavy JS processing
    setTimeout(() => {
      const decoded = decodeAadhaarQR(dataToVerify.trim());
      
      if (decoded.success && decoded.data) {
        setResult(decoded.data);
        toast.success("Identity verified locally!");
      } else {
        setError(decoded.error || "Failed to decode Aadhaar data.");
        toast.error("Failed to decode Aadhaar.");
      }
      setLoading(false);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white p-6 md:p-12 font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-white uppercase flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-primary" />
            Identity Verification
          </h1>
          <p className="text-gray-400 text-lg">
            Securely verify your identity locally using your Aadhaar Offline QR Code. 
            No data is sent to any servers!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Input Section */}
          <Card className="bg-[#151822] border-2 border-[#2a2f42] rounded-xl shadow-[8px_8px_0px_0px_rgba(42,47,66,1)]">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold uppercase tracking-wide text-white">Provide QR</CardTitle>
                <CardDescription className="text-gray-400">
                  Scan or paste your Aadhaar QR.
                </CardDescription>
              </div>
              
              <Button 
                variant={isScanning ? "destructive" : "default"} 
                size="sm" 
                onClick={() => setIsScanning(!isScanning)}
                className="font-bold uppercase tracking-wide"
              >
                {isScanning ? <><X className="mr-2 h-4 w-4"/> Cancel</> : <><QrCode className="mr-2 h-4 w-4"/> Camera</>}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {isScanning ? (
                <div className="bg-[#0d0f14] border-2 border-[#2a2f42] rounded-md overflow-hidden relative min-h-[300px]">
                  <div id="qr-reader" className="w-full h-full text-black"></div>
                  {/* Style overrides for html5-qrcode */}
                  <style>{`
                    #qr-reader { border: none !important; }
                    #qr-reader__scan_region { background: #000; }
                    #qr-reader__dashboard { background: #151822; color: #fff; border-top: 1px solid #2a2f42; padding: 10px; }
                    #qr-reader__dashboard button { background: #3b82f6; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
                  `}</style>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="qrData" className="text-gray-300 font-semibold uppercase text-sm">Raw QR String</Label>
                  <Textarea
                    id="qrData"
                    placeholder="Paste the massive number string here... (e.g., 697941...)"
                    className="min-h-[200px] bg-[#0d0f14] border-[#2a2f42] text-white font-mono text-xs focus:ring-primary rounded-md"
                    value={qrData}
                    onChange={(e) => setQrData(e.target.value)}
                  />
                </div>
              )}

              <Button 
                onClick={() => handleVerify()} 
                disabled={loading || !qrData || isScanning}
                className="w-full h-14 text-lg font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-transparent transition-all rounded-md shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ScanFace className="mr-2 h-6 w-6" />
                    Decode Locally
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Result Section */}
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-red-950/50 border-red-900 text-red-200">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle className="font-bold uppercase tracking-wide">Decoding Error</AlertTitle>
                <AlertDescription className="font-mono text-sm mt-2">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {!result && !error && (
              <Card className="bg-[#151822]/50 border-2 border-dashed border-[#2a2f42] rounded-xl h-full flex flex-col items-center justify-center p-12 text-center opacity-70 min-h-[400px]">
                <ShieldCheck className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-400 uppercase tracking-wide">Awaiting Data</h3>
                <p className="text-gray-500 mt-2 text-sm max-w-xs">
                  Your decoded identity details will appear here securely.
                </p>
              </Card>
            )}

            {result && (
              <Card className="bg-[#151822] border-2 border-blue-500/30 rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(59,130,246,0.15)]">
                <div className="p-4 text-center font-bold uppercase tracking-widest text-sm bg-blue-600/20 text-blue-400 border-b-2 border-blue-500/30 flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> LOCAL DECODE SUCCESS
                </div>
                
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Photo Placeholder */}
                    <div className="shrink-0 flex flex-col items-center gap-3">
                      <div className="w-32 h-40 bg-[#0d0f14] border-2 border-[#2a2f42] rounded-md overflow-hidden relative shadow-inner">
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 text-xs p-2 text-center border-2 border-dashed border-[#2a2f42] m-2 rounded">
                          <ScanFace className="w-8 h-8 mb-2 opacity-50" />
                          Photo Decode Skipped
                        </div>
                        {/* Scanline overlay for aesthetic */}
                        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none mix-blend-overlay"></div>
                      </div>
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Resident</div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Full Name</p>
                        <p className="text-xl font-bold text-white uppercase">{result.name || "N/A"}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">DOB</p>
                          <p className="text-base text-gray-200">{result.dob || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Gender</p>
                          <p className="text-base text-gray-200">{result.gender || "N/A"}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Aadhaar No.</p>
                        <p className="text-lg font-mono text-blue-400 bg-blue-900/20 px-2 py-1 rounded inline-block">
                          XXXX XXXX {result.aadhaar_last4 || "????"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Address</p>
                        <p className="text-sm text-gray-400 capitalize leading-relaxed">
                          {[result.care_of, result.house, result.street, result.landmark, result.vtc, result.district, result.state, result.pincode].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
