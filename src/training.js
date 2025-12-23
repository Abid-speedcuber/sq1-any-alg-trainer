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

// Load last screen state
function loadLastScreen() {
    const lastScreen = localStorage.getItem('sq1LastScreen');
    return lastScreen || 'training';
}

// Save last screen state
function saveLastScreen(screen) {
    localStorage.setItem('sq1LastScreen', screen);
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
    
    const lastScreen = loadLastScreen();
    if (lastScreen === 'jsonCreator') {
        showJsonCreatorFullscreen();
    } else {
        saveLastScreen('training');
        renderApp();
        setupEventListeners();
        if (AppState.selectedCases.length > 0) {
            generateNewScramble();
        }
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
                console.error('Square1Solver not available:', typeof window.Square1Solver);
                scramble = 'Solver not loaded - check console';
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