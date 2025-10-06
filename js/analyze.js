// ====== TOKEN ANALYSIS FUNCTIONALITY ======

// Initialize analyze page
function initAnalyze() {
  // Setup event listeners
  const analyzeBtn = document.getElementById('analyzeBtn');
  const resetBtn = document.getElementById('resetBtn');
  const copyBtn = document.getElementById('copyAddressBtn');
  
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyzeToken);
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', resetAnalyze);
  }
  
  if (copyBtn) {
    copyBtn.addEventListener('click', copyAddress);
  }
  
  // Check if we need to load from session storage
  const savedAddress = sessionStorage.getItem('analyzeAddress');
  const savedChain = sessionStorage.getItem('analyzeChain');
  const loadSaved = sessionStorage.getItem('loadSavedAnalysis');
  
  if (savedAddress) {
    document.getElementById('contractAddress').value = savedAddress;
  }
  
  if (savedChain) {
    document.getElementById('chainSelect').value = savedChain;
  }
  
  if (loadSaved === 'true') {
    // Load saved analysis data
    const tokenData = sessionStorage.getItem('savedTokenData');
    const metricsData = sessionStorage.getItem('savedMetricsData');
    const aiInsights = sessionStorage.getItem('savedAIInsights');
    
    if (tokenData) document.getElementById('tokenOverview').innerHTML = tokenData;
    if (metricsData) document.getElementById('metrics').innerHTML = metricsData;
    if (aiInsights) document.getElementById('aiInsights').innerHTML = aiInsights;
    
    // Clear session storage
    sessionStorage.removeItem('loadSavedAnalysis');
    sessionStorage.removeItem('savedTokenData');
    sessionStorage.removeItem('savedMetricsData');
    sessionStorage.removeItem('savedAIInsights');
  } else if (savedAddress && savedChain) {
    // Auto-analyze if coming from quick analyze
    setTimeout(() => analyzeToken(), 500);
  }
  
  // Clear session storage after use
  sessionStorage.removeItem('analyzeAddress');
  sessionStorage.removeItem('analyzeChain');
}

// Analyze token
async function analyzeToken() {
  const ca = document.getElementById('contractAddress').value.trim();
  const chain = document.getElementById('chainSelect').value;
  
  if (!ca) {
    toast('Please enter a contract address');
    return;
  }
  
  // Show loading states
  document.getElementById('tokenOverview').innerHTML = '<div class="loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span> Fetching token data...</div>';
  document.getElementById('metrics').innerHTML = '<div class="loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span> Loading metrics...</div>';
  document.getElementById('topHolders').innerHTML = '<div class="loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span> Analyzing holders...</div>';
  document.getElementById('liquidityPools').innerHTML = '<div class="loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span> Fetching pools...</div>';
  document.getElementById('aiInsights').innerHTML = '<div class="loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span> Dobby is analyzing...</div>';
  
  try {
    // Fetch from Dexscreener
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
    const data = await response.json();
    
    const pairs = data.pairs || [];
    const mainPair = bestPair(pairs, chain);
    
    if (!mainPair) {
      throw new Error('No trading pair found for this token');
    }
    
    // Render token overview
    const tokenHtml = await renderTokenOverview(mainPair);
    
    // Render metrics
    const metricsHtml = await renderMetrics(mainPair);
    
    // Render top holders (placeholder)
    renderTopHolders();
    
    // Render liquidity pools
    renderLiquidityPools(pairs);
    
    // Get AI insights
    await getAIInsights(mainPair, ca, chain);
    
    // Save analysis & award XP
    await saveAnalysis(ca, chain, mainPair, tokenHtml, metricsHtml);
    
    // Update last updated time
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
      lastUpdated.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
    }
    
  } catch (err) {
    console.error('Analysis error:', err);
    toast('Analysis failed: ' + err.message);
    document.getElementById('tokenOverview').innerHTML = '<span class="muted">Failed to load token data</span>';
    document.getElementById('metrics').innerHTML = '<span class="muted">Failed to load metrics</span>';
  }
}

// Render token overview
async function renderTokenOverview(pair) {
  const price = pair.priceUsd ? `$${Number(pair.priceUsd).toLocaleString(undefined, {maximumFractionDigits: 8})}` : "—";
  const change = pair.priceChange?.h24 || 0;
  const changeCls = change >= 0 ? "up" : "down";
  
  const html = `
    <div class="kv"><div class="k">Token</div><div class="v"><strong>${pair.baseToken?.symbol || '—'}</strong></div></div>
    <div class="kv"><div class="k">Pair</div><div class="v">${pair.baseToken?.symbol}/${pair.quoteToken?.symbol}</div></div>
    <div class="kv"><div class="k">DEX</div><div class="v">${pair.dexId || '—'}</div></div>
    <div class="kv"><div class="k">Chain</div><div class="v">${pair.chainId || '—'}</div></div>
    <div class="kv"><div class="k">Price</div><div class="v">${price}</div></div>
    <div class="kv"><div class="k">24h Change</div><div class="v"><span class="delta ${changeCls}">${fmtPct(change)}</span></div></div>
    <div class="kv"><div class="k">FDV</div><div class="v">${fmtUSD(pair.fdv)}</div></div>
    <div class="kv"><div class="k">Market Cap</div><div class="v">${fmtUSD(pair.marketCap)}</div></div>
  `;
  
  await typeContent(document.getElementById('tokenOverview'), html, 30);
  return html;
}

// Render metrics
async function renderMetrics(pair) {
  const tx = pair.txns?.h24 || {};
  const buyRatio = (tx.buys && tx.sells) ? ((tx.buys / (tx.buys + tx.sells)) * 100).toFixed(1) + '%' : '—';
  
  const html = `
    <div class="kv"><div class="k">Volume (24h)</div><div class="v">${fmtUSD(pair.volume?.h24)}</div></div>
    <div class="kv"><div class="k">Liquidity</div><div class="v">${fmtUSD(pair.liquidity?.usd)}</div></div>
    <div class="kv"><div class="k">Transactions (24h)</div><div class="v">${fmtNum((tx.buys || 0) + (tx.sells || 0))}</div></div>
    <div class="kv"><div class="k">Buys</div><div class="v">${fmtNum(tx.buys)}</div></div>
    <div class="kv"><div class="k">Sells</div><div class="v">${fmtNum(tx.sells)}</div></div>
    <div class="kv"><div class="k">Buy Ratio</div><div class="v">${buyRatio}</div></div>
  `;
  
  await typeContent(document.getElementById('metrics'), html, 30);
  return html;
}

// Render top holders (placeholder)
function renderTopHolders() {
  const html = `
    <p class="muted">Note: Holder data requires blockchain-specific APIs (Etherscan, BscScan, etc.)</p>
    <div class="kv"><div class="k">Top Holder #1</div><div class="v">Data not available</div></div>
    <div class="kv"><div class="k">Top Holder #2</div><div class="v">Data not available</div></div>
    <div class="kv"><div class="k">Top Holder #3</div><div class="v">Data not available</div></div>
  `;
  document.getElementById('topHolders').innerHTML = html;
}

// Render liquidity pools
function renderLiquidityPools(pairs) {
  const html = pairs.slice(0, 5).map(p => `
    <div class="kv">
      <div class="k">
        <strong>${p.dexId}</strong><br>
        <small class="muted">${p.baseToken?.symbol}/${p.quoteToken?.symbol} on ${p.chainId}</small>
      </div>
      <div class="v">${fmtUSD(p.liquidity?.usd)}</div>
    </div>
  `).join('');
  
  document.getElementById('liquidityPools').innerHTML = html || '<p class="muted">No pools found</p>';
}

// Get AI insights from Dobby
async function getAIInsights(pair, ca, chain) {
  try {
    const brief = {
      ca,
      chain,
      base: pair.baseToken?.symbol,
      quote: pair.quoteToken?.symbol,
      dex: pair.dexId,
      priceUsd: pair.priceUsd,
      change24h: pair.priceChange?.h24,
      volume24h: pair.volume?.h24,
      liquidityUsd: pair.liquidity?.usd,
      txns24h: pair.txns?.h24
    };
    
    const response = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FIREWORKS_API_KEY}`
      },
      body: JSON.stringify({
        model: "accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b",
        temperature: 0.4,
        max_tokens: 450,
        messages: [
          { 
            role: "system", 
            content: "You are Dobby, a professional crypto analyst. Provide concise, neutral, investor-grade insights for the last 24 hours. Use bullet points and bold text using **bold** syntax. Include: price trend, liquidity context, volume/txs structure, notable risks, and actionable checklist." 
          },
          { 
            role: "user", 
            content: `Analyze this token on ${chain} blockchain:\n${JSON.stringify(brief)}` 
          }
        ]
      })
    });
    
    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content || "No insights available";
    const formattedText = formatTextWithBold(rawText.trim());
    
    await typeContent(document.getElementById('aiInsights'), formattedText, 20);
    
  } catch (err) {
    console.error('AI insights error:', err);
    document.getElementById('aiInsights').innerHTML = '<span class="muted">Failed to generate insights</span>';
  }
}

// Save analysis to database
async function saveAnalysis(ca, chain, pair, tokenData, metricsData) {
  if (!currentUser) return;
  
  // Save analysis
  await supabase.from('analyses').insert({
    user_id: currentUser.id,
    contract_address: ca,
    chain: chain,
    token_symbol: pair.baseToken?.symbol,
    token_data: tokenData,
    metrics_data: metricsData,
    ai_insights: document.getElementById('aiInsights').innerHTML
  });
  
  // Update user stats
  const today = new Date().toISOString().split('T')[0];
  const lastDate = userData.last_analysis_date;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  let newStreak = userData.current_streak || 0;
  if (lastDate !== today) {
    if (lastDate === yesterday) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }
  }
  
  await supabase.from('users').update({
    total_xp: (userData.total_xp || 0) + 10,
    total_analyses: (userData.total_analyses || 0) + 1,
    current_streak: newStreak,
    last_analysis_date: today
  }).eq('id', currentUser.id);
  
  // Update local userData
  userData.total_xp = (userData.total_xp || 0) + 10;
  userData.total_analyses = (userData.total_analyses || 0) + 1;
  userData.current_streak = newStreak;
  
  toast('✅ Analysis saved! +10 XP earned');
}

// Reset analyze form
function resetAnalyze() {
  document.getElementById('contractAddress').value = '';
  document.getElementById('chainSelect').selectedIndex = 0;
  document.getElementById('tokenOverview').innerHTML = '<p class="muted">Enter a contract address to begin</p>';
  document.getElementById('metrics').innerHTML = '<p class="muted">Waiting for analysis...</p>';
  document.getElementById('topHolders').innerHTML = '<p class="muted">No holder data available yet</p>';
  document.getElementById('liquidityPools').innerHTML = '<p class="muted">No pool data available yet</p>';
  document.getElementById('aiInsights').innerHTML = '<p class="muted">No insights yet</p>';
}

// Copy address to clipboard
function copyAddress() {
  const address = document.getElementById('contractAddress').value.trim();
  if (!address) {
    toast('Nothing to copy');
    return;
  }
  navigator.clipboard.writeText(address).then(() => toast('Address copied!'));
}

// trial

(function(){
  'use strict';
  
  /* API CONFIGURATION */
  const SOLSNIFFER_API_KEY = "to5p72yao22ajhlxiw6bvj8hogt896";
  const FIREWORKS_API_KEY = "fw_3ZYt5vRJztdY1fXajRko5YCt"; // <- Replace with your Fireworks AI key
  const SOLSNIFFER_BASE = "https://solsniffer.com";
  const SOLSNIFFER_PATH = "/api/v2/token";
  const FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1/chat/completions";
  const FIREWORKS_MODEL = "accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b";

  // UI Elements
  const addrEl = document.getElementById('solsnifferAddr');
  const checkBtn = document.getElementById('solsnifferCheck');
  const exampleBtn = document.getElementById('solsnifferExample');
  const resultEl = document.getElementById('solsnifferResult');
  const summaryEl = document.getElementById('solsnifferSummary');
  const aiAnalysisEl = document.getElementById('solsnifferAiAnalysis');
  const aiContentEl = document.getElementById('solsnifferAiContent');

  function showResult(){ resultEl.style.display = 'block'; }
  function hideResult(){ resultEl.style.display = 'none'; }
  function showAIAnalysis(){ aiAnalysisEl.style.display = 'block'; }
  function hideAIAnalysis(){ aiAnalysisEl.style.display = 'none'; }

  function isProbablyPubkey(s){
    if(!s || typeof s !== 'string') return false;
    s = s.trim();
    return s.length >= 32 && s.length <= 60;
  }

  function typeWriter(element, text, speed = 15) {
    return new Promise((resolve) => {
      let i = 0;
      element.innerHTML = '';
      
      function type() {
        if (i < text.length) {
          element.innerHTML += text.charAt(i);
          i++;
          setTimeout(type, speed);
        } else {
          resolve();
        }
      }
      type();
    });
  }

  function formatDobbyResponse(text) {
    // Remove asterisks and format the text
    text = text.replace(/\*\*/g, '');
    
    // Split into lines
    const lines = text.split('\n').filter(line => line.trim());
    let formatted = '';
    let inList = false;
    
    lines.forEach(line => {
      line = line.trim();
      
      // Check if line is a heading (starts with number or contains ":")
      if (/^\d+\./.test(line) || (line.includes(':') && line.length < 100)) {
        if (inList) {
          formatted += '</ul>';
          inList = false;
        }
        const parts = line.split(':');
        if (parts.length > 1) {
          formatted += `<h4>${parts[0].trim()}:</h4><p>${parts.slice(1).join(':').trim()}</p>`;
        } else {
          formatted += `<h4>${line}</h4>`;
        }
      }
      // Check if line is a bullet point
      else if (line.startsWith('-') || line.startsWith('•')) {
        if (!inList) {
          formatted += '<ul>';
          inList = true;
        }
        formatted += `<li>${line.substring(1).trim()}</li>`;
      }
      // Check for important keywords to make bold
      else {
        if (inList) {
          formatted += '</ul>';
          inList = false;
        }
        
        // Bold important terms
        let processedLine = line
          .replace(/(safe|low risk|secure|verified|legitimate)/gi, '<strong>$1</strong>')
          .replace(/(risky|high risk|dangerous|scam|rug pull|warning|caution|suspicious)/gi, '<strong>$1</strong>')
          .replace(/(recommendation|conclusion|summary|verdict)/gi, '<strong>$1</strong>');
        
        formatted += `<p>${processedLine}</p>`;
      }
    });
    
    if (inList) {
      formatted += '</ul>';
    }
    
    return formatted;
  }

  function extractSummary(text) {
    // Look for final recommendation or summary
    const lines = text.split('\n').filter(line => line.trim());
    const lastLines = lines.slice(-3).join(' ');
    
    // Find summary-like content
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].toLowerCase();
      if (line.includes('recommendation') || line.includes('conclusion') || 
          line.includes('summary') || line.includes('verdict') ||
          line.includes('final')) {
        return lines.slice(i).join(' ').replace(/\*\*/g, '').replace(/^\d+\.\s*/, '');
      }
    }
    
    return lastLines.replace(/\*\*/g, '');
  }

  async function getDobbyAnalysis(jsonData){
    const prompt = `You are Dobby, an expert Solana token rug pull analyst. Analyze this SolSniffer token data and provide a clear, human-readable assessment.

Token Data:
${JSON.stringify(jsonData, null, 2)}

Provide your analysis in the following structure:
1. Overall Risk Assessment: [Safe/Moderate Risk/High Risk]
2. Key Risk Factors: [List any red flags found]
3. Positive Indicators: [List any good signs]
4. Final Recommendation: [Clear action item for investors]

Be direct, professional, and focus on what matters most to investors. Use clear language without excessive technical jargon.`;

    const response = await fetch(FIREWORKS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIREWORKS_API_KEY}`
      },
      body: JSON.stringify({
        model: FIREWORKS_MODEL,
        messages: [
          {
            role: "system",
            content: "You are Dobby, a professional Solana token security analyst. Provide clear, structured analysis of token safety data. Be direct and helpful."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if(!response.ok){
      const errorText = await response.text().catch(() => '');
      throw new Error(`Fireworks AI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async function checkToken(){
    const addr = addrEl.value.trim();

    if(!addr){ 
      alert('Please enter a token address'); 
      addrEl.focus(); 
      return; 
    }

    if(FIREWORKS_API_KEY === 'YOUR_FIREWORKS_API_KEY_HERE'){
      alert('Please configure your Fireworks AI API key in the script');
      return;
    }

    if(!isProbablyPubkey(addr) && !confirm('Address format looks unusual. Continue anyway?')) return;

    checkBtn.disabled = true;
    checkBtn.textContent = 'Analyzing...';
    showResult();
    hideAIAnalysis();
    summaryEl.innerHTML = '<span class="badge warning"><span class="loading-dots"><span></span><span></span><span></span></span> Fetching token data</span>';

    const url = `${SOLSNIFFER_BASE}${SOLSNIFFER_PATH}/${encodeURIComponent(addr)}`;
    const headers = {
      'accept': 'application/json',
      'X-API-KEY': SOLSNIFFER_API_KEY
    };

    try {
      // Step 1: Get SolSniffer data
      const res = await fetch(url, { method: 'GET', headers });
      
      if(!res.ok){
        const text = await res.text().catch(()=> '');
        summaryEl.innerHTML = `<span class="badge risk">Error: HTTP ${res.status}</span>`;
        checkBtn.disabled = false;
        checkBtn.textContent = 'Analyze Token';
        return;
      }

      const data = await res.json().catch(async () => {
        const t = await res.text();
        return { _raw: t };
      });

      // Display basic score
      const score = data.snifscore ?? data.snifScore ?? data.score ?? data.risk_score ?? data.riskScore;

      if(score !== undefined && score !== null){
        const n = Number(score);
        if(!Number.isNaN(n)){
          if(n >= 70){
            summaryEl.innerHTML = `<span class="badge safe">✓ Initial Score: ${n}/100 — Analyzing deeper...</span>`;
          } else if(n >= 40){
            summaryEl.innerHTML = `<span class="badge warning">⚠ Initial Score: ${n}/100 — Analyzing deeper...</span>`;
          } else {
            summaryEl.innerHTML = `<span class="badge risk">⚠ Initial Score: ${n}/100 — Analyzing deeper...</span>`;
          }
        }
      } else {
        summaryEl.innerHTML = `<span class="badge warning">Data received — analyzing with AI...</span>`;
      }

      // Step 2: Get Dobby's analysis
      summaryEl.innerHTML += ' <span class="loading-dots" style="margin-left:8px"><span></span><span></span><span></span></span>';
      aiContentEl.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div> Dobby is analyzing the token data...';
      showAIAnalysis();

      const analysis = await getDobbyAnalysis(data);
      
      // Format and display with typing effect
      const formattedAnalysis = formatDobbyResponse(analysis);
      aiContentEl.innerHTML = '';
      
      // Create a temporary div to hold formatted content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = formattedAnalysis;
      
      // Type out the content
      await typeWriter(aiContentEl, tempDiv.innerText, 8);
      
      // Then replace with properly formatted HTML
      aiContentEl.innerHTML = formattedAnalysis;
      
      // Add summary box at the end
      const summary = extractSummary(analysis);
      if (summary) {
        aiContentEl.innerHTML += `
          <div class="summary-box">
            <h4>📌 Quick Summary</h4>
            <p>${summary}</p>
          </div>
        `;
      }

      // Update summary badge based on analysis
      if (analysis.toLowerCase().includes('high risk') || analysis.toLowerCase().includes('risky') || analysis.toLowerCase().includes('dangerous')) {
        summaryEl.innerHTML = `<span class="badge risk">⚠ High Risk Detected</span>`;
      } else if (analysis.toLowerCase().includes('safe') || analysis.toLowerCase().includes('low risk')) {
        summaryEl.innerHTML = `<span class="badge safe">✓ Analysis Complete</span>`;
      } else {
        summaryEl.innerHTML = `<span class="badge warning">⚠ Analysis Complete</span>`;
      }

    } catch (err) {
      if(err.message && err.message.includes('Fireworks')){
        summaryEl.innerHTML = `<span class="badge risk">AI Analysis Failed</span>`;
        aiContentEl.innerHTML = `<p><strong>Error:</strong> ${err.message}</p><p>Please check your Fireworks AI API key configuration.</p>`;
        showAIAnalysis();
      } else {
        summaryEl.innerHTML = `<span class="badge risk">Connection Error</span>`;
        aiContentEl.innerHTML = `<p><strong>Error:</strong> Unable to fetch token data. Please check the token address and try again.</p>`;
        showAIAnalysis();
      }
      console.error(err);
    } finally {
      checkBtn.disabled = false;
      checkBtn.textContent = 'Analyze Token';
    }
  }

  // Events
  checkBtn.addEventListener('click', checkToken);
  addrEl.addEventListener('keyup', (e) => { if(e.key === 'Enter') checkToken(); });
  exampleBtn.addEventListener('click', () => { 
    addrEl.value = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; 
    checkToken(); 
  });

  // Initial state
  hideResult();
})();
