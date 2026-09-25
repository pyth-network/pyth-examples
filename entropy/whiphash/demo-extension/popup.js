// WhipHash Extension - Embedded Website Version

let currentUrl = 'http://localhost:3000';
let iframe = null;
let loadingEl = null;
let errorEl = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 WhipHash extension popup loaded');
  
  iframe = document.getElementById('whiphashFrame');
  loadingEl = document.getElementById('loading');
  errorEl = document.getElementById('error');
  
  // Set up control buttons
  document.getElementById('refreshBtn').addEventListener('click', refreshApp);
  document.getElementById('fullscreenBtn').addEventListener('click', openFullscreen);
  document.getElementById('walletBtn').addEventListener('click', openWalletMode);
  
  // Load the app
  loadApp();
});

function loadApp() {
  console.log('🚀 Loading WhipHash app...');
  
  // Show loading
  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  iframe.style.display = 'none';
  
  // Try to load the app
  const urls = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3000/test',
    'http://127.0.0.1:3000/test'
  ];
  
  let urlIndex = 0;
  
  function tryNextUrl() {
    if (urlIndex >= urls.length) {
      showError();
      return;
    }
    
    currentUrl = urls[urlIndex];
    console.log(`🔍 Trying URL ${urlIndex + 1}/${urls.length}: ${currentUrl}`);
    
    iframe.src = currentUrl;
    
    // Set up iframe load handlers
    iframe.onload = () => {
      console.log(`✅ Successfully loaded ${currentUrl}`);
      loadingEl.style.display = 'none';
      errorEl.style.display = 'none';
      iframe.style.display = 'block';
      
      // Inject wallet access into the iframe
      injectWalletAccess();
    };
    
    iframe.onerror = () => {
      console.error(`❌ Failed to load ${currentUrl}`);
      urlIndex++;
      setTimeout(tryNextUrl, 1000); // Try next URL after 1 second
    };
    
    // Timeout fallback
    setTimeout(() => {
      if (loadingEl.style.display !== 'none') {
        console.error(`⏰ Timeout loading ${currentUrl}`);
        urlIndex++;
        tryNextUrl();
      }
    }, 5000);
  }
  
  tryNextUrl();
}

function refreshApp() {
  console.log('🔄 Refreshing app...');
  loadApp();
}

function openFullscreen() {
  console.log('⛶ Opening fullscreen...');
  chrome.tabs.create({ 
    url: currentUrl
  });
}

function openWalletMode() {
  console.log('🔗 Opening wallet-compatible mode...');
  // Open in a new tab with special parameters to indicate wallet mode
  chrome.tabs.create({ 
    url: currentUrl + '?wallet-mode=true&source=extension'
  });
}

function showError() {
  console.error('❌ All URLs failed');
  loadingEl.style.display = 'none';
  errorEl.style.display = 'block';
  iframe.style.display = 'none';
}

function injectWalletAccess() {
  try {
    // Access the iframe's window object
    const iframeWindow = iframe.contentWindow;
    
    if (iframeWindow && iframeWindow.document) {
      console.log('🔧 Injecting wallet access into iframe...');
      
      // Create a script element to inject wallet access
      const script = iframeWindow.document.createElement('script');
      script.textContent = `
        // Inject wallet access for the iframe
        console.log('🔧 Wallet injection script loaded');
        
        // Check if ethereum is available in parent window
        if (window.parent && window.parent.ethereum) {
          console.log('✅ Found ethereum in parent window');
          window.ethereum = window.parent.ethereum;
        } else if (window.top && window.top.ethereum) {
          console.log('✅ Found ethereum in top window');
          window.ethereum = window.top.ethereum;
        } else {
          console.log('⚠️ No ethereum provider found in parent windows');
        }
        
        // Also check for MetaMask specifically
        if (window.parent && window.parent.web3) {
          window.web3 = window.parent.web3;
        }
      `;
      
      iframeWindow.document.head.appendChild(script);
      console.log('✅ Wallet access injected successfully');
    }
  } catch (error) {
    console.error('❌ Failed to inject wallet access:', error);
    console.log('💡 This is normal for cross-origin iframes. The app will work but wallet features may be limited.');
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
    e.preventDefault();
    refreshApp();
  } else if (e.key === 'F11') {
    e.preventDefault();
    openFullscreen();
  }
});

// Debug info
console.log('🔧 Chrome version:', navigator.userAgent);
console.log('🔧 Extension ID:', chrome.runtime.id);