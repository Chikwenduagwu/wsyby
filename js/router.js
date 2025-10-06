// ====== PAGE ROUTER ======

const routes = {
  'login': {
    html: 'pages/login.html',
    css: 'css/login.css',
    requiresAuth: false,
    init: setupAuthListeners
  },
  'register': {
    html: 'pages/register.html',
    css: 'css/register.css',
    requiresAuth: false,
    init: setupAuthListeners
  },
  'dashboard': {
    html: 'pages/dashboard.html',
    css: 'css/dashboard.css',
    requiresAuth: true,
    init: initDashboard
  },
  'analyze': {
    html: 'pages/analyze.html',
    css: 'css/analyze.css',
    requiresAuth: true,
    init: initAnalyze
  },
  'rugcheck': {
    html: 'pages/rugcheck.html',
    css: 'css/rugcheck.css',
    requiresAuth: true
  },
  'about': {
    html: 'pages/about.html',
    css: 'css/about.css',
    requiresAuth: true
  }
};

let currentPage = null;
let currentCSS = null;

// Navigate to a page
async function navigateTo(page) {
  const route = routes[page];
  
  if (!route) {
    console.error(`Page "${page}" not found`);
    return;
  }
  
  // Check authentication
  if (route.requiresAuth && !currentUser) {
    console.log('Authentication required, redirecting to login');
    navigateTo('login');
    return;
  }
  
  // Unload previous page CSS
  if (currentCSS && currentCSS !== route.css) {
    unloadCSS(currentCSS);
  }
  
  // Load new page CSS
  if (route.css) {
    loadCSS(route.css);
    currentCSS = route.css;
  }
  
  // Load HTML content
  const html = await loadHTML(route.html);
  const container = $('page-container');
  container.innerHTML = html;
  
  // Update navigation
  updateNavigation(page, route.requiresAuth);
  
  // Run page initialization
  if (route.init && typeof route.init === 'function') {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      try {
        route.init();
        console.log(`Initialized ${page} page`);
      } catch (err) {
        console.error(`Error initializing ${page}:`, err);
      }
    }, 150);
  }
  
  currentPage = page;
  
  // Scroll to top
  window.scrollTo(0, 0);
}

// Update bottom navigation state
function updateNavigation(page, showNav) {
  const bottomNav = $('bottomNav');
  
  // Show/hide navigation
  if (showNav && currentUser) {
    bottomNav.style.display = 'flex';
  } else {
    bottomNav.style.display = 'none';
  }
  
  // Update active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === page) {
      item.classList.add('active');
    }
  });
}

// Setup navigation listeners
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (page) navigateTo(page);
    });
  });
}

// Initialize router on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing router...');
  setupNavigation();
  checkAuthAndRoute();
});

// Check authentication and route accordingly
async function checkAuthAndRoute() {
  try {
    console.log('Checking authentication...');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session error:', error);
      navigateTo('login');
      return;
    }
    
    if (session && session.user) {
      console.log('User authenticated:', session.user.email);
      currentUser = session.user;
      await loadUserData();
      navigateTo('dashboard');
    } else {
      console.log('No active session, showing login');
      navigateTo('login');
    }
  } catch (err) {
    console.error('Auth check error:', err);
    navigateTo('login');
  }
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);
  
  if (event === 'SIGNED_IN' && session) {
    currentUser = session.user;
    loadUserData().then(() => {
      if (currentPage === 'login' || currentPage === 'register') {
        navigateTo('dashboard');
      }
    });
  } else if (event === 'SIGNED_OUT') {
    currentUser = null;
    userData = null;
    navigateTo('login');
  }
});