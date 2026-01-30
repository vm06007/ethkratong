import { PinataSDK } from "pinata-web3";

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

/**
 * Upload flow data to IPFS via Pinata
 * @param flowData The flow data to upload
 * @returns The CID (Content Identifier) for the uploaded flow
 */
export async function uploadFlowToIPFS(flowData: FlowShareData): Promise<string> {
  try {
    const client = getClient();

    // Convert flow data to JSON
    const jsonContent = JSON.stringify(flowData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const file = new File([blob], 'flow.json', { type: 'application/json' });

    // Upload to Pinata
    const upload = await client.upload.file(file);

    const cid = upload.IpfsHash;
    console.log('Uploaded to IPFS with CID:', cid);

    return cid;
  } catch (error) {
    console.error('Failed to upload flow to IPFS:', error);
    throw new Error(`Failed to upload flow: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download flow data from IPFS using CID
 * @param cid The Content Identifier for the flow
 * @returns The flow data
 */
export async function downloadFlowFromIPFS(cid: string): Promise<FlowShareData> {
  try {
    // Use Pinata gateway to fetch the content
    const gatewayUrl = `https://${PINATA_GATEWAY}/ipfs/${cid}`;

    const response = await fetch(gatewayUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.status} ${response.statusText}`);
    }

    const flowData = await response.json();

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
    throw new Error(`Failed to load flow: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the shareable URL for a flow CID
 * @param cid The Content Identifier
 * @returns The full URL to share
 */
export function getShareUrl(cid: string): string {
  // Use custom base URL from env if provided, otherwise use current origin
  const baseUrl = import.meta.env.VITE_SHARE_BASE_URL || window.location.origin;
  return `${baseUrl}?s=${cid}`;
}
