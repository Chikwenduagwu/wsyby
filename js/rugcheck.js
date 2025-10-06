function initRugCheck() {
  console.log('Rug Check initialized');
  // Place any specific setup here if needed
}

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
