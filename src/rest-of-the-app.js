// Application State
const AppState = {
    selectedCases: [],
    currentScramble: null,
    timerState: 'idle', // idle, preparing, running
    timerStart: 0,
    timerElapsed: 0,
    holdStart: 0,
    trainingJSONs: {}, // Multiple training JSONs: { name: data }
    activeTrainingJSON: null, // Currently selected training JSON
    developingJSONs: {}, // Multiple developing JSONs for JSON creator
    activeDevelopingJSON: 'default', // Currently selected root in JSON creator
    settings: {
        visualizationSize: 200
    }
};

// Default algset structure
const DEFAULT_ALGSET = {
    "New Folder": {
        "icon": "RRRRRRRRRRRRRRRRRRRRRRRR",
        "New Folder": {
            "icon": "RRRRRRRRRRRRRRRRRRRRRRRR",
            "New Case": {
                "icon": "RRRRRRRRRRRRRRRRRRRRRRRR",
                "caseName": "New Case",
                "inputTop": ["RRRRRRRRRRRR"],
                "inputBottom": ["RRRRRRRRRRRR"],
                "equator": { "/": 1, "|": 1 },
                "parity": { "even": 1, "odd": 1 },
                "constraints": {},
                "abf": { "U0-D0": 1 },
                "rul": {},
                "rdl": {},
                "rblSpecific": [],
                "caseWeight": 1,
                "hint": "",
                "alg": "",
                "comment": ""
            }
        }
    }
};

// Load training JSONs from localStorage
function loadTrainingJSONs() {
    const saved = localStorage.getItem('sq1TrainingJSONs');
    if (saved) {
        try {
            AppState.trainingJSONs = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading training JSONs:', e);
            AppState.trainingJSONs = {};
        }
    }

    const activeJSON = localStorage.getItem('sq1ActiveTrainingJSON');
    if (activeJSON && AppState.trainingJSONs[activeJSON]) {
        AppState.activeTrainingJSON = activeJSON;
    } else if (Object.keys(AppState.trainingJSONs).length > 0) {
        AppState.activeTrainingJSON = Object.keys(AppState.trainingJSONs)[0];
    }
}

// Save training JSONs to localStorage
function saveTrainingJSONs() {
    localStorage.setItem('sq1TrainingJSONs', JSON.stringify(AppState.trainingJSONs));
    if (AppState.activeTrainingJSON) {
        localStorage.setItem('sq1ActiveTrainingJSON', AppState.activeTrainingJSON);
    }
}

// Load developing JSONs from localStorage
function loadDevelopingJSONs() {
    const saved = localStorage.getItem('sq1DevelopingJSONs');
    if (saved) {
        try {
            AppState.developingJSONs = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading developing JSONs:', e);
            AppState.developingJSONs = { 'default': DEFAULT_ALGSET };
        }
    } else {
        AppState.developingJSONs = { 'default': DEFAULT_ALGSET };
    }

    const activeRoot = localStorage.getItem('sq1ActiveDevelopingJSON');
    if (activeRoot && AppState.developingJSONs[activeRoot]) {
        AppState.activeDevelopingJSON = activeRoot;
    }
}

// Save developing JSONs to localStorage
function saveDevelopingJSONs() {
    localStorage.setItem('sq1DevelopingJSONs', JSON.stringify(AppState.developingJSONs));
    localStorage.setItem('sq1ActiveDevelopingJSON', AppState.activeDevelopingJSON);
}

// Load selected cases from localStorage
function loadSelectedCases() {
    const saved = localStorage.getItem('sq1SelectedCases');
    if (saved) {
        try {
            AppState.selectedCases = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading selected cases:', e);
            AppState.selectedCases = [];
        }
    }
}

// Save selected cases to localStorage
function saveSelectedCases() {
    localStorage.setItem('sq1SelectedCases', JSON.stringify(AppState.selectedCases));
}

// Initialize app
function initApp() {
    loadTrainingJSONs();
    loadDevelopingJSONs();
    loadSelectedCases();
    renderApp();
    setupEventListeners();
    if (AppState.selectedCases.length > 0) {
        generateNewScramble();
    }
}

// Render main app structure
function renderApp() {
    const app = document.getElementById('app');
    app.innerHTML = `
                <div class="top-navbar">
                    <div class="nav-left">
                        <button class="nav-button primary" id="selectCasesBtn">Select Cases</button>
                        <span class="case-count" id="caseCount">${AppState.selectedCases.length} case(s) selected${AppState.activeTrainingJSON ? ` - ${AppState.activeTrainingJSON}` : ''}</span>
                    </div>
                    <div class="nav-right">
                        <button class="nav-button" id="prevScrambleBtn">← Previous</button>
                        <button class="nav-button" id="nextScrambleBtn">Next →</button>
                        <button class="nav-button" id="settingsBtn">⚙️ Settings</button>
                    </div>
                </div>

                <div class="scramble-bar" style="cursor: pointer;" onclick="openScrambleDetailModal()">
    <div class="scramble-text" id="scrambleDisplay">
        ${AppState.currentScramble && AppState.currentScramble.scramble ? AppState.currentScramble.scramble : 'No scramble generated'}
    </div>
</div>

                <div class="main-content">
                    <div class="timer-zone" id="timerZone">
                        <div class="timer-display" id="timerDisplay">0.000</div>
                    </div>

                    ${AppState.currentScramble ? `
                        <div class="scramble-viz" id="scrambleViz">
                            ${generateVisualization(AppState.currentScramble.hexState)}
                        </div>
                    ` : ''}
                </div>
            `;
    setupEventListeners();
}

// Generate visualization from hex state
function generateVisualization(hexState) {
    if (typeof window.Square1VisualizerLibraryWithSillyNames !== 'undefined') {
        const colors = {
            topColor: '#000000',
            bottomColor: '#FFFFFF',
            frontColor: '#CC0000',
            rightColor: '#00AA00',
            backColor: '#FF8C00',
            leftColor: '#0066CC',
            dividerColor: '#7a0000',
            circleColor: 'transparent'
        };
        return window.Square1VisualizerLibraryWithSillyNames.visualizeFromHexCodePlease(
            hexState,
            AppState.settings.visualizationSize,
            colors,
            5
        );
    }
    return '<div style="color: #888;">Visualization unavailable</div>';
}

// Generate new scramble from selected cases
function generateNewScramble() {
    if (AppState.selectedCases.length === 0) {
        AppState.currentScramble = null;
        renderApp();
        return;
    }

    const randomCase = AppState.selectedCases[Math.floor(Math.random() * AppState.selectedCases.length)];
    
    try {
        // Convert case format to config format
        const config = {
            topLayer: Array.isArray(randomCase.inputTop) ? randomCase.inputTop[0] : randomCase.inputTop,
            bottomLayer: Array.isArray(randomCase.inputBottom) ? randomCase.inputBottom[0] : randomCase.inputBottom,
            middleLayer: randomCase.equator ? (typeof randomCase.equator === 'object' ? Object.keys(randomCase.equator).filter(k => randomCase.equator[k] > 0) : (Array.isArray(randomCase.equator) ? randomCase.equator : [randomCase.equator])) : ['/'],
            RUL: Array.isArray(randomCase.rul) ? randomCase.rul : (typeof randomCase.rul === 'object' ? Object.keys(randomCase.rul).map(Number) : [0]),
            RDL: Array.isArray(randomCase.rdl) ? randomCase.rdl : (typeof randomCase.rdl === 'object' ? Object.keys(randomCase.rdl).map(Number) : [0]),
            AUF: Array.isArray(randomCase.auf) ? randomCase.auf : (typeof randomCase.auf === 'object' ? Object.keys(randomCase.auf) : ['U0']),
            ADF: Array.isArray(randomCase.adf) ? randomCase.adf : (typeof randomCase.adf === 'object' ? Object.keys(randomCase.adf) : ['D0']),
            constraints: randomCase.constraints || {},
            parity: Array.isArray(randomCase.parity) ? randomCase.parity : (typeof randomCase.parity === 'object' ? Object.keys(randomCase.parity).filter(k => randomCase.parity[k] > 0) : [randomCase.parity || 'on'])
        };

        if (config.RUL.length === 0) config.RUL = [0];
        if (config.RDL.length === 0) config.RDL = [0];
        if (config.AUF.length === 0) config.AUF = ['U0'];
        if (config.ADF.length === 0) config.ADF = ['D0'];
        if (config.middleLayer.length === 0) config.middleLayer = ['/'];

        console.log('Config:', config);
        const result = generateHexState(config);
        console.log('Generated hex result:', result);
        
        // Generate scramble using solver
        let scramble = '';
        try {
            if (typeof window.Square1Solver !== 'undefined' && typeof window.Square1Solver.solve === 'function') {
                scramble = window.Square1Solver.solve(result.hexState);
            } else {
                scramble = 'Solver not available';
            }
        } catch (solverError) {
            console.error('Solver error:', solverError);
            scramble = 'Solver error: ' + solverError.message;
        }
        
        AppState.currentScramble = { 
            ...result, 
            caseName: randomCase.caseName, 
            alg: randomCase.alg || '',
            scramble: scramble
        };
        renderApp();
    } catch (error) {
        console.error('Error generating scramble:', error);
        AppState.currentScramble = { 
            hexState: 'Error generating scramble', 
            scramble: 'Error: ' + error.message,
            caseName: randomCase.caseName
        };
        renderApp();
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('selectCasesBtn').addEventListener('click', openCaseSelectionModal);
    document.getElementById('prevScrambleBtn').addEventListener('click', () => {
        // For now, just generate a new scramble
        generateNewScramble();
    });
    document.getElementById('nextScrambleBtn').addEventListener('click', generateNewScramble);
    document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);

    const timerZone = document.getElementById('timerZone');
    timerZone.addEventListener('mousedown', handleTimerMouseDown);
    timerZone.addEventListener('mouseup', handleTimerMouseUp);
    timerZone.addEventListener('touchstart', handleTimerTouchStart);
    timerZone.addEventListener('touchend', handleTimerTouchEnd);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
}

// Timer handlers
let spacePressed = false;

function handleTimerMouseDown() {
    if (AppState.timerState === 'idle') {
        AppState.timerState = 'preparing';
        AppState.holdStart = Date.now();
        updateTimerDisplay();
    }
}

function handleTimerMouseUp() {
    if (AppState.timerState === 'preparing') {
        const holdDuration = Date.now() - AppState.holdStart;
        if (holdDuration >= 200) {
            startTimer();
        } else {
            AppState.timerState = 'idle';
            updateTimerDisplay();
        }
    } else if (AppState.timerState === 'running') {
        stopTimer();
    }
}

function handleTimerTouchStart(e) {
    e.preventDefault();
    handleTimerMouseDown();
}

function handleTimerTouchEnd(e) {
    e.preventDefault();
    handleTimerMouseUp();
}

function handleKeyDown(e) {
    if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (!spacePressed) {
            spacePressed = true;
            if (AppState.timerState === 'idle') {
                AppState.timerState = 'preparing';
                AppState.holdStart = Date.now();
                updateTimerDisplay();
            }
        }
    }
}

function handleKeyUp(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        if (spacePressed) {
            spacePressed = false;
            if (AppState.timerState === 'preparing') {
                const holdDuration = Date.now() - AppState.holdStart;
                if (holdDuration >= 200) {
                    startTimer();
                } else {
                    AppState.timerState = 'idle';
                    updateTimerDisplay();
                }
            } else if (AppState.timerState === 'running') {
                stopTimer();
            }
        }
    }
}

function startTimer() {
    AppState.timerState = 'running';
    AppState.timerStart = Date.now();
    AppState.timerElapsed = 0;
    updateTimerDisplay();
    requestAnimationFrame(updateTimer);
}

function stopTimer() {
    AppState.timerState = 'idle';
    updateTimerDisplay();
    generateNewScramble();
}

function updateTimer() {
    if (AppState.timerState === 'running') {
        AppState.timerElapsed = Date.now() - AppState.timerStart;
        updateTimerDisplay();
        requestAnimationFrame(updateTimer);
    }
}

function updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    if (!display) return;

    display.className = 'timer-display';

    if (AppState.timerState === 'preparing') {
        const holdDuration = Date.now() - AppState.holdStart;
        if (holdDuration >= 200) {
            display.classList.add('ready');
        } else {
            display.classList.add('preparing');
        }
    } else if (AppState.timerState === 'running') {
        const seconds = (AppState.timerElapsed / 1000).toFixed(3);
        display.textContent = seconds;
    } else {
        display.textContent = '0.000';
    }
}

// Case selection modal
// Case selection modal
function openCaseSelectionModal() {
    if (Object.keys(AppState.trainingJSONs).length === 0) {
        alert('Please import a training JSON first from Settings');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';

    const trainingJSONNames = Object.keys(AppState.trainingJSONs);
    const tabs = trainingJSONNames.map((name, idx) =>
        `<button class="nav-button ${name === AppState.activeTrainingJSON ? 'primary' : ''}" onclick="switchTrainingTab('${name}')" id="tab-${name}" style="margin-right: 8px;">${name}</button>`
    ).join('');

    modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Select Cases</h2>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                    </div>
                    <div style="padding: 12px 20px; background: #252525; border-bottom: 1px solid #404040;">
                        <div id="trainingTabs">${tabs}</div>
                    </div>
                    <div class="modal-body">
                        <div class="tree-view" id="caseTree"></div>
                        <div class="button-group">
                            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                            <button class="btn btn-primary" onclick="saveCaseSelection()">Save Selection</button>
                        </div>
                    </div>
                </div>
            `;
    document.body.appendChild(modal);
    renderCaseTree();

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

window.switchTrainingTab = function (name) {
    AppState.activeTrainingJSON = name;
    saveTrainingJSONs();

    // Update tab styles
    const allTabs = document.querySelectorAll('#trainingTabs button');
    allTabs.forEach(tab => {
        if (tab.id === `tab-${name}`) {
            tab.classList.add('primary');
        } else {
            tab.classList.remove('primary');
        }
    });

    renderCaseTree();
};

// Render case tree
function renderCaseTree() {
    const treeContainer = document.getElementById('caseTree');
    if (!treeContainer) return;

    const activeData = AppState.trainingJSONs[AppState.activeTrainingJSON] || {};
    treeContainer.innerHTML = renderTreeNode(activeData, []);
}

function renderTreeNode(node, path) {
    let html = '';

    for (const [key, value] of Object.entries(node)) {
        const currentPath = [...path, key];
        const pathString = currentPath.join('.');
        const isCase = value.caseName !== undefined;
        const hasChildren = !isCase && Object.keys(value).some(k => k !== 'icon');

        if (isCase) {
            const isSelected = AppState.selectedCases.some(c => c._path === pathString);
            html += `
                        <div class="tree-node">
                            <div class="tree-node-header">
                                <span class="tree-toggle"></span>
                                <input type="checkbox" class="tree-checkbox" 
                                    ${isSelected ? 'checked' : ''} 
                                    onchange="toggleCaseSelection('${pathString}', this.checked)"
                                >
                                <span class="tree-label">${value.caseName || key}</span>
                            </div>
                        </div>
                    `;
        } else {
            html += `
                        <div class="tree-node">
                            <div class="tree-node-header" onclick="toggleTreeNode(this)">
                                <span class="tree-toggle">▶</span>
                                <span class="tree-label">${key}</span>
                            </div>
                            <div class="tree-children">
                                ${renderTreeNode(value, currentPath)}
                            </div>
                        </div>
                    `;
        }
    }

    return html;
}

window.toggleTreeNode = function (header) {
    const children = header.nextElementSibling;
    const toggle = header.querySelector('.tree-toggle');

    if (children.classList.contains('expanded')) {
        children.classList.remove('expanded');
        toggle.textContent = '▶';
    } else {
        children.classList.add('expanded');
        toggle.textContent = '▼';
    }
};

window.toggleCaseSelection = function (path, checked) {
    const pathParts = path.split('.');
    const activeData = AppState.trainingJSONs[AppState.activeTrainingJSON];
    let current = activeData;

    for (const part of pathParts) {
        current = current[part];
    }

    if (checked) {
        if (!AppState.selectedCases.some(c => c._path === path)) {
            AppState.selectedCases.push({ ...current, _path: path, _jsonName: AppState.activeTrainingJSON });
        }
    } else {
        AppState.selectedCases = AppState.selectedCases.filter(c => c._path !== path);
    }
};

window.saveCaseSelection = function () {
    saveSelectedCases();
    document.querySelector('.modal').remove();
    document.getElementById('caseCount').textContent = `${AppState.selectedCases.length} case(s) selected`;
    generateNewScramble();
};

// Settings modal
// Settings modal
function openSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Settings</h2>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="settingsMessage"></div>
                        <div class="settings-group">
                            <label class="settings-label">Loaded Training Sets</label>
                            <div id="trainingSetsList" style="background: #1a1a1a; padding: 12px; border-radius: 6px; margin-bottom: 12px; max-height: 200px; overflow-y: auto;">
                                ${Object.keys(AppState.trainingJSONs).length === 0 ?
            '<p style="color: #888;">No training sets loaded</p>' :
            Object.keys(AppState.trainingJSONs).map(name => `
                                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: ${AppState.activeTrainingJSON === name ? '#0066cc' : '#2d2d2d'}; border-radius: 4px; margin-bottom: 8px;">
                                            <span style="color: #e0e0e0;">${name}</span>
                                            <div style="display: flex; gap: 8px;">
                                                ${AppState.activeTrainingJSON !== name ? `<button class="btn btn-secondary" style="padding: 4px 12px; font-size: 12px;" onclick="setActiveTrainingJSON('${name}')">Activate</button>` : '<span style="color: #22c55e; font-size: 12px;">Active</span>'}
                                                <button class="btn btn-secondary" style="padding: 4px 12px; font-size: 12px; background: #991b1b;" onclick="removeTrainingJSON('${name}')">Remove</button>
                                            </div>
                                        </div>
                                    `).join('')
        }
                            </div>
                            <button class="btn btn-primary" onclick="openImportJSONModal()">Import Training JSON</button>
                        </div>
                        <div class="button-group">
                            <button class="btn btn-secondary" onclick="openJsonCreator()">JSON Creator</button>
                            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                        </div>
                    </div>
                </div>
            `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Import JSON modal
window.openImportJSONModal = function () {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Import Training JSON</h2>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="importMessage"></div>
                        <div class="settings-group">
                            <label class="settings-label">JSON Name</label>
                            <input type="text" id="importJSONName" class="settings-input" placeholder="Enter a name for this training set" style="margin-bottom: 12px;">
                        </div>
                        <div class="settings-group">
                            <label class="settings-label">Paste JSON or Drag & Drop File</label>
                            <textarea class="settings-input" id="importJSONInput" placeholder="Paste your JSON here..."
                                ondragover="event.preventDefault();"
                                ondrop="handleJSONFileDrop(event)"
                                style="min-height: 300px; font-family: 'Courier New', monospace;"></textarea>
                        </div>
                        <div class="button-group">
                            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                            <button class="btn btn-primary" onclick="importTrainingJSON()">Import</button>
                        </div>
                    </div>
                </div>
            `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

window.handleJSONFileDrop = function (event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('importJSONInput').value = e.target.result;
            if (!document.getElementById('importJSONName').value) {
                document.getElementById('importJSONName').value = file.name.replace('.json', '');
            }
        };
        reader.readAsText(file);
    }
};

window.importTrainingJSON = function () {
    const name = document.getElementById('importJSONName').value.trim();
    const jsonText = document.getElementById('importJSONInput').value.trim();
    const messageDiv = document.getElementById('importMessage');

    if (!name) {
        messageDiv.innerHTML = '<div class="error-message">Please enter a name for this training set</div>';
        return;
    }

    if (!jsonText) {
        messageDiv.innerHTML = '<div class="error-message">Please paste or drop a JSON file</div>';
        return;
    }

    try {
        const parsed = JSON.parse(jsonText);
        AppState.trainingJSONs[name] = parsed;
        if (!AppState.activeTrainingJSON) {
            AppState.activeTrainingJSON = name;
        }
        saveTrainingJSONs();

        messageDiv.innerHTML = '<div class="success-message">Training JSON imported successfully!</div>';
        setTimeout(() => {
            document.querySelector('.modal').remove();
            openSettingsModal();
        }, 1000);
    } catch (error) {
        messageDiv.innerHTML = `<div class="error-message">Invalid JSON: ${error.message}</div>`;
    }
};

window.setActiveTrainingJSON = function (name) {
    AppState.activeTrainingJSON = name;
    saveTrainingJSONs();
    AppState.selectedCases = [];
    saveSelectedCases();
    document.querySelector('.modal').remove();
    openSettingsModal();
    renderApp();
};

window.removeTrainingJSON = function (name) {
    if (!confirm(`Remove training set "${name}"?`)) return;
    delete AppState.trainingJSONs[name];
    if (AppState.activeTrainingJSON === name) {
        AppState.activeTrainingJSON = Object.keys(AppState.trainingJSONs)[0] || null;
        AppState.selectedCases = [];
        saveSelectedCases();
    }
    saveTrainingJSONs();
    document.querySelector('.modal').remove();
    openSettingsModal();
    renderApp();
};

// Scramble detail modal
function openScrambleDetailModal() {
    if (!AppState.currentScramble || !AppState.currentScramble.hexState) return;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h2>Scramble Details</h2>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 20px;">
                            <h3 style="color: #b0b0b0; font-size: 14px; margin-bottom: 8px;">Case Name</h3>
                            <div style="color: #e0e0e0; font-size: 16px;">${AppState.currentScramble.caseName || 'Unknown Case'}</div>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <h3 style="color: #b0b0b0; font-size: 14px; margin-bottom: 8px;">Hex State</h3>
                            <div style="color: #e0e0e0; font-family: monospace; font-size: 14px;">${AppState.currentScramble.hexState}</div>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <h3 style="color: #b0b0b0; font-size: 14px; margin-bottom: 12px;">Visualization</h3>
                            <div style="display: flex; justify-content: center; background: #1a1a1a; padding: 20px; border-radius: 8px;">
                                ${generateVisualization(AppState.currentScramble.hexState)}
                            </div>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <h3 style="color: #b0b0b0; font-size: 14px; margin-bottom: 8px;">Algorithm</h3>
                            <div style="color: #e0e0e0; font-family: monospace; font-size: 14px; background: #1a1a1a; padding: 12px; border-radius: 6px;">
                                ${AppState.currentScramble.alg || 'No algorithm provided'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// JSON Creator Modal
window.openJsonCreator = function () {
    document.querySelector('.modal').remove();
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
                <div class="modal-content" style="max-width: 1000px;">
                    <div class="modal-header">
                        <h2>JSON Creator</h2>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                    </div>
                    <div class="modal-body" style="display: flex; gap: 20px;">
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <h3 style="margin-bottom: 10px;">Tree Structure</h3>
                            <div id="jsonCreatorTree" style="flex: 1; overflow-y: auto; background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                                <div class="tree-item" data-path="">Root</div>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button class="btn btn-secondary" onclick="addFolderToTree()">Add Folder</button>
                                <button class="btn btn-secondary" onclick="addCaseToTree()">Add Case</button>
                                <button class="btn btn-secondary" onclick="deleteSelectedNode()">Delete Selected</button>
                            </div>
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <h3 style="margin-bottom: 10px;">Edit Selected Item</h3>
                            <div id="jsonCreatorEditor" style="flex: 1; overflow-y: auto; background: #1a1a1a; padding: 15px; border-radius: 8px;">
                                <p style="color: #888;">Select an item from the tree to edit</p>
                            </div>
                        </div>
                    </div>
                    <div style="padding: 20px; border-top: 1px solid #404040; display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button class="btn btn-primary" onclick="exportJsonFromCreator()">Export to Settings</button>
                    </div>
                </div>
            `;
    document.body.appendChild(modal);

    // Initialize creator state
    window.jsonCreatorState = {
        tree: {},
        selectedPath: null
    };

    // Try to load from existing algset
    if (AppState.algsetData && Object.keys(AppState.algsetData).length > 0) {
        window.jsonCreatorState.tree = JSON.parse(JSON.stringify(AppState.algsetData));
        renderJsonCreatorTree();
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

window.addFolderToTree = function () {
    const name = prompt('Enter folder name:');
    if (!name) return;

    const path = window.jsonCreatorState.selectedPath || '';
    const pathArray = path ? path.split('.') : [];

    let current = window.jsonCreatorState.tree;
    for (const p of pathArray) {
        if (!current[p]) current[p] = {};
        current = current[p];
    }

    if (current[name]) {
        alert('Item with this name already exists!');
        return;
    }

    current[name] = {};
    renderJsonCreatorTree();
};

window.addCaseToTree = function () {
    const name = prompt('Enter case name:');
    if (!name) return;

    const path = window.jsonCreatorState.selectedPath || '';
    const pathArray = path ? path.split('.') : [];

    let current = window.jsonCreatorState.tree;
    for (const p of pathArray) {
        if (!current[p]) current[p] = {};
        current = current[p];
    }

    if (current[name]) {
        alert('Item with this name already exists!');
        return;
    }

    current[name] = {
        caseName: name,
        inputTop: "RRRRRRRRRRRR",
        inputBottom: "RRRRRRRRRRRR",
        equator: ["/", "|"],
        parity: ["tpbp"],
        constraints: {},
        auf: ["U0"],
        adf: ["D0"],
        rul: [0],
        rdl: [0],
        alg: ""
    };

    renderJsonCreatorTree();
};

window.deleteSelectedNode = function () {
    if (!window.jsonCreatorState.selectedPath) {
        alert('Please select an item to delete');
        return;
    }

    if (!confirm('Are you sure you want to delete this item?')) return;

    const pathArray = window.jsonCreatorState.selectedPath.split('.');
    const itemName = pathArray.pop();

    let current = window.jsonCreatorState.tree;
    for (const p of pathArray) {
        current = current[p];
    }

    delete current[itemName];
    window.jsonCreatorState.selectedPath = null;
    renderJsonCreatorTree();
    document.getElementById('jsonCreatorEditor').innerHTML = '<p style="color: #888;">Select an item from the tree to edit</p>';
};

function renderJsonCreatorTree() {
    const treeDiv = document.getElementById('jsonCreatorTree');
    treeDiv.innerHTML = renderJsonTreeNode(window.jsonCreatorState.tree, [], 0);

    // Add click handlers
    treeDiv.querySelectorAll('.tree-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            treeDiv.querySelectorAll('.tree-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            window.jsonCreatorState.selectedPath = item.getAttribute('data-path');
            renderJsonCreatorEditor();
        });
    });
}

function renderJsonTreeNode(node, path, level) {
    let html = '';

    for (const [key, value] of Object.entries(node)) {
        const currentPath = [...path, key].join('.');
        const isCase = value.caseName !== undefined;
        const indent = level * 20;

        if (isCase) {
            html += `<div class="tree-item" data-path="${currentPath}" style="margin-left: ${indent}px; padding: 6px 8px; cursor: pointer; border-radius: 4px; margin-bottom: 4px;">📄 ${key}</div>`;
        } else {
            html += `<div class="tree-item" data-path="${currentPath}" style="margin-left: ${indent}px; padding: 6px 8px; cursor: pointer; border-radius: 4px; margin-bottom: 4px; font-weight: bold;">📁 ${key}</div>`;
            html += renderJsonTreeNode(value, [...path, key], level + 1);
        }
    }

    return html;
}

function renderJsonCreatorEditor() {
    const path = window.jsonCreatorState.selectedPath;
    if (!path) return;

    const pathArray = path.split('.');
    let current = window.jsonCreatorState.tree;

    for (const p of pathArray) {
        current = current[p];
    }

    const isCase = current.caseName !== undefined;
    const editorDiv = document.getElementById('jsonCreatorEditor');

    if (isCase) {
        editorDiv.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <label style="display: block; margin-bottom: 4px; color: #888;">Case Name:</label>
                            <input type="text" id="edit_caseName" value="${current.caseName}" style="width: 100%; padding: 8px; background: #2d2d2d; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 4px; color: #888;">Top Layer (12 chars):</label>
                            <input type="text" id="edit_inputTop" value="${current.inputTop}" style="width: 100%; padding: 8px; background: #2d2d2d; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0; font-family: monospace;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 4px; color: #888;">Bottom Layer (12 chars):</label>
                            <input type="text" id="edit_inputBottom" value="${current.inputBottom}" style="width: 100%; padding: 8px; background: #2d2d2d; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0; font-family: monospace;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 4px; color: #888;">Equator (comma separated: /, |):</label>
                            <input type="text" id="edit_equator" value="${current.equator.join(',')}" style="width: 100%; padding: 8px; background: #2d2d2d; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 4px; color: #888;">Parity (comma separated: tpbp, tpbn, op, on):</label>
                            <input type="text" id="edit_parity" value="${current.parity.join(',')}" style="width: 100%; padding: 8px; background: #2d2d2d; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 4px; color: #888;">AUF (comma separated: U0, U, U2, U'):</label>
                            <input type="text" id="edit_auf" value="${current.auf.join(',')}" style="width: 100%; padding: 8px; background: #2d2d2d; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 4px; color: #888;">ADF (comma separated: D0, D, D2, D'):</label>
                            <input type="text" id="edit_adf" value="${current.adf.join(',')}" style="width: 100%; padding: 8px; background: #2d2d2d; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 4px; color: #888;">RUL (comma separated numbers: 0, 3, -3, 6):</label>
                            <input type="text" id="edit_rul" value="${current.rul.join(',')}" style="width: 100%; padding: 8px; background: #2d2d2d; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 4px; color: #888;">RDL (comma separated numbers: 0, 3, -3, 6):</label>
                            <input type="text" id="edit_rdl" value="${current.rdl.join(',')}" style="width: 100%; padding: 8px; background: #2d2d2d; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 4px; color: #888;">Constraints (JSON object):</label>
                            <textarea id="edit_constraints" style="width: 100%; padding: 8px; background: #2d2d2d; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0; font-family: monospace; min-height: 80px;">${JSON.stringify(current.constraints, null, 2)}</textarea>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 4px; color: #888;">Algorithm:</label>
                            <input type="text" id="edit_alg" value="${current.alg}" style="width: 100%; padding: 8px; background: #2d2d2d; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0;">
                        </div>
                        <button class="btn btn-primary" onclick="saveCaseEdits()" style="margin-top: 8px;">Save Changes</button>
                    </div>
                `;
    } else {
        editorDiv.innerHTML = `
                    <div>
                        <p style="color: #888; margin-bottom: 12px;">This is a folder. You can add cases or subfolders to it.</p>
                        <p style="color: #888;">Folder path: ${path}</p>
                    </div>
                `;
    }
}

window.saveCaseEdits = function () {
    const path = window.jsonCreatorState.selectedPath;
    if (!path) return;

    const pathArray = path.split('.');
    let current = window.jsonCreatorState.tree;

    for (const p of pathArray) {
        current = current[p];
    }

    try {
        current.caseName = document.getElementById('edit_caseName').value;
        current.inputTop = document.getElementById('edit_inputTop').value;
        current.inputBottom = document.getElementById('edit_inputBottom').value;
        current.equator = document.getElementById('edit_equator').value.split(',').map(s => s.trim());
        current.parity = document.getElementById('edit_parity').value.split(',').map(s => s.trim());
        current.auf = document.getElementById('edit_auf').value.split(',').map(s => s.trim());
        current.adf = document.getElementById('edit_adf').value.split(',').map(s => s.trim());
        current.rul = document.getElementById('edit_rul').value.split(',').map(s => s.trim()).map(Number);
        current.rdl = document.getElementById('edit_rdl').value.split(',').map(s => s.trim()).map(Number);
        current.constraints = JSON.parse(document.getElementById('edit_constraints').value);
        current.alg = document.getElementById('edit_alg').value;

        alert('Changes saved!');
        renderJsonCreatorTree();
    } catch (error) {
        alert('Error saving: ' + error.message);
    }
};

window.openJsonCreator = function () {
    document.querySelector('.modal').remove();
    showJsonCreatorFullscreen();
};

// JSON Creator Implementation
class JSONCreator {
    constructor() {
        this.treeData = {};
        this.selectedPath = '';
        this.selectedItem = null;
        this.clipboard = null;
        this.clipboardOperation = '';
        this.expandedFolders = new Set();
        this.contextMenu = null;
    }

    show() {
        // Load current developing JSON
        this.treeData = JSON.parse(JSON.stringify(AppState.developingJSONs[AppState.activeDevelopingJSON] || DEFAULT_ALGSET));

        const fullscreen = document.createElement('div');
        fullscreen.className = 'json-creator-fullscreen';
        fullscreen.id = 'jsonCreatorFullscreen';

        fullscreen.innerHTML = `
                    <div class="json-creator-topbar">
    <h2>JSON Creator</h2>
    <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
        <div style="position: relative; display: flex; align-items: center;">
            <select id="rootSelector" style="background: #3c3c3c; border: 1px solid #555555; color: #cccccc; padding: 4px 32px 4px 8px; border-radius: 2px; appearance: none;">
                ${Object.keys(AppState.developingJSONs).map(root => 
                    `<option value="${root}" ${root === AppState.activeDevelopingJSON ? 'selected' : ''}>${root}</option>`
                ).join('')}
            </select>
            <div style="position: absolute; right: 4px; display: flex; gap: 2px; pointer-events: none;">
                <img src="viz/add.svg" width="14" height="14" style="opacity: 0.7;">
                <img src="viz/rename.svg" width="14" height="14" style="opacity: 0.7;">
                <img src="viz/delete.svg" width="14" height="14" style="opacity: 0.7;">
            </div>
        </div>
        <button class="json-creator-icon-btn" onclick="jsonCreator.addRoot()" title="Add Root">
            <img src="viz/add.svg" width="16" height="16">
        </button>
        <button class="json-creator-icon-btn" onclick="jsonCreator.renameRoot()" title="Rename Root">
            <img src="viz/rename.svg" width="16" height="16">
        </button>
        <button class="json-creator-icon-btn" onclick="jsonCreator.deleteRoot()" title="Delete Root">
            <img src="viz/delete.svg" width="16" height="16">
        </button>
        <button class="json-creator-icon-btn" onclick="jsonCreator.extractJSON()" title="Extract JSON">
            <img src="viz/extract.svg" width="16" height="16">
        </button>
        <button class="json-creator-icon-btn" onclick="jsonCreator.runJSON()" title="Run">
            <img src="viz/run.svg" width="16" height="16">
        </button>
        <button class="json-creator-icon-btn" onclick="jsonCreator.close()" title="Quit" style="background: #d32f2f;">
            <img src="viz/exit.svg" width="16" height="16">
        </button>
    </div>
</div>
                    <div class="json-creator-main">
                        <div class="json-creator-sidebar" id="jsonCreatorSidebar">
                            <div class="json-creator-toolbar">
                                <button class="json-creator-toolbar-btn" onclick="jsonCreator.newCase()" title="New Case">
                                    <img src="viz/new-case.svg" width="18" height="18">
                                </button>
                                <button class="json-creator-toolbar-btn" onclick="jsonCreator.newFolder()" title="New Folder">
                                    <img src="viz/new-folder.svg" width="18" height="18">
                                </button>
                                <button class="json-creator-toolbar-btn" onclick="jsonCreator.copy()" title="Copy">
                                    <img src="viz/copy.svg" width="18" height="18">
                                </button>
                                <button class="json-creator-toolbar-btn" onclick="jsonCreator.paste()" title="Paste">
                                    <img src="viz/paste.svg" width="18" height="18">
                                </button>
                                <button class="json-creator-toolbar-btn" onclick="jsonCreator.delete()" title="Delete">
                                    <img src="viz/delete.svg" width="18" height="18">
                                </button>
                            </div>
                            <div class="json-creator-tree" id="jsonCreatorTree"></div>
                        </div>
                        <div class="json-creator-content">
                            <div class="json-creator-content-header">
                                <h3 id="jsonCreatorTitle">JSON Creator</h3>
                                <p id="jsonCreatorSubtitle">Select or create an item to begin</p>
                            </div>
                            <div class="json-creator-content-body" id="jsonCreatorBody">
                                <div class="json-creator-welcome">
                                    <h3>Welcome to JSON Creator</h3>
                                    <p>Create and organize your Square-1 algset cases.</p>
                                    <p>Use the toolbar to add folders and cases.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

        document.body.appendChild(fullscreen);
        this.renderTree();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            const fullscreen = document.getElementById('jsonCreatorFullscreen');
            if (!fullscreen) return;

            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'c':
                        e.preventDefault();
                        this.copy();
                        break;
                    case 'v':
                        e.preventDefault();
                        this.paste();
                        break;
                    case 'n':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.newFolder();
                        } else {
                            this.newCase();
                        }
                        break;
                }
            } else if (e.key === 'Delete') {
                e.preventDefault();
                this.delete();
            }
        });

        const rootSelector = document.getElementById('rootSelector');
        if (rootSelector) {
            rootSelector.addEventListener('change', (e) => {
                this.switchRoot(e.target.value);
            });
        }
    }

    renderTree() {
        const container = document.getElementById('jsonCreatorTree');
        if (!container) return;
        container.innerHTML = '';
        this.renderTreeNode(this.treeData, container, '', 0);
    }

    renderTreeNode(node, container, path, level) {
        Object.keys(node).forEach(key => {
            const item = node[key];
            if (typeof item !== 'object' || item === null) return;

            const currentPath = path ? `${path}/${key}` : key;
            const isFolder = !item.caseName;
            const isExpanded = this.expandedFolders.has(currentPath);

            const itemDiv = document.createElement('div');
            itemDiv.className = 'json-creator-tree-item';
            itemDiv.style.paddingLeft = `${level * 16 + 8}px`;
            itemDiv.dataset.path = currentPath;

            if (this.selectedPath === currentPath) {
                itemDiv.classList.add('selected');
            }

            if (isFolder) {
                const expandIcon = document.createElement('div');
                expandIcon.className = 'tree-expand-icon';
                expandIcon.textContent = isExpanded ? '▼' : '▶';
                itemDiv.appendChild(expandIcon);
            } else {
                const spacer = document.createElement('div');
                spacer.style.width = '16px';
                itemDiv.appendChild(spacer);
            }

            const icon = document.createElement('img');
            icon.className = 'tree-icon';
            icon.src = isFolder ? 'viz/folder.svg' : 'viz/case.svg';
            icon.width = 16;
            icon.height = 16;
            itemDiv.appendChild(icon);

            const textSpan = document.createElement('span');
            textSpan.className = 'tree-item-text';
            textSpan.textContent = key;
            itemDiv.appendChild(textSpan);

            const input = document.createElement('input');
            input.className = 'tree-item-input';
            input.value = key;
            itemDiv.appendChild(input);

            itemDiv.onclick = (e) => this.handleItemClick(e, currentPath, item, key);
            itemDiv.ondblclick = (e) => this.startRename(itemDiv, input, key);
            itemDiv.oncontextmenu = (e) => this.showContextMenu(e, currentPath, item, key);

            input.onblur = () => this.finishRename(currentPath, key, itemDiv, input);
            input.onkeydown = (e) => {
                if (e.key === 'Enter') input.blur();
                if (e.key === 'Escape') { input.value = key; input.blur(); }
                e.stopPropagation();
            };

            container.appendChild(itemDiv);

            if (isFolder && isExpanded) {
                this.renderTreeNode(item, container, currentPath, level + 1);
            }
        });
    }

    handleItemClick(e, path, item, key) {
        e.stopPropagation();

        if (!item.caseName) {
            if (this.selectedPath === path) {
                this.toggleFolder(path);
            } else {
                this.selectedPath = path;
                this.selectedItem = item;
                this.renderTree();
                this.showFolderView(key);
            }
        } else {
            this.selectedPath = path;
            this.selectedItem = item;
            this.renderTree();
            this.showCaseEditor(item, key);
        }
    }

    toggleFolder(path) {
        if (this.expandedFolders.has(path)) {
            this.expandedFolders.delete(path);
        } else {
            this.expandedFolders.add(path);
        }
        this.renderTree();
    }

    startRename(itemDiv, input, currentName) {
        itemDiv.classList.add('editing');
        input.value = currentName;
        input.focus();
        input.select();
    }

    finishRename(path, originalName, itemDiv, input) {
        itemDiv.classList.remove('editing');
        const newName = input.value.trim();
        if (!newName || newName === originalName) return;

        const pathParts = path.split('/');
        pathParts.pop();
        let parent = this.treeData;
        pathParts.forEach(part => parent = parent[part]);

        if (parent[newName]) {
            alert('An item with this name already exists');
            return;
        }

        const item = parent[originalName];
        delete parent[originalName];
        parent[newName] = item;

        if (item.caseName) {
            item.caseName = newName;
        }

        this.renderTree();
    }

    newCase() {
        const parent = this.getTargetFolder();
        const name = this.getUniqueName(parent, 'New Case');

        parent[name] = {
            caseName: name,
            inputTop: ['RRRRRRRRRRRR'],
            inputBottom: ['RRRRRRRRRRRR'],
            equator: { '/': 1, '|': 1 },
            parity: ['on'],
            constraints: {},
            auf: ['U0'],
            adf: ['D0'],
            rul: [0],
            rdl: [0],
            alg: ''
        };

        this.renderTree();

        // Auto-start rename
        setTimeout(() => {
            const newPath = this.selectedPath ? `${this.selectedPath}/${name}` : name;
            const itemDiv = document.querySelector(`[data-path="${newPath}"]`);
            if (itemDiv) {
                const input = itemDiv.querySelector('.tree-item-input');
                this.startRename(itemDiv, input, name);
            }
        }, 100);
    }

    newFolder() {
        const parent = this.getTargetFolder();
        const name = this.getUniqueName(parent, 'New Folder');
        parent[name] = {};
        this.renderTree();

        // Auto-start rename
        setTimeout(() => {
            const newPath = this.selectedPath ? `${this.selectedPath}/${name}` : name;
            const itemDiv = document.querySelector(`[data-path="${newPath}"]`);
            if (itemDiv) {
                const input = itemDiv.querySelector('.tree-item-input');
                this.startRename(itemDiv, input, name);
            }
        }, 100);
    }

    getTargetFolder() {
        if (!this.selectedPath) return this.treeData;

        const pathParts = this.selectedPath.split('/');
        let current = this.treeData;

        for (const part of pathParts) {
            current = current[part];
        }

        if (current.caseName) {
            pathParts.pop();
            current = this.treeData;
            for (const part of pathParts) {
                current = current[part];
            }
        }

        return current;
    }

    getUniqueName(parent, baseName) {
        let name = baseName;
        let counter = 1;
        while (parent[name]) {
            name = `${baseName} ${counter}`;
            counter++;
        }
        return name;
    }

    copy() {
        if (!this.selectedItem) return;
        const name = this.selectedPath.split('/').pop();
        this.clipboard = {
            item: JSON.parse(JSON.stringify(this.selectedItem)),
            name: name
        };
        this.clipboardOperation = 'copy';
    }

    paste() {
        if (!this.clipboard) return;

        const parent = this.getTargetFolder();
        const name = this.getUniqueName(parent, this.clipboard.name);
        parent[name] = JSON.parse(JSON.stringify(this.clipboard.item));

        if (parent[name].caseName) {
            parent[name].caseName = name;
        }

        this.renderTree();
    }

    delete() {
        if (!this.selectedPath) return;

        const confirm = window.confirm(`Delete "${this.selectedPath.split('/').pop()}"?`);
        if (!confirm) return;

        const pathParts = this.selectedPath.split('/');
        const itemName = pathParts.pop();
        let parent = this.treeData;
        pathParts.forEach(part => parent = parent[part]);

        delete parent[itemName];
        this.selectedPath = '';
        this.selectedItem = null;
        this.renderTree();
        this.showWelcome();
    }

    showWelcome() {
        const body = document.getElementById('jsonCreatorBody');
        const title = document.getElementById('jsonCreatorTitle');
        const subtitle = document.getElementById('jsonCreatorSubtitle');

        title.textContent = 'JSON Creator';
        subtitle.textContent = 'Select or create an item to begin';
        body.innerHTML = `
                    <div class="json-creator-welcome">
                        <h3>Welcome to JSON Creator</h3>
                        <p>Create and organize your Square-1 algset cases.</p>
                        <p>Use the toolbar to add folders and cases.</p>
                    </div>
                `;
    }

    showFolderView(name) {
        const title = document.getElementById('jsonCreatorTitle');
        const subtitle = document.getElementById('jsonCreatorSubtitle');
        const body = document.getElementById('jsonCreatorBody');

        title.textContent = `Folder: ${name}`;
        subtitle.textContent = 'Contains cases and subfolders';
        body.innerHTML = `
                    <div class="json-creator-welcome">
                        <h3>${name}</h3>
                        <p>This is a folder. Use the toolbar to add cases or subfolders.</p>
                    </div>
                `;
    }

    showCaseEditor(item, name) {
        const title = document.getElementById('jsonCreatorTitle');
        const subtitle = document.getElementById('jsonCreatorSubtitle');
        const body = document.getElementById('jsonCreatorBody');

        title.textContent = `Case: ${name}`;
        subtitle.textContent = 'Configure case parameters';

        // Initialize arrays if they don't exist
        if (!item.auf) item.auf = ['U0'];
        if (!item.adf) item.adf = ['D0'];
        if (!item.rul) item.rul = [0];
        if (!item.rdl) item.rdl = [0];
        if (!item.constraints) item.constraints = {};

        body.innerHTML = `
                    <div class="json-creator-section">
                        <h4>Basic Information</h4>
                        <div class="json-creator-form-group">
                            <label>Case Name</label>
                            <input type="text" value="${item.caseName}" onchange="jsonCreator.updateField('caseName', this.value)">
                        </div>
                        <div class="json-creator-form-group">
                            <label>Algorithm</label>
                            <textarea onchange="jsonCreator.updateField('alg', this.value)">${item.alg || ''}</textarea>
                        </div>
                    </div>

                    <div class="json-creator-section">
                        <h4>Shape Input</h4>
                        <div class="json-creator-form-group">
                            <label>Top Layer (12 chars)</label>
                            <input type="text" maxlength="12" value="${item.inputTop[0] || 'RRRRRRRRRRRR'}" 
                                   onchange="jsonCreator.updateField('inputTop', [this.value])" style="font-family: monospace;">
                        </div>
                        <div class="json-creator-form-group">
                            <label>Bottom Layer (12 chars)</label>
                            <input type="text" maxlength="12" value="${item.inputBottom[0] || 'RRRRRRRRRRRR'}" 
                                   onchange="jsonCreator.updateField('inputBottom', [this.value])" style="font-family: monospace;">
                        </div>
                    </div>

                    <div class="json-creator-section">
                        <h4>Constraints</h4>
                        <div class="json-creator-form-group">
                            <label>Position (e.g., A, BC, D)</label>
                            <input type="text" id="constraintPosition" placeholder="Enter position...">
                        </div>
                        <div class="json-creator-form-group">
                            <label>Allowed Pieces (comma-separated)</label>
                            <input type="text" id="constraintValues" placeholder="e.g., 1,3,5,7">
                        </div>
                        <button class="json-creator-btn" onclick="jsonCreator.addConstraint()">Add Constraint</button>
                        <div id="constraintsList" style="margin-top: 10px;">
                            ${Object.entries(item.constraints || {}).map(([pos, vals]) => `
                                <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; padding: 4px; background: #3c3c3c; border-radius: 2px;">
                                    <span style="color: #cccccc; font-size: 12px;">${pos}: ${vals.join(', ')}</span>
                                    <button onclick="jsonCreator.removeConstraint('${pos}')" style="background: #d32f2f; border: none; color: white; padding: 2px 8px; border-radius: 2px; cursor: pointer; font-size: 11px;">Remove</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="json-creator-section">
                        <h4>Equator</h4>
                        <div class="json-creator-grid">
                            <div class="json-creator-grid-item">
                                <input type="checkbox" ${item.equator['/'] > 0 ? 'checked' : ''} 
                                       onchange="jsonCreator.updateEquator('/', this.checked ? 1 : 0)">
                                <label>Slash (/)</label>
                            </div>
                            <div class="json-creator-grid-item">
                                <input type="checkbox" ${item.equator['|'] > 0 ? 'checked' : ''} 
                                       onchange="jsonCreator.updateEquator('|', this.checked ? 1 : 0)">
                                <label>Bar (|)</label>
                            </div>
                        </div>
                    </div>

                    <div class="json-creator-section">
                        <h4>Parity (6 modes)</h4>
                        <div class="json-creator-grid">
                            ${['tnbn', 'tpbn', 'tnbp', 'tpbp', 'on', 'op'].map(mode => {
            const labels = {
                'tnbn': 'tnbn (Top Normal, Bottom Normal)',
                'tpbn': 'tpbn (Top Parity, Bottom Normal)',
                'tnbp': 'tnbp (Top Normal, Bottom Parity)',
                'tpbp': 'tpbp (Top Parity, Bottom Parity)',
                'on': 'on (Overall Normal)',
                'op': 'op (Overall Parity)'
            };
            return `
                                <div class="json-creator-grid-item">
                                    <input type="checkbox" ${Array.isArray(item.parity) && item.parity.includes(mode) ? 'checked' : ''} 
                                           onchange="jsonCreator.updateMoveArray('parity', '${mode}', this.checked)">
                                    <label>${labels[mode]}</label>
                                </div>
                            `}).join('')}
                        </div>
                    </div>

                    <div class="json-creator-section">
                        <h4>AUF (Adjust U Face)</h4>
                        <div class="json-creator-grid">
                            ${['U0', 'U', 'U2', "U'"].map(move => `
                                <div class="json-creator-grid-item">
                                    <input type="checkbox" ${item.auf.includes(move) ? 'checked' : ''} 
                                           onchange="jsonCreator.updateMoveArray('auf', '${move}', this.checked)">
                                    <label>${move}</label>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="json-creator-section">
                        <h4>ADF (Adjust D Face)</h4>
                        <div class="json-creator-grid">
                            ${['D0', 'D', 'D2', "D'"].map(move => `
                                <div class="json-creator-grid-item">
                                    <input type="checkbox" ${item.adf.includes(move) ? 'checked' : ''} 
                                           onchange="jsonCreator.updateMoveArray('adf', '${move}', this.checked)">
                                    <label>${move}</label>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="json-creator-section">
                        <h4>RUL (Rotate Upper Layer)</h4>
                        <div class="json-creator-grid">
                            ${[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(val => `
                                <div class="json-creator-grid-item">
                                    <input type="checkbox" ${item.rul.includes(val) ? 'checked' : ''} 
                                           onchange="jsonCreator.updateNumberArray('rul', ${val}, this.checked)">
                                    <label>${val}</label>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="json-creator-section">
                        <h4>RDL (Rotate Down Layer)</h4>
                        <div class="json-creator-grid">
                            ${[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(val => `
                                <div class="json-creator-grid-item">
                                    <input type="checkbox" ${item.rdl.includes(val) ? 'checked' : ''} 
                                           onchange="jsonCreator.updateNumberArray('rdl', ${val}, this.checked)">
                                    <label>${val}</label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
    }

    updateField(field, value) {
        if (this.selectedItem) {
            this.selectedItem[field] = value;
        }
    }

    updateEquator(symbol, value) {
        if (this.selectedItem) {
            this.selectedItem.equator[symbol] = value;
        }
    }

    updateParity(type, value) {
        if (this.selectedItem) {
            this.selectedItem.parity[type] = value;
        }
    }

    updateParityMode(mode, value) {
        if (this.selectedItem) {
            if (!Array.isArray(this.selectedItem.parity)) {
                this.selectedItem.parity = [];
            }
            if (value) {
                if (!this.selectedItem.parity.includes(mode)) {
                    this.selectedItem.parity.push(mode);
                }
            } else {
                this.selectedItem.parity = this.selectedItem.parity.filter(m => m !== mode);
            }
        }
    }

    updateMoveArray(field, move, checked) {
        if (this.selectedItem) {
            if (!Array.isArray(this.selectedItem[field])) {
                this.selectedItem[field] = [];
            }
            if (checked) {
                if (!this.selectedItem[field].includes(move)) {
                    this.selectedItem[field].push(move);
                }
            } else {
                this.selectedItem[field] = this.selectedItem[field].filter(m => m !== move);
            }
        }
    }

    updateNumberArray(field, num, checked) {
        if (this.selectedItem) {
            if (!Array.isArray(this.selectedItem[field])) {
                this.selectedItem[field] = [];
            }
            if (checked) {
                if (!this.selectedItem[field].includes(num)) {
                    this.selectedItem[field].push(num);
                }
            } else {
                this.selectedItem[field] = this.selectedItem[field].filter(n => n !== num);
            }
        }
    }

    addConstraint() {
        if (!this.selectedItem) return;

        const posInput = document.getElementById('constraintPosition');
        const valsInput = document.getElementById('constraintValues');

        const position = posInput.value.trim().toUpperCase();
        const values = valsInput.value.trim().split(',').map(v => v.trim().toLowerCase());

        if (!position || !values.length || !values[0]) {
            alert('Please enter both position and values');
            return;
        }

        if (!this.selectedItem.constraints) this.selectedItem.constraints = {};
        this.selectedItem.constraints[position] = values;

        posInput.value = '';
        valsInput.value = '';

        // Refresh the case editor
        this.showCaseEditor(this.selectedItem, this.selectedPath.split('/').pop());
    }

    removeConstraint(position) {
        if (this.selectedItem && this.selectedItem.constraints) {
            delete this.selectedItem.constraints[position];
            // Refresh the case editor
            this.showCaseEditor(this.selectedItem, this.selectedPath.split('/').pop());
        }
    }

    showContextMenu(e, path, item, key) {
        e.preventDefault();
        e.stopPropagation();
        this.hideContextMenu();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;

        const isFolder = !item.caseName;
        const items = [];

        if (isFolder) {
            items.push({ text: 'New Case', action: () => this.newCase() });
            items.push({ text: 'New Folder', action: () => this.newFolder() });
            items.push({ separator: true });
        }

        items.push({ text: 'Rename', action: () => this.renameItem(path) });
        items.push({ text: 'Run', action: () => this.runItem(item, key) });
        items.push({ separator: true });
        items.push({ text: 'Copy', action: () => this.copy() });
        items.push({ text: 'Paste', action: () => this.paste(), disabled: !this.clipboard });
        items.push({ separator: true });
        items.push({ text: 'Delete', action: () => this.delete() });

        items.forEach(item => {
            if (item.separator) {
                const sep = document.createElement('div');
                sep.className = 'context-menu-separator';
                menu.appendChild(sep);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = `context-menu-item ${item.disabled ? 'disabled' : ''}`;
                menuItem.textContent = item.text;
                if (!item.disabled) {
                    menuItem.onclick = () => {
                        this.hideContextMenu();
                        item.action();
                    };
                }
                menu.appendChild(menuItem);
            }
        });

        document.body.appendChild(menu);
        this.contextMenu = menu;
    }

    hideContextMenu() {
        if (this.contextMenu) {
            document.body.removeChild(this.contextMenu);
            this.contextMenu = null;
        }
    }

    renameItem(path) {
        setTimeout(() => {
            const itemDiv = document.querySelector(`[data-path="${path}"]`);
            if (itemDiv) {
                const input = itemDiv.querySelector('.tree-item-input');
                const currentName = path.split('/').pop();
                this.startRename(itemDiv, input, currentName);
            }
        }, 50);
    }

    runItem(item, key) {
    this.openRunModal(item, key);
}

    switchRoot(rootName) {
        // Save current root
        AppState.developingJSONs[AppState.activeDevelopingJSON] = this.treeData;
        saveDevelopingJSONs();

        // Switch to new root
        AppState.activeDevelopingJSON = rootName;
        this.treeData = JSON.parse(JSON.stringify(AppState.developingJSONs[rootName]));
        this.selectedPath = '';
        this.selectedItem = null;
        this.renderTree();
        this.showWelcome();
    }

    addRoot() {
        const name = prompt('Enter name for new root:');
        if (!name) return;

        if (AppState.developingJSONs[name]) {
            alert('A root with this name already exists');
            return;
        }

        AppState.developingJSONs[name] = {};
        saveDevelopingJSONs();

        // Update selector
        const selector = document.getElementById('rootSelector');
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        selector.appendChild(option);
        selector.value = name;

        this.switchRoot(name);
    }

    renameRoot() {
        const currentName = AppState.activeDevelopingJSON;
        const newName = prompt(`Rename root "${currentName}" to:`, currentName);

        if (!newName || newName === currentName) return;

        if (AppState.developingJSONs[newName]) {
            alert('A root with this name already exists');
            return;
        }

        AppState.developingJSONs[newName] = AppState.developingJSONs[currentName];
        delete AppState.developingJSONs[currentName];
        AppState.activeDevelopingJSON = newName;
        saveDevelopingJSONs();

        // Update selector
        const selector = document.getElementById('rootSelector');
        const options = Array.from(selector.options);
        const currentOption = options.find(opt => opt.value === currentName);
        if (currentOption) {
            currentOption.value = newName;
            currentOption.textContent = newName;
            selector.value = newName;
        }
    }

    deleteRoot() {
        const currentName = AppState.activeDevelopingJSON;
        
        if (Object.keys(AppState.developingJSONs).length === 1) {
            alert('Cannot delete the last root');
            return;
        }
        
        if (!confirm(`Delete root "${currentName}"?`)) return;

        delete AppState.developingJSONs[currentName];
        AppState.activeDevelopingJSON = Object.keys(AppState.developingJSONs)[0];
        saveDevelopingJSONs();

        // Update selector
        const selector = document.getElementById('rootSelector');
        const options = Array.from(selector.options);
        const currentOption = options.find(opt => opt.value === currentName);
        if (currentOption) {
            selector.removeChild(currentOption);
            selector.value = AppState.activeDevelopingJSON;
        }

        this.switchRoot(AppState.activeDevelopingJSON);
    }
    
    copyJSON() {
        navigator.clipboard.writeText(JSON.stringify(this.treeData, null, 2))
            .then(() => alert('JSON copied to clipboard!'))
            .catch(err => alert('Failed to copy: ' + err));
    }

    extractJSON() {
        const jsonString = JSON.stringify(this.treeData, null, 2);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Extract JSON: ${AppState.activeDevelopingJSON}</h2>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <textarea readonly style="width: 100%; min-height: 400px; font-family: 'Courier New', monospace; background: #1a1a1a; color: #e0e0e0; border: 1px solid #404040; border-radius: 6px; padding: 12px;">${jsonString}</textarea>
                    <div class="button-group" style="margin-top: 12px;">
                        <button class="btn btn-primary" onclick="navigator.clipboard.writeText(this.closest('.modal-body').querySelector('textarea').value).then(() => alert('JSON copied to clipboard!'))">Copy JSON</button>
                        <button class="btn btn-primary" onclick="(() => {
                            const json = this.closest('.modal-body').querySelector('textarea').value;
                            const blob = new Blob([json], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = '${AppState.activeDevelopingJSON}.json';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        })()">Download JSON</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    runJSON() {
    this.openRunModal(this.treeData, AppState.activeDevelopingJSON);
}

    openRunModal(jsonData, name) {
    const modal = document.createElement('div');
    modal.className = 'run-modal';
    modal.innerHTML = `
        <div class="run-modal-content">
            <div class="run-modal-header">
                <h2>Running: ${name}</h2>
                <button class="close-btn" onclick="this.closest('.run-modal').remove()">×</button>
            </div>
            <div class="run-modal-progress">
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" id="runProgressBar" style="width: 0%"></div>
                    <div class="progress-text" id="runProgressText">0 / 100</div>
                </div>
                <button class="stop-button" id="stopRunButton">Stop</button>
            </div>
            <div class="run-modal-body" id="runResultsContainer"></div>
        </div>
    `;
    document.body.appendChild(modal);

    let stopped = false;
    const stopButton = document.getElementById('stopRunButton');
    stopButton.onclick = () => {
        stopped = true;
        stopButton.disabled = true;
        stopButton.textContent = 'Stopped';
    };

    // Wrap single case in an object structure if needed
    const dataToRun = jsonData.caseName ? { [name]: jsonData } : jsonData;
    this.generateScrambles(dataToRun, modal, () => stopped);
}

async generateScrambles(jsonData, modal, isStopped) {
    const resultsContainer = document.getElementById('runResultsContainer');
    const progressBar = document.getElementById('runProgressBar');
    const progressText = document.getElementById('runProgressText');
    
    // Collect all cases
    const cases = [];
    const collectCases = (obj, path = []) => {
        for (const [key, value] of Object.entries(obj)) {
            if (value && typeof value === 'object') {
                if (value.caseName) {
                    cases.push({ ...value, path: [...path, key].join(' > ') });
                } else {
                    collectCases(value, [...path, key]);
                }
            }
        }
    };
    collectCases(jsonData);

    if (cases.length === 0) {
        resultsContainer.innerHTML = '<div style="color: #888; text-align: center; padding: 40px;">No cases found in this JSON</div>';
        return;
    }

    const totalScrambles = 100;
    let generated = 0;

    const generateOne = async () => {
        if (isStopped() || generated >= totalScrambles) {
            return;
        }

        try {
            const randomCase = cases[Math.floor(Math.random() * cases.length)];
            
            const config = {
                topLayer: Array.isArray(randomCase.inputTop) ? randomCase.inputTop[0] : randomCase.inputTop,
                bottomLayer: Array.isArray(randomCase.inputBottom) ? randomCase.inputBottom[0] : randomCase.inputBottom,
                middleLayer: randomCase.equator ? (typeof randomCase.equator === 'object' ? Object.keys(randomCase.equator).filter(k => randomCase.equator[k] > 0) : randomCase.equator) : ['/'],
                RUL: Array.isArray(randomCase.rul) ? randomCase.rul : [0],
                RDL: Array.isArray(randomCase.rdl) ? randomCase.rdl : [0],
                AUF: Array.isArray(randomCase.auf) ? randomCase.auf : ['U0'],
                ADF: Array.isArray(randomCase.adf) ? randomCase.adf : ['D0'],
                constraints: randomCase.constraints || {},
                parity: Array.isArray(randomCase.parity) ? randomCase.parity : (typeof randomCase.parity === 'object' ? Object.keys(randomCase.parity).filter(k => randomCase.parity[k] > 0) : ['on'])
            };

            if (config.RUL.length === 0) config.RUL = [0];
            if (config.RDL.length === 0) config.RDL = [0];
            if (config.AUF.length === 0) config.AUF = ['U0'];
            if (config.ADF.length === 0) config.ADF = ['D0'];
            if (config.middleLayer.length === 0) config.middleLayer = ['/'];

            const result = generateHexState(config);
            
            let scramble = '';
            try {
                if (typeof window.Square1Solver !== 'undefined') {
                    scramble = window.Square1Solver.solve(result.hexState);
                }
            } catch (solverError) {
                console.error('Solver error:', solverError);
                scramble = 'Solver unavailable';
            }

            const inputHex = config.topLayer + '|' + config.bottomLayer;
            
            // Extract ABF and RBL details
            const [auf, adf] = result.abf.split('-');
            const rblMatch = result.rbl.match(/RUL:(-?\d+), RDL:(-?\d+)/);
            const rul = rblMatch ? rblMatch[1] : '0';
            const rdl = rblMatch ? rblMatch[2] : '0';

            const resultDiv = document.createElement('div');
            resultDiv.className = 'scramble-result-item';
            resultDiv.innerHTML = `
                <div class="scramble-result-info">
                    <div><strong>Case Name:</strong> ${randomCase.caseName}</div>
                    <div><strong>Case Path:</strong> ${randomCase.path}</div>
                    <div><strong>Input Hex:</strong> <span style="font-family: monospace;">${inputHex}</span></div>
                    <div><strong>Final Hex:</strong> <span style="font-family: monospace;">${result.hexState}</span></div>
                    <div><strong>Scramble:</strong> <span style="font-family: monospace;">${scramble}</span></div>
                    <div><strong>Shape Index:</strong> ${result.shapeIndex}</div>
                    <div><strong>AUF:</strong> ${auf} | <strong>ADF:</strong> ${adf}</div>
                    <div><strong>RUL:</strong> ${rul} | <strong>RDL:</strong> ${rdl}</div>
                    <div><strong>Equator:</strong> ${result.equator}</div>
                </div>
                <div class="scramble-result-viz">
                    ${typeof window.Square1VisualizerLibraryWithSillyNames !== 'undefined' 
                        ? window.Square1VisualizerLibraryWithSillyNames.visualizeFromHexCodePlease(
                            result.hexState,
                            150,
                            {
                                topColor: '#000000',
                                bottomColor: '#FFFFFF',
                                frontColor: '#CC0000',
                                rightColor: '#00AA00',
                                backColor: '#FF8C00',
                                leftColor: '#0066CC',
                                dividerColor: '#7a0000',
                                circleColor: 'transparent'
                            },
                            5
                        )
                        : '<div style="color: #888;">Visualization unavailable</div>'
                    }
                </div>
            `;
            
            resultsContainer.appendChild(resultDiv);
            generated++;

            const progress = (generated / totalScrambles) * 100;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${generated} / ${totalScrambles}`;

            // Debounce: wait 50ms before next generation
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Continue generating
            generateOne();
            
        } catch (error) {
            console.error('Error generating scramble:', error);
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'color: #ef4444; padding: 12px; background: #3a1a1a; border-radius: 6px; margin-bottom: 12px;';
            errorDiv.textContent = `Error: ${error.message}`;
            resultsContainer.appendChild(errorDiv);
            
            // Continue despite error
            generated++;
            await new Promise(resolve => setTimeout(resolve, 50));
            generateOne();
        }
    };

    // Start generation
    generateOne();
}

close() {
    // Save current root before closing
    AppState.developingJSONs[AppState.activeDevelopingJSON] = this.treeData;
    saveDevelopingJSONs();
    
    const fullscreen = document.getElementById('jsonCreatorFullscreen');
    if (fullscreen) {
        fullscreen.remove();
    }
}
}

let jsonCreator = new JSONCreator();

function showJsonCreatorFullscreen() {
    jsonCreator = new JSONCreator();
    jsonCreator.show();
}

function closeJsonCreator() {
    if (confirm('Close JSON Creator? All changes are auto-saved.')) {
        jsonCreator.close();
    }
}

// Start the app
initApp();