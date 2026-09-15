
(function() {
    'use strict';

    // ===== Master Styles =====
    const appStyles = `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse-recording {
            0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(255, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
        }
        .dev-loader { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1000004; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
        .dev-loader-content { background: rgba(25,25,35,0.95); padding: 25px; border-radius: 12px; border: 1px solid #00e0ff; box-shadow: 0 10px 30px rgba(0,0,0,0.6); text-align: center; min-width: 200px; }
        .dev-spinner { border: 4px solid rgba(0,224,255,0.3); border-top: 4px solid #00e0ff; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 15px; }
        .dev-loader-text { color: #00e0ff; font-size: 14px; font-weight: bold; margin: 0; }

        .dev-modal-overlay { position: fixed; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000002; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); padding: 10px; box-sizing: border-box; }
        .dev-modal-content { background: #1a1a2a; color: #fff; padding: 25px; border-radius: 12px; width: 90%; max-width: 1000px; max-height: 85%; overflow-y: auto; border: 1px solid #444; box-shadow: 0 20px 40px rgba(0,0,0,0.5); box-sizing: border-box; position: relative; }
        
        .dev-unified-popup { position: fixed; background: rgba(25,25,35,0.98); color: #fff; padding: 20px; border-radius: 10px; z-index: 1000000; width: 700px; max-height: 90vh; overflow-y: auto; font-family: system-ui, sans-serif; font-size: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); border: 1px solid #444; backdrop-filter: blur(10px); box-sizing: border-box; }
        .popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; cursor: move; }
        .popup-header b { color: #00e0ff; font-size: 16px; }
        
        .dev-input, .dev-textarea, .dev-select { width: 100%; padding: 10px; border: 1px solid #555; border-radius: 6px; outline: none; font-size: 14px; background: #1a1a2a; color: #fff; font-family: inherit; box-sizing: border-box; }
        .dev-textarea { resize: vertical; height: 70px; }
        .dev-label { display: block; font-size: 13px; color: #aaa; margin-bottom: 6px; }
        
        .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; color: #fff; font-size: 14px; font-weight: bold; display: inline-flex; align-items: center; justify-content: center; gap: 5px; text-align: center; transition: background 0.2s; }
        .btn-primary { background: #00ff88; color: #000; }
        .btn-primary:hover { background: #00cc70; }
        .btn-secondary { background: #666; }
        .btn-secondary:hover { background: #555; }
        .btn-danger { background: #ff4444; }
        .btn-danger:hover { background: #cc3333; }
        .btn-info { background: #00e0ff; color: #000; }
        .btn-info:hover { background: #00b8cc; }
        .btn-warning { background: #ffaa00; color: #000; }
        .btn-warning:hover { background: #cc8800; }
        .btn-sm { padding: 6px 12px; font-size: 11px; }
        
        .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .feature-item { display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 13px; }
        
        .ref-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
        .ref-chip { display: flex; align-items: center; gap: 6px; background: rgba(255,170,0,0.2); border: 1px solid #ffaa00; border-radius: 14px; padding: 4px 10px; font-size: 11px; color: #ffaa00; }
        
        .voice-input-btn { background: #9b59b6; border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; pointer-events: auto; z-index: 1000001; position: relative; flex-shrink: 0; }
        .voice-input-btn:hover { background: #8e44ad; transform: scale(1.1); }
        .voice-input-btn.recording { background: #ff4444; animation: pulse-recording 1.5s infinite; }
        .voice-input-btn.unsupported { background: #555; cursor: not-allowed; opacity: 0.5; }
        .voice-status { font-size: 11px; color: #ff4444; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
        .voice-status-dot { width: 8px; height: 8px; border-radius: 50%; background: #ff4444; animation: pulse-recording 1s infinite; display: inline-block; }
        .clear-input-btn { background: #ff4444; border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; pointer-events: auto; z-index: 1000001; position: relative; flex-shrink: 0; }
        .clear-input-btn:hover { background: #cc3333; transform: scale(1.1); }

        /* Highlight style for reference selection */
        .dev-highlight-ref {
            outline: 2px solid #00ff88 !important;
            outline-offset: -2px !important;
            background-color: rgba(0, 255, 136, 0.15) !important;
            cursor: crosshair !important;
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.4) !important;
            transition: outline 0.1s ease, background-color 0.1s ease, box-shadow 0.1s ease !important;
        }

        .dev-toolbar { position: fixed; bottom: 20px; right: 20px; z-index: 1000001; background: rgba(30,30,40,0.95); color: #fff; padding: 15px; border-radius: 10px; font-family: system-ui, sans-serif; font-size: 14px; box-shadow: 0 8px 25px rgba(0,0,0,0.4); border: 1px solid #444; backdrop-filter: blur(10px); width: 320px; max-height: 450px; overflow-y: auto; box-sizing: border-box; transition: all 0.3s ease; resize: none; }
        .toolbar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; cursor: move; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 6px; user-select: none; }
        .badge-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        
        .mobile-controls { display: none; gap: 6px; align-items: center; }
        .toggle-req-btn { background: rgba(255,255,255,0.1); border: 1px solid #555; border-radius: 4px; color: #fff; cursor: pointer; padding: 4px 8px; font-size: 10px; font-weight: bold; min-width: 32px; text-align: center; transition: all 0.2s; }
        .toggle-req-btn.enabled { border-color: #00ff88; color: #00ff88; }
        .toggle-req-btn.disabled { border-color: #ff4444; color: #ff4444; }
        .minimize-btn { background: rgba(255,255,255,0.1); border: 1px solid #555; border-radius: 4px; color: #fff; cursor: pointer; padding: 4px 8px; font-size: 14px; font-weight: bold; min-width: 32px; text-align: center; transition: all 0.2s; }
        .minimize-btn:hover, .toggle-req-btn:hover { background: rgba(255,255,255,0.2); }
        
        .image-grid { display: flex; flex-wrap: wrap; gap: 10px; }
        
        @media (max-width: 768px) {
            .dev-toolbar { width: 280px !important; max-height: 400px !important; bottom: 10px !important; right: 10px !important; padding: 12px !important; font-size: 12px !important; }
            .dev-toolbar.minimized { width: 60px !important; height: 60px !important; max-height: 60px !important; overflow: hidden !important; padding: 10px !important; border-radius: 50% !important; cursor: pointer !important; bottom: 20px !important; right: 20px !important; }
            .dev-toolbar.minimized .toolbar-content { display: none !important; }
            .dev-toolbar.minimized .minimize-btn, .dev-toolbar.minimized .toggle-req-btn { display: none !important; }
            .dev-toolbar.minimized .minimized-label { display: block !important; font-size: 24px !important; text-align: center !important; line-height: 40px !important; }
            .dev-unified-popup { width: 95% !important; left: 2.5% !important; top: 5% !important; padding: 15px !important; font-size: 13px !important; max-height: 90vh !important; }
            .dev-modal-content { width: 95% !important; max-width: 95% !important; padding: 15px !important; }
            .feature-grid { grid-template-columns: 1fr !important; }
            .mobile-controls { display: flex !important; }
            .btn-group { flex-direction: column !important; gap: 8px !important; }
            .btn-group .btn { width: 100% !important; }
            .image-grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)) !important; }
        }
        @media (max-width: 480px) {
            .dev-toolbar { width: 90% !important; max-height: 350px !important; bottom: 5px !important; right: 5px !important; left: 5px !important; padding: 10px !important; }
            .dev-toolbar.minimized { width: 56px !important; height: 56px !important; max-height: 56px !important; bottom: 15px !important; right: 15px !important; left: auto !important; }
            .dev-unified-popup { width: 98% !important; left: 1% !important; top: 2% !important; padding: 12px !important; max-height: 95vh !important; }
        }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.textContent = appStyles;
    document.head.appendChild(styleSheet);

    // ===== State & Config =====
    const python_host = window.location.protocol + "//" + window.location.hostname + ":5000";
    let authToken = localStorage.getItem("my_agent_token") || null;
    let currentUser = JSON.parse(localStorage.getItem("my_agent_user") || "null");
    let isGuestMode = false;
    let selections = [];
    let activeInputBox = null;
    let toolbar = null;
    let globalFeatureRequest = localStorage.getItem("dev_global_feature_request") || "";
    let globalFeatureDetails = localStorage.getItem("dev_global_feature_details") || "";
    let activeModals = new Set();
    let selectedModel = localStorage.getItem("dev_selected_model") || "llama3.1:latest";
    let selectedProvider = localStorage.getItem("dev_selected_provider") || "ollama";
    let availableModels = JSON.parse(localStorage.getItem("dev_available_models") || "{}");
    let isNavigatingForReferences = false;
    let navigationReferences = new Map();
    let highlightedElement = null; // Tracks the currently highlighted DOM element
    let isMobileMinimized = localStorage.getItem("dev_mobile_minimized") === "true";
    let isRequirementEnabled = localStorage.getItem("dev_req_enabled") !== "false";
    let activeLoader = null;
    let activeSpeechRecognition = null;
    let isListening = false;

    // ===== Utilities =====
    const isMobile = () => window.innerWidth < 768;

    function showLoader(message = "Processing...") {
        hideLoader();
        const loader = document.createElement("div");
        loader.className = "dev-loader";
        loader.innerHTML = `<div class="dev-loader-content"><div class="dev-spinner"></div><p class="dev-loader-text">${message}</p></div>`;
        document.body.appendChild(loader);
        activeLoader = loader;
    }
    function hideLoader() { if (activeLoader) activeLoader.remove(); activeLoader = null; }

    function showNotification(message, type = "info") {
        const colors = { info: "#00e0ff", success: "#00ff88", warning: "#ffaa00", error: "#ff4444" };
        const n = document.createElement("div");
        Object.assign(n.style, { position: "fixed", top: "20px", right: "20px", background: colors[type], color: "#000", padding: "12px 16px", borderRadius: "6px", zIndex: 1000003, fontFamily: "system-ui", fontSize: "14px", fontWeight: "bold", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", maxWidth: "90%" });
        n.textContent = message;
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 3000);
    }

    function closeAllModals() {
        document.querySelectorAll(".dev-modal-overlay").forEach(overlay => {
            if (overlay._escapeHandler) document.removeEventListener("keydown", overlay._escapeHandler);
            overlay.remove();
        });
        activeModals.clear();
    }

    function registerModal(overlay) {
        activeModals.add(overlay);
        const escapeHandler = (e) => { if (e.key === "Escape") closeModal(); };
        overlay._escapeHandler = escapeHandler;
        document.addEventListener("keydown", escapeHandler);
        function closeModal() {
            if (overlay._escapeHandler) document.removeEventListener("keydown", overlay._escapeHandler);
            overlay.remove();
            activeModals.delete(overlay);
        }
        return closeModal;
    }

    function saveSelections() {
        localStorage.setItem("dev_requirements", JSON.stringify({ requirements: selections, feature_request: globalFeatureRequest, feature_details: globalFeatureDetails }, null, 2));
    }
    function loadSelections() {
        try {
            const saved = localStorage.getItem("dev_requirements");
            if (saved) {
                const parsed = JSON.parse(saved);
                selections = Array.isArray(parsed.requirements) ? parsed.requirements : [];
                globalFeatureRequest = parsed.feature_request || globalFeatureRequest;
                globalFeatureDetails = parsed.feature_details || globalFeatureDetails;
            }
        } catch (e) { selections = []; }
    }
    loadSelections();

    function clearSelections() {
        selections = []; globalFeatureRequest = ""; globalFeatureDetails = "";
        saveSelections();
        localStorage.removeItem("dev_global_feature_request");
        localStorage.removeItem("dev_global_feature_details");
        updateCount();
    }

    function updateCount() {
        if (!toolbar) return;
        const countBadge = toolbar.querySelector("#countBadge");
        const activeBadge = toolbar.querySelector("#activeBadge");
        if (countBadge) countBadge.textContent = `📋 ${selections.length}`;
        if (activeBadge) activeBadge.textContent = `✅ ${selections.filter(r => r.active !== false).length}`;
    }

    // ===== React DOM Traversal =====
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
        return node.tagName?.toLowerCase() || "element";
    }
    function getEnhancedDomPath(el) {
        if (!el) return "";
        const stack = [];
        let current = el;
        while (current && current.nodeType === 1) {
            let selector = current.tagName.toLowerCase();
            if (current.id) { stack.unshift(`${selector}#${current.id}`); break; }
            if (current.className && typeof current.className === 'string') {
                const validClasses = current.className.split(/\s+/).filter(c => c && c.length > 2).slice(0, 2);
                if (validClasses.length) selector += `.${validClasses.join('.')}`;
            }
            stack.unshift(selector);
            current = current.parentElement;
            if (stack.length >= 5) break;
        }
        return stack.join(" > ");
    }
    function getComponentDetails(node) {
        if (!node) return {};
        return {
            name: getReactComponentName(node),
            domPath: getEnhancedDomPath(node),
            textContent: node.textContent?.trim().substring(0, 100) || "",
            tagName: node.tagName?.toLowerCase()
        };
    }
    function getBestComponentForClick(node) {
        let current = node, depth = 0;
        while (current && current.nodeType === 1 && depth < 8) {
            const name = getReactComponentName(current);
            if (name && name !== 'Unknown') return { node: current, name, domPath: getEnhancedDomPath(current), details: getComponentDetails(current) };
            current = current.parentElement; depth++;
        }
        return null;
    }

    // ===== Auth & Fetch =====
    async function fetchWithAuth(url, options = {}) {
        const requiresAuth = !url.includes('/api/login') && !url.includes('/api/register');
        if (requiresAuth && !authToken && !isGuestMode) { showNotification("🔒 Please login", "error"); showAuthModal(); throw new Error("Auth required"); }
        const headers = { "Accept": "application/json", ...options.headers };
        if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
        if (requiresAuth && authToken) headers["Authorization"] = `Bearer ${authToken}`;
        try {
            const response = await fetch(`${python_host}${url}`, { ...options, headers });
            if (response.status === 401 || response.status === 403) { logout(); throw new Error("Auth failed"); }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Fetch error for ${url}:`, error);
            throw error;
        }
    }

    function showAuthModal() {
        closeAllModals();
        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay";
        overlay.innerHTML = `
            <div class="dev-modal-content" style="width: 400px; max-width: 95%;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid #444;padding-bottom:15px;">
                    <h3 style="margin:0;color:#00e0ff;">🔐 Authentication Required</h3>
                    <button id="closeAuth" class="btn btn-danger" style="padding: 5px 10px;">✕</button>
                </div>
                <div style="margin-bottom:15px;">
                    <label class="dev-label">👤 Username</label>
                    <input type="text" id="authUsername" class="dev-input">
                </div>
                <div style="margin-bottom:20px;">
                    <label class="dev-label">🔒 Password</label>
                    <input type="password" id="authPassword" class="dev-input">
                </div>
                <div id="authError" style="display:none;color:#ff8888;margin-bottom:15px;font-size:13px;"></div>
                <button id="loginBtn" class="btn btn-primary" style="width:100%;">🔓 Login</button>
            </div>
        `;
        document.body.appendChild(overlay);
        const closeModal = registerModal(overlay);
        overlay.querySelector("#closeAuth").onclick = closeModal;
        overlay.querySelector("#loginBtn").onclick = async () => {
            const u = overlay.querySelector("#authUsername").value.trim();
            const p = overlay.querySelector("#authPassword").value.trim();
            if (!u || !p) return;
            const btn = overlay.querySelector("#loginBtn");
            btn.disabled = true; btn.textContent = "Logging in...";
            try {
                const res = await fetch(`${python_host}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) });
                const data = await res.json();
                if (data.success && data.token) {
                    localStorage.setItem("my_agent_token", data.token);
                    localStorage.setItem("my_agent_user", JSON.stringify(data.user));
                    authToken = data.token; currentUser = data.user; isGuestMode = false;
                    closeModal(); showNotification(`👋 Welcome ${currentUser.username}!`, "success");
                    buildToolbar(); setTimeout(refreshModels, 500);
                } else { throw new Error(data.error || "Login failed"); }
            } catch (e) {
                const errDiv = overlay.querySelector("#authError");
                errDiv.textContent = e.message; errDiv.style.display = "block";
                btn.disabled = false; btn.textContent = "🔓 Login";
            }
        };
        overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    }

    function logout() {
        fetch(`${python_host}/api/logout`, { method: "POST", headers: { "Authorization": `Bearer ${authToken}` } }).catch(()=>{});
        localStorage.removeItem("my_agent_token"); localStorage.removeItem("my_agent_user");
        authToken = null; currentUser = null; isGuestMode = true;
        showNotification("👋 Logged out", "success");
        buildToolbar();
    }

    // ===== Model Management =====
    async function fetchModels(provider) {
        if (!authToken && !isGuestMode) return [];
        try {
            const data = await fetchWithAuth('/api/get_models', { method: "POST", body: JSON.stringify({ provider, _t: Date.now() }) });
            return data.models && Array.isArray(data.models) ? data.models : [];
        } catch (e) { return []; }
    }

    async function refreshModels() {
        if (!toolbar) return;
        const providerSelect = toolbar.querySelector("#providerSelect");
        if (!providerSelect) return;
        const currentProvider = providerSelect.value;
        showLoader(`Refreshing models for ${currentProvider}...`);
        try {
            delete availableModels[currentProvider];
            localStorage.setItem("dev_available_models", JSON.stringify(availableModels));
            await updateApiKeySectionVisibility(currentProvider);
            await loadModelsForProvider(currentProvider);
        } finally { hideLoader(); }
    }

    async function loadModelsForProvider(provider) {
        const modelSelect = toolbar.querySelector("#modelSelect");
        if (!modelSelect) return;
        modelSelect.innerHTML = '<option value="">⏳ Loading...</option>';
        modelSelect.disabled = true;
        try {
            const models = await fetchModels(provider);
            modelSelect.innerHTML = '<option value="">Select a model...</option>';
            models.forEach(m => {
                const opt = document.createElement("option");
                opt.value = m; opt.textContent = m;
                if (m === selectedModel) opt.selected = true;
                modelSelect.appendChild(opt);
            });
            modelSelect.disabled = false;
        } catch (e) { modelSelect.innerHTML = '<option value="">❌ Failed</option>'; modelSelect.disabled = false; }
    }

    async function updateApiKeySectionVisibility(provider) {
        const apiKeySection = toolbar.querySelector("#apiKeySection");
        const apiKeyStatus = toolbar.querySelector("#apiKeyStatus");
        const apiKeyInput = toolbar.querySelector("#apiKeyInput");
        if (!apiKeySection) return;
        const requiresApiKey = ['openai', 'openrouter', 'anthropic', 'google', 'aimlapi', 'nvidia', 'apishop', 'opencode', 'omniroute'].includes(provider);
        if (requiresApiKey) {
            apiKeySection.style.display = 'block';
            try {
                const data = await fetchWithAuth(`/api/get_api_key/${provider}`);
                if (data.success && data.api_key) {
                    apiKeyInput.value = data.api_key;
                    apiKeyStatus.textContent = `✅ Key loaded: ${data.api_key.substring(0, 4)}????${data.api_key.slice(-4)}`;
                    apiKeyStatus.style.color = "#00ff88";
                } else { throw new Error("No key"); }
            } catch (e) { apiKeyInput.value = ""; apiKeyStatus.textContent = "⚠️ No API key found"; apiKeyStatus.style.color = "#ffaa00"; }
        } else { apiKeySection.style.display = 'none'; }
    }

    function initializeModelSelection() {
        const providerSelect = toolbar.querySelector("#providerSelect");
        const modelSelect = toolbar.querySelector("#modelSelect");
        const providers = [
            { value: 'ollama', label: '🦙 Ollama' }, { value: 'lightning', label: '⚡ Lightning.ai' },
            { value: 'openai', label: '🤖 OpenAI' }, { value: 'openrouter', label: '🌐 OpenRouter' },
            { value: 'anthropic', label: '🧠 Anthropic' }, { value: 'google', label: '🔍 Google' },
            { value: 'aimlapi', label: '🎯 AIML API' }, { value: 'nvidia', label: '💻 NVIDIA' },
            { value: 'apishop', label: '🛒 API Shop' }, { value: 'opencode', label: '💻 OpenCode AI' },
            { value: 'omniroute', label: '🔄 OmniRoute' }
        ];
        providerSelect.innerHTML = '';
        providers.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.value; opt.textContent = p.label;
            if (p.value === selectedProvider) opt.selected = true;
            providerSelect.appendChild(opt);
        });

        providerSelect.onchange = async (e) => {
            selectedProvider = e.target.value;
            await updateApiKeySectionVisibility(selectedProvider);
            await loadModelsForProvider(selectedProvider);
            localStorage.setItem("dev_selected_provider", selectedProvider);
        };
        modelSelect.onchange = () => {
            selectedModel = modelSelect.value;
            localStorage.setItem("dev_selected_model", selectedModel);
        };

        updateApiKeySectionVisibility(selectedProvider).then(() => loadModelsForProvider(selectedProvider));
    }

    // ===== Mobile Toggles =====
    function toggleMinimize() {
        isMobileMinimized = !isMobileMinimized;
        localStorage.setItem("dev_mobile_minimized", isMobileMinimized);
        if (toolbar) {
            if (isMobileMinimized) toolbar.classList.add("minimized");
            else toolbar.classList.remove("minimized");
            const minBtn = toolbar.querySelector("#minimizeBtn");
            if (minBtn) minBtn.innerHTML = isMobileMinimized ? "➕" : "➖";
        }
    }

    function toggleRequirement() {
        isRequirementEnabled = !isRequirementEnabled;
        localStorage.setItem("dev_req_enabled", isRequirementEnabled);
        const btn = toolbar?.querySelector("#toggleRequirementBtn");
        if (btn) {
            if (isRequirementEnabled) {
                btn.className = "toggle-req-btn enabled";
                btn.textContent = "✅ ON";
                showNotification("✅ Requirements enabled", "success");
            } else {
                btn.className = "toggle-req-btn disabled";
                btn.textContent = "⛔ OFF";
                showNotification("⛔ Requirements disabled", "warning");
            }
        }
    }

    // ===== Toolbar =====
    function buildToolbar() {
        if (toolbar) toolbar.remove();
        toolbar = document.createElement("div");
        toolbar.className = "dev-toolbar";
        if (isMobile() && isMobileMinimized) toolbar.classList.add("minimized");

        const isAuthenticated = !!authToken;
        toolbar.innerHTML = `
            <div class="toolbar-header">
                <div class="badge-group">
                    <span style="font-weight:bold;color:#00e0ff;">🤖 Dev Assistant</span>
                    <span id="countBadge" style="background:#00e0ff;color:#000;padding:2px 8px;border-radius:12px;font-size:12px;">📋 ${selections.length}</span>
                    <span id="activeBadge" style="background:#00ff88;color:#000;padding:2px 8px;border-radius:12px;font-size:12px;">✅ ${selections.filter(r => r.active !== false).length}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                    <div class="mobile-controls">
                        <button id="toggleRequirementBtn" class="toggle-req-btn ${isRequirementEnabled ? 'enabled' : 'disabled'}">${isRequirementEnabled ? '✅ ON' : '⛔ OFF'}</button>
                        <button id="minimizeBtn" class="minimize-btn">${isMobileMinimized ? '➕' : '➖'}</button>
                    </div>
                    <div id="authStatus" style="font-size:11px;">${isAuthenticated ? `<span style="color:#00ff88;">👤 ${currentUser?.username || 'User'}</span>` : '<span style="color:#ffaa00;">👤 Guest</span>'}</div>
                </div>
            </div>
            <div class="toolbar-content">
                <button id="authButton" class="btn ${isAuthenticated ? 'btn-danger' : 'btn-info'}" style="width:100%;margin-bottom:12px;">${isAuthenticated ? '🚪 Logout' : '🔑 Login'}</button>
                <div style="margin-bottom:12px;padding:10px;background:rgba(0,224,255,0.1);border-radius:6px;border:1px solid #00e0ff;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <select id="providerSelect" class="dev-select" style="padding:6px;font-size:11px;" ${!isAuthenticated ? 'disabled' : ''}></select>
                        <select id="modelSelect" class="dev-select" style="padding:6px;font-size:11px;" ${!isAuthenticated ? 'disabled' : ''}></select>
                    </div>
                    <div id="apiKeySection" style="display:none;margin-top:8px;">
                        <div style="display:grid;grid-template-columns:1fr auto;gap:4px;">
                            <input type="password" id="apiKeyInput" class="dev-input" placeholder="API Key..." style="padding:6px;font-size:11px;" ${!isAuthenticated ? 'disabled' : ''}>
                            <button id="saveApiKey" class="btn btn-primary btn-sm">💾 Save</button>
                        </div>
                        <div id="apiKeyStatus" style="font-size:10px;margin-top:4px;"></div>
                    </div>
                    <button id="refreshModels" class="btn btn-sm" style="width:100%;margin-top:8px;background:#555;" ${!isAuthenticated ? 'disabled' : ''}>🔄 Refresh</button>
                </div>
                <div class="btn-group" style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button id="reviewBtn" class="btn btn-sm" style="flex:1;background:#444;">📋 Review</button>
                    <button id="sendBtn" class="btn btn-sm btn-info" style="flex:1;" ${!isAuthenticated ? 'disabled' : ''}>📤 Send</button>
                    <button id="clearBtn" class="btn btn-sm btn-danger" style="flex:1;">🗑️ Clear</button>
                </div>
            </div>
            <div class="minimized-label" style="display:none;">🤖</div>
        `;
        document.body.appendChild(toolbar);

        makeDraggable(toolbar, toolbar.querySelector('.toolbar-header'));

        toolbar.querySelector("#authButton").onclick = isAuthenticated ? logout : showAuthModal;
        toolbar.querySelector("#reviewBtn").onclick = showReviewModal;
        toolbar.querySelector("#clearBtn").onclick = () => { if (confirm("Clear all?")) { clearSelections(); showNotification("Cleared", "info"); } };
        toolbar.querySelector("#sendBtn").onclick = sendToBackend;
        toolbar.querySelector("#refreshModels").onclick = refreshModels;
        toolbar.querySelector("#saveApiKey").onclick = async () => {
            const key = toolbar.querySelector("#apiKeyInput").value.trim();
            if (!key) return;
            try {
                await fetchWithAuth('/api/save_api_key', { method: "POST", body: JSON.stringify({ provider: selectedProvider, api_key: key }) });
                showNotification("✅ API Key saved", "success");
                updateApiKeySectionVisibility(selectedProvider);
            } catch (e) { showNotification("❌ Failed to save key", "error"); }
        };

        const minBtn = toolbar.querySelector("#minimizeBtn");
        if (minBtn) minBtn.onclick = (e) => { e.stopPropagation(); toggleMinimize(); };
        const togReqBtn = toolbar.querySelector("#toggleRequirementBtn");
        if (togReqBtn) togReqBtn.onclick = (e) => { e.stopPropagation(); toggleRequirement(); };

        toolbar.addEventListener('click', function(e) {
            if (toolbar.classList.contains('minimized') && !e.target.closest('.minimize-btn') && !e.target.closest('.toggle-req-btn')) {
                toggleMinimize();
            }
        });

        if (isAuthenticated) initializeModelSelection();
        updateCount();
    }

    // ===== Speech to Text =====
    function setupSpeechToText(textarea, micButton, statusElement) {
        if (!textarea || !micButton) return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            micButton.classList.add('unsupported');
            micButton.title = 'Not supported in this browser.';
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let baseText = '';
        let finalChunk = '';

        recognition.onstart = () => {
            isListening = true;
            micButton.classList.add('recording');
            micButton.innerHTML = '⏹️';
            baseText = textarea.value;
            if (baseText && !baseText.endsWith(' ') && !baseText.endsWith('\n')) baseText += ' ';
            if (statusElement) statusElement.style.display = 'flex';
        };

        recognition.onresult = (event) => {
            let interimText = '';
            finalChunk = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) finalChunk += transcript + ' ';
                else interimText += transcript;
            }
            if (finalChunk) { baseText += finalChunk; finalChunk = ''; }
            textarea.value = baseText + interimText;
            textarea.dispatchEvent(new Event('input'));
            textarea.scrollTop = textarea.scrollHeight;
        };

        recognition.onerror = (event) => {
            let msg = 'Voice input error';
            if (event.error === 'not-allowed') msg = 'Microphone permission denied.';
            else if (event.error === 'no-speech') msg = 'No speech detected.';
            else if (event.error === 'network') msg = 'Network error.';
            else if (event.error === 'audio-capture') msg = 'No microphone found.';
            if (event.error !== 'aborted') showNotification(`❌ ${msg}`, 'error');
        };

        recognition.onend = () => {
            isListening = false;
            micButton.classList.remove('recording');
            micButton.innerHTML = '🎤';
            if (statusElement) statusElement.style.display = 'none';
        };

        micButton.addEventListener('click', (e) => {
            e.stopPropagation(); e.preventDefault();
            if (isListening) {
                recognition.stop();
            } else {
                try {
                    baseText = textarea.value;
                    if (baseText && !baseText.endsWith(' ') && !baseText.endsWith('\n')) baseText += ' ';
                    recognition.start();
                    showNotification('🎤 Listening...', 'info');
                } catch (err) {
                    showNotification('❌ Failed to start voice input.', 'error');
                }
            }
        });

        micButton.addEventListener('mousedown', (e) => e.stopPropagation());
        activeSpeechRecognition = recognition;
    }

    function stopActiveSpeechRecognition() {
        if (activeSpeechRecognition && isListening) {
            try { activeSpeechRecognition.stop(); } catch (e) {}
        }
        isListening = false;
        activeSpeechRecognition = null;
    }

    // ===== Unified Requirement Form (Shared HTML & Logic) =====
    function getRequirementFormHTML(reqData, isNew) {
        const req = reqData || {};
        return `
            <div style="margin-bottom:12px;">
                <label class="dev-label">📝 Feature Request (Global)</label>
                <input type="text" id="featureRequest" class="dev-input" value="${globalFeatureRequest}">
            </div>
            <div style="margin-bottom:12px;">
                <label class="dev-label">📋 Feature Details (Global)</label>
                <textarea id="featureDetails" class="dev-textarea">${globalFeatureDetails}</textarea>
            </div>
            <div style="margin-bottom:15px;">
                <label class="dev-label">🎯 Feature Type</label>
                <div class="feature-grid">
                    <label class="feature-item"><input type="checkbox" id="is_frontend" class="feature-type-checkbox" ${req.feature_types?.includes('is_frontend') ? 'checked' : ''}><span>🎨 Frontend</span></label>
                    <label class="feature-item"><input type="checkbox" id="is_backend" class="feature-type-checkbox" ${req.feature_types?.includes('is_backend') ? 'checked' : ''}><span>⚙️ Backend</span></label>
                    <label class="feature-item"><input type="checkbox" id="is_full_stack" class="feature-type-checkbox" ${req.feature_types?.includes('is_full_stack') ? 'checked' : ''}><span>🚀 Full Stack</span></label>
                    <label class="feature-item"><input type="checkbox" id="is_error" class="feature-type-checkbox" ${req.feature_types?.includes('is_error') ? 'checked' : ''}><span>🐛 Error</span></label>
                </div>
            </div>
            <div id="errorDescriptionSection" style="display:${req.feature_types?.includes('is_error') ? 'block' : 'none'};margin-bottom:15px;">
                <label class="dev-label" style="color:#ff4444;">🐛 Error Description</label>
                <textarea id="errorDescription" class="dev-textarea" style="border-color:#ff4444;background:rgba(255,68,68,0.1);">${req.error_description || ''}</textarea>
            </div>
            <div style="margin-bottom:15px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span class="dev-label" style="margin:0;">📎 Reference Components:</span>
                    <button id="addMoreReferences" class="btn btn-warning btn-sm">➕ Add References</button>
                </div>
                <div id="selectedReferences" style="min-height:60px;border:1px dashed #555;border-radius:8px;padding:12px;background:rgba(255,255,255,0.05);"></div>
                <div id="referenceDescriptions" style="margin-top:10px;"></div>
            </div>
            <div style="margin-bottom:15px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <label class="dev-label" style="margin:0;">📝 Requirement Description *</label>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <button id="clearDescriptionBtn" class="clear-input-btn" title="Clear description">🧹</button>
                        <button id="voiceInputBtn" class="voice-input-btn" title="Voice input">🎤</button>
                    </div>
                </div>
                <textarea id="componentRequirement" class="dev-textarea" style="height:100px;" placeholder="${isNew ? 'Describe new component...' : 'Describe changes...'}">${req.requirement || ''}</textarea>
                <div id="voiceStatus" class="voice-status" style="display:none;"></div>
                <div style="display:flex;justify-content:flex-end;margin-top:6px;">
                    <button id="refineRequirementBtn" class="btn btn-sm" style="background:#9b59b6;">✨ Refine</button>
                </div>
            </div>
            <div id="imageUploadSection" style="margin-bottom:15px;padding:10px;background:rgba(0,224,255,0.05);border:1px dashed #00e0ff;border-radius:6px;">
                <div style="font-size:12px;color:#00e0ff;margin-bottom:8px;font-weight:bold;">🖼️ UI Mockups</div>
                <label class="btn btn-info btn-sm" style="cursor:pointer;">📎 Add Image<input type="file" id="imageUpload" accept="image/*" multiple style="display:none;"></label>
                <div id="imagePreviewContainer" class="image-grid" style="margin-top:10px;"></div>
            </div>
            <div style="margin-bottom:15px;">
                <label class="feature-item" style="background:rgba(0,224,255,0.1);border:1px solid #00e0ff;">
                    <input type="checkbox" id="isActive" ${req.active !== false ? 'checked' : ''}>
                    <span style="color:#00e0ff;font-weight:bold;">✅ Active Requirement</span>
                </label>
            </div>
        `;
    }

    function renderReferences(box, refsMap) {
        const selRefs = box.querySelector("#selectedReferences");
        const refDescs = box.querySelector("#referenceDescriptions");
        selRefs.innerHTML = '';
        refDescs.innerHTML = '';

        if (refsMap.size === 0) {
            selRefs.innerHTML = `<div style="color:#666;text-align:center;font-size:12px;padding:15px;">📭 No reference components selected yet</div>`;
            return;
        }

        const list = document.createElement("div");
        list.className = "ref-list";
        refsMap.forEach((refData, refName) => {
            const chip = document.createElement("div");
            chip.className = "ref-chip";
            chip.innerHTML = `<span>📄 ${refName}</span><button class="remove-ref" data-ref="${refName}" style="background:none;border:none;color:#ffaa00;cursor:pointer;font-size:12px;">✕</button>`;
            list.appendChild(chip);
        });
        selRefs.appendChild(list);

        refsMap.forEach((refData, refName) => {
            const desc = document.createElement("div");
            desc.style.marginBottom = "8px";
            desc.innerHTML = `<label class="dev-label">📝 Description for <strong>${refName}</strong>:</label><textarea class="dev-textarea reference-description" data-ref="${refName}" style="min-height:40px;font-size:12px;">${refData.description || ''}</textarea>`;
            refDescs.appendChild(desc);
        });

        selRefs.querySelectorAll(".remove-ref").forEach(btn => {
            btn.onclick = (e) => {
                const refName = e.target.getAttribute("data-ref");
                refsMap.delete(refName);
                renderReferences(box, refsMap);
            };
        });
    }

    function handleNavigationClick(e) {
        if (!isNavigatingForReferences || e.target.closest(".dev-unified-popup") || e.target.closest(".dev-toolbar") || e.target.closest(".dev-modal-overlay")) return;
        e.preventDefault(); e.stopPropagation();

        const comp = getBestComponentForClick(e.target);
        if (comp && comp.name && !navigationReferences.has(comp.name)) {
            navigationReferences.set(comp.name, { description: `Reference component: ${comp.name}`, componentDetails: comp.details });
            showNotification(`✅ Added ${comp.name}`, "success");
            if (activeInputBox) {
                renderReferences(activeInputBox, navigationReferences);
            }
        }
    }

    async function uploadImageToServer(reqIndex, file) {
        if (!authToken && !isGuestMode) return showNotification("🔒 Login required", "error");
        showLoader(`Uploading ${file.name}...`);
        try {
            const fd = new FormData();
            fd.append('image', file);
            fd.append('requirement_id', `req_${reqIndex}`);
            const data = await fetchWithAuth('/api/upload_requirement_image', { method: "POST", body: fd });
            if (data.success) {
                showNotification(`✅ Uploaded ${file.name}`, "success");
                return { id: data.image_id, url: data.url, filename: data.filename };
            } else { throw new Error(data.error); }
        } catch(e) { showNotification(`❌ Upload failed: ${e.message}`, "error"); return null; }
        finally { hideLoader(); }
    }

    function addImagePreviewToDOM(container, imageUrl, imageId, onDelete) {
        const preview = document.createElement("div");
        preview.style.cssText = `position:relative;width:100px;height:100px;border-radius:6px;overflow:hidden;border:2px solid #00e0ff;flex-shrink:0;`;
        const img = document.createElement("img");
        img.src = imageUrl.startsWith('http') ? imageUrl : python_host + imageUrl;
        img.style.cssText = `width:100%;height:100%;object-fit:cover;`;
        preview.appendChild(img);

        const delBtn = document.createElement("button");
        delBtn.textContent = "✕";
        delBtn.style.cssText = `position:absolute;top:4px;right:4px;background:rgba(255,68,68,0.9);border:none;color:#fff;width:20px;height:20px;border-radius:50%;cursor:pointer;padding:0;`;
        delBtn.onclick = async (e) => {
            e.stopPropagation();
            if (!confirm("Remove image?")) return;
            try {
                await fetchWithAuth(`/api/delete_requirement_image/${imageId}`, { method: "DELETE" });
                onDelete();
                preview.remove();
                showNotification("🗑️ Image removed", "success");
            } catch(err) { showNotification("❌ Delete failed", "error"); }
        };
        preview.appendChild(delBtn);
        container.appendChild(preview);
    }

    function bindRequirementFormEvents(box, reqData, index, isNew, saveCallback) {
        setupSpeechToText(box.querySelector("#componentRequirement"), box.querySelector("#voiceInputBtn"), box.querySelector("#voiceStatus"));

        const clearDescBtn = box.querySelector("#clearDescriptionBtn");
        const descTextarea = box.querySelector("#componentRequirement");
        if (clearDescBtn && descTextarea) {
            clearDescBtn.addEventListener("click", (e) => {
                e.stopPropagation(); e.preventDefault();
                if (isListening) {
                    stopActiveSpeechRecognition();
                }
                descTextarea.value = "";
                descTextarea.dispatchEvent(new Event("input"));
                descTextarea.focus();
                showNotification("🧹 Description cleared", "info");
            });
            clearDescBtn.addEventListener("mousedown", (e) => e.stopPropagation());
        }

        const checkboxes = box.querySelectorAll('.feature-type-checkbox');
        const errorSection = box.querySelector('#errorDescriptionSection');
        checkboxes.forEach(cb => cb.onchange = (e) => {
            if (e.target.id === 'is_error') {
                errorSection.style.display = e.target.checked ? 'block' : 'none';
                if (!e.target.checked) box.querySelector('#errorDescription').value = '';
            }
        });

        const currentReferences = new Map();
        if (reqData.reference_components) {
            Object.entries(reqData.reference_components).forEach(([name, d]) => currentReferences.set(name, d));
        }
        if (isNew && !currentReferences.has("App")) {
            currentReferences.set("App", { description: "Please follow code same way of this", componentDetails: { name: "App", domPath: "body > div#root", textContent: "Main application component", tagName: "div" } });
        }
        renderReferences(box, currentReferences);

        const addMoreRefsBtn = box.querySelector("#addMoreReferences");
        addMoreRefsBtn.onclick = () => {
            if (!isNavigatingForReferences) {
                isNavigatingForReferences = true;
                navigationReferences = new Map(currentReferences);
                addMoreRefsBtn.textContent = "✅ Finish";
                addMoreRefsBtn.classList.add("btn-primary");
                addMoreRefsBtn.classList.remove("btn-warning");
                document.addEventListener("click", handleNavigationClick, true);
                showNotification("🖱️ Hover over elements and click to add them as references", "info");
            } else {
                isNavigatingForReferences = false;
                // Clear highlight when exiting reference mode
                if (highlightedElement) {
                    highlightedElement.classList.remove('dev-highlight-ref');
                    highlightedElement = null;
                }
                currentReferences.clear();
                navigationReferences.forEach((v, k) => currentReferences.set(k, v));
                addMoreRefsBtn.textContent = "➕ Add References";
                addMoreRefsBtn.classList.add("btn-warning");
                addMoreRefsBtn.classList.remove("btn-primary");
                document.removeEventListener("click", handleNavigationClick, true);
                renderReferences(box, currentReferences);
            }
        };

        const fileInput = box.querySelector("#imageUpload");
        const previewContainer = box.querySelector("#imagePreviewContainer");
        let localImages = reqData.images ? [...reqData.images] : [];

        if (localImages.length > 0) {
            localImages.forEach(img => addImagePreviewToDOM(previewContainer, img.url, img.id, () => {
                localImages = localImages.filter(i => i.id !== img.id);
            }));
        }

        fileInput.onchange = async (e) => {
            const reqIndex = index >= 0 ? index : selections.length;
            for (const file of e.target.files) {
                const uploaded = await uploadImageToServer(reqIndex, file);
                if (uploaded) {
                    localImages.push(uploaded);
                    addImagePreviewToDOM(previewContainer, uploaded.url, uploaded.id, () => {
                        localImages = localImages.filter(i => i.id !== uploaded.id);
                    });
                }
            }
            fileInput.value = '';
        };

        box.querySelector("#refineRequirementBtn").onclick = async (e) => {
            e.stopPropagation();
            const textarea = box.querySelector("#componentRequirement");
            const desc = textarea.value.trim();
            if (!desc) return showNotification('⚠️ Enter description first', 'warning');
            const btn = e.target;
            btn.innerHTML = '⏳ Refining...'; btn.disabled = true;
            try {
                const data = await fetchWithAuth('/api/refine_requirement', { method: "POST", body: JSON.stringify({ description: desc, index }) });
                if (data.success) {
                    textarea.value = data.refined_description;
                    if (index >= 0 && selections[index]) {
                        selections[index].requirement = data.refined_description;
                        selections[index].updated_at = new Date().toISOString();
                        saveSelections();
                    }
                    showNotification('✨ Refined!', 'success');
                } else { throw new Error(data.error); }
            } catch (err) { showNotification(`❌ ${err.message}`, 'error'); }
            btn.innerHTML = '✨ Refine'; btn.disabled = false;
        };

        box.querySelector("#saveBtn").onclick = () => {
            const reqText = box.querySelector("#componentRequirement").value.trim();
            const featTypes = Array.from(checkboxes).filter(c => c.checked).map(c => c.id);
            const errDesc = box.querySelector("#errorDescription").value.trim();

            if (featTypes.includes('is_error') && !errDesc) return showNotification("⚠️ Error description required", "warning");
            if (!reqText && !featTypes.includes('is_error')) return showNotification("⚠️ Requirement text required", "warning");

            globalFeatureRequest = box.querySelector("#featureRequest").value.trim();
            globalFeatureDetails = box.querySelector("#featureDetails").value.trim();
            localStorage.setItem("dev_global_feature_request", globalFeatureRequest);
            localStorage.setItem("dev_global_feature_details", globalFeatureDetails);

            const refObj = {};
            currentReferences.forEach((refData, refName) => {
                const descTextarea = box.querySelector(`.reference-description[data-ref="${refName}"]`);
                refObj[refName] = { name: refName, description: descTextarea?.value.trim() || `Ref: ${refName}`, componentDetails: refData.componentDetails };
            });

            const now = new Date().toISOString();
            const isExisting = requirementIndexExists(index);
            const existingCreatedAt = isExisting && selections[index]?.created_at ? selections[index].created_at : now;

            const finalData = {
                requirement: reqText,
                reference_components: refObj,
                isNewComponent: isNew,
                componentType: isNew ? (box.querySelector("#newComponentType")?.value || "component") : undefined,
                componentDetails: !isNew ? reqData.componentDetails : null,
                feature_types: featTypes,
                error_description: featTypes.includes('is_error') ? errDesc : undefined,
                active: box.querySelector("#isActive").checked,
                component: box.querySelector("#componentNameEdit")?.value.trim() || reqData.component || "Component",
                images: localImages,
                has_images: localImages.length > 0,
                created_at: existingCreatedAt,
                updated_at: now
            };

            if (!isNew && reqData.text) finalData.text = reqData.text;

            if (reqData.yaml_response) {
                finalData.yaml_response = reqData.yaml_response;
                finalData.response_id = reqData.response_id;
                finalData.response_timestamp = reqData.response_timestamp;
                finalData.model_used = reqData.model_used;
            }

            saveCallback(finalData);
        };
    }

    function requirementIndexExists(index) {
        return index >= 0 && index < selections.length;
    }

    // ===== Popups =====
    function showUnifiedPopup({ x, y, target, componentName, domPath, isNewComponent = false, requirementIndex = -1 }) {
        if (isMobile() && !isRequirementEnabled) return showNotification("⛔ Requirements disabled", "warning");
        if (activeInputBox) activeInputBox.remove();

        const box = document.createElement("div");
        box.className = "dev-unified-popup";
        box.setAttribute('data-requirement-index', requirementIndex);

        const isMobileView = isMobile();
        const pWidth = isMobileView ? window.innerWidth - 20 : 700;
        const pX = isMobileView ? 10 : Math.max(10, Math.min(x, window.innerWidth - pWidth - 10));
        const pY = isMobileView ? 20 : Math.max(10, Math.min(y, window.innerHeight - 800 - 10));

        Object.assign(box.style, { left: `${pX}px`, top: `${pY}px`, width: `${pWidth}px` });

        const elementText = target?.textContent?.trim().substring(0, 100) || "";
        const componentDetails = getComponentDetails(target);

        box.innerHTML = `
            <div class="popup-header">
                <b>${isNewComponent ? '✨ Create New Component' : '🔧 Modify Component'}</b>
                <button id="closeBox" class="btn btn-danger btn-sm">✕</button>
            </div>
            ${!isNewComponent ? `
                <div style="background:rgba(0,224,255,0.1);padding:12px;border-radius:8px;margin-bottom:15px;border-left:4px solid #00e0ff;">
                    <label class="dev-label">📛 Name</label>
                    <input type="text" id="componentNameEdit" class="dev-input" value="${componentName}" style="border-color:#00e0ff;">
                </div>
                <div style="font-size:12px;color:#aaa;margin-bottom:12px;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;">📂 ${domPath}</div>
                ${elementText ? `<div style="font-size:13px;color:#ccc;margin-bottom:12px;padding:10px;background:rgba(255,255,255,0.05);border-radius:6px;">💬 "${elementText}"</div>` : ''}
            ` : ''}
            <div id="newComponentFields" style="display:${isNewComponent ? 'block' : 'none'};margin-bottom:15px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div><label class="dev-label">📛 Name</label><input type="text" id="newComponentName" class="dev-input" value="${isNewComponent ? 'App' : ''}"></div>
                    <div><label class="dev-label">🏷️ Type</label><select id="newComponentType" class="dev-select"><option value="component">🧩 Component</option><option value="page">📄 Page</option><option value="layout">📐 Layout</option></select></div>
                </div>
            </div>
            <div id="reqFormContainer"></div>
            <div class="btn-group" style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                <button id="cancelBtn" class="btn btn-secondary">❌ Cancel</button>
                <button id="saveBtn" class="btn btn-primary">💾 Save Requirement</button>
            </div>
        `;

        document.body.appendChild(box);
        activeInputBox = box;

        const formData = { componentDetails, text: elementText };
        box.querySelector("#reqFormContainer").innerHTML = getRequirementFormHTML(formData, isNewComponent);

        bindRequirementFormEvents(box, formData, requirementIndex, isNewComponent, (savedData) => {
            if (requirementIndex >= 0 && selections[requirementIndex]) {
                selections[requirementIndex] = { ...selections[requirementIndex], ...savedData };
            } else {
                selections.push(savedData);
            }
            saveSelections(); updateCount();
            stopActiveSpeechRecognition();
            box.remove(); activeInputBox = null;
            showNotification(`✅ Saved for ${savedData.component}`, "success");
        });

        const closeFn = () => { stopActiveSpeechRecognition(); box.remove(); activeInputBox = null; };
        box.querySelector("#closeBox").onclick = closeFn;
        box.querySelector("#cancelBtn").onclick = closeFn;
        makeDraggable(box, box.querySelector(".popup-header"));
    }

    function showEditRequirementModal(requirement, index) {
        closeAllModals();
        if (activeInputBox) activeInputBox.remove();

        const box = document.createElement("div");
        box.className = "dev-unified-popup";
        box.setAttribute('data-requirement-index', index);

        const isMobileView = isMobile();
        const pWidth = isMobileView ? window.innerWidth - 20 : 700;
        const pX = isMobileView ? 10 : window.innerWidth / 2 - pWidth / 2;
        const pY = isMobileView ? 20 : window.innerHeight / 2 - 400;

        Object.assign(box.style, { left: `${pX}px`, top: `${pY}px`, width: `${pWidth}px` });

        const isNew = requirement.isNewComponent || false;
        const domPath = requirement.componentDetails?.domPath || "Unknown";
        const elementText = requirement.componentDetails?.textContent || requirement.text || "";

        box.innerHTML = `
            <div class="popup-header">
                <b>✏️ Edit Requirement</b>
                <button id="closeBox" class="btn btn-danger btn-sm">✕</button>
            </div>
            <div style="background:rgba(0,224,255,0.1);padding:12px;border-radius:8px;margin-bottom:15px;border-left:4px solid #00e0ff;">
                <label class="dev-label">📛 Name</label>
                <input type="text" id="componentNameEdit" class="dev-input" value="${requirement.component}" style="border-color:#00e0ff;">
            </div>
            <div style="font-size:12px;color:#aaa;margin-bottom:12px;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;">📂 ${domPath}</div>
            ${elementText ? `<div style="font-size:13px;color:#ccc;margin-bottom:12px;padding:10px;background:rgba(255,255,255,0.05);border-radius:6px;">💬 "${elementText}"</div>` : ''}
            <div id="reqFormContainer"></div>
            <div class="btn-group" style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                <button id="cancelBtn" class="btn btn-secondary">❌ Cancel</button>
                <button id="saveBtn" class="btn btn-primary">💾 Save Changes</button>
            </div>
        `;

        document.body.appendChild(box);
        activeInputBox = box;

        box.querySelector("#reqFormContainer").innerHTML = getRequirementFormHTML(requirement, isNew);

        bindRequirementFormEvents(box, requirement, index, isNew, (savedData) => {
            selections[index] = { ...selections[index], ...savedData };
            saveSelections(); updateCount();
            stopActiveSpeechRecognition();
            box.remove(); activeInputBox = null;
            showNotification(`✅ Updated ${savedData.component}`, "success");
            setTimeout(showReviewModal, 300);
        });

        const closeFn = () => { stopActiveSpeechRecognition(); box.remove(); activeInputBox = null; setTimeout(showReviewModal, 300); };
        box.querySelector("#closeBox").onclick = closeFn;
        box.querySelector("#cancelBtn").onclick = closeFn;
        makeDraggable(box, box.querySelector(".popup-header"));
    }

    // ===== Review Modal =====
    function showReviewModal() {
        closeAllModals();
        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay";

        const activeReqs = selections.filter(r => r.active !== false);
        const inactiveReqs = selections.filter(r => r.active === false);

        overlay.innerHTML = `
            <div class="dev-modal-content">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid #444;padding-bottom:15px;">
                    <h3 style="margin:0;color:#00e0ff;">📋 Requirements Review</h3>
                    <button id="closeReview" class="btn btn-danger btn-sm">✕</button>
                </div>
                <div style="font-size:14px;color:#aaa;margin-bottom:20px;display:flex;gap:15px;flex-wrap:wrap;">
                    <span>📋 ${selections.length} total</span>
                    <span style="color:#00ff88;">✅ ${activeReqs.length} active</span>
                    <span style="color:#888;">⏸️ ${inactiveReqs.length} inactive</span>
                    <span style="color:#00e0ff;">↕️ Sorted by active, then recent</span>
                </div>
                <div id="reviewList"></div>
                <div style="margin-top:20px;text-align:right;border-top:1px solid #444;padding-top:15px;">
                    <button id="exportJson" class="btn btn-secondary btn-sm">📥 Export JSON</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const closeModal = registerModal(overlay);
        overlay.querySelector("#closeReview").onclick = closeModal;
        overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

        const list = overlay.querySelector("#reviewList");
        if (selections.length === 0) {
            list.innerHTML = `<div style="text-align:center;padding:40px;color:#666;">📭 No requirements yet</div>`;
        } else {
            const sortedSelections = selections
                .map((req, originalIndex) => ({ req, originalIndex }))
                .sort((a, b) => {
                    const aActive = a.req.active !== false ? 1 : 0;
                    const bActive = b.req.active !== false ? 1 : 0;
                    if (aActive !== bActive) return bActive - aActive;

                    const aTime = new Date(a.req.updated_at || a.req.created_at || a.req.response_timestamp || 0).getTime();
                    const bTime = new Date(b.req.updated_at || b.req.created_at || b.req.response_timestamp || 0).getTime();
                    return bTime - aTime;
                });

            sortedSelections.forEach(({ req, originalIndex }) => {
                const el = document.createElement("div");
                el.style.cssText = `background:rgba(255,255,255,0.05);padding:15px;margin-bottom:12px;border-radius:8px;border-left:4px solid ${req.active !== false ? '#00e0ff' : '#666'};`;

                const updatedAt = req.updated_at ? new Date(req.updated_at).toLocaleString() : null;
                const createdAt = req.created_at ? new Date(req.created_at).toLocaleString() : null;
                const timeDisplay = updatedAt || createdAt || (req.response_timestamp ? new Date(req.response_timestamp).toLocaleString() : 'Unknown');

                el.innerHTML = `
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                        <b style="color:${req.active !== false ? '#00e0ff' : '#666'};">${req.component}</b>
                        <div class="btn-group" style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button class="editReq btn btn-info btn-sm" data-index="${originalIndex}">✏️ Edit</button>
                            <button class="toggleActive btn ${req.active !== false ? 'btn-warning' : 'btn-primary'} btn-sm" data-index="${originalIndex}">${req.active !== false ? '⏸️ Deactivate' : '▶️ Activate'}</button>
                            <button class="sendReq btn btn-warning btn-sm" data-index="${originalIndex}" ${req.active === false ? 'style="display:none;"' : ''}>📤 Send</button>
                            <button class="delReq btn btn-danger btn-sm" data-index="${originalIndex}">🗑️ Delete</button>
                        </div>
                    </div>
                    <div style="font-size:14px;color:#ccc;background:rgba(0,0,0,0.3);padding:10px;border-radius:4px;margin-bottom:8px;">${req.requirement}</div>
                    <div style="font-size:11px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:#888;">
                        <span>🕒 ${updatedAt ? 'Updated' : 'Created'}: ${timeDisplay}</span>
                    </div>
                    <div style="font-size:11px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px;">
                        ${req.yaml_response ? `<span style="color:#00ff88;">✅ Response Received</span> <button class="viewYml btn btn-info btn-sm" data-index="${originalIndex}">👁️ View</button> <button class="applyYml btn btn-primary btn-sm" data-index="${originalIndex}">📦 Apply</button>` : `<span style="color:#ffaa00;">⏳ Waiting</span>`}
                    </div>
                `;
                list.appendChild(el);
            });
        }

        list.querySelectorAll(".editReq").forEach(b => b.onclick = () => { closeModal(); setTimeout(() => showEditRequirementModal(selections[parseInt(b.dataset.index)], parseInt(b.dataset.index)), 300); });
        list.querySelectorAll(".delReq").forEach(b => b.onclick = () => { if(confirm("Delete?")) { selections.splice(parseInt(b.dataset.index), 1); saveSelections(); updateCount(); closeModal(); setTimeout(showReviewModal, 100); } });
        list.querySelectorAll(".toggleActive").forEach(btn => btn.onclick = () => {
            const i = parseInt(btn.dataset.index);
            selections[i].active = !(selections[i].active !== false);
            selections[i].updated_at = new Date().toISOString();
            saveSelections(); updateCount();
            closeModal(); setTimeout(showReviewModal, 100);
        });
        list.querySelectorAll(".sendReq").forEach(b => b.onclick = async () => {
            b.textContent = "⏳"; b.disabled = true;
            try { await sendSingleRequirement(selections[parseInt(b.dataset.index)], parseInt(b.dataset.index)); closeModal(); setTimeout(showReviewModal, 100); }
            catch(e) { b.textContent = "📤 Send"; b.disabled = false; }
        });
        list.querySelectorAll(".viewYml").forEach(b => b.onclick = () => { const req = selections[parseInt(b.dataset.index)]; showYamlModalWithApply(req.yaml_response, req.component, req.response_id || `req_${b.dataset.index}`); });
        list.querySelectorAll(".applyYml").forEach(b => b.onclick = () => { const req = selections[parseInt(b.dataset.index)]; applyYamlChanges(req.yaml_response, req.response_id || `req_${b.dataset.index}`); });

        overlay.querySelector("#exportJson").onclick = () => {
            const blob = new Blob([JSON.stringify({ requirements: selections, globalFeatureRequest, globalFeatureDetails }, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `dev-reqs-${Date.now()}.json`;
            a.click();
        };
    }

    function showYamlModalWithApply(yamlContent, componentName, requirementId) {
        closeAllModals();
        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay";
        overlay.innerHTML = `
            <div class="dev-modal-content" style="max-width: 800px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid #444;padding-bottom:15px;">
                    <h3 style="margin:0;color:#00ff88;">📦 Apply Changes - ${componentName}</h3>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button id="clearYmlBtn" class="clear-input-btn" title="Clear YAML content">🧹</button>
                        <button id="closeYml" class="btn btn-danger btn-sm">✕</button>
                    </div>
                </div>
                <textarea class="dev-textarea" id="ymlContent" style="min-height:300px;font-family:monospace;font-size:12px;">${escapeHtml(yamlContent)}</textarea>
                <div class="btn-group" style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                    <button id="closeBtn" class="btn btn-secondary">❌ Close</button>
                    <button id="applyBtn" class="btn btn-primary">📦 Apply Changes</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const closeModal = registerModal(overlay);
        overlay.querySelector("#closeYml").onclick = closeModal;
        overlay.querySelector("#closeBtn").onclick = closeModal;

        overlay.querySelector("#clearYmlBtn").onclick = (e) => {
            e.stopPropagation();
            const ymlTextarea = overlay.querySelector("#ymlContent");
            ymlTextarea.value = "";
            ymlTextarea.dispatchEvent(new Event("input"));
            ymlTextarea.focus();
            showNotification("🧹 YAML content cleared", "info");
        };

        overlay.querySelector("#applyBtn").onclick = () => {
            applyYamlChanges(overlay.querySelector("#ymlContent").value, requirementId);
        };
        overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    }

    function escapeHtml(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

    // ===== Send & Apply =====
    async function sendSingleRequirement(req, index) {
        if (!authToken && !isGuestMode) return showAuthModal();
        if (!selectedModel) return showNotification("⚠️ Select model first", "error");
        showLoader(`Sending ${req.component}...`);
        try {
            const data = await fetchWithAuth('/api/llm_requirements', { method: "POST", body: JSON.stringify({ requirements: [req], model: selectedModel, provider: selectedProvider, globalFeatureRequest, globalFeatureDetails }) });
            if (data.response || data.yaml_response) {
                const yml = data.response || data.yaml_response;
                selections[index].yaml_response = yml;
                selections[index].response_id = data.id || `req_${index}`;
                selections[index].response_timestamp = new Date().toISOString();
                selections[index].model_used = selectedModel;
                selections[index].updated_at = new Date().toISOString();
                saveSelections();
                showYamlModalWithApply(yml, req.component, selections[index].response_id);
                showNotification(`✅ Sent ${req.component}!`, "success");
            }
        } catch(e) { showNotification(`❌ Send failed: ${e.message}`, "error"); }
        finally { hideLoader(); }
    }

    async function sendToBackend() {
        const activeReqs = selections.filter(r => r.active !== false);
        if (!activeReqs.length) return showNotification("⚠️ No active requirements", "warning");
        if (!authToken && !isGuestMode) return showAuthModal();
        if (!selectedModel) return showNotification("⚠️ Select model first", "error");

        showLoader(`Sending ${activeReqs.length} requirements...`);
        try {
            const data = await fetchWithAuth('/api/llm_requirements', { method: "POST", body: JSON.stringify({ requirements: activeReqs, model: selectedModel, provider: selectedProvider, globalFeatureRequest, globalFeatureDetails }) });
            if (data.response || data.yaml_response) {
                const yml = data.response || data.yaml_response;
                const resId = data.id || `req_${Date.now()}`;
                const now = new Date().toISOString();
                selections.forEach((r, i) => { if (r.active !== false) { r.yaml_response = yml; r.response_id = resId; r.model_used = selectedModel; r.response_timestamp = now; r.updated_at = now; } });
                saveSelections();
                showNotification("✅ Sent successfully!", "success");
                showYamlModalWithApply(yml, "Batch", resId);
            }
        } catch(e) { showNotification(`❌ Send failed: ${e.message}`, "error"); }
        finally { hideLoader(); }
    }

    async function applyYamlChanges(yaml, reqId) {
        showLoader("Applying changes...");
        try {
            const data = await fetchWithAuth('/api/apply_changes', { method: "POST", body: JSON.stringify({ yaml_response: yaml, requirement_id: reqId }) });
            if (data.success) {
                showNotification("✅ Applied successfully!", "success");
                if (reqId.startsWith('req_')) {
                    const i = parseInt(reqId.split('_')[1]);
                    if (selections[i]) {
                        selections[i].applied = true;
                        selections[i].applied_timestamp = new Date().toISOString();
                        selections[i].updated_at = new Date().toISOString();
                        saveSelections();
                    }
                }
            } else { throw new Error(data.error); }
        } catch(e) { showNotification(`❌ Apply failed: ${e.message}`, "error"); }
        finally { hideLoader(); }
    }

    // ===== Draggable =====
    function makeDraggable(element, handle) {
        let isDragging = false, startX, startY, initialX, initialY;
        const startDrag = (clientX, clientY) => {
            isDragging = true;
            startX = clientX; startY = clientY;
            initialX = parseInt(element.style.left) || 0;
            initialY = parseInt(element.style.top) || 0;
            document.addEventListener("mousemove", dragMouse);
            document.addEventListener("mouseup", stopDrag);
            document.addEventListener("touchmove", dragTouch, { passive: false });
            document.addEventListener("touchend", stopDrag, { passive: false });
        };
        const drag = (clientX, clientY) => {
            if (!isDragging) return;
            let newX = initialX + (clientX - startX);
            let newY = initialY + (clientY - startY);
            newX = Math.max(10, Math.min(newX, window.innerWidth - element.offsetWidth - 10));
            newY = Math.max(10, Math.min(newY, window.innerHeight - element.offsetHeight - 10));
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        };
        const dragMouse = (e) => drag(e.clientX, e.clientY);
        const dragTouch = (e) => { e.preventDefault(); drag(e.touches[0].clientX, e.touches[0].clientY); };
        const stopDrag = () => {
            isDragging = false;
            document.removeEventListener("mousemove", dragMouse);
            document.removeEventListener("mouseup", stopDrag);
            document.removeEventListener("touchmove", dragTouch);
            document.removeEventListener("touchend", stopDrag);
        };
        handle.addEventListener("mousedown", (e) => startDrag(e.clientX, e.clientY));
        handle.addEventListener("touchstart", (e) => startDrag(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    }

    // ===== Event Listeners =====
    function setupEventListeners() {
        let lastClickTime = 0, lastClickedElement = null, isPopupOpening = false;

        document.addEventListener("click", function(e) {
            if (isMobile() && !isRequirementEnabled) return;
            if (activeInputBox || e.target.closest(".dev-unified-popup") || e.target.closest(".dev-toolbar") || e.target.closest(".dev-modal-overlay") || isPopupOpening || isNavigatingForReferences) return;

            const clickedElement = e.target;
            const currentTime = Date.now();
            const isDoubleClick = (currentTime - lastClickTime < 300) && (clickedElement === lastClickedElement);
            const isMobileDevice = isMobile();

            if (isDoubleClick || isMobileDevice) {
                const bestComponent = getBestComponentForClick(clickedElement);
                if (bestComponent) {
                    isPopupOpening = true;
                    showUnifiedPopup({
                        x: e.clientX, y: e.clientY,
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

        // Mousemove listener to highlight components when adding references
        document.addEventListener("mousemove", function(e) {
            if (!isNavigatingForReferences) {
                if (highlightedElement) {
                    highlightedElement.classList.remove('dev-highlight-ref');
                    highlightedElement = null;
                }
                return;
            }

            // Ignore if hovering over our own extension's UI elements
            if (e.target.closest(".dev-unified-popup") || e.target.closest(".dev-toolbar") || e.target.closest(".dev-modal-overlay")) {
                if (highlightedElement) {
                    highlightedElement.classList.remove('dev-highlight-ref');
                    highlightedElement = null;
                }
                return;
            }

            // Find the best React component under the cursor
            const comp = getBestComponentForClick(e.target);
            if (comp && comp.node) {
                if (highlightedElement !== comp.node) {
                    if (highlightedElement) {
                        highlightedElement.classList.remove('dev-highlight-ref');
                    }
                    comp.node.classList.add('dev-highlight-ref');
                    highlightedElement = comp.node;
                }
            } else {
                if (highlightedElement) {
                    highlightedElement.classList.remove('dev-highlight-ref');
                    highlightedElement = null;
                }
            }
        });

        document.addEventListener("keydown", function(e) {
            if (e.key === "Escape") {
                if (isNavigatingForReferences) {
                    isNavigatingForReferences = false;
                    if (highlightedElement) {
                        highlightedElement.classList.remove('dev-highlight-ref');
                        highlightedElement = null;
                    }
                    if (activeInputBox) {
                        const addMoreRefsBtn = activeInputBox.querySelector("#addMoreReferences");
                        if (addMoreRefsBtn) {
                            addMoreRefsBtn.textContent = "➕ Add References";
                            addMoreRefsBtn.classList.add("btn-warning");
                            addMoreRefsBtn.classList.remove("btn-primary");
                        }
                    }
                }
                if (activeInputBox) { stopActiveSpeechRecognition(); activeInputBox.remove(); activeInputBox = null; }
                if (activeModals.size > 0) closeAllModals();
            }
            if (e.key === "r" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); showReviewModal(); }
        });

        window.addEventListener("resize", () => {
            if (toolbar) {
                if (isMobile() && isMobileMinimized) toolbar.classList.add("minimized");
                else if (!isMobile()) toolbar.classList.remove("minimized");
            }
        });
    }

    // ===== Initialize =====
    function initialize() {
        localStorage.removeItem("dev_available_models");
        document.querySelectorAll(".dev-toolbar, .dev-unified-popup, .dev-modal-overlay").forEach(el => el.remove());

        const token = localStorage.getItem('my_agent_token');
        if (token) { authToken = token; currentUser = JSON.parse(localStorage.getItem('my_agent_user') || "null"); isGuestMode = false; }

        buildToolbar();
        setupEventListeners();
        setTimeout(() => showNotification("🤖 Dev Assistant Ready", "info"), 500);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
    else initialize();

})();