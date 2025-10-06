// ====== AUTHENTICATION ======

// Load user data from database
async function loadUserData() {
  if (!currentUser) return;
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', currentUser.id)
    .single();
  
  if (error) {
    // Create user record if doesn't exist
    const { error: insertError } = await supabase.from('users').insert({
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.user_metadata?.name || 'User',
      total_xp: 0,
      total_analyses: 0,
      current_streak: 0,
      last_analysis_date: null
    });
    
    if (insertError) {
      console.error('Error creating user:', insertError);
    }
    
    // Try loading again
    await loadUserData();
  } else {
    userData = data;
  }
}

// Handle login form submission
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  // Show loading state
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in...';
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      toast('❌ Login failed: ' + error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    } else {
      toast('✅ Login successful!');
      currentUser = data.user;
      await loadUserData();
      setTimeout(() => {
        navigateTo('dashboard');
      }, 500);
    }
  } catch (err) {
    console.error('Login error:', err);
    toast('❌ An error occurred during login');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Handle register form submission
async function handleRegister(e) {
  e.preventDefault();
  
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const name = document.getElementById('registerName').value;
  
  // Show loading state
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin
      }
    });
    
    if (error) {
      toast('❌ Registration failed: ' + error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    } else {
      // Check if email confirmation is required
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast('⚠️ This email is already registered. Please login.');
        setTimeout(() => navigateTo('login'), 2000);
      } else if (data.user && !data.session) {
        toast('✅ Registration successful! Please check your email to verify your account.');
        setTimeout(() => navigateTo('login'), 3000);
      } else {
        toast('✅ Registration successful!');
        currentUser = data.user;
        await loadUserData();
        setTimeout(() => navigateTo('dashboard'), 1000);
      }
      
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  } catch (err) {
    console.error('Registration error:', err);
    toast('❌ An error occurred during registration');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Logout user
async function logout() {
  try {
    await supabase.auth.signOut();
    currentUser = null;
    userData = null;
    toast('✅ Logged out successfully');
    navigateTo('login');
  } catch (err) {
    console.error('Logout error:', err);
    toast('❌ Error logging out');
  }
}

// Setup auth form listeners (called after page loads)
function setupAuthListeners() {
  setTimeout(() => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
      // Remove any existing listeners
      const newLoginForm = loginForm.cloneNode(true);
      loginForm.parentNode.replaceChild(newLoginForm, loginForm);
      
      newLoginForm.addEventListener('submit', handleLogin);
      console.log('Login form listener attached');
    }
    
    if (registerForm) {
      // Remove any existing listeners
      const newRegisterForm = registerForm.cloneNode(true);
      registerForm.parentNode.replaceChild(newRegisterForm, registerForm);
      
      newRegisterForm.addEventListener('submit', handleRegister);
      console.log('Register form listener attached');
    }
  }, 100);
}

// Helper function to switch between login and register
function switchToRegister() {
  navigateTo('register');
}

function switchToLogin() {
  navigateTo('login');
}