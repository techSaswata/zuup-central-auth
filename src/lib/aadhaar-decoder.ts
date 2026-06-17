import pako from 'pako';
import { JpxImage } from 'jpeg2000';
import { Buffer } from 'buffer';

export interface AadhaarData {
  email_mobile_indicator?: string;
  reference_id?: string;
  name?: string;
  dob?: string;
  gender?: string;
  care_of?: string;
  district?: string;
  landmark?: string;
  house?: string;
  location?: string;
  pincode?: string;
  post_office?: string;
  state?: string;
  street?: string;
  sub_district?: string;
  vtc?: string;
  aadhaar_last4?: string;
  photo_base64?: string;
  photo_mime?: string;
  signature_valid?: boolean;
}

export interface DecodeResult {
  success: boolean;
  data?: AadhaarData;
  error?: string;
}

function bigIntToBytes(bigIntStr: string): Uint8Array {
  let hex = BigInt(bigIntStr.trim()).toString(16);
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  const len = hex.length / 2;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return u8;
}

function jp2ToDataURL(jp2Bytes: Uint8Array): string {
  const jpx = new JpxImage();
  const buf = Buffer.from(jp2Bytes);
  jpx.parse(buf);
  
  const width = jpx.width;
  const height = jpx.height;
  const componentsCount = jpx.componentsCount;
  const tiles = jpx.tiles;
  if (!tiles || tiles.length === 0) throw new Error("No tiles found in JP2");
  
  const items = tiles[0].items;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Canvas context not available");

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  if (componentsCount === 3 || componentsCount === 4) {
      const step = componentsCount;
      for (let i = 0, j = 0; i < items.length; i += step, j += 4) {
          data[j] = items[i];
          data[j + 1] = items[i + 1];
          data[j + 2] = items[i + 2];
          data[j + 3] = componentsCount === 4 ? items[i + 3] : 255;
      }
  } else if (componentsCount === 1) {
      for (let i = 0, j = 0; i < items.length; i++, j += 4) {
          const val = items[i];
          data[j] = val;
          data[j + 1] = val;
          data[j + 2] = val;
          data[j + 3] = 255;
      }
  } else {
      throw new Error("Unsupported components count: " + componentsCount);
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

const UIDAI_PUBLIC_KEYS = [
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAh1+zYnvbcEm0Yz73s5u42odpUJMr9wv5bVw7sOE5nFNbrB+U++5I0f8cL2HoHnJOkwvLZzrD0jG/vxAKi6vii/gjEzUEgrkdIHxMP3D6GJs0MSQHiEXvIGOwPIH3BLtBOc3m28NVNT6Q9iq0gUwuxnlhV38UdNhCllqNYhWmAMPJkImgaKrRZvY2pWNs6gd+PlAF/9SO69x3+1meA8kPk2ZvQanZlx9tfaExeOe9or3NQiKy2+UbtXrpcoAfYbbWi1OUzXi5bJdhbGp239c1fX6UKyUM5IUMY+m3I7wu2WQ7lmeO2n/vwzQz/PKHXPWYu3bydWMLdCi07vOQBqzCKwIDAQAB",
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv1DSK9/qrW8RX1vDZMsE8xiiyJlj+6xxDtu+nSZDW9C/iajSqJ2QgLvRgweTw4suzzxZQseOE+kbqlbesNHc0lQjt9T+CGYrUTCbMI/a3zZbr3vPxz3VlN7iqr8U6ISUN53x+6qAc4Z/Pc66IqJA6zXBPKFZiHHMmi00eM14HgNWrLEkYHE5geBmBgEevznskS4Q+sJVX+4seJ/zadc35O4G6gvWZatlsB5STGSdes4TqF1k0FV4a0CF7vAzpUA4EtQohl6dnKWpfWYAJUxbSrH1OCLFBn1ABe9Yw5iZkIMFYauhyFzP16XCiG91TPoORIJ8ssIR9uf21o6rD82OJwIDAQAB",
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmMIJKj28JcTN1B72p2/pgzDCoguhs/rbIXgN/ybNNh0NVOrZV2KllrmT5VOYlMrABpvIp7JU/n6hma3/O14n7nvngJ/y3colh8rk7msDwVAO7ZuVD+GCzfaYPLLkUS+wqH7M7FOHIn/pyJo1Rkxm98lO3dyox5RuLG2Uqm7JfVIomm0t7QKJoM5rf8JNvPXdwsxN89eWlT2Bf7BF//G3FKiF7ZHfvIyyqte/3orRRG/M80QqLrDP1RIeOa53ZTgILXcyQOb2yZOqNH3iN2uSKRsusNO17To5FOb2J9Hd5wIMuDv3zw4MWTrKAWuTYon90QSeGRKv1d5AQNRt0x5dSwIDAQAB",
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv0HjbFpvu/kR+gTI2+svGNmW4eZHhTVBG/N+byaq3GH0SDM+jO5RW4BbXNzaSKc0I5mIyN1vQf2KmNV/3Xai6MokiiZrBRfM8a497zCMteHTAzSP1L0DmohUuBQh/s1hfqRIIWpfEu7noW2G8toK0ZOQR1E0FtinWNtqEeuxlNEKgfxkN4/vRzgvGFw+PPcoG5uMdcd7/DjDE1i20zmT+55DgIBrneCwrW7nIM0Md3BPOTV8iBwzjdVcdDHhMtSpi9UKUHw80sDRZp7ygB4Z0QmhSxCMCg9g7KPHYY+PVRC2sFreZBC6rtmIL+HMUPciRCCqMZLx3f6xRSD97lZr/wIDAQAB",
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAonIsDl8t5bpwftk/A27CsfC5VZMjkPrMDwvL8gyAoVwIi0iGhmty6yWrC/VaL+Brae29XMg7dMdwnbIUHmwHxovN+FnT2vfz/O0kHQcgVdwVSIR0tFwsmC+pVKpSqm//skgYYcZQhdhLZBWOn0PZ81ymm0jOkwBSIQKkyuCTv/1HSwjTLR0EBvaH9+Vb0iaiOEv1ikHDhMOXTxx8URWBnJJt463z7LuZBMSG8fXVMDl3vqY1hDZzKbXBaK/clRIXMff0jUOvfPMfabHju+eUnceosQwL3eurq96+oHahz4FmrfBqikHe3xQ7/4NdvSvVuwth0kcsI0ptRBG8m1NglQIDAQAB"
];

async function verifySignature(signedData: Uint8Array, signature: Uint8Array): Promise<boolean> {
  try {
    for (const pem of UIDAI_PUBLIC_KEYS) {
      const binaryDerString = window.atob(pem);
      const binaryDer = new Uint8Array(binaryDerString.length);
      for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
      }
      
      try {
        const key = await window.crypto.subtle.importKey(
          "spki",
          binaryDer.buffer,
          {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256"
          },
          false,
          ["verify"]
        );
        
        const isValid = await window.crypto.subtle.verify(
          "RSASSA-PKCS1-v1_5",
          key,
          signature,
          signedData
        );

        if (isValid) return true;
      } catch (err) {
        // Continue to next key
      }
    }
    
    return false;
  } catch (e) {
    console.error("Signature verification failed:", e);
    return false;
  }
}

export async function decodeAadhaarQR(qrString: string): Promise<DecodeResult> {
  try {
    const rawQr = qrString.trim();
    
    // Handle old XML format
    if (rawQr.startsWith('<')) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(rawQr, "text/xml");
      
      const parseError = xmlDoc.getElementsByTagName("parsererror");
      if (parseError.length > 0) {
        return { success: false, error: 'Failed to parse XML data' };
      }

      // The root element is usually PrintLetterBarcodeData
      const root = xmlDoc.documentElement;
      
      const result: AadhaarData = {};
      
      const fieldMap: Record<string, keyof AadhaarData> = {
        "uid": "aadhaar_last4", // We'll extract last 4 below
        "name": "name", 
        "gender": "gender",
        "yob": "dob", // Fallback if dob isn't present
        "dob": "dob", 
        "co": "care_of",
        "house": "house", 
        "street": "street", 
        "lm": "landmark",
        "loc": "location", 
        "vtc": "vtc", 
        "po": "post_office",
        "dist": "district", 
        "subdist": "sub_district",
        "state": "state", 
        "pc": "pincode"
      };

      for (const [xmlKey, resKey] of Object.entries(fieldMap)) {
        const val = root.getAttribute(xmlKey);
        if (val) {
          result[resKey] = val;
        }
      }

      // Format Aadhaar Last 4 if full UID was provided
      if (root.getAttribute("uid") && root.getAttribute("uid")!.length >= 4) {
        result.aadhaar_last4 = root.getAttribute("uid")!.slice(-4);
      }

      // Old XML doesn't have signature or photo
      return { success: true, data: result };
    }

    // Handle Secure QR Format (Big Integer)
    const isSecure = rawQr.match(/^\d{100,}$/);
    if (!isSecure) {
      return { success: false, error: 'Invalid QR string format.' };
    }

    const rawBytes = bigIntToBytes(rawQr);

    let decompressed: Uint8Array | null = null;
    const windowBitsOptions = [15, -15, 31, 47];

    // Try decompressing with different padded lengths
    for (let pad = 0; pad < 4; pad++) {
      let paddedBytes = rawBytes;
      if (pad > 0) {
        paddedBytes = new Uint8Array(rawBytes.length + pad);
        paddedBytes.set(rawBytes, pad);
      }
      
      for (const wbits of windowBitsOptions) {
        try {
          decompressed = pako.inflate(paddedBytes, { windowBits: wbits });
          break;
        } catch (e) {
          // Ignore and try next
        }
      }
      if (decompressed) break;
    }

    if (!decompressed) {
      return { success: false, error: 'Failed to decompress Aadhaar data (Zlib error)' };
    }

    const signedData = decompressed.slice(0, -256);
    const signature = decompressed.slice(-256);
    const data = signedData;

    const DELIMITER = 255;
    let parts: string[] = [];
    let start = 0;
    let dob_idx = -1;

    for (let i = 0; i < data.length; i++) {
      if (data[i] === DELIMITER) {
        const valBytes = data.slice(start, i);
        // Convert Latin-1 (ISO-8859-1) bytes to string
        const val = Array.from(valBytes).map(b => String.fromCharCode(b)).join('');
        parts.push(val);
        start = i + 1;

        if (dob_idx === -1 && ['M', 'F', 'T'].includes(val) && parts.length > 3) {
          dob_idx = parts.length - 2;
        }

        if (dob_idx !== -1 && parts.length === dob_idx + 13) {
          start = i + 1;
          break;
        }
      }
    }

    const result: AadhaarData = {};
    result.email_mobile_indicator = parts[0];

    if (dob_idx !== -1) {
      const getP = (i: number) => i < parts.length ? parts[i].trim() : "";
      result.reference_id = getP(dob_idx - 2);
      result.name = getP(dob_idx - 1);
      result.dob = getP(dob_idx);
      result.gender = getP(dob_idx + 1);
      result.care_of = getP(dob_idx + 2);
      result.district = getP(dob_idx + 3);
      result.landmark = getP(dob_idx + 4);
      result.house = getP(dob_idx + 5);
      result.location = getP(dob_idx + 6);
      result.pincode = getP(dob_idx + 7);
      result.post_office = getP(dob_idx + 8);
      result.state = getP(dob_idx + 9);
      result.street = getP(dob_idx + 10);
      result.sub_district = getP(dob_idx + 11);
      result.vtc = getP(dob_idx + 12);
    }

    if (result.reference_id && result.reference_id.length >= 4) {
      result.aadhaar_last4 = result.reference_id.substring(0, 4);
    }

    if (start < data.length) {
      let tail = data.length;
      const ind = parseInt(parts[0], 10) || 0;
      if (ind === 3) tail -= 64;
      else if (ind === 1 || ind === 2) tail -= 32;

      let photoBytes = data.slice(start, tail);

      let photoStart = -1;
      for (let j = 0; j < photoBytes.length - 3; j++) {
        if (photoBytes[j] === 0xFF && photoBytes[j+1] === 0x4F && photoBytes[j+2] === 0xFF && photoBytes[j+3] === 0x51) {
          photoStart = j;
          break;
        }
      }
      if (photoStart === -1) {
        for (let j = 0; j < photoBytes.length - 7; j++) {
          if (photoBytes[j] === 0x00 && photoBytes[j+1] === 0x00 && photoBytes[j+2] === 0x00 && photoBytes[j+3] === 0x0C &&
              photoBytes[j+4] === 0x6A && photoBytes[j+5] === 0x50 && photoBytes[j+6] === 0x20 && photoBytes[j+7] === 0x20) {
            photoStart = j;
            break;
          }
        }
      }
      if (photoStart !== -1) {
        photoBytes = photoBytes.slice(photoStart);
      }

      try {
        const dataUrl = jp2ToDataURL(photoBytes);
        result.photo_base64 = dataUrl.split(',')[1];
        result.photo_mime = "image/png";
      } catch (err) {
        console.error("Canvas JP2 decoding failed:", err);
        const CHUNK_SIZE = 0x8000;
        let c = [];
        for (let i = 0; i < photoBytes.length; i += CHUNK_SIZE) {
          c.push(String.fromCharCode.apply(null, Array.from(photoBytes.subarray(i, i + CHUNK_SIZE))));
        }
        result.photo_base64 = btoa(c.join(''));
        result.photo_mime = "image/jp2";
      }
    }

    result.signature_valid = await verifySignature(signedData, signature);

    return { success: true, data: result };

  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error occurred during parsing' };
  }
}
