
async function initDashboard() {
  if (!userData) return;
  
  
  const userNameEl = document.getElementById('userName');
  if (userNameEl) {
    userNameEl.textContent = userData.name || 'User';
  }
  
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
  
    
  await loadDashboardStats();
  await loadTrendingTokens();
  await loadRecentAnalyses();
}

/
async function loadDashboardStats() {
  if (!userData) return;
  
  
  const totalXP = document.getElementById('totalXP');
  const totalAnalyses = document.getElementById('totalAnalyses');
  const currentStreak = document.getElementById('currentStreak');
  
  if (totalXP) totalXP.textContent = userData.total_xp || 0;
  if (totalAnalyses) totalAnalyses.textContent = userData.total_analyses || 0;
  if (currentStreak) currentStreak.textContent = (userData.current_streak || 0) + '🔥';
  
  // Calculate today's analyses
  const today = new Date().toISOString().split('T')[0];
  const { data: todayAnalyses } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', currentUser.id)
    .gte('created_at', today + 'T00:00:00')
    .lte('created_at', today + 'T23:59:59');
  
  const analysesToday = document.getElementById('analysesToday');
  if (analysesToday) {
    analysesToday.textContent = todayAnalyses?.length || 0;
  }
}

// Load trending tokens
async function loadTrendingTokens() {
  try {
    const loadingEl = document.getElementById('trendingLoading');
    const tableEl = document.getElementById('trendingTable');
    
    if (loadingEl) loadingEl.style.display = 'flex';
    if (tableEl) tableEl.style.display = 'none';
    
    // Fetch trending tokens (using WETH as example)
    const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
    const data = await response.json();
    
    const pairs = (data.pairs || [])
      .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
      .slice(0, 10);
    
    const tbody = document.getElementById('trendingBody');
    if (tbody) {
      tbody.innerHTML = '';
      
      pairs.forEach(pair => {
        const row = document.createElement('tr');
        const change = pair.priceChange?.h24 || 0;
        const changeCls = change >= 0 ? 'up' : 'down';
        
        row.innerHTML = `
          <td><strong>${pair.baseToken?.symbol || '—'}</strong></td>
          <td><span class="badge success">${pair.chainId || '—'}</span></td>
          <td>$${Number(pair.priceUsd || 0).toFixed(6)}</td>
          <td><span class="delta ${changeCls}">${change.toFixed(2)}%</span></td>
          <td>$${Number(pair.volume?.h24 || 0).toLocaleString()}</td>
          <td><button class="btn btn-small" onclick="quickAnalyze('${pair.baseToken?.address}', '${pair.chainId}')">Analyze</button></td>
        `;
        tbody.appendChild(row);
      });
    }
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (tableEl) tableEl.style.display = 'block';
  } catch (err) {
    console.error('Error loading trending tokens:', err);
    const loadingEl = document.getElementById('trendingLoading');
    if (loadingEl) {
      loadingEl.innerHTML = '<span class="muted">Failed to load trending tokens</span>';
    }
  }
}

// Load recent analyses
async function loadRecentAnalyses() {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(5);
  
  const container = document.getElementById('recentAnalyses');
  if (!container) return;
  
  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="muted">No recent analyses yet. Start analyzing tokens!</p>';
    return;
  }
  
  const html = data.map(a => `
    <div class="kv">
      <div class="k">
        <strong>${a.token_symbol || 'Unknown'}</strong> on ${a.chain}<br>
        <small class="muted">${new Date(a.created_at).toLocaleString()}</small>
      </div>
      <div class="v">
        <button class="btn btn-small" onclick="loadAnalysisFromHistory('${a.id}')">View</button>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = html;
}

// Quick analyze from trending tokens
function quickAnalyze(address, chain) {
  // Store data in sessionStorage for analyze page
  sessionStorage.setItem('analyzeAddress', address);
  sessionStorage.setItem('analyzeChain', chain.toLowerCase());
  navigateTo('analyze');
}

// Load analysis from history
async function loadAnalysisFromHistory(analysisId) {
  const { data } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .single();
  
  if (data) {
    // Store data for analyze page
    sessionStorage.setItem('analyzeAddress', data.contract_address);
    sessionStorage.setItem('analyzeChain', data.chain);
    sessionStorage.setItem('loadSavedAnalysis', 'true');
    sessionStorage.setItem('savedTokenData', data.token_data || '');
    sessionStorage.setItem('savedMetricsData', data.metrics_data || '');
    sessionStorage.setItem('savedAIInsights', data.ai_insights || '');
    navigateTo('analyze');
  }
}