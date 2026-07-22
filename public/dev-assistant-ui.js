(function () {
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
    background: rgba(0, 0, 0, 0.7);
    z-index: 1000004;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(5px);
}

.dev-loader-content {
    background: rgba(25, 25, 35, 0.95);
    padding: 25px;
    border-radius: 12px;
    border: 1px solid #00e0ff;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    text-align: center;
    min-width: 200px;
}

.dev-spinner {
    border: 4px solid rgba(0, 224, 255, 0.3);
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
`;

// Inject loader styles
    const styleSheet = document.createElement("style");
    styleSheet.textContent = loaderStyles;
    document.head.appendChild(styleSheet);

    // ===== Loader Management Functions =====
    let activeLoader = null;

    function showLoader(message = "Processing...") {
        // Remove existing loader if any
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


    console.log("🧠 Dev Assistant Loading...");

    const python_host = `${window.location.protocol}//${window.location.hostname}:5000`;

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
                            {
                                type: "h1",
                                props: {
                                    children: "Default Application"
                                }
                            },
                            {
                                type: "p",
                                props: {
                                    children: "This is a default app component created by Dev Assistant."
                                }
                            }
                        ]
                    }
                };
            }
        };
    }

    // ===== Authentication State =====
    let authToken = localStorage.getItem("my_agent_token") || null;
    let currentUser = JSON.parse(localStorage.getItem("my_agent_user") || "null");
    let isGuestMode = false;

    // ===== Persistent state =====
    let selections = JSON.parse(localStorage.getItem("dev_requirements") || "[]");
    let referenceComponents = JSON.parse(localStorage.getItem("dev_reference_components") || "{}");
    let activeInputBox = null;
    let toolbar = null;
    let globalFeatureRequest = localStorage.getItem("dev_global_feature_request") || "";
    let globalFeatureDetails = localStorage.getItem("dev_global_feature_details") || "";
    let activeModal = null;

    // ===== Model Selection State =====
    let selectedModel = localStorage.getItem("dev_selected_model") || "llama3.1:latest";
    let selectedProvider = localStorage.getItem("dev_selected_provider") || "ollama";
    let availableModels = JSON.parse(localStorage.getItem("dev_available_models") || "{}");

    // ===== Reference Navigation State =====
    let isNavigatingForReferences = false;
    let navigationReferences = new Map();
    let selectedReferences = new Map();

    // ===== Integration State =====
    let swaggerEndpoints = [];
    let selectedEndpoints = new Map();

    // ===== Modal Management =====
    let activeModals = new Set();

    // Helper function to group endpoints
    function groupEndpointsByController(endpoints) {
        const grouped = {};

        endpoints.forEach(endpoint => {
            const controller = endpoint.controller || 'UnknownController';
            if (!grouped[controller]) {
                grouped[controller] = {
                    name: controller,
                    endpoints: []
                };
            }
            grouped[controller].endpoints.push(endpoint);
        });

        // Sort controllers alphabetically
        return Object.keys(grouped)
            .sort()
            .reduce((sorted, key) => {
                // Sort endpoints within each controller by method, then path
                grouped[key].endpoints.sort((a, b) => {
                    const methodOrder = { 'GET': 1, 'POST': 2, 'PUT': 3, 'DELETE': 4, 'PATCH': 5 };
                    const aMethodOrder = methodOrder[a.method] || 99;
                    const bMethodOrder = methodOrder[b.method] || 99;

                    if (aMethodOrder !== bMethodOrder) {
                        return aMethodOrder - bMethodOrder;
                    }
                    return a.path.localeCompare(b.path);
                });

                sorted[key] = grouped[key];
                return sorted;
            }, {});
    }

    // ---------------------------------------------------
    // JSON Fixer: Safely parse both valid + escaped JSON
    // ---------------------------------------------------
    function safeParseJSON(value) {
        if (!value) return null;

        try {
            // Try normal parse
            return JSON.parse(value);
        } catch (e1) {
            try {
                // Try to fix Swagger escaped JSON
                const fixed = value
                    .replace(/^"/, '')   // remove starting quote
                    .replace(/"$/, '')   // remove ending quote
                    .replace(/\\"/g, '"'); // unescape inner quotes

                return JSON.parse(fixed);
            } catch (e2) {
                console.warn("❌ Could not parse JSON:", value);
                return null;
            }
        }
    }

    // Extract endpoint info function
    function extractEndpointInfo(element) {
        const opBlock = element.closest('.opblock');
        if (!opBlock) return null;

        // Extract method and path
        const method = opBlock.querySelector('.opblock-summary-method')?.textContent?.trim() || 'GET';
        const path = opBlock.querySelector('.opblock-summary-path')?.textContent?.trim() || '';
        const summary = opBlock.querySelector('.opblock-summary-description')?.textContent?.trim() || '';

        // Try to get operation ID
        let operationId = '';
        let controller = '';
        let action = '';

        const opIdElement = opBlock.querySelector('.opblock-summary-operation-id');
        if (opIdElement) {
            operationId = opIdElement.textContent?.trim() || '';
            if (operationId.includes('#')) {
                const parts = operationId.split('#');
                controller = parts[0];
                action = parts[1];
            }
        }

        // Parse path to infer controller and action
        const pathParts = path.split('/').filter(p => p);
        const filteredParts = pathParts.filter(p =>
            !['api', 'v1', 'v2', 'v3'].includes(p.toLowerCase())
        );

        if (filteredParts.length > 0) {
            const resource = filteredParts[0];

            // Determine action based on method and path
            if (path.includes('{id}') || path.includes(':id')) {
                switch(method) {
                    case 'GET': action = 'show'; break;
                    case 'PUT': case 'PATCH': action = 'update'; break;
                    case 'DELETE': action = 'destroy'; break;
                    default: action = 'show';
                }
            } else {
                switch(method) {
                    case 'GET': action = 'index'; break;
                    case 'POST': action = 'create'; break;
                    default: action = 'index';
                }
            }

            // Build controller name
            controller = resource
                .replace(/s$/, '')
                .replace(/[_-](.)/g, (_, c) => c.toUpperCase())
                .replace(/^(.)/, (_, c) => c.toUpperCase()) + 'Controller';
        }

        // Build model name
        const modelName = controller ? controller.replace('Controller', '') : 'UnknownModel';
        const resourceName = modelName.toLowerCase() + 's';

        // ---------------------------------------------------
        // Find LAST h4 header inside opblock (Extensions)
        // ---------------------------------------------------
        const headers = opBlock.querySelectorAll('.opblock-section-header h4');
        const extensionsHeader = headers[headers.length - 1];

        // Declare variables outside the if block so they're accessible
        let model = '';
        let modelPath = '';
        let controllerPath = '';

        if (extensionsHeader && extensionsHeader.textContent.trim() === 'Extensions') {
            const tableBody = extensionsHeader.parentElement
                .nextElementSibling
                ?.querySelector('table tbody');

            if (tableBody) {
                tableBody.querySelectorAll("tr").forEach(row => {
                    const field = row.children[0]?.textContent?.trim();
                    const rawValue = row.children[1]?.textContent?.trim();

                    if (!field || !rawValue) return;

                    if (field === "x-model") {
                        const json = safeParseJSON(rawValue);

                        if (json) {
                            modelPath = json.path || '';
                            model = json.name || '';
                        }
                    }

                    // Parse x-controller-info JSON
                    if (field === "x-controller-info") {
                        const json = safeParseJSON(rawValue);

                        if (json) {
                            controllerPath = json.path || '';
                        }
                    }
                });
            }
        }

        const schema = extractEndpointSchema(opBlock);
        return {
            method: method,
            path: path,
            summary: summary,
            controller: controller || 'UnknownController',
            action: action || 'unknown',
            model: modelName,
            controller_path: controllerPath || '',
            timestamp: new Date().toISOString(),
            url: window.location.href,
            // Added variables from extensions parsing
            extensions: {
                model: model || '',
                model_path: modelPath || '',
                controller_path: controllerPath || ''
            },
            // Include the opBlock reference for later schema extraction
            opBlock: opBlock,
            // Include schema
            schema: schema
        };
    }



    // Function to add endpoint references from Swagger UI
    function addSwaggerEndpointReferences() {
        console.log('🔍 Looking for Swagger UI endpoints to capture...');

        // Check if we're on a Swagger UI page
        if (!document.querySelector('.opblock')) {
            showNotification('Not on a Swagger UI page. Navigate to API documentation first.', 'warning');
            return;
        }

        // Close all other modals but NOT the edit popup
        document.querySelectorAll(".dev-modal-overlay").forEach(overlay => {
            if (!overlay.querySelector('#swaggerEndpointsList')) {
                if (overlay._escapeHandler) {
                    document.removeEventListener("keydown", overlay._escapeHandler);
                }
                overlay.remove();
            }
        });

        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay swagger-capture-overlay";
        Object.assign(overlay.style, {
            position: "fixed",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",

            zIndex: 1000002,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",

            pointerEvents: "none" // Allow clicks to pass through to Swagger UI
        });

        const modal = document.createElement("div");
        Object.assign(modal.style, {
            background: "transparent",
            color: "#fff",
            padding: "0",
            borderRadius: "0",
            width: "100%",
            height: "100%",
            overflow: "auto",
            border: "none",
            boxShadow: "none",
            pointerEvents: "none" // Allow clicks to pass through
        });

        modal.innerHTML = `
        <div style="position: absolute; top: 20px; right: 20px; z-index: 1000003; pointer-events: auto;">
            <div style="background: rgba(25, 25, 35, 0.95); padding: 15px; border-radius: 10px; border: 1px solid #00e0ff; box-shadow: 0 5px 20px rgba(0,0,0,0.5); width: 350px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: #00e0ff; font-size: 16px;">🔍 Capture Swagger Endpoints</h3>
                    <button id="closeSwaggerCapture" style="
                        background: #ff4444;
                        border: none;
                        color: #fff;
                        font-size: 18px;
                        cursor: pointer;
                        padding: 0;
                        width: 24px;
                        height: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 4px;
                    ">×</button>
                </div>

                <div style="margin-bottom: 15px; color: #ccc; font-size: 13px;">
                    <div style="padding: 8px; background: rgba(0,255,136,0.1); border-radius: 6px; border-left: 3px solid #00ff88; margin-bottom: 10px;">
                        <span style="color: #00ff88; font-weight: bold;">Instructions:</span> Click on any endpoint block below to add it as a reference
                    </div>
                    <div style="font-size: 12px; color: #ffaa00;">
                        ✅ Only endpoint clicks are captured<br>
                        ⚠️ Other clicks are ignored<br>
                        🔗 Unique endpoints only (no duplicates)
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                    <div style="font-size: 12px; color: #00e0ff;">
                        <span id="capturedCount">0</span> endpoints captured
                    </div>
                    <button id="finishSwaggerCapture" style="
                        padding: 8px 16px;
                        background: #00ff88;
                        border: none;
                        border-radius: 6px;
                        color: #000;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: bold;
                    ">✅ Finish</button>
                </div>
            </div>
        </div>
    `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Expand all Swagger endpoints
        function expandAllEndpoints() {
            console.log('📖 Expanding all Swagger endpoints...');

            // First, expand all operation blocks
            const expandButtons = document.querySelectorAll('.opblock-summary-control');
            expandButtons.forEach(btn => {
                if (btn.getAttribute('aria-expanded') === 'false') {
                    btn.click();
                }
            });

            // Also expand the parameters and responses sections
            setTimeout(() => {
                const sectionHeaders = document.querySelectorAll('.opblock-section-header');
                sectionHeaders.forEach(header => {
                    const toggleBtn = header.querySelector('.arrow');
                    if (toggleBtn && toggleBtn.classList.contains('down')) {
                        toggleBtn.click();
                    }
                });
            }, 100);

            // Expand all model schemas
            setTimeout(() => {
                const modelButtons = document.querySelectorAll('.model-box-control');
                modelButtons.forEach(btn => {
                    if (btn.getAttribute('aria-expanded') === 'false') {
                        btn.click();
                    }
                });
            }, 200);
        }

        // Count captured endpoints
        let capturedEndpoints = new Set();

        function updateCaptureCount() {
            const countElement = overlay.querySelector('#capturedCount');
            if (countElement) {
                countElement.textContent = capturedEndpoints.size;
            }
        }

        // Handle endpoint click
        function handleEndpointClick(e) {
            // Only handle clicks on opblock elements
            const opBlock = e.target.closest('.opblock');
            if (!opBlock) return;

            // Prevent default behavior
            e.preventDefault();
            e.stopPropagation();

            // Extract endpoint info
            const endpointInfo = extractEndpointInfo(opBlock);
            if (!endpointInfo) return;

            // Create unique key for this endpoint
            const endpointKey = `${endpointInfo.method}:${endpointInfo.path}:${endpointInfo.controller}:${endpointInfo.action}`;

            // Check if already captured
            if (capturedEndpoints.has(endpointKey)) {
                showNotification(`ℹ️ Endpoint already captured: ${endpointInfo.method} ${endpointInfo.path}`, 'info');
                return;
            }

            // Add to captured endpoints
            capturedEndpoints.add(endpointKey);

            // Capture as reference
            captureSwaggerEndpointAsReference(endpointInfo);

            // Highlight the clicked endpoint
            const highlightBox = document.createElement("div");
            const rect = opBlock.getBoundingClientRect();
            Object.assign(highlightBox.style, {
                position: "fixed",
                left: rect.left + "px",
                top: rect.top + "px",
                width: rect.width + "px",
                height: rect.height + "px",
                border: "3px solid #00ff88",
                borderRadius: "4px",
                pointerEvents: "none",
                zIndex: 1000001,
                backgroundColor: "rgba(0, 255, 136, 0.1)",
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.2)"
            });
            document.body.appendChild(highlightBox);

            // Remove highlight after 1 second
            setTimeout(() => {
                if (highlightBox.parentNode) {
                    highlightBox.parentNode.removeChild(highlightBox);
                }
            }, 1000);

            // Update count
            updateCaptureCount();

            showNotification(`✅ Added endpoint: ${endpointInfo.method} ${endpointInfo.path}`, 'success');
        }

        // Function to capture endpoint as reference
        // Function to capture endpoint as reference - ENHANCED VERSION
        function captureSwaggerEndpointAsReference(endpointInfo) {
            // Generate a unique reference name
            const refName = `endpoint_${endpointInfo.controller}_${endpointInfo.action}_${Date.now()}`;

            // Check for duplicates in active requirement
            const activeRequirement = selections.find(req => req.active !== false);
            if (activeRequirement && activeRequirement.reference_components) {
                const existingEndpoints = Object.values(activeRequirement.reference_components)
                    .filter(ref => ref.type === 'endpoint' &&
                        ref.endpoint_data.method === endpointInfo.method &&
                        ref.endpoint_data.path === endpointInfo.path &&
                        ref.endpoint_data.controller === endpointInfo.controller);

                if (existingEndpoints.length > 0) {
                    showNotification(`⚠️ Endpoint already in requirements: ${endpointInfo.method} ${endpointInfo.path}`, 'warning');
                    return;
                }
            }

            // Get the full Swagger endpoint data from the clicked element
            const opBlock = endpointInfo.opBlock || document.querySelector('.opblock');
            let fullEndpointData = {};

            if (opBlock) {
                // Try to extract more detailed endpoint information
                try {
                    const operationBlock = opBlock.querySelector('.opblock-body');
                    if (operationBlock) {
                        // Extract parameters
                        const paramsSection = operationBlock.querySelector('[data-section="parameters"]');
                        if (paramsSection) {
                            const params = [];
                            paramsSection.querySelectorAll('tr.parameters').forEach(row => {
                                const paramName = row.querySelector('.parameter__name')?.textContent?.trim();
                                const paramType = row.querySelector('.parameter__type')?.textContent?.trim();
                                const paramDesc = row.querySelector('.parameter__description')?.textContent?.trim();
                                if (paramName) {
                                    params.push({
                                        name: paramName,
                                        type: paramType || 'string',
                                        description: paramDesc || ''
                                    });
                                }
                            });
                            if (params.length > 0) {
                                fullEndpointData.parameters = params;
                            }
                        }

                        // Extract request body schema
                        const requestBodySection = operationBlock.querySelector('[data-section="requestBody"]');
                        if (requestBodySection) {
                            const schemaElement = requestBodySection.querySelector('.model-box');
                            if (schemaElement) {
                                const schemaText = schemaElement.textContent?.trim();
                                if (schemaText) {
                                    fullEndpointData.requestBody = {
                                        description: "Request body schema",
                                        content: {
                                            'application/json': {
                                                schema: schemaText
                                            }
                                        }
                                    };
                                }
                            }
                        }

                        // Extract responses
                        const responsesSection = operationBlock.querySelector('[data-section="responses"]');
                        if (responsesSection) {
                            const responses = {};
                            responsesSection.querySelectorAll('[data-code]').forEach(responseEl => {
                                const statusCode = responseEl.getAttribute('data-code');
                                const description = responseEl.querySelector('.response-col_description')?.textContent?.trim();
                                if (statusCode) {
                                    responses[statusCode] = {
                                        description: description || 'Response'
                                    };
                                }
                            });
                            if (Object.keys(responses).length > 0) {
                                fullEndpointData.responses = responses;
                            }
                        }
                    }
                } catch (error) {
                    console.warn("Could not extract detailed endpoint info:", error);
                }
            }

            // Extract minimal, LLM-focused schema
            const rawSchema = extractEndpointSchema(opBlock);
            const cleanedSchema = cleanSchemaForLLM(rawSchema);

            // Build comprehensive endpoint info with minimal schema
            const enhancedEndpointInfo = {
                ...endpointInfo,
                ...fullEndpointData,
                schema: cleanedSchema
            };

            // Create comprehensive endpoint reference object
            const endpointRef = {
                name: refName,
                description: `Swagger endpoint: ${endpointInfo.method} ${endpointInfo.path} - ${endpointInfo.summary || 'No description'}`,
                type: 'endpoint',
                endpoint_data: enhancedEndpointInfo,
                endpoint_metadata: {
                    "x-controller": endpointInfo.controller || "",
                    "x-action": endpointInfo.action || "",
                    "x-model": endpointInfo.extensions.model ? {
                        name: endpointInfo.extensions.model,
                        path: endpointInfo.extensions.model_path
                    } : {},
                    "x-controller-info": endpointInfo.extensions.controller_path ? {
                        path: endpointInfo.extensions.controller_path
                    } : {},
                    "x-serializers": []
                },
                metadata: {
                    controller: endpointInfo.controller,
                    action: endpointInfo.action,
                    method_used: endpointInfo.method,
                    path: endpointInfo.path,
                    summary: endpointInfo.summary,
                    model: endpointInfo.model,
                    "x-controller": endpointInfo.controller,
                    "x-action": endpointInfo.action,
                    "x-model": endpointInfo.extensions.model ? {
                        name: endpointInfo.extensions.model,
                        path: endpointInfo.extensions.model_path
                    } : {},
                    "x-controller-info": endpointInfo.extensions.controller_path ? {
                        path: endpointInfo.extensions.controller_path
                    } : {},
                    "x-serializers": []
                },
                // Include as API endpoint for integration
                as_api_endpoint: {
                    name: endpointInfo.summary || `Endpoint: ${endpointInfo.method} ${endpointInfo.path}`,
                    method: endpointInfo.method,
                    path: endpointInfo.path,
                    description: `Swagger endpoint: ${endpointInfo.method} ${endpointInfo.path}`,
                    type: 'api_endpoint',
                    endpoint_data: enhancedEndpointInfo,
                    // Include minimal schema for LLM
                    schema: cleanedSchema
                }
            };

            // Add to selected references
            selectedReferences.set(refName, {
                description: endpointRef.description,
                componentDetails: {
                    name: refName,
                    domPath: 'swagger-ui',
                    textContent: `Endpoint: ${endpointInfo.method} ${endpointInfo.path}`,
                    tagName: 'endpoint'
                },
                isEndpoint: true,
                endpointData: endpointRef
            });

            // Also add to selected endpoints for integration section
            const endpointKey = `${endpointInfo.method}_${endpointInfo.path}`;
            selectedEndpoints.set(endpointKey, {
                name: endpointInfo.summary || endpointInfo.path,
                method: endpointInfo.method,
                endpoint: endpointInfo.path,
                description: `Swagger endpoint: ${endpointInfo.method} ${endpointInfo.path}`,
                type: 'api_endpoint',
                swagger_endpoint: endpointRef,  // Store full swagger endpoint data
                controller: endpointInfo.controller,
                action: endpointInfo.action,
                model: endpointInfo.model,
                path: endpointInfo.path,
                summary: endpointInfo.summary,
                // Include minimal schema directly
                schema: cleanedSchema
            });

            // Update the display in the edit popup if it's open
            if (activeInputBox) {
                updateSelectedReferencesDisplay(activeInputBox, selectedReferences, false);
                updateSelectedEndpointsDisplay(activeInputBox.querySelector("#selectedEndpoints"));

                // Also update the active requirement
                const activeIndex = selections.findIndex(req => req.active !== false);
                if (activeIndex !== -1) {
                    if (!selections[activeIndex].reference_components) {
                        selections[activeIndex].reference_components = {};
                    }
                    selections[activeIndex].reference_components[refName] = endpointRef;

                    // Also update components array for backward compatibility
                    if (!selections[activeIndex].components) {
                        selections[activeIndex].components = [];
                    }
                    selections[activeIndex].components.push(endpointRef);

                    // Add to api_endpoints array for integration
                    if (!selections[activeIndex].api_endpoints) {
                        selections[activeIndex].api_endpoints = [];
                    }

                    // Check if endpoint already exists in api_endpoints
                    const existingEndpoint = selections[activeIndex].api_endpoints.find(
                        ep => ep.method === endpointInfo.method && ep.endpoint === endpointInfo.path
                    );

                    if (!existingEndpoint) {
                        // Create minimal API endpoint object for LLM
                        const minimalApiEndpoint = {
                            name: endpointInfo.summary || `Endpoint: ${endpointInfo.method} ${endpointInfo.path}`,
                            method: endpointInfo.method,
                            endpoint: endpointInfo.path,
                            description: `Swagger endpoint: ${endpointInfo.method} ${endpointInfo.path}`,
                            type: 'api_endpoint',
                            endpoint_data: enhancedEndpointInfo,
                            controller: endpointInfo.controller,
                            action: endpointInfo.action,
                            model: endpointInfo.model,
                            // Include only essential schema for LLM
                            schema: cleanedSchema ? {
                                parameters: cleanedSchema.parameters,
                                requestBody: cleanedSchema.requestBody ? {
                                    type: cleanedSchema.requestBody.type,
                                    properties: cleanedSchema.requestBody.properties,
                                    required: cleanedSchema.requestBody.required
                                } : null,
                                responses: cleanedSchema.responses
                            } : null
                        };

                        selections[activeIndex].api_endpoints.push(minimalApiEndpoint);
                    }

                    saveSelections();
                    updateCount();
                }
            }
        }

        // Event listeners
        const closeBtn = overlay.querySelector("#closeSwaggerCapture");
        const finishBtn = overlay.querySelector("#finishSwaggerCapture");

        function closeSwaggerCapture() {
            // Remove click listener
            document.removeEventListener('click', handleEndpointClick, true);

            // Remove overlay
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }

            showNotification(`✅ Finished capturing ${capturedEndpoints.size} endpoints`, 'success');
        }

        if (closeBtn) {
            closeBtn.addEventListener("click", closeSwaggerCapture);
        }

        if (finishBtn) {
            finishBtn.addEventListener("click", closeSwaggerCapture);
        }

        // Close on overlay click (but not on the control panel)
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                closeSwaggerCapture();
            }
        });

        // Add escape key handler
        const escapeHandler = (e) => {
            if (e.key === "Escape") {
                closeSwaggerCapture();
            }
        };

        overlay._escapeHandler = escapeHandler;
        document.addEventListener("keydown", escapeHandler);

        // Start capturing
        setTimeout(() => {
            // Expand all endpoints first
            expandAllEndpoints();

            // Add click listener to capture endpoints
            setTimeout(() => {
                document.addEventListener('click', handleEndpointClick, true);
            }, 300);

            showNotification('📖 All endpoints expanded. Click on any endpoint to add as reference.', 'info');
        }, 100);
    }

    // ===== Core Utilities =====
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

            const id = current.id;
            if (id) return id;

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
                const validClasses = className.split(/\s+/).filter(c =>
                    c && c.length > 2
                ).slice(0, 2);
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
            backgroundColor: "rgba(0, 255, 0, 0.1)",
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.2)"
        });
        document.body.appendChild(box);
        setTimeout(() => {
            if (box.parentNode) {
                box.parentNode.removeChild(box);
            }
        }, 1500);
        return box;
    }

    function getElementTextContent(el) {
        if (!el) return "";
        const text = el.textContent?.trim() || "";
        if (text) return text.substring(0, 100);
        return "No text content";
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
        const dataToSave = {
            requirements: selections,
        };
        localStorage.setItem("dev_requirements", JSON.stringify(dataToSave, null, 2));
        console.log("✅ Saved requirements:", selections.length);
    };

    const saveReferenceComponents = () => {
        localStorage.setItem("dev_reference_components", JSON.stringify(referenceComponents));
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
        referenceComponents = {};
        globalFeatureRequest = "";
        globalFeatureDetails = "";
        saveSelections();
        saveReferenceComponents();
        localStorage.removeItem("dev_global_feature_request");
        localStorage.removeItem("dev_global_feature_details");
        updateCount();
    };

    function showNotification(message, type = "info") {
        const colors = {
            info: "#00e0ff",
            success: "#00ff88",
            warning: "#ffaa00",
            error: "#ff4444"
        };

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
            border: "1px solid rgba(255,255,255,0.3)"
        });
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    function closeAllModals() {
        document.querySelectorAll(".dev-modal-overlay").forEach(overlay => {
            if (overlay._escapeHandler) {
                document.removeEventListener("keydown", overlay._escapeHandler);
            }
            overlay.remove();
        });
        activeModals.clear();
        activeModal = null;
    }

    function registerModal(overlay) {
        activeModals.add(overlay);
        activeModal = 'custom';

        const escapeHandler = (e) => {
            if (e.key === "Escape") {
                closeModal();
            }
        };

        overlay._escapeHandler = escapeHandler;
        document.addEventListener("keydown", escapeHandler);

        function closeModal() {
            if (overlay._escapeHandler) {
                document.removeEventListener("keydown", overlay._escapeHandler);
            }
            overlay.remove();
            activeModals.delete(overlay);
            if (activeModals.size === 0) {
                activeModal = null;
            }
        }

        return closeModal;
    }

    // ===== Authentication Functions =====
    function checkAuth() {
        const token = localStorage.getItem('my_agent_token');
        const userStr = localStorage.getItem('my_agent_user');

        console.log('🔐 Checking authentication...');

        if (token && userStr) {
            try {
                currentUser = JSON.parse(userStr);
                authToken = token;
                isGuestMode = false;
                console.log('✅ User authenticated:', currentUser.username);
                updateAuthUI(true);
                return true;
            } catch (e) {
                console.error('Error parsing user data:', e);
                isGuestMode = true;
                updateAuthUI(false);
                return false;
            }
        } else {
            console.log('❌ No authentication data found');
            isGuestMode = true;
            updateAuthUI(false);
            return false;
        }
    }

    function updateAuthUI(isAuthenticated) {
        if (toolbar) {
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
                    authStatus.innerHTML = `<span style="color: #00ff88;">✅ ${currentUser?.username || 'User'}</span>`;
                    authButton.textContent = "🚪 Logout";
                    authButton.onclick = logout;
                    authButton.style.background = "#ff4444";
                } else {
                    authStatus.innerHTML = '<span style="color: #ffaa00;">⚠️ Guest</span>';
                    authButton.textContent = "🔑 Login";
                    authButton.onclick = showAuthModal;
                    authButton.style.background = "#00e0ff";
                }
            }

            // Enable/disable features based on authentication
            const shouldDisable = !isAuthenticated;
            [modelSelect, providerSelect, sendBtn, refreshBtn, apiKeyInput, saveApiKeyBtn].forEach(el => {
                if (el) {
                    el.disabled = shouldDisable;
                    el.style.opacity = shouldDisable ? "0.5" : "1";
                    el.style.cursor = shouldDisable ? "not-allowed" : "pointer";
                }
            });
        }
    }

    function showAuthModal() {
        closeAllModals();

        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay";
        Object.assign(overlay.style, {
            position: "fixed",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.8)",
            zIndex: 1000002,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(5px)"
        });

        const modal = document.createElement("div");
        Object.assign(modal.style, {
            background: "#1a1a2a",
            color: "#fff",
            padding: "25px",
            borderRadius: "12px",
            width: "400px",
            maxHeight: "80%",
            overflowY: "auto",
            border: "1px solid #444",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
        });

        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 15px;">
                <h3 style="margin: 0; color: #00e0ff; font-size: 18px;">🔑 Authentication Required</h3>
                <button id="closeAuth" style="
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
            </div>

            <div style="margin-bottom: 20px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔐</div>
                <div style="font-size: 16px; color: #ccc; margin-bottom: 20px;">
                    Please login to access AI features
                </div>
            </div>

            <div id="authForm">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">Username</label>
                    <input type="text" id="authUsername" placeholder="Enter username" style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #555;
                        border-radius: 6px;
                        outline: none;
                        font-size: 14px;
                        background: #1a1a2a;
                        color: #fff;
                        font-family: inherit;
                    ">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">Password</label>
                    <input type="password" id="authPassword" placeholder="Enter password" style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #555;
                        border-radius: 6px;
                        outline: none;
                        font-size: 14px;
                        background: #1a1a2a;
                        color: #fff;
                        font-family: inherit;
                    ">
                </div>

                <div id="authError" style="display: none; background: rgba(255,68,68,0.1); color: #ff8888; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-left: 3px solid #ff4444; font-size: 13px;">
                </div>

                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="loginBtn" style="
                        flex: 1;
                        padding: 12px;
                        background: #00ff88;
                        border: none;
                        border-radius: 6px;
                        color: #000;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 14px;
                    ">🔑 Login</button>
                </div>
            </div>

            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #444; font-size: 12px; color: #888;">
                <div style="margin-bottom: 5px;">🔒 Login required for:</div>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>AI model access</li>
                    <li>Project modifications</li>
                    <li>Server management</li>
                    <li>API key storage</li>
                </ul>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const closeModal = registerModal(overlay);

        const closeAuthBtn = modal.querySelector("#closeAuth");
        const loginBtn = modal.querySelector("#loginBtn");
        const authError = modal.querySelector("#authError");

        if (closeAuthBtn) {
            closeAuthBtn.addEventListener("click", closeModal);
        }

        if (loginBtn) {
            loginBtn.addEventListener("click", () => {
                const username = modal.querySelector("#authUsername").value.trim();
                const password = modal.querySelector("#authPassword").value.trim();

                if (!username || !password) {
                    showAuthError("Please enter both username and password");
                    return;
                }

                performLogin(username, password);
            });
        }

        function showAuthError(message) {
            authError.textContent = message;
            authError.style.display = "block";
        }

        async function performLogin(username, password) {
            // Show loader for login
            const loader = showLoader("Authenticating...");

            try {
                loginBtn.disabled = true;
                loginBtn.textContent = "⏳ Logging in...";

                const response = await fetch(`${python_host}/api/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                const data = await response.json();

                if (data.success && data.token) {
                    localStorage.setItem("my_agent_token", data.token);
                    localStorage.setItem("my_agent_user", JSON.stringify(data.user));

                    authToken = data.token;
                    currentUser = data.user;
                    isGuestMode = false;

                    closeModal();
                    showNotification(`✅ Welcome ${currentUser.username}!`, "success");
                    updateAuthUI(true);

                    setTimeout(() => {
                        refreshModels();
                    }, 500);
                } else {
                    throw new Error(data.error || "Login failed");
                }
            } catch (error) {
                console.error("❌ Login error:", error);
                showAuthError(error.message || "Login failed. Please try again.");
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = "🔑 Login";
                // Hide loader
                hideLoader();
            }
        }

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }

    function logout() {
        console.log('🔐 Logging out...');

        fetch(`${python_host}/api/logout`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${authToken}`
            }
        }).catch(error => {
            console.error('Logout API error:', error);
        }).finally(() => {
            localStorage.removeItem("my_agent_token");
            localStorage.removeItem("my_agent_user");
            authToken = null;
            currentUser = null;
            isGuestMode = true;

            showNotification("Logged out successfully", "success");
            updateAuthUI(false);
            buildToolbar();
        });
    }

    // ===== Enhanced Fetch with Authentication =====
    // ===== Enhanced Fetch with Authentication =====
async function fetchWithAuth(url, options = {}) {
    const requiresAuth = !url.includes('/api/login') && !url.includes('/api/register');

    if (requiresAuth && !authToken && !isGuestMode) {
        showNotification("🔐 Please login to access this feature", "error");
        showAuthModal();
        throw new Error("Authentication required");
    }

    // Check if we're sending FormData
    const isFormData = options.body instanceof FormData;

    const headers = {
        "Accept": "application/json",
        ...options.headers
    };

    // Only set Content-Type if NOT FormData
    if (!isFormData) {
        headers["Content-Type"] = "application/json";
    }

    if (requiresAuth && authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(`${python_host}${url}`, {
            ...options,
            headers
        });

        if (response.status === 401 || response.status === 403) {
            showNotification("Session expired. Please login again.", "error");
            logout();
            throw new Error("Authentication failed");
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`❌ Fetch error for ${url}:`, error);

        if (error.message.includes("Authentication")) {
            showNotification("Authentication error. Please login again.", "error");
            logout();
        }

        throw error;
    }
}

    // ===== API Functions with Authentication =====
    async function applyYamlChanges(yamlContent, requirementId) {
        console.log('🔄 Applying YAML changes...', {
            requirementId,
            yamlContent: yamlContent ? yamlContent.substring(0, 100) + '...' : 'Empty content'
        });

        // Show loader for apply changes
        const loader = showLoader("Applying changes to your project...");

        const requestData = {
            yaml_response: yamlContent,
            requirement_id: requirementId,
            timestamp: new Date().toISOString(),
            session_id: `dev_assistant_${Date.now()}`
        };

        console.log('📨 Sending apply_changes request:', requestData);

        try {
            const data = await fetchWithAuth('/api/apply_changes', {
                method: "POST",
                body: JSON.stringify(requestData)
            });

            console.log('✅ Apply changes success:', data);

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
            setTimeout(() => {
                showReviewModal();
            }, 300);
        } catch (error) {
            console.error('❌ Error applying changes:', error);
            showNotification(`❌ Failed to apply changes: ${error.message}`, "error");

            const applyButtons = document.querySelectorAll('.applyChanges, #confirmApplyChanges');
            applyButtons.forEach(btn => {
                if (btn.innerHTML.includes('⏳')) {
                    btn.innerHTML = '🚀 Apply Changes';
                    btn.disabled = false;
                    btn.style.background = "#00ff88";
                }
            });
        } finally {
            // Hide loader
            hideLoader();
        }
    }

    function updateRequirementStatus(requirementId, status) {
        if (requirementId && requirementId.startsWith('req_')) {
            const index = parseInt(requirementId.split('_')[1]);
            if (!isNaN(index) && selections[index]) {
                selections[index].applied = status;
                selections[index].applied_timestamp = new Date().toISOString();
                saveSelections();
            }
        }
    }

    function confirmApplyChanges(yamlContent, componentName, requirementId) {
        console.log('🔄 confirmApplyChanges called:', { componentName, requirementId });
        applyYamlChanges(yamlContent, requirementId);
    }

    // ===== Model Management Functions =====
function getFallbackModels(provider) {
    const fallbackModels = {
        'ollama': ["llama3.1:latest", "codellama:latest", "mistral:latest", "llama2:latest", "gpt-oss:20b-cloud", "gpt-oss:120b-cloud"],
        'lightning': ["qwen3-coder:30b", "llama3.1:latest", "codellama:latest"],
        'openai': ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
        'openrouter': ["anthropic/claude-3-sonnet", "google/gemini-pro"],
        'anthropic': ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229"],
        'google': ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"],
        'aimlapi': ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
        'opencode': ["deepseek-v4-flash-free"],
        'omniroute': [
            // FREE models first
            "bb-web/gpt-4",
            "copilot-web/gpt-4",
            "pepper/pepper-1",
            "ddgw/llama-4-scout",
            "ddgw/mistral-small-2501",
            "ddgw/o3-mini",
            "tllm/GPT_5_4",
            "tllm/GPT_5",
            "veo-free/veo",
            "mcode/mimo-auto",
            "oc/deepseek-v4-flash-free",
            "oc/qwen3.6-plus-free",
            // PAID models
            "claude-sonnet-4.6__provider_aug",
            "aug/gemini-3.1-pro",
            "aug/gpt-5.5-high"
        ]
    };
    return fallbackModels[provider] || ["llama3.1:latest"];
}

    async function fetchModels(provider) {
        if (!authToken && !isGuestMode) {
            showNotification("🔐 Please login to fetch models", "error");
            showAuthModal();
            return getFallbackModels(provider);
        }

        // Show loader
        const loader = showLoader(`Fetching models for ${provider}...`);

        try {
            const data = await fetchWithAuth('/api/get_models', {
                method: "POST",
                body: JSON.stringify({
                    provider: provider,
                    _t: Date.now()
                })
            });

            console.log(`✅ Received models for ${provider}:`, data);

            if (data.models && Array.isArray(data.models)) {
                showNotification(`✅ Loaded ${data.models.length} models for ${provider}`, "success");
                return data.models;
            }

            console.warn(`⚠️ Using fallback models for ${provider}`);
            const fallbackModels = getFallbackModels(provider);
            showNotification(`✅ Using ${fallbackModels.length} fallback models for ${provider}`, "success");
            return fallbackModels;

        } catch (error) {
            console.error(`❌ Error fetching models for ${provider}:`, error);
            const fallbackModels = getFallbackModels(provider);
            showNotification(`✅ Using ${fallbackModels.length} fallback models for ${provider}`, "success");
            return fallbackModels;
        } finally {
            // Hide loader
            hideLoader();
        }
    }

    function saveModelSelection() {
        localStorage.setItem("dev_selected_model", selectedModel);
        localStorage.setItem("dev_selected_provider", selectedProvider);
    }

    // ===== Auto-save reference descriptions =====
    function autoSaveReferenceDescriptions() {
        const referenceTextareas = document.querySelectorAll('.reference-description');
        referenceTextareas.forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const refName = e.target.getAttribute('data-ref');
                const description = e.target.value.trim();

                if (isNavigatingForReferences) {
                    if (navigationReferences.has(refName)) {
                        const refData = navigationReferences.get(refName);
                        refData.description = description;
                        navigationReferences.set(refName, refData);
                    }
                } else {
                    if (selectedReferences.has(refName)) {
                        const refData = selectedReferences.get(refName);
                        refData.description = description;
                        selectedReferences.set(refName, refData);
                    }
                }

                if (referenceComponents[refName]) {
                    referenceComponents[refName].description = description;
                    saveReferenceComponents();
                }

                console.log(`💾 Auto-saved description for ${refName}:`, description);
            });
        });
    }

    // ===== NEW: Auto-save endpoint descriptions =====
    function autoSaveEndpointDescriptions() {
        const endpointTextareas = document.querySelectorAll('.endpoint-description');
        endpointTextareas.forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const endpointKey = e.target.getAttribute('data-endpoint');
                const description = e.target.value.trim();

                if (selectedEndpoints.has(endpointKey)) {
                    const endpointData = selectedEndpoints.get(endpointKey);
                    endpointData.description = description;
                    selectedEndpoints.set(endpointKey, endpointData);
                }

                console.log(`💾 Auto-saved description for endpoint ${endpointKey}:`, description);
            });
        });
    }

    // ===== NEW: Fetch Swagger Endpoints =====
    async function fetchSwaggerEndpoints() {
        // Show loader
        const loader = showLoader("Fetching Swagger API endpoints...");

        try {
            const data = await fetchWithAuth('/api/extract_swagger_endpoints', {
                method: "POST",
                body: JSON.stringify({
                    swagger_path: ""
                })
            });

            console.log("✅ Swagger endpoints received:", data);

            if (data.endpoints && Array.isArray(data.endpoints)) {
                swaggerEndpoints = data.endpoints;
                showNotification(`✅ Loaded ${swaggerEndpoints.length} Swagger endpoints`, "success");
                return swaggerEndpoints;
            } else {
                showNotification("❌ No endpoints found in response", "error");
                return [];
            }
        } catch (error) {
            console.error("❌ Error fetching Swagger endpoints:", error);
            showNotification(`❌ Failed to fetch endpoints: ${error.message}`, "error");
            return [];
        } finally {
            // Hide loader
            hideLoader();
        }
    }

    // ===== NEW: Simplified Endpoint Selection Modal =====
    function showSimpleEndpointSelectionModal(endpoints) {
        closeAllModals();

        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay";
        Object.assign(overlay.style, {
            position: "fixed",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.8)",
            zIndex: 1000002,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(5px)"
        });

        const modal = document.createElement("div");
        Object.assign(modal.style, {
            background: "#1a1a2a",
            color: "#fff",
            padding: "25px",
            borderRadius: "12px",
            width: "90%",
            maxWidth: "800px",
            maxHeight: "80%",
            overflowY: "auto",
            border: "1px solid #444",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
        });

        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 15px;">
                <h3 style="margin: 0; color: #00e0ff; font-size: 18px;">🌐 Select API Endpoints</h3>
                <button id="closeEndpointModal" style="
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
            </div>

            <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; color: #aaa; margin-bottom: 8px;">
                    Click on endpoints to select them. Selected endpoints will appear in the integration section.
                </div>
            </div>

            <div id="endpointList" style="margin-bottom: 20px; max-height: 400px; overflow-y: auto;">
                ${endpoints.length === 0 ? `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                        <div>No API endpoints available</div>
                    </div>
                ` : ''}
            </div>

            <div style="margin-top: 20px; text-align: right; border-top: 1px solid #444; padding-top: 15px;">
                <button id="closeModalBtn" style="
                    padding: 10px 20px;
                    background: #00e0ff;
                    border: none;
                    border-radius: 6px;
                    color: #000;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 13px;
                ">✅ Done Selecting</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const closeModal = registerModal(overlay);

        // Populate endpoints
        const endpointList = modal.querySelector("#endpointList");
        if (endpoints.length > 0) {
            endpoints.forEach((endpointObj, index) => {
                const endpoint = endpointObj.endpoint || endpointObj;
                const endpointElement = document.createElement("div");
                endpointElement.style.cssText = `
                    background: rgba(255,255,255,0.05);
                    padding: 12px;
                    margin-bottom: 8px;
                    border-radius: 6px;
                    border-left: 4px solid ${getMethodColor(endpoint.method)};
                    cursor: pointer;
                    transition: all 0.2s;
                `;

                endpointElement.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="
                            background: ${getMethodColor(endpoint.method)};
                            color: #000;
                            padding: 2px 8px;
                            border-radius: 4px;
                            font-size: 11px;
                            font-weight: bold;
                            min-width: 60px;
                            text-align: center;
                        ">
                            ${endpoint.method || 'GET'}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: #00e0ff; font-size: 13px; margin-bottom: 4px;">
                                ${endpoint.summary || endpoint.description || endpoint.path}
                            </div>
                            <div style="font-size: 11px; color: #ccc;">
                                ${endpoint.path}
                            </div>
                            ${endpoint.description ? `
                            <div style="font-size: 10px; color: #888; margin-top: 4px;">
                                ${endpoint.description}
                            </div>` : ''}
                        </div>
                    </div>
                `;

                // Check if already selected
                const endpointKey = `${endpoint.method}_${endpoint.path}`;
                if (selectedEndpoints.has(endpointKey)) {
                    endpointElement.style.background = "rgba(0,224,255,0.2)";
                    endpointElement.style.border = "1px solid #00e0ff";
                }

                endpointElement.addEventListener("click", () => {
                    const endpointKey = `${endpoint.method}_${endpoint.path}`;

                    if (selectedEndpoints.has(endpointKey)) {
                        selectedEndpoints.delete(endpointKey);
                        endpointElement.style.background = "rgba(255,255,255,0.05)";
                        endpointElement.style.border = "none";
                        endpointElement.style.borderLeft = `4px solid ${getMethodColor(endpoint.method)}`;
                    } else {
                        selectedEndpoints.set(endpointKey, {
                            ...endpoint,
                            summary: endpoint.summary || endpoint.description,
                            description: "", // Empty description for user to fill
                            type: 'api_endpoint'
                        });
                        endpointElement.style.background = "rgba(0,224,255,0.2)";
                        endpointElement.style.border = "1px solid #00e0ff";
                    }

                    // Update the display in the main popup
                    if (activeInputBox) {
                        updateSelectedEndpointsDisplay(activeInputBox.querySelector("#selectedEndpoints"));
                    }
                });

                endpointList.appendChild(endpointElement);
            });
        }

        // Close buttons
        modal.querySelector("#closeEndpointModal").addEventListener("click", closeModal);
        modal.querySelector("#closeModalBtn").addEventListener("click", () => {
            showNotification(`✅ Selected ${selectedEndpoints.size} API endpoints`, "success");
            closeModal();
        });

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }

    // ===== NEW: Update Selected Endpoints Display =====
    function updateSelectedEndpointsDisplay(container) {
        if (!container) return;

        const parent = container.parentElement;
        const descriptionContainer = parent ? parent.querySelector("#endpointDescriptions") : null;

        container.innerHTML = '';

        if (descriptionContainer) {
            descriptionContainer.innerHTML = '';
        }

        if (selectedEndpoints.size === 0) {
            container.innerHTML = `
                <div style="color: #666; text-align: center; font-size: 12px; padding: 15px;">
                    No API endpoints selected yet
                </div>
            `;
            return;
        }

        const endpointsList = document.createElement("div");
        endpointsList.style.display = "flex";
        endpointsList.style.flexWrap = "wrap";
        endpointsList.style.gap = "8px";
        endpointsList.style.marginBottom = "10px";

        selectedEndpoints.forEach((endpointData, endpointKey) => {
            const endpointChip = document.createElement("div");
            endpointChip.style.cssText = `
                display: flex;
                align-items: center;
                gap: 6px;
                background: rgba(0,224,255,0.2);
                border: 1px solid #00e0ff;
                border-radius: 14px;
                padding: 4px 10px;
                font-size: 11px;
                color: #00e0ff;
                cursor: pointer;
                transition: background 0.2s;
            `;

            endpointChip.innerHTML = `
                <span style="
                    background: ${getMethodColor(endpointData.method)};
                    color: #000;
                    padding: 1px 6px;
                    border-radius: 3px;
                    font-size: 9px;
                    font-weight: bold;
                ">
                    ${endpointData.method || 'GET'}
                </span>
                <span>${endpointData.summary || endpointData.description || endpointData.path}</span>
                <button class="remove-endpoint" data-endpoint="${endpointKey}" style="
                    background: none;
                    border: none;
                    color: #00e0ff;
                    cursor: pointer;
                    font-size: 12px;
                    padding: 0;
                    width: 14px;
                    height: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                ">×</button>
            `;

            endpointsList.appendChild(endpointChip);
        });

        container.appendChild(endpointsList);

        // Add endpoint descriptions (editable textareas)
        if (descriptionContainer) {
            selectedEndpoints.forEach((endpointData, endpointKey) => {
                const descDiv = document.createElement("div");
                descDiv.style.marginBottom = "8px";
                descDiv.innerHTML = `
                    <label style="display: block; font-size: 12px; color: #00e0ff; margin-bottom: 4px;">
                        📝 How to use <strong>${endpointData.summary || endpointData.path}</strong> (${endpointData.method}):
                    </label>
                    <textarea
                        class="endpoint-description"
                        data-endpoint="${endpointKey}"
                        placeholder="Describe how this API endpoint should be used (e.g., 'Fetch user data on page load', 'Submit form data when user clicks save')..."
                        style="
                            width: 100%;
                            padding: 8px;
                            border: 1px solid #555;
                            border-radius: 4px;
                            background: #1a1a2a;
                            color: #fff;
                            font-size: 12px;
                            resize: vertical;
                            min-height: 40px;
                        "
                    >${endpointData.description || ''}</textarea>
                `;
                descriptionContainer.appendChild(descDiv);
            });
        }

        // Add event listeners for remove buttons
        container.querySelectorAll(".remove-endpoint").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const endpointToRemove = e.target.closest("button").getAttribute("data-endpoint");
                selectedEndpoints.delete(endpointToRemove);
                updateSelectedEndpointsDisplay(container);
            });
        });

        // Auto-save endpoint descriptions
        setTimeout(() => {
            autoSaveEndpointDescriptions();
        }, 100);
    }

    // ===== NEW: Helper function for method colors =====
    function getMethodColor(method) {
        const colors = {
            'GET': '#00ff88',
            'POST': '#00e0ff',
            'PUT': '#ffaa00',
            'DELETE': '#ff4444',
            'PATCH': '#ff66ff',
            'default': '#666'
        };
        return colors[method?.toUpperCase()] || colors.default;
    }

    // ===== Update Selected References Display =====
    function updateSelectedReferencesDisplay(box, allReferences, isNavMode) {
        const selectedRefsContainer = box.querySelector("#selectedReferences");
        const refDescriptionsContainer = box.querySelector("#referenceDescriptions");
        if (!selectedRefsContainer) return;

        selectedRefsContainer.innerHTML = '';
        refDescriptionsContainer.innerHTML = '';

        if (allReferences.size === 0) {
            selectedRefsContainer.innerHTML = `
            <div style="color: #666; text-align: center; font-size: 12px; padding: 15px;">
                No reference components selected yet
            </div>
        `;
            return;
        }

        const refsList = document.createElement("div");
        refsList.style.display = "flex";
        refsList.style.flexWrap = "wrap";
        refsList.style.gap = "8px";
        refsList.style.marginBottom = "10px";

        allReferences.forEach((refData, refName) => {
            const refChip = document.createElement("div");
            refChip.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            background: ${refData.isEndpoint ? 'rgba(0,224,255,0.2)' : 'rgba(255,170,0,0.2)'};
            border: 1px solid ${refData.isEndpoint ? '#00e0ff' : '#ffaa00'};
            border-radius: 14px;
            padding: 4px 10px;
            font-size: 11px;
            color: ${refData.isEndpoint ? '#00e0ff' : '#ffaa00'};
        `;

            refChip.innerHTML = `
            <span>${refName}${refData.isEndpoint ? ' 🔗' : ''}</span>
            <button class="remove-ref" data-ref="${refName}" style="
                background: none;
                border: none;
                color: ${refData.isEndpoint ? '#00e0ff' : '#ffaa00'};
                cursor: pointer;
                font-size: 12px;
                padding: 0;
                width: 14px;
                height: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            ">×</button>
        `;

            refsList.appendChild(refChip);
        });

        selectedRefsContainer.appendChild(refsList);

        allReferences.forEach((refData, refName) => {
            const descDiv = document.createElement("div");
            descDiv.style.marginBottom = "8px";

            // For endpoint references, show endpoint details
            if (refData.isEndpoint && refData.endpointData) {
                const endpoint = refData.endpointData.endpoint_data;
                descDiv.innerHTML = `
                <label style="display: block; font-size: 12px; color: #00e0ff; margin-bottom: 4px;">
                    📝 Description for <strong>${refName}</strong> (Endpoint):
                </label>
                <textarea
                    class="reference-description"
                    data-ref="${refName}"
                    placeholder="Describe how this endpoint relates to the requirement..."
                    style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid #555;
                        border-radius: 4px;
                        background: #1a1a2a;
                        color: #fff;
                        font-size: 12px;
                        resize: vertical;
                        min-height: 40px;
                    "
                >${refData.description || ''}</textarea>

                <div style="margin-top: 8px; padding: 8px; background: rgba(0,224,255,0.1); border-radius: 4px; font-size: 11px;">
                    <div style="color: #00e0ff; font-weight: bold; margin-bottom: 4px;">Endpoint Details:</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <div><span style="color: #888;">Method:</span> ${endpoint.method}</div>
                        <div><span style="color: #888;">Path:</span> ${endpoint.path}</div>
                        <div><span style="color: #888;">Controller:</span> ${endpoint.controller}</div>
                        <div><span style="color: #888;">Action:</span> ${endpoint.action}</div>
                    </div>
                </div>
            `;
            } else {
                // For regular component references
                descDiv.innerHTML = `
                <label style="display: block; font-size: 12px; color: #ffaa00; margin-bottom: 4px;">
                    📝 Description for <strong>${refName}</strong>:
                </label>
                <textarea
                    class="reference-description"
                    data-ref="${refName}"
                    placeholder="Describe how this reference component relates to the requirement..."
                    style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid #555;
                        border-radius: 4px;
                        background: #1a1a2a;
                        color: #fff;
                        font-size: 12px;
                        resize: vertical;
                        min-height: 40px;
                    "
                >${refData.description || ''}</textarea>
            `;
            }
            refDescriptionsContainer.appendChild(descDiv);
        });

        selectedRefsContainer.querySelectorAll(".remove-ref").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const refToRemove = e.target.closest("button").getAttribute("data-ref");
                if (isNavMode) {
                    navigationReferences.delete(refToRemove);
                    updateSelectedReferencesDisplay(box, navigationReferences, true);
                } else {
                    selectedReferences.delete(refToRemove);

                    // Also remove from active requirement if it exists
                    const activeIndex = selections.findIndex(req => req.active !== false);
                    if (activeIndex !== -1 && selections[activeIndex].reference_components) {
                        delete selections[activeIndex].reference_components[refToRemove];

                        // Also remove from components array
                        if (selections[activeIndex].components) {
                            selections[activeIndex].components = selections[activeIndex].components.filter(
                                comp => comp.name !== refToRemove
                            );
                        }

                        saveSelections();
                    }
                    updateSelectedReferencesDisplay(box, selectedReferences, false);
                }
            });
        });

        setTimeout(() => {
            autoSaveReferenceDescriptions();
        }, 100);
    }

    // ===== Navigation Click Handler =====
    function handleNavigationClick(e) {
        if (!isNavigatingForReferences) return;

        if (e.target.closest(".dev-unified-popup")) return;

        e.preventDefault();
        e.stopPropagation();

        const clickedElement = e.target;
        const clickedComponent = getBestComponentForClick(clickedElement);

        if (clickedComponent && clickedComponent.name) {
            const refName = clickedComponent.name;
            if (!navigationReferences.has(refName)) {
                navigationReferences.set(refName, {
                    description: `Reference component: ${refName}`,
                    componentDetails: clickedComponent.details
                });

                if (activeInputBox) {
                    updateSelectedReferencesDisplay(activeInputBox, navigationReferences, true);
                }

                showNotification(`✅ Added ${refName} as reference component`, "success");
                highlightElement(clickedElement);

                if (!referenceComponents[refName]) {
                    referenceComponents[refName] = {
                        name: refName,
                        description: `Reference component: ${refName}`,
                        componentDetails: clickedComponent.details
                    };
                    saveReferenceComponents();
                    updateCount();
                }
            } else {
                showNotification(`ℹ️ ${refName} is already added as reference`, "info");
            }
        }
    }

    // ===== ENHANCED: Unified Popup with Integration Feature =====
    function showUnifiedPopup({x, y, target, componentName, domPath, isNewComponent = false}) {

        if (activeInputBox) {
            activeInputBox.remove();
            activeInputBox = null;
        }

        const popupWidth = 700;
        const popupHeight = 800;
        const adjustedX = Math.max(10, Math.min(x, window.innerWidth - popupWidth - 10));
        const adjustedY = Math.max(10, Math.min(y, window.innerHeight - popupHeight - 10));

        const isReference = referenceComponents[componentName];
        const elementText = getElementTextContent(target);
        const componentDetails = getComponentDetails(target);

        if (isNewComponent) {
            componentName = "App";
            componentDetails.name = "App";
        }

        // Add image upload section
const imageUploadSection = document.createElement("div");
imageUploadSection.id = "imageUploadSection";
imageUploadSection.style.cssText = `
    margin-bottom: 15px;
`;


        const box = document.createElement("div");
        box.className = "dev-unified-popup";
        Object.assign(box.style, {
            position: "fixed",
            left: `${adjustedX}px`,
            top: `${adjustedY}px`,
            background: "rgba(25, 25, 35, 0.98)",
            color: "#fff",
            padding: "20px",
            borderRadius: "10px",
            zIndex: 1000000,
            width: `${popupWidth}px`,
            maxHeight: "80vh",
            overflowY: "auto",
            fontFamily: "system-ui, sans-serif",
            fontSize: "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            border: "1px solid #444",
            backdropFilter: "blur(10px)"
        });

        selectedReferences = new Map();

        if (isNewComponent && !selectedReferences.has("App")) {
            selectedReferences.set("App", {
                description: "Please follow code same way of this",
                componentDetails: {
                    name: "App",
                    domPath: "body > div#root",
                    textContent: "Main application component",
                    tagName: "div"
                }
            });

            if (!referenceComponents["App"]) {
                referenceComponents["App"] = {
                    name: "App",
                    description: "Please follow code same way of this",
                    componentDetails: {
                        name: "App",
                        domPath: "body > div#root",
                        textContent: "Main application component",
                        tagName: "div"
                    }
                };
                saveReferenceComponents();
            }
        }

        const detailsHTML = !isNewComponent ? `
            <div style="background: rgba(0,224,255,0.1); padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #00e0ff;">
                <div style="font-size: 12px; color: #00e0ff; font-weight: bold; margin-bottom: 8px;">📋 COMPONENT DETAILS</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
                    <div><span style="color: #888;">Name:</span> ${componentName}</div>
                    <div><span style="color: #888;">Tag:</span> ${componentDetails.tagName || 'N/A'}</div>
                </div>
            </div>
            <div style="font-size: 12px; color: #aaa; margin-bottom: 12px; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; word-break: break-all;">
                ${domPath}
            </div>
            ${elementText ? `<div style="font-size: 13px; color: #ccc; margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 6px; border-left: 3px solid #666;">
                📝 "${elementText}"
            </div>` : ''}
        ` : '';

        box.innerHTML = `
    <div id="popupHeader" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; cursor: move;">
        <div style="display: flex; align-items: center; gap: 10px;">
            <b style="color: #00e0ff; font-size: 16px;">${isNewComponent ? '🆕 Create New Component' : '✏️ Modify Component'}</b>
            ${!isNewComponent ? `<span style="font-size: 14px; color: #ccc;">${componentName}</span>` : ''}
            ${!isNewComponent && isReference ? `<span style="font-size: 11px; color: #000; background: #ffaa00; padding: 2px 8px; border-radius: 10px; font-weight: bold;">⭐ Reference</span>` : ''}
        </div>
        <button id="closeBox" style="
            background: #ff4444;
            border: none;
            color: #fff;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
        " title="Close">×</button>
    </div>

    ${detailsHTML}

    <div style="margin-bottom: 15px;">
        <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">Requirement Type *</label>
        <div style="display: flex; gap: 10px;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="requirementType" value="existing" ${!isNewComponent ? 'checked' : ''} style="margin: 0;">
                <span style="font-size: 13px;">✏️ Modify Existing Component</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="requirementType" value="new" ${isNewComponent ? 'checked' : ''} style="margin: 0;">
                <span style="font-size: 13px;">🆕 Create New Component</span>
            </label>
        </div>
    </div>

    <div id="newComponentFields" style="display: ${isNewComponent ? 'block' : 'none'}; margin-bottom: 15px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
                <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">Component Name *</label>
                <input type="text" id="newComponentName" value="${isNewComponent ? 'App' : ''}" placeholder="e.g., ProductList" style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #555;
                    border-radius: 4px;
                    outline: none;
                    font-size: 13px;
                    background: #1a1a2a;
                    color: #fff;
                    font-family: inherit;
                ">
            </div>
            <div>
                <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">Component Type *</label>
                <select id="newComponentType" style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #555;
                    border-radius: 4px;
                    outline: none;
                    font-size: 13px;
                    background: #1a1a2a;
                    color: #fff;
                    font-family: inherit;
                ">
                    <option value="component">Component</option>
                    <option value="page">Page</option>
                    <option value="layout">Layout</option>
                    <option value="context">Context</option>
                    <option value="hook">Hook</option>
                    <option value="util">Utility</option>
                </select>
            </div>
        </div>
    </div>

    <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">Feature Request (Global)</label>
        <input type="text" id="featureRequest" placeholder="Overall feature description..." value="${globalFeatureRequest}" style="
            width: 100%;
            padding: 10px;
            border: 1px solid #555;
            border-radius: 6px;
            outline: none;
            font-size: 14px;
            background: #1a1a2a;
            color: #fff;
            font-family: inherit;
        ">
    </div>

    <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">Feature Details (Global)</label>
        <textarea id="featureDetails" placeholder='Describe the feature details, requirements, acceptance criteria...' style="
            width: 100%;
            padding: 10px;
            border: 1px solid #555;
            border-radius: 6px;
            outline: none;
            resize: vertical;
            height: 70px;
            font-size: 14px;
            background: #1a1a2a;
            color: #fff;
            font-family: inherit;
        ">${globalFeatureDetails}</textarea>
    </div>

    <div style="margin-bottom: 15px;">
        <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 8px;">Feature Type *</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <input type="checkbox" id="is_frontend" class="feature-type-checkbox" style="margin: 0;">
                <span style="font-size: 13px;">🌐 Frontend</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <input type="checkbox" id="is_backend" class="feature-type-checkbox" style="margin: 0;">
                <span style="font-size: 13px;">⚙️ Backend</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <input type="checkbox" id="is_full_stack" class="feature-type-checkbox" style="margin: 0;">
                <span style="font-size: 13px;">🔗 Full Stack</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <input type="checkbox" id="is_error" class="feature-type-checkbox" style="margin: 0;">
                <span style="font-size: 13px;">❌ Error</span>
            </label>
            <!-- NEW: Integrate checkbox -->
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <input type="checkbox" id="is_integrate" class="feature-type-checkbox integrate-checkbox" style="margin: 0;">
                <span style="font-size: 13px;">🔌 Integrate</span>
            </label>
        </div>
    </div>

    <!-- NEW: Integration Section -->
    <div id="integrationSection" style="display: none; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 13px; color: #00e0ff;">📡 API Endpoints:</div>
            <button id="addMoreEndpoints" style="
                background: #00e0ff;
                color: #000;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 4px;
            ">🌐 Add Endpoints</button>
        </div>
        <div id="selectedEndpoints" style="min-height: 60px; border: 1px dashed #00e0ff; border-radius: 8px; padding: 12px; background: rgba(0,224,255,0.05);">
            <div style="color: #666; text-align: center; font-size: 12px; padding: 15px;">
                No API endpoints selected yet
            </div>
        </div>
        <div id="endpointDescriptions" style="margin-top: 10px;"></div>
    </div>

    <div id="errorDescriptionSection" style="display: none; margin-bottom: 15px;">
        <label style="display: block; font-size: 13px; color: #ff4444; margin-bottom: 6px;">Error Description *</label>
        <textarea
            id="errorDescription"
            placeholder="Describe the error in detail..."
            style="
                width: 100%;
                padding: 12px;
                border: 1px solid #ff4444;
                border-radius: 6px;
                outline: none;
                resize: vertical;
                height: 80px;
                font-size: 14px;
                background: rgba(255,68,68,0.1);
                color: #fff;
                font-family: inherit;
            "
        ></textarea>
    </div>

    <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 13px; color: #aaa;">Reference Components:</div>
            <button id="addMoreReferences" style="
                background: #ffaa00;
                color: #000;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 4px;
            ">🌐 Add More References</button>
        </div>
        <div id="selectedReferences" style="min-height: 60px; border: 1px dashed #555; border-radius: 8px; padding: 12px; background: rgba(255,255,255,0.05);">
            <div style="color: #666; text-align: center; font-size: 12px; padding: 15px;">
                No reference components selected yet
            </div>
        </div>
        <div id="referenceDescriptions" style="margin-top: 10px;"></div>
    </div>

    <div style="margin-bottom: 15px;">
        <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">Requirement Description *</label>
        <textarea
            id="componentRequirement"
            placeholder="${isNewComponent ? 'Describe what this new component should do...' : 'Describe what should be changed or added to this component...'}"
            style="
                width: 100%;
                padding: 12px;
                border: 1px solid #555;
                border-radius: 6px;
                outline: none;
                resize: vertical;
                height: 100px;
                font-size: 14px;
                background: #1a1a2a;
                color: #fff;
                font-family: inherit;
            "
        >${isNewComponent ? 'please follow same way of code' : ''}</textarea>
    </div>

    <div style="margin-bottom: 15px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px; background: rgba(0,224,255,0.1); border-radius: 6px; border: 1px solid #00e0ff;">
            <input type="checkbox" id="isActive" checked style="margin: 0;">
            <span style="font-size: 13px; color: #00e0ff; font-weight: bold;">✅ Active Requirement</span>
        </label>
        <div style="font-size: 11px; color: #888; margin-top: 4px; margin-left: 24px;">
            Only active requirements will be sent to the server
        </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
        <div>
            ${!isNewComponent ? `<button id="referenceToggle" style="
                padding: 8px 12px;
                background: ${isReference ? '#ffaa00' : '#555'};
                border: none;
                border-radius: 4px;
                cursor: pointer;
                color: ${isReference ? '#000' : '#fff'};
                font-size: 12px;
                font-weight: bold;
            ">
                ${isReference ? '⭐ Reference' : '⭐ Set as Reference'}
            </button>` : ''}
        </div>
        <div>
            <button id="cancelBtn" style="
                padding: 10px 20px;
                background: #666;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                color: #fff;
                margin-right: 10px;
                font-size: 14px;
            ">Cancel</button>
            <button id="saveBtn" style="
                padding: 10px 20px;
                background: #00ff88;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                color: #000;
                font-weight: bold;
                font-size: 14px;
            ">💾 Save Requirement</button>
        </div>
    </div>
`;

        document.body.appendChild(box);
        activeInputBox = box;

        makeDraggable(box, box.querySelector("#popupHeader"));

        // Feature type checkbox logic
        const featureTypeCheckboxes = box.querySelectorAll('.feature-type-checkbox');
        const integrateCheckbox = box.querySelector('#is_integrate');
        const integrationSection = box.querySelector('#integrationSection');
        const errorDescriptionSection = box.querySelector('#errorDescriptionSection');
        const errorDescriptionTextarea = box.querySelector('#errorDescription');

        // Initialize integration section visibility
        if (integrateCheckbox && integrationSection) {
            integrateCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    integrationSection.style.display = 'block';
                } else {
                    integrationSection.style.display = 'none';
                    selectedEndpoints.clear();
                    updateSelectedEndpointsDisplay(box.querySelector("#selectedEndpoints"));
                }
            });
        }

        function getSelectedFeatureTypes() {
            const selectedTypes = [];
            featureTypeCheckboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    selectedTypes.push(checkbox.id);
                }
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
                console.log('Feature types updated:', getSelectedFeatureTypes());
            });
        });

        // NEW: Add event listener for endpoint selection button
        const addMoreEndpointsBtn = box.querySelector("#addMoreEndpoints");
        if (addMoreEndpointsBtn) {
            addMoreEndpointsBtn.addEventListener("click", () => {
                // Check if we have endpoints cached
                if (swaggerEndpoints.length === 0) {
                    showNotification("📡 Fetching API endpoints...", "info");
                    fetchSwaggerEndpoints().then(endpoints => {
                        if (endpoints.length > 0) {
                            showSimpleEndpointSelectionModal(endpoints);
                        } else {
                            showNotification("❌ No API endpoints found", "error");
                        }
                    }).catch(error => {
                        showNotification(`❌ Failed to fetch endpoints: ${error.message}`, "error");
                    });
                } else {
                    showSimpleEndpointSelectionModal(swaggerEndpoints);
                }
            });
        }

        // Update selected endpoints display
        updateSelectedEndpointsDisplay(box.querySelector("#selectedEndpoints"));

        const addMoreRefsBtn = box.querySelector("#addMoreReferences");
        if (addMoreRefsBtn) {
            addMoreRefsBtn.addEventListener("click", () => {
                // Check if is_backend checkbox is checked
                const isBackendChecked = box.querySelector("#is_backend")?.checked || false;

                // Check if we're on a Swagger UI page
                const isSwaggerPage = document.querySelector('.opblock') !== null;

                if (isSwaggerPage && isBackendChecked) {
                    // Open Swagger endpoint capture mode
                    addSwaggerEndpointReferences();
                } else if (isSwaggerPage) {
                    // Show notification about needing backend checkbox
                    showNotification('Please check "⚙️ Backend" checkbox to capture Swagger endpoints', 'warning');
                } else {
                    // Use the regular navigation mode
                    if (!isNavigatingForReferences) {
                        isNavigatingForReferences = true;
                        navigationReferences = new Map(selectedReferences);

                        addMoreRefsBtn.textContent = "✅ Finish Adding References";
                        addMoreRefsBtn.style.background = "#00ff88";

                        showNotification("🌐 Navigation mode: Click on any component to add it as reference. You can navigate to other pages. Click 'Finish' when done.", "info");

                        document.addEventListener("click", handleNavigationClick, true);
                    } else {
                        isNavigatingForReferences = false;
                        selectedReferences = new Map(navigationReferences);

                        addMoreRefsBtn.textContent = "🌐 Add More References";
                        addMoreRefsBtn.style.background = "#00e0ff";

                        showNotification(`✅ Finished adding references. ${selectedReferences.size} references selected.`, "success");

                        document.removeEventListener("click", handleNavigationClick, true);
                    }
                }
                updateSelectedReferencesDisplay(box,
                    isNavigatingForReferences ? navigationReferences : selectedReferences,
                    isNavigatingForReferences);
            });
        }

        const requirementTypeRadios = box.querySelectorAll('input[name="requirementType"]');
        if (requirementTypeRadios.length > 0) {
            requirementTypeRadios.forEach(radio => {
                radio.addEventListener("change", (e) => {
                    const isNew = e.target.value === "new";
                    const newComponentFields = box.querySelector("#newComponentFields");
                    if (newComponentFields) {
                        newComponentFields.style.display = isNew ? "block" : "none";
                    }

                    const textarea = box.querySelector("#componentRequirement");
                    if (textarea) {
                        textarea.placeholder = isNew ?
                            "Describe what this new component should do..." :
                            "Describe what should be changed or added to this component...";
                    }
                });
            });
        }

        const saveBtn = box.querySelector("#saveBtn");
        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
                const requirementText = box.querySelector("#componentRequirement")?.value.trim() || "";
                const featureRequest = box.querySelector("#featureRequest")?.value.trim() || "";
                const featureDetails = box.querySelector("#featureDetails")?.value.trim() || "";
                const requirementType = box.querySelector('input[name="requirementType"]:checked')?.value || "existing";
                const isNew = requirementType === "new";
                const isActive = box.querySelector("#isActive")?.checked || true;
                const integrateChecked = integrateCheckbox?.checked || false;
                // NEW: Get images for this requirement
                const requirementIndex = selections.length;
                const imagesForRequirement = uploadedImages[requirementIndex] || [];

                const featureTypes = getSelectedFeatureTypes();
                const errorDescription = box.querySelector("#errorDescription")?.value.trim() || "";

                if (featureTypes.includes('is_error') && !errorDescription) {
                    showNotification("Please provide error description when error checkbox is selected", "warning");
                    return;
                }

                let finalComponentName = componentName;
                let componentType = "component";

                if (isNew) {
                    finalComponentName = box.querySelector("#newComponentName")?.value.trim() || "";
                    componentType = box.querySelector("#newComponentType")?.value || "component";

                    if (!finalComponentName) {
                        showNotification("Please enter a component name for new component", "warning");
                        return;
                    }
                }

                if (!requirementText && !featureTypes.includes('is_error')) {
                    showNotification("Please describe the requirement or select error type", "warning");
                    return;
                }

                globalFeatureRequest = featureRequest;
                globalFeatureDetails = featureDetails;
                localStorage.setItem("dev_global_feature_request", globalFeatureRequest);
                localStorage.setItem("dev_global_feature_details", globalFeatureDetails);

                const finalReferences = isNavigatingForReferences ? navigationReferences : selectedReferences;
                const referenceComponentsArray = [];
                const referenceComponentsObject = {};

                finalReferences.forEach((refData, refName) => {
                    const descTextarea = box.querySelector(`.reference-description[data-ref="${refName}"]`);
                    const description = descTextarea ? descTextarea.value.trim() : refData.description;

                    if (refData.isEndpoint) {
                        // For endpoint references, use the full endpoint data
                        referenceComponentsArray.push(refData.endpointData);
                        referenceComponentsObject[refName] = refData.endpointData;
                    } else {
                        referenceComponentsArray.push({
                            name: refName,
                            description: description || `Reference component: ${refName}`,
                            type: 'reference',
                            componentDetails: refData.componentDetails
                        });

                        referenceComponentsObject[refName] = {
                            name: refName,
                            description: description || `Reference component: ${refName}`,
                            componentDetails: refData.componentDetails
                        };
                    }
                });

                // NEW: Add API endpoints as references if integration is checked
                const apiEndpointsArray = [];
// In the save button click handler, update the API endpoints array creation:


                if (integrateChecked) {
                    selectedEndpoints.forEach((endpointData, endpointKey) => {
                        const descTextarea = box.querySelector(`.endpoint-description[data-endpoint="${endpointKey}"]`);
                        const description = descTextarea ? descTextarea.value.trim() : endpointData.description;

                        // Create comprehensive endpoint object
                        const endpointObj = {
                            name: endpointData.name || endpointData.summary || endpointData.description || endpointData.path,
                            method: endpointData.method,
                            endpoint: endpointData.path || endpointData.endpoint,
                            description: description || `API endpoint: ${endpointData.summary || endpointData.path}`,
                            type: 'api_endpoint'
                        };

                        // Add minimal controller/action info if available
                        if (endpointData.controller || endpointData.action) {
                            endpointObj.controller = endpointData.controller;
                            endpointObj.action = endpointData.action;
                        }

                        // Add model info if available
                        if (endpointData.model) {
                            endpointObj.model = endpointData.model;
                        }

                        // Add ONLY essential schema info for LLM (minimal schema)
                        if (endpointData.schema) {
                            endpointObj.schema = extractMinimalSchema(endpointData.schema);
                        } else if (endpointData.swagger_endpoint?.endpoint_data?.schema) {
                            // Fallback to swagger endpoint schema
                            endpointObj.schema = extractMinimalSchema(endpointData.swagger_endpoint.endpoint_data.schema);
                        }

                        apiEndpointsArray.push(endpointObj);
                    });
                }

                const requirementData = {
                    requirement: requirementText,
                    components: referenceComponentsArray,
                    reference_components: referenceComponentsObject,
                    isNewComponent: isNew,
                    componentType: isNew ? componentType : undefined,
                    componentDetails: !isNew ? componentDetails : null,
                    feature_types: featureTypes,
                    integrate: integrateChecked,

                    api_endpoints: integrateChecked ? apiEndpointsArray : [],
                    error_description: featureTypes.includes('is_error') ? errorDescription : undefined,
                    images: imagesForRequirement.map(img => ({
            id: img.id,
            url: img.url,
            filename: img.filename
        })),
        has_images: imagesForRequirement.length > 0,
                    active: isActive
                };

                if (!isNew) {
                    requirementData.component = finalComponentName;
                    requirementData.text = elementText;
                } else {
                    requirementData.component = finalComponentName;
                }

                selections.push(requirementData);
                saveSelections();
                updateCount();

                if (isNavigatingForReferences) {
                    document.removeEventListener("click", handleNavigationClick, true);
                    isNavigatingForReferences = false;
                }

                box.remove();
                activeInputBox = null;

                showNotification(`✅ ${isNew ? 'New component' : 'Requirement'} saved for ${finalComponentName} with ${referenceComponentsArray.length} reference components${integrateChecked ? ` and ${apiEndpointsArray.length} API endpoints` : ''}`, "success");
            });
        }

        if (!isNewComponent) {
            const referenceToggle = box.querySelector("#referenceToggle");
            if (referenceToggle) {
                referenceToggle.addEventListener("click", () => {
                    if (referenceComponents[componentName]) {
                        delete referenceComponents[componentName];
                        showNotification(`❌ ${componentName} removed as reference`, "info");
                    } else {
                        referenceComponents[componentName] = {
                            name: componentName,
                            text: elementText,
                            description: `Reference component: ${componentName}`,
                            componentDetails: componentDetails
                        };
                        showNotification(`⭐ ${componentName} set as reference component`, "success");
                    }
                    saveReferenceComponents();
                    updateCount();

                    box.remove();
                    showUnifiedPopup({
                        x: x,
                        y: y,
                        target: target,
                        componentName: componentName,
                        domPath: domPath,
                        isNewComponent: isNewComponent
                    });
                });
            }
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

        // Wait for the popup to be rendered, then add image upload
setTimeout(() => {
    const requirementTextarea = box.querySelector("#componentRequirement");
    if (requirementTextarea && requirementTextarea.parentNode) {
        const imageSection = document.createElement("div");
        imageSection.style.cssText = `
            margin-top: 15px;
            margin-bottom: 15px;
            padding: 10px;
            background: rgba(0,224,255,0.05);
            border: 1px dashed #00e0ff;
            border-radius: 6px;
        `;
        imageSection.innerHTML = `
            <div style="font-size: 12px; color: #00e0ff; margin-bottom: 8px; font-weight: bold;">
                🖼️ UI Mockups / Design References
            </div>
            <div style="font-size: 11px; color: #aaa; margin-bottom: 8px;">
                Upload images to help the AI understand the desired UI design
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <label style="
                    padding: 6px 12px;
                    background: #00e0ff;
                    color: #000;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: bold;
                ">
                    📷 Add Image
                    <input type="file" id="imageUpload" accept="image/*" multiple style="display: none;">
                </label>
                <span style="font-size: 11px; color: #888;">
                    PNG, JPG, GIF, WebP, SVG supported
                </span>
            </div>
            <div id="imagePreviewContainer" style="
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 10px;
            "></div>
        `;

        // Insert after the requirement textarea
        requirementTextarea.parentNode.insertBefore(imageSection, requirementTextarea.nextSibling);

        // Setup file input handler
        const fileInput = imageSection.querySelector("#imageUpload");
        const previewContainer = imageSection.querySelector("#imagePreviewContainer");

        if (fileInput) {
            fileInput.addEventListener("change", async (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;

                for (const file of files) {
                    // Get the requirement index (current selections length)
                    const reqIndex = selections.length;
                    await uploadImageForRequirement(reqIndex, file, previewContainer);
                }

                fileInput.value = '';
            });
        }
    }
}, 100);

        updateSelectedReferencesDisplay(box, selectedReferences, false);
    }

    // ===== Minimal Schema Extraction for LLM =====


    function extractMinimalSchema(fullSchema) {
        if (!fullSchema) return null;

        const minimalSchema = {
            parameters: [],
            requestBody: null,
            responses: {}
        };

        try {
            // Extract only essential parameters (required or UI-relevant)
            if (fullSchema.parameters && Array.isArray(fullSchema.parameters)) {
                fullSchema.parameters.forEach(param => {
                    // Only include parameters that matter for UI
                    if (param.required ||
                        param.name.toLowerCase().includes('id') ||
                        param.name.toLowerCase().includes('page') ||
                        param.name.toLowerCase().includes('limit') ||
                        param.name.toLowerCase().includes('search') ||
                        param.name.toLowerCase().includes('filter') ||
                        param.name.toLowerCase().includes('sort')) {

                        // Simplify type for LLM
                        const paramType = param.type ? param.type.toLowerCase() : 'string';
                        const simpleType =
                            paramType.includes('integer') || paramType.includes('number') ? 'number' :
                                paramType.includes('boolean') ? 'boolean' :
                                    paramType.includes('array') ? 'array' : 'string';

                        minimalSchema.parameters.push({
                            name: param.name || '',
                            type: simpleType,
                            required: param.required || false,
                            description: param.description ? param.description.substring(0, 80) : ''
                        });
                    }
                });
            }

            // Extract minimal request body schema
            if (fullSchema.requestBody) {
                // Handle different requestBody formats
                let requestSchema = fullSchema.requestBody;

                // If it's in Swagger format with content
                if (requestSchema.content && requestSchema.content['application/json']?.schema) {
                    requestSchema = requestSchema.content['application/json'].schema;
                }

                if (requestSchema.type === 'object' && requestSchema.properties) {
                    const minimalProperties = {};
                    const requiredFields = requestSchema.required || [];

                    // Only include top-level properties (skip nested objects for LLM)
                    Object.entries(requestSchema.properties).forEach(([propName, propSchema]) => {
                        if (propSchema && typeof propSchema === 'object') {
                            const propType = propSchema.type ? propSchema.type.toLowerCase() : 'string';
                            const simpleType =
                                propType.includes('integer') || propType.includes('number') ? 'number' :
                                    propType.includes('boolean') ? 'boolean' :
                                        propType.includes('array') ? 'array' : 'string';

                            minimalProperties[propName] = {
                                type: simpleType,
                                description: propSchema.description ? propSchema.description.substring(0, 80) : ''
                            };
                        }
                    });

                    if (Object.keys(minimalProperties).length > 0) {
                        minimalSchema.requestBody = {
                            type: 'object',
                            properties: minimalProperties,
                            required: requiredFields
                        };
                    }
                }
            }

            // Extract only successful responses (200, 201, 204)
            if (fullSchema.responses) {
                ['200', '201', '204'].forEach(code => {
                    if (fullSchema.responses[code]) {
                        const response = fullSchema.responses[code];
                        let responseSchema = null;

                        // Extract response schema
                        if (response.schema) {
                            responseSchema = extractResponseSchema(response.schema);
                        } else if (response.content && response.content['application/json']?.schema) {
                            responseSchema = extractResponseSchema(response.content['application/json'].schema);
                        }

                        if (responseSchema) {
                            minimalSchema.responses[code] = {
                                description: response.description || 'Success',
                                schema: responseSchema
                            };
                        }
                    }
                });
            }

            // Return null if no meaningful schema data
            if (minimalSchema.parameters.length === 0 &&
                !minimalSchema.requestBody &&
                Object.keys(minimalSchema.responses).length === 0) {
                return null;
            }

            return minimalSchema;

        } catch (error) {
            console.warn("Error extracting minimal schema:", error);
            return null;
        }
    }

// Helper to extract response schema
    function extractResponseSchema(schema) {
        if (!schema) return null;

        try {
            // Handle array responses
            if (schema.type === 'array' && schema.items) {
                const itemSchema = extractResponseSchema(schema.items);
                return {
                    type: 'array',
                    items: itemSchema
                };
            }

            // Handle object responses
            if (schema.type === 'object' && schema.properties) {
                const minimalProperties = {};

                Object.entries(schema.properties).forEach(([propName, propSchema]) => {
                    if (propSchema && typeof propSchema === 'object') {
                        const propType = propSchema.type ? propSchema.type.toLowerCase() : 'string';
                        const simpleType =
                            propType.includes('integer') || propType.includes('number') ? 'number' :
                                propType.includes('boolean') ? 'boolean' :
                                    propType.includes('array') ? 'array' : 'string';

                        minimalProperties[propName] = {
                            type: simpleType,
                            description: propSchema.description ? propSchema.description.substring(0, 80) : ''
                        };
                    }
                });

                if (Object.keys(minimalProperties).length > 0) {
                    return {
                        type: 'object',
                        properties: minimalProperties
                    };
                }
            }

            // Handle primitive types
            if (['string', 'number', 'boolean'].includes(schema.type)) {
                return { type: schema.type };
            }

            return null;

        } catch (error) {
            console.warn("Error extracting response schema:", error);
            return null;
        }
    }

    // Helper function to extract schema from Swagger UI endpoint
    function extractEndpointSchema(opBlock) {
        if (!opBlock) return null;

        const schema = {
            parameters: [],
            requestBody: null,
            responses: {}
        };

        try {
            // ===== 1. Extract Essential Parameters =====
            const paramsTable = opBlock.querySelector('.parameters-container table');
            if (paramsTable) {
                paramsTable.querySelectorAll('tr.parameter').forEach(row => {
                    const nameCell = row.querySelector('.parameter__name');
                    const typeCell = row.querySelector('.parameter__type');
                    const descCell = row.querySelector('.parameter__description');

                    if (nameCell) {
                        const paramName = nameCell.textContent.trim();
                        if (!paramName) return;

                        const paramTypeRaw = typeCell ? typeCell.textContent.trim().toLowerCase() : 'string';
                        const isRequired = row.querySelector('.parameter__required') ? true : false;

                        // Only include UI-relevant parameters
                        const isUIParam =
                            isRequired ||
                            paramName.toLowerCase().includes('id') ||
                            paramName.toLowerCase().includes('page') ||
                            paramName.toLowerCase().includes('limit') ||
                            paramName.toLowerCase().includes('size') ||
                            paramName.toLowerCase().includes('search') ||
                            paramName.toLowerCase().includes('filter') ||
                            paramName.toLowerCase().includes('sort') ||
                            paramName.toLowerCase().includes('order');

                        if (isUIParam) {
                            // Simplify type for LLM
                            const simpleType =
                                paramTypeRaw.includes('integer') || paramTypeRaw.includes('number') ? 'number' :
                                    paramTypeRaw.includes('boolean') ? 'boolean' :
                                        paramTypeRaw.includes('array') ? 'array' : 'string';

                            schema.parameters.push({
                                name: paramName,
                                type: simpleType,
                                required: isRequired,
                                description: descCell ? descCell.textContent.trim().substring(0, 80) : ''
                            });
                        }
                    }
                });
            }

            // ===== 2. Extract Minimal Request Body Schema =====
            const requestBody = opBlock.querySelector('[data-section="requestBody"]');
            if (requestBody) {
                const modelBox = requestBody.querySelector('.model-box');
                if (modelBox) {
                    const properties = {};
                    const requiredFields = [];

                    // Extract required fields
                    const requiredSection = modelBox.querySelector('.required');
                    if (requiredSection) {
                        requiredSection.querySelectorAll('span').forEach(span => {
                            const fieldName = span.textContent.trim().replace(/'/g, '').replace(/"/g, '');
                            if (fieldName) requiredFields.push(fieldName);
                        });
                    }

                    // Extract properties (only top-level for LLM)
                    modelBox.querySelectorAll('.model').forEach(model => {
                        const nameEl = model.querySelector('.model-title');
                        if (nameEl) {
                            const propName = nameEl.textContent.trim()
                                .replace('{', '')
                                .replace('}', '')
                                .replace('@', '');
                            if (!propName || propName.includes('.')) return; // Skip nested properties

                            const typeEl = model.querySelector('.prop-type');
                            const descEl = model.querySelector('.prop-description');

                            const propTypeRaw = typeEl ? typeEl.textContent.trim().toLowerCase() : 'string';

                            // Simplify type for LLM
                            const simpleType =
                                propTypeRaw.includes('integer') || propTypeRaw.includes('number') ? 'number' :
                                    propTypeRaw.includes('boolean') ? 'boolean' :
                                        propTypeRaw.includes('array') || propTypeRaw.includes('[]') ? 'array' : 'string';

                            properties[propName] = {
                                type: simpleType,
                                description: descEl ? descEl.textContent.trim().substring(0, 80) : ''
                            };
                        }
                    });

                    if (Object.keys(properties).length > 0) {
                        schema.requestBody = {
                            type: 'object',
                            properties: properties,
                            required: requiredFields
                        };
                    }
                }
            }

            // ===== 3. Extract Success Response Schemas =====
            const responses = opBlock.querySelector('[data-section="responses"]');
            if (responses) {
                // Focus on successful responses only
                const successCodes = ['200', '201', '204'];

                successCodes.forEach(code => {
                    const responseEl = responses.querySelector(`[data-code="${code}"]`);
                    if (responseEl) {
                        const description = responseEl.querySelector('.response-col_description')?.textContent.trim() || 'Success';
                        const responseModel = responseEl.querySelector('.model-box');

                        let responseSchema = null;

                        if (responseModel) {
                            const properties = {};

                            // Extract properties from response model
                            responseModel.querySelectorAll('.model').forEach(model => {
                                const nameEl = model.querySelector('.model-title');
                                if (nameEl) {
                                    const propName = nameEl.textContent.trim()
                                        .replace('{', '')
                                        .replace('}', '')
                                        .replace('@', '');
                                    if (!propName || propName.includes('.')) return;

                                    const typeEl = model.querySelector('.prop-type');
                                    const propTypeRaw = typeEl ? typeEl.textContent.trim().toLowerCase() : 'string';

                                    const simpleType =
                                        propTypeRaw.includes('integer') || propTypeRaw.includes('number') ? 'number' :
                                            propTypeRaw.includes('boolean') ? 'boolean' :
                                                propTypeRaw.includes('array') || propTypeRaw.includes('[]') ? 'array' : 'string';

                                    properties[propName] = { type: simpleType };
                                }
                            });

                            if (Object.keys(properties).length > 0) {
                                responseSchema = {
                                    type: 'object',
                                    properties: properties
                                };
                            }
                        }

                        schema.responses[code] = {
                            description: description,
                            schema: responseSchema
                        };
                    }
                });

                // Also check for generic "default" or "2XX" responses
                if (Object.keys(schema.responses).length === 0) {
                    const defaultResponse = responses.querySelector('[data-code="default"], [data-code^="2"]');
                    if (defaultResponse) {
                        const description = defaultResponse.querySelector('.response-col_description')?.textContent.trim() || 'Response';
                        schema.responses['200'] = {
                            description: description,
                            schema: { type: 'object', properties: {} }
                        };
                    }
                }
            }

            // ===== 4. Clean Up Empty Schema =====
            if (schema.parameters.length === 0) delete schema.parameters;
            if (!schema.requestBody) delete schema.requestBody;
            if (Object.keys(schema.responses).length === 0) delete schema.responses;

            // Return null if no meaningful schema data
            if (!schema.parameters && !schema.requestBody && !schema.responses) {
                return null;
            }

            return schema;

        } catch (error) {
            console.warn("Error extracting endpoint schema:", error);
            return null;
        }
    }

    function cleanSchemaForLLM(schema) {
        if (!schema) return null;

        const cleaned = {};

        try {
            // Clean parameters - only include UI-relevant ones
            if (schema.parameters && Array.isArray(schema.parameters)) {
                cleaned.parameters = schema.parameters
                    .filter(p => p && p.name && p.type)
                    .filter(p => {
                        const name = p.name.toLowerCase();
                        // Only keep parameters that matter for UI
                        return p.required ||
                            name.includes('id') ||
                            name.includes('page') ||
                            name.includes('limit') ||
                            name.includes('size') ||
                            name.includes('search') ||
                            name.includes('filter') ||
                            name.includes('sort') ||
                            name.includes('order') ||
                            name.includes('q') || // query
                            name.includes('status');
                    })
                    .map(p => ({
                        name: p.name,
                        type: simplifyTypeForLLM(p.type),
                        required: !!p.required,
                        description: p.description ? p.description.substring(0, 80) : ''
                    }));

                if (cleaned.parameters.length === 0) delete cleaned.parameters;
            }

            // Clean request body - only top-level properties
            if (schema.requestBody && schema.requestBody.properties) {
                const validProps = {};
                Object.entries(schema.requestBody.properties).forEach(([key, value]) => {
                    if (value && value.type) {
                        const simpleType = simplifyTypeForLLM(value.type);
                        if (['string', 'number', 'boolean', 'array'].includes(simpleType)) {
                            validProps[key] = {
                                type: simpleType,
                                description: value.description ? value.description.substring(0, 80) : ''
                            };
                        }
                    }
                });

                if (Object.keys(validProps).length > 0) {
                    cleaned.requestBody = {
                        type: 'object',
                        properties: validProps,
                        required: schema.requestBody.required || []
                    };
                }
            }

            // Clean responses - only successful ones
            if (schema.responses) {
                cleaned.responses = {};

                // Focus on success responses
                ['200', '201', '204'].forEach(code => {
                    if (schema.responses[code]) {
                        const response = schema.responses[code];
                        if (response && response.schema) {
                            const cleanedSchema = cleanResponseSchema(response.schema);
                            if (cleanedSchema) {
                                cleaned.responses[code] = {
                                    description: response.description || 'Success',
                                    schema: cleanedSchema
                                };
                            }
                        }
                    }
                });

                if (Object.keys(cleaned.responses).length === 0) delete cleaned.responses;
            }

            return Object.keys(cleaned).length > 0 ? cleaned : null;

        } catch (error) {
            console.warn("Error cleaning schema for LLM:", error);
            return null;
        }
    }

    function simplifyTypeForLLM(type) {
        if (!type) return 'string';

        const typeStr = String(type).toLowerCase();

        if (typeStr.includes('integer') || typeStr.includes('number')) return 'number';
        if (typeStr.includes('boolean')) return 'boolean';
        if (typeStr.includes('array') || typeStr.includes('[]')) return 'array';
        if (typeStr.includes('object')) return 'object';

        return 'string';
    }

    function cleanResponseSchema(schema) {
        if (!schema) return null;

        try {
            // Handle array responses
            if (schema.type === 'array' && schema.items) {
                const cleanedItems = cleanResponseSchema(schema.items);
                return cleanedItems ? { type: 'array', items: cleanedItems } : null;
            }

            // Handle object responses
            if (schema.type === 'object' && schema.properties) {
                const validProps = {};
                Object.entries(schema.properties).forEach(([key, value]) => {
                    if (value && value.type) {
                        const simpleType = simplifyTypeForLLM(value.type);
                        // For response objects, allow objects for nested data
                        if (['string', 'number', 'boolean', 'array', 'object'].includes(simpleType)) {
                            // Only include properties that matter for UI display
                            if (key.toLowerCase().includes('id') ||
                                key.toLowerCase().includes('name') ||
                                key.toLowerCase().includes('title') ||
                                key.toLowerCase().includes('email') ||
                                key.toLowerCase().includes('status') ||
                                key.toLowerCase().includes('created') ||
                                key.toLowerCase().includes('updated') ||
                                key.toLowerCase().includes('data') ||
                                key.toLowerCase().includes('total') ||
                                key.toLowerCase().includes('count')) {

                                validProps[key] = { type: simpleType };
                            }
                        }
                    }
                });

                if (Object.keys(validProps).length > 0) {
                    return { type: 'object', properties: validProps };
                }
            }

            // Handle primitive types
            if (['string', 'number', 'boolean'].includes(schema.type)) {
                return { type: schema.type };
            }

            return null;

        } catch (error) {
            console.warn("Error cleaning response schema:", error);
            return null;
        }
    }

    function cleanResponseSchema(schema) {
        if (!schema) return null;

        // Handle array responses
        if (schema.type === 'array' && schema.items) {
            const cleanedItems = cleanResponseSchema(schema.items);
            return cleanedItems ? { type: 'array', items: cleanedItems } : null;
        }

        // Handle object responses
        if (schema.type === 'object' && schema.properties) {
            const validProps = {};
            Object.entries(schema.properties).forEach(([key, value]) => {
                if (value && value.type && ['string', 'number', 'boolean', 'array', 'object'].includes(value.type)) {
                    validProps[key] = { type: value.type };
                }
            });

            if (Object.keys(validProps).length > 0) {
                return { type: 'object', properties: validProps };
            }
        }

        // Handle primitive types
        if (['string', 'number', 'boolean'].includes(schema.type)) {
            return { type: schema.type };
        }

        return null;
    }

    function extractModelSchema(modelBox) {
        if (!modelBox) return null;

        const schema = {
            type: 'object',
            properties: {}
        };

        try {
            modelBox.querySelectorAll('.model').forEach(model => {
                const nameEl = model.querySelector('.model-title');
                if (nameEl) {
                    const propName = nameEl.textContent.trim().replace('{', '').replace('}', '');
                    const typeEl = model.querySelector('.prop-type');

                    const propType = typeEl ? typeEl.textContent.trim().toLowerCase() : 'string';

                    // Simplified type mapping for LLM
                    const simpleType =
                        propType.includes('integer') || propType.includes('number') ? 'number' :
                            propType.includes('boolean') ? 'boolean' :
                                propType.includes('array') ? 'array' : 'string';

                    schema.properties[propName] = { type: simpleType };
                }
            });

            // Return null if no properties found
            if (Object.keys(schema.properties).length === 0) {
                return null;
            }

            return schema;
        } catch (error) {
            console.warn("Error extracting model schema:", error);
            return null;
        }
    }

    // ===== Draggable Functionality =====
    function makeDraggable(element, handle) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        if (handle) {
            handle.addEventListener("mousedown", startDrag);
        }

        function startDrag(e) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = parseInt(element.style.left) || 0;
            initialY = parseInt(element.style.top) || 0;

            document.addEventListener("mousemove", drag);
            document.addEventListener("mouseup", stopDrag);

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

    // ===== Enhanced Toolbar with Model Selection =====
    function buildToolbar() {
        const existingToolbar = document.querySelector(".dev-toolbar");
        if (existingToolbar) {
            existingToolbar.remove();
        }
        setTimeout(() => {
        addErrorSyncButton();
    }, 100);

        toolbar = document.createElement("div");
        toolbar.className = "dev-toolbar";
        Object.assign(toolbar.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 1000001,
            background: "rgba(30, 30, 40, 0.95)",
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
            boxSizing: "border-box"
        });

        const referenceCount = Object.keys(referenceComponents).length;
        const activeRequirements = selections.filter(req => req.active !== false).length;
        const isAuthenticated = !!authToken;

        toolbar.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; cursor: move; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 6px; user-select: none;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: bold; color: #00e0ff; font-size: 15px;">🧠 Dev Assistant</span>
                <span id="countBadge" style="
                    background: #00e0ff;
                    color: #000;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: bold;
                    min-width: 20px;
                    text-align: center;
                ">${selections.length}</span>
                <span id="activeBadge" style="
                    background: #00ff88;
                    color: #000;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: bold;
                    min-width: 20px;
                    text-align: center;
                ">${activeRequirements}</span>
                <span id="refBadge" style="
                    background: #ffaa00;
                    color: #000;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: bold;
                    min-width: 20px;
                    text-align: center;
                ">${referenceCount}</span>
            </div>
            <div id="authStatus" style="font-size: 11px;">
                ${isAuthenticated ?
            `<span style="color: #00ff88;">✅ ${currentUser?.username || 'User'}</span>` :
            '<span style="color: #ffaa00;">⚠️ Guest</span>'
        }
            </div>
        </div>

        <!-- Authentication Button -->
        <div style="margin-bottom: 12px;">
            <button id="authButton" style="
                width: 100%;
                padding: 8px;
                border: none;
                border-radius: 6px;
                color: #000;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                background: ${isAuthenticated ? '#ff4444' : '#00e0ff'};
            ">
                ${isAuthenticated ? '🚪 Logout' : '🔑 Login'}
            </button>
        </div>

        <!-- Model Selection Section -->
        <div style="margin-bottom: 12px; padding: 10px; background: rgba(0,224,255,0.1); border-radius: 6px; border: 1px solid #00e0ff;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: center;">
                <div>
                    <label style="display: block; font-size: 11px; color: #00e0ff; margin-bottom: 4px;">Provider</label>
                    <select id="providerSelect" style="
                        width: 100%;
                        padding: 6px;
                        border: 1px solid #555;
                        border-radius: 4px;
                        outline: none;
                        font-size: 11px;
                        background: #1a1a2a;
                        color: #fff;
                        font-family: inherit;
                        cursor: pointer;
                        ${!isAuthenticated ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                    " ${!isAuthenticated ? 'disabled' : ''}>
                        <option value="">${isAuthenticated ? 'Loading providers...' : 'Login required'}</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; font-size: 11px; color: #00e0ff; margin-bottom: 4px;">Model</label>
                    <select id="modelSelect" style="
                        width: 100%;
                        padding: 6px;
                        border: 1px solid #555;
                        border-radius: 4px;
                        outline: none;
                        font-size: 11px;
                        background: #1a1a2a;
                        color: #fff;
                        font-family: inherit;
                        cursor: pointer;
                        ${!isAuthenticated ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                    " ${!isAuthenticated ? 'disabled' : ''}>
                        <option value="">${isAuthenticated ? 'Select provider first' : 'Login required'}</option>
                    </select>
                </div>
            </div>

            <!-- API Key Input -->
            <div id="apiKeySection" style="display: none; margin-top: 8px;">
                <div style="display: grid; grid-template-columns: 1fr auto; gap: 4px; align-items: center;">
                    <input type="password" id="apiKeyInput" placeholder="Enter API key..." style="
                        width: 100%;
                        padding: 6px;
                        border: 1px solid #555;
                        border-radius: 4px;
                        outline: none;
                        font-size: 11px;
                        background: #1a1a2a;
                        color: #fff;
                        font-family: inherit;
                        ${!isAuthenticated ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                    " ${!isAuthenticated ? 'disabled' : ''}>
                    <div style="display: flex; gap: 4px;">
                        <button id="saveApiKey" style="
                            padding: 6px 8px;
                            background: #00ff88;
                            border: none;
                            border-radius: 4px;
                            color: #000;
                            cursor: pointer;
                            font-size: 10px;
                            font-weight: bold;
                            white-space: nowrap;
                            ${!isAuthenticated ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                        " ${!isAuthenticated ? 'disabled' : ''}>💾 Save</button>
                        <button id="toggleApiKey" style="
                            padding: 6px 8px;
                            background: #00e0ff;
                            border: none;
                            border-radius: 4px;
                            color: #000;
                            cursor: pointer;
                            font-size: 10px;
                            font-weight: bold;
                            white-space: nowrap;
                        ">👁️</button>
                    </div>
                </div>
                <div id="apiKeyStatus" style="font-size: 10px; margin-top: 4px;"></div>
            </div>

            <button id="refreshModels" style="
                width: 100%;
                margin-top: 8px;
                padding: 4px;
                background: #555;
                border: none;
                border-radius: 4px;
                color: #fff;
                cursor: pointer;
                font-size: 10px;
                font-weight: bold;
                ${!isAuthenticated ? 'opacity: 0.5; cursor: not-allowed;' : ''}
            " ${!isAuthenticated ? 'disabled' : ''}>🔄 Refresh All</button>
        </div>

        <div style="margin-bottom: 12px; padding: 8px; background: rgba(0,255,136,0.1); border-radius: 6px; border: 1px solid #00ff88;">
            <div style="font-size: 12px; color: #00ff88; text-align: center; font-weight: bold;">
                🎯 Click anywhere to add requirements
            </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="reviewBtn" title="Review requirements" style="flex: 1;">📝 Review</button>
            <button id="referencesBtn" title="Manage references" style="flex: 1;">⭐ Refs</button>
            <button id="sendBtn" title="Send to backend" style="flex: 1; ${!isAuthenticated ? 'opacity: 0.5;' : ''}" ${!isAuthenticated ? 'disabled' : ''}>🚀 Send</button>
            <button id="clearBtn" title="Clear all" style="flex: 1;">🗑️ Clear</button>
        </div>
    `;

        document.body.appendChild(toolbar);

        const dragHandle = toolbar.querySelector('div[style*="cursor: move"]');
        makeDraggable(toolbar, dragHandle);

        // Initialize model selection only if authenticated
        if (isAuthenticated) {
            initializeModelSelection();
        }

        // Style buttons
        toolbar.querySelectorAll("button").forEach(btn => {
            Object.assign(btn.style, {
                padding: "8px 12px",
                border: "none",
                borderRadius: "6px",
                background: "#444",
                color: "#fff",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "500"
            });

            btn.onmouseenter = () => {
                if (!btn.disabled) btn.style.background = "#555";
            };
            btn.onmouseleave = () => {
                if (!btn.disabled) btn.style.background = "#444";
            };
        });

        // Auth button
        const authButton = toolbar.querySelector("#authButton");
        if (authButton) {
            authButton.onclick = isAuthenticated ? logout : showAuthModal;
        }

        // Other buttons
        const sendBtn = toolbar.querySelector("#sendBtn");
        const referencesBtn = toolbar.querySelector("#referencesBtn");
        const reviewBtn = toolbar.querySelector("#reviewBtn");
        const clearBtn = toolbar.querySelector("#clearBtn");
        const refreshModelsBtn = toolbar.querySelector("#refreshModels");

        if (sendBtn) {
            sendBtn.style.background = "#00e0ff";
            sendBtn.style.color = "#000";
            sendBtn.addEventListener("click", sendToBackend);
        }

        if (referencesBtn) {
            referencesBtn.style.background = "#ffaa00";
            referencesBtn.style.color = "#000";
            referencesBtn.addEventListener("click", showReferencesModal);
        }

        if (reviewBtn) {
            reviewBtn.addEventListener("click", showReviewModal);
        }

        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                if (selections.length > 0 || Object.keys(referenceComponents).length > 0) {
                    if (confirm("Clear all requirements and references?")) {
                        clearSelections();
                        showNotification("🧹 All requirements and references cleared", "info");
                    }
                } else {
                    showNotification("Nothing to clear", "info");
                }
            });
        }

        if (refreshModelsBtn && isAuthenticated) {
            refreshModelsBtn.addEventListener("click", refreshModels);
        }

        // API key save/toggle
        const saveApiKeyBtn = toolbar.querySelector("#saveApiKey");
        const toggleApiKeyBtn = toolbar.querySelector("#toggleApiKey");
        const apiKeyInput = toolbar.querySelector("#apiKeyInput");

        if (saveApiKeyBtn && toggleApiKeyBtn && apiKeyInput && isAuthenticated) {
            saveApiKeyBtn.addEventListener("click", async () => {
                const apiKey = apiKeyInput.value.trim();
                if (!apiKey) {
                    showNotification("❌ Please enter an API key", "error");
                    return;
                }

                // Show loader for saving API key
                const loader = showLoader("Saving API key...");

                try {
                    const data = await fetchWithAuth('/api/save_api_key', {
                        method: "POST",
                        body: JSON.stringify({
                            provider: selectedProvider,
                            api_key: apiKey
                        })
                    });

                    if (data.success) {
                        localStorage.setItem(`dev_api_key_${selectedProvider}`, apiKey);
                        const maskedKey = apiKey.substring(0, 4) + "••••" + apiKey.substring(apiKey.length - 4);
                        const apiKeyStatus = toolbar.querySelector("#apiKeyStatus");
                        apiKeyStatus.textContent = `✅ API key saved: ${maskedKey}`;
                        apiKeyStatus.style.color = "#00ff88";
                        showNotification(`✅ API key saved for ${selectedProvider}`, "success");
                    } else {
                        throw new Error(data.error || 'Failed to save API key');
                    }
                } catch (error) {
                    console.error("❌ Error saving API key:", error);
                    showNotification(`❌ Failed to save API key: ${error.message}`, "error");
                    const apiKeyStatus = toolbar.querySelector("#apiKeyStatus");
                    apiKeyStatus.textContent = "❌ Failed to save API key";
                    apiKeyStatus.style.color = "#ff4444";
                } finally {
                    // Hide loader
                    hideLoader();
                }
            });
        }

        updateCount();
    }

    // ===== Model Selection Functions =====
    async function initializeModelSelection() {
        const providerSelect = toolbar.querySelector("#providerSelect");
        const modelSelect = toolbar.querySelector("#modelSelect");

        if (!providerSelect || !modelSelect) {
            console.error("❌ Provider or model select elements not found");
            return;
        }

        // Populate providers first
        // In initializeModelSelection function, update providers array:

// In the providers array (around line 1470):
const providers = [
    { value: 'ollama', label: 'Ollama' },
    { value: 'lightning', label: 'Lightning.ai' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'google', label: 'Google' },
    { value: 'aimlapi', label: 'AIML API' },
    { value: 'nvidia', label: 'NVIDIA' },
    { value: 'apishop', label: 'API Shop (DeepSeek)' },
    { value: 'opencode', label: 'OpenCode AI' },
    { value: 'omniroute', label: 'OmniRoute' }  // ADD THIS
];

        providerSelect.innerHTML = '';
        providers.forEach(provider => {
            const option = document.createElement("option");
            option.value = provider.value;
            option.textContent = provider.label;
            if (provider.value === selectedProvider) {
                option.selected = true;
            }
            providerSelect.appendChild(option);
        });

        console.log(`🤖 Initial provider: ${selectedProvider}, model: ${selectedModel}`);

        // Update API key section visibility
        await updateApiKeySectionVisibility(selectedProvider);

        // Load models for the selected provider
        await loadModelsForProvider(selectedProvider);

        // Event listeners
        providerSelect.addEventListener("change", async (e) => {
            const newProvider = e.target.value;
            console.log(`🔄 Provider changed to: ${newProvider}`);

            selectedProvider = newProvider;
            await updateApiKeySectionVisibility(newProvider);
            await loadModelsForProvider(newProvider);
            saveModelSelection();

            showNotification(`✅ Switched to ${newProvider} provider`, "success");
        });

        modelSelect.addEventListener("change", (e) => {
            selectedModel = e.target.value;
            saveModelSelection();
            console.log(`✅ Model changed to: ${selectedModel}`);
            showNotification(`✅ Model set to: ${selectedModel}`, "success");
        });

        // Prevent event propagation for model selection elements
        const stopEventPropagation = (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
            return true;
        };

        ['click', 'mousedown', 'mouseup', 'focus', 'pointerdown'].forEach(eventType => {
            providerSelect.addEventListener(eventType, stopEventPropagation);
            modelSelect.addEventListener(eventType, stopEventPropagation);
        });

        const refreshBtn = toolbar.querySelector("#refreshModels");
        if (refreshBtn) {
            refreshBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                refreshModels();
            });
        }
    }

    async function updateApiKeySectionVisibility(provider) {
        const apiKeySection = toolbar.querySelector("#apiKeySection");
        const apiKeyStatus = toolbar.querySelector("#apiKeyStatus");
        const apiKeyInput = toolbar.querySelector("#apiKeyInput");

        if (!apiKeySection || !apiKeyStatus || !apiKeyInput) return;

// In updateApiKeySectionVisibility function (around line 1540):
const requiresApiKey = ['openai', 'openrouter', 'anthropic', 'google', 'aimlapi', 'nvidia', 'apishop', 'opencode', 'omniroute'].includes(provider);

        if (requiresApiKey) {
            apiKeySection.style.display = 'block';

            try {
                const data = await fetchWithAuth(`/api/get_api_key/${provider}`, {
                    method: "GET"
                });

                if (data.success && data.api_key) {
                    console.log(`✅ Found saved API key for ${provider}`);

                    const maskedKey = data.api_key.substring(0, 4) + "••••" + data.api_key.substring(data.api_key.length - 4);
                    apiKeyInput.value = data.api_key;
                    apiKeyInput.type = "password";
                    apiKeyStatus.textContent = `✅ API key loaded: ${maskedKey}`;
                    apiKeyStatus.style.color = "#00ff88";

                    localStorage.setItem(`dev_api_key_${provider}`, data.api_key);
                    console.log(`✅ API key fetched and stored for ${provider}`);
                } else {
                    apiKeyInput.value = "";
                    apiKeyStatus.textContent = "⚠️ No API key found for this provider";
                    apiKeyStatus.style.color = "#ffaa00";
                    console.log(`❌ No API key found for ${provider}`);
                }
            } catch (error) {
                apiKeyInput.value = "";
                apiKeyStatus.textContent = "⚠️ Error fetching API key";
                apiKeyStatus.style.color = "#ffaa00";
                console.error(`❌ Error fetching API key for ${provider}:`, error);
            }
        } else {
            apiKeySection.style.display = 'none';
            apiKeyStatus.textContent = "";
            apiKeyInput.value = "";
        }
    }

    async function loadModelsForProvider(provider) {
    const modelSelect = toolbar.querySelector("#modelSelect");
    if (!modelSelect) {
        console.error("? Model select element not found");
        return;
    }

    modelSelect.innerHTML = '<option value="">Loading models...</option>';
    modelSelect.disabled = true;

    try {
        console.log(`? Loading models for provider: ${provider}`);

        // For OmniRoute, we need to fetch with grouping
        let models = [];
        let categorizedModels = null;

        if (provider === 'omniroute') {
            // Fetch with categorization
            const data = await fetchWithAuth('/api/get_models', {
                method: "POST",
                body: JSON.stringify({
                    provider: provider,
                    _t: Date.now()
                })
            });

            if (data.models && Array.isArray(data.models)) {
                models = data.models;
                categorizedModels = data.categorized || null;
            }
        } else {
            models = await fetchModels(provider);
        }

        console.log(`? Received ${models.length} models for ${provider}`);

        modelSelect.innerHTML = '';

        // Add default option
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select a model...";
        modelSelect.appendChild(defaultOption);

        // If we have categorized models for OmniRoute, show them grouped
        if (categorizedModels && provider === 'omniroute') {
            // Show free models first
            for (const [providerName, providerData] of Object.entries(categorizedModels)) {
                const freeModels = providerData.models.filter(m => m.free);
                const paidModels = providerData.models.filter(m => !m.free);

                // Add free models for this provider
                if (freeModels.length > 0) {
                    const freeOptgroup = document.createElement("optgroup");
                    freeOptgroup.label = `🆓 ${providerData.display_name} (FREE)`;
                    freeModels.forEach(model => {
                        const option = document.createElement("option");
                        option.value = model.id;
                        option.textContent = model.name;
                        if (model.id === selectedModel) {
                            option.selected = true;
                        }
                        freeOptgroup.appendChild(option);
                    });
                    modelSelect.appendChild(freeOptgroup);
                }

                // Add paid models for this provider
                if (paidModels.length > 0) {
                    const paidOptgroup = document.createElement("optgroup");
                    paidOptgroup.label = `💰 ${providerData.display_name} (PAID)`;
                    paidModels.forEach(model => {
                        const option = document.createElement("option");
                        option.value = model.id;
                        option.textContent = model.name;
                        if (model.id === selectedModel) {
                            option.selected = true;
                        }
                        paidOptgroup.appendChild(option);
                    });
                    modelSelect.appendChild(paidOptgroup);
                }
            }
        } else {
            // Regular flat list for other providers
            models.forEach(model => {
                const option = document.createElement("option");
                option.value = model;
                option.textContent = model;
                if (model === selectedModel) {
                    option.selected = true;
                }
                modelSelect.appendChild(option);
            });
        }

        // Auto-select first model if none selected
        if (models.length > 0 && !models.includes(selectedModel)) {
            selectedModel = models[0];
            modelSelect.value = selectedModel;
            saveModelSelection();
            console.log(`? Auto-selected new model: ${selectedModel}`);
        }

        modelSelect.disabled = false;
        console.log(`? Successfully loaded ${models.length} models for ${provider}`);

    } catch (error) {
        console.error("? Error loading models:", error);
        modelSelect.innerHTML = '<option value="">Failed to load models</option>';
        modelSelect.disabled = false;
    }
}

    async function refreshModels() {
        const providerSelect = toolbar.querySelector("#providerSelect");
        if (!providerSelect) return;

        const currentProvider = providerSelect.value;
        console.log(`🔄 Refreshing models for: ${currentProvider}`);

        // Show loader
        const loader = showLoader(`Refreshing models for ${currentProvider}...`);

        try {
            // Clear any cached models for this provider
            if (availableModels[currentProvider]) {
                delete availableModels[currentProvider];
                localStorage.setItem("dev_available_models", JSON.stringify(availableModels));
            }

            // Update API key visibility and fetch from backend
            await updateApiKeySectionVisibility(currentProvider);

            // Then load fresh models from endpoint
            await loadModelsForProvider(currentProvider);
        } finally {
            // Hide loader
            hideLoader();
        }
    }

    function updateCount() {
        if (toolbar) {
            const countBadge = toolbar.querySelector("#countBadge");
            const activeBadge = toolbar.querySelector("#activeBadge");
            const refBadge = toolbar.querySelector("#refBadge");
            if (countBadge) countBadge.textContent = selections.length;
            if (activeBadge) {
                const activeRequirements = selections.filter(req => req.active !== false).length;
                activeBadge.textContent = activeRequirements;
            }
            if (refBadge) refBadge.textContent = Object.keys(referenceComponents).length;
        }
    }

    // ===== ENHANCED: Enhanced Review Modal with Integration Support =====
    function showReviewModal() {
        closeAllModals();

        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay";
        Object.assign(overlay.style, {
            position: "fixed",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.8)",
            zIndex: 1000002,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(5px)"
        });

        const modal = document.createElement("div");
        Object.assign(modal.style, {
            background: "#1a1a2a",
            color: "#fff",
            padding: "25px",
            borderRadius: "12px",
            width: "90%",
            maxWidth: "1000px",
            maxHeight: "85%",
            overflowY: "auto",
            border: "1px solid #444",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
        });

        const activeRequirements = selections.filter(req => req.active !== false);
        const inactiveRequirements = selections.filter(req => req.active === false);
        const newComponents = activeRequirements.filter(req => req.isNewComponent);
        const existingComponents = activeRequirements.filter(req => !req.isNewComponent);

        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 15px;">
                <h3 style="margin: 0; color: #00e0ff; font-size: 18px;">📝 Requirements Review</h3>
                <button id="closeReview" style="
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
            </div>

            <div style="margin-bottom: 20px;">
                <div style="font-size: 14px; color: #aaa; display: flex; gap: 15px; margin-bottom: 15px;">
                    <span>📋 ${selections.length} requirement(s)</span>
                    <span style="color: #00ff88;">✅ ${activeRequirements.length} active</span>
                    <span style="color: #888;">❌ ${inactiveRequirements.length} inactive</span>
                    <span>⭐ ${Object.keys(referenceComponents).length} reference(s)</span>
                    <span>🆕 ${newComponents.length} new component(s)</span>
                    <span>✏️ ${existingComponents.length} existing component(s)</span>
                </div>

                ${globalFeatureRequest ? `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <div style="font-size: 14px; color: #00e0ff; margin-bottom: 8px; font-weight: bold;">Feature Request</div>
                    <div style="font-size: 13px; color: #ccc;">${globalFeatureRequest}</div>
                </div>` : ''}

                ${globalFeatureDetails ? `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <div style="font-size: 14px; color: #00e0ff; margin-bottom: 8px; font-weight: bold;">Feature Details</div>
                    <div style="font-size: 13px; color: #ccc; white-space: pre-wrap;">${globalFeatureDetails}</div>
                </div>` : ''}
            </div>

            ${activeRequirements.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #00ff88; margin-bottom: 10px; font-size: 16px;">✅ Active Requirements</h4>
                ${newComponents.length > 0 ? `
                <div style="margin-bottom: 15px;">
                    <h5 style="color: #00ff88; margin-bottom: 8px; font-size: 14px;">🆕 New Components to Create</h5>
                    <div id="newComponentsList"></div>
                </div>
                ` : ''}

                ${existingComponents.length > 0 ? `
                <div style="margin-bottom: 15px;">
                    <h5 style="color: #00e0ff; margin-bottom: 8px; font-size: 14px;">✏️ Existing Components to Modify</h5>
                    <div id="existingComponentsList"></div>
                </div>
                ` : ''}
            </div>
            ` : ''}

            ${inactiveRequirements.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #888; margin-bottom: 10px; font-size: 16px;">❌ Inactive Requirements</h4>
                <div id="inactiveComponentsList"></div>
            </div>
            ` : ''}

            ${selections.length === 0 ? `
            <div id="emptyState" style="text-align: center; padding: 40px; color: #666; background: rgba(255,255,255,0.05); border-radius: 8px;">
                <div style="font-size: 48px; margin-bottom: 10px;">📝</div>
                <div style="font-size: 16px; margin-bottom: 8px;">No requirements yet</div>
                <div style="font-size: 13px; color: #888;">Use the toolbar to add requirements</div>
            </div>
            ` : ''}

            <div style="margin-top: 20px; text-align: right; border-top: 1px solid #444; padding-top: 15px;">
                <button id="exportJson" style="
                    padding: 10px 16px;
                    background: #555;
                    border: none;
                    border-radius: 6px;
                    color: #fff;
                    cursor: pointer;
                    margin-right: 10px;
                    font-size: 13px;
                ">📥 Export JSON</button>
                <button id="closeModal" style="
                    padding: 10px 20px;
                    background: #00e0ff;
                    border: none;
                    border-radius: 6px;
                    color: #000;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 13px;
                ">Close</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const closeModal = registerModal(overlay);

        const viewYamlButtons = modal.querySelectorAll(".viewYamlResponse");
        viewYamlButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute("data-index"));
                const req = selections[index];
                if (req.yaml_response) {
                    closeModal();
                    setTimeout(() => {
                        showYamlModalWithApply(req.yaml_response, req.component, req.response_id || `req_${index}`);
                    }, 300);
                }
            });
        });

        const applyButtons = modal.querySelectorAll(".applyChanges");
        applyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute("data-index"));
                const req = selections[index];
                if (req.yaml_response) {
                    closeModal();
                    setTimeout(() => {
                        showYamlModalWithApply(req.yaml_response, req.component, req.response_id || `req_${index}`);
                    }, 300);
                } else {
                    showNotification("❌ No YAML response available for this requirement", "error");
                }
            });
        });

        const createRequirementElement = (req, index, isActive = true) => {
            const reqElement = document.createElement("div");
            const isNew = req.isNewComponent;

            reqElement.style.cssText = `
                background: ${isActive ? (isNew ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)') : 'rgba(255,255,255,0.02)'};
                padding: 15px;
                margin-bottom: 12px;
                border-radius: 8px;
                border-left: 4px solid ${isActive ? (isNew ? '#00ff88' : '#00e0ff') : '#666'};
                transition: background 0.2s;
                opacity: ${isActive ? '1' : '0.7'};
            `;

            const componentDetailsHTML = req.componentDetails ? `
                <div style="background: rgba(0,224,255,0.1); padding: 10px; border-radius: 4px; margin: 8px 0; font-size: 11px;">
                    <div style="color: #00e0ff; font-weight: bold; margin-bottom: 4px;">📋 Component Details:</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px;">
                        <div><span style="color: #888;">Tag:</span> ${req.componentDetails.tagName || 'N/A'}</div>
                        <div><span style="color: #888;">Text:</span> ${req.componentDetails.textContent || 'N/A'}</div>
                    </div>
                </div>
            ` : '';

            const featureTypesHTML = req.feature_types && req.feature_types.length > 0 ? `
                <div style="margin-top: 8px;">
                    <div style="font-size: 11px; color: #00e0ff; font-weight: bold; margin-bottom: 4px;">Feature Types:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${req.feature_types.map(type => {
                const typeLabels = {
                    'is_frontend': '🌐 Frontend',
                    'is_backend': '⚙️ Backend',
                    'is_full_stack': '🔗 Full Stack',
                    'is_error': '❌ Error',
                    'is_integrate': '🔌 Integrate' // NEW: Added Integrate label
                };
                return `<span style="background: rgba(0,224,255,0.2); color: #00e0ff; padding: 2px 8px; border-radius: 10px; font-size: 10px; border: 1px solid #00e0ff;">
                                ${typeLabels[type] || type}
                            </span>`;
            }).join('')}
                    </div>
                </div>
            ` : '';

            // NEW: API Endpoints HTML
            const apiEndpointsHTML = req.api_endpoints && req.api_endpoints.length > 0 ? `
                <div style="margin-top: 8px;">
                    <div style="font-size: 11px; color: #00e0ff; font-weight: bold; margin-bottom: 4px;">🔌 API Endpoints:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${req.api_endpoints.map(endpoint => `
                            <span style="background: rgba(0,224,255,0.2); color: #00e0ff; padding: 2px 8px; border-radius: 10px; font-size: 10px; border: 1px solid #00e0ff;">
                                ${endpoint.method || 'GET'} ${endpoint.name || endpoint.endpoint}
                            </span>
                        `).join('')}
                    </div>
                </div>
            ` : '';

            const errorDescriptionHTML = req.error_description ? `
                <div style="margin-top: 8px;">
                    <div style="font-size: 11px; color: #ff4444; font-weight: bold; margin-bottom: 4px;">Error Description:</div>
                    <div style="background: rgba(255,68,68,0.1); padding: 8px; border-radius: 4px; font-size: 12px; color: #ff8888; border-left: 3px solid #ff4444;">
                        ${req.error_description}
                    </div>
                </div>
            ` : '';

            const refComponentsHTML = req.reference_components && Object.keys(req.reference_components).length > 0 ? `
                <div style="margin-top: 8px;">
                    <div style="font-size: 11px; color: #ffaa00; font-weight: bold; margin-bottom: 4px;">Reference Components:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${Object.values(req.reference_components).map(ref => `
                            <span style="background: rgba(255,170,0,0.2); color: #ffaa00; padding: 2px 8px; border-radius: 10px; font-size: 10px; border: 1px solid #ffaa00;">
                                ${ref.name}${ref.type === 'endpoint' ? ' 🔗' : ''}
                            </span>
                        `).join('')}
                    </div>
                </div>
            ` : '';

            const modelInfoHTML = req.model_used ? `
                <div style="font-size: 11px; color: #888; margin-top: 4px;">
                    🤖 ${req.provider_used || 'ollama'} / ${req.model_used}
                </div>
            ` : '';

            const responseStatusHTML = req.yaml_response ? `
                <div style="background: rgba(0,255,136,0.1); padding: 8px; border-radius: 4px; margin: 8px 0; border-left: 3px solid #00ff88;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="color: #00ff88; font-weight: bold; font-size: 11px;">✅ Response Received</span>
                            <span style="color: #888; font-size: 10px; margin-left: 8px;">
                                ${req.response_timestamp ? new Date(req.response_timestamp).toLocaleString() : ''}
                            </span>
                        </div>
                        <div style="display: flex; gap: 6px;">
                            <button class="viewYamlResponse" data-index="${index}" style="
                                background: #00e0ff;
                                color: #000;
                                border: none;
                                padding: 4px 8px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 10px;
                                font-weight: bold;
                            ">📋 View YAML</button>
                            <button class="applyChanges" data-index="${index}" style="
                                background: #00ff88;
                                color: #000;
                                border: none;
                                padding: 4px 8px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 10px;
                                font-weight: bold;
                            ">🚀 Apply Changes</button>
                        </div>
                    </div>
                </div>
            ` : `
                <div style="background: rgba(255,170,0,0.1); padding: 8px; border-radius: 4px; margin: 8px 0; border-left: 3px solid #ffaa00;">
                    <span style="color: #ffaa00; font-weight: bold; font-size: 11px;">⏳ Waiting for response...</span>
                </div>
            `;

            const activeStatusHTML = `
                <div style="margin-top: 8px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 11px; color: ${req.active !== false ? '#00ff88' : '#888'}; font-weight: bold;">
                            ${req.active !== false ? '✅ ACTIVE' : '❌ INACTIVE'}
                        </span>
                        <button class="toggleActive" data-index="${index}" style="
                            background: ${req.active !== false ? '#ffaa00' : '#00ff88'};
                            color: #000;
                            border: none;
                            padding: 2px 6px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 9px;
                            font-weight: bold;
                        ">${req.active !== false ? '❌ Deactivate' : '✅ Activate'}</button>
                    </div>
                </div>
            `;

            reqElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="flex: 1;">
                        <b style="color: ${isActive ? (isNew ? '#00ff88' : '#00e0ff') : '#666'}; font-size: 15px;">${req.component}</b>
                        ${modelInfoHTML}
                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                            ${isNew ? `
                                <span style="background: ${isActive ? '#00ff88' : '#666'}; color: #000; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">
                                    NEW ${req.componentType?.toUpperCase() || 'COMPONENT'}
                                </span>
                            ` : ''}
                            ${req.referenceComponent ? `
                                <span style="background: #ffaa00; color: #000; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">REFERENCE</span>
                            ` : ''}
                            ${req.integrate ? `
                                <span style="background: #00e0ff; color: #000; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">🔌 INTEGRATE</span>
                            ` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button class="editReq" data-index="${index}" style="
                            background: #00e0ff;
                            color: #000;
                            border: none;
                            padding: 6px 10px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 10px;
                            font-weight: bold;
                        ">✏️ Edit</button>
                        <button class="sendReq" data-index="${index}" style="
                            background: #ffaa00;
                            color: #000;
                            border: none;
                            padding: 6px 10px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 10px;
                            font-weight: bold;
                            ${!isActive ? 'display: none;' : ''}
                        ">📤 Send</button>
                        <button class="deleteReq" data-index="${index}" style="
                            background: #ff4444;
                            color: #fff;
                            border: none;
                            padding: 6px 10px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 10px;
                            font-weight: bold;
                        ">🗑️ Delete</button>
                    </div>
                </div>
                <div style="margin: 10px 0; font-size: 14px; line-height: 1.4; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px;">
                    ${req.requirement}
                </div>
                ${activeStatusHTML}
                ${isActive ? responseStatusHTML : ''}
                ${componentDetailsHTML}
                ${featureTypesHTML}
                ${apiEndpointsHTML}
                ${errorDescriptionHTML}
                ${refComponentsHTML}
                ${req.text ? `
                <div style="font-size: 12px; color: #ccc; margin-bottom: 8px; padding: 6px; background: rgba(255,255,255,0.05); border-radius: 4px;">
                    📝 "${req.text}"
                </div>
                ` : ''}
            `;

             // ===== IMAGES HTML =====
    const imagesHTML = req.images && req.images.length > 0 ? `
        <div style="margin-top: 8px;">
            <div style="font-size: 11px; color: #00e0ff; font-weight: bold; margin-bottom: 4px;">🖼️ Attached Images:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${req.images.map(img => `
                    <div style="
                        width: 80px;
                        height: 80px;
                        border-radius: 6px;
                        overflow: hidden;
                        border: 2px solid #00e0ff;
                        background: #1a1a2a;
                        position: relative;
                        flex-shrink: 0;
                    ">
                        <img
                            src="${img.url.startsWith('http') ? img.url : python_host + img.url}"
                            alt="${img.filename || 'Image'}"
                            style="
                                width: 100%;
                                height: 100%;
                                object-fit: cover;
                                cursor: pointer;
                            "
                            onclick="window.open('${img.url.startsWith('http') ? img.url : python_host + img.url}', '_blank')"
                            onerror="this.style.display='none'"
                        >
                        <div style="
                            position: absolute;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            background: rgba(0,0,0,0.7);
                            color: #fff;
                            font-size: 8px;
                            padding: 2px 4px;
                            text-align: center;
                            overflow: hidden;
                            white-space: nowrap;
                            text-overflow: ellipsis;
                        ">${img.filename || ''}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    // ===== IMAGES HTML FOR INACTIVE =====
    const imagesInactiveHTML = req.images && req.images.length > 0 ? `
        <div style="margin-top: 8px;">
            <div style="font-size: 11px; color: #888; font-weight: bold; margin-bottom: 4px;">🖼️ Attached Images (${req.images.length})</div>
        </div>
    ` : '';

    // Update reqElement.innerHTML to include images
    reqElement.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="flex: 1;">
                <b style="color: ${isActive ? (isNew ? '#00ff88' : '#00e0ff') : '#666'}; font-size: 15px;">${req.component}</b>
                ${modelInfoHTML}
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
                    ${isNew ? `
                        <span style="background: ${isActive ? '#00ff88' : '#666'}; color: #000; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">
                            NEW ${req.componentType?.toUpperCase() || 'COMPONENT'}
                        </span>
                    ` : ''}
                    ${req.referenceComponent ? `
                        <span style="background: #ffaa00; color: #000; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">REFERENCE</span>
                    ` : ''}
                    ${req.integrate ? `
                        <span style="background: #00e0ff; color: #000; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">🔌 INTEGRATE</span>
                    ` : ''}
                    ${req.has_images ? `
                        <span style="background: #ff6b35; color: #000; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">🖼️ ${req.images?.length || 0} IMAGES</span>
                    ` : ''}
                </div>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="editReq" data-index="${index}" style="
                    background: #00e0ff;
                    color: #000;
                    border: none;
                    padding: 6px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 10px;
                    font-weight: bold;
                ">✏️ Edit</button>
                <button class="sendReq" data-index="${index}" style="
                    background: #ffaa00;
                    color: #000;
                    border: none;
                    padding: 6px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 10px;
                    font-weight: bold;
                    ${!isActive ? 'display: none;' : ''}
                ">📤 Send</button>
                <button class="deleteReq" data-index="${index}" style="
                    background: #ff4444;
                    color: #fff;
                    border: none;
                    padding: 6px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 10px;
                    font-weight: bold;
                ">🗑️ Delete</button>
            </div>
        </div>
        <div style="margin: 10px 0; font-size: 14px; line-height: 1.4; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px;">
            ${req.requirement}
        </div>
        ${isActive ? imagesHTML : imagesInactiveHTML}
        ${activeStatusHTML}
        ${isActive ? responseStatusHTML : ''}
        ${componentDetailsHTML}
        ${featureTypesHTML}
        ${apiEndpointsHTML}
        ${errorDescriptionHTML}
        ${refComponentsHTML}
        ${req.text ? `
        <div style="font-size: 12px; color: #ccc; margin-bottom: 8px; padding: 6px; background: rgba(255,255,255,0.05); border-radius: 4px;">
            📝 "${req.text}"
        </div>
        ` : ''}
    `;





            return reqElement;
        };

        if (newComponents.length > 0) {
            const newComponentsList = modal.querySelector("#newComponentsList");
            if (newComponentsList) {
                newComponents.forEach((req, index) => {
                    const originalIndex = selections.indexOf(req);
                    const reqElement = createRequirementElement(req, originalIndex, true);
                    newComponentsList.appendChild(reqElement);
                });
            }
        }

        if (existingComponents.length > 0) {
            const existingComponentsList = modal.querySelector("#existingComponentsList");
            if (existingComponentsList) {
                existingComponents.forEach((req, index) => {
                    const originalIndex = selections.indexOf(req);
                    const reqElement = createRequirementElement(req, originalIndex, true);
                    existingComponentsList.appendChild(reqElement);
                });
            }
        }

        if (inactiveRequirements.length > 0) {
            const inactiveComponentsList = modal.querySelector("#inactiveComponentsList");
            if (inactiveComponentsList) {
                inactiveRequirements.forEach((req, index) => {
                    const originalIndex = selections.indexOf(req);
                    const reqElement = createRequirementElement(req, originalIndex, false);
                    inactiveComponentsList.appendChild(reqElement);
                });
            }
        }

        const addEventListenersToButtons = () => {
            const toggleActiveButtons = modal.querySelectorAll(".toggleActive");
            toggleActiveButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.getAttribute("data-index"));
                    selections[index].active = !selections[index].active;
                    saveSelections();
                    updateCount();

                    closeModal();
                    setTimeout(() => {
                        showReviewModal();
                    }, 100);
                });
            });

            const editButtons = modal.querySelectorAll(".editReq");
            editButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.getAttribute("data-index"));
                    const req = selections[index];
                    closeModal();
                    setTimeout(() => {
                        showEditRequirementModal(req, index);
                    }, 300);
                });
            });

            const applyButtons = modal.querySelectorAll(".applyChanges");
            applyButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.getAttribute("data-index"));
                    const req = selections[index];
                    if (req.yaml_response) {
                        closeModal();
                        setTimeout(() => {
                            showYamlModalWithApply(req.yaml_response, req.component, req.response_id || `req_${index}`);
                        }, 300);
                    } else {
                        showNotification("❌ No YAML response available for this requirement", "error");
                    }
                });
            });

            const sendButtons = modal.querySelectorAll(".sendReq");
            sendButtons.forEach(btn => {
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
                        setTimeout(() => {
                            showReviewModal();
                        }, 100);

                    } catch (error) {
                        showNotification(`❌ Failed to send ${req.component}`, "error");
                        sendBtn.textContent = originalText;
                        sendBtn.disabled = false;
                    }
                });
            });

            const deleteButtons = modal.querySelectorAll(".deleteReq");
            deleteButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.getAttribute("data-index"));
                    if (confirm("Delete this requirement?")) {
                        selections.splice(index, 1);
                        saveSelections();
                        closeModal();
                        updateCount();
                        setTimeout(() => {
                            showReviewModal();
                        }, 100);
                    }
                });
            });
        };

        addEventListenersToButtons();

        const exportJsonBtn = modal.querySelector("#exportJson");
        const closeReviewBtn = modal.querySelector("#closeReview");
        const closeModalBtn = modal.querySelector("#closeModal");

        if (exportJsonBtn) {
            exportJsonBtn.addEventListener("click", () => {
                const dataStr = JSON.stringify({
                    requirements: selections,
                    globalFeatureRequest,
                    globalFeatureDetails,
                }, null, 2);
                const blob = new Blob([dataStr], {type: "application/json"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `dev-requirements-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showNotification("📥 Requirements exported", "success");
            });
        }

        if (closeReviewBtn) {
            closeReviewBtn.addEventListener("click", closeModal);
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener("click", closeModal);
        }

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }

  function showEditRequirementModal(requirement, index) {
    closeAllModals();

    // Safely attempt to find the original element
    let originalElement = null;
    if (requirement.componentDetails && requirement.componentDetails.domPath) {
        try {
            originalElement = document.querySelector(requirement.componentDetails.domPath);
        } catch (e) {
            console.warn('Could not use domPath as selector, trying fallback:', e.message);
            const componentName = requirement.component;
            if (componentName) {
                originalElement = document.querySelector(`[data-component="${componentName}"]`);
                if (!originalElement) {
                    originalElement = document.querySelector(`.${componentName}`);
                }
            }
        }
    }

    const componentName = requirement.component;
    const domPath = (requirement.componentDetails?.domPath &&
                     !requirement.componentDetails.domPath.includes('src/'))
                    ? requirement.componentDetails.domPath
                    : (requirement.componentDetails?.domPath || "Unknown path");
    const elementText = requirement.componentDetails?.textContent || requirement.text || "";
    const componentDetails = requirement.componentDetails || {};

    const popupWidth = 700;
    const popupHeight = 800;
    const centerX = window.innerWidth / 2 - popupWidth / 2;
    const centerY = window.innerHeight / 2 - popupHeight / 2;

    const box = document.createElement("div");
    box.className = "dev-unified-popup";
    Object.assign(box.style, {
        position: "fixed",
        left: `${centerX}px`,
        top: `${centerY}px`,
        background: "rgba(25, 25, 35, 0.98)",
        color: "#fff",
        padding: "20px",
        borderRadius: "10px",
        zIndex: 1000000,
        width: `${popupWidth}px`,
        maxHeight: "80vh",
        overflowY: "auto",
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
        border: "1px solid #444",
        backdropFilter: "blur(10px)"
    });

    selectedReferences = new Map();
    if (requirement.reference_components) {
        Object.values(requirement.reference_components).forEach(ref => {
            if (ref.type === 'endpoint') {
                selectedReferences.set(ref.name, {
                    description: ref.description,
                    componentDetails: {
                        name: ref.name,
                        domPath: 'swagger-ui',
                        textContent: `Endpoint: ${ref.endpoint_data?.method} ${ref.endpoint_data?.path}`,
                        tagName: 'endpoint'
                    },
                    isEndpoint: true,
                    endpointData: ref
                });
            } else {
                selectedReferences.set(ref.name, {
                    description: ref.description,
                    componentDetails: ref.componentDetails
                });
            }
        });
    }

    // Load selected endpoints if integration exists
    if (requirement.api_endpoints && requirement.api_endpoints.length > 0) {
        selectedEndpoints.clear();
        requirement.api_endpoints.forEach(endpoint => {
            const endpointKey = `${endpoint.method}_${endpoint.endpoint}`;
            selectedEndpoints.set(endpointKey, {
                ...endpoint,
                summary: endpoint.name,
                description: endpoint.description,
                type: 'api_endpoint'
            });
        });
    }

    const isNewComponent = requirement.isNewComponent || false;
    if (isNewComponent && !selectedReferences.has("App")) {
        selectedReferences.set("App", {
            description: "Please follow code same way of this",
            componentDetails: {
                name: "App",
                domPath: "body > div#root",
                textContent: "Main application component",
                tagName: "div"
            }
        });

        if (!referenceComponents["App"]) {
            referenceComponents["App"] = {
                name: "App",
                description: "Please follow code same way of this",
                componentDetails: {
                    name: "App",
                    domPath: "body > div#root",
                    textContent: "Main application component",
                    tagName: "div"
                }
            };
            saveReferenceComponents();
        }
    }

    // Load images from the requirement if they exist - STORE IN uploadedImages
    if (requirement.images && requirement.images.length > 0) {
        uploadedImages[index] = requirement.images.map(img => ({
            id: img.id,
            url: img.url,
            filename: img.filename,
            file: null,
            // Mark as existing so we know not to re-upload
            isExisting: true
        }));
    }

    const isReference = referenceComponents[componentName];
    const integrateChecked = requirement.integrate || false;

    const detailsHTML = `
    <div style="background: rgba(0,224,255,0.1); padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #00e0ff;">
        <div style="font-size: 12px; color: #00e0ff; font-weight: bold; margin-bottom: 8px;">📋 COMPONENT DETAILS</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
            <div><span style="color: #888;">Name:</span> ${componentName}</div>
            <div><span style="color: #888;">Type:</span> ${isNewComponent ? (requirement.componentType || 'component') : 'Existing'}</div>
        </div>
    </div>
    <div style="font-size: 12px; color: #aaa; margin-bottom: 12px; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; word-break: break-all;">
        ${domPath}
    </div>
    ${elementText ? `<div style="font-size: 13px; color: #ccc; margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 6px; border-left: 3px solid #666;">
        📝 "${elementText}"
    </div>` : ''}
`;

    box.innerHTML = `
    <div id="popupHeader" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; cursor: move;">
        <div style="display: flex; align-items: center; gap: 10px;">
            <b style="color: #00e0ff; font-size: 16px;">✏️ Edit Requirement - ${componentName}</b>
            ${isReference ? `<span style="font-size: 11px; color: #000; background: #ffaa00; padding: 2px 8px; border-radius: 10px; font-weight: bold;">⭐ Reference</span>` : ''}
        </div>
        <button id="closeBox" style="
            background: #ff4444;
            border: none;
            color: #fff;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
        " title="Close">×</button>
    </div>

    ${detailsHTML}

    <div style="margin-bottom: 15px;">
        <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">Requirement Type</label>
        <div style="display: flex; gap: 10px;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="requirementType" value="existing" ${!isNewComponent ? 'checked' : ''} style="margin: 0;" ${isNewComponent ? 'disabled' : ''}>
                <span style="font-size: 13px;">✏️ Modify Existing Component</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="requirementType" value="new" ${isNewComponent ? 'checked' : ''} style="margin: 0;" ${!isNewComponent ? 'disabled' : ''}>
                <span style="font-size: 13px;">🆕 Create New Component</span>
            </label>
        </div>
    </div>

    <div id="newComponentFields" style="display: ${isNewComponent ? 'block' : 'none'}; margin-bottom: 15px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
                <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">Component Name *</label>
                <input type="text" id="newComponentName" value="${componentName}" placeholder="e.g., ProductList" style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #555;
                    border-radius: 4px;
                    outline: none;
                    font-size: 13px;
                    background: #1a1a2a;
                    color: #fff;
                    font-family: inherit;
                ">
            </div>
            <div>
                <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">Component Type *</label>
                <select id="newComponentType" style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #555;
                    border-radius: 4px;
                    outline: none;
                    font-size: 13px;
                    background: #1a1a2a;
                    color: #fff;
                    font-family: inherit;
                ">
                    <option value="component" ${requirement.componentType === 'component' ? 'selected' : ''}>Component</option>
                    <option value="page" ${requirement.componentType === 'page' ? 'selected' : ''}>Page</option>
                    <option value="layout" ${requirement.componentType === 'layout' ? 'selected' : ''}>Layout</option>
                    <option value="context" ${requirement.componentType === 'context' ? 'selected' : ''}>Context</option>
                    <option value="hook" ${requirement.componentType === 'hook' ? 'selected' : ''}>Hook</option>
                    <option value="util" ${requirement.componentType === 'util' ? 'selected' : ''}>Utility</option>
                </select>
            </div>
        </div>
    </div>

    <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">Feature Request (Global)</label>
        <input type="text" id="featureRequest" placeholder="Overall feature description..." value="${globalFeatureRequest}" style="
            width: 100%;
            padding: 10px;
            border: 1px solid #555;
            border-radius: 6px;
            outline: none;
            font-size: 14px;
            background: #1a1a2a;
            color: #fff;
            font-family: inherit;
        ">
    </div>

    <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">Feature Details (Global)</label>
        <textarea id="featureDetails" placeholder='Describe the feature details, requirements, acceptance criteria...' style="
            width: 100%;
            padding: 10px;
            border: 1px solid #555;
            border-radius: 6px;
            outline: none;
            resize: vertical;
            height: 70px;
            font-size: 14px;
            background: #1a1a2a;
            color: #fff;
            font-family: inherit;
        ">${globalFeatureDetails}</textarea>
    </div>

    <div style="margin-bottom: 15px;">
        <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 8px;">Feature Type *</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <input type="checkbox" id="is_frontend" class="feature-type-checkbox" style="margin: 0;" ${requirement.feature_types?.includes('is_frontend') ? 'checked' : ''}>
                <span style="font-size: 13px;">🌐 Frontend</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <input type="checkbox" id="is_backend" class="feature-type-checkbox" style="margin: 0;" ${requirement.feature_types?.includes('is_backend') ? 'checked' : ''}>
                <span style="font-size: 13px;">⚙️ Backend</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <input type="checkbox" id="is_full_stack" class="feature-type-checkbox" style="margin: 0;" ${requirement.feature_types?.includes('is_full_stack') ? 'checked' : ''}>
                <span style="font-size: 13px;">🔗 Full Stack</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <input type="checkbox" id="is_error" class="feature-type-checkbox" style="margin: 0;" ${requirement.feature_types?.includes('is_error') ? 'checked' : ''}>
                <span style="font-size: 13px;">❌ Error</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <input type="checkbox" id="is_integrate" class="feature-type-checkbox integrate-checkbox" style="margin: 0;" ${integrateChecked ? 'checked' : ''}>
                <span style="font-size: 13px;">🔌 Integrate</span>
            </label>
        </div>
    </div>

    <div id="integrationSection" style="display: ${integrateChecked ? 'block' : 'none'}; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 13px; color: #00e0ff;">📡 API Endpoints:</div>
            <button id="addMoreEndpoints" style="
                background: #00e0ff;
                color: #000;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 4px;
            ">🌐 Add Endpoints</button>
        </div>
        <div id="selectedEndpoints" style="min-height: 60px; border: 1px dashed #00e0ff; border-radius: 8px; padding: 12px; background: rgba(0,224,255,0.05);">
            <div style="color: #666; text-align: center; font-size: 12px; padding: 15px;">
                No API endpoints selected yet
            </div>
        </div>
        <div id="endpointDescriptions" style="margin-top: 10px;"></div>
    </div>

    <div id="errorDescriptionSection" style="display: ${requirement.feature_types?.includes('is_error') ? 'block' : 'none'}; margin-bottom: 15px;">
        <label style="display: block; font-size: 13px; color: #ff4444; margin-bottom: 6px;">Error Description *</label>
        <textarea
            id="errorDescription"
            placeholder="Describe the error in detail..."
            style="
                width: 100%;
                padding: 12px;
                border: 1px solid #ff4444;
                border-radius: 6px;
                outline: none;
                resize: vertical;
                height: 80px;
                font-size: 14px;
                background: rgba(255,68,68,0.1);
                color: #fff;
                font-family: inherit;
            "
        >${requirement.error_description || ''}</textarea>
    </div>

    <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 13px; color: #aaa;">Reference Components:</div>
            <button id="addMoreReferences" style="
                background: #ffaa00;
                color: #000;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 4px;
            ">🌐 Add More References</button>
        </div>
        <div id="selectedReferences" style="min-height: 60px; border: 1px dashed #555; border-radius: 8px; padding: 12px; background: rgba(255,255,255,0.05);">
            <div style="color: #666; text-align: center; font-size: 12px; padding: 15px;">
                No reference components selected yet
            </div>
        </div>
        <div id="referenceDescriptions" style="margin-top: 10px;"></div>
    </div>

    <div style="margin-bottom: 15px;">
        <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">Requirement Description *</label>
        <textarea
            id="componentRequirement"
            placeholder="${isNewComponent ? 'Describe what this new component should do...' : 'Describe what should be changed or added to this component...'}"
            style="
                width: 100%;
                padding: 12px;
                border: 1px solid #555;
                border-radius: 6px;
                outline: none;
                resize: vertical;
                height: 100px;
                font-size: 14px;
                background: #1a1a2a;
                color: #fff;
                font-family: inherit;
            "
        >${requirement.requirement || ''}</textarea>
    </div>

    <!-- IMAGE UPLOAD SECTION -->
    <div id="imageUploadSection" style="
        margin-top: 15px;
        margin-bottom: 15px;
        padding: 10px;
        background: rgba(0,224,255,0.05);
        border: 1px dashed #00e0ff;
        border-radius: 6px;
    ">
        <div style="font-size: 12px; color: #00e0ff; margin-bottom: 8px; font-weight: bold;">
            🖼️ UI Mockups / Design References
            ${requirement.images && requirement.images.length > 0 ? `<span style="color: #00ff88; margin-left: 8px;">(${requirement.images.length} images attached)</span>` : ''}
        </div>
        <div style="font-size: 11px; color: #aaa; margin-bottom: 8px;">
            Upload images to help the AI understand the desired UI design
        </div>
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <label style="
                padding: 6px 12px;
                background: #00e0ff;
                color: #000;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
            ">
                📷 Add Image
                <input type="file" id="imageUpload" accept="image/*" multiple style="display: none;">
            </label>
            <span style="font-size: 11px; color: #888;">
                PNG, JPG, GIF, WebP, SVG supported
            </span>
        </div>
        <div id="imagePreviewContainer" style="
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
        "></div>
    </div>

    <div style="margin-bottom: 15px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px; background: rgba(0,224,255,0.1); border-radius: 6px; border: 1px solid #00e0ff;">
            <input type="checkbox" id="isActive" ${requirement.active !== false ? 'checked' : ''} style="margin: 0;">
            <span style="font-size: 13px; color: #00e0ff; font-weight: bold;">✅ Active Requirement</span>
        </label>
        <div style="font-size: 11px; color: #888; margin-top: 4px; margin-left: 24px;">
            Only active requirements will be sent to the server
        </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
        <div>
            ${!isNewComponent ? `<button id="referenceToggle" style="
                padding: 8px 12px;
                background: ${isReference ? '#ffaa00' : '#555'};
                border: none;
                border-radius: 4px;
                cursor: pointer;
                color: ${isReference ? '#000' : '#fff'};
                font-size: 12px;
                font-weight: bold;
            ">
                ${isReference ? '⭐ Reference' : '⭐ Set as Reference'}
            </button>` : ''}
        </div>
        <div>
            <button id="cancelBtn" style="
                padding: 10px 20px;
                background: #666;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                color: #fff;
                margin-right: 10px;
                font-size: 14px;
            ">Cancel</button>
            <button id="saveBtn" style="
                padding: 10px 20px;
                background: #00ff88;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                color: #000;
                font-weight: bold;
                font-size: 14px;
            ">💾 Save Changes</button>
        </div>
    </div>
`;

    document.body.appendChild(box);
    activeInputBox = box;

    makeDraggable(box, box.querySelector("#popupHeader"));

    // ===== LOAD EXISTING IMAGES =====
    // Immediately load existing images when modal is rendered
    const imageContainer = box.querySelector("#imagePreviewContainer");
    if (imageContainer) {
        const imagesToLoad = uploadedImages[index] || requirement.images || [];
        if (imagesToLoad.length > 0) {
            loadExistingImagesForEdit(index, imagesToLoad, imageContainer);
        }
    }

    // ===== SETUP IMAGE UPLOAD HANDLER =====
    const fileInput = box.querySelector("#imageUpload");
    if (fileInput) {
        fileInput.addEventListener("change", async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;

            const previewContainer = box.querySelector("#imagePreviewContainer");
            if (!previewContainer) return;

            for (const file of files) {
                await uploadImageForRequirementEdit(index, file, previewContainer);
            }

            // Reset input to allow re-uploading same file
            fileInput.value = '';
        });
    }

    // ===== Feature type checkbox logic =====
    const featureTypeCheckboxes = box.querySelectorAll('.feature-type-checkbox');
    const integrateCheckbox = box.querySelector('#is_integrate');
    const integrationSection = box.querySelector('#integrationSection');
    const errorDescriptionSection = box.querySelector('#errorDescriptionSection');
    const errorDescriptionTextarea = box.querySelector('#errorDescription');

    // Initialize integration section visibility
    if (integrateCheckbox && integrationSection) {
        integrateCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                integrationSection.style.display = 'block';
            } else {
                integrationSection.style.display = 'none';
                selectedEndpoints.clear();
                updateSelectedEndpointsDisplay(box.querySelector("#selectedEndpoints"));
            }
        });
    }

    function getSelectedFeatureTypes() {
        const selectedTypes = [];
        featureTypeCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedTypes.push(checkbox.id);
            }
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
            console.log('Feature types updated:', getSelectedFeatureTypes());
        });
    });

    // ===== Add event listener for endpoint selection button =====
    const addMoreEndpointsBtn = box.querySelector("#addMoreEndpoints");
    if (addMoreEndpointsBtn) {
        addMoreEndpointsBtn.addEventListener("click", () => {
            if (swaggerEndpoints.length === 0) {
                showNotification("📡 Fetching API endpoints...", "info");
                fetchSwaggerEndpoints().then(endpoints => {
                    if (endpoints.length > 0) {
                        showSimpleEndpointSelectionModal(endpoints);
                    } else {
                        showNotification("❌ No API endpoints found", "error");
                    }
                }).catch(error => {
                    showNotification(`❌ Failed to fetch endpoints: ${error.message}`, "error");
                });
            } else {
                showSimpleEndpointSelectionModal(swaggerEndpoints);
            }
        });
    }

    // Update selected endpoints display
    updateSelectedEndpointsDisplay(box.querySelector("#selectedEndpoints"));

    const addMoreRefsBtn = box.querySelector("#addMoreReferences");
    if (addMoreRefsBtn) {
        addMoreRefsBtn.addEventListener("click", () => {
            const isBackendChecked = box.querySelector("#is_backend")?.checked || false;
            const isSwaggerPage = document.querySelector('.opblock') !== null;

            if (isSwaggerPage && isBackendChecked) {
                addSwaggerEndpointReferences();
            } else if (isSwaggerPage) {
                showNotification('Please check "⚙️ Backend" checkbox to capture Swagger endpoints', 'warning');
            } else {
                if (!isNavigatingForReferences) {
                    isNavigatingForReferences = true;
                    navigationReferences = new Map(selectedReferences);
                    addMoreRefsBtn.textContent = "✅ Finish Adding References";
                    addMoreRefsBtn.style.background = "#00ff88";
                    showNotification("🌐 Navigation mode: Click on any component to add it as reference. You can navigate to other pages. Click 'Finish' when done.", "info");
                    document.addEventListener("click", handleNavigationClick, true);
                } else {
                    isNavigatingForReferences = false;
                    selectedReferences = new Map(navigationReferences);
                    addMoreRefsBtn.textContent = "🌐 Add More References";
                    addMoreRefsBtn.style.background = "#00e0ff";
                    showNotification(`✅ Finished adding references. ${selectedReferences.size} references selected.`, "success");
                    document.removeEventListener("click", handleNavigationClick, true);
                }
            }
            updateSelectedReferencesDisplay(box,
                isNavigatingForReferences ? navigationReferences : selectedReferences,
                isNavigatingForReferences);
        });
    }

    const requirementTypeRadios = box.querySelectorAll('input[name="requirementType"]');
    if (requirementTypeRadios.length > 0) {
        requirementTypeRadios.forEach(radio => {
            radio.addEventListener("change", (e) => {
                const isNew = e.target.value === "new";
                const newComponentFields = box.querySelector("#newComponentFields");
                if (newComponentFields) {
                    newComponentFields.style.display = isNew ? "block" : "none";
                }
                const textarea = box.querySelector("#componentRequirement");
                if (textarea) {
                    textarea.placeholder = isNew ?
                        "Describe what this new component should do..." :
                        "Describe what should be changed or added to this component...";
                }
            });
        });
    }

    // ===== SAVE BUTTON HANDLER =====
    const saveBtn = box.querySelector("#saveBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            const requirementText = box.querySelector("#componentRequirement")?.value.trim() || "";
            const featureRequest = box.querySelector("#featureRequest")?.value.trim() || "";
            const featureDetails = box.querySelector("#featureDetails")?.value.trim() || "";
            const requirementType = box.querySelector('input[name="requirementType"]:checked')?.value || "existing";
            const isNew = requirementType === "new";
            const isActive = box.querySelector("#isActive")?.checked !== false;
            const integrateChecked = integrateCheckbox?.checked || false;

            const featureTypes = getSelectedFeatureTypes();
            const errorDescription = box.querySelector("#errorDescription")?.value.trim() || "";

            if (featureTypes.includes('is_error') && !errorDescription) {
                showNotification("Please provide error description when error checkbox is selected", "warning");
                return;
            }

            let finalComponentName = componentName;
            let componentType = "component";

            if (isNew) {
                finalComponentName = box.querySelector("#newComponentName")?.value.trim() || "";
                componentType = box.querySelector("#newComponentType")?.value || "component";
                if (!finalComponentName) {
                    showNotification("Please enter a component name for new component", "warning");
                    return;
                }
            }

            if (!requirementText && !featureTypes.includes('is_error')) {
                showNotification("Please describe the requirement or select error type", "warning");
                return;
            }

            globalFeatureRequest = featureRequest;
            globalFeatureDetails = featureDetails;
            localStorage.setItem("dev_global_feature_request", globalFeatureRequest);
            localStorage.setItem("dev_global_feature_details", globalFeatureDetails);

            const finalReferences = isNavigatingForReferences ? navigationReferences : selectedReferences;
            const referenceComponentsArray = [];
            const referenceComponentsObject = {};

            finalReferences.forEach((refData, refName) => {
                const descTextarea = box.querySelector(`.reference-description[data-ref="${refName}"]`);
                const description = descTextarea ? descTextarea.value.trim() : refData.description;

                if (refData.isEndpoint) {
                    referenceComponentsArray.push(refData.endpointData);
                    referenceComponentsObject[refName] = refData.endpointData;
                } else {
                    referenceComponentsArray.push({
                        name: refName,
                        description: description || `Reference component: ${refName}`,
                        type: 'reference',
                        componentDetails: refData.componentDetails
                    });
                    referenceComponentsObject[refName] = {
                        name: refName,
                        description: description || `Reference component: ${refName}`,
                        componentDetails: refData.componentDetails
                    };
                }
            });

            const apiEndpointsArray = [];
            if (integrateChecked) {
                selectedEndpoints.forEach((endpointData, endpointKey) => {
                    const descTextarea = box.querySelector(`.endpoint-description[data-endpoint="${endpointKey}"]`);
                    const description = descTextarea ? descTextarea.value.trim() : endpointData.description;

                    const endpointObj = {
                        name: endpointData.name || endpointData.summary || endpointData.description || endpointData.path,
                        method: endpointData.method,
                        endpoint: endpointData.path || endpointData.endpoint,
                        description: description || `API endpoint: ${endpointData.summary || endpointData.path}`,
                        type: 'api_endpoint'
                    };

                    if (endpointData.controller || endpointData.action) {
                        endpointObj.controller = endpointData.controller;
                        endpointObj.action = endpointData.action;
                    }
                    if (endpointData.model) {
                        endpointObj.model = endpointData.model;
                    }
                    if (endpointData.schema) {
                        endpointObj.schema = extractMinimalSchema(endpointData.schema);
                    } else if (endpointData.swagger_endpoint?.endpoint_data?.schema) {
                        endpointObj.schema = extractMinimalSchema(endpointData.swagger_endpoint.endpoint_data.schema);
                    }
                    apiEndpointsArray.push(endpointObj);
                });
            }

            // ===== GET IMAGES FROM UPLOADED =====
            const existingImages = requirement.images || [];
            const newImages = uploadedImages[index] || [];

            // Merge existing images with any new uploads, avoiding duplicates
            const allImages = [...existingImages];
            newImages.forEach(newImg => {
                if (!allImages.some(img => img.id === newImg.id)) {
                    allImages.push(newImg);
                }
            });

            const updatedRequirement = {
                requirement: requirementText,
                components: referenceComponentsArray,
                reference_components: referenceComponentsObject,
                isNewComponent: isNew,
                componentType: isNew ? componentType : undefined,
                componentDetails: !isNew ? componentDetails : null,
                feature_types: featureTypes,
                integrate: integrateChecked,
                api_endpoints: integrateChecked ? apiEndpointsArray : [],
                error_description: featureTypes.includes('is_error') ? errorDescription : undefined,
                active: isActive,
                component: finalComponentName,
                images: allImages,
                has_images: allImages.length > 0
            };

            if (!isNew) {
                updatedRequirement.text = elementText;
            }

            if (selections[index].yaml_response) {
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

            showNotification(`✅ Requirement updated for ${finalComponentName} with ${referenceComponentsArray.length} reference components${integrateChecked ? ` and ${apiEndpointsArray.length} API endpoints` : ''}`, "success");

            setTimeout(() => {
                showReviewModal();
            }, 300);
        });
    }

    if (!isNewComponent) {
        const referenceToggle = box.querySelector("#referenceToggle");
        if (referenceToggle) {
            referenceToggle.addEventListener("click", () => {
                if (referenceComponents[componentName]) {
                    delete referenceComponents[componentName];
                    showNotification(`❌ ${componentName} removed as reference`, "info");
                } else {
                    referenceComponents[componentName] = {
                        name: componentName,
                        text: elementText,
                        description: `Reference component: ${componentName}`,
                        componentDetails: componentDetails
                    };
                    showNotification(`⭐ ${componentName} set as reference component`, "success");
                }
                saveReferenceComponents();
                updateCount();

                box.remove();
                setTimeout(() => {
                    showEditRequirementModal(requirement, index);
                }, 100);
            });
        }
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
            setTimeout(() => {
                showReviewModal();
            }, 300);
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
            setTimeout(() => {
                showReviewModal();
            }, 300);
        });
    }

    updateSelectedReferencesDisplay(box, selectedReferences, false);
}

function loadExistingImagesForEdit(reqIndex, images, container) {
    if (!images || images.length === 0 || !container) return;

    // Clear existing previews
    container.innerHTML = '';

    images.forEach(img => {
        const preview = document.createElement("div");
        preview.style.cssText = `
            position: relative;
            width: 100px;
            height: 100px;
            border-radius: 6px;
            overflow: hidden;
            border: 2px solid #00e0ff;
            background: #1a1a2a;
            flex-shrink: 0;
        `;

        const imgElement = document.createElement("img");
        const fullImageUrl = img.url.startsWith('http') ? img.url : `${python_host}${img.url}`;
        imgElement.src = fullImageUrl;
        imgElement.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
        `;
        imgElement.onerror = function() {
            console.error('❌ Failed to load image:', fullImageUrl);
            // Try loading with the original URL as fallback
            if (this.src !== img.url) {
                this.src = img.url;
            }
        };
        imgElement.onload = function() {
            console.log('✅ Image loaded successfully:', fullImageUrl);
        };
        preview.appendChild(imgElement);

        // Delete button for existing images
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "×";
        deleteBtn.style.cssText = `
            position: absolute;
            top: 4px;
            right: 4px;
            background: rgba(255,68,68,0.9);
            border: none;
            color: #fff;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
        `;
        deleteBtn.title = "Remove image";

        deleteBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (confirm("Remove this image?")) {
                // Remove from uploadedImages
                if (uploadedImages[reqIndex]) {
                    uploadedImages[reqIndex] = uploadedImages[reqIndex].filter(
                        existingImg => existingImg.id !== img.id
                    );
                    if (uploadedImages[reqIndex].length === 0) {
                        delete uploadedImages[reqIndex];
                    }
                }

                // Also remove from the requirement's images if it exists
                if (selections[reqIndex] && selections[reqIndex].images) {
                    selections[reqIndex].images = selections[reqIndex].images.filter(
                        existingImg => existingImg.id !== img.id
                    );
                    if (selections[reqIndex].images.length === 0) {
                        selections[reqIndex].has_images = false;
                    }
                    saveSelections();
                }

                // Remove preview element
                if (preview.parentNode) {
                    preview.parentNode.removeChild(preview);
                }

                showNotification("✅ Image removed", "success");
            }
        });

        preview.appendChild(deleteBtn);
        container.appendChild(preview);
    });
}


async function uploadImageForRequirementEdit(requirementIndex, file, previewContainer) {
    // Show loader
    const loader = showLoader(`Uploading ${file.name}...`);

    try {
        if (!authToken && !isGuestMode) {
            showNotification("🔐 Please login to upload images", "error");
            return;
        }

        const formData = new FormData();
        formData.append('image', file);
        formData.append('requirement_id', `req_${requirementIndex}`);

        const data = await fetchWithAuth('/api/upload_requirement_image', {
            method: "POST",
            body: formData
        });

        if (data.success) {
            // Initialize uploadedImages for this requirement if not exists
            if (!uploadedImages[requirementIndex]) {
                uploadedImages[requirementIndex] = [];
            }

            const imageData = {
                id: data.image_id,
                url: data.url,
                filename: data.filename,
                file: file,
                isExisting: false // Mark as newly uploaded
            };

            uploadedImages[requirementIndex].push(imageData);

            // Also update the requirement in selections
            if (selections[requirementIndex]) {
                if (!selections[requirementIndex].images) {
                    selections[requirementIndex].images = [];
                }
                selections[requirementIndex].images.push({
                    id: data.image_id,
                    url: data.url,
                    filename: data.filename
                });
                selections[requirementIndex].has_images = true;
                saveSelections();
            }

            // Add preview
            addImagePreviewForEdit(requirementIndex, previewContainer, file, data.url, data.image_id);

            showNotification(`✅ Uploaded ${file.name}`, "success");
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (error) {
        console.error("❌ Image upload error:", error);
        showNotification(`❌ Failed to upload ${file.name}: ${error.message}`, "error");
    } finally {
        hideLoader();
    }
}

function addImagePreviewForEdit(requirementIndex, previewContainer, file, imageUrl, imageId) {
    const preview = document.createElement("div");
    preview.style.cssText = `
        position: relative;
        width: 100px;
        height: 100px;
        border-radius: 6px;
        overflow: hidden;
        border: 2px solid #00e0ff;
        background: #1a1a2a;
        flex-shrink: 0;
    `;

    const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${python_host}${imageUrl}`;

    const img = document.createElement("img");
    img.src = fullImageUrl || URL.createObjectURL(file);
    img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
    `;
    img.onerror = function() {
        console.error('❌ Failed to load image:', fullImageUrl);
        if (this.src !== imageUrl) {
            this.src = imageUrl;
        }
    };
    img.onload = function() {
        console.log('✅ Image loaded successfully:', fullImageUrl);
    };
    preview.appendChild(img);

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "×";
    deleteBtn.style.cssText = `
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(255,68,68,0.9);
        border: none;
        color: #fff;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
    `;
    deleteBtn.title = "Remove image";

    deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm("Remove this image?")) {
            // Delete from server
            try {
                const data = await fetchWithAuth(`/api/delete_requirement_image/${imageId}`, {
                    method: "DELETE"
                });

                if (data.success) {
                    // Remove from uploadedImages
                    if (uploadedImages[requirementIndex]) {
                        uploadedImages[requirementIndex] = uploadedImages[requirementIndex].filter(
                            img => img.id !== imageId
                        );
                        if (uploadedImages[requirementIndex].length === 0) {
                            delete uploadedImages[requirementIndex];
                        }
                    }

                    // Also remove from requirement in selections
                    if (selections[requirementIndex] && selections[requirementIndex].images) {
                        selections[requirementIndex].images = selections[requirementIndex].images.filter(
                            img => img.id !== imageId
                        );
                        if (selections[requirementIndex].images.length === 0) {
                            selections[requirementIndex].has_images = false;
                        }
                        saveSelections();
                    }

                    // Remove preview element
                    if (preview.parentNode) {
                        preview.parentNode.removeChild(preview);
                    }

                    showNotification("✅ Image removed", "success");
                } else {
                    throw new Error(data.error || 'Delete failed');
                }
            } catch (error) {
                console.error("❌ Image delete error:", error);
                showNotification(`❌ Failed to delete image: ${error.message}`, "error");
            }
        }
    });

    preview.appendChild(deleteBtn);
    previewContainer.appendChild(preview);
}

    // ===== Show YAML Modal with Apply Button =====
    // ===== Show YAML Modal with Apply Button =====
    function showYamlModalWithApply(yamlContent, componentName, requirementId) {
        // Close any existing modals first
        closeAllModals();

        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay";
        Object.assign(overlay.style, {
            position: "fixed",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.8)",
            zIndex: 1000002,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(5px)"
        });

        const modal = document.createElement("div");
        Object.assign(modal.style, {
            background: "#1a1a2a",
            color: "#fff",
            padding: "25px",
            borderRadius: "12px",
            width: "90%",
            maxWidth: "800px",
            maxHeight: "80%",
            overflowY: "auto",
            border: "1px solid #444",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
        });

        modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 15px;">
            <h3 style="margin: 0; color: #00ff88; font-size: 18px;">🚀 Apply Changes - ${componentName}</h3>
            <button id="closeApply" style="
                background: none;
                border: none;
                color: #fff;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">×</button>
        </div>

        <div style="background: #2a2a3a; border: 1px solid #444; border-radius: 6px; padding: 15px; max-height: 400px; overflow-y: auto; margin-bottom: 20px;">
            <pre style="color:#ccc; font-family:monospace; font-size:12px; margin:0; white-space:pre-wrap;">
${escapeHtml(yamlContent)}
            </pre>
        </div>

        <div style="background: rgba(0,224,255,0.1); padding: 12px; border-radius: 6px; border-left: 4px solid #00e0ff; margin-bottom: 20px;">
            <div style="font-size: 12px; color: #00e0ff; font-weight: bold; margin-bottom: 6px;">💡 Available Actions:</div>
            <ul style="font-size: 12px; color: #ccc; margin: 0; padding-left: 20px;">
                <li><strong>Apply Changes:</strong> Apply these YAML changes to your project</li>
                <li><strong>Close:</strong> Return to review modal without applying</li>
            </ul>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #444;">
            <div style="font-size: 12px; color: #888;">
                Requirement ID: ${requirementId}
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="closeApplyBtn" style="
                    padding: 10px 20px;
                    background: #666;
                    border: none;
                    border-radius: 6px;
                    color: #fff;
                    cursor: pointer;
                    font-size: 13px;
                ">Close</button>
                <button id="confirmApplyChanges" style="
                    padding: 10px 20px;
                    background: #00ff88;
                    border: none;
                    border-radius: 6px;
                    color: #000;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 13px;
                ">🚀 Apply Changes</button>
            </div>
        </div>
    `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const closeModal = registerModal(overlay);

        const closeApplyBtn = modal.querySelector("#closeApply");
        const closeApplyBtn2 = modal.querySelector("#closeApplyBtn");
        const confirmApplyChangesBtn = modal.querySelector("#confirmApplyChanges");

        if (closeApplyBtn) {
            closeApplyBtn.addEventListener("click", closeModal);
        }

        if (closeApplyBtn2) {
            closeApplyBtn2.addEventListener("click", closeModal);
        }

        if (confirmApplyChangesBtn) {
            confirmApplyChangesBtn.addEventListener("click", () => {
                console.log('🚀 Apply Changes clicked from YAML modal:', { componentName, requirementId });

                // Show loading state
                confirmApplyChangesBtn.innerHTML = '⏳ Applying...';
                confirmApplyChangesBtn.disabled = true;
                confirmApplyChangesBtn.style.background = "#ffaa00";

                // Call the apply function
                applyYamlChanges(yamlContent, requirementId);
            });
        }

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }

    // ===== Show Apply Changes Popup =====
    function showApplyChangesPopup(yamlContent, componentName, requirementId) {
        closeAllModals();

        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay";
        Object.assign(overlay.style, {
            position: "fixed",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.8)",
            zIndex: 1000002,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(5px)"
        });

        const modal = document.createElement("div");
        Object.assign(modal.style, {
            background: "#1a1a2a",
            color: "#fff",
            padding: "25px",
            borderRadius: "12px",
            width: "90%",
            maxWidth: "800px",
            maxHeight: "80%",
            overflowY: "auto",
            border: "1px solid #444",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
        });

        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 15px;">
                <h3 style="margin: 0; color: #00ff88; font-size: 18px;">🚀 Apply Changes - ${componentName}</h3>
                <button id="closeApply" style="
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
            </div>

            <div style="background: #2a2a3a; border: 1px solid #444; border-radius: 6px; padding: 15px; max-height: 400px; overflow-y: auto; margin-bottom: 20px;">
            <pre style="color:#ccc; font-family:monospace; font-size:12px; margin:0; white-space:pre-wrap;">
    ${escapeHtml(yamlContent)}
</pre>
            </div>

            <div style="background: rgba(0,224,255,0.1); padding: 12px; border-radius: 6px; border-left: 4px solid #00e0ff; margin-bottom: 20px;">
                <div style="font-size: 12px; color: #00e0ff; font-weight: bold; margin-bottom: 6px;">💡 Available Actions:</div>
                <ul style="font-size: 12px; color: #ccc; margin: 0; padding-left: 20px;">
                    <li>Apply Changes: Apply these YAML changes to your project</li>
                    <li>Close: Return to review modal without applying</li>
                </ul>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #444;">
                <div style="font-size: 12px; color: #888;">
                    Review the YAML changes before applying
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="closeApplyBtn" style="
                        padding: 10px 20px;
                        background: #666;
                        border: none;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                        font-size: 13px;
                    ">Close</button>
                    <button id="confirmApplyChanges" style="
                        padding: 10px 20px;
                        background: #00ff88;
                        border: none;
                        border-radius: 6px;
                        color: #000;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 13px;
                    ">🚀 Apply Changes</button>
                </div>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const closeModal = registerModal(overlay);

        const closeApplyBtn = modal.querySelector("#closeApply");
        const closeApplyBtn2 = modal.querySelector("#closeApplyBtn");
        const confirmApplyChangesBtn = modal.querySelector("#confirmApplyChanges");

        if (closeApplyBtn) {
            closeApplyBtn.addEventListener("click", closeModal);
        }

        if (closeApplyBtn2) {
            closeApplyBtn2.addEventListener("click", closeModal);
        }

        if (confirmApplyChangesBtn) {
            confirmApplyChangesBtn.addEventListener("click", () => {
                applyYamlChanges(yamlContent, requirementId);
            });
        }

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                closeModal();
                setTimeout(() => {
                    showReviewModal();
                }, 300);
            }
        });
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // ===== References Modal =====
    function showReferencesModal() {
        closeAllModals();

        // Get the first active requirement
        const activeRequirements = selections.filter(req => req.active !== false);
        const firstActiveRequirement = activeRequirements.length > 0 ? activeRequirements[0] : null;

        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay";
        Object.assign(overlay.style, {
            position: "fixed",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.8)",
            zIndex: 1000002,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(5px)"
        });

        const modal = document.createElement("div");
        Object.assign(modal.style, {
            background: "#1a1a2a",
            color: "#fff",
            padding: "25px",
            borderRadius: "12px",
            width: firstActiveRequirement ? "700px" : "500px",
            maxHeight: "80%",
            overflowY: "auto",
            border: "1px solid #444",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
        });

        // Create header based on whether we have an active requirement
        let headerHTML = '';
        let contentHTML = '';

        if (firstActiveRequirement) {
            const requirementRefs = firstActiveRequirement.reference_components || {};
            const refKeys = Object.keys(requirementRefs);
            const globalRefKeys = Object.keys(referenceComponents);

            headerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 15px;">
                <div>
                    <h3 style="color: #ffaa00; margin: 0; font-size: 18px;">⭐ Reference Components</h3>
                    <div style="font-size: 12px; color: #aaa; margin-top: 5px;">
                        For: <span style="color: #00ff88;">${firstActiveRequirement.component}</span>
                        <span style="margin-left: 15px; background: ${refKeys.length > 0 ? '#00ff88' : '#ffaa00'}; color: #000; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;">
                            ${refKeys.length} requirement refs
                        </span>
                        <span style="margin-left: 8px; background: #00e0ff; color: #000; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;">
                            ${globalRefKeys.length} global refs
                        </span>
                    </div>
                </div>
                <button id="closeRefs" style="
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
            </div>
        `;

            // Create tabs for requirement-specific refs and global refs
            contentHTML = `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; border-bottom: 1px solid #444; margin-bottom: 15px;">
                    <button id="tabRequirementRefs" class="refs-tab active" style="
                        flex: 1;
                        padding: 10px;
                        background: #ffaa00;
                        border: none;
                        color: #000;
                        cursor: pointer;
                        font-weight: bold;
                        border-radius: 6px 6px 0 0;
                    ">Requirement Refs (${refKeys.length})</button>
                    <button id="tabGlobalRefs" class="refs-tab" style="
                        flex: 1;
                        padding: 10px;
                        background: #555;
                        border: none;
                        color: #fff;
                        cursor: pointer;
                        font-weight: bold;
                        border-radius: 6px 6px 0 0;
                    ">Global Refs (${globalRefKeys.length})</button>
                </div>

                <div id="requirementRefsContent" class="refs-content" style="display: block;">
                    ${renderReferenceList(requirementRefs, 'requirement')}
                </div>

                <div id="globalRefsContent" class="refs-content" style="display: none;">
                    ${renderReferenceList(referenceComponents, 'global')}
                </div>
            </div>
        `;
        } else {
            // No active requirement - show global refs only
            headerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 15px;">
                <div>
                    <h3 style="color: #ffaa00; margin: 0; font-size: 18px;">⭐ Global Reference Components</h3>
                    <div style="font-size: 12px; color: #aaa; margin-top: 5px;">
                        No active requirements found
                    </div>
                </div>
                <button id="closeRefs" style="
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
            </div>
        `;

            const globalRefKeys = Object.keys(referenceComponents);
            contentHTML = `
            <div id="globalRefsContent">
                ${renderReferenceList(referenceComponents, 'global')}
            </div>
        `;
        }

        modal.innerHTML = headerHTML + contentHTML + `
        <div style="margin-top: 20px; text-align: right; border-top: 1px solid #444; padding-top: 15px;">
            <button id="closeRefsBtn" style="
                padding: 10px 20px;
                background: #00e0ff;
                border: none;
                border-radius: 6px;
                color: #000;
                cursor: pointer;
                font-weight: bold;
                font-size: 13px;
            ">Close</button>
        </div>
    `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const closeModal = registerModal(overlay);

        // Add tab switching functionality
        if (firstActiveRequirement) {
            const tabRequirementRefs = modal.querySelector("#tabRequirementRefs");
            const tabGlobalRefs = modal.querySelector("#tabGlobalRefs");
            const requirementRefsContent = modal.querySelector("#requirementRefsContent");
            const globalRefsContent = modal.querySelector("#globalRefsContent");

            tabRequirementRefs.addEventListener("click", () => {
                tabRequirementRefs.style.background = "#ffaa00";
                tabRequirementRefs.style.color = "#000";
                tabGlobalRefs.style.background = "#555";
                tabGlobalRefs.style.color = "#fff";
                requirementRefsContent.style.display = "block";
                globalRefsContent.style.display = "none";
            });

            tabGlobalRefs.addEventListener("click", () => {
                tabGlobalRefs.style.background = "#ffaa00";
                tabGlobalRefs.style.color = "#000";
                tabRequirementRefs.style.background = "#555";
                tabRequirementRefs.style.color = "#fff";
                globalRefsContent.style.display = "block";
                requirementRefsContent.style.display = "none";
            });
        }

        // Add remove functionality for both tabs
        modal.querySelectorAll(".removeRef").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const refName = e.target.closest("button").getAttribute("data-ref");
                const refType = e.target.closest("button").getAttribute("data-type");

                if (confirm(`Remove "${refName}" from ${refType === 'requirement' ? 'requirement' : 'global'} references?`)) {
                    if (refType === 'requirement' && firstActiveRequirement && firstActiveRequirement.reference_components) {
                        delete firstActiveRequirement.reference_components[refName];
                        // Also remove from components array for backward compatibility
                        if (firstActiveRequirement.components) {
                            firstActiveRequirement.components = firstActiveRequirement.components.filter(
                                comp => comp.name !== refName
                            );
                        }
                        saveSelections();
                    } else {
                        delete referenceComponents[refName];
                        saveReferenceComponents();
                    }

                    updateCount();
                    overlay.remove();
                    showReferencesModal();
                }
            });
        });

        modal.querySelector("#closeRefs").addEventListener("click", closeModal);
        modal.querySelector("#closeRefsBtn").addEventListener("click", closeModal);

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }

    // Helper function to render reference list
    function renderReferenceList(refs, type) {
        const refKeys = Object.keys(refs);

        if (refKeys.length === 0) {
            return `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">⭐</div>
                <div>No ${type === 'requirement' ? 'requirement' : 'global'} reference components</div>
                <div style="font-size: 13px; color: #888; margin-top: 8px;">
                    ${type === 'requirement' ?
                'Add references in the requirement popup' :
                'Click "Set as Reference" on any component'}
                </div>
            </div>
        `;
        }

        let html = '';
        refKeys.forEach(refName => {
            const ref = refs[refName];

            // Check if this is an endpoint reference
            const isEndpoint = ref.type === 'endpoint' || ref.endpoint_data || ref.endpoint_metadata;

            html += `
            <div style="
                background: rgba(255,255,255,0.05);
                padding: 15px;
                margin-bottom: 12px;
                border-radius: 8px;
                border-left: 4px solid ${type === 'requirement' ? '#00ff88' : '#ffaa00'};
            ">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: ${isEndpoint ? '10px' : '0'}">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                            <b style="color: ${type === 'requirement' ? '#00ff88' : '#ffaa00'}; font-size: 15px;">${refName}</b>
                            ${isEndpoint ? `<span style="background: #00e0ff; color: #000; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">ENDPOINT</span>` : ''}
                        </div>
                        <div style="font-size: 12px; color: #ccc; margin-top: 4px;">
                            ${ref.description || "No description"}
                        </div>
                    </div>
                    <button class="removeRef" data-ref="${refName}" data-type="${type}" style="
                        background: #ff4444;
                        color: #fff;
                        border: none;
                        padding: 6px 10px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                        white-space: nowrap;
                    ">🗑️ Remove</button>
                </div>

                ${isEndpoint ? renderEndpointDetails(ref) : ''}

                ${ref.componentDetails ? `
                    <div style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 11px;">
                        <div style="color: #888; margin-bottom: 2px;">Component Details:</div>
                        <div style="color: #ccc;">
                            ${ref.componentDetails.tagName || ''} - ${ref.componentDetails.textContent || 'No text'}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        });

        return html;
    }

    // Helper function to render endpoint details
    function renderEndpointDetails(ref) {
        const endpointData = ref.endpoint_data || ref;
        const metadata = ref.endpoint_metadata || {};

        let detailsHTML = '<div style="margin-top: 10px; padding: 10px; background: rgba(0,224,255,0.1); border-radius: 6px; font-size: 11px;">';

        // Method and Path
        if (endpointData.method || endpointData.path) {
            detailsHTML += `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <span style="background: #444; color: #00e0ff; padding: 2px 8px; border-radius: 4px; font-weight: bold;">
                    ${endpointData.method || 'METHOD'}
                </span>
                <span style="font-family: monospace; color: #ccc;">${endpointData.path || ''}</span>
            </div>
        `;
        }

        // Controller and Action
        if (metadata['x-controller'] || endpointData.controller || metadata['x-action'] || endpointData.action) {
            detailsHTML += `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                <div>
                    <div style="color: #888; font-size: 10px;">Controller</div>
                    <div style="color: #00ff88;">${metadata['x-controller'] || endpointData.controller || 'N/A'}</div>
                </div>
                <div>
                    <div style="color: #888; font-size: 10px;">Action</div>
                    <div style="color: #ffaa00;">${metadata['x-action'] || endpointData.action || 'N/A'}</div>
                </div>
            </div>
        `;
        }

        // Model
        if (metadata['x-model'] || endpointData.model) {
            const modelData = typeof metadata['x-model'] === 'object' ? metadata['x-model'] : { name: endpointData.model || 'N/A' };
            detailsHTML += `
            <div style="margin-bottom: 8px;">
                <div style="color: #888; font-size: 10px;">Model</div>
                <div style="color: #00e0ff;">${modelData.name || modelData}</div>
            </div>
        `;
        }

        // Additional info
        if (endpointData.child_method_name || endpointData.method_used) {
            detailsHTML += `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                ${endpointData.child_method_name ? `
                    <div>
                        <div style="color: #888; font-size: 10px;">Child Method</div>
                        <div style="color: #ccc;">${endpointData.child_method_name}</div>
                    </div>
                ` : ''}
                ${endpointData.method_used ? `
                    <div>
                        <div style="color: #888; font-size: 10px;">Method Used</div>
                        <div style="color: #ccc;">${endpointData.method_used}</div>
                    </div>
                ` : ''}
            </div>
        `;
        }

        detailsHTML += '</div>';
        return detailsHTML;
    }

    // ===== Enhanced Send Functions with Model Selection =====
    async function sendSingleRequirement(requirement, index) {
        // Show loader
        const loader = showLoader(`Sending ${requirement.component} using ${selectedModel}...`);

        try {
            if (!authToken && !isGuestMode) {
                showNotification("🔐 Please login to send requirements", "error");
                showAuthModal();
                return;
            }

            if (!selectedModel || selectedModel === "") {
                showNotification("❌ Please select a model first", "error");
                throw new Error("No model selected");
            }

            const payload = {
                requirements: [requirement],
                globalFeatureRequest,
                globalFeatureDetails,
                referenceComponents,
                model: selectedModel,
                provider: selectedProvider
            };

            console.log("📤 Sending single requirement:", payload);

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
            console.error("❌ Send failed:", error);
            showNotification(`❌ Failed to send ${requirement.component}. ${error.message}`, "error");
            throw error;
        } finally {
            // Hide loader
            hideLoader();
        }
    }

    // ===== Backend Communication =====
    async function sendToBackend() {
    const activeRequirements = selections.filter(req => req.active !== false);

    if (!activeRequirements.length) {
        showNotification("No active requirements to send!", "warning");
        return;
    }

    if (!authToken && !isGuestMode) {
        showNotification("🔐 Please login to send requirements", "error");
        showAuthModal();
        return;
    }

    if (!selectedModel || selectedModel === "") {
        showNotification("❌ Please select a model first", "error");
        return;
    }

    // Show loader
    const loader = showLoader(`Sending ${activeRequirements.length} active requirements using ${selectedModel}...`);

    try {
        // Build payload with images
        const requirementsWithImages = [];
        const imageReferences = {};

        activeRequirements.forEach((req, index) => {
            if (req.has_images && req.images && req.images.length > 0) {
                requirementsWithImages.push(index);
                imageReferences[index] = req.images.map(img => img.url);
            }
        });

        const payload = {
            requirements: activeRequirements,
            model: selectedModel,
            provider: selectedProvider,
            globalFeatureRequest,
            globalFeatureDetails,
            referenceComponents,
            requirements_with_images: requirementsWithImages,
            image_references: imageReferences
        };

        console.log("📤 Sending payload with images:", payload);

        const data = await fetchWithAuth('/api/llm_requirements', {
            method: "POST",
            body: JSON.stringify(payload)
        });

        console.log("✅ Backend response:", data);

        if (data.response || data.yaml_response) {
            const yamlResponse = data.response || data.yaml_response;
            const responseId = data.id || `req_${Date.now()}`;

            // Update requirements with response
            selections.forEach((req, index) => {
                if (req.active !== false) {
                    req.yaml_response = yamlResponse;
                    req.response_timestamp = new Date().toISOString();
                    req.response_id = responseId;
                    req.model_used = selectedModel;
                    req.provider_used = selectedProvider;
                }
            });
            saveSelections();

            const imageCount = Object.keys(imageReferences).reduce(
                (sum, key) => sum + (imageReferences[key]?.length || 0), 0
            );

            showNotification(
                `✅ ${activeRequirements.length} active requirements sent with ${imageCount} images using ${selectedModel}!`,
                "success"
            );

            setTimeout(() => {
                showYamlResponsePopup(yamlResponse, responseId);
            }, 500);
        } else {
            showNotification("❌ No YAML response received from server", "error");
        }

    } catch (error) {
        console.error("❌ Send failed:", error);
        showNotification(`❌ Failed to send requirements: ${error.message}`, "error");
    } finally {
        hideLoader();
    }
}

    // ===== Show YAML Response Popup =====
    function showYamlResponsePopup(yamlContent, responseId) {
        closeAllModals();

        const overlay = document.createElement("div");
        overlay.className = "dev-modal-overlay";
        Object.assign(overlay.style, {
            position: "fixed",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.8)",
            zIndex: 1000002,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(5px)"
        });

        const modal = document.createElement("div");
        Object.assign(modal.style, {
            background: "#1a1a2a",
            color: "#fff",
            padding: "25px",
            borderRadius: "12px",
            width: "90%",
            maxWidth: "800px",
            maxHeight: "80%",
            overflowY: "auto",
            border: "1px solid #444",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
        });

        modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 15px;">
            <h3 style="margin: 0; color: #00ff88; font-size: 18px;">📋 YAML Response Received</h3>
            <button id="closeYamlPopup" style="
                background: none;
                border: none;
                color: #fff;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">×</button>
        </div>

        <div style="background: #2a2a3a; border: 1px solid #444; border-radius: 6px; padding: 15px; max-height: 400px; overflow-y: auto; margin-bottom: 20px;">
            <pre style="color:#ccc; font-family:monospace; font-size:12px; margin:0; white-space:pre-wrap;">
    ${escapeHtml(yamlContent)}
</pre>

        </div>

        <div style="background: rgba(0,224,255,0.1); padding: 12px; border-radius: 6px; border-left: 4px solid #00e0ff; margin-bottom: 20px;">
            <div style="font-size: 12px; color: #00e0ff; font-weight: bold; margin-bottom: 6px;">💡 Available Actions:</div>
            <ul style="font-size: 12px; color: #ccc; margin: 0; padding-left: 20px;">
                <li><strong>Apply Changes:</strong> Apply these YAML changes to your project</li>
                <li><strong>Close:</strong> Return to review modal without applying</li>
            </ul>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #444;">
            <div style="font-size: 12px; color: #888;">
                Response ID: ${responseId}
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="closeYamlBtn" style="
                    padding: 10px 20px;
                    background: #666;
                    border: none;
                    border-radius: 6px;
                    color: #fff;
                    cursor: pointer;
                    font-size: 13px;
                ">Close</button>
                <button id="applyYamlChanges" style="
                    padding: 10px 20px;
                    background: #00ff88;
                    border: none;
                    border-radius: 6px;
                    color: #000;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 13px;
                ">🚀 Apply Changes</button>
            </div>
        </div>
    `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const closeModal = registerModal(overlay);

        const closeYamlPopupBtn = modal.querySelector("#closeYamlPopup");
        const closeYamlBtn = modal.querySelector("#closeYamlBtn");
        const applyYamlChangesBtn = modal.querySelector("#applyYamlChanges");

        if (closeYamlPopupBtn) {
            closeYamlPopupBtn.addEventListener("click", closeModal);
        }

        if (closeYamlBtn) {
            closeYamlBtn.addEventListener("click", closeModal);
        }

        if (applyYamlChangesBtn) {
            applyYamlChangesBtn.addEventListener("click", () => {
                console.log('🚀 Apply Changes clicked for response:', responseId);
                closeModal();
                applyYamlChanges(yamlContent, responseId);
            });
        }

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }

    // ===== Event Listeners =====
    // ===== Event Listeners =====
    function setupEventListeners() {
        let lastClickTime = 0;
        let lastClickedElement = null;
        let isPopupOpening = false; // Add this flag to track if popup is opening

        document.addEventListener("click", (e) => {
            // Check if a popup is already open or opening
            if (activeInputBox ||
                e.target.closest(".dev-unified-popup") ||
                e.target.closest(".dev-toolbar") ||
                e.target.closest(".dev-modal-overlay") ||
                isPopupOpening) { // Add isPopupOpening check
                return;
            }

            if (isNavigatingForReferences) return;

            const clickedElement = e.target;
            const currentTime = new Date().getTime();
            const isDoubleClick = (currentTime - lastClickTime < 300) && (clickedElement === lastClickedElement);

            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (isDoubleClick || isMobile) {
                const bestComponent = getBestComponentForClick(clickedElement);

                if (bestComponent) {
                    // Set flag to prevent multiple popups
                    isPopupOpening = true;

                    highlightElement(clickedElement);
                    showUnifiedPopup(
                        {
                            x: e.clientX,
                            y: e.clientY,
                            target: bestComponent.node,
                            componentName: bestComponent.name,
                            domPath: bestComponent.domPath,
                            isNewComponent: false
                        }
                    );

                    // Reset flag after a short delay to allow popup to be created
                    setTimeout(() => {
                        isPopupOpening = false;
                    }, 100);
                }
            }

            lastClickTime = currentTime;
            lastClickedElement = clickedElement;
        }, true);

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                if (activeInputBox) {
                    if (isNavigatingForReferences) {
                        document.removeEventListener("click", handleNavigationClick, true);
                        isNavigatingForReferences = false;
                    }
                    activeInputBox.remove();
                    activeInputBox = null;
                    isPopupOpening = false; // Reset flag when closing
                }
                if (activeModals.size > 0) {
                    closeAllModals();
                }
            }

            if (e.key === "r" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                showReviewModal();
            }
        });
    }

    // ===== Initialize =====
    function initialize() {
        console.log("🚀 Initializing Dev Assistant...");

        // Clear model cache on startup to ensure fresh data
        localStorage.removeItem("dev_available_models");
        availableModels = {};

        document.querySelectorAll(".dev-toolbar, .dev-unified-popup, .dev-modal-overlay").forEach(el => el.remove());

        // Check authentication first
        checkAuth();

        buildToolbar();
        setupEventListeners();

        setTimeout(() => {
            if (authToken) {
                showNotification("🧠 Dev Assistant Ready - Authenticated", "success");
            } else {
                showNotification("🧠 Dev Assistant Ready - Limited features for guest", "info");
            }
        }, 500);

          setTimeout(() => {
        if (authToken) {
            autoSyncErrors();
        }
    }, 2000); // Wait 2 seconds for everything to load

        console.log("✅ Dev Assistant initialized successfully");
        console.log(`📊 ${selections.length} requirements, ${Object.keys(referenceComponents).length} references loaded`);
        console.log(`🔐 ${authToken ? 'Authenticated as ' + (currentUser?.username || 'User') : 'Not authenticated'}`);
    }

    // Start the application
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }


    // ===== Error Syncing Functions =====

/**
 * Fetch errors from all user projects and update requirements
 * @param {Function} onComplete - Callback when sync is complete
 * @param {Function} onError - Callback when sync fails
 */
async function syncErrorsWithRequirements(onComplete, onError) {
    console.log('🔄 Syncing errors with requirements...');

    if (!authToken && !isGuestMode) {
        showNotification("🔐 Please login to sync errors", "error");
        showAuthModal();
        if (onError) onError(new Error('Authentication required'));
        return;
    }

    // Show loader
    try {
    // Get current requirements from localStorage
    const currentRequirements = localStorage.getItem("dev_requirements");
    let requirementsData = {};

    try {
        requirementsData = currentRequirements
            ? JSON.parse(currentRequirements)
            : { requirements: [] };
    } catch (e) {
        requirementsData = { requirements: [] };
    }

    // Prepare payload
    const payload = {
        existing_dev_requirements: requirementsData,
        dev_captured_errors: null // Let backend fetch errors directly
    };

    console.log('📤 Sending error sync request:', payload);

    const data = await fetchWithAuth('/api/update_requirements_with_errors', {
        method: "POST",
        body: JSON.stringify(payload)
    });

    console.log('✅ Error sync response:', data);

    if (data.success && data.requirements) {
        // Save updated requirements to localStorage
        localStorage.setItem(
            "dev_requirements",
            JSON.stringify(data.requirements, null, 2)
        );

        // Update in-memory selections
        if (data.requirements.requirements) {
            // Merge with existing selections, preserving non-error requirements
            const existingRequirements = selections.filter(
                req => !req.is_error_requirement
            );
            const errorRequirements = data.requirements.requirements.filter(
                req => req.is_error_requirement
            );

            selections = [...errorRequirements, ...existingRequirements];
            saveSelections();
            updateCount();
        }

        const errorCount =
            data.requirements.requirements?.filter(
                req => req.is_error_requirement
            ).length || 0;

        const totalCount = data.requirements.requirements?.length || 0;

        showNotification(
            `✅ Synced ${errorCount} errors from projects (${totalCount} total requirements)`,
            "success"
        );

        // Refresh UI
        if (typeof buildToolbar === "function") {
            buildToolbar();
        }

        if (onComplete) onComplete(data.requirements);

        return data.requirements;
    } else {
        throw new Error(data.error || "Failed to sync errors");
    }
} catch (error) {
    console.error("❌ Error syncing errors:", error);
    showNotification(`❌ Failed to sync errors: ${error.message}`, "error");

    if (onError) onError(error);

    throw error;
}
}

/**
 * Sync errors and show the review modal with updated requirements
 */
async function syncAndShowReview() {
    try {
        const requirements = await syncErrorsWithRequirements();
        if (requirements) {
            setTimeout(() => {
                showReviewModal();
            }, 300);
        }
    } catch (error) {
        console.error('❌ Sync and review failed:', error);
    }
}

/**
 * Add a sync button to the toolbar
 */
function addErrorSyncButton() {
    const toolbar = document.querySelector(".dev-toolbar");
    if (!toolbar) return;

    // Check if button already exists
    if (toolbar.querySelector("#errorSyncBtn")) return;

    // Find the button container
    const buttonContainer = toolbar.querySelector('div[style*="gap: 8px"]') ||
                           toolbar.querySelector('div:last-child');

    if (!buttonContainer) return;

    // Create the sync button
    const syncBtn = document.createElement("button");
    syncBtn.id = "errorSyncBtn";
    syncBtn.textContent = "🔄 Sync Errors";
    syncBtn.title = "Sync errors from all projects";

    Object.assign(syncBtn.style, {
        padding: "8px 12px",
        border: "none",
        borderRadius: "6px",
        background: "#ff6b35",
        color: "#fff",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: "500",
        flex: "1"
    });

    syncBtn.onmouseenter = () => {
        syncBtn.style.background = "#ff8a5c";
    };
    syncBtn.onmouseleave = () => {
        syncBtn.style.background = "#ff6b35";
    };

    syncBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        syncAndShowReview();
    });

    // Insert before the clear button if it exists
    const clearBtn = buttonContainer.querySelector("#clearBtn");
    if (clearBtn) {
        buttonContainer.insertBefore(syncBtn, clearBtn);
    } else {
        buttonContainer.appendChild(syncBtn);
    }

    console.log('✅ Error sync button added to toolbar');
}

/**
 * Enhanced: Auto-sync errors when Dev Assistant loads
 */
async function autoSyncErrors() {
    if (!authToken && isGuestMode) {
        console.log('⏭️ Skipping auto-sync: Guest mode');
        return;
    }

    try {
        console.log('🔄 Auto-syncing errors on load...');
        await syncErrorsWithRequirements();
    } catch (error) {
        console.warn('⚠️ Auto-sync failed:', error.message);
    }
}



// ===== Image Upload Functions =====

let uploadedImages = {}; // Map of requirement_index -> {file, url, id}

function showImageUploadButton(requirementIndex, container) {
    const uploadContainer = document.createElement("div");
    uploadContainer.style.cssText = `
        margin-top: 10px;
        padding: 10px;
        background: rgba(0,224,255,0.05);
        border: 1px dashed #00e0ff;
        border-radius: 6px;
    `;

    uploadContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <label style="
                padding: 6px 12px;
                background: #00e0ff;
                color: #000;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
            ">
                📷 Add Image
                <input type="file" id="imageUpload_${requirementIndex}" accept="image/*" multiple style="display: none;">
            </label>
            <span style="font-size: 11px; color: #aaa;">Upload UI mockups or design references</span>
        </div>
        <div id="imagePreviewContainer_${requirementIndex}" style="
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
        "></div>
    `;

    container.appendChild(uploadContainer);

    const fileInput = uploadContainer.querySelector(`#imageUpload_${requirementIndex}`);
    const previewContainer = uploadContainer.querySelector(`#imagePreviewContainer_${requirementIndex}`);

    if (fileInput) {
        fileInput.addEventListener("change", async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;

            for (const file of files) {
                await uploadImageForRequirement(requirementIndex, file, previewContainer);
            }

            // Reset input to allow re-uploading same file
            fileInput.value = '';
        });
    }
}

async function uploadImageForRequirement(requirementIndex, file, previewContainer) {
    // Show loader
    const loader = showLoader(`Uploading ${file.name}...`);

    try {
        if (!authToken && !isGuestMode) {
            showNotification("🔐 Please login to upload images", "error");
            return;
        }

        const formData = new FormData();
        formData.append('image', file);
        formData.append('requirement_id', `req_${requirementIndex}`);

        // Don't set Content-Type header - let browser handle it
        const data = await fetchWithAuth('/api/upload_requirement_image', {
            method: "POST",
            body: formData
            // No headers here - fetchWithAuth will handle it
        });

        if (data.success) {
            // Initialize uploadedImages for this requirement if not exists
            if (!uploadedImages[requirementIndex]) {
                uploadedImages[requirementIndex] = [];
            }

            uploadedImages[requirementIndex].push({
                id: data.image_id,
                url: data.url,
                filename: data.filename,
                file: file
            });

            // Add preview
            addImagePreview(requirementIndex, previewContainer, file, data.url, data.image_id);

            showNotification(`✅ Uploaded ${file.name}`, "success");
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (error) {
        console.error("❌ Image upload error:", error);
        showNotification(`❌ Failed to upload ${file.name}: ${error.message}`, "error");
    } finally {
        hideLoader();
    }
}

function addImagePreview(requirementIndex, previewContainer, file, imageUrl, imageId) {
    const preview = document.createElement("div");
    preview.style.cssText = `
        position: relative;
        width: 100px;
        height: 100px;
        border-radius: 6px;
        overflow: hidden;
        border: 2px solid #00e0ff;
        background: #1a1a2a;
        flex-shrink: 0;
    `;

    // Use the full URL with python_host
    const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${python_host}${imageUrl}`;

    const img = document.createElement("img");
    img.src = fullImageUrl || URL.createObjectURL(file);
    img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
    `;
    // Add onerror handler for debugging
    img.onerror = function() {
        console.error('❌ Failed to load image:', fullImageUrl);
        // Try loading with the original URL as fallback
        if (this.src !== imageUrl) {
            this.src = imageUrl;
        }
    };
    img.onload = function() {
        console.log('✅ Image loaded successfully:', fullImageUrl);
    };
    preview.appendChild(img);

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "×";
    deleteBtn.style.cssText = `
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(255,68,68,0.9);
        border: none;
        color: #fff;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
    `;
    deleteBtn.title = "Remove image";

    deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm("Remove this image?")) {
            await deleteImage(requirementIndex, imageId, preview);
        }
    });

    preview.appendChild(deleteBtn);
    previewContainer.appendChild(preview);
}

async function deleteImage(requirementIndex, imageId, previewElement) {
    try {
        if (!authToken) {
            showNotification("🔐 Please login to delete images", "error");
            return;
        }

        const data = await fetchWithAuth(`/api/delete_requirement_image/${imageId}`, {
            method: "DELETE"
        });

        if (data.success) {
            // Remove from uploadedImages
            if (uploadedImages[requirementIndex]) {
                uploadedImages[requirementIndex] = uploadedImages[requirementIndex].filter(
                    img => img.id !== imageId
                );
                if (uploadedImages[requirementIndex].length === 0) {
                    delete uploadedImages[requirementIndex];
                }
            }

            // Remove preview element
            if (previewElement && previewElement.parentNode) {
                previewElement.parentNode.removeChild(previewElement);
            }

            showNotification("✅ Image removed", "success");
        } else {
            throw new Error(data.error || 'Delete failed');
        }
    } catch (error) {
        console.error("❌ Image delete error:", error);
        showNotification(`❌ Failed to delete image: ${error.message}`, "error");
    }
}

})();