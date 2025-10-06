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