
const SUPABASE_URL = 'process.env.SUPABASE_URL'; 
const SUPABASE_ANON_KEY = 'process.env.SUPABASE_ANON_KEY';


const FIREWORKS_API_KEY = "process.env.FIREWORKS_API_KEY";


let supabase;

try {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase library not loaded! Make sure the CDN script is included.');
  } else if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
    console.warn('⚠️ Supabase credentials not configured! Please update config.js with your credentials.');
  } else {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client initialized');
  }
} catch (err) {
  console.error('Error initializing Supabase:', err);
}


const CHAIN_MAPPING = {
  'ethereum': 'ethereum',
  'bsc': 'bsc',
  'polygon': 'polygon',
  'avalanche': 'avalanche',
  'arbitrum': 'arbitrum',
  'optimism': 'optimism',
  'fantom': 'fantom',
  'cronos': 'cronos',
  'solana': 'solana',
  'base': 'base',
  'blast': 'blast',
  'tron': 'tron',
  'sui': 'sui',
  'aptos': 'aptos',
  'sei': 'sei',
  'zksync': 'zksync',
  'pulsechain': 'pulsechain',
  'linea': 'linea',
  'scroll': 'scroll',
  'mantle': 'mantle',
  'manta': 'manta',
  'mode': 'mode',
  'metis': 'metis',
  'moonbeam': 'moonbeam',
  'celo': 'celo',
  'kava': 'kava',
  'osmosis': 'osmosis'
};

// Global state
let currentUser = null;
let userData = null;

// Configuration check on load
window.addEventListener('load', () => {
  if (!supabase) {
    console.error('❌ Supabase not initialized. Please check your configuration.');
    if (document.getElementById('page-container')) {
      document.getElementById('page-container').innerHTML = `
        <div class="card" style="max-width: 600px; margin: 40px auto; text-align: center;">
          <h2 style="color: #ff4d4f;">⚠️ Configuration Error</h2>
          <p>Supabase is not properly configured.</p>
          <p class="muted">Please update <code>js/config.js</code> with your Supabase credentials.</p>
          <ol style="text-align: left; margin: 20px auto; max-width: 400px;">
            <li>Go to <a href="https://supabase.com" target="_blank">supabase.com</a></li>
            <li>Create a project</li>
            <li>Get your Project URL and Anon Key</li>
            <li>Update <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code></li>
          </ol>
        </div>
      `;
    }
  }
});