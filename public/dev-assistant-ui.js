(function() {
    'use strict';

    // ===== Loader Styles =====
    const loaderStyles = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .dev-loader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 1000004;
            display: flex;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(5px);
        }
        .dev-loader-content {
            background: rgba(25,25,35,0.95);
            padding: 25px;
            border-radius: 12px;
            border: 1px solid #00e0ff;
            box-shadow: 0 10px 30px rgba(0,0,0,0.6);
            text-align: center;
            min-width: 200px;
        }
        .dev-spinner {
            border: 4px solid rgba(0,224,255,0.3);
            border-top: 4px solid #00e0ff;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        .dev-loader-text {
            color: #00e0ff;
            font-size: 14px;
            font-weight: bold;
            margin: 0;
        }
        @media (max-width: 768px) {
            .dev-loader-content {
                min-width: 150px;
                padding: 20px;
            }
            .dev-spinner {
                width: 40px;
                height: 40px;
            }
            .dev-loader-text {
                font-size: 12px;
            }
        }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.textContent = loaderStyles;
    document.head.appendChild(styleSheet);

    // ===== Loader Management =====
    let activeLoader = null;

    function showLoader(message) {
        message = message || "Processing...";
        hideLoader();
        const loader = document.createElement("div");
        loader.className = "dev-loader";
        loader.innerHTML = `
            <div class="dev-loader-content">
                <div class="dev-spinner"></div>
                <p class="dev-loader-text">${message}</p>
            </div>
        `;
        document.body.appendChild(loader);
        activeLoader = loader;
        return loader;
    }

    function hideLoader() {
        if (activeLoader && activeLoader.parentNode) {
            activeLoader.parentNode.removeChild(activeLoader);
        }
        activeLoader = null;
    }

    console.log("Dev Assistant Loading...");

    const python_host = window.location.protocol + "//" + window.location.hostname + ":5000";
    console.log("Python Host:", python_host);

    if (!window.devAssistantCore) {
        window.devAssistantCore = {
            createDefaultAppComponent: function() {
                console.log("Creating default app component...");
                return {
                    type: "div",
                    props: {
                        className: "default-app",
                        children: [
                            { type: "h1", props: { children: "Default Application" } },
                            { type: "p", props: { children: "This is a default app component created by Dev Assistant." } }
                        ]
                    }
                };
            }
        };
    }

    // ===== State =====
    let authToken = localStorage.getItem("my_agent_token") || null;
    let currentUser = JSON.parse(localStorage.getItem("my_agent_user") || "null");
    let isGuestMode = false;
    let selections = JSON.parse(localStorage.getItem("dev_requirements") || "[]");
    let activeInputBox = null;
    let toolbar = null;
    let globalFeatureRequest = localStorage.getItem("dev_global_feature_request") || "";
    let globalFeatureDetails = localStorage.getItem("dev_global_feature_details") || "";
    let activeModal = null;
    let selectedModel = localStorage.getItem("dev_selected_model") || "llama3.1:latest";
    let selectedProvider = localStorage.getItem("dev_selected_provider") || "ollama";
    let availableModels = JSON.parse(localStorage.getItem("dev_available_models") || "{}");
    let isNavigatingForReferences = false;
    let navigationReferences = new Map();
    let activeModals = new Set();
    let uploadedImages = {};

    // ===== Mobile State =====
    let isMobileMinimized = false;
    let isRequirementEnabled = true;

    // ===== Utilities =====
    function safeParseJSON(value) {
        if (!value) return null;
        try { return JSON.parse(value); } catch (e1) {
            try {
                const fixed = value.replace(/^"/, '').replace(/"$/, '').replace(/\\"/g, '"');
                return JSON.parse(fixed);
            } catch (e2) {
                console.warn("Could not parse JSON:", value);
                return null;
            }
        }
    }

    function isMobile() {
        return window.innerWidth < 768;
    }

    function getReactComponentName(node) {
        if (!node) return "Unknown";
        for (const k in node) {
            if (k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")) {
                let fiber = node[k];
                while (fiber) {
                    if (fiber.type && fiber.type.name) return fiber.type.name;
                    if (fiber.elementType && fiber.elementType.name) return fiber.elementType.name;
                    fiber = fiber.return;
                }
            }
        }
        let current = node;
        let depth = 0;
        while (current && depth < 5) {
            const dataComponent = current.getAttribute("data-component");
            if (dataComponent) return dataComponent;
            const className = current.className;
            if (className && typeof className === 'string') {
                const componentClass = className.split(' ').find(cls =>
                    cls.includes('component') || cls.includes('Component') ||
                    cls.includes('container') || cls.includes('Container') ||
                    cls.includes('page') || cls.includes('Page') ||
                    cls.includes('section') || cls.includes('Section')
                );
                if (componentClass) return componentClass;
            }
            if (current.id) return current.id;
            const tagName = current.tagName?.toLowerCase();
            const textContent = current.textContent?.trim();
            if (tagName && textContent && textContent.length > 0) {
                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'a'].includes(tagName)) {
                    return `${tagName}-${textContent.substring(0, 15).replace(/\s+/g, '-')}`;
                }
            }
            current = current.parentElement;
            depth++;
        }
        return node.tagName?.toLowerCase() || "element";
    }

    function getEnhancedDomPath(el) {
        if (!el) return "";
        const stack = [];
        let current = el;
        while (current && current.nodeType === 1) {
            let selector = current.tagName.toLowerCase();
            if (current.id) {
                selector += `#${current.id}`;
                stack.unshift(selector);
                break;
            }
            const className = current.className;
            if (className && typeof className === 'string') {
                const validClasses = className.split(/\s+/).filter(c => c && c.length > 2).slice(0, 2);
                if (validClasses.length > 0) {
                    selector += `.${validClasses.join('.')}`;
                }
            }
            stack.unshift(selector);
            current = current.parentElement;
            if (stack.length >= 5) break;
        }
        return stack.join(" > ");
    }

    function highlightElement(el) {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const box = document.createElement("div");
        Object.assign(box.style, {
            position: "fixed",
            left: rect.left + "px",
            top: rect.top + "px",
            width: rect.width + "px",
            height: rect.height + "px",
            border: "3px solid #00ff00",
            borderRadius: "4px",
            pointerEvents: "none",
            zIndex: 999998,
            backgroundColor: "rgba(0,255,0,0.1)",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.2)"
        });
        document.body.appendChild(box);
        setTimeout(() => { if (box.parentNode) box.parentNode.removeChild(box); }, 1500);
        return box;
    }

    function getElementTextContent(el) {
        if (!el) return "";
        const text = el.textContent?.trim() || "";
        return text ? text.substring(0, 100) : "No text content";
    }

    function getComponentDetails(node) {
        if (!node) return {};
        return {
            name: getReactComponentName(node),
            domPath: getEnhancedDomPath(node),
            textContent: getElementTextContent(node),
            tagName: node.tagName?.toLowerCase()
        };
    }

    function getBestComponentForClick(node) {
        if (!node) return null;
        let current = node;
        let bestComponent = null;
        let depth = 0;
        while (current && current.nodeType === 1 && depth < 8) {
            const componentName = getReactComponentName(current);
            if (componentName && componentName !== 'Unknown') {
                bestComponent = {
                    node: current,
                    name: componentName,
                    domPath: getEnhancedDomPath(current),
                    details: getComponentDetails(current)
                };
                break;
            }
            current = current.parentElement;
            depth++;
        }
        return bestComponent;
    }

    const saveSelections = () => {
        localStorage.setItem("dev_requirements", JSON.stringify({ requirements: selections }, null, 2));
        console.log("Saved requirements:", selections.length);
    };

    function loadSelections() {
        try {
            const saved = localStorage.getItem("dev_requirements");
            if (saved) {
                const parsed = JSON.parse(saved);
                selections = Array.isArray(parsed.requirements) ? parsed.requirements : [];
                globalFeatureRequest = parsed.feature_request || globalFeatureRequest;
                globalFeatureDetails = parsed.feature_details || globalFeatureDetails;
            }
        } catch (e) {
            console.error("Error loading selections:", e);
            selections = [];
        }
    }
    loadSelections();

    const clearSelections = () => {
        selections = [];
        globalFeatureRequest = "";
        globalFeatureDetails = "";
        saveSelections();
        localStorage.removeItem("dev_global_feature_request");
        localStorage.removeItem("dev_global_feature_details");
        updateCount();
    };

    function showNotification(message, type) {
        type = type || "info";
        const colors = { info: "#00e0ff", success: "#00ff88", warning: "#ffaa00", error: "#ff4444" };
        const notification = document.createElement("div");
        Object.assign(notification.style, {
            position: "fixed",
            top: "20px",
            right: "20px",
            background: colors[type] || colors.info,
            color: "#000",
            padding: "12px 16px",
            borderRadius: "6px",
            zIndex: 1000003,
            fontFamily: "system-ui, sans-serif",
            fontSize: "14px",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.3)",
            maxWidth: "90%"
        });
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => { if (notification.parentNode) notification.parentNode.removeChild(notification); }, 3000);
    }

    function closeAllModals() {
        document.querySelectorAll(".dev-modal-overlay").forEach(overlay => {
            if (overlay._escapeHandler) document.removeEventListener("keydown", overlay._escapeHandler);
            overlay.remove();
        });
        activeModals.clear();
        activeModal = null;
    }

    function registerModal(overlay) {
        activeModals.add(overlay);
        activeModal = 'custom';
        const escapeHandler = (e) => { if (e.key === "Escape") closeModal(); };
        overlay._escapeHandler = escapeHandler;
        document.addEventListener("keydown", escapeHandler);

        function closeModal() {
            if (overlay._escapeHandler) document.removeEventListener("keydown", overlay._escapeHandler);
            overlay.remove();
            activeModals.delete(overlay);
            if (activeModals.size === 0) activeModal = null;
        }
        return closeModal;
    }

    // ===== Responsive Styles =====
    const responsiveStyles = `
        @media (max-width: 768px) {
            .dev-toolbar {
                width: 280px !important;
                max-height: 400px !important;
                bottom: 10px !important;
                right: 10px !important;
                padding: 12px !important;
                font-size: 12px !important;
                transition: all 0.3s ease !important;
            }
            .dev-toolbar.minimized {
                width: 60px !important;
                height: 60px !important;
                max-height: 60px !important;
                overflow: hidden !important;
                padding: 10px !important;
                border-radius: 50% !important;
                cursor: pointer !important;
                bottom: 20px !important;
                right: 20px !important;
            }
            .dev-toolbar.minimized .toolbar-content {
                display: none !important;
            }
            .dev-toolbar .toolbar-header {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                width: 100% !important;
            }
            .dev-toolbar .minimize-btn,
            .dev-toolbar .toggle-req-btn {
                background: rgba(255,255,255,0.1) !important;
                border: 1px solid #555 !important;
                border-radius: 4px !important;
                color: #fff !important;
                cursor: pointer !important;
                padding: 4px 8px !important;
                font-size: 11px !important;
                font-weight: bold !important;
                transition: all 0.2s !important;
                min-width: 32px !important;
                text-align: center !important;
            }
            .dev-toolbar .minimize-btn:hover,
            .dev-toolbar .toggle-req-btn:hover {
                background: rgba(255,255,255,0.2) !important;
            }
            .dev-toolbar .toggle-req-btn.disabled {
                opacity: 0.5 !important;
                border-color: #ff4444 !important;
                color: #ff4444 !important;
            }
            .dev-toolbar .toggle-req-btn.enabled {
                border-color: #00ff88 !important;
                color: #00ff88 !important;
            }
            .dev-toolbar.minimized .minimize-btn {
                display: none !important;
            }
            .dev-toolbar.minimized .toggle-req-btn {
                display: none !important;
            }
            .dev-toolbar .minimized-label {
                display: none !important;
            }
            .dev-toolbar.minimized .minimized-label {
                display: block !important;
                font-size: 24px !important;
                text-align: center !important;
                line-height: 40px !important;
            }
            .dev-unified-popup {
                width: 95% !important;
                max-height: 90vh !important;
                left: 2.5% !important;
                top: 5% !important;
                padding: 15px !important;
                font-size: 13px !important;
            }
            .dev-modal-overlay .modal-content {
                width: 95% !important;
                max-width: 95% !important;
                padding: 15px !important;
            }
            .dev-toolbar button {
                font-size: 11px !important;
                padding: 6px 10px !important;
            }
            .dev-toolbar select,
            .dev-toolbar input {
                font-size: 11px !important;
            }
            .dev-unified-popup textarea,
            .dev-unified-popup input,
            .dev-unified-popup select {
                font-size: 13px !important;
            }
            .dev-unified-popup .feature-grid {
                grid-template-columns: 1fr !important;
            }
            .dev-unified-popup .detail-grid {
                grid-template-columns: 1fr !important;
            }
            #popupHeader {
                flex-wrap: wrap !important;
            }
            #popupHeader > div {
                flex-wrap: wrap !important;
            }
            .dev-toolbar .mobile-controls {
                display: flex !important;
                gap: 6px !important;
                align-items: center !important;
            }
        }
        @media (max-width: 480px) {
            .dev-toolbar {
                width: 90% !important;
                max-height: 350px !important;
                bottom: 5px !important;
                right: 5px !important;
                left: 5px !important;
                padding: 10px !important;
            }
            .dev-toolbar.minimized {
                width: 56px !important;
                height: 56px !important;
                max-height: 56px !important;
                bottom: 15px !important;
                right: 15px !important;
                left: auto !important;
            }
            .dev-unified-popup {
                width: 98% !important;
                left: 1% !important;
                top: 2% !important;
                padding: 12px !important;
                max-height: 95vh !important;
            }
            .dev-unified-popup .button-group {
                flex-direction: column !important;
                gap: 8px !important;
            }
            .dev-unified-popup .button-group button {
                width: 100% !important;
            }
            .dev-unified-popup .ref-list {
                flex-direction: column !important;
            }
        }
        .dev-modal-overlay {
            padding: 10px !important;
        }
        .dev-modal-overlay .modal-content {
            width: 90% !important;
            max-width: 90% !important;
            max-height: 90vh !important;
        }
        .dev-toolbar .badge-group {
            flex-wrap: wrap !important;
        }
        .dev-toolbar .badge-group span {
            font-size: 10px !important;
            padding: 1px 6px !important;
        }
        .dev-unified-popup .image-grid {
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)) !important;
        }
        .dev-toolbar .mobile-controls {
            display: none !important;
        }
        @media (max-width: 768px) {
            .dev-toolbar .mobile-controls {
                display: flex !important;
            }
        }
    `;

    const respStyleSheet = document.createElement("style");
    respStyleSheet.textContent = responsiveStyles;
    document.head.appendChild(respStyleSheet);

    // ===== Authentication =====
    function checkAuth() {
        const token = localStorage.getItem('my_agent_token');
        const userStr = localStorage.getItem('my_agent_user');
        console.log('Checking authentication...');
        if (token && userStr) {
            try {
                currentUser = JSON.parse(userStr);
                authToken = token;
                isGuestMode = false;
                console.log('User authenticated:', currentUser.username);
                updateAuthUI(true);
                return true;
            } catch (e) {
                console.error('Error parsing user data:', e);
                isGuestMode = true;
                updateAuthUI(false);
                return false;
            }
        } else {
            console.log('No authentication data found');
            isGuestMode = true;
            updateAuthUI(false);
            return false;
        }
    }

    function updateAuthUI(isAuthenticated) {
        if (!toolbar) return;
        const authStatus = toolbar.querySelector("#authStatus");
        const authButton = toolbar.querySelector("#authButton");
        const modelSelect = toolbar.querySelector("#modelSelect");
        const providerSelect = toolbar.querySelector("#providerSelect");
        const sendBtn = toolbar.querySelector("#sendBtn");
        const refreshBtn = toolbar.querySelector("#refreshModels");
        const apiKeyInput = toolbar.querySelector("#apiKeyInput");
        const saveApiKeyBtn = toolbar.querySelector("#saveApiKey");

        if (authStatus && authButton) {
            if (isAuthenticated) {
                authStatus.innerHTML = `<span style="color:#00ff88;">👤 ${currentUser?.username || 'User'}</span>`;
                authButton.innerHTML = "🚪 Logout";
                authButton.onclick = logout;
                authButton.style.background = "#ff4444";
            } else {
                authStatus.innerHTML = '<span style="color:#ffaa00;">👤 Guest</span>';
                authButton.innerHTML = "🔑 Login";
                authButton.onclick = showAuthModal;
                authButton.style.background = "#00e0ff";
            }
        }
        const shouldDisable = !isAuthenticated;
        [modelSelect, providerSelect, sendBtn, refreshBtn, apiKeyInput, saveApiKeyBtn].forEach(el => {
            if (el) {
                el.disabled = shouldDisable;
                el.style.opacity = shouldDisable ? "0.5" : "1";
                el.style.cursor = shouldDisable ? "not-allowed" : "pointer";
            }
        });
    }

    function showAuthModal() {
        closeAllModals();
        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay";
        Object.assign(overlay.style, {
            position: "fixed",
            left: 0, top: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.8)",
            zIndex: 1000002,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(5px)"
        });

        const modal = document.createElement("div");
        modal.className = "modal-content";
        Object.assign(modal.style, {
            background: "#1a1a2a",
            color: "#fff",
            padding: "25px",
            borderRadius: "12px",
            width: "400px",
            maxWidth: "95%",
            maxHeight: "80%",
            overflowY: "auto",
            border: "1px solid #444",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
        });

        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid #444;padding-bottom:15px;">
                <h3 style="margin:0;color:#00e0ff;font-size:18px;">🔐 Authentication Required</h3>
                <button id="closeAuth" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;padding:0;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
            <div style="margin-bottom:20px;text-align:center;">
                <div style="font-size:48px;margin-bottom:10px;">🔑</div>
                <div style="font-size:16px;color:#ccc;margin-bottom:20px;">Please login to access AI features</div>
            </div>
            <div id="authForm">
                <div style="margin-bottom:15px;">
                    <label style="display:block;font-size:13px;color:#aaa;margin-bottom:6px;">👤 Username</label>
                    <input type="text" id="authUsername" placeholder="Enter username" style="width:100%;padding:10px;border:1px solid #555;border-radius:6px;outline:none;font-size:14px;background:#1a1a2a;color:#fff;font-family:inherit;box-sizing:border-box;">
                </div>
                <div style="margin-bottom:20px;">
                    <label style="display:block;font-size:13px;color:#aaa;margin-bottom:6px;">🔒 Password</label>
                    <input type="password" id="authPassword" placeholder="Enter password" style="width:100%;padding:10px;border:1px solid #555;border-radius:6px;outline:none;font-size:14px;background:#1a1a2a;color:#fff;font-family:inherit;box-sizing:border-box;">
                </div>
                <div id="authError" style="display:none;background:rgba(255,68,68,0.1);color:#ff8888;padding:10px;border-radius:6px;margin-bottom:15px;border-left:3px solid #ff4444;font-size:13px;"></div>
                <div style="display:flex;gap:10px;margin-top:20px;">
                    <button id="loginBtn" style="flex:1;padding:12px;background:#00ff88;border:none;border-radius:6px;color:#000;cursor:pointer;font-weight:bold;font-size:14px;">🔓 Login</button>
                </div>
            </div>
            <div style="margin-top:20px;padding-top:15px;border-top:1px solid #444;font-size:12px;color:#888;">
                <div style="margin-bottom:5px;">📋 Login required for:</div>
                <ul style="margin:0;padding-left:20px;">
                    <li>🧠 AI model access</li>
                    <li>⚡ Project modifications</li>
                    <li>🖥️ Server management</li>
                    <li>🔑 API key storage</li>
                </ul>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        const closeModal = registerModal(overlay);

        const closeAuthBtn = modal.querySelector("#closeAuth");
        const loginBtn = modal.querySelector("#loginBtn");
        const authError = modal.querySelector("#authError");

        if (closeAuthBtn) closeAuthBtn.addEventListener("click", closeModal);

        if (loginBtn) {
            loginBtn.addEventListener("click", () => {
                const username = modal.querySelector("#authUsername").value.trim();
                const password = modal.querySelector("#authPassword").value.trim();
                if (!username || !password) {
                    authError.textContent = "Please enter both username and password";
                    authError.style.display = "block";
                    return;
                }
                performLogin(username, password);
            });
        }

        async function performLogin(username, password) {
            const loader = showLoader("Authenticating...");
            try {
                loginBtn.disabled = true;
                loginBtn.textContent = "Logging in...";
                const response = await fetch(`${python_host}/api/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Accept": "application/json" },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                if (data.success && data.token) {
                    localStorage.setItem("my_agent_token", data.token);
                    localStorage.setItem("my_agent_user", JSON.stringify(data.user));
                    authToken = data.token;
                    currentUser = data.user;
                    isGuestMode = false;
                    closeModal();
                    showNotification(`👋 Welcome ${currentUser.username}!`, "success");
                    updateAuthUI(true);
                    setTimeout(refreshModels, 500);
                } else {
                    throw new Error(data.error || "Login failed");
                }
            } catch (error) {
                console.error("Login error:", error);
                authError.textContent = error.message || "Login failed. Please try again.";
                authError.style.display = "block";
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = "🔓 Login";
                hideLoader();
            }
        }

        overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    }

    function logout() {
        console.log('Logging out...');
        fetch(`${python_host}/api/logout`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${authToken}` }
        }).catch(error => console.error('Logout API error:', error))
          .finally(() => {
            localStorage.removeItem("my_agent_token");
            localStorage.removeItem("my_agent_user");
            authToken = null;
            currentUser = null;
            isGuestMode = true;
            showNotification("👋 Logged out successfully", "success");
            updateAuthUI(false);
            buildToolbar();
        });
    }

    // ===== Fetch with Auth =====
    async function fetchWithAuth(url, options = {}) {
        const requiresAuth = !url.includes('/api/login') && !url.includes('/api/register');
        if (requiresAuth && !authToken && !isGuestMode) {
            showNotification("🔒 Please login to access this feature", "error");
            showAuthModal();
            throw new Error("Authentication required");
        }
        const isFormData = options.body instanceof FormData;
        const headers = { "Accept": "application/json", ...options.headers };
        if (!isFormData) headers["Content-Type"] = "application/json";
        if (requiresAuth && authToken) headers["Authorization"] = `Bearer ${authToken}`;
        try {
            const response = await fetch(`${python_host}${url}`, { ...options, headers });
            if (response.status === 401 || response.status === 403) {
                showNotification("⏰ Session expired. Please login again.", "error");
                logout();
                throw new Error("Authentication failed");
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Fetch error for ${url}:`, error);
            if (error.message.includes("Authentication")) {
                showNotification("🔒 Authentication error. Please login again.", "error");
                logout();
            }
            throw error;
        }
    }

    // ===== API Functions =====
    async function applyYamlChanges(yamlContent, requirementId) {
        console.log('Applying YAML changes...', { requirementId, yamlContent: yamlContent ? yamlContent.substring(0, 100) + '...' : 'Empty content' });
        const loader = showLoader("Applying changes to your project...");
        const requestData = {
            yaml_response: yamlContent,
            requirement_id: requirementId,
            timestamp: new Date().toISOString(),
            session_id: `dev_assistant_${Date.now()}`
        };
        try {
            const data = await fetchWithAuth('/api/apply_changes', {
                method: "POST",
                body: JSON.stringify(requestData)
            });
            if (data.success) {
                showNotification("✅ Changes applied successfully!", "success");
                if (requirementId && requirementId.startsWith('req_')) {
                    const index = parseInt(requirementId.split('_')[1]);
                    if (!isNaN(index) && selections[index]) {
                        selections[index].applied = true;
                        selections[index].applied_timestamp = new Date().toISOString();
                        saveSelections();
                    }
                }
            } else {
                throw new Error(data.error || 'Failed to apply changes');
            }
            closeAllModals();
            setTimeout(showReviewModal, 300);
        } catch (error) {
            console.error('Error applying changes:', error);
            showNotification(`❌ Failed to apply changes: ${error.message}`, "error");
            document.querySelectorAll('.applyChanges, #confirmApplyChanges').forEach(btn => {
                if (btn.innerHTML.includes('Apply')) {
                    btn.innerHTML = '📦 Apply Changes';
                    btn.disabled = false;
                    btn.style.background = "#00ff88";
                }
            });
        } finally {
            hideLoader();
        }
    }

    // ===== Model Management =====
    async function fetchModels(provider) {
        if (!authToken && !isGuestMode) {
            showNotification("🔒 Please login to fetch models", "error");
            showAuthModal();
            return [];
        }
        const loader = showLoader(`Fetching models for ${provider}...`);
        try {
            const data = await fetchWithAuth('/api/get_models', {
                method: "POST",
                body: JSON.stringify({ provider, _t: Date.now() })
            });
            if (data.models && Array.isArray(data.models)) {
                showNotification(`✅ Loaded ${data.models.length} models for ${provider}`, "success");
                return data.models;
            }
            showNotification(`⚠️ No models found for ${provider}`, "warning");
            return [];
        } catch (error) {
            console.error(`Error fetching models for ${provider}:`, error);
            showNotification(`❌ Failed to fetch models for ${provider}`, "error");
            return [];
        } finally {
            hideLoader();
        }
    }

    function saveModelSelection() {
        localStorage.setItem("dev_selected_model", selectedModel);
        localStorage.setItem("dev_selected_provider", selectedProvider);
    }

    // ===== Reference Management =====
    function autoSaveReferenceDescriptions(box) {
        const textareas = box.querySelectorAll('.reference-description');
        textareas.forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const refName = e.target.getAttribute('data-ref');
                const description = e.target.value.trim();
                const requirementIndex = parseInt(box.getAttribute('data-requirement-index') || '-1');
                if (requirementIndex >= 0 && selections[requirementIndex]?.reference_components?.[refName]) {
                    selections[requirementIndex].reference_components[refName].description = description;
                    saveSelections();
                }
            });
        });
    }

    function updateSelectedReferencesDisplay(box, allReferences, isNavMode) {
        const selectedRefsContainer = box.querySelector("#selectedReferences");
        const refDescriptionsContainer = box.querySelector("#referenceDescriptions");
        if (!selectedRefsContainer) return;

        selectedRefsContainer.innerHTML = '';
        refDescriptionsContainer.innerHTML = '';

        if (allReferences.size === 0) {
            selectedRefsContainer.innerHTML = `<div style="color:#666;text-align:center;font-size:12px;padding:15px;">📭 No reference components selected yet</div>`;
            return;
        }

        const refsList = document.createElement("div");
        refsList.className = "ref-list";
        refsList.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;";

        allReferences.forEach((refData, refName) => {
            const refChip = document.createElement("div");
            refChip.style.cssText = `
                display:flex;align-items:center;gap:6px;
                background:rgba(255,170,0,0.2);border:1px solid #ffaa00;
                border-radius:14px;padding:4px 10px;font-size:11px;color:#ffaa00;
            `;
            refChip.innerHTML = `
                <span>📄 ${refName}</span>
                <button class="remove-ref" data-ref="${refName}" style="background:none;border:none;color:#ffaa00;cursor:pointer;font-size:12px;padding:0;width:14px;height:14px;display:flex;align-items:center;justify-content:center;border-radius:50%;">✕</button>
            `;
            refsList.appendChild(refChip);
        });
        selectedRefsContainer.appendChild(refsList);

        allReferences.forEach((refData, refName) => {
            const descDiv = document.createElement("div");
            descDiv.style.marginBottom = "8px";
            descDiv.innerHTML = `
                <label style="display:block;font-size:12px;color:#ffaa00;margin-bottom:4px;">📝 Description for <strong>${refName}</strong>:</label>
                <textarea class="reference-description" data-ref="${refName}" placeholder="Describe how this reference component relates to the requirement..." style="width:100%;padding:8px;border:1px solid #555;border-radius:4px;background:#1a1a2a;color:#fff;font-size:12px;resize:vertical;min-height:40px;box-sizing:border-box;">${refData.description || ''}</textarea>
            `;
            refDescriptionsContainer.appendChild(descDiv);
        });

        selectedRefsContainer.querySelectorAll(".remove-ref").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const refToRemove = e.target.closest("button").getAttribute("data-ref");
                if (isNavMode) {
                    navigationReferences.delete(refToRemove);
                    updateSelectedReferencesDisplay(box, navigationReferences, true);
                } else {
                    allReferences.delete(refToRemove);
                    const requirementIndex = parseInt(box.getAttribute('data-requirement-index') || '-1');
                    if (requirementIndex >= 0 && selections[requirementIndex]?.reference_components) {
                        delete selections[requirementIndex].reference_components[refToRemove];
                        saveSelections();
                    }
                    updateSelectedReferencesDisplay(box, allReferences, false);
                }
            });
        });

        setTimeout(() => autoSaveReferenceDescriptions(box), 100);
    }

    // ===== Navigation Click Handler =====
    function handleNavigationClick(e) {
        if (!isNavigatingForReferences || e.target.closest(".dev-unified-popup")) return;
        e.preventDefault();
        e.stopPropagation();

        const clickedComponent = getBestComponentForClick(e.target);
        if (clickedComponent && clickedComponent.name) {
            const refName = clickedComponent.name;
            if (!navigationReferences.has(refName)) {
                navigationReferences.set(refName, {
                    description: `Reference component: ${refName}`,
                    componentDetails: clickedComponent.details
                });
                if (activeInputBox) {
                    const box = activeInputBox;
                    const requirementIndex = parseInt(box.getAttribute('data-requirement-index') || '-1');
                    if (requirementIndex >= 0 && selections[requirementIndex]) {
                        if (!selections[requirementIndex].reference_components) {
                            selections[requirementIndex].reference_components = {};
                        }
                        selections[requirementIndex].reference_components[refName] = {
                            name: refName,
                            description: `Reference component: ${refName}`,
                            componentDetails: clickedComponent.details
                        };
                        saveSelections();
                    }
                    updateSelectedReferencesDisplay(box, navigationReferences, true);
                }
                showNotification(`✅ Added ${refName} as reference component`, "success");
                highlightElement(e.target);
            } else {
                showNotification(`ℹ️ ${refName} is already added as reference`, "info");
            }
        }
    }

    // ===== Draggable =====
    function makeDraggable(element, handle) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        if (handle) {
            handle.addEventListener("mousedown", startDrag);
            handle.addEventListener("touchstart", (e) => {
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent("mousedown", {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                startDrag(mouseEvent);
            }, { passive: true });
        }

        function startDrag(e) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = parseInt(element.style.left) || 0;
            initialY = parseInt(element.style.top) || 0;
            document.addEventListener("mousemove", drag);
            document.addEventListener("mouseup", stopDrag);
            document.addEventListener("touchmove", (ev) => {
                const touch = ev.touches[0];
                const mouseEvent = new MouseEvent("mousemove", {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                drag(mouseEvent);
            }, { passive: true });
            document.addEventListener("touchend", stopDrag, { passive: true });
            e.preventDefault();
        }

        function drag(e) {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            let newX = initialX + dx;
            let newY = initialY + dy;
            const padding = 10;
            newX = Math.max(padding, Math.min(newX, window.innerWidth - element.offsetWidth - padding));
            newY = Math.max(padding, Math.min(newY, window.innerHeight - element.offsetHeight - padding));
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        }

        function stopDrag() {
            isDragging = false;
            document.removeEventListener("mousemove", drag);
            document.removeEventListener("mouseup", stopDrag);
        }
    }

    // ===== Unified Popup =====
    function showUnifiedPopup({ x, y, target, componentName, domPath, isNewComponent = false, requirementIndex = -1 }) {
        // Check if requirements are enabled (mobile only)
        if (isMobile() && !isRequirementEnabled) {
            showNotification("⛔ Requirements are disabled. Enable from toolbar.", "warning");
            return;
        }

        if (activeInputBox) {
            activeInputBox.remove();
            activeInputBox = null;
        }

        const isMobileView = isMobile();
        const popupWidth = isMobileView ? window.innerWidth - 20 : 700;
        const popupHeight = isMobileView ? window.innerHeight - 40 : 800;
        const adjustedX = isMobileView ? 10 : Math.max(10, Math.min(x, window.innerWidth - popupWidth - 10));
        const adjustedY = isMobileView ? 20 : Math.max(10, Math.min(y, window.innerHeight - popupHeight - 10));

        const elementText = getElementTextContent(target);
        const componentDetails = getComponentDetails(target);

        if (isNewComponent) {
            componentName = "App";
            componentDetails.name = "App";
        }

        const box = document.createElement("div");
        box.className = "dev-unified-popup";
        box.setAttribute('data-requirement-index', requirementIndex);
        Object.assign(box.style, {
            position: "fixed",
            left: `${adjustedX}px`,
            top: `${adjustedY}px`,
            background: "rgba(25,25,35,0.98)",
            color: "#fff",
            padding: isMobileView ? "15px" : "20px",
            borderRadius: "10px",
            zIndex: 1000000,
            width: `${popupWidth}px`,
            maxHeight: "90vh",
            overflowY: "auto",
            fontFamily: "system-ui, sans-serif",
            fontSize: isMobileView ? "13px" : "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            border: "1px solid #444",
            backdropFilter: "blur(10px)",
            boxSizing: "border-box"
        });

        // Initialize references for this requirement
        const currentReferences = new Map();
        if (requirementIndex >= 0 && selections[requirementIndex]?.reference_components) {
            Object.entries(selections[requirementIndex].reference_components).forEach(([name, data]) => {
                currentReferences.set(name, data);
            });
        }

        // If this is a new component, add App as reference
        if (isNewComponent && !currentReferences.has("App")) {
            currentReferences.set("App", {
                description: "Please follow code same way of this",
                componentDetails: {
                    name: "App",
                    domPath: "body > div#root",
                    textContent: "Main application component",
                    tagName: "div"
                }
            });
        }

        const detailsHTML = !isNewComponent ? `
            <div style="background:rgba(0,224,255,0.1);padding:12px;border-radius:8px;margin-bottom:15px;border-left:4px solid #00e0ff;">
                <div style="font-size:12px;color:#00e0ff;font-weight:bold;margin-bottom:8px;">📋 COMPONENT DETAILS</div>
                <div class="detail-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
                    <div>
                        <span style="color:#888;">📛 Name:</span>
                        <input type="text" id="componentNameEdit" value="${componentName}"
                            style="background:#1a1a2a;color:#fff;border:1px solid #00e0ff;border-radius:4px;padding:2px 6px;font-size:12px;font-weight:bold;width:100%;font-family:inherit;pointer-events:auto!important;z-index:1000001;position:relative;box-sizing:border-box;"
                            placeholder="Enter component name...">
                        <span style="font-size:9px;color:#888;display:block;margin-top:2px;">✏️ (editable)</span>
                    </div>
                    <div><span style="color:#888;">🏷️ Tag:</span> ${componentDetails.tagName || 'N/A'}</div>
                </div>
            </div>
            <div style="font-size:12px;color:#aaa;margin-bottom:12px;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;word-break:break-all;">📂 ${domPath}</div>
            ${elementText ? `<div style="font-size:13px;color:#ccc;margin-bottom:12px;padding:10px;background:rgba(255,255,255,0.05);border-radius:6px;border-left:3px solid #666;">💬 "${elementText}"</div>` : ''}
        ` : '';

        box.innerHTML = `
            <div id="popupHeader" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;cursor:move;">
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <b style="color:#00e0ff;font-size:16px;">${isNewComponent ? '✨ Create New Component' : '🔧 Modify Component'}</b>
                </div>
                <button id="closeBox" style="background:#ff4444;border:none;color:#fff;font-size:18px;cursor:pointer;padding:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:4px;" title="Close">✕</button>
            </div>
            ${detailsHTML}
            <div style="margin-bottom:15px;">
                <label style="display:block;font-size:13px;color:#aaa;margin-bottom:6px;">📌 Requirement Type *</label>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                        <input type="radio" name="requirementType" value="existing" ${!isNewComponent ? 'checked' : ''} style="margin:0;">
                        <span style="font-size:13px;">🔧 Modify Existing Component</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                        <input type="radio" name="requirementType" value="new" ${isNewComponent ? 'checked' : ''} style="margin:0;">
                        <span style="font-size:13px;">✨ Create New Component</span>
                    </label>
                </div>
            </div>
            <div id="newComponentFields" style="display:${isNewComponent ? 'block' : 'none'};margin-bottom:15px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div>
                        <label style="display:block;font-size:13px;color:#aaa;margin-bottom:6px;">📛 Component Name *</label>
                        <input type="text" id="newComponentName" value="${isNewComponent ? 'App' : ''}" placeholder="e.g., ProductList" style="width:100%;padding:8px;border:1px solid #555;border-radius:4px;outline:none;font-size:13px;background:#1a1a2a;color:#fff;font-family:inherit;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block;font-size:13px;color:#aaa;margin-bottom:6px;">🏷️ Component Type *</label>
                        <select id="newComponentType" style="width:100%;padding:8px;border:1px solid #555;border-radius:4px;outline:none;font-size:13px;background:#1a1a2a;color:#fff;font-family:inherit;box-sizing:border-box;">
                            <option value="component">🧩 Component</option>
                            <option value="page">📄 Page</option>
                            <option value="layout">📐 Layout</option>
                            <option value="context">🔄 Context</option>
                            <option value="hook">🪝 Hook</option>
                            <option value="util">🛠️ Utility</option>
                        </select>
                    </div>
                </div>
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block;font-size:13px;color:#aaa;margin-bottom:6px;">📝 Feature Request (Global)</label>
                <input type="text" id="featureRequest" placeholder="Overall feature description..." value="${globalFeatureRequest}" style="width:100%;padding:10px;border:1px solid #555;border-radius:6px;outline:none;font-size:14px;background:#1a1a2a;color:#fff;font-family:inherit;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block;font-size:13px;color:#aaa;margin-bottom:6px;">📋 Feature Details (Global)</label>
                <textarea id="featureDetails" placeholder="Describe the feature details, requirements, acceptance criteria..." style="width:100%;padding:10px;border:1px solid #555;border-radius:6px;outline:none;resize:vertical;height:70px;font-size:14px;background:#1a1a2a;color:#fff;font-family:inherit;box-sizing:border-box;">${globalFeatureDetails}</textarea>
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block;font-size:13px;color:#aaa;margin-bottom:8px;">🎯 Feature Type *</label>
                <div class="feature-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;">
                        <input type="checkbox" id="is_frontend" class="feature-type-checkbox" style="margin:0;">
                        <span style="font-size:13px;">🎨 Frontend</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;">
                        <input type="checkbox" id="is_backend" class="feature-type-checkbox" style="margin:0;">
                        <span style="font-size:13px;">⚙️ Backend</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;">
                        <input type="checkbox" id="is_full_stack" class="feature-type-checkbox" style="margin:0;">
                        <span style="font-size:13px;">🚀 Full Stack</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;">
                        <input type="checkbox" id="is_error" class="feature-type-checkbox" style="margin:0;">
                        <span style="font-size:13px;">🐛 Error</span>
                    </label>
                </div>
            </div>
            <div id="errorDescriptionSection" style="display:none;margin-bottom:15px;">
                <label style="display:block;font-size:13px;color:#ff4444;margin-bottom:6px;">🐛 Error Description *</label>
                <textarea id="errorDescription" placeholder="Describe the error in detail..." style="width:100%;padding:12px;border:1px solid #ff4444;border-radius:6px;outline:none;resize:vertical;height:80px;font-size:14px;background:rgba(255,68,68,0.1);color:#fff;font-family:inherit;box-sizing:border-box;"></textarea>
            </div>
            <div style="margin-bottom:15px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <div style="font-size:13px;color:#aaa;">📎 Reference Components:</div>
                    <button id="addMoreReferences" style="background:#ffaa00;color:#000;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;display:flex;align-items:center;gap:4px;">➕ Add More References</button>
                </div>
                <div id="selectedReferences" style="min-height:60px;border:1px dashed #555;border-radius:8px;padding:12px;background:rgba(255,255,255,0.05);">
                    <div style="color:#666;text-align:center;font-size:12px;padding:15px;">📭 No reference components selected yet</div>
                </div>
                <div id="referenceDescriptions" style="margin-top:10px;"></div>
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block;font-size:13px;color:#aaa;margin-bottom:6px;">📝 Requirement Description *</label>
                <textarea id="componentRequirement" placeholder="${isNewComponent ? 'Describe what this new component should do...' : 'Describe what should be changed or added to this component...'}" style="width:100%;padding:12px;border:1px solid #555;border-radius:6px;outline:none;resize:vertical;height:100px;font-size:14px;background:#1a1a2a;color:#fff;font-family:inherit;box-sizing:border-box;"></textarea>
                <div style="display:flex;justify-content:flex-end;margin-top:6px;">
                    <button id="refineRequirementBtn" style="padding:4px 12px;background:#9b59b6;border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:11px;font-weight:bold;transition:background 0.2s;pointer-events:auto;z-index:1000001;position:relative;">✨ Refine</button>
                </div>
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px;background:rgba(0,224,255,0.1);border-radius:6px;border:1px solid #00e0ff;">
                    <input type="checkbox" id="isActive" checked style="margin:0;">
                    <span style="font-size:13px;color:#00e0ff;font-weight:bold;">✅ Active Requirement</span>
                </label>
                <div style="font-size:11px;color:#888;margin-top:4px;margin-left:24px;">ℹ️ Only active requirements will be sent to the server</div>
            </div>
            <div class="button-group" style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;flex-wrap:wrap;gap:10px;">
                <div></div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button id="cancelBtn" style="padding:10px 20px;background:#666;border:none;border-radius:6px;cursor:pointer;color:#fff;font-size:14px;">❌ Cancel</button>
                    <button id="saveBtn" style="padding:10px 20px;background:#00ff88;border:none;border-radius:6px;cursor:pointer;color:#000;font-weight:bold;font-size:14px;">💾 Save Requirement</button>
                </div>
            </div>
        `;

        document.body.appendChild(box);
        activeInputBox = box;

        // Set requirement index for reference management
        box.setAttribute('data-requirement-index', requirementIndex);

        // Initialize references display
        updateSelectedReferencesDisplay(box, currentReferences, false);

        // Refine button handler
        const refineBtn = box.querySelector('#refineRequirementBtn');
        if (refineBtn) {
            const newRefineBtn = refineBtn.cloneNode(true);
            refineBtn.parentNode.replaceChild(newRefineBtn, refineBtn);
            newRefineBtn.style.pointerEvents = 'auto';
            newRefineBtn.style.cursor = 'pointer';
            newRefineBtn.style.position = 'relative';
            newRefineBtn.style.zIndex = '1000001';

            newRefineBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const textarea = box.querySelector('#componentRequirement');
                if (!textarea) { showNotification('❌ Requirement textarea not found', 'error'); return; }
                const description = textarea.value.trim();
                if (!description) { showNotification('⚠️ Please enter a requirement description first', 'warning'); return; }

                const originalText = newRefineBtn.innerHTML;
                newRefineBtn.innerHTML = '⏳ Refining...';
                newRefineBtn.disabled = true;
                newRefineBtn.style.background = '#f39c12';
                newRefineBtn.style.opacity = '0.7';
                newRefineBtn.style.cursor = 'not-allowed';

                try {
                    const reqIndex = parseInt(box.getAttribute('data-requirement-index') || '-1');
                    await refineRequirement(description, reqIndex,
                        (refined) => {
                            textarea.value = refined;
                            textarea.dispatchEvent(new Event('input'));
                            showNotification('✨ Requirement refined!', 'success');
                            if (description !== refined) {
                                const diffNotice = document.createElement('div');
                                diffNotice.style.cssText = `font-size:11px;color:#2ecc71;margin-top:4px;padding:6px 10px;background:rgba(46,204,113,0.1);border-radius:4px;border-left:3px solid #2ecc71;cursor:pointer;pointer-events:auto;z-index:1000001;position:relative;`;
                                diffNotice.innerHTML = `<span style="font-weight:bold;">✨ Refined</span><span style="color:#888;font-size:10px;">(Click to show original)</span><span style="display:none;">📄 Original: ${description}</span>`;
                                diffNotice.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    const originalSpan = diffNotice.querySelector('span:last-child');
                                    if (originalSpan.style.display === 'none') {
                                        originalSpan.style.display = 'inline';
                                        diffNotice.style.background = 'rgba(241,196,15,0.1)';
                                        diffNotice.style.borderLeftColor = '#f1c40f';
                                    } else {
                                        originalSpan.style.display = 'none';
                                        diffNotice.style.background = 'rgba(46,204,113,0.1)';
                                        diffNotice.style.borderLeftColor = '#2ecc71';
                                    }
                                });
                                const parent = textarea.parentElement;
                                const oldDiff = parent.querySelector('.refine-diff-notice');
                                if (oldDiff) oldDiff.remove();
                                diffNotice.className = 'refine-diff-notice';
                                parent.appendChild(diffNotice);
                            }
                        },
                        (error) => showNotification(`❌ Failed to refine: ${error}`, 'error')
                    );
                } catch (error) {
                    console.error('Refinement error:', error);
                    showNotification(`❌ Error: ${error.message}`, 'error');
                } finally {
                    newRefineBtn.innerHTML = originalText;
                    newRefineBtn.disabled = false;
                    newRefineBtn.style.background = '#9b59b6';
                    newRefineBtn.style.opacity = '1';
                    newRefineBtn.style.cursor = 'pointer';
                }
            });
        }

        // Component name auto-save
        const componentNameInput = box.querySelector("#componentNameEdit");
        let originalName = componentName;
        if (componentNameInput) {
            let saveTimeout = null;
            componentNameInput.addEventListener('focus', function() { this.select(); });
            componentNameInput.addEventListener('input', function(e) {
                const newName = this.value.trim();
                if (saveTimeout) clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    if (newName && newName !== originalName) {
                        const reqIndex = parseInt(box.getAttribute('data-requirement-index') || '-1');
                        if (reqIndex >= 0 && selections[reqIndex]) {
                            selections[reqIndex].component = newName;
                            if (selections[reqIndex].componentDetails) {
                                selections[reqIndex].componentDetails.name = newName;
                            }
                            saveSelections();
                            updateCount();
                            originalName = newName;
                            showNotification(`✅ Component name updated to "${newName}"`, "success");
                            const headerText = box.querySelector('#popupHeader b');
                            if (headerText) headerText.textContent = '🔧 Modify Component';
                        }
                    }
                }, 500);
            });
            componentNameInput.addEventListener('mousedown', e => e.stopPropagation());
            componentNameInput.addEventListener('click', e => e.stopPropagation());
        }

        makeDraggable(box, box.querySelector("#popupHeader"));

        // Feature type checkbox logic
        const featureTypeCheckboxes = box.querySelectorAll('.feature-type-checkbox');
        const errorDescriptionSection = box.querySelector('#errorDescriptionSection');
        const errorDescriptionTextarea = box.querySelector('#errorDescription');

        function getSelectedFeatureTypes() {
            const selectedTypes = [];
            featureTypeCheckboxes.forEach(checkbox => {
                if (checkbox.checked) selectedTypes.push(checkbox.id);
            });
            return selectedTypes;
        }

        featureTypeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.id === 'is_error') {
                    if (e.target.checked) {
                        errorDescriptionSection.style.display = 'block';
                    } else {
                        errorDescriptionSection.style.display = 'none';
                        errorDescriptionTextarea.value = '';
                    }
                }
            });
        });

        const addMoreRefsBtn = box.querySelector("#addMoreReferences");
        if (addMoreRefsBtn) {
            addMoreRefsBtn.addEventListener("click", () => {
                if (!isNavigatingForReferences) {
                    isNavigatingForReferences = true;
                    navigationReferences = new Map(currentReferences);
                    addMoreRefsBtn.textContent = "✅ Finish Adding References";
                    addMoreRefsBtn.style.background = "#00ff88";
                    showNotification("🔍 Navigation mode: Click on any component to add it as reference. Click 'Finish' when done.", "info");
                    document.addEventListener("click", handleNavigationClick, true);
                } else {
                    isNavigatingForReferences = false;
                    // Save references to requirement
                    const reqIndex = parseInt(box.getAttribute('data-requirement-index') || '-1');
                    if (reqIndex >= 0 && selections[reqIndex]) {
                        if (!selections[reqIndex].reference_components) {
                            selections[reqIndex].reference_components = {};
                        }
                        navigationReferences.forEach((refData, refName) => {
                            selections[reqIndex].reference_components[refName] = refData;
                        });
                        saveSelections();
                    }
                    currentReferences.clear();
                    navigationReferences.forEach((v, k) => currentReferences.set(k, v));
                    addMoreRefsBtn.textContent = "➕ Add More References";
                    addMoreRefsBtn.style.background = "#ffaa00";
                    showNotification(`✅ Finished adding references. ${currentReferences.size} references selected.`, "success");
                    document.removeEventListener("click", handleNavigationClick, true);
                    updateSelectedReferencesDisplay(box, currentReferences, false);
                }
            });
        }

        const requirementTypeRadios = box.querySelectorAll('input[name="requirementType"]');
        if (requirementTypeRadios.length > 0) {
            requirementTypeRadios.forEach(radio => {
                radio.addEventListener("change", (e) => {
                    const isNew = e.target.value === "new";
                    const newComponentFields = box.querySelector("#newComponentFields");
                    if (newComponentFields) newComponentFields.style.display = isNew ? "block" : "none";
                    const textarea = box.querySelector("#componentRequirement");
                    if (textarea) {
                        textarea.placeholder = isNew ? "Describe what this new component should do..." : "Describe what should be changed or added to this component...";
                    }
                });
            });
        }

        const saveBtn = box.querySelector("#saveBtn");
        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
                const reqIndex = parseInt(box.getAttribute('data-requirement-index') || '-1');
                const editedComponentName = box.querySelector("#componentNameEdit")?.value?.trim() || componentName;
                const requirementText = box.querySelector("#componentRequirement")?.value.trim() || "";
                const featureRequest = box.querySelector("#featureRequest")?.value.trim() || "";
                const featureDetails = box.querySelector("#featureDetails")?.value.trim() || "";
                const requirementType = box.querySelector('input[name="requirementType"]:checked')?.value || "existing";
                const isNew = requirementType === "new";
                const isActive = box.querySelector("#isActive")?.checked || true;
                const featureTypes = getSelectedFeatureTypes();
                const errorDescription = box.querySelector("#errorDescription")?.value.trim() || "";

                if (featureTypes.includes('is_error') && !errorDescription) {
                    showNotification("⚠️ Please provide error description when error checkbox is selected", "warning");
                    return;
                }

                let finalComponentName = editedComponentName;
                let componentType = "component";

                if (isNew) {
                    finalComponentName = box.querySelector("#newComponentName")?.value.trim() || "";
                    componentType = box.querySelector("#newComponentType")?.value || "component";
                    if (!finalComponentName) {
                        showNotification("⚠️ Please enter a component name for new component", "warning");
                        return;
                    }
                }

                if (!requirementText && !featureTypes.includes('is_error')) {
                    showNotification("⚠️ Please describe the requirement or select error type", "warning");
                    return;
                }

                globalFeatureRequest = featureRequest;
                globalFeatureDetails = featureDetails;
                localStorage.setItem("dev_global_feature_request", globalFeatureRequest);
                localStorage.setItem("dev_global_feature_details", globalFeatureDetails);

                // Get references from currentReferences
                const referenceComponentsObject = {};
                currentReferences.forEach((refData, refName) => {
                    const descTextarea = box.querySelector(`.reference-description[data-ref="${refName}"]`);
                    const description = descTextarea ? descTextarea.value.trim() : refData.description;
                    referenceComponentsObject[refName] = {
                        name: refName,
                        description: description || `Reference component: ${refName}`,
                        componentDetails: refData.componentDetails
                    };
                });

                const requirementData = {
                    requirement: requirementText,
                    reference_components: referenceComponentsObject,
                    isNewComponent: isNew,
                    componentType: isNew ? componentType : undefined,
                    componentDetails: !isNew ? componentDetails : null,
                    feature_types: featureTypes,
                    error_description: featureTypes.includes('is_error') ? errorDescription : undefined,
                    active: isActive,
                    component: finalComponentName
                };

                if (!isNew) requirementData.text = elementText;

                if (reqIndex >= 0 && selections[reqIndex]) {
                    // Update existing requirement
                    if (selections[reqIndex].yaml_response) {
                        requirementData.yaml_response = selections[reqIndex].yaml_response;
                        requirementData.response_id = selections[reqIndex].response_id;
                        requirementData.response_timestamp = selections[reqIndex].response_timestamp;
                        requirementData.model_used = selections[reqIndex].model_used;
                        requirementData.provider_used = selections[reqIndex].provider_used;
                    }
                    selections[reqIndex] = requirementData;
                } else {
                    // New requirement
                    selections.push(requirementData);
                }

                saveSelections();
                updateCount();

                if (isNavigatingForReferences) {
                    document.removeEventListener("click", handleNavigationClick, true);
                    isNavigatingForReferences = false;
                }

                box.remove();
                activeInputBox = null;
                showNotification(`✅ ${isNew ? 'New component' : 'Requirement'} saved for ${finalComponentName} with ${Object.keys(referenceComponentsObject).length} reference components`, "success");
            });
        }

        const cancelBtn = box.querySelector("#cancelBtn");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => {
                if (isNavigatingForReferences) {
                    document.removeEventListener("click", handleNavigationClick, true);
                    isNavigatingForReferences = false;
                }
                box.remove();
                activeInputBox = null;
            });
        }

        const closeBox = box.querySelector("#closeBox");
        if (closeBox) {
            closeBox.addEventListener("click", () => {
                if (isNavigatingForReferences) {
                    document.removeEventListener("click", handleNavigationClick, true);
                    isNavigatingForReferences = false;
                }
                box.remove();
                activeInputBox = null;
            });
        }

        // Image upload section
        setTimeout(() => {
            const requirementTextarea = box.querySelector("#componentRequirement");
            if (requirementTextarea && requirementTextarea.parentNode) {
                const imageSection = document.createElement("div");
                imageSection.style.cssText = `margin-top:15px;margin-bottom:15px;padding:10px;background:rgba(0,224,255,0.05);border:1px dashed #00e0ff;border-radius:6px;`;
                imageSection.innerHTML = `
                    <div style="font-size:12px;color:#00e0ff;margin-bottom:8px;font-weight:bold;">🖼️ UI Mockups / Design References</div>
                    <div style="font-size:11px;color:#aaa;margin-bottom:8px;">📤 Upload images to help the AI understand the desired UI design</div>
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <label style="padding:6px 12px;background:#00e0ff;color:#000;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">📎 Add Image<input type="file" id="imageUpload" accept="image/*" multiple style="display:none;"></label>
                        <span style="font-size:11px;color:#888;">🖼️ PNG, JPG, GIF, WebP, SVG supported</span>
                    </div>
                    <div id="imagePreviewContainer" class="image-grid" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;"></div>
                `;
                requirementTextarea.parentNode.insertBefore(imageSection, requirementTextarea.nextSibling);

                const fileInput = imageSection.querySelector("#imageUpload");
                const previewContainer = imageSection.querySelector("#imagePreviewContainer");

                if (fileInput) {
                    fileInput.addEventListener("change", async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        const reqIndex = parseInt(box.getAttribute('data-requirement-index') || '-1');
                        const saveIndex = reqIndex >= 0 ? reqIndex : selections.length;
                        for (const file of files) {
                            await uploadImageForRequirement(saveIndex, file, previewContainer);
                        }
                        fileInput.value = '';
                    });
                }
            }
        }, 100);
    }

    // ===== Toolbar =====
    function buildToolbar() {
        const existingToolbar = document.querySelector(".dev-toolbar");
        if (existingToolbar) existingToolbar.remove();

        toolbar = document.createElement("div");
        toolbar.className = "dev-toolbar";
        if (isMobile() && isMobileMinimized) {
            toolbar.classList.add("minimized");
        }
        Object.assign(toolbar.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 1000001,
            background: "rgba(30,30,40,0.95)",
            color: "#fff",
            padding: "15px",
            borderRadius: "10px",
            fontFamily: "system-ui, sans-serif",
            fontSize: "14px",
            boxShadow: "0 8px 25px rgba(0,0,0,0.4)",
            border: "1px solid #444",
            backdropFilter: "blur(10px)",
            width: "320px",
            maxHeight: "450px",
            overflowY: "auto",
            overflowX: "hidden",
            resize: "none",
            boxSizing: "border-box",
            transition: "all 0.3s ease"
        });

        const activeRequirements = selections.filter(req => req.active !== false).length;
        const isAuthenticated = !!authToken;

        toolbar.innerHTML = `
            <div class="toolbar-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;cursor:move;padding:8px;background:rgba(0,0,0,0.3);border-radius:6px;user-select:none;">
                <div class="badge-group" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="font-weight:bold;color:#00e0ff;font-size:15px;">🤖 Dev Assistant</span>
                    <span id="countBadge" style="background:#00e0ff;color:#000;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:bold;min-width:20px;text-align:center;">📋 ${selections.length}</span>
                    <span id="activeBadge" style="background:#00ff88;color:#000;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:bold;min-width:20px;text-align:center;">✅ ${activeRequirements}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                    <div class="mobile-controls" style="display:none;gap:6px;align-items:center;">
                        <button class="toggle-req-btn ${isRequirementEnabled ? 'enabled' : 'disabled'}" id="toggleRequirementBtn" title="${isRequirementEnabled ? 'Requirements ON' : 'Requirements OFF'}" style="background:rgba(255,255,255,0.1);border:1px solid ${isRequirementEnabled ? '#00ff88' : '#ff4444'};border-radius:4px;color:${isRequirementEnabled ? '#00ff88' : '#ff4444'};cursor:pointer;padding:4px 8px;font-size:10px;font-weight:bold;min-width:32px;text-align:center;">${isRequirementEnabled ? '✅ ON' : '⛔ OFF'}</button>
                        <button class="minimize-btn" id="minimizeBtn" title="Minimize" style="background:rgba(255,255,255,0.1);border:1px solid #555;border-radius:4px;color:#fff;cursor:pointer;padding:4px 8px;font-size:14px;font-weight:bold;min-width:32px;text-align:center;">➖</button>
                    </div>
                    <div id="authStatus" style="font-size:11px;">${isAuthenticated ? `<span style="color:#00ff88;">👤 ${currentUser?.username || 'User'}</span>` : '<span style="color:#ffaa00;">👤 Guest</span>'}</div>
                </div>
            </div>
            <div class="toolbar-content">
                <div style="margin-bottom:12px;">
                    <button id="authButton" style="width:100%;padding:8px;border:none;border-radius:6px;color:#000;cursor:pointer;font-size:12px;font-weight:bold;background:${isAuthenticated ? '#ff4444' : '#00e0ff'};">${isAuthenticated ? '🚪 Logout' : '🔑 Login'}</button>
                </div>
                <div style="margin-bottom:12px;padding:10px;background:rgba(0,224,255,0.1);border-radius:6px;border:1px solid #00e0ff;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center;">
                        <div>
                            <label style="display:block;font-size:11px;color:#00e0ff;margin-bottom:4px;">🔌 Provider</label>
                            <select id="providerSelect" style="width:100%;padding:6px;border:1px solid #555;border-radius:4px;outline:none;font-size:11px;background:#1a1a2a;color:#fff;font-family:inherit;cursor:pointer;${!isAuthenticated ? 'opacity:0.5;cursor:not-allowed;' : ''}" ${!isAuthenticated ? 'disabled' : ''}>
                                <option value="">${isAuthenticated ? 'Loading providers...' : '🔒 Login required'}</option>
                            </select>
                        </div>
                        <div>
                            <label style="display:block;font-size:11px;color:#00e0ff;margin-bottom:4px;">🧠 Model</label>
                            <select id="modelSelect" style="width:100%;padding:6px;border:1px solid #555;border-radius:4px;outline:none;font-size:11px;background:#1a1a2a;color:#fff;font-family:inherit;cursor:pointer;${!isAuthenticated ? 'opacity:0.5;cursor:not-allowed;' : ''}" ${!isAuthenticated ? 'disabled' : ''}>
                                <option value="">${isAuthenticated ? 'Select provider first' : '🔒 Login required'}</option>
                            </select>
                        </div>
                    </div>
                    <div id="apiKeySection" style="display:none;margin-top:8px;">
                        <div style="display:grid;grid-template-columns:1fr auto;gap:4px;align-items:center;">
                            <input type="password" id="apiKeyInput" placeholder="Enter API key..." style="width:100%;padding:6px;border:1px solid #555;border-radius:4px;outline:none;font-size:11px;background:#1a1a2a;color:#fff;font-family:inherit;${!isAuthenticated ? 'opacity:0.5;cursor:not-allowed;' : ''}" ${!isAuthenticated ? 'disabled' : ''}>
                            <div style="display:flex;gap:4px;">
                                <button id="saveApiKey" style="padding:6px 8px;background:#00ff88;border:none;border-radius:4px;color:#000;cursor:pointer;font-size:10px;font-weight:bold;white-space:nowrap;${!isAuthenticated ? 'opacity:0.5;cursor:not-allowed;' : ''}" ${!isAuthenticated ? 'disabled' : ''}>💾 Save</button>
                                <button id="toggleApiKey" style="padding:6px 8px;background:#00e0ff;border:none;border-radius:4px;color:#000;cursor:pointer;font-size:10px;font-weight:bold;white-space:nowrap;">👁️ Show</button>
                            </div>
                        </div>
                        <div id="apiKeyStatus" style="font-size:10px;margin-top:4px;"></div>
                    </div>
                    <button id="refreshModels" style="width:100%;margin-top:8px;padding:4px;background:#555;border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:10px;font-weight:bold;${!isAuthenticated ? 'opacity:0.5;cursor:not-allowed;' : ''}" ${!isAuthenticated ? 'disabled' : ''}>🔄 Refresh All</button>
                </div>
                <div style="margin-bottom:12px;padding:8px;background:rgba(0,255,136,0.1);border-radius:6px;border:1px solid #00ff88;">
                    <div style="font-size:12px;color:#00ff88;text-align:center;font-weight:bold;">🖱️ Click anywhere to add requirements</div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button id="reviewBtn" title="Review requirements" style="flex:1;padding:8px 12px;border:none;border-radius:6px;background:#444;color:#fff;cursor:pointer;font-size:12px;font-weight:500;">📋 Review</button>
                    <button id="sendBtn" title="Send to backend" style="flex:1;padding:8px 12px;border:none;border-radius:6px;background:#444;color:#fff;cursor:pointer;font-size:12px;font-weight:500;${!isAuthenticated ? 'opacity:0.5;' : ''}" ${!isAuthenticated ? 'disabled' : ''}>📤 Send</button>
                    <button id="clearBtn" title="Clear all" style="flex:1;padding:8px 12px;border:none;border-radius:6px;background:#444;color:#fff;cursor:pointer;font-size:12px;font-weight:500;">🗑️ Clear</button>
                </div>
            </div>
            <div class="minimized-label" style="display:none;font-size:24px;text-align:center;line-height:40px;">🤖</div>
        `;

        document.body.appendChild(toolbar);

        // Handle minimize for mobile
        const minimizeBtn = toolbar.querySelector("#minimizeBtn");
        if (minimizeBtn) {
            minimizeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleMinimize();
            });
        }

        // Handle requirement toggle for mobile
        const toggleReqBtn = toolbar.querySelector("#toggleRequirementBtn");
        if (toggleReqBtn) {
            toggleReqBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleRequirement();
            });
        }

        // Click on minimized toolbar to expand
        if (isMobile()) {
            toolbar.addEventListener("click", (e) => {
                if (toolbar.classList.contains("minimized") &&
                    !e.target.closest(".minimize-btn") &&
                    !e.target.closest(".toggle-req-btn")) {
                    toggleMinimize();
                }
            });
        }

        const dragHandle = toolbar.querySelector('.toolbar-header');
        makeDraggable(toolbar, dragHandle);

        if (isAuthenticated) initializeModelSelection();

        // Style buttons
        toolbar.querySelectorAll("button:not(#authButton):not(#saveApiKey):not(#toggleApiKey):not(#refreshModels):not(#minimizeBtn):not(#toggleRequirementBtn)").forEach(btn => {
            btn.onmouseenter = () => { if (!btn.disabled) btn.style.background = "#555"; };
            btn.onmouseleave = () => { if (!btn.disabled) btn.style.background = "#444"; };
        });

        const authButton = toolbar.querySelector("#authButton");
        if (authButton) authButton.onclick = isAuthenticated ? logout : showAuthModal;

        const sendBtn = toolbar.querySelector("#sendBtn");
        const reviewBtn = toolbar.querySelector("#reviewBtn");
        const clearBtn = toolbar.querySelector("#clearBtn");
        const refreshModelsBtn = toolbar.querySelector("#refreshModels");

        if (sendBtn) { sendBtn.style.background = "#00e0ff"; sendBtn.style.color = "#000"; sendBtn.addEventListener("click", sendToBackend); }
        if (reviewBtn) reviewBtn.addEventListener("click", showReviewModal);
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                if (selections.length > 0) {
                    if (confirm("🗑️ Clear all requirements?")) {
                        clearSelections();
                        showNotification("🗑️ All requirements cleared", "info");
                    }
                } else {
                    showNotification("📭 Nothing to clear", "info");
                }
            });
        }
        if (refreshModelsBtn && isAuthenticated) refreshModelsBtn.addEventListener("click", refreshModels);

        const saveApiKeyBtn = toolbar.querySelector("#saveApiKey");
        const toggleApiKeyBtn = toolbar.querySelector("#toggleApiKey");
        const apiKeyInput = toolbar.querySelector("#apiKeyInput");

        if (saveApiKeyBtn && toggleApiKeyBtn && apiKeyInput && isAuthenticated) {
            saveApiKeyBtn.addEventListener("click", async () => {
                const apiKey = apiKeyInput.value.trim();
                if (!apiKey) { showNotification("⚠️ Please enter an API key", "error"); return; }
                const loader = showLoader("Saving API key...");
                try {
                    const data = await fetchWithAuth('/api/save_api_key', {
                        method: "POST",
                        body: JSON.stringify({ provider: selectedProvider, api_key: apiKey })
                    });
                    if (data.success) {
                        localStorage.setItem(`dev_api_key_${selectedProvider}`, apiKey);
                        const maskedKey = apiKey.substring(0, 4) + "????" + apiKey.substring(apiKey.length - 4);
                        const apiKeyStatus = toolbar.querySelector("#apiKeyStatus");
                        apiKeyStatus.textContent = `✅ API key saved: ${maskedKey}`;
                        apiKeyStatus.style.color = "#00ff88";
                        showNotification(`✅ API key saved for ${selectedProvider}`, "success");
                    } else {
                        throw new Error(data.error || 'Failed to save API key');
                    }
                } catch (error) {
                    console.error("Error saving API key:", error);
                    showNotification(`❌ Failed to save API key: ${error.message}`, "error");
                    const apiKeyStatus = toolbar.querySelector("#apiKeyStatus");
                    apiKeyStatus.textContent = "❌ Failed to save API key";
                    apiKeyStatus.style.color = "#ff4444";
                } finally {
                    hideLoader();
                }
            });

            toggleApiKeyBtn.addEventListener("click", () => {
                if (apiKeyInput.type === "password") {
                    apiKeyInput.type = "text";
                    toggleApiKeyBtn.textContent = "🙈 Hide";
                } else {
                    apiKeyInput.type = "password";
                    toggleApiKeyBtn.textContent = "👁️ Show";
                }
            });
        }

        updateCount();
    }

    // ===== Mobile Toggle Functions =====
    function toggleMinimize() {
        isMobileMinimized = !isMobileMinimized;
        if (toolbar) {
            if (isMobileMinimized) {
                toolbar.classList.add("minimized");
                const minimizeBtn = toolbar.querySelector("#minimizeBtn");
                if (minimizeBtn) minimizeBtn.textContent = "➕";
            } else {
                toolbar.classList.remove("minimized");
                const minimizeBtn = toolbar.querySelector("#minimizeBtn");
                if (minimizeBtn) minimizeBtn.textContent = "➖";
            }
        }
    }

    function toggleRequirement() {
        isRequirementEnabled = !isRequirementEnabled;
        const toggleBtn = toolbar?.querySelector("#toggleRequirementBtn");
        if (toggleBtn) {
            if (isRequirementEnabled) {
                toggleBtn.className = "toggle-req-btn enabled";
                toggleBtn.textContent = "✅ ON";
                toggleBtn.style.borderColor = "#00ff88";
                toggleBtn.style.color = "#00ff88";
                showNotification("✅ Requirements enabled", "success");
            } else {
                toggleBtn.className = "toggle-req-btn disabled";
                toggleBtn.textContent = "⛔ OFF";
                toggleBtn.style.borderColor = "#ff4444";
                toggleBtn.style.color = "#ff4444";
                showNotification("⛔ Requirements disabled", "warning");
            }
        }
    }

    // ===== Model Selection =====
    async function initializeModelSelection() {
        const providerSelect = toolbar.querySelector("#providerSelect");
        const modelSelect = toolbar.querySelector("#modelSelect");
        if (!providerSelect || !modelSelect) { console.error("Provider or model select elements not found"); return; }

        const providers = [
            { value: 'ollama', label: '🦙 Ollama' },
            { value: 'lightning', label: '⚡ Lightning.ai' },
            { value: 'openai', label: '🤖 OpenAI' },
            { value: 'openrouter', label: '🌐 OpenRouter' },
            { value: 'anthropic', label: '🧠 Anthropic' },
            { value: 'google', label: '🔍 Google' },
            { value: 'aimlapi', label: '🎯 AIML API' },
            { value: 'nvidia', label: '💻 NVIDIA' },
            { value: 'apishop', label: '🛒 API Shop' },
            { value: 'opencode', label: '💻 OpenCode AI' },
            { value: 'omniroute', label: '🔄 OmniRoute' }
        ];

        providerSelect.innerHTML = '';
        providers.forEach(provider => {
            const option = document.createElement("option");
            option.value = provider.value;
            option.textContent = provider.label;
            if (provider.value === selectedProvider) option.selected = true;
            providerSelect.appendChild(option);
        });

        await updateApiKeySectionVisibility(selectedProvider);
        await loadModelsForProvider(selectedProvider);

        providerSelect.addEventListener("change", async (e) => {
            const newProvider = e.target.value;
            selectedProvider = newProvider;
            await updateApiKeySectionVisibility(newProvider);
            await loadModelsForProvider(newProvider);
            saveModelSelection();
            showNotification(`✅ Switched to ${newProvider} provider`, "success");
        });

        modelSelect.addEventListener("change", () => {
            selectedModel = modelSelect.value;
            saveModelSelection();
            showNotification(`✅ Model set to: ${selectedModel}`, "success");
        });

        const stopEventPropagation = (e) => { e.stopPropagation(); e.stopImmediatePropagation(); return true; };
        ['click', 'mousedown', 'mouseup', 'focus', 'pointerdown'].forEach(eventType => {
            providerSelect.addEventListener(eventType, stopEventPropagation);
            modelSelect.addEventListener(eventType, stopEventPropagation);
        });

        const refreshBtn = toolbar.querySelector("#refreshModels");
        if (refreshBtn) refreshBtn.addEventListener("click", (e) => { e.stopPropagation(); refreshModels(); });
    }

    async function updateApiKeySectionVisibility(provider) {
        const apiKeySection = toolbar.querySelector("#apiKeySection");
        const apiKeyStatus = toolbar.querySelector("#apiKeyStatus");
        const apiKeyInput = toolbar.querySelector("#apiKeyInput");
        if (!apiKeySection || !apiKeyStatus || !apiKeyInput) return;

        const requiresApiKey = ['openai', 'openrouter', 'anthropic', 'google', 'aimlapi', 'nvidia', 'apishop', 'opencode', 'omniroute'].includes(provider);

        if (requiresApiKey) {
            apiKeySection.style.display = 'block';
            try {
                const data = await fetchWithAuth(`/api/get_api_key/${provider}`, { method: "GET" });
                if (data.success && data.api_key) {
                    const maskedKey = data.api_key.substring(0, 4) + "????" + data.api_key.substring(data.api_key.length - 4);
                    apiKeyInput.value = data.api_key;
                    apiKeyInput.type = "password";
                    apiKeyStatus.textContent = `✅ API key loaded: ${maskedKey}`;
                    apiKeyStatus.style.color = "#00ff88";
                    localStorage.setItem(`dev_api_key_${provider}`, data.api_key);
                } else {
                    apiKeyInput.value = "";
                    apiKeyStatus.textContent = "⚠️ No API key found for this provider";
                    apiKeyStatus.style.color = "#ffaa00";
                }
            } catch (error) {
                apiKeyInput.value = "";
                apiKeyStatus.textContent = "❌ Error fetching API key";
                apiKeyStatus.style.color = "#ffaa00";
                console.error(`Error fetching API key for ${provider}:`, error);
            }
        } else {
            apiKeySection.style.display = 'none';
            apiKeyStatus.textContent = "";
            apiKeyInput.value = "";
        }
    }

    async function loadModelsForProvider(provider) {
        const modelSelect = toolbar.querySelector("#modelSelect");
        if (!modelSelect) { console.error("Model select element not found"); return; }

        modelSelect.innerHTML = '<option value="">⏳ Loading models...</option>';
        modelSelect.disabled = true;

        try {
            let models = [];
            let categorizedModels = null;

            if (provider === 'omniroute') {
                const data = await fetchWithAuth('/api/get_models', {
                    method: "POST",
                    body: JSON.stringify({ provider, _t: Date.now() })
                });
                if (data.models && Array.isArray(data.models)) {
                    models = data.models;
                    categorizedModels = data.categorized || null;
                }
            } else {
                models = await fetchModels(provider);
            }

            modelSelect.innerHTML = '';
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Select a model...";
            modelSelect.appendChild(defaultOption);

            if (categorizedModels && provider === 'omniroute') {
                for (const [providerName, providerData] of Object.entries(categorizedModels)) {
                    const freeModels = providerData.models.filter(m => m.free);
                    const paidModels = providerData.models.filter(m => !m.free);

                    if (freeModels.length > 0) {
                        const freeOptgroup = document.createElement("optgroup");
                        freeOptgroup.label = `🆓 ${providerData.display_name} (FREE)`;
                        freeModels.forEach(model => {
                            const option = document.createElement("option");
                            option.value = model.id;
                            option.textContent = model.name;
                            if (model.id === selectedModel) option.selected = true;
                            freeOptgroup.appendChild(option);
                        });
                        modelSelect.appendChild(freeOptgroup);
                    }

                    if (paidModels.length > 0) {
                        const paidOptgroup = document.createElement("optgroup");
                        paidOptgroup.label = `💎 ${providerData.display_name} (PAID)`;
                        paidModels.forEach(model => {
                            const option = document.createElement("option");
                            option.value = model.id;
                            option.textContent = model.name;
                            if (model.id === selectedModel) option.selected = true;
                            paidOptgroup.appendChild(option);
                        });
                        modelSelect.appendChild(paidOptgroup);
                    }
                }
            } else {
                models.forEach(model => {
                    const option = document.createElement("option");
                    option.value = model;
                    option.textContent = model;
                    if (model === selectedModel) option.selected = true;
                    modelSelect.appendChild(option);
                });
            }

            if (models.length > 0 && !models.includes(selectedModel)) {
                selectedModel = models[0];
                modelSelect.value = selectedModel;
                saveModelSelection();
            }

            modelSelect.disabled = false;
        } catch (error) {
            console.error("Error loading models:", error);
            modelSelect.innerHTML = '<option value="">❌ Failed to load models</option>';
            modelSelect.disabled = false;
        }
    }

    async function refreshModels() {
        const providerSelect = toolbar.querySelector("#providerSelect");
        if (!providerSelect) return;
        const currentProvider = providerSelect.value;
        const loader = showLoader(`Refreshing models for ${currentProvider}...`);
        try {
            if (availableModels[currentProvider]) {
                delete availableModels[currentProvider];
                localStorage.setItem("dev_available_models", JSON.stringify(availableModels));
            }
            await updateApiKeySectionVisibility(currentProvider);
            await loadModelsForProvider(currentProvider);
        } finally {
            hideLoader();
        }
    }

    function updateCount() {
        if (!toolbar) return;
        const countBadge = toolbar.querySelector("#countBadge");
        const activeBadge = toolbar.querySelector("#activeBadge");
        if (countBadge) countBadge.textContent = `📋 ${selections.length}`;
        if (activeBadge) {
            const activeRequirements = selections.filter(req => req.active !== false).length;
            activeBadge.textContent = `✅ ${activeRequirements}`;
        }
    }

    // ===== Review Modal =====
    function showReviewModal() {
        closeAllModals();
        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay";
        Object.assign(overlay.style, {
            position: "fixed", left: 0, top: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.8)", zIndex: 1000002,
            display: "flex", justifyContent: "center", alignItems: "center",
            backdropFilter: "blur(5px)", padding: "10px", boxSizing: "border-box"
        });

        const modal = document.createElement("div");
        modal.className = "modal-content";
        Object.assign(modal.style, {
            background: "#1a1a2a", color: "#fff", padding: "25px", borderRadius: "12px",
            width: "90%", maxWidth: "1000px", maxHeight: "85%", overflowY: "auto",
            border: "1px solid #444", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            boxSizing: "border-box"
        });

        const activeRequirements = selections.filter(req => req.active !== false);
        const inactiveRequirements = selections.filter(req => req.active === false);
        const newComponents = activeRequirements.filter(req => req.isNewComponent);
        const existingComponents = activeRequirements.filter(req => !req.isNewComponent);

        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid #444;padding-bottom:15px;flex-wrap:wrap;gap:10px;">
                <h3 style="margin:0;color:#00e0ff;font-size:18px;">📋 Requirements Review</h3>
                <button id="closeReview" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;padding:0;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
            <div style="margin-bottom:20px;">
                <div style="font-size:14px;color:#aaa;display:flex;gap:15px;margin-bottom:15px;flex-wrap:wrap;">
                    <span>📋 ${selections.length} requirement(s)</span>
                    <span style="color:#00ff88;">✅ ${activeRequirements.length} active</span>
                    <span style="color:#888;">⏸️ ${inactiveRequirements.length} inactive</span>
                    <span>✨ ${newComponents.length} new</span>
                    <span>🔧 ${existingComponents.length} existing</span>
                </div>
                ${globalFeatureRequest ? `<div style="background:rgba(255,255,255,0.05);padding:15px;border-radius:8px;margin-bottom:15px;"><div style="font-size:14px;color:#00e0ff;margin-bottom:8px;font-weight:bold;">📝 Feature Request</div><div style="font-size:13px;color:#ccc;">${globalFeatureRequest}</div></div>` : ''}
                ${globalFeatureDetails ? `<div style="background:rgba(255,255,255,0.05);padding:15px;border-radius:8px;margin-bottom:15px;"><div style="font-size:14px;color:#00e0ff;margin-bottom:8px;font-weight:bold;">📋 Feature Details</div><div style="font-size:13px;color:#ccc;white-space:pre-wrap;">${globalFeatureDetails}</div></div>` : ''}
            </div>
            ${activeRequirements.length > 0 ? `
                <div style="margin-bottom:20px;">
                    <h4 style="color:#00ff88;margin-bottom:10px;font-size:16px;">✅ Active Requirements</h4>
                    ${newComponents.length > 0 ? `<div style="margin-bottom:15px;"><h5 style="color:#00ff88;margin-bottom:8px;font-size:14px;">✨ New Components to Create</h5><div id="newComponentsList"></div></div>` : ''}
                    ${existingComponents.length > 0 ? `<div style="margin-bottom:15px;"><h5 style="color:#00e0ff;margin-bottom:8px;font-size:14px;">🔧 Existing Components to Modify</h5><div id="existingComponentsList"></div></div>` : ''}
                </div>
            ` : ''}
            ${inactiveRequirements.length > 0 ? `
                <div style="margin-bottom:20px;">
                    <h4 style="color:#888;margin-bottom:10px;font-size:16px;">⏸️ Inactive Requirements</h4>
                    <div id="inactiveComponentsList"></div>
                </div>
            ` : ''}
            ${selections.length === 0 ? `
                <div id="emptyState" style="text-align:center;padding:40px;color:#666;background:rgba(255,255,255,0.05);border-radius:8px;">
                    <div style="font-size:48px;margin-bottom:10px;">📭</div>
                    <div style="font-size:16px;margin-bottom:8px;">No requirements yet</div>
                    <div style="font-size:13px;color:#888;">Use the toolbar to add requirements</div>
                </div>
            ` : ''}
            <div style="margin-top:20px;text-align:right;border-top:1px solid #444;padding-top:15px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
                <button id="exportJson" style="padding:10px 16px;background:#555;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:13px;">📥 Export JSON</button>
                <button id="closeModal" style="padding:10px 20px;background:#00e0ff;border:none;border-radius:6px;color:#000;cursor:pointer;font-weight:bold;font-size:13px;">❌ Close</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        const closeModal = registerModal(overlay);

        // Create requirement element function
        const createRequirementElement = (req, index, isActive = true) => {
            const reqElement = document.createElement("div");
            const isNew = req.isNewComponent;
            reqElement.style.cssText = `
                background: ${isActive ? (isNew ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)') : 'rgba(255,255,255,0.02)'};
                padding:15px;margin-bottom:12px;border-radius:8px;
                border-left:4px solid ${isActive ? (isNew ? '#00ff88' : '#00e0ff') : '#666'};
                transition:background 0.2s;opacity:${isActive ? '1' : '0.7'};
            `;

            const componentDetailsHTML = req.componentDetails ? `
                <div style="background:rgba(0,224,255,0.1);padding:10px;border-radius:4px;margin:8px 0;font-size:11px;">
                    <div style="color:#00e0ff;font-weight:bold;margin-bottom:4px;">📋 Component Details:</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;">
                        <div><span style="color:#888;">🏷️ Tag:</span> ${req.componentDetails.tagName || 'N/A'}</div>
                        <div><span style="color:#888;">💬 Text:</span> ${req.componentDetails.textContent || 'N/A'}</div>
                    </div>
                </div>
            ` : '';

            const featureTypesHTML = req.feature_types && req.feature_types.length > 0 ? `
                <div style="margin-top:8px;">
                    <div style="font-size:11px;color:#00e0ff;font-weight:bold;margin-bottom:4px;">🎯 Feature Types:</div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;">
                        ${req.feature_types.map(type => {
                            const labels = { 'is_frontend': '🎨 Frontend', 'is_backend': '⚙️ Backend', 'is_full_stack': '🚀 Full Stack', 'is_error': '🐛 Error' };
                            return `<span style="background:rgba(0,224,255,0.2);color:#00e0ff;padding:2px 8px;border-radius:10px;font-size:10px;border:1px solid #00e0ff;">${labels[type] || type}</span>`;
                        }).join('')}
                    </div>
                </div>
            ` : '';

            const errorDescriptionHTML = req.error_description ? `
                <div style="margin-top:8px;">
                    <div style="font-size:11px;color:#ff4444;font-weight:bold;margin-bottom:4px;">🐛 Error Description:</div>
                    <div style="background:rgba(255,68,68,0.1);padding:8px;border-radius:4px;font-size:12px;color:#ff8888;border-left:3px solid #ff4444;">${req.error_description}</div>
                </div>
            ` : '';

            const refComponentsHTML = req.reference_components && Object.keys(req.reference_components).length > 0 ? `
                <div style="margin-top:8px;">
                    <div style="font-size:11px;color:#ffaa00;font-weight:bold;margin-bottom:4px;">📎 Reference Components:</div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;">
                        ${Object.values(req.reference_components).map(ref => `<span style="background:rgba(255,170,0,0.2);color:#ffaa00;padding:2px 8px;border-radius:10px;font-size:10px;border:1px solid #ffaa00;">📄 ${ref.name}</span>`).join('')}
                    </div>
                </div>
            ` : '';

            const imagesHTML = req.images && req.images.length > 0 ? `
                <div style="margin-top:8px;">
                    <div style="font-size:11px;color:#00e0ff;font-weight:bold;margin-bottom:4px;">🖼️ Attached Images:</div>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        ${req.images.map(img => `
                            <div style="width:80px;height:80px;border-radius:6px;overflow:hidden;border:2px solid #00e0ff;background:#1a1a2a;position:relative;flex-shrink:0;">
                                <img src="${img.url.startsWith('http') ? img.url : python_host + img.url}" alt="${img.filename || 'Image'}" style="width:100%;height:100%;object-fit:cover;cursor:pointer;" onclick="window.open('${img.url.startsWith('http') ? img.url : python_host + img.url}', '_blank')" onerror="this.style.display='none'">
                                <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.7);color:#fff;font-size:8px;padding:2px 4px;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${img.filename || ''}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '';

            const imagesInactiveHTML = req.images && req.images.length > 0 ? `
                <div style="margin-top:8px;">
                    <div style="font-size:11px;color:#888;font-weight:bold;margin-bottom:4px;">🖼️ Attached Images (${req.images.length})</div>
                </div>
            ` : '';

            const responseStatusHTML = req.yaml_response ? `
                <div style="background:rgba(0,255,136,0.1);padding:8px;border-radius:4px;margin:8px 0;border-left:3px solid #00ff88;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                        <div>
                            <span style="color:#00ff88;font-weight:bold;font-size:11px;">✅ Response Received</span>
                            <span style="color:#888;font-size:10px;margin-left:8px;">${req.response_timestamp ? new Date(req.response_timestamp).toLocaleString() : ''}</span>
                        </div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button class="viewYamlResponse" data-index="${index}" style="background:#00e0ff;color:#000;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:bold;">👁️ View YAML</button>
                            <button class="applyChanges" data-index="${index}" style="background:#00ff88;color:#000;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:bold;">📦 Apply Changes</button>
                        </div>
                    </div>
                </div>
            ` : `
                <div style="background:rgba(255,170,0,0.1);padding:8px;border-radius:4px;margin:8px 0;border-left:3px solid #ffaa00;">
                    <span style="color:#ffaa00;font-weight:bold;font-size:11px;">⏳ Waiting for response...</span>
                </div>
            `;

            const activeStatusHTML = `
                <div style="margin-top:8px;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span style="font-size:11px;color:${req.active !== false ? '#00ff88' : '#888'};font-weight:bold;">${req.active !== false ? '✅ ACTIVE' : '⏸️ INACTIVE'}</span>
                        <button class="toggleActive" data-index="${index}" style="background:${req.active !== false ? '#ffaa00' : '#00ff88'};color:#000;border:none;padding:2px 6px;border-radius:4px;cursor:pointer;font-size:9px;font-weight:bold;">${req.active !== false ? '⏸️ Deactivate' : '▶️ Activate'}</button>
                    </div>
                </div>
            `;

            reqElement.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <div style="flex:1;min-width:150px;">
                        <b style="color:${isActive ? (isNew ? '#00ff88' : '#00e0ff') : '#666'};font-size:15px;">${req.component}</b>
                        ${req.model_used ? `<div style="font-size:11px;color:#888;margin-top:4px;">🧠 ${req.provider_used || 'ollama'} / ${req.model_used}</div>` : ''}
                        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap;">
                            ${isNew ? `<span style="background:${isActive ? '#00ff88' : '#666'};color:#000;padding:2px 6px;border-radius:10px;font-size:10px;font-weight:bold;">✨ NEW ${(req.componentType || 'COMPONENT').toUpperCase()}</span>` : ''}
                            ${req.has_images ? `<span style="background:#ff6b35;color:#000;padding:2px 6px;border-radius:10px;font-size:10px;font-weight:bold;">🖼️ ${req.images?.length || 0} IMAGES</span>` : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button class="editReq" data-index="${index}" style="background:#00e0ff;color:#000;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:bold;">✏️ Edit</button>
                        <button class="sendReq" data-index="${index}" style="background:#ffaa00;color:#000;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:bold;${!isActive ? 'display:none;' : ''}">📤 Send</button>
                        <button class="deleteReq" data-index="${index}" style="background:#ff4444;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:bold;">🗑️ Delete</button>
                    </div>
                </div>
                <div style="margin:10px 0;font-size:14px;line-height:1.4;background:rgba(0,0,0,0.3);padding:10px;border-radius:4px;word-wrap:break-word;">${req.requirement}</div>
                ${isActive ? imagesHTML : imagesInactiveHTML}
                ${activeStatusHTML}
                ${isActive ? responseStatusHTML : ''}
                ${componentDetailsHTML}
                ${featureTypesHTML}
                ${errorDescriptionHTML}
                ${refComponentsHTML}
                ${req.text ? `<div style="font-size:12px;color:#ccc;margin-bottom:8px;padding:6px;background:rgba(255,255,255,0.05);border-radius:4px;">💬 "${req.text}"</div>` : ''}
            `;
            return reqElement;
        };

        // Populate lists
        if (newComponents.length > 0) {
            const list = modal.querySelector("#newComponentsList");
            if (list) newComponents.forEach(req => list.appendChild(createRequirementElement(req, selections.indexOf(req), true)));
        }
        if (existingComponents.length > 0) {
            const list = modal.querySelector("#existingComponentsList");
            if (list) existingComponents.forEach(req => list.appendChild(createRequirementElement(req, selections.indexOf(req), true)));
        }
        if (inactiveRequirements.length > 0) {
            const list = modal.querySelector("#inactiveComponentsList");
            if (list) inactiveRequirements.forEach(req => list.appendChild(createRequirementElement(req, selections.indexOf(req), false)));
        }

        // Event listeners
        modal.querySelectorAll(".viewYamlResponse").forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute("data-index"));
                const req = selections[index];
                if (req.yaml_response) {
                    closeModal();
                    setTimeout(() => showYamlModalWithApply(req.yaml_response, req.component, req.response_id || `req_${index}`), 300);
                }
            });
        });

        modal.querySelectorAll(".applyChanges").forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute("data-index"));
                const req = selections[index];
                if (req.yaml_response) {
                    closeModal();
                    setTimeout(() => showYamlModalWithApply(req.yaml_response, req.component, req.response_id || `req_${index}`), 300);
                } else {
                    showNotification("❌ No YAML response available for this requirement", "error");
                }
            });
        });

        modal.querySelectorAll(".toggleActive").forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute("data-index"));
                selections[index].active = !selections[index].active;
                saveSelections();
                updateCount();
                closeModal();
                setTimeout(showReviewModal, 100);
            });
        });

        modal.querySelectorAll(".editReq").forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute("data-index"));
                const req = selections[index];
                closeModal();
                setTimeout(() => {
                    const isMobileView = isMobile();
                    const centerX = isMobileView ? 10 : window.innerWidth / 2 - 350;
                    const centerY = isMobileView ? 20 : window.innerHeight / 2 - 400;
                    showEditRequirementModal(req, index);
                }, 300);
            });
        });

        modal.querySelectorAll(".sendReq").forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const index = parseInt(e.target.getAttribute("data-index"));
                const req = selections[index];
                const sendBtn = e.target;
                const originalText = sendBtn.textContent;
                sendBtn.textContent = "⏳ Sending...";
                sendBtn.disabled = true;
                try {
                    await sendSingleRequirement(req, index);
                    showNotification(`✅ Sent ${req.component} to backend`, "success");
                    closeModal();
                    setTimeout(showReviewModal, 100);
                } catch (error) {
                    showNotification(`❌ Failed to send ${req.component}`, "error");
                    sendBtn.textContent = originalText;
                    sendBtn.disabled = false;
                }
            });
        });

        modal.querySelectorAll(".deleteReq").forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute("data-index"));
                if (confirm("🗑️ Delete this requirement?")) {
                    selections.splice(index, 1);
                    saveSelections();
                    closeModal();
                    updateCount();
                    setTimeout(showReviewModal, 100);
                }
            });
        });

        modal.querySelector("#exportJson")?.addEventListener("click", () => {
            const dataStr = JSON.stringify({ requirements: selections, globalFeatureRequest, globalFeatureDetails }, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `dev-requirements-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showNotification("📥 Requirements exported", "success");
        });

        modal.querySelector("#closeReview")?.addEventListener("click", closeModal);
        modal.querySelector("#closeModal")?.addEventListener("click", closeModal);
        overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    }

    // ===== Edit Requirement Modal =====
    function showEditRequirementModal(requirement, index) {
        closeAllModals();

        const isMobileView = isMobile();
        const popupWidth = isMobileView ? window.innerWidth - 20 : 700;
        const popupHeight = isMobileView ? window.innerHeight - 40 : 800;
        const centerX = isMobileView ? 10 : window.innerWidth / 2 - popupWidth / 2;
        const centerY = isMobileView ? 20 : window.innerHeight / 2 - popupHeight / 2;

        const componentName = requirement.component;
        const domPath = (requirement.componentDetails?.domPath && !requirement.componentDetails.domPath.includes('src/'))
            ? requirement.componentDetails.domPath
            : (requirement.componentDetails?.domPath || "Unknown path");
        const elementText = requirement.componentDetails?.textContent || requirement.text || "";
        const componentDetails = requirement.componentDetails || {};

        const box = document.createElement("div");
        box.className = "dev-unified-popup";
        box.setAttribute('data-requirement-index', index);
        Object.assign(box.style, {
            position: "fixed",
            left: `${centerX}px`,
            top: `${centerY}px`,
            background: "rgba(25,25,35,0.98)",
            color: "#fff",
            padding: isMobileView ? "15px" : "20px",
            borderRadius: "10px",
            zIndex: 1000000,
            width: `${popupWidth}px`,
            maxHeight: "90vh",
            overflowY: "auto",
            fontFamily: "system-ui, sans-serif",
            fontSize: isMobileView ? "13px" : "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            border: "1px solid #444",
            backdropFilter: "blur(10px)",
            boxSizing: "border-box"
        });

        // Load references for this requirement
        const currentReferences = new Map();
        if (requirement.reference_components) {
            Object.entries(requirement.reference_components).forEach(([name, data]) => {
                currentReferences.set(name, data);
            });
        }

        const isNewComponent = requirement.isNewComponent || false;
        if (isNewComponent && !currentReferences.has("App")) {
            currentReferences.set("App", {
                description: "Please follow code same way of this",
                componentDetails: {
                    name: "App",
                    domPath: "body > div#root",
                    textContent: "Main application component",
                    tagName: "div"
                }
            });
        }

        if (requirement.images && requirement.images.length > 0) {
            uploadedImages[index] = requirement.images.map(img => ({
                id: img.id,
                url: img.url,
                filename: img.filename,
                file: null,
                isExisting: true
            }));
        }

        box.innerHTML = `
            <div id="popupHeader" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;cursor:move;">
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <b style="color:#00e0ff;font-size:16px;">✏️ Edit Requirement</b>
                </div>
                <button id="closeBox" style="background:#ff4444;border:none;color:#fff;font-size:18px;cursor:pointer;padding:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:4px;" title="Close">✕</button>
            </div>
            <div style="background:rgba(0,224,255,0.1);padding:12px;border-radius:8px;margin-bottom:15px;border-left:4px solid #00e0ff;">
                <div style="font-size:12px;color:#00e0ff;font-weight:bold;margin-bottom:8px;">📋 COMPONENT DETAILS</div>
                <div class="detail-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
                    <div>
                        <span style="color:#888;">📛 Name:</span>
                        <input type="text" id="componentNameEdit" value="${componentName}"
                            style="background:#1a1a2a;color:#fff;border:1px solid #00e0ff;border-radius:4px;padding:2px 6px;font-size:12px;font-weight:bold;width:100%;font-family:inherit;pointer-events:auto!important;z-index:1000001;position:relative;box-sizing:border-box;"
                            placeholder="Enter component name...">
                        <span style="font-size:9px;color:#888;display:block;margin-top:2px;">✏️ (editable)</span>
                    </div>
                    <div><span style="color:#888;">🏷️ Type:</span> ${isNewComponent ? (requirement.componentType || 'component') : 'Existing'}</div>
                </div>
            </div>
            <div style="font-size:12px;color:#aaa;margin-bottom:12px;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;word-break:break-all;">📂 ${domPath}</div>
            ${elementText ? `<div style="font-size:13px;color:#ccc;margin-bottom:12px;padding:10px;background:rgba(255,255,255,0.05);border-radius:6px;border-left:3px solid #666;">💬 "${elementText}"</div>` : ''}
            <div style="margin-bottom:15px;">
                <label style="display:block;font-size:13px;color:#aaa;margin-bottom:6px;">📌 Requirement Type</label>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                        <input type="radio" name="requirementType" value="existing" ${!isNewComponent ? 'checked' : ''} style="margin:0;" ${isNewComponent ? 'disabled' : ''}>
                        <span style="font-size:13px;">🔧 Modify Existing Component</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                        <input type="radio" name="requirementType" value="new" ${isNewComponent ? 'checked' : ''} style="margin:0;" ${!isNewComponent ? 'disabled' : ''}>
                        <span style="font-size:13px;">✨ Create New Component</span>
                    </label>
                </div>
            </div>
            <div id="newComponentFields" style="display:${isNewComponent ? 'block' : 'none'};margin-bottom:15px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div>
                        <label style="display:block;font-size:13px;color:#aaa;margin-bottom:6px;">📛 Component Name *</label>
                        <input type="text" id="newComponentName" value="${componentName}" placeholder="e.g., ProductList" style="width:100%;padding:8px;border:1px solid #555;border-radius:4px;outline:none;font-size:13px;background:#1a1a2a;color:#fff;font-family:inherit;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block;font-size:13px;color:#aaa;margin-bottom:6px;">🏷️ Component Type *</label>
                        <select id="newComponentType" style="width:100%;padding:8px;border:1px solid #555;border-radius:4px;outline:none;font-size:13px;background:#1a1a2a;color:#fff;font-family:inherit;box-sizing:border-box;">
                            <option value="component" ${requirement.componentType === 'component' ? 'selected' : ''}>🧩 Component</option>
                            <option value="page" ${requirement.componentType === 'page' ? 'selected' : ''}>📄 Page</option>
                            <option value="layout" ${requirement.componentType === 'layout' ? 'selected' : ''}>📐 Layout</option>
                            <option value="context" ${requirement.componentType === 'context' ? 'selected' : ''}>🔄 Context</option>
                            <option value="hook" ${requirement.componentType === 'hook' ? 'selected' : ''}>🪝 Hook</option>
                            <option value="util" ${requirement.componentType === 'util' ? 'selected' : ''}>🛠️ Utility</option>
                        </select>
                    </div>
                </div>
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block;font-size:13px;color:#aaa;margin-bottom:6px;">📝 Feature Request (Global)</label>
                <input type="text" id="featureRequest" placeholder="Overall feature description..." value="${globalFeatureRequest}" style="width:100%;padding:10px;border:1px solid #555;border-radius:6px;outline:none;font-size:14px;background:#1a1a2a;color:#fff;font-family:inherit;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block;font-size:13px;color:#aaa;margin-bottom:6px;">📋 Feature Details (Global)</label>
                <textarea id="featureDetails" placeholder="Describe the feature details, requirements, acceptance criteria..." style="width:100%;padding:10px;border:1px solid #555;border-radius:6px;outline:none;resize:vertical;height:70px;font-size:14px;background:#1a1a2a;color:#fff;font-family:inherit;box-sizing:border-box;">${globalFeatureDetails}</textarea>
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block;font-size:13px;color:#aaa;margin-bottom:8px;">🎯 Feature Type *</label>
                <div class="feature-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;">
                        <input type="checkbox" id="is_frontend" class="feature-type-checkbox" style="margin:0;" ${requirement.feature_types?.includes('is_frontend') ? 'checked' : ''}>
                        <span style="font-size:13px;">🎨 Frontend</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;">
                        <input type="checkbox" id="is_backend" class="feature-type-checkbox" style="margin:0;" ${requirement.feature_types?.includes('is_backend') ? 'checked' : ''}>
                        <span style="font-size:13px;">⚙️ Backend</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;">
                        <input type="checkbox" id="is_full_stack" class="feature-type-checkbox" style="margin:0;" ${requirement.feature_types?.includes('is_full_stack') ? 'checked' : ''}>
                        <span style="font-size:13px;">🚀 Full Stack</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;">
                        <input type="checkbox" id="is_error" class="feature-type-checkbox" style="margin:0;" ${requirement.feature_types?.includes('is_error') ? 'checked' : ''}>
                        <span style="font-size:13px;">🐛 Error</span>
                    </label>
                </div>
            </div>
            <div id="errorDescriptionSection" style="display:${requirement.feature_types?.includes('is_error') ? 'block' : 'none'};margin-bottom:15px;">
                <label style="display:block;font-size:13px;color:#ff4444;margin-bottom:6px;">🐛 Error Description *</label>
                <textarea id="errorDescription" placeholder="Describe the error in detail..." style="width:100%;padding:12px;border:1px solid #ff4444;border-radius:6px;outline:none;resize:vertical;height:80px;font-size:14px;background:rgba(255,68,68,0.1);color:#fff;font-family:inherit;box-sizing:border-box;">${requirement.error_description || ''}</textarea>
            </div>
            <div style="margin-bottom:15px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <div style="font-size:13px;color:#aaa;">📎 Reference Components:</div>
                    <button id="addMoreReferences" style="background:#ffaa00;color:#000;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;display:flex;align-items:center;gap:4px;">➕ Add More References</button>
                </div>
                <div id="selectedReferences" style="min-height:60px;border:1px dashed #555;border-radius:8px;padding:12px;background:rgba(255,255,255,0.05);">
                    <div style="color:#666;text-align:center;font-size:12px;padding:15px;">📭 No reference components selected yet</div>
                </div>
                <div id="referenceDescriptions" style="margin-top:10px;"></div>
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block;font-size:13px;color:#aaa;margin-bottom:6px;">📝 Requirement Description *</label>
                <textarea id="componentRequirement" placeholder="${isNewComponent ? 'Describe what this new component should do...' : 'Describe what should be changed or added to this component...'}" style="width:100%;padding:12px;border:1px solid #555;border-radius:6px;outline:none;resize:vertical;height:100px;font-size:14px;background:#1a1a2a;color:#fff;font-family:inherit;box-sizing:border-box;">${requirement.requirement || ''}</textarea>
                <div style="display:flex;justify-content:flex-end;margin-top:6px;">
                    <button id="refineRequirementBtn" style="padding:4px 12px;background:#9b59b6;border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:11px;font-weight:bold;transition:background 0.2s;">✨ Refine</button>
                </div>
            </div>
            <div id="imageUploadSection" style="margin-top:15px;margin-bottom:15px;padding:10px;background:rgba(0,224,255,0.05);border:1px dashed #00e0ff;border-radius:6px;">
                <div style="font-size:12px;color:#00e0ff;margin-bottom:8px;font-weight:bold;">🖼️ UI Mockups / Design References${requirement.images && requirement.images.length > 0 ? `<span style="color:#00ff88;margin-left:8px;">(${requirement.images.length} images attached)</span>` : ''}</div>
                <div style="font-size:11px;color:#aaa;margin-bottom:8px;">📤 Upload images to help the AI understand the desired UI design</div>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <label style="padding:6px 12px;background:#00e0ff;color:#000;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">📎 Add Image<input type="file" id="imageUpload" accept="image/*" multiple style="display:none;"></label>
                    <span style="font-size:11px;color:#888;">🖼️ PNG, JPG, GIF, WebP, SVG supported</span>
                </div>
                <div id="imagePreviewContainer" class="image-grid" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;"></div>
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px;background:rgba(0,224,255,0.1);border-radius:6px;border:1px solid #00e0ff;">
                    <input type="checkbox" id="isActive" ${requirement.active !== false ? 'checked' : ''} style="margin:0;">
                    <span style="font-size:13px;color:#00e0ff;font-weight:bold;">✅ Active Requirement</span>
                </label>
                <div style="font-size:11px;color:#888;margin-top:4px;margin-left:24px;">ℹ️ Only active requirements will be sent to the server</div>
            </div>
            <div class="button-group" style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;flex-wrap:wrap;gap:10px;">
                <div></div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button id="cancelBtn" style="padding:10px 20px;background:#666;border:none;border-radius:6px;cursor:pointer;color:#fff;font-size:14px;">❌ Cancel</button>
                    <button id="saveBtn" style="padding:10px 20px;background:#00ff88;border:none;border-radius:6px;cursor:pointer;color:#000;font-weight:bold;font-size:14px;">💾 Save Changes</button>
                </div>
            </div>
        `;

        document.body.appendChild(box);
        activeInputBox = box;

        // Initialize references display
        updateSelectedReferencesDisplay(box, currentReferences, false);

        // Refine button handler
        const refineBtn = box.querySelector('#refineRequirementBtn');
        if (refineBtn) {
            const newRefineBtn = refineBtn.cloneNode(true);
            refineBtn.parentNode.replaceChild(newRefineBtn, refineBtn);
            newRefineBtn.style.pointerEvents = 'auto';
            newRefineBtn.style.cursor = 'pointer';
            newRefineBtn.style.position = 'relative';
            newRefineBtn.style.zIndex = '1000001';

            newRefineBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const textarea = box.querySelector('#componentRequirement');
                if (!textarea) { showNotification('❌ Requirement textarea not found', 'error'); return; }
                const description = textarea.value.trim();
                if (!description) { showNotification('⚠️ Please enter a requirement description first', 'warning'); return; }

                const originalText = newRefineBtn.innerHTML;
                newRefineBtn.innerHTML = '⏳ Refining...';
                newRefineBtn.disabled = true;
                newRefineBtn.style.background = '#f39c12';
                newRefineBtn.style.opacity = '0.7';
                newRefineBtn.style.cursor = 'not-allowed';

                try {
                    await refineRequirement(description, index,
                        (refined) => {
                            textarea.value = refined;
                            textarea.dispatchEvent(new Event('input'));
                            showNotification('✨ Requirement refined!', 'success');
                            if (description !== refined) {
                                const diffNotice = document.createElement('div');
                                diffNotice.style.cssText = `font-size:11px;color:#2ecc71;margin-top:4px;padding:6px 10px;background:rgba(46,204,113,0.1);border-radius:4px;border-left:3px solid #2ecc71;cursor:pointer;pointer-events:auto;z-index:1000001;position:relative;`;
                                diffNotice.innerHTML = `<span style="font-weight:bold;">✨ Refined</span><span style="color:#888;font-size:10px;">(Click to show original)</span><span style="display:none;">📄 Original: ${description}</span>`;
                                diffNotice.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    const originalSpan = diffNotice.querySelector('span:last-child');
                                    if (originalSpan.style.display === 'none') {
                                        originalSpan.style.display = 'inline';
                                        diffNotice.style.background = 'rgba(241,196,15,0.1)';
                                        diffNotice.style.borderLeftColor = '#f1c40f';
                                    } else {
                                        originalSpan.style.display = 'none';
                                        diffNotice.style.background = 'rgba(46,204,113,0.1)';
                                        diffNotice.style.borderLeftColor = '#2ecc71';
                                    }
                                });
                                const parent = textarea.parentElement;
                                const oldDiff = parent.querySelector('.refine-diff-notice');
                                if (oldDiff) oldDiff.remove();
                                diffNotice.className = 'refine-diff-notice';
                                parent.appendChild(diffNotice);
                            }
                        },
                        (error) => showNotification(`❌ Failed to refine: ${error}`, 'error')
                    );
                } catch (error) {
                    console.error('Refinement error:', error);
                    showNotification(`❌ Error: ${error.message}`, 'error');
                } finally {
                    newRefineBtn.innerHTML = originalText;
                    newRefineBtn.disabled = false;
                    newRefineBtn.style.background = '#9b59b6';
                    newRefineBtn.style.opacity = '1';
                    newRefineBtn.style.cursor = 'pointer';
                }
            });
        }

        makeDraggable(box, box.querySelector("#popupHeader"));

        // Load existing images
        const imageContainer = box.querySelector("#imagePreviewContainer");
        if (imageContainer) {
            const imagesToLoad = uploadedImages[index] || requirement.images || [];
            if (imagesToLoad.length > 0) loadExistingImagesForEdit(index, imagesToLoad, imageContainer);
        }

        // Image upload handler
        const fileInput = box.querySelector("#imageUpload");
        if (fileInput) {
            fileInput.addEventListener("change", async (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                const previewContainer = box.querySelector("#imagePreviewContainer");
                if (!previewContainer) return;
                for (const file of files) await uploadImageForRequirementEdit(index, file, previewContainer);
                fileInput.value = '';
            });
        }

        // Feature type checkbox logic
        const featureTypeCheckboxes = box.querySelectorAll('.feature-type-checkbox');
        const errorDescriptionSection = box.querySelector('#errorDescriptionSection');

        function getSelectedFeatureTypes() {
            const selectedTypes = [];
            featureTypeCheckboxes.forEach(cb => { if (cb.checked) selectedTypes.push(cb.id); });
            return selectedTypes;
        }

        featureTypeCheckboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (e.target.id === 'is_error') {
                    errorDescriptionSection.style.display = e.target.checked ? 'block' : 'none';
                    if (!e.target.checked) box.querySelector('#errorDescription').value = '';
                }
            });
        });

        // Add more references
        const addMoreRefsBtn = box.querySelector("#addMoreReferences");
        if (addMoreRefsBtn) {
            addMoreRefsBtn.addEventListener("click", () => {
                if (!isNavigatingForReferences) {
                    isNavigatingForReferences = true;
                    navigationReferences = new Map(currentReferences);
                    addMoreRefsBtn.textContent = "✅ Finish Adding References";
                    addMoreRefsBtn.style.background = "#00ff88";
                    showNotification("🔍 Navigation mode: Click on any component to add it as reference. Click 'Finish' when done.", "info");
                    document.addEventListener("click", handleNavigationClick, true);
                } else {
                    isNavigatingForReferences = false;
                    // Save references to requirement
                    if (index >= 0 && selections[index]) {
                        if (!selections[index].reference_components) {
                            selections[index].reference_components = {};
                        }
                        navigationReferences.forEach((refData, refName) => {
                            selections[index].reference_components[refName] = refData;
                        });
                        saveSelections();
                    }
                    currentReferences.clear();
                    navigationReferences.forEach((v, k) => currentReferences.set(k, v));
                    addMoreRefsBtn.textContent = "➕ Add More References";
                    addMoreRefsBtn.style.background = "#ffaa00";
                    showNotification(`✅ Finished adding references. ${currentReferences.size} references selected.`, "success");
                    document.removeEventListener("click", handleNavigationClick, true);
                    updateSelectedReferencesDisplay(box, currentReferences, false);
                }
            });
        }

        const saveBtn = box.querySelector("#saveBtn");
        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
                const editedComponentName = box.querySelector("#componentNameEdit")?.value?.trim() || componentName;
                const requirementText = box.querySelector("#componentRequirement")?.value.trim() || "";
                const featureRequest = box.querySelector("#featureRequest")?.value.trim() || "";
                const featureDetails = box.querySelector("#featureDetails")?.value.trim() || "";
                const requirementType = box.querySelector('input[name="requirementType"]:checked')?.value || "existing";
                const isNew = requirementType === "new";
                const isActive = box.querySelector("#isActive")?.checked !== false;
                const featureTypes = getSelectedFeatureTypes();
                const errorDescription = box.querySelector("#errorDescription")?.value.trim() || "";

                if (featureTypes.includes('is_error') && !errorDescription) {
                    showNotification("⚠️ Please provide error description when error checkbox is selected", "warning");
                    return;
                }

                let finalComponentName = editedComponentName;
                let componentType = "component";

                if (isNew) {
                    finalComponentName = box.querySelector("#newComponentName")?.value.trim() || "";
                    componentType = box.querySelector("#newComponentType")?.value || "component";
                    if (!finalComponentName) {
                        showNotification("⚠️ Please enter a component name for new component", "warning");
                        return;
                    }
                }

                if (!requirementText && !featureTypes.includes('is_error')) {
                    showNotification("⚠️ Please describe the requirement or select error type", "warning");
                    return;
                }

                globalFeatureRequest = featureRequest;
                globalFeatureDetails = featureDetails;
                localStorage.setItem("dev_global_feature_request", globalFeatureRequest);
                localStorage.setItem("dev_global_feature_details", globalFeatureDetails);

                // Get references from currentReferences
                const referenceComponentsObject = {};
                currentReferences.forEach((refData, refName) => {
                    const descTextarea = box.querySelector(`.reference-description[data-ref="${refName}"]`);
                    const description = descTextarea ? descTextarea.value.trim() : refData.description;
                    referenceComponentsObject[refName] = {
                        name: refName,
                        description: description || `Reference component: ${refName}`,
                        componentDetails: refData.componentDetails
                    };
                });

                const existingImages = requirement.images || [];
                const newImages = uploadedImages[index] || [];
                const allImages = [...existingImages];
                newImages.forEach(newImg => {
                    if (!allImages.some(img => img.id === newImg.id)) allImages.push(newImg);
                });

                const updatedRequirement = {
                    requirement: requirementText,
                    reference_components: referenceComponentsObject,
                    isNewComponent: isNew,
                    componentType: isNew ? componentType : undefined,
                    componentDetails: !isNew ? componentDetails : null,
                    feature_types: featureTypes,
                    error_description: featureTypes.includes('is_error') ? errorDescription : undefined,
                    active: isActive,
                    component: finalComponentName,
                    images: allImages,
                    has_images: allImages.length > 0
                };

                if (!isNew) updatedRequirement.text = elementText;
                if (selections[index]?.yaml_response) {
                    updatedRequirement.yaml_response = selections[index].yaml_response;
                    updatedRequirement.response_id = selections[index].response_id;
                    updatedRequirement.response_timestamp = selections[index].response_timestamp;
                    updatedRequirement.model_used = selections[index].model_used;
                    updatedRequirement.provider_used = selections[index].provider_used;
                }

                selections[index] = updatedRequirement;
                saveSelections();
                updateCount();
                delete uploadedImages[index];

                if (isNavigatingForReferences) {
                    document.removeEventListener("click", handleNavigationClick, true);
                    isNavigatingForReferences = false;
                }

                box.remove();
                activeInputBox = null;
                showNotification(`✅ Requirement updated for ${finalComponentName} with ${Object.keys(referenceComponentsObject).length} reference components`, "success");
                setTimeout(showReviewModal, 300);
            });
        }

        const cancelBtn = box.querySelector("#cancelBtn");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => {
                if (isNavigatingForReferences) {
                    document.removeEventListener("click", handleNavigationClick, true);
                    isNavigatingForReferences = false;
                }
                box.remove();
                activeInputBox = null;
                delete uploadedImages[index];
                setTimeout(showReviewModal, 300);
            });
        }

        const closeBox = box.querySelector("#closeBox");
        if (closeBox) {
            closeBox.addEventListener("click", () => {
                if (isNavigatingForReferences) {
                    document.removeEventListener("click", handleNavigationClick, true);
                    isNavigatingForReferences = false;
                }
                box.remove();
                activeInputBox = null;
                delete uploadedImages[index];
                setTimeout(showReviewModal, 300);
            });
        }
    }

    // ===== Image Functions =====
    function loadExistingImagesForEdit(reqIndex, images, container) {
        if (!images || images.length === 0 || !container) return;
        container.innerHTML = '';
        images.forEach(img => {
            const preview = document.createElement("div");
            preview.style.cssText = `position:relative;width:100px;height:100px;border-radius:6px;overflow:hidden;border:2px solid #00e0ff;background:#1a1a2a;flex-shrink:0;`;
            const imgElement = document.createElement("img");
            const fullImageUrl = img.url.startsWith('http') ? img.url : python_host + img.url;
            imgElement.src = fullImageUrl;
            imgElement.style.cssText = `width:100%;height:100%;object-fit:cover;`;
            imgElement.onerror = function() {
                console.error('Failed to load image:', fullImageUrl);
                if (this.src !== img.url) this.src = img.url;
            };
            preview.appendChild(imgElement);

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "✕";
            deleteBtn.style.cssText = `position:absolute;top:4px;right:4px;background:rgba(255,68,68,0.9);border:none;color:#fff;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;padding:0;`;
            deleteBtn.title = "Remove image";
            deleteBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (confirm("🗑️ Remove this image?")) {
                    if (uploadedImages[reqIndex]) {
                        uploadedImages[reqIndex] = uploadedImages[reqIndex].filter(existingImg => existingImg.id !== img.id);
                        if (uploadedImages[reqIndex].length === 0) delete uploadedImages[reqIndex];
                    }
                    if (selections[reqIndex] && selections[reqIndex].images) {
                        selections[reqIndex].images = selections[reqIndex].images.filter(existingImg => existingImg.id !== img.id);
                        if (selections[reqIndex].images.length === 0) selections[reqIndex].has_images = false;
                        saveSelections();
                    }
                    if (preview.parentNode) preview.parentNode.removeChild(preview);
                    showNotification("🗑️ Image removed", "success");
                }
            });
            preview.appendChild(deleteBtn);
            container.appendChild(preview);
        });
    }

    async function uploadImageForRequirementEdit(requirementIndex, file, previewContainer) {
        const loader = showLoader(`Uploading ${file.name}...`);
        try {
            if (!authToken && !isGuestMode) { showNotification("🔒 Please login to upload images", "error"); return; }
            const formData = new FormData();
            formData.append('image', file);
            formData.append('requirement_id', `req_${requirementIndex}`);

            const data = await fetchWithAuth('/api/upload_requirement_image', {
                method: "POST",
                body: formData
            });

            if (data.success) {
                if (!uploadedImages[requirementIndex]) uploadedImages[requirementIndex] = [];
                const imageData = { id: data.image_id, url: data.url, filename: data.filename, file: file, isExisting: false };
                uploadedImages[requirementIndex].push(imageData);

                if (selections[requirementIndex]) {
                    if (!selections[requirementIndex].images) selections[requirementIndex].images = [];
                    selections[requirementIndex].images.push({ id: data.image_id, url: data.url, filename: data.filename });
                    selections[requirementIndex].has_images = true;
                    saveSelections();
                }

                addImagePreviewForEdit(requirementIndex, previewContainer, file, data.url, data.image_id);
                showNotification(`✅ Uploaded ${file.name}`, "success");
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error("Image upload error:", error);
            showNotification(`❌ Failed to upload ${file.name}: ${error.message}`, "error");
        } finally {
            hideLoader();
        }
    }

    function addImagePreviewForEdit(requirementIndex, previewContainer, file, imageUrl, imageId) {
        const preview = document.createElement("div");
        preview.style.cssText = `position:relative;width:100px;height:100px;border-radius:6px;overflow:hidden;border:2px solid #00e0ff;background:#1a1a2a;flex-shrink:0;`;
        const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : python_host + imageUrl;
        const img = document.createElement("img");
        img.src = fullImageUrl || URL.createObjectURL(file);
        img.style.cssText = `width:100%;height:100%;object-fit:cover;`;
        img.onerror = function() {
            console.error('Failed to load image:', fullImageUrl);
            if (this.src !== imageUrl) this.src = imageUrl;
        };
        preview.appendChild(img);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "✕";
        deleteBtn.style.cssText = `position:absolute;top:4px;right:4px;background:rgba(255,68,68,0.9);border:none;color:#fff;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;padding:0;`;
        deleteBtn.title = "Remove image";
        deleteBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (confirm("🗑️ Remove this image?")) {
                try {
                    const data = await fetchWithAuth(`/api/delete_requirement_image/${imageId}`, { method: "DELETE" });
                    if (data.success) {
                        if (uploadedImages[requirementIndex]) {
                            uploadedImages[requirementIndex] = uploadedImages[requirementIndex].filter(img => img.id !== imageId);
                            if (uploadedImages[requirementIndex].length === 0) delete uploadedImages[requirementIndex];
                        }
                        if (selections[requirementIndex] && selections[requirementIndex].images) {
                            selections[requirementIndex].images = selections[requirementIndex].images.filter(img => img.id !== imageId);
                            if (selections[requirementIndex].images.length === 0) selections[requirementIndex].has_images = false;
                            saveSelections();
                        }
                        if (preview.parentNode) preview.parentNode.removeChild(preview);
                        showNotification("🗑️ Image removed", "success");
                    } else {
                        throw new Error(data.error || 'Delete failed');
                    }
                } catch (error) {
                    console.error("Image delete error:", error);
                    showNotification(`❌ Failed to delete image: ${error.message}`, "error");
                }
            }
        });
        preview.appendChild(deleteBtn);
        previewContainer.appendChild(preview);
    }

    // ===== YAML Modal =====
    function showYamlModalWithApply(yamlContent, componentName, requirementId) {
        closeAllModals();
        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay";
        Object.assign(overlay.style, {
            position: "fixed", left: 0, top: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.8)", zIndex: 1000002,
            display: "flex", justifyContent: "center", alignItems: "center",
            backdropFilter: "blur(5px)", padding: "10px"
        });

        const modal = document.createElement("div");
        modal.className = "modal-content";
        Object.assign(modal.style, {
            background: "#1a1a2a", color: "#fff", padding: "25px", borderRadius: "12px",
            width: "90%", maxWidth: "800px", maxHeight: "80%", overflowY: "auto",
            border: "1px solid #444", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            boxSizing: "border-box"
        });

        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid #444;padding-bottom:15px;flex-wrap:wrap;gap:10px;">
                <h3 style="margin:0;color:#00ff88;font-size:18px;">📦 Apply Changes - ${componentName}</h3>
                <button id="closeApply" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;padding:0;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
            <div style="background:#2a2a3a;border:1px solid #444;border-radius:6px;padding:15px;max-height:400px;overflow-y:auto;margin-bottom:20px;">
                <pre style="color:#ccc;font-family:monospace;font-size:12px;margin:0;white-space:pre-wrap;word-wrap:break-word;">${escapeHtml(yamlContent)}</pre>
            </div>
            <div style="background:rgba(0,224,255,0.1);padding:12px;border-radius:6px;border-left:4px solid #00e0ff;margin-bottom:20px;">
                <div style="font-size:12px;color:#00e0ff;font-weight:bold;margin-bottom:6px;">📋 Available Actions:</div>
                <ul style="font-size:12px;color:#ccc;margin:0;padding-left:20px;">
                    <li><strong>📦 Apply Changes:</strong> Apply these YAML changes to your project</li>
                    <li><strong>❌ Close:</strong> Return to review modal without applying</li>
                </ul>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:20px;border-top:1px solid #444;flex-wrap:wrap;gap:10px;">
                <div style="font-size:12px;color:#888;">📋 Requirement ID: ${requirementId}</div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button id="closeApplyBtn" style="padding:10px 20px;background:#666;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:13px;">❌ Close</button>
                    <button id="confirmApplyChanges" style="padding:10px 20px;background:#00ff88;border:none;border-radius:6px;color:#000;cursor:pointer;font-weight:bold;font-size:13px;">📦 Apply Changes</button>
                </div>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        const closeModal = registerModal(overlay);

        modal.querySelector("#closeApply")?.addEventListener("click", closeModal);
        modal.querySelector("#closeApplyBtn")?.addEventListener("click", closeModal);
        modal.querySelector("#confirmApplyChanges")?.addEventListener("click", () => {
            const btn = modal.querySelector("#confirmApplyChanges");
            btn.innerHTML = '⏳ Applying...';
            btn.disabled = true;
            btn.style.background = "#ffaa00";
            applyYamlChanges(yamlContent, requirementId);
        });
        overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    }

    function escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // ===== Send Functions =====
    async function sendSingleRequirement(requirement, index) {
        const loader = showLoader(`Sending ${requirement.component} using ${selectedModel}...`);
        try {
            if (!authToken && !isGuestMode) { showNotification("🔒 Please login to send requirements", "error"); showAuthModal(); return; }
            if (!selectedModel || selectedModel === "") { showNotification("⚠️ Please select a model first", "error"); throw new Error("No model selected"); }

            const payload = {
                requirements: [requirement],
                globalFeatureRequest,
                globalFeatureDetails,
                model: selectedModel,
                provider: selectedProvider
            };

            const data = await fetchWithAuth('/api/llm_requirements', {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (data.response || data.yaml_response) {
                const yamlResponse = data.response || data.yaml_response;
                const responseId = data.id || `req_${index}`;
                selections[index].yaml_response = yamlResponse;
                selections[index].response_timestamp = new Date().toISOString();
                selections[index].response_id = responseId;
                selections[index].model_used = selectedModel;
                selections[index].provider_used = selectedProvider;
                saveSelections();
                showYamlModalWithApply(yamlResponse, requirement.component, responseId);
            }
            showNotification(`✅ ${requirement.component} sent successfully using ${selectedModel}!`, "success");
        } catch (error) {
            console.error("Send failed:", error);
            showNotification(`❌ Failed to send ${requirement.component}. ${error.message}`, "error");
            throw error;
        } finally {
            hideLoader();
        }
    }

    async function sendToBackend() {
        const activeRequirements = selections.filter(req => req.active !== false);
        if (!activeRequirements.length) { showNotification("⚠️ No active requirements to send!", "warning"); return; }
        if (!authToken && !isGuestMode) { showNotification("🔒 Please login to send requirements", "error"); showAuthModal(); return; }
        if (!selectedModel || selectedModel === "") { showNotification("⚠️ Please select a model first", "error"); return; }

        const loader = showLoader(`Sending ${activeRequirements.length} active requirements using ${selectedModel}...`);
        try {
            const requirementsWithImages = [];
            const imageReferences = {};
            activeRequirements.forEach((req, idx) => {
                if (req.has_images && req.images?.length > 0) {
                    requirementsWithImages.push(idx);
                    imageReferences[idx] = req.images.map(img => img.url);
                }
            });

            const payload = {
                requirements: activeRequirements,
                model: selectedModel,
                provider: selectedProvider,
                globalFeatureRequest,
                globalFeatureDetails,
                requirements_with_images: requirementsWithImages,
                image_references: imageReferences
            };

            const data = await fetchWithAuth('/api/llm_requirements', {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (data.response || data.yaml_response) {
                const yamlResponse = data.response || data.yaml_response;
                const responseId = data.id || `req_${Date.now()}`;
                selections.forEach((req, idx) => {
                    if (req.active !== false) {
                        req.yaml_response = yamlResponse;
                        req.response_timestamp = new Date().toISOString();
                        req.response_id = responseId;
                        req.model_used = selectedModel;
                        req.provider_used = selectedProvider;
                    }
                });
                saveSelections();
                const imageCount = Object.values(imageReferences).reduce((sum, arr) => sum + (arr?.length || 0), 0);
                showNotification(`✅ ${activeRequirements.length} active requirements sent with ${imageCount} images using ${selectedModel}!`, "success");
                setTimeout(() => showYamlResponsePopup(yamlResponse, responseId), 500);
            } else {
                showNotification("❌ No YAML response received from server", "error");
            }
        } catch (error) {
            console.error("Send failed:", error);
            showNotification(`❌ Failed to send requirements: ${error.message}`, "error");
        } finally {
            hideLoader();
        }
    }

    function showYamlResponsePopup(yamlContent, responseId) {
        closeAllModals();
        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay";
        Object.assign(overlay.style, {
            position: "fixed", left: 0, top: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.8)", zIndex: 1000002,
            display: "flex", justifyContent: "center", alignItems: "center",
            backdropFilter: "blur(5px)", padding: "10px"
        });

        const modal = document.createElement("div");
        modal.className = "modal-content";
        Object.assign(modal.style, {
            background: "#1a1a2a", color: "#fff", padding: "25px", borderRadius: "12px",
            width: "90%", maxWidth: "800px", maxHeight: "80%", overflowY: "auto",
            border: "1px solid #444", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            boxSizing: "border-box"
        });

        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid #444;padding-bottom:15px;flex-wrap:wrap;gap:10px;">
                <h3 style="margin:0;color:#00ff88;font-size:18px;">📋 YAML Response Received</h3>
                <button id="closeYamlPopup" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;padding:0;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
            <div style="background:#2a2a3a;border:1px solid #444;border-radius:6px;padding:15px;max-height:400px;overflow-y:auto;margin-bottom:20px;">
                <pre style="color:#ccc;font-family:monospace;font-size:12px;margin:0;white-space:pre-wrap;word-wrap:break-word;">${escapeHtml(yamlContent)}</pre>
            </div>
            <div style="background:rgba(0,224,255,0.1);padding:12px;border-radius:6px;border-left:4px solid #00e0ff;margin-bottom:20px;">
                <div style="font-size:12px;color:#00e0ff;font-weight:bold;margin-bottom:6px;">📋 Available Actions:</div>
                <ul style="font-size:12px;color:#ccc;margin:0;padding-left:20px;">
                    <li><strong>📦 Apply Changes:</strong> Apply these YAML changes to your project</li>
                    <li><strong>❌ Close:</strong> Return to review modal without applying</li>
                </ul>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:20px;border-top:1px solid #444;flex-wrap:wrap;gap:10px;">
                <div style="font-size:12px;color:#888;">🔑 Response ID: ${responseId}</div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button id="closeYamlBtn" style="padding:10px 20px;background:#666;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:13px;">❌ Close</button>
                    <button id="applyYamlChanges" style="padding:10px 20px;background:#00ff88;border:none;border-radius:6px;color:#000;cursor:pointer;font-weight:bold;font-size:13px;">📦 Apply Changes</button>
                </div>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        const closeModal = registerModal(overlay);

        modal.querySelector("#closeYamlPopup")?.addEventListener("click", closeModal);
        modal.querySelector("#closeYamlBtn")?.addEventListener("click", closeModal);
        modal.querySelector("#applyYamlChanges")?.addEventListener("click", () => {
            closeModal();
            applyYamlChanges(yamlContent, responseId);
        });
        overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    }

    // ===== Image Upload for New Requirements =====
    async function uploadImageForRequirement(requirementIndex, file, previewContainer) {
        const loader = showLoader(`Uploading ${file.name}...`);
        try {
            if (!authToken && !isGuestMode) { showNotification("🔒 Please login to upload images", "error"); return; }
            const formData = new FormData();
            formData.append('image', file);
            formData.append('requirement_id', `req_${requirementIndex}`);

            const data = await fetchWithAuth('/api/upload_requirement_image', {
                method: "POST",
                body: formData
            });

            if (data.success) {
                if (!uploadedImages[requirementIndex]) uploadedImages[requirementIndex] = [];
                uploadedImages[requirementIndex].push({ id: data.image_id, url: data.url, filename: data.filename, file: file });
                addImagePreview(requirementIndex, previewContainer, file, data.url, data.image_id);
                showNotification(`✅ Uploaded ${file.name}`, "success");
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error("Image upload error:", error);
            showNotification(`❌ Failed to upload ${file.name}: ${error.message}`, "error");
        } finally {
            hideLoader();
        }
    }

    function addImagePreview(requirementIndex, previewContainer, file, imageUrl, imageId) {
        const preview = document.createElement("div");
        preview.style.cssText = `position:relative;width:100px;height:100px;border-radius:6px;overflow:hidden;border:2px solid #00e0ff;background:#1a1a2a;flex-shrink:0;`;
        const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : python_host + imageUrl;
        const img = document.createElement("img");
        img.src = fullImageUrl || URL.createObjectURL(file);
        img.style.cssText = `width:100%;height:100%;object-fit:cover;`;
        img.onerror = function() {
            console.error('Failed to load image:', fullImageUrl);
            if (this.src !== imageUrl) this.src = imageUrl;
        };
        preview.appendChild(img);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "✕";
        deleteBtn.style.cssText = `position:absolute;top:4px;right:4px;background:rgba(255,68,68,0.9);border:none;color:#fff;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;padding:0;`;
        deleteBtn.title = "Remove image";
        deleteBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (confirm("🗑️ Remove this image?")) {
                await deleteImage(requirementIndex, imageId, preview);
            }
        });
        preview.appendChild(deleteBtn);
        previewContainer.appendChild(preview);
    }

    async function deleteImage(requirementIndex, imageId, previewElement) {
        try {
            if (!authToken) { showNotification("🔒 Please login to delete images", "error"); return; }
            const data = await fetchWithAuth(`/api/delete_requirement_image/${imageId}`, { method: "DELETE" });
            if (data.success) {
                if (uploadedImages[requirementIndex]) {
                    uploadedImages[requirementIndex] = uploadedImages[requirementIndex].filter(img => img.id !== imageId);
                    if (uploadedImages[requirementIndex].length === 0) delete uploadedImages[requirementIndex];
                }
                if (previewElement?.parentNode) previewElement.parentNode.removeChild(previewElement);
                showNotification("🗑️ Image removed", "success");
            } else {
                throw new Error(data.error || 'Delete failed');
            }
        } catch (error) {
            console.error("Image delete error:", error);
            showNotification(`❌ Failed to delete image: ${error.message}`, "error");
        }
    }

    // ===== Refine Requirement =====
    async function refineRequirement(description, index, onSuccess, onError) {
        if (!description?.trim()) { if (onError) onError('Requirement description is required'); return; }
        const loader = showLoader('Refining requirement description...');
        try {
            const data = await fetchWithAuth('/api/refine_requirement', {
                method: "POST",
                body: JSON.stringify({ description, index })
            });
            if (data.success) {
                if (index >= 0 && selections[index]) {
                    selections[index].requirement = data.refined_description;
                    selections[index].refined = true;
                    selections[index].refined_timestamp = new Date().toISOString();
                    selections[index].original_requirement = data.original_description;
                    saveSelections();
                    updateCount();
                }
                if (onSuccess) onSuccess(data.refined_description);
                showNotification('✨ Requirement refined successfully!', 'success');
            } else {
                throw new Error(data.error || 'Failed to refine requirement');
            }
        } catch (error) {
            console.error('Refinement error:', error);
            if (onError) onError(error.message);
            showNotification(`❌ Failed to refine: ${error.message}`, 'error');
        } finally {
            hideLoader();
        }
    }

    // ===== Event Listeners =====
    function setupEventListeners() {
        let lastClickTime = 0;
        let lastClickedElement = null;
        let isPopupOpening = false;

        document.addEventListener("click", function(e) {
            // Check if requirements are enabled (mobile only)
            if (isMobile() && !isRequirementEnabled) {
                return;
            }

            if (activeInputBox || e.target.closest(".dev-unified-popup") || e.target.closest(".dev-toolbar") ||
                e.target.closest(".dev-modal-overlay") || isPopupOpening || isNavigatingForReferences) {
                return;
            }

            const clickedElement = e.target;
            const currentTime = Date.now();
            const isDoubleClick = (currentTime - lastClickTime < 300) && (clickedElement === lastClickedElement);
            const isMobileDevice = isMobile();

            if (isDoubleClick || isMobileDevice) {
                const bestComponent = getBestComponentForClick(clickedElement);
                if (bestComponent) {
                    isPopupOpening = true;
                    highlightElement(clickedElement);
                    showUnifiedPopup({
                        x: e.clientX,
                        y: e.clientY,
                        target: bestComponent.node,
                        componentName: bestComponent.name,
                        domPath: bestComponent.domPath,
                        isNewComponent: false,
                        requirementIndex: -1
                    });
                    setTimeout(() => { isPopupOpening = false; }, 100);
                }
            }
            lastClickTime = currentTime;
            lastClickedElement = clickedElement;
        }, true);

        document.addEventListener("keydown", function(e) {
            if (e.key === "Escape") {
                if (activeInputBox) {
                    if (isNavigatingForReferences) {
                        document.removeEventListener("click", handleNavigationClick, true);
                        isNavigatingForReferences = false;
                    }
                    activeInputBox.remove();
                    activeInputBox = null;
                    isPopupOpening = false;
                }
                if (activeModals.size > 0) closeAllModals();
            }
            if (e.key === "r" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                showReviewModal();
            }
        });

        // Window resize handler for responsiveness
        let resizeTimeout;
        window.addEventListener("resize", function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (activeInputBox) {
                    const isMobileView = isMobile();
                    const popupWidth = isMobileView ? window.innerWidth - 20 : 700;
                    if (activeInputBox.style.width !== `${popupWidth}px`) {
                        activeInputBox.style.width = `${popupWidth}px`;
                    }
                    if (isMobileView) {
                        activeInputBox.style.left = "10px";
                        activeInputBox.style.top = "20px";
                    }
                }
                // Update toolbar for mobile
                if (toolbar) {
                    if (isMobile() && isMobileMinimized) {
                        toolbar.classList.add("minimized");
                    } else {
                        toolbar.classList.remove("minimized");
                    }
                }
            }, 300);
        });
    }

    // ===== Initialize =====
    function initialize() {
        console.log("Initializing Dev Assistant...");
        localStorage.removeItem("dev_available_models");
        availableModels = {};
        document.querySelectorAll(".dev-toolbar, .dev-unified-popup, .dev-modal-overlay").forEach(el => el.remove());

        checkAuth();
        buildToolbar();
        setupEventListeners();

        setTimeout(() => {
            showNotification(authToken ? "🤖 Dev Assistant Ready - Authenticated" : "🤖 Dev Assistant Ready - Limited features for guest",
                authToken ? "success" : "info");
        }, 500);

        console.log("Dev Assistant initialized successfully");
        console.log(`${selections.length} requirements loaded`);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }

})();