import { PinataSDK } from "pinata-web3";
import { encryptData, decryptData, generateEncryptionKey } from "./crypto";

// Get API credentials from environment variables
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || '';
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'gateway.pinata.cloud';

let pinata: PinataSDK | null = null;

function getClient(): PinataSDK {
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured. Please set VITE_PINATA_JWT in your .env file.');
  }

  if (!pinata) {
    pinata = new PinataSDK({
      pinataJwt: PINATA_JWT,
      pinataGateway: PINATA_GATEWAY,
    });
  }

  return pinata;
}

export interface FlowShareData {
  nodes: any[];
  edges: any[];
  name?: string;
  timestamp: number;
}

export interface UploadResult {
  cid: string;
  encryptionKey?: string;
}

/**
 * Upload flow data to IPFS via Pinata
 * @param flowData The flow data to upload
 * @param encrypted Whether to encrypt the data before uploading
 * @returns The CID and encryption key (if encrypted)
 */
export async function uploadFlowToIPFS(
  flowData: FlowShareData,
  encrypted: boolean = false
): Promise<UploadResult> {
  try {
    const client = getClient();

    // Convert flow data to JSON
    const jsonContent = JSON.stringify(flowData, null, 2);

    let fileContent: string;
    let encryptionKey: string | undefined;

    if (encrypted) {
      // Generate encryption key and encrypt the data
      encryptionKey = generateEncryptionKey();
      fileContent = await encryptData(jsonContent, encryptionKey);
      console.log('Encrypted flow data before upload');
    } else {
      fileContent = jsonContent;
    }

    const blob = new Blob([fileContent], { type: encrypted ? 'application/octet-stream' : 'application/json' });
    const file = new File([blob], encrypted ? 'flow.encrypted' : 'flow.json', {
      type: encrypted ? 'application/octet-stream' : 'application/json'
    });

    // Upload to Pinata
    const upload = await client.upload.file(file);

    const cid = upload.IpfsHash;
    console.log('Uploaded to IPFS with CID:', cid, encrypted ? '(encrypted)' : '(public)');

    return { cid, encryptionKey };
  } catch (error) {
    console.error('Failed to upload flow to IPFS:', error);
    throw new Error(`Failed to upload flow: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download flow data from IPFS using CID
 * @param cid The Content Identifier for the flow
 * @param encryptionKey Optional encryption key for private flows
 * @returns The flow data
 */
export async function downloadFlowFromIPFS(
  cid: string,
  encryptionKey?: string
): Promise<FlowShareData> {
  try {
    // Use Pinata gateway to fetch the content
    const gatewayUrl = `https://${PINATA_GATEWAY}/ipfs/${cid}`;

    const response = await fetch(gatewayUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.status} ${response.statusText}`);
    }

    let flowData: FlowShareData;

    if (encryptionKey) {
      // Encrypted flow - fetch as text and decrypt
      const encryptedContent = await response.text();
      const decryptedJson = await decryptData(encryptedContent, encryptionKey);
      flowData = JSON.parse(decryptedJson);
      console.log('Decrypted private flow from IPFS');
    } else {
      // Public flow - parse JSON directly
      flowData = await response.json();
    }

    // Validate the flow data structure
    if (!flowData.nodes || !Array.isArray(flowData.nodes)) {
      throw new Error('Invalid flow data: missing or invalid nodes array');
    }

    if (!flowData.edges || !Array.isArray(flowData.edges)) {
      throw new Error('Invalid flow data: missing or invalid edges array');
    }

    return flowData as FlowShareData;
  } catch (error) {
    console.error('Failed to download flow from IPFS:', error);

    // Provide more specific error message if decryption fails
    if (error instanceof Error && error.message.includes('decrypt')) {
      throw new Error('Failed to decrypt flow. The link may be incomplete or corrupted.');
    }

    throw new Error(`Failed to load flow: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the shareable URL for a flow CID
 * @param cid The Content Identifier
 * @param encryptionKey Optional encryption key for private flows
 * @param autoExecute Whether to automatically execute the flow on load
 * @returns The full URL to share
 */
export function getShareUrl(cid: string, encryptionKey?: string, autoExecute?: boolean): string {
  // Use custom base URL from env if provided, otherwise use current origin
  const baseUrl = import.meta.env.VITE_SHARE_BASE_URL || window.location.origin;
  let url = `${baseUrl}?s=${cid}`;

  // Add auto-execute parameter if enabled
  if (autoExecute) {
    url += '&autoexec=1';
  }

  // For private flows, add the encryption key in the URL fragment
  // Fragment (after #) is never sent to the server, stays client-side only
  if (encryptionKey) {
    return `${url}#key=${encodeURIComponent(encryptionKey)}`;
  }

  return url;
}

/**
 * Parse encryption key from URL fragment
 * @returns The encryption key if present in URL fragment
 */
export function getEncryptionKeyFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  const fragment = window.location.hash;
  if (!fragment) return undefined;

  // Parse fragment as query string (format: #key=abc123)
  const params = new URLSearchParams(fragment.slice(1)); // Remove the # prefix
  const key = params.get('key');

  return key ? decodeURIComponent(key) : undefined;
}
