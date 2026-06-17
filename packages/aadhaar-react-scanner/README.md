# Aadhaar React Scanner

A pure Javascript, zero-backend, client-side library to decode Aadhaar Secure QR codes, extract biometric JP2 photos, cryptographically verify UIDAI signatures, and render a beautiful 3D virtual identity card.

## Features
- **Local Decoding**: Decodes the massive Aadhaar integer strings into raw demographic data completely offline.
- **JP2 Photo Extraction**: The only JS library that natively decodes the embedded JPEG 2000 biometric photo into a web-friendly PNG entirely in the browser using HTML5 Canvas.
- **UIDAI Cryptographic Verification**: Uses the Web Crypto API to automatically verify the 256-byte RSA signature against the historical database of official UIDAI public keys.
- **Backward Compatible**: Supports parsing older XML-format Aadhaar QR codes out of the box.
- **3D React UI**: Comes with a hyper-realistic, glare-enabled, interactive 3D Aadhaar Card component.

## Installation

```bash
npm install aadhaar-react-scanner
```

## Usage

### 1. Decoding the QR Data
Pass the raw QR string (either the massive integer or the old XML string) directly into the decoder.

```typescript
import { decodeAadhaarQR } from 'aadhaar-react-scanner';

const rawQrString = "697941..."; // Scanned from the QR code

const verify = async () => {
  const result = await decodeAadhaarQR(rawQrString);
  
  if (result.success) {
    console.log("Resident Name:", result.data.name);
    console.log("Valid Signature?", result.data.signature_valid);
  } else {
    console.error("Failed to decode:", result.error);
  }
}
```

### 2. Displaying the 3D Card
If the decode is successful, pass the data directly into the React component to render a stunning virtual card.

```tsx
import { VirtualAadhaarCard } from 'aadhaar-react-scanner';

function MyVerificationPage() {
  // Assuming 'result.data' from decodeAadhaarQR
  return <VirtualAadhaarCard data={result.data} />;
}
```

## Security
This library is entirely client-side. No data is ever transmitted to any external servers. The cryptographic signature verification ensures that any manipulated QR data is immediately flagged as a `Signature Mismatch`.
# aadharreader
