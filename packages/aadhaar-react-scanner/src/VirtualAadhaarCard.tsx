import React, { useState, useRef } from "react";
import { ScanFace } from "lucide-react";
import { AadhaarData } from "./decoder";

// Import assets as base64/data URLs
import emblemSrc from "./assets/emblem.png";
import cardBgSrc from "./assets/card-bg.png";

export const VirtualAadhaarCard = ({ data }: { data: AadhaarData }) => {
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
          backgroundImage: `url('${cardBgSrc}')`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        {/* Glare Overlay */}
        <div className="absolute inset-0 z-50 pointer-events-none transition-background duration-200 mix-blend-overlay" style={{ background: glare }} />

        {/* Top Header Background */}
        <div className="absolute top-0 left-0 w-full h-12 flex items-center justify-center pt-2">
           <div className="flex items-center justify-center gap-2">
             <img src={emblemSrc} alt="Emblem" className="w-10 h-10 object-contain mix-blend-multiply" />
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
