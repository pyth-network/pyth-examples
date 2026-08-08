import { exportMetadataForServer } from './chat-metadata';

/**
 * Export all chat metadata as JSON for server upload
 * This function can be called from the browser console or a debug UI
 */
export const exportChatMetadata = () => {
  const jsonData = exportMetadataForServer();

  // Log to console for easy copying
  console.log('=== CHAT METADATA EXPORT ===');
  console.log(jsonData);
  console.log('=== END EXPORT ===');

  // Create a downloadable file
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `chat-metadata-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return jsonData;
};

// Expose to window for easy console access in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).exportChatMetadata = exportChatMetadata;
}
