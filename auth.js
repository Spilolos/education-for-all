// Authentication and API management
class AuthManager {
    constructor() {
        this.baseURL = window.location.origin;
        // Check for token in both localStorage (remember me) and sessionStorage (session only)
        this.token = localStorage.getItem('token') || sessionStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
        this.setupAuthUI();
    }

    setupAuthUI() {
        const authContainer = document.getElementById('authContainer');
        const userContainer = document.getElementById('userContainer');
        
        if (this.isAuthenticated()) {
            this.showAuthenticatedUI();
        } else {
            this.showLoginForm();
        }
    }

    showLoginForm() {
        const authContainer = document.getElementById('authContainer');
        if (!authContainer) return;

        authContainer.innerHTML = `
            <div class="bg-white rounded-xl shadow-md p-6 max-w-md mx-auto">
                <div class="text-center mb-6">
                    <img src="images/logo.png" alt="EduGhana Logo" class="w-16 h-16 mx-auto mb-4 rounded-full shadow-lg" onerror="this.style.display='none'">
                    <h2 class="text-2xl font-bold text-gray-800">Welcome to EduGhana</h2>
                    <p class="text-gray-600 mt-2">Your journey to knowledge starts here</p>
                </div>
                
                <div id="authTabs" class="flex mb-6">
                    <button id="loginTab" class="flex-1 py-2 px-4 bg-green-600 text-white rounded-l-lg font-medium">Login</button>
                    <button id="registerTab" class="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-r-lg font-medium">Register</button>
                </div>

                <div id="loginForm">
                    <form id="loginFormElement" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input type="text" id="loginUsername" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input type="password" id="loginPassword" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" id="rememberMe" class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded">
                            <label for="rememberMe" class="ml-2 block text-sm text-gray-700">Remember me</label>
                        </div>
                        <button type="submit" class="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition">Login</button>
                    </form>
                </div>

                <div id="registerForm" class="hidden">
                    <form id="registerFormElement" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input type="text" id="registerUsername" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" id="registerEmail" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input type="password" id="registerPassword" required minlength="6" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" id="rememberMeRegister" class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded">
                            <label for="rememberMeRegister" class="ml-2 block text-sm text-gray-700">Remember me</label>
                        </div>
                        <button type="submit" class="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition">Register</button>
                    </form>
                </div>

                <div id="authMessage" class="mt-4 p-3 rounded-lg hidden"></div>
            </div>
        `;

        this.setupAuthEventListeners();
    }

    setupAuthEventListeners() {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const loginFormElement = document.getElementById('loginFormElement');
        const registerFormElement = document.getElementById('registerFormElement');

        loginTab.addEventListener('click', () => {
            loginTab.className = 'flex-1 py-2 px-4 bg-green-600 text-white rounded-l-lg font-medium';
            registerTab.className = 'flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-r-lg font-medium';
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        });

        registerTab.addEventListener('click', () => {
            registerTab.className = 'flex-1 py-2 px-4 bg-green-600 text-white rounded-r-lg font-medium';
            loginTab.className = 'flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-l-lg font-medium';
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        });

        loginFormElement.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        registerFormElement.addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });
    }

    async login() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        try {
            const response = await fetch(`${this.baseURL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                this.setToken(data.token, data.user, rememberMe);
                this.showMessage('Login successful!', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                this.showMessage(data.error, 'error');
            }
        } catch (error) {
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async register() {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const rememberMe = document.getElementById('rememberMeRegister').checked;

        try {
            const response = await fetch(`${this.baseURL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                this.setToken(data.token, data.user, rememberMe);
                this.showMessage('Registration successful!', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                this.showMessage(data.error, 'error');
            }
        } catch (error) {
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    showAuthenticatedUI() {
        const authContainer = document.getElementById('authContainer');
        const userContainer = document.getElementById('userContainer');
        
        if (authContainer) {
            authContainer.innerHTML = `
                <div class="bg-white rounded-xl shadow-md p-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                                ${this.user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p class="font-medium text-gray-800">Welcome, ${this.user.username}!</p>
                                <p class="text-sm text-gray-600">Ready to learn?</p>
                            </div>
                        </div>
                        <button onclick="authManager.logout()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                            Logout
                        </button>
                    </div>
                </div>
            `;
        }

        if (userContainer) {
            userContainer.innerHTML = `
                <div class="flex items-center space-x-4">
                    <span class="text-white">Welcome, ${this.user.username}</span>
                    <button onclick="authManager.logout()" class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm">
                        Logout
                    </button>
                </div>
            `;
        }
    }

    setToken(token, user, rememberMe = false) {
        this.token = token;
        this.user = user;
        
        if (rememberMe) {
            // Store in localStorage for persistent login
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('rememberMe', 'true');
        } else {
            // Store in sessionStorage for session-only login
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('user', JSON.stringify(user));
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('rememberMe');
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        // Clear both storage types
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('rememberMe');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.location.reload();
    }

    isAuthenticated() {
        return this.token && this.user;
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
        };
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('authMessage');
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `mt-4 p-3 rounded-lg ${type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
            messageDiv.classList.remove('hidden');
            
            setTimeout(() => {
                messageDiv.classList.add('hidden');
            }, 5000);
        }
    }

    // API helper methods
    async apiCall(endpoint, options = {}) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers: {
                ...this.getAuthHeaders(),
                ...options.headers,
            },
        });

        if (response.status === 401) {
            this.logout();
            throw new Error('Session expired');
        }

        return response;
    }
}

// Initialize authentication manager
const authManager = new AuthManager();
