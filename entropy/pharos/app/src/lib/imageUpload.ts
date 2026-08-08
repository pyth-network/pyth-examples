// Image upload utilities for raffle system using Pinata IPFS

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Pinata IPFS upload function
export const uploadToPinata = async (file: File): Promise<UploadResult> => {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'File must be an image'
      };
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        error: 'File size must be less than 10MB'
      };
    }

    const formData = new FormData();
    formData.append('file', file);
    
    // Add metadata
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        raffleImage: 'true',
        uploadedAt: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);
    
    // Add options
    const options = JSON.stringify({
      cidVersion: 0
    });
    formData.append('pinataOptions', options);
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': process.env.NEXT_PUBLIC_PINATA_API_KEY || '',
        'pinata_secret_api_key': process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || '',
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Pinata upload failed: ${response.statusText} - ${errorData.error || 'Unknown error'}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Main upload function (Pinata only)
export const uploadImage = async (file: File): Promise<UploadResult> => {
  return await uploadToPinata(file);
};

// 5. Convert file to base64 (fallback)
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// 6. Validate image dimensions (square)
export const validateImageDimensions = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(img.width === img.height);
    };
    img.onerror = () => resolve(false);
    img.src = URL.createObjectURL(file);
  });
};
