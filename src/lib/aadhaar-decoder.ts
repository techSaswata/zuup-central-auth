import pako from 'pako';

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

export function decodeAadhaarQR(qrString: string): DecodeResult {
  try {
    const isSecure = qrString.trim().match(/^\d{100,}$/);
    if (!isSecure) {
      if (qrString.trim().startsWith('<')) {
        return { success: false, error: 'Old XML format is not supported locally.' };
      }
      return { success: false, error: 'Invalid QR string format.' };
    }

    const rawBytes = bigIntToBytes(qrString);

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

    // signature is last 256 bytes (ignored for frontend parsing)
    const data = decompressed.slice(0, -256);

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

    return { success: true, data: result };

  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error occurred during parsing' };
  }
}
