//Every Update to the state should instantly render to ensure snappyness of the app.

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
        saveLastScreen('jsonCreator');
        // Load current developing JSON
        this.treeData = JSON.parse(JSON.stringify(AppState.developingJSONs[AppState.activeDevelopingJSON] || DEFAULT_ALGSET));
        
        // Expand all folders on initialization
        this.expandAllFolders(this.treeData, '');
        
        // Load last selected case from localStorage
        const lastSelectedPath = localStorage.getItem('jsonCreator_lastSelectedPath');
        const lastSelectedRoot = localStorage.getItem('jsonCreator_lastSelectedRoot');
        
        if (lastSelectedRoot === AppState.activeDevelopingJSON && lastSelectedPath) {
            this.selectedPath = lastSelectedPath;
            const pathParts = lastSelectedPath.split('/');
            let current = this.treeData;
            for (const part of pathParts) {
                if (current[part]) {
                    current = current[part];
                } else {
                    this.selectedPath = '';
                    break;
                }
            }
            if (this.selectedPath) {
                this.selectedItem = current;
            }
        }
        
        // If no valid selection, select first case found
        if (!this.selectedPath || !this.selectedItem) {
            const findFirstCase = (obj, path = []) => {
                for (const [key, value] of Object.entries(obj)) {
                    if (value && typeof value === 'object') {
                        if (value.caseName) {
                            return { path: [...path, key].join('/'), item: value };
                        } else {
                            const found = findFirstCase(value, [...path, key]);
                            if (found) return found;
                        }
                    }
                }
                return null;
            };
            
            const firstCase = findFirstCase(this.treeData);
            if (firstCase) {
                this.selectedPath = firstCase.path;
                this.selectedItem = firstCase.item;
            }
        }

        const fullscreen = document.createElement('div');
        fullscreen.className = 'json-creator-fullscreen';
        fullscreen.id = 'jsonCreatorFullscreen';

        fullscreen.innerHTML = `
                    <div class="json-creator-topbar">
    <div style="display: flex; align-items: center; gap: 12px;">
        <button class="json-creator-icon-btn" onclick="jsonCreator.toggleSidebar()" title="Toggle Sidebar">
            <img src="viz/hamburger-menu.svg" width="16" height="16">
        </button>
        <h2 style="margin: 0;">JSON Creator</h2>
        <button id="rootSelectorBtn" onclick="jsonCreator.openRootSelectorModal()" style="background: #f5f5f5; border: 1px solid #d0d0d0; color: #1a1a1a; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 13px;">
            ${AppState.activeDevelopingJSON}
        </button>
    </div>
    <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
            <button class="json-creator-icon-btn" onclick="jsonCreator.openDataManagement()" title="Data Management">
            <img src="viz/data.svg" width="16" height="16">
        </button>
        <button class="json-creator-icon-btn" onclick="jsonCreator.extractJSON()" title="Extract JSON">
            <img src="viz/extract.svg" width="16" height="16">
        </button>
        <button class="json-creator-icon-btn" onclick="jsonCreator.runJSON()" title="Run">
            <img src="viz/run.svg" width="16" height="16">
        </button>
        <button class="json-creator-icon-btn" onclick="jsonCreator.close()" title="Quit">
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
        
        // Show case editor if a case is selected
        if (this.selectedItem && this.selectedItem.caseName) {
            const caseName = this.selectedPath.split('/').pop();
            this.showCaseEditor(this.selectedItem, caseName);
        }
    }

    expandAllFolders(node, path) {
        Object.keys(node).forEach(key => {
            const item = node[key];
            if (typeof item === 'object' && item !== null && !item.caseName) {
                const currentPath = path ? `${path}/${key}` : key;
                this.expandedFolders.add(currentPath);
                this.expandAllFolders(item, currentPath);
            }
        });
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

        // Info button handler
        document.addEventListener('click', (e) => {
            // Close all info boxes first
            document.querySelectorAll('.info-box').forEach(box => 
                box.classList.remove('show')
            );
            
            // If an info button was clicked, open only that one
            if (e.target.classList.contains('info-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const infoBox = e.target.nextElementSibling;
                infoBox.classList.add('show');
                
                // Position the info box dynamically
                const btnRect = e.target.getBoundingClientRect();
                const boxWidth = 300;
                const boxHeight = infoBox.offsetHeight || 100;
                
                // Try to position above the button
                let top = btnRect.top - boxHeight - 10;
                let left = btnRect.right - boxWidth;
                
                // If it goes above viewport, position below
                if (top < 10) {
                    top = btnRect.bottom + 10;
                }
                
                // If it goes off left edge, align to left of button
                if (left < 10) {
                    left = btnRect.left;
                }
                
                // If it goes off right edge, align to right edge
                if (left + boxWidth > window.innerWidth - 10) {
                    left = window.innerWidth - boxWidth - 10;
                }
                
                infoBox.style.top = top + 'px';
                infoBox.style.left = left + 'px';
            }
        });

        // Click outside to deselect
        document.getElementById('jsonCreatorTree').addEventListener('click', (e) => {
            if (e.target.id === 'jsonCreatorTree') {
                this.selectedPath = '';
                this.selectedItem = null;
                this.renderTree();
            }
        });

        // Right-click on tree root
        document.getElementById('jsonCreatorTree').addEventListener('contextmenu', (e) => {
            if (e.target.id === 'jsonCreatorTree') {
                e.preventDefault();
                this.showRootContextMenu(e);
            }
        });
    }

    renderTree() {
        // Auto-save whenever tree is rendered (indicates a change)
        AppState.developingJSONs[AppState.activeDevelopingJSON] = JSON.parse(JSON.stringify(this.treeData));
        saveDevelopingJSONs();
        
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
            // Folders only toggle expansion
            this.toggleFolder(path);
            this.selectedPath = path;
            this.selectedItem = item;
            this.renderTree();
        } else {
            this.selectedPath = path;
            this.selectedItem = item;
            localStorage.setItem('jsonCreator_lastSelectedPath', path);
            localStorage.setItem('jsonCreator_lastSelectedRoot', AppState.activeDevelopingJSON);
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
            inputTop: "RRRRRRRRRRRR",
            inputBottom: "RRRRRRRRRRRR",
            equator: ["/", "|"],
            parity: ["on"],
            constraints: {},
            auf: ["U0"],
            adf: ["D0"],
            rul: [0],
            rdl: [0],
            alg: ""
        };

        // Auto-expand parent folder if not already expanded
        if (this.selectedPath && !this.expandedFolders.has(this.selectedPath)) {
            this.expandedFolders.add(this.selectedPath);
        }

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
        
        // Auto-expand parent folder if not already expanded
        if (this.selectedPath && !this.expandedFolders.has(this.selectedPath)) {
            this.expandedFolders.add(this.selectedPath);
        }
        
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

        // Auto-expand parent folder if not already expanded
        if (this.selectedPath && !this.expandedFolders.has(this.selectedPath)) {
            this.expandedFolders.add(this.selectedPath);
        }

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
        // Don't change the screen, keep showing the last case
        // Just update the title to show folder is selected
        const title = document.getElementById('jsonCreatorTitle');
        const subtitle = document.getElementById('jsonCreatorSubtitle');
        
        title.textContent = `Folder: ${name}`;
        subtitle.textContent = 'Folder selected - use toolbar to add cases or subfolders';
    }

    showCaseEditor(item, name) {
        const title = document.getElementById('jsonCreatorTitle');
        const subtitle = document.getElementById('jsonCreatorSubtitle');
        const body = document.getElementById('jsonCreatorBody');

        title.innerHTML = `Case: ${name} <button class="json-creator-icon-btn" onclick="jsonCreator.runItem(jsonCreator.selectedItem, '${name}')" title="Run This Case" style="margin-left: 8px; display: inline-flex; align-items: center; vertical-align: middle;"><img src="viz/run.svg" width="14" height="14"></button>`;
        subtitle.innerHTML = ``;

        // Initialize arrays if they don't exist
        if (!item.auf) item.auf = ['U0'];
        if (!item.adf) item.adf = ['D0'];
        if (!item.rul) item.rul = [0];
        if (!item.rdl) item.rdl = [0];
        if (!item.constraints) item.constraints = {};

        body.innerHTML = `
            <div class="case-editor-tabs">
                <button class="case-editor-tab active" onclick="jsonCreator.switchCaseTab('shape')">Shape Input</button>
                <button class="case-editor-tab" onclick="jsonCreator.switchCaseTab('additional')">Additional Information</button>
            </div>
            <div id="caseEditorContent"></div>
        `;

        this.currentCaseTab = 'shape';
        this.renderCaseTab(item, name);
    }

    switchCaseTab(tab) {
        this.currentCaseTab = tab;
        const tabs = document.querySelectorAll('.case-editor-tab');
        tabs.forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        if (this.selectedItem) {
            this.renderCaseTab(this.selectedItem, this.selectedPath.split('/').pop());
        }
    }

    renderCaseTab(item, name) {
        const content = document.getElementById('caseEditorContent');
        if (!content) {
            console.error('caseEditorContent not found!');
            return;
        }
        
        if (!item) {
            console.error('No item provided to renderCaseTab');
            return;
        }

        if (this.currentCaseTab === 'shape') {
            // Check if we already rendered this tab - if so, just update the states
            const alreadyRendered = content.querySelector('#topLayerInput');
            
            if (alreadyRendered) {                
                // Update input values
                const topInput = document.getElementById('topLayerInput');
                const bottomInput = document.getElementById('bottomLayerInput');
                const topValue = item.inputTop || 'RRRRRRRRRRRR';
            const bottomValue = item.inputBottom || 'RRRRRRRRRRRR';
                if (topInput) topInput.value = topValue;
                if (bottomInput) bottomInput.value = bottomValue;
                
                // Update visualizations
                if (this.topState && window.InteractiveScrambleRenderer) {
                    this.topState.topText = topValue;
                    this.topState.bottomText = '';
                    this.topState.parse();
                    const topContainer = document.getElementById('topInteractive');
                    if (topContainer) {
                        topContainer.innerHTML = window.InteractiveScrambleRenderer.createInteractiveSVG(this.topState, { size: 200 });
                        window.InteractiveScrambleRenderer.setupInteractiveEvents(this.topState, 'topInteractive');
                    }
                }
                
                if (this.bottomState && window.InteractiveScrambleRenderer) {
                    this.bottomState.topText = '';
                    this.bottomState.bottomText = bottomValue;
                    this.bottomState.parse();
                    const bottomContainer = document.getElementById('bottomInteractive');
                    if (bottomContainer) {
                        bottomContainer.innerHTML = window.InteractiveScrambleRenderer.createInteractiveSVG(this.bottomState, { size: 200 });
                        window.InteractiveScrambleRenderer.setupInteractiveEvents(this.bottomState, 'bottomInteractive');
                    }
                }
                
                return;
            }
            
            // Always recreate states to ensure they're fresh
            if (window.InteractiveScrambleRenderer) {
                this.topState = new window.InteractiveScrambleRenderer.InteractiveScrambleState(
                    item.inputTop || 'RRRRRRRRRRRR',
                    '',
                    window.InteractiveScrambleRenderer.DEFAULT_COLOR_SCHEME
                );
                this.topState.onChange(() => {
                    if (this.selectedItem) {
                        this.selectedItem.inputTop = this.topState.topText;
                        const topInput = document.getElementById('topLayerInput');
                        if (topInput) {
                            topInput.value = this.topState.topText;
                        }
                        AppState.developingJSONs[AppState.activeDevelopingJSON] = JSON.parse(JSON.stringify(this.treeData));
                        saveDevelopingJSONs();
                    }
                });
            }

            if (window.InteractiveScrambleRenderer) {
                this.bottomState = new window.InteractiveScrambleRenderer.InteractiveScrambleState(
                    '',
                    item.inputBottom || 'RRRRRRRRRRRR',
                    window.InteractiveScrambleRenderer.DEFAULT_COLOR_SCHEME
                );
                this.bottomState.onChange(() => {
                    if (this.selectedItem) {
                        this.selectedItem.inputBottom = this.bottomState.bottomText;
                        const bottomInput = document.getElementById('bottomLayerInput');
                        if (bottomInput) {
                            bottomInput.value = this.bottomState.bottomText;
                        }
                        AppState.developingJSONs[AppState.activeDevelopingJSON] = JSON.parse(JSON.stringify(this.treeData));
                        saveDevelopingJSONs();
                    }
                });
            }

            content.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div class="json-creator-section">
                        <h4>Top Layer</h4>
                        <div class="json-creator-form-group">
                            <input type="text" maxlength="12" id="topLayerInput" value="${item.inputTop || 'RRRRRRRRRRRR'}" 
                                   style="font-family: monospace; width: 100%; padding: 8px; background: #2d2d2d; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0; display: none;">
                        </div>
                        <div id="topInteractive" style="display: flex; justify-content: center; margin-top: 12px;"></div>
                    </div>

                    <div class="json-creator-section">
                        <h4>Bottom Layer</h4>
                        <div class="json-creator-form-group">
                            <input type="text" maxlength="12" id="bottomLayerInput" value="${item.inputBottom || 'RRRRRRRRRRRR'}" 
                                   style="font-family: monospace; width: 100%; padding: 8px; background: #2d2d2d; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0; display: none;">
                        </div>
                        <div id="bottomInteractive" style="display: flex; justify-content: center; margin-top: 12px;"></div>
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
            `;

            // Render interactive visualizations
            const topContainer = document.getElementById('topInteractive');
            const bottomContainer = document.getElementById('bottomInteractive');

            if (topContainer && window.InteractiveScrambleRenderer) {
                this.topState.topText = item.inputTop || 'RRRRRRRRRRRR';
                this.topState.bottomText = '';
                this.topState.parse();
                topContainer.innerHTML = window.InteractiveScrambleRenderer.createInteractiveSVG(this.topState, { size: 200 });
                window.InteractiveScrambleRenderer.setupInteractiveEvents(this.topState, 'topInteractive');
            }

            if (bottomContainer && window.InteractiveScrambleRenderer) {
                this.bottomState.topText = '';
                this.bottomState.bottomText = item.inputBottom || 'RRRRRRRRRRRR';
                this.bottomState.parse();
                bottomContainer.innerHTML = window.InteractiveScrambleRenderer.createInteractiveSVG(this.bottomState, { size: 200 });
                window.InteractiveScrambleRenderer.setupInteractiveEvents(this.bottomState, 'bottomInteractive');
            }

            // Setup input listeners
            const topInput = document.getElementById('topLayerInput');
            const bottomInput = document.getElementById('bottomLayerInput');
            // Debug: Watch for DOM removal
            if (topInput) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.removedNodes.forEach((node) => {
                            if (node === topInput || (node.contains && node.contains(topInput))) {
                                console.error('TOP INPUT WAS REMOVED FROM DOM!');
                                console.trace('Removal call stack');
                            }
                        });
                    });
                });
                observer.observe(topInput.parentElement, { childList: true, subtree: true });
            }

            if (topInput) {
                topInput.addEventListener('input', (e) => {
                    const value = e.target.value.toUpperCase().substring(0, 12);
                    e.target.value = value;
                    
                    if (value.length < 12) {
                        e.target.style.borderColor = '#ef4444';
                        return;
                    }
                    
                    e.target.style.borderColor = '#404040';
                    
                    if (value.length === 12) {
                        try {
                            this.topState.topText = value;
                            this.topState.parse();
                            const topContainer = document.getElementById('topInteractive');
                            topContainer.innerHTML = window.InteractiveScrambleRenderer.createInteractiveSVG(this.topState, { size: 200 });
                            window.InteractiveScrambleRenderer.setupInteractiveEvents(this.topState, 'topInteractive');
                            this.selectedItem.inputTop = value;
                            AppState.developingJSONs[AppState.activeDevelopingJSON] = JSON.parse(JSON.stringify(this.treeData));
                            saveDevelopingJSONs();
                        } catch (error) {
                            console.error('Parse error:', error);
                            alert('Invalid input: ' + error.message);
                            e.target.style.borderColor = '#ef4444';
                        }
                    }
                });
            }

            if (bottomInput) {
                bottomInput.addEventListener('input', (e) => {
                    const value = e.target.value.toUpperCase().substring(0, 12);
                    e.target.value = value;
                    
                    if (value.length < 12) {
                        e.target.style.borderColor = '#ef4444';
                        return;
                    }
                    
                    e.target.style.borderColor = '#404040';
                    
                    if (value.length === 12) {
                        try {
                            this.bottomState.bottomText = value;
                            this.bottomState.parse();
                            const bottomContainer = document.getElementById('bottomInteractive');
                            bottomContainer.innerHTML = window.InteractiveScrambleRenderer.createInteractiveSVG(this.bottomState, { size: 200 });
                            window.InteractiveScrambleRenderer.setupInteractiveEvents(this.bottomState, 'bottomInteractive');
                            this.selectedItem.inputBottom = value;
                            AppState.developingJSONs[AppState.activeDevelopingJSON] = JSON.parse(JSON.stringify(this.treeData));
                            saveDevelopingJSONs();
                        } catch (error) {
                            console.error('Parse error:', error);
                            alert('Invalid input: ' + error.message);
                            e.target.style.borderColor = '#ef4444';
                        }
                    }
                });
            }

        } else if (this.currentCaseTab === 'additional') {
            // Determine current parity mode
            let parityMode = 'ignore';
            if (Array.isArray(item.parity) && item.parity.length > 0) {
                if (item.parity.includes('on') || item.parity.includes('op')) {
                    parityMode = 'overall';
                } else {
                    parityMode = 'color-specific';
                }
            }

            content.innerHTML = `
                <div class="json-creator-section-compact">
                    <h4>Middle Layer</h4>
                    <div class="json-creator-grid">
                        <div class="json-creator-grid-item">
                            <input type="checkbox" ${Array.isArray(item.equator) && item.equator.includes('|') ? 'checked' : ''} 
                                   onchange="jsonCreator.updateEquator('|', this.checked)">
                            <label>Solved</label>
                        </div>
                        <div class="json-creator-grid-item">
                            <input type="checkbox" ${Array.isArray(item.equator) && item.equator.includes('/') ? 'checked' : ''} 
                                   onchange="jsonCreator.updateEquator('/', this.checked)">
                            <label>Flipped</label>
                        </div>
                    </div>
                </div>

                <div class="json-creator-section-compact">
                    <h4>
                        Parity
                        <span class="info-wrapper">
                            <button class="info-btn" aria-label="More info">i</button>
                            <span class="info-box">
                                Parity here doesn't refer to conventional parity. Overall parity defines a state of the sq1, but probably not the state you are aiming for. So run the case to check if you really want this. Color specific: here you can explicitly decide the arrangement of each color pieces, again test each one to check for yourself what you really want.
                            </span>
                        </span>
                    </h4>
                    <div class="parity-radio-group">
                        <div class="parity-radio-item">
                            <input type="radio" name="parityMode" value="ignore" ${parityMode === 'ignore' ? 'checked' : ''} 
                                   onchange="jsonCreator.updateParityMode('ignore')">
                            <label>Ignore</label>
                        </div>
                        <div class="parity-radio-item">
                            <input type="radio" name="parityMode" value="overall" ${parityMode === 'overall' ? 'checked' : ''} 
                                   onchange="jsonCreator.updateParityMode('overall')">
                            <label>Overall</label>
                        </div>
                        <div class="parity-radio-item">
                            <input type="radio" name="parityMode" value="color-specific" ${parityMode === 'color-specific' ? 'checked' : ''} 
                                   onchange="jsonCreator.updateParityMode('color-specific')">
                            <label>Color Specific</label>
                        </div>
                    </div>
                    <div id="parityOptions" class="parity-checkboxes-vertical">
                        ${parityMode === 'overall' ? `
                            <div class="json-creator-grid-item">
                                <input type="checkbox" ${Array.isArray(item.parity) && item.parity.includes('on') ? 'checked' : ''} 
                                       onchange="jsonCreator.updateMoveArray('parity', 'on', this.checked)">
                                <label>Overall No Parity</label>
                            </div>
                            <div class="json-creator-grid-item">
                                <input type="checkbox" ${Array.isArray(item.parity) && item.parity.includes('op') ? 'checked' : ''} 
                                       onchange="jsonCreator.updateMoveArray('parity', 'op', this.checked)">
                                <label>Overall Parity</label>
                            </div>
                        ` : parityMode === 'color-specific' ? `
                            <div class="json-creator-grid-item">
                                <input type="checkbox" ${Array.isArray(item.parity) && item.parity.includes('tnbn') ? 'checked' : ''} 
                                       onchange="jsonCreator.updateMoveArray('parity', 'tnbn', this.checked)">
                                <label>Both Color No Parity</label>
                            </div>
                            <div class="json-creator-grid-item">
                                <input type="checkbox" ${Array.isArray(item.parity) && item.parity.includes('tpbn') ? 'checked' : ''} 
                                       onchange="jsonCreator.updateMoveArray('parity', 'tpbn', this.checked)">
                                <label>Black Parity, White No Parity</label>
                            </div>
                            <div class="json-creator-grid-item">
                                <input type="checkbox" ${Array.isArray(item.parity) && item.parity.includes('tnbp') ? 'checked' : ''} 
                                       onchange="jsonCreator.updateMoveArray('parity', 'tnbp', this.checked)">
                                <label>Black No Parity, White Parity</label>
                            </div>
                            <div class="json-creator-grid-item">
                                <input type="checkbox" ${Array.isArray(item.parity) && item.parity.includes('tpbp') ? 'checked' : ''} 
                                       onchange="jsonCreator.updateMoveArray('parity', 'tpbp', this.checked)">
                                <label>Both Color Parity</label>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="json-creator-section-compact">
                    <h4>
                        Post ABF
                        <button class="quick-info-btn" onclick="(function(e){ e.stopPropagation(); alert('Post ABF is Adjustment of Both Face After the algorithm is done.'); })(event)">?</button>
                    </h4>
                    <div class="abf-grid">
                        ${['U0', 'U', 'U2', "U'", 'D0', 'D', 'D2', "D'"].map((move, idx) => {
                            const field = idx < 4 ? 'auf' : 'adf';
                            return `
                                <div class="json-creator-grid-item">
                                    <input type="checkbox" ${item[field].includes(move) ? 'checked' : ''} 
                                           onchange="jsonCreator.updateMoveArray('${field}', '${move}', this.checked)">
                                    <label>${move}</label>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="json-creator-section-compact">
                    <h4>
                        Pre ABF
                        <span class="info-wrapper">
                            <button class="info-btn" aria-label="More info">i</button>
                            <span class="info-box">Pre ABF is the adjustment you do before doing an alg.</span>
                        </span>
                    </h4>
                    <div class="pre-abf-container">
                        <div class="pre-abf-section">
                            <h5>Pre AUF</h5>
                            <div class="pre-abf-grid">
                                ${[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(val => `
                                    <div class="json-creator-grid-item">
                                        <input type="checkbox" ${Array.isArray(item.rul) && item.rul.includes(val) ? 'checked' : ''} 
                                               onchange="jsonCreator.updateNumberArray('rul', ${val}, this.checked)">
                                        <label>${val}</label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="pre-abf-section">
                            <h5>Pre ADF</h5>
                            <div class="pre-abf-grid">
                                ${[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(val => `
                                    <div class="json-creator-grid-item">
                                        <input type="checkbox" ${Array.isArray(item.rdl) && item.rdl.includes(val) ? 'checked' : ''} 
                                               onchange="jsonCreator.updateNumberArray('rdl', ${val}, this.checked)">
                                        <label>${val}</label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="json-creator-section-compact">
                    <h4>Algorithm</h4>
                    <div class="json-creator-form-group">
                        <input type="text" onchange="jsonCreator.updateField('alg', this.value)" value="${item.alg || ''}" style="width: 100%; padding: 6px 8px; background: #ffffff; border: 1px solid #c0c0c0; border-radius: 2px; color: #1a1a1a;">
                    </div>
                </div>
            `;
        }
    }

    updateField(field, value) {
        if (this.selectedItem) {
            this.selectedItem[field] = value;
            AppState.developingJSONs[AppState.activeDevelopingJSON] = JSON.parse(JSON.stringify(this.treeData));
            saveDevelopingJSONs();
        }
    }

    updateEquator(symbol, checked) {
        if (this.selectedItem) {
            if (!Array.isArray(this.selectedItem.equator)) {
                this.selectedItem.equator = [];
            }
            if (checked) {
                if (!this.selectedItem.equator.includes(symbol)) {
                    this.selectedItem.equator.push(symbol);
                }
            } else {
                this.selectedItem.equator = this.selectedItem.equator.filter(s => s !== symbol);
            }
            AppState.developingJSONs[AppState.activeDevelopingJSON] = JSON.parse(JSON.stringify(this.treeData));
            saveDevelopingJSONs();
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

    updateParityMode(mode) {
        if (this.selectedItem) {
            if (mode === 'ignore') {
                this.selectedItem.parity = [];
            } else if (mode === 'overall') {
                this.selectedItem.parity = ['on'];
            } else if (mode === 'color-specific') {
                this.selectedItem.parity = ['tnbn'];
            }
            AppState.developingJSONs[AppState.activeDevelopingJSON] = JSON.parse(JSON.stringify(this.treeData));
            saveDevelopingJSONs();
            this.renderCaseTab(this.selectedItem, this.selectedPath.split('/').pop());
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
            AppState.developingJSONs[AppState.activeDevelopingJSON] = JSON.parse(JSON.stringify(this.treeData));
            saveDevelopingJSONs();
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
            AppState.developingJSONs[AppState.activeDevelopingJSON] = JSON.parse(JSON.stringify(this.treeData));
            saveDevelopingJSONs();
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

        AppState.developingJSONs[AppState.activeDevelopingJSON] = JSON.parse(JSON.stringify(this.treeData));
        saveDevelopingJSONs();

        // Refresh the case editor
        this.showCaseEditor(this.selectedItem, this.selectedPath.split('/').pop());
    }

    removeConstraint(position) {
        if (this.selectedItem && this.selectedItem.constraints) {
            delete this.selectedItem.constraints[position];
            AppState.developingJSONs[AppState.activeDevelopingJSON] = JSON.parse(JSON.stringify(this.treeData));
            saveDevelopingJSONs();
            // Refresh the case editor
            this.showCaseEditor(this.selectedItem, this.selectedPath.split('/').pop());
        }
    }

    showContextMenu(e, path, item, key) {
        e.preventDefault();
        e.stopPropagation();
        
        // Switch focus first
        this.selectedPath = path;
        this.selectedItem = item;
        this.renderTree();
        
        this.hideContextMenu();
        
        this.setupContextMenuListener();

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

    showRootContextMenu(e) {
        e.preventDefault();
        e.stopPropagation();
        this.hideContextMenu();
        
        this.setupContextMenuListener();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;

        const items = [
            { text: 'New Case', action: () => { this.selectedPath = ''; this.selectedItem = null; this.newCase(); } },
            { text: 'New Folder', action: () => { this.selectedPath = ''; this.selectedItem = null; this.newFolder(); } },
            { text: 'Paste', action: () => { this.selectedPath = ''; this.selectedItem = null; this.paste(); }, disabled: !this.clipboard },
            { separator: true },
            { text: 'Run All', action: () => this.runJSON() }
        ];

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

    setupContextMenuListener() {
        const handleOutsideClick = (e) => {
            if (this.contextMenu && !this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        };
        
        // Remove old listener if exists
        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
        }
        
        this.outsideClickHandler = handleOutsideClick;
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 10);
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
        AppState.developingJSONs[AppState.activeDevelopingJSON] = JSON.parse(JSON.stringify(this.treeData));
        saveDevelopingJSONs();

        // Switch to new root
        AppState.activeDevelopingJSON = rootName;
        this.treeData = JSON.parse(JSON.stringify(AppState.developingJSONs[rootName]));
        this.selectedPath = '';
        this.selectedItem = null;
        this.expandedFolders.clear();
        this.expandAllFolders(this.treeData, '');
        this.renderTree();
        this.showWelcome();
        
        // Update button text
        const rootBtn = document.getElementById('rootSelectorBtn');
        if (rootBtn) {
            rootBtn.textContent = rootName;
        }
    }

    openRootSelectorModal() {
        // Close existing modal if open
        const existingModal = document.querySelector('.root-selector-modal');
        if (existingModal) {
            existingModal.remove();
            return;
        }

        const button = document.getElementById('rootSelectorBtn');
        const buttonRect = button.getBoundingClientRect();

        const modal = document.createElement('div');
        modal.className = 'root-selector-modal';
        modal.style.cssText = `
            position: fixed;
            left: ${buttonRect.left}px;
            top: ${buttonRect.bottom + 2}px;
            min-width: ${buttonRect.width}px;
            background: #ffffff;
            border: 1px solid #d0d0d0;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 20000;
        `;
        
        modal.innerHTML = `
            <div id="rootList" style="max-height: 400px; overflow-y: auto;">
                ${Object.keys(AppState.developingJSONs).map(root => `
                    <div class="root-list-item ${root === AppState.activeDevelopingJSON ? 'active' : ''}" 
                         data-root="${root}"
                         onclick="jsonCreator.selectRootFromModal('${root}')"
                         oncontextmenu="jsonCreator.showRootContextMenu(event, '${root}')"
                         style="padding: 10px 16px; cursor: pointer; font-size: 13px; color: #1a1a1a; border-bottom: 1px solid #e0e0e0;">
                        ${root}
                    </div>
                `).join('')}
            </div>
            <button onclick="jsonCreator.addRootFromModal()" style="width: 100%; padding: 10px 16px; background: #f5f5f5; border: none; border-top: 2px solid #d0d0d0; cursor: pointer; font-size: 13px; color: #0078d4; text-align: left;">
                + Add Root
            </button>
        `;
        
        document.body.appendChild(modal);
        
        // Close on outside click
        setTimeout(() => {
            const closeOnOutsideClick = (e) => {
                if (!modal.contains(e.target) && !button.contains(e.target)) {
                    modal.remove();
                    document.removeEventListener('click', closeOnOutsideClick);
                }
            };
            document.addEventListener('click', closeOnOutsideClick);
        }, 10);
    }

    selectRootFromModal(rootName) {
        this.switchRoot(rootName);
        const modal = document.querySelector('.root-selector-modal');
        if (modal) modal.remove();
    }

    showRootContextMenu(e, rootName) {
        e.preventDefault();
        e.stopPropagation();
        
        this.hideContextMenu();
        this.setupContextMenuListener();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;

        const items = [
            { text: 'Rename', action: () => this.renameRootFromModal(rootName) },
            { text: 'Delete', action: () => this.deleteRootFromModal(rootName), disabled: Object.keys(AppState.developingJSONs).length === 1 }
        ];

        items.forEach(item => {
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
        });

        document.body.appendChild(menu);
        this.contextMenu = menu;
    }

    addRootFromModal() {
        const modal = document.querySelector('.root-selector-modal');
        if (modal) modal.remove();
        
        const name = prompt('Enter name for new root:');
        if (!name) return;

        if (AppState.developingJSONs[name]) {
            alert('A root with this name already exists');
            return;
        }

        AppState.developingJSONs[name] = {};
        saveDevelopingJSONs();

        this.switchRoot(name);
    }

    renameRootFromModal(currentName) {
        const modal = document.querySelector('.root-selector-modal');
        if (modal) modal.remove();
        
        const newName = prompt(`Rename root "${currentName}" to:`, currentName);

        if (!newName || newName === currentName) return;

        if (AppState.developingJSONs[newName]) {
            alert('A root with this name already exists');
            return;
        }

        AppState.developingJSONs[newName] = AppState.developingJSONs[currentName];
        delete AppState.developingJSONs[currentName];
        
        if (AppState.activeDevelopingJSON === currentName) {
            AppState.activeDevelopingJSON = newName;
            this.treeData = AppState.developingJSONs[newName];
        }
        
        saveDevelopingJSONs();

        // Update button text if this was the active root
        const rootBtn = document.getElementById('rootSelectorBtn');
        if (rootBtn && AppState.activeDevelopingJSON === newName) {
            rootBtn.textContent = newName;
        }
    }

    deleteRootFromModal(currentName) {
        if (Object.keys(AppState.developingJSONs).length === 1) {
            alert('Cannot delete the last root');
            return;
        }
        
        const modal = document.querySelector('.root-selector-modal');
        if (modal) modal.remove();
        
        if (!confirm(`Delete root "${currentName}"?`)) return;

        delete AppState.developingJSONs[currentName];
        
        if (AppState.activeDevelopingJSON === currentName) {
            AppState.activeDevelopingJSON = Object.keys(AppState.developingJSONs)[0];
            this.switchRoot(AppState.activeDevelopingJSON);
        }
        
        saveDevelopingJSONs();
    } 

    copyJSON() {
        navigator.clipboard.writeText(JSON.stringify(this.treeData, null, 2))
            .then(() => alert('JSON copied to clipboard!'))
            .catch(err => alert('Failed to copy: ' + err));
    }

    extractJSON() {
    
    // Save current root before extracting
    AppState.developingJSONs[AppState.activeDevelopingJSON] = JSON.parse(JSON.stringify(this.treeData));
    saveDevelopingJSONs();
    
    const jsonString = JSON.stringify(this.treeData, null, 2);

    // Remove any existing extract modal first
    const existingModal = document.querySelector('.extract-json-modal');
    if (existingModal) {
        existingModal.remove();
    }
        
        const modal = document.createElement('div');
        modal.className = 'modal active extract-json-modal';
        modal.style.zIndex = '20000'; // Higher than json-creator-fullscreen (10000)
        modal.style.background = 'rgba(0, 0, 0, 0.5)';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; background: #ffffff; border: 1px solid #d0d0d0;">
                <div class="modal-header" style="border-bottom: 1px solid #d0d0d0;">
                    <h2 style="color: #1a1a1a;">Extract JSON: ${AppState.activeDevelopingJSON}</h2>
                    <button class="close-btn" onclick="this.closest('.modal').remove()" style="color: #666666;">×</button>
                </div>
                <div class="modal-body">
                    <textarea readonly id="extractedJSON" style="width: 100%; min-height: 400px; font-family: 'Courier New', monospace; background: #f9f9f9; color: #1a1a1a; border: 1px solid #d0d0d0; border-radius: 6px; padding: 12px;">${jsonString}</textarea>
                    <div class="button-group" style="margin-top: 12px;">
                        <button class="json-creator-btn" id="copyJSONBtn">Copy JSON</button>
                        <button class="json-creator-btn" id="downloadJSONBtn">Download JSON</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Check for elements that might be covering the modal
        const allElements = Array.from(document.body.children);
        allElements.forEach((el, idx) => {
            const styles = window.getComputedStyle(el);
        });
        
        // Check if json-creator-fullscreen exists
        const jsonCreatorFullscreen = document.getElementById('jsonCreatorFullscreen');
        if (jsonCreatorFullscreen) {
        }

        // Add event listeners after modal is in DOM
        const copyBtn = document.getElementById('copyJSONBtn');
        const downloadBtn = document.getElementById('downloadJSONBtn');
        
        if (!copyBtn || !downloadBtn) {
            console.error('[extractJSON] Buttons not found!', { copyBtn, downloadBtn });
            return;
        }
        
        copyBtn.addEventListener('click', () => {
            const textarea = document.getElementById('extractedJSON');
            navigator.clipboard.writeText(textarea.value).then(() => {
                alert('JSON copied to clipboard!');
            }).catch(err => {
                alert('Failed to copy: ' + err);
            });
        });

        downloadBtn.addEventListener('click', () => {
            const textarea = document.getElementById('extractedJSON');
            const blob = new Blob([textarea.value], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${AppState.activeDevelopingJSON}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

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
                topLayer: randomCase.inputTop,
                bottomLayer: randomCase.inputBottom,
                middleLayer: randomCase.equator || ['/'],
                RUL: randomCase.rul || [0],
                RDL: randomCase.rdl || [0],
                AUF: randomCase.auf || ['U0'],
                ADF: randomCase.adf || ['D0'],
                constraints: randomCase.constraints || {},
                parity: randomCase.parity || ['on']
            };

            const result = generateHexState(config);
            
            let scramble = '';
            let solverAttempts = 0;
            const maxSolverAttempts = 10;
            let solverSuccess = false;
            
            while (!solverSuccess && solverAttempts < maxSolverAttempts) {
                solverAttempts++;
                try {
                    if (typeof window.Square1Solver !== 'undefined') {
                        scramble = window.Square1Solver.solve(result.hexState);
                        solverSuccess = true;
                    } else {
                        scramble = '⚠ Solver not loaded';
                        solverSuccess = true;
                    }
                } catch (solverError) {
                    const isShiftError = solverError.message && solverError.message.includes("Cannot read properties of undefined (reading 'shift')");
                    
                    if (isShiftError && solverAttempts < maxSolverAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 10));
                        continue;
                    }
                    
                    scramble = `⚠ Error: ${solverError.message}`;
                    solverSuccess = true;
                }
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
    saveLastScreen('training');
    
    const fullscreen = document.getElementById('jsonCreatorFullscreen');
    if (fullscreen) {
        fullscreen.remove();
    }
    
    // Return to training screen
    renderApp();
    setupEventListeners();
    if (AppState.selectedCases.length > 0) {
        generateNewScramble();
    }
}

openDataManagement() {
    const modal = document.createElement('div');
    modal.className = 'modal active extract-json-modal';
    modal.style.zIndex = '20000';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Data Management</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button class="json-creator-btn" onclick="jsonCreator.exportAllData()">Export All Data</button>
                    <button class="json-creator-btn" onclick="jsonCreator.importData()">Import Data</button>
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

exportAllData() {
    // Save current root first
    AppState.developingJSONs[AppState.activeDevelopingJSON] = this.treeData;
    saveDevelopingJSONs();
    
    const allData = JSON.stringify(AppState.developingJSONs, null, 2);
    const blob = new Blob([allData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sq1-all-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

importData() {
    document.querySelector('.modal').remove();
    
    const importModal = document.createElement('div');
    importModal.className = 'modal active extract-json-modal';
    importModal.style.zIndex = '20000';
    importModal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>Import Data</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 16px;">
                    <input type="file" id="importDataFile" accept=".json" style="display: none;" onchange="jsonCreator.handleImportFileSelect(event)">
                    <div id="importDropZone" 
                         onclick="document.getElementById('importDataFile').click()"
                         ondragover="event.preventDefault(); this.style.background='#e0e0e0';"
                         ondragleave="this.style.background='#f9f9f9';"
                         ondrop="jsonCreator.handleImportFileDrop(event)"
                         style="width: 100%; min-height: 200px; background: #f9f9f9; border: 2px dashed #d0d0d0; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #666; text-align: center; padding: 20px;">
                        <div style="font-size: 48px; margin-bottom: 12px;">📁</div>
                        <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px;">Drop file here or click to choose</div>
                        <div style="font-size: 12px; color: #999;">Supports .json files</div>
                        <div id="importFileName" style="margin-top: 12px; font-size: 13px; color: #0078d4; font-weight: 500;"></div>
                    </div>
                </div>
                <div id="importActions" style="display: none; flex-direction: column; gap: 8px;">
                    <button class="json-creator-btn" onclick="jsonCreator.processImport('add')">Add to Existing</button>
                    <button class="json-creator-btn" onclick="jsonCreator.processImport('override')">Override (Delete Previous)</button>
                </div>
                <button class="json-creator-btn json-creator-btn-secondary" onclick="this.closest('.modal').remove()" style="margin-top: 12px; width: 100%;">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(importModal);
    
    importModal.addEventListener('click', (e) => {
        if (e.target === importModal) {
            importModal.remove();
        }
    });
}

handleImportFileDrop(event) {
    event.preventDefault();
    const dropZone = document.getElementById('importDropZone');
    dropZone.style.background = '#f9f9f9';
    
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
        this.loadImportFile(file);
    } else {
        alert('Please drop a valid JSON file');
    }
}

handleImportFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
        this.loadImportFile(file);
    } else {
        alert('Please select a valid JSON file');
    }
}

loadImportFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.importedJSONData = e.target.result;
        document.getElementById('importFileName').textContent = `Selected: ${file.name}`;
        document.getElementById('importActions').style.display = 'flex';
    };
    reader.readAsText(file);
}

processImport(mode) {
    const jsonText = window.importedJSONData;
    
    if (!jsonText) {
        alert('Please select a file to import');
        return;
    }
    
    try {
        const importedData = JSON.parse(jsonText);
        
        if (mode === 'override') {
            AppState.developingJSONs = importedData;
            AppState.activeDevelopingJSON = Object.keys(importedData)[0] || 'default';
        } else if (mode === 'add') {
            // Add to existing, auto-rename conflicts
            Object.keys(importedData).forEach(rootName => {
                let finalName = rootName;
                let counter = 1;
                while (AppState.developingJSONs[finalName]) {
                    finalName = `${rootName}_${counter}`;
                    counter++;
                }
                AppState.developingJSONs[finalName] = importedData[rootName];
            });
        }
        
        saveDevelopingJSONs();
        
        // Update selector
        const selector = document.getElementById('rootSelector');
        selector.innerHTML = Object.keys(AppState.developingJSONs).map(root => 
            `<option value="${root}" ${root === AppState.activeDevelopingJSON ? 'selected' : ''}>${root}</option>`
        ).join('');
        
        // Reload current root
        this.switchRoot(AppState.activeDevelopingJSON);
        
        document.querySelector('.modal').remove();
        alert('Data imported successfully!');
    } catch (error) {
        alert('Invalid JSON: ' + error.message);
    }
}

toggleSidebar() {
        const sidebar = document.querySelector('.json-creator-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('hidden');
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