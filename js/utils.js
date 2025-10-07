
const $ = (id) => document.getElementById(id);


function toast(msg, ms = 2500) {
  const t = $("toast");
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(() => t.style.display = "none", ms);
}


function fmtUSD(n) {
  if (n === undefined || n === null || isNaN(Number(n))) return "—";
  return Number(n) >= 1 
    ? `$${Number(n).toLocaleString(undefined, {maximumFractionDigits: 2})}` 
    : `$${Number(n).toExponential(2)}`;
}

// Format numbers
function fmtNum(n) {
  if (n === undefined || n === null || isNaN(Number(n))) return "—";
  return Number(n).toLocaleString();
}

// Format percentage
function fmtPct(n) {
  if (n === undefined || n === null || isNaN(Number(n))) return "—";
  return `${Number(n).toFixed(2)}%`;
}

// Load HTML content into container
async function loadHTML(file) {
  try {
    const response = await fetch(file);
    if (!response.ok) throw new Error(`Failed to load ${file}`);
    return await response.text();
  } catch (err) {
    console.error('Error loading HTML:', err);
    return `<div class="card"><p class="muted">Failed to load page content</p></div>`;
  }
}

// Load CSS dynamically
function loadCSS(file) {
  // Check if already loaded
  if (document.querySelector(`link[href="${file}"]`)) return;
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = file;
  document.head.appendChild(link);
}

// Unload CSS
function unloadCSS(file) {
  const link = document.querySelector(`link[href="${file}"]`);
  if (link) link.remove();
}

// Format text with bold markdown
function formatTextWithBold(text) {
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  text = text.replace(/^### (.*$)/gm, '<strong>$1</strong>');
  text = text.replace(/^## (.*$)/gm, '<strong>$1</strong>');
  text = text.replace(/^# (.*$)/gm, '<strong>$1</strong>');
  text = text.replace(/\n/g, '<br>');
  text = text.replace(/• /g, '• ');
  text = text.replace(/- /g, '• ');
  return text;
}

// Typing animation effect
function typeContent(element, content, delay = 50) {
  return new Promise((resolve) => {
    element.innerHTML = '';
    element.classList.add('typing-cursor');
    
    let index = 0;
    const type = () => {
      if (index < content.length) {
        element.innerHTML = content.substring(0, index + 1);
        index++;
        setTimeout(type, delay);
      } else {
        element.classList.remove('typing-cursor');
        resolve();
      }
    };
    type();
  });
}

// Get best trading pair from Dexscreener data
function bestPair(pairs, selectedChain) {
  if (!pairs || !pairs.length) return null;
  
  let filteredPairs = pairs;
  if (selectedChain && CHAIN_MAPPING[selectedChain]) {
    filteredPairs = pairs.filter(pair => 
      pair.chainId === CHAIN_MAPPING[selectedChain] || 
      pair.chainId === selectedChain
    );
  }
  
  if (filteredPairs.length === 0) {
    filteredPairs = pairs;
  }
  
  return filteredPairs.slice().sort((a, b) => {
    const la = (a.liquidity?.usd || 0), lb = (b.liquidity?.usd || 0);
    if (lb !== la) return lb - la;
    const va = (a.volume?.h24 || 0), vb = (b.volume?.h24 || 0);
    return vb - va;
  })[0];
}