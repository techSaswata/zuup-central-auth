import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ScanFace, ShieldCheck, AlertCircle, Loader2, QrCode, X, Smartphone, Upload, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import QrScanner from 'qr-scanner';
import { decodeAadhaarQR, AadhaarData } from "@/lib/aadhaar-decoder";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const VirtualAadhaarCard = ({ data }: { data: AadhaarData }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("");
  const [glare, setGlare] = useState("transparent");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Rotate max 10 degrees
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    
    // Glare
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;
    setGlare(`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.4) 0%, transparent 50%)`);
  };

  const handleMouseLeave = () => {
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    setGlare("transparent");
  };

  const displayAadhaar = data.aadhaar_last4 ? `XXXX XXXX ${data.aadhaar_last4}` : "XXXX XXXX XXXX";

  return (
    <div className="w-full flex justify-center py-4" style={{ perspective: "1000px" }}>
      <div 
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full max-w-[450px] aspect-[1.58] rounded-xl overflow-hidden shadow-2xl transition-transform duration-200 ease-out text-black border border-[#d2cbbb] select-none"
        style={{ 
          transform, 
          transformStyle: "preserve-3d",
          backgroundImage: "url('/card-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        {/* Glare Overlay */}
        <div className="absolute inset-0 z-50 pointer-events-none transition-background duration-200 mix-blend-overlay" style={{ background: glare }} />

        {/* Top Header Background */}
        <div className="absolute top-0 left-0 w-full h-12 flex items-center justify-center pt-2">
           <div className="flex items-center justify-center gap-2">
             <img src="/emblem.png" alt="Emblem" className="w-10 h-10 object-contain mix-blend-multiply" />
             <div className="flex flex-col items-center">
               <p className="text-[11px] font-bold text-red-700 leading-none mb-[2px]">भारत सरकार</p>
               <p className="text-[11px] font-bold text-green-700 leading-none">Government of India</p>
             </div>
           </div>
        </div>

        {/* Content */}
        <div className="absolute top-[3.5rem] left-0 w-full px-5 flex gap-5">
          {/* Photo Box */}
          <div className="w-[85px] h-[105px] bg-[#e1dfda] border-2 border-white shadow-sm flex flex-col items-center justify-center overflow-hidden shrink-0 relative">
             {data.photo_base64 ? (
               <img 
                 src={`data:${data.photo_mime || 'image/jp2'};base64,${data.photo_base64}`} 
                 alt="Resident" 
                 className="w-full h-full object-cover"
                 onError={(e) => {
                   e.currentTarget.style.display = 'none';
                   const parent = e.currentTarget.parentElement;
                   if (parent && !parent.querySelector('.fallback-text')) {
                     const fallback = document.createElement('div');
                     fallback.className = 'fallback-text text-[8px] text-gray-500 font-bold text-center px-1 uppercase tracking-wider absolute inset-0 flex items-center justify-center bg-[#e1dfda]';
                     fallback.innerText = 'JP2 Format Unsupported';
                     parent.appendChild(fallback);
                   }
                 }}
               />
             ) : (
               <>
                 <ScanFace className="w-10 h-10 text-gray-400 mb-1 opacity-50" />
                 <span className="text-[8px] text-gray-500 font-bold text-center px-1 uppercase tracking-wider">Photo Decode Skipped</span>
               </>
             )}
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col pt-1 text-[12px] leading-tight font-sans tracking-wide">
            <div className="mb-3">
              <p className="font-extrabold text-[15px] uppercase text-gray-900">{data.name || "N/A"}</p>
            </div>
            
            <div className="flex gap-6 mb-3">
              <div>
                <p className="text-gray-500 font-semibold mb-0.5">जन्म तिथि / DOB</p>
                <p className="font-bold text-gray-900">{data.dob || "N/A"}</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div>
                <p className="text-gray-500 font-semibold mb-0.5">लिंग / Gender</p>
                <p className="font-bold text-gray-900">{data.gender || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle Watermark or design elements could go here */}

        {/* Bottom Aadhaar Number & Red Bar */}
        <div className="absolute bottom-0 left-0 w-full">
           <div className="text-center mb-1.5">
             <p className="text-[26px] font-extrabold tracking-[4px] font-mono text-gray-900">{displayAadhaar}</p>
           </div>
           <div className="h-1 w-full bg-[#E53E3E]" />
           <div className="bg-[#E7F3E8] py-1.5 flex items-center justify-center border-t border-green-200">
             <p className="text-[#E53E3E] font-bold text-[13px] tracking-wide">मेरा <span className="text-gray-900">आधार</span>, <span className="text-gray-900">मेरी पहचान</span></p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default function AadhaarVerification() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [qrData, setQrData] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AadhaarData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mobile pairing state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mobileUrl, setMobileUrl] = useState<string | null>(null);

  const handleScanSuccess = (decodedText: string) => {
    setQrData(decodedText);
    setIsScanning(false);
    toast.success("QR Scanned Successfully!");
    handleVerify(decodedText);
  };

  useEffect(() => {
    if (isScanning) {
      setSessionId(null);
      setMobileUrl(null);
      setCameraError(null);

      if (videoRef.current) {
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
    } else {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      if (result && result.data) {
        setQrData(result.data);
        setIsScanning(false);
        toast.success("QR Scanned from Image!");
        handleVerify(result.data);
      } else {
        toast.error("No QR code found in image.");
      }
    } catch (err) {
      console.error("Image scan error:", err);
      toast.error("Could not read QR code from image. Make sure it's clear and well-lit.");
    }
  };

  // Initialize mobile pairing on mount
  useEffect(() => {
    const newSessionId = typeof crypto.randomUUID === "function" 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
    setSessionId(newSessionId);
    setMobileUrl(`${window.location.origin}/mobile-scan?session_id=${newSessionId}`);

    const channel = supabase.channel(`aadhaar_session_${newSessionId}`);
    channel.on('broadcast', { event: 'scan_success' }, (payload) => {
      toast.success("Received scan data from mobile!");
      if (payload.payload && payload.payload.qrData) {
        setQrData(payload.payload.qrData);
        handleVerify(payload.payload.qrData);
      }
      setSessionId(null);
      setMobileUrl(null);
      supabase.removeChannel(channel);
    }).subscribe();

    return () => {
      supabase.removeAllChannels();
    };
  }, []);

  const handleVerify = (dataToVerify: string = qrData) => {
    if (!dataToVerify.trim()) {
      toast.error("Please enter or scan the raw QR data.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    setTimeout(async () => {
      const decoded = await decodeAadhaarQR(dataToVerify.trim());
      
      if (decoded.success && decoded.data) {
        setResult(decoded.data);
        toast.success("Identity verified locally!");
        
        // Save to user profile
        if (updateProfile) {
          const d = decoded.data;
          
          // Only map verified data
          if (d.signature_valid !== false) {
            const updates: any = {};
            if (d.aadhaar_last4) updates.aadhaar_last4 = d.aadhaar_last4;
            if (d.name) {
              updates.full_name = d.name;
              updates.name = d.name;
            }
            if (d.photo_base64) {
              updates.avatar_url = `data:${d.photo_mime || 'image/png'};base64,${d.photo_base64}`;
            }
            if (d.house) updates.address_line1 = d.house;
            if (d.street || d.landmark) updates.address_line2 = [d.street, d.landmark].filter(Boolean).join(", ");
            if (d.vtc || d.district) updates.city = d.vtc || d.district;
            if (d.state) updates.state_region = d.state;
            if (d.pincode) updates.postal_code = d.pincode;
            
            await updateProfile(updates);
            toast.success("Profile updated with Aadhaar data. Redirecting...");
            
            // Auto redirect back to manage account
            setTimeout(() => {
              navigate("/manage");
            }, 3500);
          }
        }
      } else {
        setError(decoded.error || "Failed to decode Aadhaar data.");
        toast.error("Failed to decode Aadhaar.");
      }
      setLoading(false);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e8eaf0] p-6 md:p-12" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div className="max-w-4xl mx-auto space-y-8">
        
        <button 
          onClick={() => navigate("/manage")}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa", padding: "8px 16px", borderRadius: "12px", cursor: "pointer", fontSize: "14px", fontWeight: 500, width: "fit-content" }}
        >
          <ArrowLeft size={16} /> Back to Settings
        </button>

        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-[#e8eaf0] uppercase flex items-center gap-3">
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
                <CardTitle className="text-2xl font-bold uppercase tracking-wide text-white">Scan with Mobile</CardTitle>
                <CardDescription className="text-gray-400">
                  Point your phone's camera at this QR code to securely pair devices.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {sessionId && mobileUrl ? (
                <div className="bg-[#0d0f14] border-2 border-[#2a2f42] rounded-md overflow-hidden flex flex-col items-center justify-center py-8">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mobileUrl)}&margin=0`} 
                    alt="Scan with mobile" 
                    className="w-48 h-48 rounded bg-white p-2"
                  />
                  <p className="mt-4 text-sm font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Waiting for mobile...
                  </p>
                </div>
              ) : (
                <div className="bg-[#0d0f14] border-2 border-[#2a2f42] rounded-md overflow-hidden flex flex-col items-center justify-center py-8 min-h-[250px]">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                </div>
              )}
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
              <div className="flex flex-col gap-6">
                <div className="text-center space-y-4 mb-2">
                  <h2 className="text-2xl font-bold uppercase tracking-wide">Identity Verified</h2>
                  {result.signature_valid === true && (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-md flex items-center justify-center gap-2 inline-flex w-fit mx-auto">
                      <ShieldCheck className="w-5 h-5" />
                      <span className="font-bold text-xs uppercase tracking-wider">Verified with Official UIDAI Certificate</span>
                    </div>
                  )}
                  {result.signature_valid === false && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md flex items-center justify-center gap-2 inline-flex w-fit mx-auto">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-bold text-xs uppercase tracking-wider">Signature Mismatch - Warning</span>
                    </div>
                  )}
                </div>
                
                <VirtualAadhaarCard data={result} />
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
