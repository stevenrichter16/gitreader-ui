(function () {
    'use strict';

    function getElement(id) {
        var element = document.getElementById(id);
        if (!element) {
            throw new Error('Missing element: ' + id);
        }
        return element;
    }

    function escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function GitReaderApp() {
        this.tocList = getElement('toc-list');
        this.codeSurface = getElement('code-surface');
        this.canvasGraph = getElement('canvas-graph');
        this.canvasSurface = getElement('canvas-surface');
        this.canvasOverlay = getElement('canvas-overlay');
        this.narratorOutput = getElement('narrator-output');
        this.narratorFileTree = getElement('narrator-file-tree');
        this.modeButtons = document.querySelectorAll('.mode-btn');
        this.layoutButtons = document.querySelectorAll('.nav-btn[data-layout]');
        this.tocModeButtons = document.querySelectorAll('.nav-btn[data-toc-mode]');
        this.snippetModeButtons = document.querySelectorAll('[data-snippet-mode]');
        this.graphLayoutButtons = document.querySelectorAll('[data-layout-action]');
        this.edgeFilterButtons = document.querySelectorAll('[data-edge-filter]');
        this.nodeFilterButtons = document.querySelectorAll('[data-node-filter]');
        this.graphActionButtons = document.querySelectorAll('[data-graph-action]');
        this.narratorToggle = getElement('narrator-toggle');
        this.workspace = getElement('workspace');
        this.tocPill = getElement('toc-pill');
        this.tocSubtitle = getElement('toc-subtitle');
        this.graphNodeStatus = getElement('graph-node-status');
        this.graphRevealButton = getElement('graph-reveal');
        this.graphTooltip = getElement('graph-tooltip');
        this.narratorPane = getElement('narrator');
        this.routePicker = getElement('route-picker');
        this.routeSelect = getElement('route-select');
        this.routeJump = getElement('route-jump');
        this.tourControls = getElement('tour-controls');
        this.tourModeSelect = getElement('tour-mode');
        this.tourStartButton = getElement('tour-start');
        this.tourPrevButton = getElement('tour-prev');
        this.tourNextButton = getElement('tour-next');
        this.tourEndButton = getElement('tour-end');
        this.tourStatus = getElement('tour-status');
        this.tourModeSelect.value = 'story';
        this.graphRevealButton.disabled = true;
        this.routeSelect.disabled = true;
        this.routeJump.disabled = true;
        this.tourPrevButton.disabled = true;
        this.tourNextButton.disabled = true;
        this.tourEndButton.disabled = true;
        this.repoForm = getElement('repo-picker');
        this.repoInput = getElement('repo-input');
        this.localInput = getElement('local-input');
        this.refInput = getElement('ref-input');
        this.subdirInput = getElement('subdir-input');
        this.repoParams = this.buildRepoParams();
        this.syncRepoInputsFromParams();
        this.currentMode = 'hook';
        this.tocMode = 'story';
        this.snippetMode = 'body';
        this.graphLayoutMode = 'cluster';
        this.chapters = [];
        this.storyArcs = [];
        this.storyArcsById = new Map();
        this.activeStoryArc = null;
        this.tourActive = false;
        this.tourState = null;
        this.tourStep = null;
        this.tourMode = 'story';
        this.guidedAllowedNodeIds = null;
        this.fileTreeRoot = null;
        this.fileTreeFocusPath = null;
        this.readerTreeFocusPath = null;
        this.fileTreeCollapsed = new Set();
        this.graphNodes = [];
        this.graphEdges = [];
        this.nodeById = new Map();
        this.displayNodeById = new Map();
        this.fileNodesByPath = new Map();
        this.snippetCache = new Map();
        this.graphCache = new Map();
        this.graphLoadPromises = new Map();
        this.narratorCache = new Map();
        this.graphNodeCapByScope = new Map();
        this.narratorRequestToken = 0;
        this.chapterRequestToken = 0;
        this.graphRequestToken = 0;
        this.narratorVisible = true;
        this.graphInstance = null;
        this.graphEventsBound = false;
        this.edgeFilters = new Set(['calls', 'imports', 'inherits', 'contains', 'blueprint']);
        this.showExternalNodes = true;
        this.hoveredNodeId = null;
        this.currentScope = 'full';
        this.currentChapterId = null;
        this.focusedNodeId = null;
        this.currentSymbol = null;
        this.currentSnippetText = '';
        this.currentSnippetStartLine = 1;
        this.clusterExpanded = new Set();
        this.tocDebounceTimer = null;
        this.tocDebounceDelay = 200;
        this.pendingChapterId = null;
        this.graphNodeCap = 300;
        this.graphNodeCapStep = 200;
        this.labelZoomThreshold = 0.65;
        this.labelLineLength = 18;
        this.lastTapNodeId = null;
        this.lastTapAt = 0;
        this.doubleTapDelay = 320;
        this.importModal = null;
        this.importModalMessage = null;
        this.importBreadcrumbs = [];
        this.foldedSymbolIds = new Set();
        this.currentFoldRanges = new Map();
        this.currentFoldPath = null;
    }

    GitReaderApp.prototype.init = function () {
        var _this = this;
        this.renderLoadingState();
        this.loadGraphPreferences();
        this.bindEvents();
        this.updateNarratorToggle();
        this.updateTourControls();
        this.updateSnippetModeUi();
        this.updateGraphControls();
        this.loadData().catch(function (error) {
            var message = error instanceof Error ? error.message : 'Failed to load data.';
            _this.renderErrorState(message);
        });
    };

    GitReaderApp.prototype.loadData = function () {
        var _this = this;
        return this.loadToc(this.tocMode).then(function () {
            var defaultChapterId = _this.chapters.length > 0 ? _this.chapters[0].id : '';
            return _this.loadChapter(defaultChapterId);
        });
    };

    GitReaderApp.prototype.fetchJson = function (url, init) {
        var headers = new Headers((init && init.headers) || {});
        headers.set('Accept', 'application/json');
        var options = Object.assign({}, init, { headers: headers });
        return fetch(url, options).then(function (response) {
            if (!response.ok) {
                throw new Error('Request failed: ' + response.status);
            }
            return response.json();
        });
    };

    GitReaderApp.prototype.buildRepoParams = function () {
        var params = new URLSearchParams(window.location.search);
        var allowed = new URLSearchParams();
        var repoValue = params.get('repo');
        var localValue = params.get('local');
        if (repoValue) {
            allowed.set('repo', repoValue);
        } else if (localValue) {
            allowed.set('local', localValue);
        }
        var refValue = params.get('ref');
        if (refValue) {
            allowed.set('ref', refValue);
        }
        var subdirValue = params.get('subdir');
        if (subdirValue) {
            allowed.set('subdir', subdirValue);
        }
        return allowed;
    };

    GitReaderApp.prototype.buildApiUrl = function (path, extra) {
        var params = new URLSearchParams(this.repoParams.toString());
        if (extra) {
            Object.keys(extra).forEach(function (key) {
                var value = extra[key];
                if (value !== undefined && value !== null && value !== '') {
                    params.set(key, value);
                }
            });
        }
        var query = params.toString();
        return query ? path + '?' + query : path;
    };

    GitReaderApp.prototype.syncRepoInputsFromParams = function () {
        this.repoInput.value = this.repoParams.get('repo') || '';
        this.localInput.value = this.repoParams.get('local') || '';
        this.refInput.value = this.repoParams.get('ref') || '';
        this.subdirInput.value = this.repoParams.get('subdir') || '';
    };

    GitReaderApp.prototype.applyRepoSelection = function () {
        var repoValue = this.repoInput.value.trim();
        var localValue = this.localInput.value.trim();
        var refValue = this.refInput.value.trim();
        var subdirValue = this.subdirInput.value.trim();
        var params = new URLSearchParams();
        if (repoValue) {
            params.set('repo', repoValue);
        } else if (localValue) {
            params.set('local', localValue);
        }
        if (refValue) {
            params.set('ref', refValue);
        }
        if (subdirValue) {
            params.set('subdir', subdirValue);
        }
        var query = params.toString();
        window.location.search = query ? '?' + query : '';
    };

    GitReaderApp.prototype.renderLoadingState = function () {
        this.tocList.innerHTML = '<li class="toc-item"><div class="toc-title">Loading chapters</div><p class="toc-summary">Scanning repository...</p></li>';
        this.codeSurface.innerHTML = '<article class="code-card"><h3>Loading symbols...</h3><p>Fetching graph data.</p></article>';
        this.setCanvasOverlay('Preparing nodes and edges...', true);
        this.narratorOutput.innerHTML = '<p class="eyebrow">Narrator</p><h3>Loading</h3><p>Gathering the first clues.</p>';
    };

    GitReaderApp.prototype.renderErrorState = function (message) {
        this.tocList.innerHTML = '<li class="toc-item"><div class="toc-title">Failed to load</div><p class="toc-summary">' + escapeHtml(message) + '</p></li>';
        this.codeSurface.innerHTML = '<article class="code-card"><h3>Unable to load</h3><p>' + escapeHtml(message) + '</p></article>';
        this.setCanvasOverlay(message, true);
        this.narratorOutput.innerHTML = '<p class="eyebrow">Narrator</p><h3>Paused</h3><p>' + escapeHtml(message) + '</p>';
    };

    GitReaderApp.prototype.bindEvents = function () {
        var _this = this;
        this.tocList.addEventListener('click', function (event) {
            var target = event.target.closest('.toc-item');
            if (!target) {
                return;
            }
            var chapterId = target.dataset.chapterId;
            if (chapterId) {
                if (_this.tourActive) {
                    if (_this.tocMode === 'routes') {
                        _this.setTocMode('routes', chapterId);
                    }
                    return;
                }
                _this.scheduleChapterLoad(chapterId);
            }
        });

        this.tocModeButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                var mode = button.dataset.tocMode;
                if (mode) {
                    _this.setTocMode(mode);
                }
            });
        });

        this.snippetModeButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                var mode = button.dataset.snippetMode;
                if (mode) {
                    _this.setSnippetMode(mode);
                }
            });
        });

        this.graphLayoutButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                var layout = button.dataset.layoutAction;
                if (layout) {
                    _this.setGraphLayoutMode(layout);
                }
            });
        });

        this.edgeFilterButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                var filter = button.dataset.edgeFilter;
                if (filter) {
                    _this.toggleEdgeFilter(filter);
                }
            });
        });

        this.nodeFilterButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                var filter = button.dataset.nodeFilter;
                if (filter === 'external') {
                    _this.showExternalNodes = !_this.showExternalNodes;
                    _this.updateGraphControls();
                    if (_this.graphLayoutMode === 'cluster') {
                        _this.refreshGraphView();
                    } else {
                        _this.applyGraphFilters();
                    }
                }
            });
        });

        this.graphActionButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                var action = button.dataset.graphAction;
                if (action === 'focus') {
                    _this.focusOnSelected();
                } else if (action === 'reset') {
                    _this.resetGraphFocus();
                } else if (action === 'reveal') {
                    _this.revealMoreNodes();
                } else if (action === 'zoom-in') {
                    _this.zoomGraph(1.2);
                } else if (action === 'zoom-out') {
                    _this.zoomGraph(0.8);
                } else if (action === 'fit') {
                    _this.fitGraph();
                }
            });
        });

        this.modeButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                var mode = button.dataset.mode;
                if (mode) {
                    _this.setMode(mode);
                }
            });
        });

        this.tourModeSelect.addEventListener('change', function () {
            var mode = _this.tourModeSelect.value;
            _this.tourMode = mode;
            if (_this.tourActive) {
                _this.startTour();
            }
        });

        this.tourStartButton.addEventListener('click', function () {
            _this.startTour();
        });

        this.tourPrevButton.addEventListener('click', function () {
            _this.advanceTour('prev');
        });

        this.tourNextButton.addEventListener('click', function () {
            _this.advanceTour('next');
        });

        this.tourEndButton.addEventListener('click', function () {
            _this.endTour();
        });

        this.routeSelect.addEventListener('change', function () {
            if (_this.tourActive && _this.tocMode !== 'routes') {
                return;
            }
            var arcId = _this.routeSelect.value;
            if (!arcId) {
                return;
            }
            _this.setTocMode('routes', arcId);
        });

        this.routeJump.addEventListener('click', function () {
            if (_this.tourActive && _this.tocMode !== 'routes') {
                return;
            }
            var arcId = _this.routeSelect.value;
            if (!arcId) {
                return;
            }
            _this.setTocMode('routes', arcId);
        });

        this.layoutButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                var layout = button.dataset.layout;
                if (layout) {
                    _this.setLayout(layout);
                }
            });
        });

        this.narratorToggle.addEventListener('click', function () {
            _this.narratorVisible = !_this.narratorVisible;
            _this.narratorPane.classList.toggle('is-hidden', !_this.narratorVisible);
            _this.updateNarratorToggle();
            _this.refreshGraphViewport();
        });

        this.codeSurface.addEventListener('click', function (event) {
            var target = event.target;
            var foldToggle = target.closest('[data-fold-toggle]');
            if (foldToggle) {
                var foldId = foldToggle.dataset.foldToggle;
                if (foldId) {
                    _this.toggleFold(foldId);
                }
                return;
            }
            var breadcrumbTarget = target.closest('[data-breadcrumb-path]');
            if (breadcrumbTarget) {
                var path = breadcrumbTarget.dataset.breadcrumbPath;
                if (path) {
                    _this.navigateBreadcrumb(path);
                }
                return;
            }
            var treeToggle = target.closest('[data-tree-toggle]');
            if (treeToggle) {
                var path = treeToggle.dataset.treeToggle;
                if (path) {
                    _this.toggleFileTreePath(path);
                }
                return;
            }
            var actionTarget = target.closest('[data-reader-action]');
            if (actionTarget) {
                var action = actionTarget.dataset.readerAction;
                if (action === 'copy') {
                    _this.copySnippet();
                } else if (action === 'jump') {
                    _this.jumpToInputLine();
                }
                return;
            }
            var importTarget = target.closest('[data-import-name]');
            if (importTarget) {
                var importName = importTarget.dataset.importName;
                if (importName) {
                    if (_this.isModifierClick(event)) {
                        _this.handleImportJump(importName, importTarget.closest('.code-line'));
                    } else {
                        _this.highlightImportUsage(importName);
                    }
                }
                return;
            }
            var importLine = target.closest('.code-line[data-imports]');
            if (importLine) {
                var imports = (importLine.dataset.imports || '').split(',').map(function (value) { return value.trim(); }).filter(Boolean);
                if (imports.length > 0) {
                    if (_this.isModifierClick(event)) {
                        _this.handleImportJump(imports[0], importLine);
                    } else {
                        _this.highlightImportUsage(imports[0]);
                    }
                }
                return;
            }
            if (_this.handleDefinitionJump(event, target)) {
                return;
            }
        });

        this.codeSurface.addEventListener('keydown', function (event) {
            var target = event.target;
            if (event.key === 'Enter' && target.matches('[data-line-input]')) {
                event.preventDefault();
                _this.jumpToInputLine();
            }
        });

        this.narratorOutput.addEventListener('click', function (event) {
            var target = event.target.closest('[data-arc-id]');
            if (!target) {
                return;
            }
            var arcId = target.dataset.arcId;
            if (arcId) {
                _this.setTocMode('routes', arcId);
            }
        });

        this.narratorOutput.addEventListener('click', function (event) {
            var target = event.target.closest('[data-tour-node]');
            if (!target) {
                return;
            }
            var nodeId = target.dataset.tourNode;
            if (nodeId) {
                _this.advanceTour('jump', nodeId);
            }
        });

        this.narratorOutput.addEventListener('click', function (event) {
            var target = event.target.closest('[data-tour-arc]');
            if (!target) {
                return;
            }
            var arcId = target.dataset.tourArc;
            if (arcId) {
                _this.advanceTour('branch', undefined, arcId);
            }
        });

        this.narratorOutput.addEventListener('click', function (event) {
            var target = event.target.closest('[data-context-link]');
            if (!target) {
                return;
            }
            var nodeId = target.dataset.contextNode;
            var filePath = target.dataset.contextFile;
            var line = target.dataset.contextLine ? Number(target.dataset.contextLine) : undefined;
            _this.handleContextLink(nodeId, filePath, line);
        });

        this.narratorFileTree.addEventListener('click', function (event) {
            var target = event.target.closest('[data-tree-toggle]');
            if (!target) {
                return;
            }
            var path = target.dataset.treeToggle;
            if (path) {
                _this.toggleFileTreePath(path);
            }
        });

        this.repoForm.addEventListener('submit', function (event) {
            event.preventDefault();
            _this.applyRepoSelection();
        });
    };

    GitReaderApp.prototype.scheduleChapterLoad = function (chapterId) {
        var _this = this;
        this.pendingChapterId = chapterId;
        this.setActiveToc(chapterId);
        if (this.tocDebounceTimer !== null) {
            window.clearTimeout(this.tocDebounceTimer);
        }
        this.tocDebounceTimer = window.setTimeout(function () {
            _this.tocDebounceTimer = null;
            if (_this.pendingChapterId) {
                _this.loadChapter(_this.pendingChapterId);
            }
        }, this.tocDebounceDelay);
    };

    GitReaderApp.prototype.setTocMode = function (mode, targetChapterId) {
        var _this = this;
        if (this.tocMode === mode) {
            if (targetChapterId) {
                if (this.tourActive) {
                    this.currentChapterId = targetChapterId;
                    this.setActiveToc(targetChapterId);
                    this.resetNarratorForTocMode(mode, targetChapterId);
                    this.updateTourControls();
                    return Promise.resolve();
                }
                return this.loadChapter(targetChapterId);
            }
            if (this.tourActive) {
                this.resetNarratorForTocMode(mode);
                this.updateTourControls();
            }
            return Promise.resolve();
        }
        this.tocList.innerHTML = '<li class="toc-item"><div class="toc-title">Loading chapters</div><p class="toc-summary">Switching TOC view...</p></li>';
        return this.loadToc(mode).then(function () {
            var defaultChapterId = targetChapterId || (_this.chapters.length > 0 ? _this.chapters[0].id : '');
            if (_this.tourActive) {
                _this.currentChapterId = defaultChapterId;
                _this.setActiveToc(defaultChapterId);
                _this.resetNarratorForTocMode(mode, defaultChapterId);
                _this.updateTourControls();
                return;
            }
            return _this.loadChapter(defaultChapterId);
        });
    };

    GitReaderApp.prototype.resetNarratorForTocMode = function (mode, targetChapterId) {
        if (!this.tourActive) {
            return;
        }
        if (mode === 'routes') {
            var arcId = targetChapterId || this.currentChapterId || this.routeSelect.value || '';
            var arc = arcId ? this.storyArcsById.get(arcId) : undefined;
            if (arc) {
                this.activeStoryArc = arc;
                this.renderStoryArc(arc);
                return;
            }
            this.activeStoryArc = null;
            if (arcId) {
                this.renderStoryArcMissing();
                return;
            }
            this.renderStoryArcEmpty();
            return;
        }
        this.activeStoryArc = null;
        if (mode === 'tree') {
            this.renderFileTreeNarrator();
            return;
        }
        if (this.tourStep) {
            this.renderTourStep(this.tourStep);
        }
    };

    GitReaderApp.prototype.loadToc = function (mode) {
        var _this = this;
        if (mode === 'routes') {
            return this.loadRouteToc();
        }
        return this.fetchJson(this.buildApiUrl('/gitreader/api/toc', { mode: mode })).then(function (tocData) {
            _this.chapters = Array.isArray(tocData.chapters) ? tocData.chapters : [];
            _this.tocMode = tocData.mode || mode;
            _this.activeStoryArc = null;
            _this.updateTocModeUi();
            _this.renderToc();
        });
    };

    GitReaderApp.prototype.loadRouteToc = function () {
        var _this = this;
        return this.fetchJson(this.buildApiUrl('/gitreader/api/story')).then(function (storyData) {
            _this.storyArcs = Array.isArray(storyData.arcs) ? storyData.arcs : [];
            _this.storyArcsById = new Map(_this.storyArcs.map(function (arc) { return [arc.id, arc]; }));
            _this.chapters = _this.storyArcs.map(function (arc) { return _this.buildArcChapter(arc); });
            _this.tocMode = 'routes';
            _this.activeStoryArc = null;
            _this.updateTocModeUi();
            _this.renderToc();
            _this.populateRoutePicker(_this.storyArcs);
        });
    };

    GitReaderApp.prototype.updateTocModeUi = function () {
        var _this = this;
        this.tocModeButtons.forEach(function (button) {
            button.classList.toggle('is-active', button.dataset.tocMode === _this.tocMode);
        });
        var isStory = this.tocMode === 'story';
        var isRoutes = this.tocMode === 'routes';
        if (isRoutes) {
            this.tocPill.textContent = 'routes';
            this.tocSubtitle.textContent = 'Trace Flask routes into their primary flow.';
        } else {
            this.tocPill.textContent = isStory ? 'story' : 'file tree';
            this.tocSubtitle.textContent = isStory
                ? 'Follow the story arc of the repository.'
                : 'Browse the repository by folder.';
        }
        this.routePicker.classList.toggle('is-hidden', !isRoutes);
    };

    GitReaderApp.prototype.buildArcChapter = function (arc) {
        var handler = arc.route && arc.route.handler_name ? 'Handler ' + arc.route.handler_name : '';
        var summary = [handler, arc.summary].filter(Boolean).join(' - ') || 'Route arc';
        return {
            id: arc.id,
            title: this.formatArcTitle(arc) || handler || 'Route',
            summary: summary,
        };
    };

    GitReaderApp.prototype.populateRoutePicker = function (arcs) {
        var _this = this;
        this.routeSelect.innerHTML = '';
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = arcs.length > 0 ? 'Select a route' : 'No routes found';
        this.routeSelect.appendChild(placeholder);
        arcs.forEach(function (arc) {
            var option = document.createElement('option');
            option.value = arc.id;
            option.textContent = _this.formatArcOptionLabel(arc);
            _this.routeSelect.appendChild(option);
        });
        var hasRoutes = arcs.length > 0;
        this.routeSelect.disabled = !hasRoutes;
        this.routeJump.disabled = !hasRoutes;
        if (!hasRoutes) {
            this.routeSelect.value = '';
        } else if (this.currentChapterId && this.storyArcsById.has(this.currentChapterId)) {
            this.routeSelect.value = this.currentChapterId;
        }
    };

    GitReaderApp.prototype.formatArcOptionLabel = function (arc) {
        var routeLabel = this.formatArcTitle(arc);
        var handler = arc.route && arc.route.handler_name ? ' - ' + arc.route.handler_name : '';
        return (routeLabel + handler).trim();
    };

    GitReaderApp.prototype.formatRouteLabel = function (arc) {
        if (arc.title) {
            return arc.title;
        }
        var methods = arc.route && arc.route.methods && arc.route.methods.length ? arc.route.methods.join('|') : 'ANY';
        var target = (arc.route && arc.route.path) || (arc.route && arc.route.handler_name) || 'route';
        return (methods + ' ' + target).trim();
    };

    GitReaderApp.prototype.renderToc = function () {
        var _this = this;
        this.tocList.innerHTML = '';
        if (this.chapters.length === 0) {
            this.tocList.innerHTML = '<li class="toc-item"><div class="toc-title">No chapters yet</div><p class="toc-summary">Scan another repository.</p></li>';
            return;
        }
        this.chapters.forEach(function (chapter) {
            var item = document.createElement('li');
            item.className = 'toc-item';
            item.dataset.chapterId = chapter.id;
            if (chapter.scope) {
                item.dataset.scope = chapter.scope;
            }
            item.innerHTML =
                '<div class="toc-title">' + escapeHtml(chapter.title) + '</div>' +
                '<p class="toc-summary">' + escapeHtml(chapter.summary) + '</p>';
            _this.tocList.appendChild(item);
        });
        this.applyGuidedToc();
    };

    GitReaderApp.prototype.loadChapter = function (chapterId) {
        var _this = this;
        if (this.tocMode === 'routes') {
            return this.loadStoryArc(chapterId);
        }
        if (this.tourActive) {
            return Promise.resolve();
        }
        var requestToken = ++this.chapterRequestToken;
        this.currentChapterId = chapterId;
        this.setActiveToc(chapterId);
        this.activeStoryArc = null;
        var chapter = this.chapters.find(function (entry) { return entry.id === chapterId; });
        var scope = (chapter && chapter.scope) || this.getScopeForChapter(chapterId);
        this.focusedNodeId = null;
        return this.loadGraphForScope(scope).then(function () {
            if (requestToken !== _this.chapterRequestToken) {
                return;
            }
            var nodes = _this.filterNodesForChapter(chapterId);
            var edges = _this.filterEdgesForNodes(nodes);
            var graphView = _this.buildGraphView(nodes, edges, scope);
            var focus = _this.pickFocusNode(graphView.nodes);
            _this.renderGraph(graphView.nodes, graphView.edges);
            _this.updateGraphNodeStatus(graphView);
            _this.loadSymbolSnippet(focus).catch(function () {
                _this.renderCode(focus);
                _this.updateNarrator(focus);
            });
        });
    };

    GitReaderApp.prototype.loadStoryArc = function (arcId) {
        var _this = this;
        var requestToken = ++this.chapterRequestToken;
        this.currentChapterId = arcId;
        this.setActiveToc(arcId);
        this.activeStoryArc = null;
        if (!arcId) {
            this.renderStoryArcEmpty();
            return Promise.resolve();
        }
        if (this.tourActive) {
            return Promise.resolve();
        }
        var arc = this.storyArcsById.get(arcId);
        var arcPromise = arc
            ? Promise.resolve(arc)
            : this.fetchJson(this.buildApiUrl('/gitreader/api/story', { id: arcId })).then(function (response) {
                return Array.isArray(response.arcs) ? response.arcs[0] : null;
            });
        return arcPromise.then(function (resolved) {
            if (requestToken !== _this.chapterRequestToken) {
                return;
            }
            if (!resolved) {
                _this.renderStoryArcMissing();
                return;
            }
            arc = resolved;
            _this.activeStoryArc = arc;
            _this.syncRoutePickerSelection(arcId);
            _this.focusedNodeId = arc.entry_id;
            return _this.loadGraphForScope('full').then(function () {
                if (requestToken !== _this.chapterRequestToken) {
                    return;
                }
                var nodes = _this.graphNodes;
                var edges = _this.filterEdgesForNodes(nodes);
                var graphView = _this.buildGraphView(nodes, edges, 'full');
                _this.renderGraph(graphView.nodes, graphView.edges);
                _this.updateGraphNodeStatus(graphView);
                var entryNode = _this.nodeById.get(arc.entry_id) || _this.pickFocusNode(graphView.nodes);
                if (entryNode) {
                    if (_this.graphInstance) {
                        _this.graphInstance.$('node:selected').unselect();
                        var element = _this.graphInstance.$id(entryNode.id);
                        if (element && typeof element.select === 'function') {
                            element.select();
                        }
                    }
                    return _this.loadSymbolSnippet(entryNode, false).catch(function () {
                        _this.renderCode(entryNode);
                    }).then(function () {
                        _this.renderStoryArc(arc);
                    });
                }
                _this.renderStoryArc(arc);
            });
        });
    };

    GitReaderApp.prototype.getScopeForChapter = function (chapterId) {
        if (chapterId && (chapterId.indexOf('group:') === 0 || chapterId.indexOf('story:') === 0)) {
            return chapterId;
        }
        return 'full';
    };

    GitReaderApp.prototype.loadGraphForScope = function (scope) {
        var _this = this;
        if (this.currentScope === scope && this.graphNodes.length > 0) {
            return Promise.resolve();
        }
        var requestToken = ++this.graphRequestToken;
        this.currentScope = scope;
        var cached = this.graphCache.get(scope);
        if (cached) {
            this.setGraphData(cached);
            return Promise.resolve();
        }
        var graphPromise = this.graphLoadPromises.get(scope);
        if (!graphPromise) {
            graphPromise = this.fetchJson(this.buildApiUrl('/gitreader/api/graph', scope && scope !== 'full' ? { scope: scope } : undefined));
            this.graphLoadPromises.set(scope, graphPromise);
        }
        return graphPromise.then(function (graphData) {
            _this.graphLoadPromises.delete(scope);
            if (requestToken !== _this.graphRequestToken) {
                return;
            }
            _this.graphCache.set(scope, graphData);
            _this.setGraphData(graphData);
        });
    };

    GitReaderApp.prototype.getNodeCapForScope = function (scope, totalNodes) {
        var cap = this.graphNodeCapByScope.get(scope);
        if (cap === undefined) {
            cap = Math.min(this.graphNodeCap, totalNodes);
            this.graphNodeCapByScope.set(scope, cap);
        } else if (cap > totalNodes) {
            cap = totalNodes;
            this.graphNodeCapByScope.set(scope, cap);
        }
        return cap;
    };

    GitReaderApp.prototype.buildGraphView = function (nodes, edges, scope) {
        if (this.graphLayoutMode === 'cluster') {
            return this.buildClusterView(nodes, edges);
        }
        var totalNodes = nodes.length;
        var cap = this.getNodeCapForScope(scope, totalNodes);
        if (cap >= totalNodes) {
            return {
                nodes: nodes,
                edges: edges,
                totalNodes: totalNodes,
                visibleNodes: totalNodes,
                isCapped: false
            };
        }
        var nodeMap = new Map(nodes.map(function (node) { return [node.id, node]; }));
        var degree = new Map();
        edges.forEach(function (edge) {
            if (nodeMap.has(edge.source)) {
                degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
            }
            if (nodeMap.has(edge.target)) {
                degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
            }
        });
        var keepIds = new Set();
        var selectedNodeId = this.getSelectedGraphNodeId();
        if (selectedNodeId && nodeMap.has(selectedNodeId)) {
            keepIds.add(selectedNodeId);
        }
        if (this.currentSymbol && nodeMap.has(this.currentSymbol.id)) {
            keepIds.add(this.currentSymbol.id);
            var fileNode = this.getFileNodeForSymbol(this.currentSymbol);
            if (fileNode && nodeMap.has(fileNode.id)) {
                keepIds.add(fileNode.id);
            }
        }
        if (this.focusedNodeId && nodeMap.has(this.focusedNodeId)) {
            keepIds.add(this.focusedNodeId);
        }
        var kindWeight = {
            function: 0,
            method: 1,
            class: 2,
            file: 3,
            blueprint: 4,
            external: 5
        };
        var sorted = nodes.slice().sort(function (a, b) {
            var aDegree = degree.get(a.id) || 0;
            var bDegree = degree.get(b.id) || 0;
            if (aDegree !== bDegree) {
                return bDegree - aDegree;
            }
            var aWeight = kindWeight[a.kind] !== undefined ? kindWeight[a.kind] : 10;
            var bWeight = kindWeight[b.kind] !== undefined ? kindWeight[b.kind] : 10;
            if (aWeight !== bWeight) {
                return aWeight - bWeight;
            }
            return a.name.localeCompare(b.name);
        });
        var targetSize = Math.max(cap, keepIds.size);
        var selectedNodes = [];
        sorted.forEach(function (node) {
            if (keepIds.has(node.id)) {
                selectedNodes.push(node);
            }
        });
        for (var i = 0; i < sorted.length; i += 1) {
            if (selectedNodes.length >= targetSize) {
                break;
            }
            var node = sorted[i];
            if (keepIds.has(node.id)) {
                continue;
            }
            selectedNodes.push(node);
        }
        var selectedIds = new Set(selectedNodes.map(function (node) { return node.id; }));
        var trimmedEdges = edges.filter(function (edge) { return selectedIds.has(edge.source) && selectedIds.has(edge.target); });
        return {
            nodes: selectedNodes,
            edges: trimmedEdges,
            totalNodes: totalNodes,
            visibleNodes: selectedNodes.length,
            isCapped: totalNodes > selectedNodes.length
        };
    };

    GitReaderApp.prototype.buildClusterView = function (nodes, edges) {
        var _this = this;
        var totalNodes = nodes.length;
        var fileNodes = nodes.filter(function (node) { return node.kind === 'file' && node.location && node.location.path; });
        if (fileNodes.length === 0) {
            return {
                nodes: nodes,
                edges: edges,
                totalNodes: totalNodes,
                visibleNodes: nodes.length,
                isCapped: false
            };
        }
        var fileTree = this.buildFileTreeFromNodes(fileNodes);
        var pathToFileNode = new Map();
        var filePathById = new Map();
        fileNodes.forEach(function (node) {
            var normalized = _this.normalizePath((node.location && node.location.path) || '');
            if (!normalized) {
                return;
            }
            pathToFileNode.set(normalized, node);
            filePathById.set(node.id, normalized);
        });
        var symbolsByFile = new Map();
        nodes.forEach(function (node) {
            if (node.kind === 'file' || node.kind === 'external' || !(node.location && node.location.path)) {
                return;
            }
            var normalized = _this.normalizePath(node.location.path);
            var list = symbolsByFile.get(normalized) || [];
            list.push(node);
            symbolsByFile.set(normalized, list);
        });
        var visibleNodes = [];
        var visibleNodeIds = new Set();
        var visibleFileIds = new Set();
        var folderEdges = [];
        var addNode = function (node) {
            if (visibleNodeIds.has(node.id)) {
                return;
            }
            visibleNodes.push(node);
            visibleNodeIds.add(node.id);
        };
        var addFolderEdge = function (source, target) {
            folderEdges.push({
                source: source,
                target: target,
                kind: 'contains',
                confidence: 'low'
            });
        };
        var visitTree = function (treeNode, parentFolderId) {
            var entries = Array.from(treeNode.children.values());
            entries.sort(function (a, b) {
                if (a.isFile !== b.isFile) {
                    return a.isFile ? 1 : -1;
                }
                return a.name.localeCompare(b.name);
            });
            entries.forEach(function (child) {
                if (child.isFile) {
                    var fileNode = pathToFileNode.get(child.path);
                    if (!fileNode) {
                        return;
                    }
                    addNode(fileNode);
                    visibleFileIds.add(fileNode.id);
                    if (parentFolderId) {
                        addFolderEdge(parentFolderId, fileNode.id);
                    }
                    return;
                }
                var folderId = _this.getFolderClusterId(child.path);
                var fileCount = _this.countFilesInTree(child);
                var folderNode = {
                    id: folderId,
                    name: '(' + fileCount + ' files) ' + child.name,
                    kind: 'folder',
                    summary: '',
                    location: {
                        path: child.path,
                        start_line: 0,
                        end_line: 0,
                        start_col: 0,
                        end_col: 0
                    }
                };
                addNode(folderNode);
                if (parentFolderId) {
                    addFolderEdge(parentFolderId, folderId);
                }
                if (_this.clusterExpanded.has(folderId)) {
                    visitTree(child, folderId);
                }
            });
        };
        visitTree(fileTree, null);

        if (this.showExternalNodes) {
            nodes.forEach(function (node) {
                if (node.kind === 'external') {
                    addNode(node);
                }
            });
        }

        visibleFileIds.forEach(function (fileId) {
            if (!_this.clusterExpanded.has(fileId)) {
                return;
            }
            var path = filePathById.get(fileId);
            if (!path) {
                return;
            }
            var children = symbolsByFile.get(path);
            if (!children) {
                return;
            }
            children.forEach(function (child) { return addNode(child); });
        });

        var nodeMap = new Map(nodes.map(function (node) { return [node.id, node]; }));
        var edgeMap = new Map();
        var confidenceRank = { low: 0, medium: 1, high: 2 };
        var addEdge = function (source, target, kind, confidence) {
            var key = source + ':' + target + ':' + kind;
            var existing = edgeMap.get(key);
            if (!existing) {
                edgeMap.set(key, { source: source, target: target, kind: kind, confidence: confidence });
                return;
            }
            if (confidenceRank[confidence] > confidenceRank[existing.confidence]) {
                existing.confidence = confidence;
            }
        };
        var resolveRepresentative = function (node) {
            var _a;
            if (node.kind === 'external') {
                return _this.showExternalNodes ? node.id : null;
            }
            var path = (_a = node.location) && _a.path;
            if (!path) {
                return visibleNodeIds.has(node.id) ? node.id : null;
            }
            var normalized = _this.normalizePath(path);
            var fileNode = pathToFileNode.get(normalized);
            var fileId = fileNode && fileNode.id;
            var fileVisible = Boolean(fileId && visibleNodeIds.has(fileId));
            if (node.kind === 'file') {
                if (fileVisible && fileId) {
                    return fileId;
                }
                var folderId = _this.findCollapsedFolderId(normalized);
                if (folderId && visibleNodeIds.has(folderId)) {
                    return folderId;
                }
                return fileId || null;
            }
            if (fileVisible && fileId) {
                if (_this.clusterExpanded.has(fileId) && visibleNodeIds.has(node.id)) {
                    return node.id;
                }
                return fileId;
            }
            var folderId = _this.findCollapsedFolderId(normalized);
            if (folderId && visibleNodeIds.has(folderId)) {
                return folderId;
            }
            return fileId || null;
        };

        edges.forEach(function (edge) {
            var sourceNode = nodeMap.get(edge.source);
            var targetNode = nodeMap.get(edge.target);
            if (!sourceNode || !targetNode) {
                return;
            }
            var sourceRep = resolveRepresentative(sourceNode);
            var targetRep = resolveRepresentative(targetNode);
            if (!sourceRep || !targetRep || sourceRep === targetRep) {
                return;
            }
            addEdge(sourceRep, targetRep, edge.kind, edge.confidence);
        });
        folderEdges.forEach(function (edge) { return addEdge(edge.source, edge.target, edge.kind, edge.confidence); });

        return {
            nodes: visibleNodes,
            edges: Array.from(edgeMap.values()),
            totalNodes: totalNodes,
            visibleNodes: visibleNodes.length,
            isCapped: false
        };
    };

    GitReaderApp.prototype.updateGraphNodeStatus = function (graphView) {
        if (graphView.totalNodes === 0) {
            this.graphNodeStatus.textContent = '';
            this.graphRevealButton.disabled = true;
            return;
        }
        if (this.tourActive) {
            this.graphNodeStatus.textContent = 'Guided view: ' + graphView.visibleNodes + '/' + graphView.totalNodes;
            this.graphRevealButton.disabled = true;
            this.graphRevealButton.textContent = 'Guided';
            return;
        }
        if (this.graphLayoutMode === 'cluster') {
            this.graphNodeStatus.textContent = 'Cluster view: ' + graphView.visibleNodes + ' groups from ' + graphView.totalNodes;
            this.graphRevealButton.disabled = true;
            this.graphRevealButton.textContent = 'Show more';
            return;
        }
        if (!graphView.isCapped) {
            this.graphNodeStatus.textContent = 'Showing ' + graphView.visibleNodes + ' nodes';
            this.graphRevealButton.disabled = true;
            this.graphRevealButton.textContent = 'Show more';
            return;
        }
        this.graphNodeStatus.textContent = 'Showing ' + graphView.visibleNodes + ' of ' + graphView.totalNodes;
        var nextCap = Math.min(graphView.totalNodes, graphView.visibleNodes + this.graphNodeCapStep);
        this.graphRevealButton.textContent = nextCap >= graphView.totalNodes ? 'Show all' : 'Show more';
        this.graphRevealButton.disabled = false;
    };

    GitReaderApp.prototype.revealMoreNodes = function () {
        if (!this.currentChapterId) {
            return;
        }
        var nodes = this.filterNodesForChapter(this.currentChapterId);
        var total = nodes.length;
        var cap = this.getNodeCapForScope(this.currentScope, total);
        if (cap >= total) {
            return;
        }
        var nextCap = Math.min(total, cap + this.graphNodeCapStep);
        this.graphNodeCapByScope.set(this.currentScope, nextCap);
        this.refreshGraphView();
    };

    GitReaderApp.prototype.refreshGraphView = function () {
        if (!this.currentChapterId) {
            return;
        }
        var nodes = this.filterNodesForChapter(this.currentChapterId);
        var edges = this.filterEdgesForNodes(nodes);
        var graphView = this.buildGraphView(nodes, edges, this.currentScope);
        this.renderGraph(graphView.nodes, graphView.edges);
        this.updateGraphNodeStatus(graphView);
    };

    GitReaderApp.prototype.setGraphData = function (graphData) {
        var _this = this;
        this.graphNodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
        this.graphEdges = Array.isArray(graphData.edges) ? graphData.edges : [];
        this.nodeById = new Map(this.graphNodes.map(function (node) { return [node.id, node]; }));
        this.fileNodesByPath = new Map();
        this.graphNodes.forEach(function (node) {
            if (node.kind !== 'file' || !node.location || !node.location.path) {
                return;
            }
            _this.fileNodesByPath.set(_this.normalizePath(node.location.path), node);
        });
        if (this.currentScope === 'full' || this.tourActive) {
            this.refreshFileTree();
        }
    };

    GitReaderApp.prototype.loadSymbolSnippet = function (symbol, shouldNarrate) {
        var _this = this;
        if (shouldNarrate === void 0) { shouldNarrate = true; }
        if (shouldNarrate) {
            this.activeStoryArc = null;
        }
        if (!this.canFetchSnippet(symbol)) {
            this.renderCode(symbol);
            if (shouldNarrate) {
                this.updateNarrator(symbol);
            }
            return Promise.resolve();
        }
        var section = this.getSnippetSection(symbol);
        var cacheKey = symbol.id + ':' + section;
        var cached = this.snippetCache.get(cacheKey);
        if (cached) {
            this.renderCode(symbol, cached);
            if (shouldNarrate) {
                this.updateNarrator(symbol);
            }
            return Promise.resolve();
        }
        return this.fetchJson(this.buildApiUrl('/gitreader/api/symbol', { id: symbol.id, section: section }))
            .then(function (response) {
                _this.snippetCache.set(cacheKey, response);
                _this.renderCode(symbol, response);
                if (shouldNarrate) {
                    _this.updateNarrator(symbol);
                }
            });
    };

    GitReaderApp.prototype.getSnippetSection = function (symbol) {
        if (this.snippetMode === 'full') {
            return 'full';
        }
        if (symbol.kind === 'function' || symbol.kind === 'method' || symbol.kind === 'class') {
            return 'body';
        }
        return 'full';
    };

    GitReaderApp.prototype.canFetchSnippet = function (symbol) {
        if (!symbol.id) {
            return false;
        }
        if (symbol.kind === 'external' || symbol.kind === 'folder') {
            return false;
        }
        return Boolean(symbol.location && symbol.location.path);
    };

    GitReaderApp.prototype.filterNodesForChapter = function (chapterId) {
        if (!chapterId || chapterId.indexOf('group:') !== 0) {
            return this.graphNodes;
        }
        var group = chapterId.slice('group:'.length);
        var filtered = this.graphNodes.filter(function (node) {
            var path = node.location && node.location.path ? node.location.path : null;
            if (!path) {
                return false;
            }
            var normalized = path.replace(/\\/g, '/');
            if (group === 'root') {
                return normalized.indexOf('/') === -1;
            }
            return normalized.indexOf(group + '/') === 0;
        });
        return filtered.length > 0 ? filtered : this.graphNodes;
    };

    GitReaderApp.prototype.filterEdgesForNodes = function (nodes) {
        var allowed = new Set(nodes.map(function (node) { return node.id; }));
        return this.graphEdges.filter(function (edge) {
            return allowed.has(edge.source) && allowed.has(edge.target);
        });
    };

    GitReaderApp.prototype.pickFocusNode = function (nodes) {
        if (nodes.length === 0) {
            return this.fallbackSymbol();
        }
        var priority = ['function', 'method', 'class', 'file', 'folder', 'blueprint', 'external'];
        for (var i = 0; i < priority.length; i++) {
            var kind = priority[i];
            var match = nodes.find(function (node) { return node.kind === kind; });
            if (match) {
                return match;
            }
        }
        return nodes[0];
    };

    GitReaderApp.prototype.fallbackSymbol = function () {
        return {
            id: 'fallback',
            name: 'Repository',
            kind: 'file',
            summary: 'Select a chapter to explore symbols.'
        };
    };

    GitReaderApp.prototype.normalizePath = function (path) {
        return path.replace(/\\/g, '/');
    };

    GitReaderApp.prototype.isReaderVisible = function () {
        return this.workspace.dataset.layout !== 'canvas';
    };

    GitReaderApp.prototype.getFolderClusterId = function (path) {
        return 'cluster:folder:' + path;
    };

    GitReaderApp.prototype.findCollapsedFolderId = function (path) {
        var normalized = this.normalizePath(path);
        var parts = normalized.split('/').filter(Boolean);
        var current = '';
        for (var i = 0; i < parts.length - 1; i += 1) {
            var part = parts[i];
            current = current ? current + '/' + part : part;
            var folderId = this.getFolderClusterId(current);
            if (!this.clusterExpanded.has(folderId)) {
                return folderId;
            }
        }
        return null;
    };

    GitReaderApp.prototype.countFilesInTree = function (node) {
        var _this = this;
        if (node.isFile) {
            return 1;
        }
        var count = 0;
        node.children.forEach(function (child) {
            count += _this.countFilesInTree(child);
        });
        return count;
    };

    GitReaderApp.prototype.refreshFileTree = function () {
        if (!this.narratorFileTree) {
            return;
        }
        this.fileTreeRoot = this.buildFileTreeFromNodes(this.graphNodes);
        this.renderFileTree(this.fileTreeFocusPath);
    };

    GitReaderApp.prototype.buildFileTreeFromNodes = function (nodes) {
        var _this = this;
        var root = {
            name: '',
            path: '',
            isFile: false,
            children: new Map()
        };
        nodes.forEach(function (node) {
            var _a;
            if (node.kind !== 'file' || !((_a = node.location) && _a.path)) {
                return;
            }
            var normalized = _this.normalizePath(node.location.path);
            var parts = normalized.split('/').filter(Boolean);
            var cursor = root;
            var currentPath = '';
            parts.forEach(function (part, index) {
                currentPath = currentPath ? currentPath + '/' + part : part;
                var isFile = index === parts.length - 1;
                var next = cursor.children.get(part);
                if (!next) {
                    next = {
                        name: part,
                        path: currentPath,
                        isFile: isFile,
                        children: new Map()
                    };
                    cursor.children.set(part, next);
                }
                if (isFile) {
                    next.isFile = true;
                }
                cursor = next;
            });
        });
        return root;
    };

    GitReaderApp.prototype.renderFileTree = function (focusPath) {
        if (!this.narratorFileTree) {
            return;
        }
        var normalizedFocus = focusPath ? this.normalizePath(focusPath) : '';
        this.fileTreeFocusPath = normalizedFocus || null;
        var treeHtml = this.buildFileTreeMarkup(normalizedFocus);
        this.narratorFileTree.innerHTML = treeHtml;
    };

    GitReaderApp.prototype.renderFileTreeNode = function (node, focusPath, focusParentPath, collapsedFocusParents) {
        var _this = this;
        var entries = Array.from(node.children.values());
        if (entries.length === 0) {
            return '';
        }
        entries.sort(function (a, b) {
            if (a.isFile !== b.isFile) {
                return a.isFile ? 1 : -1;
            }
            return a.name.localeCompare(b.name);
        });
        var items = entries.map(function (child) {
            var isFocus = focusPath && child.path === focusPath;
            var isFocusFile = child.isFile && isFocus;
            var isFocusDir = !child.isFile && isFocus;
            var isFocusParent = !child.isFile && focusParentPath && child.path === focusParentPath;
            if (child.isFile) {
                return '\
                    <li class="file-tree-item' + (isFocusFile ? ' is-focus' : '') + '">\
                        <span class="file-tree-name">' + escapeHtml(child.name) + '</span>\
                    </li>\
                ';
            }
            var isCollapsed = _this.fileTreeCollapsed.has(child.path);
            var isCollapsedFocusParent = isCollapsed && collapsedFocusParents.has(child.path);
            var childrenHtml = _this.renderFileTreeNode(child, focusPath, focusParentPath, collapsedFocusParents);
            return '\
                <li class="file-tree-item is-dir' + (isCollapsed ? ' is-collapsed' : '') + (isFocusDir || isCollapsedFocusParent ? ' is-focus' : '') + '">\
                    <button class="file-tree-toggle" type="button" data-tree-toggle="' + escapeHtml(child.path) + '">\
                        <span class="file-tree-caret"></span>\
                        <span class="file-tree-name">' + escapeHtml(child.name) + '/</span>\
                    </button>\
                    <div class="file-tree-children">' + childrenHtml + '</div>\
                </li>\
            ';
        });
        return '<ul class="file-tree-list">' + items.join('') + '</ul>';
    };

    GitReaderApp.prototype.buildFileTreeMarkup = function (focusPath) {
        var normalizedFocus = focusPath ? this.normalizePath(focusPath) : '';
        if (normalizedFocus) {
            this.expandFileTreeForFocus(normalizedFocus);
        }
        if (!this.fileTreeRoot || this.fileTreeRoot.children.size === 0) {
            return '<p class="file-tree-empty">No files loaded yet.</p>';
        }
        var focusParentPath = this.getParentPath(normalizedFocus);
        var collapsedFocusParents = this.getCollapsedFocusParents(normalizedFocus);
        var treeHtml = this.renderFileTreeNode(this.fileTreeRoot, normalizedFocus, focusParentPath, collapsedFocusParents);
        return treeHtml || '<p class="file-tree-empty">No files loaded yet.</p>';
    };

    GitReaderApp.prototype.toggleFileTreePath = function (path) {
        if (this.fileTreeCollapsed.has(path)) {
            this.fileTreeCollapsed.delete(path);
        } else {
            this.fileTreeCollapsed.add(path);
        }
        this.renderFileTree(this.fileTreeFocusPath);
        if (this.readerTreeFocusPath) {
            this.renderReaderFileTree(this.readerTreeFocusPath);
        }
    };

    GitReaderApp.prototype.expandFileTreePath = function (path) {
        var normalized = this.normalizePath(path);
        var parts = normalized.split('/').filter(Boolean);
        var current = '';
        var parentParts = parts.slice(0, -1);
        for (var i = 0; i < parentParts.length; i += 1) {
            var part = parentParts[i];
            current = current ? current + '/' + part : part;
            if (this.fileTreeCollapsed.has(current)) {
                break;
            }
            this.fileTreeCollapsed.delete(current);
        }
    };

    GitReaderApp.prototype.expandFileTreeForFocus = function (path) {
        if (this.fileNodesByPath.has(path)) {
            this.expandFileTreePath(path);
            return;
        }
        this.expandFileTreeFolder(path);
    };

    GitReaderApp.prototype.expandFileTreeFolder = function (path) {
        var normalized = this.normalizePath(path);
        var parts = normalized.split('/').filter(Boolean);
        var current = '';
        for (var i = 0; i < parts.length; i += 1) {
            var part = parts[i];
            current = current ? current + '/' + part : part;
            this.fileTreeCollapsed.delete(current);
        }
    };

    GitReaderApp.prototype.getParentPath = function (path) {
        if (!path) {
            return null;
        }
        var normalized = this.normalizePath(path);
        var parts = normalized.split('/').filter(Boolean);
        if (parts.length <= 1) {
            return null;
        }
        return parts.slice(0, -1).join('/');
    };

    GitReaderApp.prototype.getCollapsedFocusParents = function (path) {
        var collapsed = new Set();
        if (!path) {
            return collapsed;
        }
        var normalized = this.normalizePath(path);
        var parts = normalized.split('/').filter(Boolean);
        var current = '';
        for (var i = 0; i < parts.length - 1; i += 1) {
            var part = parts[i];
            current = current ? current + '/' + part : part;
            if (this.fileTreeCollapsed.has(current)) {
                collapsed.add(current);
            }
        }
        return collapsed;
    };

    GitReaderApp.prototype.getFileNodeForSymbol = function (symbol) {
        var path = symbol.location && symbol.location.path ? symbol.location.path : null;
        if (!path) {
            return null;
        }
        return this.fileNodesByPath.get(this.normalizePath(path)) || null;
    };

    GitReaderApp.prototype.isModifierClick = function (event) {
        if (!event) {
            return false;
        }
        return Boolean(event.metaKey || event.ctrlKey);
    };

    GitReaderApp.prototype.isFileNodeActive = function (fileNode) {
        var _a, _b;
        if (this.currentSymbol && this.currentSymbol.kind === 'file') {
            if (this.currentSymbol.id === fileNode.id) {
                return true;
            }
            var currentPath = (_a = this.currentSymbol.location) && _a.path;
            var filePath = (_b = fileNode.location) && _b.path;
            if (currentPath && filePath && this.normalizePath(currentPath) === this.normalizePath(filePath)) {
                return true;
            }
        }
        if (!this.graphInstance) {
            return false;
        }
        var element = this.graphInstance.$id(fileNode.id);
        return Boolean(element && typeof element.selected === 'function' && element.selected());
    };

    GitReaderApp.prototype.highlightSymbolInFile = function (fileNode, symbol) {
        var _this = this;
        if (!this.currentSymbol || this.currentSymbol.id !== fileNode.id) {
            return this.loadSymbolSnippet(fileNode)
                .catch(function () {
                    _this.renderCode(fileNode);
                    _this.updateNarrator(fileNode);
                })
                .then(function () {
                    _this.applyFocusHighlight(symbol);
                });
        }
        this.applyFocusHighlight(symbol);
        return Promise.resolve();
    };

    GitReaderApp.prototype.handleFileFocusClick = function (symbol, event) {
        if (!this.isModifierClick(event)) {
            return false;
        }
        if (symbol.kind !== 'function' && symbol.kind !== 'method') {
            return false;
        }
        var fileNode = this.getFileNodeForSymbol(symbol);
        if (!fileNode || !this.isFileNodeActive(fileNode)) {
            return false;
        }
        if (this.graphInstance) {
            this.graphInstance.$id(fileNode.id).select();
            this.graphInstance.$id(symbol.id).select();
        }
        this.highlightSymbolInFile(fileNode, symbol);
        return true;
    };

    GitReaderApp.prototype.handleClusterNodeToggle = function (symbol, event) {
        var _a;
        if (symbol.kind === 'folder') {
            this.toggleClusterExpansion(symbol.id);
            return true;
        }
        if (symbol.kind !== 'file') {
            return false;
        }
        if (this.isModifierClick(event)) {
            return false;
        }
        if (!((_a = symbol.location) && _a.path)) {
            return false;
        }
        if (!this.fileHasClusterChildren(symbol)) {
            return false;
        }
        this.toggleClusterExpansion(symbol.id);
        return true;
    };

    GitReaderApp.prototype.handleClusterFolderSingleClick = function (symbol) {
        var _a;
        if (symbol.kind !== 'folder') {
            return false;
        }
        if (this.isReaderVisible()) {
            var folderPath = (_a = symbol.location) && _a.path;
            if (folderPath) {
                this.renderReaderFileTree(folderPath);
                this.renderFileTree(folderPath);
                this.renderFileTreeNarrator();
            }
        }
        return true;
    };

    GitReaderApp.prototype.toggleClusterExpansion = function (nodeId) {
        if (this.clusterExpanded.has(nodeId)) {
            this.clusterExpanded.delete(nodeId);
        } else {
            this.clusterExpanded.add(nodeId);
        }
        this.refreshGraphView();
    };

    GitReaderApp.prototype.fileHasClusterChildren = function (fileNode) {
        var _this = this;
        var path = fileNode.location && fileNode.location.path;
        if (!path) {
            return false;
        }
        var normalized = this.normalizePath(path);
        return this.graphNodes.some(function (node) {
            if (node.kind === 'file' || node.kind === 'external') {
                return false;
            }
            if (!(node.location && node.location.path)) {
                return false;
            }
            return _this.normalizePath(node.location.path) === normalized;
        });
    };

    GitReaderApp.prototype.applyFocusHighlight = function (symbol) {
        var _a, _b;
        var start = ((_a = symbol.location) && _a.start_line) || 0;
        var end = ((_b = symbol.location) && _b.end_line) || start;
        if (!start) {
            this.setCodeStatus('Line range unavailable.');
            return;
        }
        this.clearFocusHighlights();
        var firstLine = null;
        var found = false;
        for (var line = start; line <= end; line += 1) {
            var lineEl = this.codeSurface.querySelector('[data-line="' + line + '"]');
            if (!lineEl) {
                continue;
            }
            lineEl.classList.add('is-focus');
            if (!firstLine) {
                firstLine = lineEl;
            }
            found = true;
        }
        if (!found) {
            this.setCodeStatus('Selection outside snippet.');
            return;
        }
        this.setCodeStatus('Highlighted ' + symbol.name + '.');
        if (firstLine) {
            firstLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    GitReaderApp.prototype.clearFocusHighlights = function () {
        var lines = this.codeSurface.querySelectorAll('.code-line.is-focus');
        Array.prototype.forEach.call(lines, function (line) {
            line.classList.remove('is-focus');
        });
    };

    GitReaderApp.prototype.setActiveToc = function (chapterId) {
        Array.prototype.forEach.call(this.tocList.children, function (child) {
            var element = child;
            var isActive = element.dataset.chapterId === chapterId;
            element.classList.toggle('is-active', isActive);
        });
        if (this.tocMode === 'routes') {
            this.syncRoutePickerSelection(chapterId);
        } else {
            this.syncRoutePickerSelection('');
        }
    };

    GitReaderApp.prototype.syncRoutePickerSelection = function (arcId) {
        if (!this.storyArcsById.has(arcId)) {
            this.routeSelect.value = '';
            return;
        }
        this.routeSelect.value = arcId;
    };

    GitReaderApp.prototype.formatLocation = function (location, startLine, endLine) {
        if (!location || !location.path) {
            return 'location unknown';
        }
        if (startLine && startLine > 0) {
            var endLabel = endLine && endLine !== startLine ? '-' + endLine : '';
            return '' + location.path + ':' + startLine + endLabel;
        }
        if (location.start_line) {
            var fallbackEnd = location.end_line && location.end_line !== location.start_line
                ? '-' + location.end_line
                : '';
            return '' + location.path + ':' + location.start_line + fallbackEnd;
        }
        return location.path;
    };

    GitReaderApp.prototype.renderCode = function (symbol, snippet) {
        var summary = (snippet && snippet.summary) || symbol.summary || 'No summary yet.';
        var signature = (snippet && snippet.signature) || symbol.signature || 'signature pending';
        var displayRange = this.getDisplayRange(symbol, snippet);
        var locationLabel = this.formatLocation(symbol.location, displayRange.startLine, displayRange.endLine);
        var truncationLabel = snippet && snippet.truncated ? ' (truncated)' : '';
        var language = this.getHighlightLanguage(symbol.location && symbol.location.path);
        var snippetHtml = this.renderSnippetLines(snippet, language);
        var revealLabel = snippet && snippet.section === 'body' ? 'Show body' : 'Show code';
        var codeClass = this.hasHighlightSupport() && language ? 'hljs language-' + language : '';
        var breadcrumbHtml = this.renderImportBreadcrumbs(symbol.location && symbol.location.path);
        this.currentSymbol = symbol;
        this.readerTreeFocusPath = null;
        this.currentSnippetText = (snippet && snippet.snippet) || '';
        this.currentSnippetStartLine = (snippet && snippet.start_line) || (symbol.location && symbol.location.start_line) || 1;
        this.codeSurface.innerHTML =
            '<article class="code-card">' +
            '<div class="code-meta">' +
            '<span>' + escapeHtml(symbol.kind.toUpperCase()) + '</span>' +
            '<span>' + escapeHtml(locationLabel) + escapeHtml(truncationLabel) + '</span>' +
            '</div>' +
            breadcrumbHtml +
            '<div class="code-actions">' +
            '<button class="ghost-btn" data-reader-action="copy">Copy snippet</button>' +
            '<div class="jump-control">' +
            '<label for="line-jump">Line</label>' +
            '<input id="line-jump" type="number" min="1" placeholder="Line" data-line-input>' +
            '<button class="ghost-btn" data-reader-action="jump">Go</button>' +
            '</div>' +
            '<span class="code-status" data-code-status></span>' +
            '</div>' +
            '<div>' +
            '<h3>' + escapeHtml(symbol.name) + '</h3>' +
            '<p>' + escapeHtml(summary) + '</p>' +
            '</div>' +
            '<div class="code-signature">' + escapeHtml(signature) + '</div>' +
            '<details class="code-details" open>' +
            '<summary>' + revealLabel + '</summary>' +
            '<pre><code class="' + codeClass + '">' + snippetHtml + '</code></pre>' +
            '</details>' +
            '</article>';
        this.applyGuidedCodeFocus();
        this.decorateImportLines(snippet, language);
        this.applyFoldControls(symbol);
    };

    GitReaderApp.prototype.decorateImportLines = function (snippet, language) {
        var _this = this;
        if (!(snippet && snippet.snippet) || !this.currentSymbol || this.currentSymbol.kind !== 'file') {
            return;
        }
        this.clearImportUsageHighlights();
        var raw = snippet.snippet.replace(/\n$/, '');
        if (!raw) {
            return;
        }
        var lines = raw.split('\n');
        var startLine = (snippet && snippet.start_line) || 1;
        var isJsFamily = language === 'javascript' || language === 'typescript' || language === 'tsx';
        if (isJsFamily) {
            var blocks = this.findJSImportBlocks(lines);
            if (blocks.length > 0) {
                blocks.forEach(function (block) {
                    var normalized = block.text.replace(/\s+/g, ' ').trim();
                    var importNames = _this.extractImportNames(normalized, language);
                    if (importNames.length === 0) {
                        return;
                    }
                    for (var index = block.start; index <= block.end; index += 1) {
                        var lineText = lines[index];
                        var lineImports = _this.filterImportNamesForLine(lineText, importNames);
                        if (lineImports.length === 0) {
                            continue;
                        }
                        var lineNumber = startLine + index;
                        var lineEl = _this.codeSurface.querySelector('[data-line="' + lineNumber + '"]');
                        if (!lineEl) {
                            continue;
                        }
                        lineEl.dataset.imports = lineImports.join(',');
                        lineEl.dataset.importStatement = normalized;
                        _this.decorateImportLine(lineEl, lineImports);
                    }
                });
                return;
            }
        }
        lines.forEach(function (lineText, index) {
            var importNames = _this.extractImportNames(lineText, language);
            if (importNames.length === 0) {
                return;
            }
            var lineNumber = startLine + index;
            var lineEl = _this.codeSurface.querySelector('[data-line="' + lineNumber + '"]');
            if (!lineEl) {
                return;
            }
            lineEl.dataset.imports = importNames.join(',');
            _this.decorateImportLine(lineEl, importNames);
        });
    };

    GitReaderApp.prototype.decorateImportLine = function (lineEl, importNames) {
        if (importNames.length === 0) {
            return;
        }
        var escaped = importNames.map(this.escapeRegex.bind(this));
        var matcher = new RegExp('\\b(' + escaped.join('|') + ')\\b', 'g');
        var walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                if (!node.textContent || !matcher.test(node.textContent)) {
                    matcher.lastIndex = 0;
                    return NodeFilter.FILTER_REJECT;
                }
                matcher.lastIndex = 0;
                var parent = node.parentElement;
                if (!parent || parent.closest('.line-no')) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (parent.closest('.code-import')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        var textNodes = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }
        textNodes.forEach(function (textNode) {
            var text = textNode.textContent || '';
            var fragment = document.createDocumentFragment();
            var lastIndex = 0;
            var match = matcher.exec(text);
            while (match) {
                var start = match.index;
                var end = start + match[0].length;
                if (start > lastIndex) {
                    fragment.append(text.slice(lastIndex, start));
                }
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'code-import';
                button.dataset.importName = match[0];
                button.textContent = match[0];
                fragment.append(button);
                lastIndex = end;
                match = matcher.exec(text);
            }
            matcher.lastIndex = 0;
            if (lastIndex < text.length) {
                fragment.append(text.slice(lastIndex));
            }
            if (textNode.parentNode) {
                textNode.parentNode.replaceChild(fragment, textNode);
            }
        });
    };

    GitReaderApp.prototype.updateImportBreadcrumbs = function (fromPath, toPath) {
        var from = this.normalizePath(fromPath);
        var to = this.normalizePath(toPath);
        if (!from || !to) {
            return;
        }
        var last = this.importBreadcrumbs[this.importBreadcrumbs.length - 1];
        if (!last || last !== from) {
            this.importBreadcrumbs = [from];
        }
        if (from === to) {
            return;
        }
        if (this.importBreadcrumbs[this.importBreadcrumbs.length - 1] !== to) {
            this.importBreadcrumbs.push(to);
        }
    };

    GitReaderApp.prototype.renderImportBreadcrumbs = function (path) {
        if (!path || this.importBreadcrumbs.length < 2) {
            return '';
        }
        var normalized = this.normalizePath(path);
        var currentIndex = this.importBreadcrumbs.lastIndexOf(normalized);
        if (currentIndex < 0) {
            return '';
        }
        var crumbs = this.importBreadcrumbs.slice();
        var items = crumbs.map(function (crumbPath, index) {
            var label = escapeHtml(this.getBreadcrumbLabel(crumbPath));
            var escapedPath = escapeHtml(crumbPath);
            var isCurrent = index === currentIndex;
            var currentAttr = isCurrent ? ' aria-current="page"' : '';
            var currentClass = isCurrent ? ' is-current' : '';
            return '<button class="breadcrumb' + currentClass + '" data-breadcrumb-path="' + escapedPath + '"' + currentAttr + '>' + label + '</button>';
        }, this);
        return '<nav class="code-breadcrumbs" aria-label="Import trail">' +
            items.join('<span class="breadcrumb-sep">&gt;</span>') +
            '</nav>';
    };

    GitReaderApp.prototype.getBreadcrumbLabel = function (path) {
        var normalized = this.normalizePath(path);
        var parts = normalized.split('/').filter(Boolean);
        if (parts.length <= 2) {
            return normalized;
        }
        return '.../' + parts.slice(-2).join('/');
    };

    GitReaderApp.prototype.navigateBreadcrumb = function (path) {
        var normalized = this.normalizePath(path);
        var index = this.importBreadcrumbs.lastIndexOf(normalized);
        if (index < 0) {
            this.importBreadcrumbs = [normalized];
        }
        var fileNode = this.fileNodesByPath.get(normalized);
        if (!fileNode) {
            this.setCodeStatus('"' + normalized + '" is not indexed in this project.');
            return;
        }
        this.jumpToSymbol(fileNode);
    };

    GitReaderApp.prototype.findJSImportBlocks = function (lines) {
        var _this = this;
        var blocks = [];
        var inBlock = false;
        var blockStart = 0;
        var blockText = '';
        lines.forEach(function (line, index) {
            var trimmed = line.trim();
            if (!inBlock) {
                if (!_this.isJSImportStart(trimmed)) {
                    return;
                }
                inBlock = true;
                blockStart = index;
                blockText = trimmed;
                if (_this.isJSImportComplete(blockText)) {
                    blocks.push({ start: blockStart, end: index, text: blockText });
                    inBlock = false;
                    blockText = '';
                }
                return;
            }
            if (trimmed) {
                blockText = blockText ? blockText + ' ' + trimmed : trimmed;
            }
            if (_this.isJSImportComplete(blockText)) {
                blocks.push({ start: blockStart, end: index, text: blockText });
                inBlock = false;
                blockText = '';
            }
        });
        if (inBlock) {
            blocks.push({ start: blockStart, end: lines.length - 1, text: blockText });
        }
        return blocks;
    };

    GitReaderApp.prototype.isJSImportStart = function (trimmed) {
        if (!trimmed) {
            return false;
        }
        if (trimmed.startsWith('import(')) {
            return false;
        }
        return /^import\b/.test(trimmed) || /^export\b/.test(trimmed);
    };

    GitReaderApp.prototype.isJSImportComplete = function (statement) {
        var normalized = statement.replace(/\s+/g, ' ').trim();
        if (!normalized) {
            return false;
        }
        if (/^export\b/.test(normalized) && !/\bfrom\s+['"][^'"]+['"]/.test(normalized)) {
            return true;
        }
        if (/\bfrom\s+['"][^'"]+['"]/.test(normalized)) {
            return true;
        }
        if (/^import\s+['"][^'"]+['"]/.test(normalized)) {
            return true;
        }
        if (/\brequire\s*\(\s*['"][^'"]+['"]\s*\)/.test(normalized)) {
            return true;
        }
        return normalized.endsWith(';');
    };

    GitReaderApp.prototype.filterImportNamesForLine = function (lineText, importNames) {
        var _this = this;
        if (!lineText || importNames.length === 0) {
            return [];
        }
        return importNames.filter(function (name) {
            var matcher = new RegExp('\\b' + _this.escapeRegex(name) + '\\b');
            return matcher.test(lineText);
        });
    };

    GitReaderApp.prototype.highlightImportUsage = function (importName) {
        if (!importName) {
            return;
        }
        var _this = this;
        this.clearImportUsageHighlights();
        var lines = Array.from(this.codeSurface.querySelectorAll('.code-line'));
        var firstMatch = null;
        var matchCount = 0;
        lines.forEach(function (line) {
            var imports = (line.dataset.imports || '').split(',').map(function (value) { return value.trim(); });
            if (imports.includes(importName)) {
                return;
            }
            if (_this.lineHasIdentifierUsage(line, importName)) {
                line.classList.add('is-import-usage');
                matchCount += 1;
                if (!firstMatch) {
                    firstMatch = line;
                }
            }
        });
        if (!firstMatch) {
            this.setCodeStatus('No usages of ' + importName + ' in this snippet.');
            return;
        }
        this.setCodeStatus('Found ' + matchCount + ' usage' + (matchCount === 1 ? '' : 's') + ' of ' + importName + '.');
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    GitReaderApp.prototype.handleImportJump = function (importName, lineEl) {
        var lineText = this.getLineTextForElement(lineEl || undefined);
        var language = this.getHighlightLanguage(this.currentSymbol && this.currentSymbol.location && this.currentSymbol.location.path);
        var currentPath = this.currentSymbol && this.currentSymbol.location && this.currentSymbol.location.path;
        var statement = (lineEl && lineEl.dataset && lineEl.dataset.importStatement) || lineText;
        var target = this.resolveImportTarget(importName, statement, language, currentPath);
        if (target) {
            var definitionName = this.getImportDefinitionName(importName, statement, language);
            this.navigateToSymbolDefinition(target, currentPath, definitionName);
            return;
        }
        var sourceLabel = statement ? ' from "' + statement.trim() + '"' : '';
        this.showImportModal('"' + importName + '" is not defined in this project' + sourceLabel + '.');
    };

    GitReaderApp.prototype.getLineTextForElement = function (lineEl) {
        if (!lineEl) {
            return '';
        }
        var lineNumber = Number(lineEl.dataset.line);
        if (Number.isFinite(lineNumber) && this.currentSnippetText) {
            var lines = this.currentSnippetText.replace(/\n$/, '').split('\n');
            var index = lineNumber - this.currentSnippetStartLine;
            if (index >= 0 && index < lines.length) {
                return lines[index];
            }
        }
        var textEl = lineEl.querySelector('.line-text');
        return (textEl && textEl.textContent) || '';
    };

    GitReaderApp.prototype.resolveImportTarget = function (importName, lineText, language, currentPath) {
        var normalizedPath = currentPath ? this.normalizePath(currentPath) : '';
        if (language === 'python') {
            return this.resolvePythonImportTarget(importName, lineText, normalizedPath);
        }
        if (language === 'swift') {
            return this.resolveSwiftImportTarget(importName, lineText);
        }
        if (language === 'javascript' || language === 'typescript' || language === 'tsx') {
            return this.resolveJsImportTarget(importName, lineText, normalizedPath);
        }
        return null;
    };

    GitReaderApp.prototype.resolvePythonImportTarget = function (importName, lineText, currentPath) {
        var entry = this.parsePythonImportEntry(lineText, importName);
        if (!entry) {
            return null;
        }
        var candidates = this.resolvePythonModuleCandidates(entry.module, currentPath);
        if (!entry.importedName) {
            return this.findFileByCandidates(candidates);
        }
        var symbolName = entry.importedName || importName;
        var symbol = this.findSymbolInFiles(symbolName, candidates);
        if (symbol) {
            return symbol;
        }
        var fileNode = this.findFileByCandidates(candidates);
        if (fileNode) {
            return fileNode;
        }
        if (entry.importedName) {
            var extended = this.resolvePythonModuleCandidates(entry.module + '.' + entry.importedName, currentPath);
            var extendedFile = this.findFileByCandidates(extended);
            if (extendedFile) {
                return extendedFile;
            }
        }
        return null;
    };

    GitReaderApp.prototype.resolveJsImportTarget = function (importName, lineText, currentPath) {
        var info = this.parseJsImportEntry(lineText, importName);
        if (!info || !info.source) {
            return null;
        }
        if (!this.isRelativeImport(info.source)) {
            return null;
        }
        var candidates = this.resolveJsModuleCandidates(info.source, currentPath);
        if (candidates.length === 0) {
            return null;
        }
        var importedName = info.importedName || importName;
        var symbol = this.findSymbolInFiles(importedName, candidates);
        if (symbol) {
            return symbol;
        }
        return this.findFileByCandidates(candidates);
    };

    GitReaderApp.prototype.resolveSwiftImportTarget = function (importName, lineText) {
        var moduleName = this.parseSwiftImportModule(lineText);
        if (!moduleName) {
            return null;
        }
        var moduleFile = this.findSwiftModuleFile(moduleName);
        if (moduleFile) {
            return moduleFile;
        }
        if (moduleName !== importName) {
            return this.findSwiftModuleFile(importName);
        }
        return null;
    };

    GitReaderApp.prototype.parsePythonImportEntry = function (lineText, importName) {
        var trimmed = lineText.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            return null;
        }
        if (trimmed.startsWith('import ')) {
            var rest = trimmed.slice('import '.length);
            var parts = rest.split(',');
            for (var i = 0; i < parts.length; i += 1) {
                var piece = parts[i].trim();
                if (!piece) {
                    continue;
                }
                var segments = piece.split(/\s+as\s+/);
                var modulePart = segments[0].trim();
                var local = (segments[1] || modulePart).trim();
                if (local === importName) {
                    return { module: modulePart };
                }
            }
            return null;
        }
        if (trimmed.startsWith('from ')) {
            var match = trimmed.match(/^from\s+(\S+)\s+import\s+(.+)$/);
            if (!match) {
                return null;
            }
            var modulePart = match[1].trim();
            var importPart = match[2].split('#')[0].trim();
            var parts = importPart.split(',');
            for (var i = 0; i < parts.length; i += 1) {
                var piece = parts[i].trim();
                if (!piece || piece === '*') {
                    continue;
                }
                var segments = piece.split(/\s+as\s+/);
                var imported = segments[0].trim();
                var local = (segments[1] || imported).trim();
                if (local === importName) {
                    return { module: modulePart, importedName: imported };
                }
            }
        }
        return null;
    };

    GitReaderApp.prototype.getImportDefinitionName = function (importName, statement, language) {
        if (!statement) {
            return null;
        }
        if (language === 'python') {
            var entry = this.parsePythonImportEntry(statement, importName);
            return (entry && entry.importedName) || null;
        }
        if (language === 'javascript' || language === 'typescript' || language === 'tsx') {
            var entry = this.parseJsImportEntry(statement, importName);
            if (!entry) {
                return null;
            }
            return entry.importedName || importName;
        }
        return null;
    };

    GitReaderApp.prototype.parseJsImportEntry = function (lineText, importName) {
        var importMatch = lineText.match(/^import\s+(?:type\s+)?(.+?)\s+from\s+['"]([^'"]+)['"]/);
        var exportMatch = lineText.match(/^export\s+(?:type\s+)?(.+?)\s+from\s+['"]([^'"]+)['"]/);
        var match = importMatch || exportMatch;
        if (match) {
            var binding = match[1];
            var source = match[2];
            var nameMap = this.parseJsImportBindingsMap(binding);
            if (nameMap.has(importName)) {
                return { source: source, importedName: nameMap.get(importName) };
            }
            return { source: source };
        }
        var importEqualsMatch = lineText.match(/^import\s+([A-Za-z_$][\w$]*)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        if (importEqualsMatch) {
            var local = importEqualsMatch[1];
            var source = importEqualsMatch[2];
            if (local === importName) {
                return { source: source, importedName: local };
            }
            return { source: source };
        }
        var requireMatch = lineText.match(/^(?:const|let|var)\s+(.+?)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        if (requireMatch) {
            var binding = requireMatch[1];
            var source = requireMatch[2];
            var nameMap = this.parseJsRequireBindingMap(binding);
            if (nameMap.has(importName)) {
                return { source: source, importedName: nameMap.get(importName) };
            }
            return { source: source };
        }
        return null;
    };

    GitReaderApp.prototype.parseSwiftImportModule = function (lineText) {
        var trimmed = lineText.trim();
        if (!trimmed.startsWith('import ')) {
            return null;
        }
        var rest = trimmed.slice('import '.length).trim();
        var moduleName = rest.split(/\s+/)[0];
        return moduleName || null;
    };

    GitReaderApp.prototype.parseJsImportBindingsMap = function (binding) {
        var map = new Map();
        var trimmed = binding.trim();
        if (!trimmed) {
            return map;
        }
        if (trimmed.startsWith('{')) {
            this.fillBraceListMap(trimmed, map);
            return map;
        }
        if (trimmed.startsWith('*')) {
            var starMatch = trimmed.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
            if (starMatch) {
                map.set(starMatch[1], starMatch[1]);
            }
            return map;
        }
        var parts = trimmed.split(',');
        var defaultName = parts[0] && parts[0].trim();
        if (defaultName) {
            map.set(defaultName, defaultName);
        }
        if (parts.length > 1) {
            var rest = parts.slice(1).join(',').trim();
            if (rest.startsWith('{')) {
                this.fillBraceListMap(rest, map);
            } else if (rest.startsWith('*')) {
                var starMatch = rest.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
                if (starMatch) {
                    map.set(starMatch[1], starMatch[1]);
                }
            }
        }
        return map;
    };

    GitReaderApp.prototype.parseJsRequireBindingMap = function (binding) {
        var map = new Map();
        var trimmed = binding.trim();
        if (!trimmed) {
            return map;
        }
        if (trimmed.startsWith('{')) {
            this.fillBraceListMap(trimmed, map);
            return map;
        }
        if (trimmed.startsWith('[')) {
            return map;
        }
        var local = trimmed.split(/\s+/)[0];
        if (local) {
            map.set(local, local);
        }
        return map;
    };

    GitReaderApp.prototype.fillBraceListMap = function (segment, map) {
        var content = segment.replace(/^{/, '').replace(/}.*$/, '');
        content.split(',')
            .map(function (part) { return part.trim(); })
            .forEach(function (part) {
                if (!part) {
                    return;
                }
                if (part.includes(' as ')) {
                    var parts = part.split(/\s+as\s+/);
                    var imported = parts[0];
                    var local = parts[1];
                    if (local && imported) {
                        map.set(local.trim(), imported.trim());
                    }
                    return;
                }
                if (part.includes(':')) {
                    var parts = part.split(':');
                    var imported = parts[0];
                    var local = parts[1];
                    if (local && imported) {
                        map.set(local.trim(), imported.trim());
                    }
                    return;
                }
                map.set(part, part);
            });
    };

    GitReaderApp.prototype.resolvePythonModuleCandidates = function (modulePath, currentPath) {
        if (!modulePath) {
            return [];
        }
        var normalizedCurrent = currentPath ? this.normalizePath(currentPath) : '';
        var baseDir = normalizedCurrent.split('/').slice(0, -1).join('/');
        var relativeMatch = modulePath.match(/^(\.+)(.*)$/);
        var baseParts = baseDir ? baseDir.split('/').filter(Boolean) : [];
        var remainder = modulePath;
        if (relativeMatch) {
            var dots = relativeMatch[1].length;
            remainder = relativeMatch[2] || '';
            for (var i = 1; i < dots; i += 1) {
                baseParts = baseParts.slice(0, -1);
            }
        }
        var moduleSuffix = remainder.replace(/^\./, '');
        var modulePathParts = moduleSuffix ? moduleSuffix.split('.').filter(Boolean) : [];
        var joined = baseParts.concat(modulePathParts).join('/');
        if (!joined) {
            return [];
        }
        return [joined + '.py', joined + '/__init__.py'];
    };

    GitReaderApp.prototype.resolveJsModuleCandidates = function (modulePath, currentPath) {
        var extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
        var normalizedCurrent = currentPath ? this.normalizePath(currentPath) : '';
        var baseDir = normalizedCurrent.split('/').slice(0, -1).join('/');
        var resolved = this.resolvePath(baseDir, modulePath);
        if (!resolved) {
            return [];
        }
        var hasExtension = extensions.some(function (ext) { return resolved.endsWith(ext); });
        if (hasExtension) {
            return [resolved];
        }
        var candidates = extensions.map(function (ext) { return '' + resolved + ext; });
        extensions.forEach(function (ext) { return candidates.push(resolved + '/index' + ext); });
        return candidates;
    };

    GitReaderApp.prototype.isRelativeImport = function (modulePath) {
        return modulePath.startsWith('.') || modulePath.startsWith('/');
    };

    GitReaderApp.prototype.resolvePath = function (baseDir, relative) {
        var cleaned = relative.startsWith('/') ? relative.slice(1) : relative;
        var parts = (baseDir ? baseDir.split('/').filter(Boolean) : []).concat(cleaned.split('/'));
        var stack = [];
        parts.forEach(function (part) {
            if (!part || part === '.') {
                return;
            }
            if (part === '..') {
                stack.pop();
                return;
            }
            stack.push(part);
        });
        return stack.join('/');
    };

    GitReaderApp.prototype.findSwiftModuleFile = function (moduleName) {
        if (!moduleName) {
            return null;
        }
        var target = moduleName + '.swift';
        for (var _i = 0, _a = Array.from(this.fileNodesByPath.entries()); _i < _a.length; _i++) {
            var entry = _a[_i];
            var path = entry[0];
            var node = entry[1];
            if (path.endsWith('/' + target) || path === target) {
                return node;
            }
        }
        return null;
    };

    GitReaderApp.prototype.findSymbolInFiles = function (symbolName, candidates) {
        if (!symbolName || candidates.length === 0) {
            return null;
        }
        var candidateSet = new Set(candidates.map(this.normalizePath, this));
        for (var i = 0; i < this.graphNodes.length; i += 1) {
            var node = this.graphNodes[i];
            if (!(node.location && node.location.path) || node.kind === 'external' || node.kind === 'folder') {
                continue;
            }
            if (node.name !== symbolName) {
                continue;
            }
            if (candidateSet.has(this.normalizePath(node.location.path))) {
                return node;
            }
        }
        return null;
    };

    GitReaderApp.prototype.findFileByCandidates = function (candidates) {
        for (var i = 0; i < candidates.length; i += 1) {
            var normalized = this.normalizePath(candidates[i]);
            var node = this.fileNodesByPath.get(normalized);
            if (node) {
                return node;
            }
        }
        return null;
    };

    GitReaderApp.prototype.jumpToSymbol = function (symbol) {
        var _this = this;
        if (this.graphInstance) {
            var fileNode = this.getFileNodeForSymbol(symbol);
            var fileElement = fileNode ? this.graphInstance.$id(fileNode.id) : null;
            var symbolElement = this.graphInstance.$id(symbol.id);
            if (fileElement && !fileElement.empty()) {
                this.graphInstance.$('node:selected').unselect();
                fileElement.select();
                if (symbolElement && !symbolElement.empty() && symbolElement.id() !== fileElement.id()) {
                    symbolElement.select();
                }
            }
            else if (symbolElement && !symbolElement.empty()) {
                this.graphInstance.$('node:selected').unselect();
                symbolElement.select();
            }
        }
        this.loadSymbolSnippet(symbol).catch(function () {
            _this.renderCode(symbol);
            _this.updateNarrator(symbol);
        });
    };

    GitReaderApp.prototype.ensureImportModal = function () {
        var _this = this;
        if (this.importModal) {
            return;
        }
        var modal = document.createElement('div');
        modal.className = 'import-modal';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML =
            '<div class="import-modal__backdrop" data-import-modal-close></div>' +
                '<div class="import-modal__dialog" role="dialog" aria-modal="true" aria-label="Import lookup">' +
                    '<h3>Not in this project</h3>' +
                    '<p class="import-modal__message"></p>' +
                    '<div class="import-modal__actions">' +
                        '<button class="ghost-btn" type="button" data-import-modal-close>Close</button>' +
                    '</div>' +
                '</div>';
        modal.addEventListener('click', function (event) {
            var target = event.target;
            if (target.closest('[data-import-modal-close]')) {
                _this.hideImportModal();
            }
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                _this.hideImportModal();
            }
        });
        document.body.append(modal);
        this.importModal = modal;
        this.importModalMessage = modal.querySelector('.import-modal__message');
    };

    GitReaderApp.prototype.showImportModal = function (message) {
        this.ensureImportModal();
        if (this.importModalMessage) {
            this.importModalMessage.textContent = message;
        }
        if (this.importModal) {
            this.importModal.classList.add('is-visible');
            this.importModal.setAttribute('aria-hidden', 'false');
        }
    };

    GitReaderApp.prototype.hideImportModal = function () {
        if (!this.importModal) {
            return;
        }
        this.importModal.classList.remove('is-visible');
        this.importModal.setAttribute('aria-hidden', 'true');
    };

    GitReaderApp.prototype.lineHasIdentifierUsage = function (lineEl, importName) {
        var escaped = this.escapeRegex(importName);
        var matcher = new RegExp('\\b' + escaped + '\\b');
        var walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                if (!node.textContent || !matcher.test(node.textContent)) {
                    matcher.lastIndex = 0;
                    return NodeFilter.FILTER_REJECT;
                }
                matcher.lastIndex = 0;
                var parent = node.parentElement;
                if (!parent || parent.closest('.line-no')) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (parent.closest('.hljs-string') || parent.closest('.hljs-comment')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        while (walker.nextNode()) {
            return true;
        }
        return false;
    };

    GitReaderApp.prototype.applyFoldControls = function (symbol) {
        var _this = this;
        if (symbol.kind !== 'file' || !(symbol.location && symbol.location.path)) {
            this.currentFoldRanges = new Map();
            this.currentFoldPath = null;
            return;
        }
        var path = this.normalizePath(symbol.location.path);
        var ranges = this.getFoldableRangesForPath(path);
        this.currentFoldRanges = new Map(ranges.map(function (range) { return [range.id, range]; }));
        this.currentFoldPath = path;
        ranges.forEach(function (range) {
            var lineEl = _this.codeSurface.querySelector('[data-line="' + range.start + '"]');
            if (!lineEl) {
                return;
            }
            if (lineEl.dataset.foldId === range.id) {
                return;
            }
            lineEl.dataset.foldId = range.id;
            lineEl.dataset.foldEnd = String(range.end);
            lineEl.classList.add('is-fold-start');
            var lineNo = lineEl.querySelector('.line-no');
            if (!lineNo) {
                return;
            }
            var lineNumber = ((lineEl.dataset.line || lineNo.textContent) || '').trim();
            lineNo.textContent = '';
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'fold-toggle';
            button.dataset.foldToggle = range.id;
            button.setAttribute('aria-label', 'Toggle ' + range.kind + ' ' + range.name);
            button.textContent = _this.foldedSymbolIds.has(range.id) ? '+' : '-';
            var numberSpan = document.createElement('span');
            numberSpan.className = 'line-num';
            numberSpan.textContent = lineNumber;
            lineNo.append(button, numberSpan);
        });
        this.refreshFoldVisibility();
    };

    GitReaderApp.prototype.getFoldableRangesForPath = function (path) {
        var _this = this;
        var ranges = [];
        this.graphNodes.forEach(function (node) {
            if (!(node.location && node.location.path && node.location.start_line && node.location.end_line)) {
                return;
            }
            if (node.kind !== 'function' && node.kind !== 'method' && node.kind !== 'class') {
                return;
            }
            if (_this.normalizePath(node.location.path) !== path) {
                return;
            }
            var start = node.location.start_line;
            var end = node.location.end_line;
            if (end <= start) {
                return;
            }
            ranges.push({
                id: node.id,
                name: node.name,
                kind: node.kind,
                start: start,
                end: end
            });
        });
        ranges.sort(function (a, b) { return a.start - b.start || b.end - a.end; });
        return ranges;
    };

    GitReaderApp.prototype.refreshFoldVisibility = function () {
        this.codeSurface.querySelectorAll('.code-line.is-folded')
            .forEach(function (line) { return line.classList.remove('is-folded'); });
        this.codeSurface.querySelectorAll('.code-line.is-fold-collapsed')
            .forEach(function (line) { return line.classList.remove('is-fold-collapsed'); });
        this.currentFoldRanges.forEach(function (range) {
            var isCollapsed = this.foldedSymbolIds.has(range.id);
            var startLine = this.codeSurface.querySelector('[data-line="' + range.start + '"]');
            if (startLine) {
                startLine.classList.toggle('is-fold-collapsed', isCollapsed);
                var toggle = startLine.querySelector('[data-fold-toggle]');
                if (toggle) {
                    toggle.textContent = isCollapsed ? '+' : '-';
                }
            }
            if (!isCollapsed) {
                return;
            }
            for (var line = range.start + 1; line <= range.end; line += 1) {
                var lineEl = this.codeSurface.querySelector('[data-line="' + line + '"]');
                if (lineEl) {
                    lineEl.classList.add('is-folded');
                }
            }
        }, this);
    };

    GitReaderApp.prototype.toggleFold = function (foldId) {
        if (!this.currentFoldRanges.has(foldId)) {
            return;
        }
        if (this.foldedSymbolIds.has(foldId)) {
            this.foldedSymbolIds.delete(foldId);
        }
        else {
            this.foldedSymbolIds.add(foldId);
        }
        this.refreshFoldVisibility();
    };

    GitReaderApp.prototype.handleDefinitionJump = function (event, target) {
        if (!this.isModifierClick(event)) {
            return false;
        }
        if (!(this.currentSymbol && this.currentSymbol.location && this.currentSymbol.location.path)) {
            return false;
        }
        var lineEl = target.closest('.code-line');
        if (!lineEl) {
            return false;
        }
        if (target.closest('.code-import')) {
            return false;
        }
        var identifier = this.getIdentifierAtClick(event);
        if (!identifier) {
            return false;
        }
        var symbol = this.resolveDefinitionSymbol(identifier, this.currentSymbol.location.path);
        if (!symbol) {
            this.setCodeStatus('No definition found for ' + identifier + '.');
            return true;
        }
        this.navigateToSymbolDefinition(symbol, this.currentSymbol.location.path);
        return true;
    };

    GitReaderApp.prototype.getIdentifierAtClick = function (event) {
        var range = this.getCaretRangeFromPoint(event.clientX, event.clientY);
        if (!range) {
            return null;
        }
        var node = range.startContainer;
        if (!node || node.nodeType !== Node.TEXT_NODE) {
            return null;
        }
        var textNode = node;
        var parent = textNode.parentElement;
        if (!parent || parent.closest('.line-no') || parent.closest('.hljs-string') || parent.closest('.hljs-comment')) {
            return null;
        }
        var text = textNode.textContent || '';
        if (!text) {
            return null;
        }
        var offset = Math.min(range.startOffset, text.length);
        var isWordChar = function (char) { return /[A-Za-z0-9_$]/.test(char); };
        if (offset > 0 && (!text[offset] || !isWordChar(text[offset])) && isWordChar(text[offset - 1])) {
            offset -= 1;
        }
        if (!isWordChar(text[offset] || '')) {
            return null;
        }
        var start = offset;
        while (start > 0 && isWordChar(text[start - 1])) {
            start -= 1;
        }
        var end = offset;
        while (end < text.length && isWordChar(text[end])) {
            end += 1;
        }
        var word = text.slice(start, end);
        if (!word || !/^[A-Za-z_$][\w$]*$/.test(word)) {
            return null;
        }
        return word;
    };

    GitReaderApp.prototype.getCaretRangeFromPoint = function (x, y) {
        var doc = document;
        if (doc.caretRangeFromPoint) {
            return doc.caretRangeFromPoint(x, y);
        }
        if (doc.caretPositionFromPoint) {
            var position = doc.caretPositionFromPoint(x, y);
            if (position) {
                var range = document.createRange();
                range.setStart(position.offsetNode, position.offset);
                range.collapse(true);
                return range;
            }
        }
        return null;
    };

    GitReaderApp.prototype.resolveDefinitionSymbol = function (identifier, currentPath) {
        var normalizedCurrent = this.normalizePath(currentPath);
        var matches = this.graphNodes.filter(function (node) {
            if (!(node.location && node.location.path)) {
                return false;
            }
            if (node.kind !== 'function' && node.kind !== 'method' && node.kind !== 'class') {
                return false;
            }
            return node.name === identifier;
        });
        if (matches.length === 0) {
            return null;
        }
        for (var i = 0; i < matches.length; i += 1) {
            if (this.normalizePath(matches[i].location.path) === normalizedCurrent) {
                return matches[i];
            }
        }
        return matches[0];
    };

    GitReaderApp.prototype.navigateToSymbolDefinition = function (symbol, fromPath, preferredSymbolName) {
        var fileNode = symbol.kind === 'file' ? symbol : this.getFileNodeForSymbol(symbol);
        var sourcePath = fromPath || (this.currentSymbol && this.currentSymbol.location && this.currentSymbol.location.path);
        var targetPath = (fileNode && fileNode.location && fileNode.location.path) || (symbol.location && symbol.location.path);
        if (sourcePath && targetPath) {
            var normalizedSource = this.normalizePath(sourcePath);
            var normalizedTarget = this.normalizePath(targetPath);
            if (normalizedSource !== normalizedTarget) {
                this.updateImportBreadcrumbs(normalizedSource, normalizedTarget);
            }
        }
        if (fileNode && preferredSymbolName) {
            var filePath = (fileNode.location && fileNode.location.path) || '';
            var candidate = this.findSymbolInFiles(preferredSymbolName, [filePath]);
            if (candidate) {
                this.highlightSymbolInFile(fileNode, candidate);
                return;
            }
        }
        if (fileNode && symbol.kind !== 'file') {
            if (this.graphInstance) {
                var fileElement = this.graphInstance.$id(fileNode.id);
                var symbolElement = this.graphInstance.$id(symbol.id);
                if (fileElement && !fileElement.empty()) {
                    this.graphInstance.$('node:selected').unselect();
                    fileElement.select();
                    if (symbolElement && !symbolElement.empty() && symbolElement.id() !== fileElement.id()) {
                        symbolElement.select();
                    }
                }
                else if (symbolElement && !symbolElement.empty()) {
                    this.graphInstance.$('node:selected').unselect();
                    symbolElement.select();
                }
            }
            this.highlightSymbolInFile(fileNode, symbol);
            return;
        }
        this.jumpToSymbol(symbol);
    };

    GitReaderApp.prototype.clearImportUsageHighlights = function () {
        this.codeSurface.querySelectorAll('.code-line.is-import-usage')
            .forEach(function (line) { return line.classList.remove('is-import-usage'); });
    };

    GitReaderApp.prototype.extractImportNames = function (lineText, language) {
        var trimmed = lineText.trim();
        if (!trimmed) {
            return [];
        }
        if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
            return [];
        }
        if (language === 'python') {
            return this.extractPythonImportNames(trimmed);
        }
        if (language === 'swift') {
            return this.extractSwiftImportNames(trimmed);
        }
        if (language === 'javascript' || language === 'typescript' || language === 'tsx') {
            return this.extractJsImportNames(trimmed);
        }
        return [];
    };

    GitReaderApp.prototype.extractPythonImportNames = function (lineText) {
        if (lineText.startsWith('import ')) {
            var rest = lineText.slice('import '.length);
            return rest.split(',')
                .map(function (part) { return part.trim(); })
                .map(function (part) { return part.split(/\s+as\s+/).pop() || ''; })
                .map(function (part) { return part.trim(); })
                .filter(Boolean);
        }
        if (lineText.startsWith('from ')) {
            var match = lineText.match(/^from\s+.+?\s+import\s+(.+)$/);
            if (!match) {
                return [];
            }
            var importPart = match[1];
            if (importPart.includes('*')) {
                return [];
            }
            return importPart.split(',')
                .map(function (part) { return part.trim(); })
                .map(function (part) { return part.split(/\s+as\s+/).pop() || ''; })
                .map(function (part) { return part.trim(); })
                .filter(Boolean);
        }
        return [];
    };

    GitReaderApp.prototype.extractSwiftImportNames = function (lineText) {
        if (!lineText.startsWith('import ')) {
            return [];
        }
        var rest = lineText.slice('import '.length).trim();
        var moduleName = rest.split(/\s+/)[0];
        return moduleName ? [moduleName] : [];
    };

    GitReaderApp.prototype.extractJsImportNames = function (lineText) {
        var names = [];
        var bindingMatch = lineText.match(/^import\s+(?:type\s+)?(.+?)\s+from\s+['"]/);
        if (bindingMatch) {
            names.push.apply(names, this.parseJsImportBindings(bindingMatch[1]));
        }
        var exportMatch = lineText.match(/^export\s+(?:type\s+)?(.+?)\s+from\s+['"]/);
        if (exportMatch) {
            names.push.apply(names, this.parseJsImportBindings(exportMatch[1]));
        }
        var importEqualsMatch = lineText.match(/^import\s+([A-Za-z_$][\w$]*)\s*=\s*require\s*\(/);
        if (importEqualsMatch) {
            names.push(importEqualsMatch[1]);
        }
        var requireMatch = lineText.match(/^(?:const|let|var)\s+(.+?)\s*=\s*require\s*\(/);
        if (requireMatch) {
            names.push.apply(names, this.parseJsRequireBinding(requireMatch[1]));
        }
        return Array.from(new Set(names.filter(Boolean)));
    };

    GitReaderApp.prototype.parseJsImportBindings = function (binding) {
        var names = [];
        var trimmed = binding.trim();
        if (!trimmed) {
            return names;
        }
        if (trimmed.startsWith('{')) {
            names.push.apply(names, this.parseBraceList(trimmed));
            return names;
        }
        if (trimmed.startsWith('*')) {
            var starMatch = trimmed.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
            if (starMatch) {
                names.push(starMatch[1]);
            }
            return names;
        }
        var parts = trimmed.split(',');
        if (parts.length > 0) {
            var defaultName = parts[0].trim();
            if (defaultName) {
                names.push(defaultName);
            }
        }
        if (parts.length > 1) {
            var rest = parts.slice(1).join(',').trim();
            if (rest.startsWith('{')) {
                names.push.apply(names, this.parseBraceList(rest));
            } else if (rest.startsWith('*')) {
                var starMatch = rest.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
                if (starMatch) {
                    names.push(starMatch[1]);
                }
            }
        }
        return names;
    };

    GitReaderApp.prototype.parseJsRequireBinding = function (binding) {
        var trimmed = binding.trim();
        if (trimmed.startsWith('{')) {
            return this.parseBraceList(trimmed);
        }
        if (trimmed.startsWith('[')) {
            return [];
        }
        return trimmed ? [trimmed.split(/\s+/)[0]] : [];
    };

    GitReaderApp.prototype.parseBraceList = function (segment) {
        var content = segment.replace(/^{/, '').replace(/}.*$/, '');
        return content.split(',')
            .map(function (part) { return part.trim(); })
            .map(function (part) {
                if (!part) {
                    return '';
                }
                if (part.includes(' as ')) {
                    return part.split(/\s+as\s+/).pop() || '';
                }
                if (part.includes(':')) {
                    return part.split(':').pop() || '';
                }
                return part;
            })
            .map(function (part) { return part.trim(); })
            .filter(function (part) { return /^[A-Za-z_$][\w$]*$/.test(part); });
    };

    GitReaderApp.prototype.escapeRegex = function (value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    GitReaderApp.prototype.getDisplayRange = function (symbol, snippet) {
        if (snippet && snippet.section === 'body' && snippet.start_line) {
            return { startLine: snippet.start_line, endLine: snippet.end_line };
        }
        if ((symbol.kind === 'function' || symbol.kind === 'method' || symbol.kind === 'class') &&
            symbol.location && symbol.location.start_line) {
            return {
                startLine: symbol.location.start_line,
                endLine: symbol.location.end_line || (snippet && snippet.end_line) || symbol.location.start_line
            };
        }
        if (snippet && snippet.start_line) {
            return { startLine: snippet.start_line, endLine: snippet.end_line };
        }
        if (symbol.location && symbol.location.start_line) {
            return { startLine: symbol.location.start_line, endLine: symbol.location.end_line };
        }
        return {};
    };

    GitReaderApp.prototype.renderSnippetLines = function (snippet, language) {
        var rawBody = (snippet && snippet.snippet) || '';
        var body = rawBody.trim().length > 0 ? rawBody : '# body not loaded yet';
        var startLine = (snippet && snippet.start_line) || 1;
        var highlightSet = this.buildHighlightSet((snippet && snippet.highlights) || []);
        var rendered = this.highlightSnippet(body, language);
        var lines = rendered.replace(/\n$/, '').split('\n');
        return lines.map(function (line, index) {
            var lineNumber = startLine + index;
            var isHighlighted = highlightSet.has(lineNumber);
            var classes = isHighlighted ? 'code-line is-highlight' : 'code-line';
            return '<span class="' + classes + '" data-line="' + lineNumber + '"><span class="line-no">' + lineNumber + '</span><span class="line-text">' + line + '</span></span>';
        }).join('');
    };

    GitReaderApp.prototype.buildHighlightSet = function (highlights) {
        var highlightSet = new Set();
        highlights.forEach(function (range) {
            var start = Math.min(range.start_line, range.end_line);
            var end = Math.max(range.start_line, range.end_line);
            for (var line = start; line <= end; line += 1) {
                highlightSet.add(line);
            }
        });
        return highlightSet;
    };

    GitReaderApp.prototype.renderGraph = function (nodes, edges) {
        if (nodes.length === 0) {
            this.clearGraph();
            this.setCanvasOverlay('No nodes yet. Graph data has not loaded.', true);
            return;
        }
        if (!this.graphInstance && typeof cytoscape !== 'function') {
            this.setCanvasOverlay('Graph library not loaded.', true);
            return;
        }
        this.displayNodeById = new Map(nodes.map(function (node) { return [node.id, node]; }));
        this.setCanvasOverlay('', false);
        this.ensureGraph();
        var selectedNodeId = this.getSelectedGraphNodeId();
        var elements = this.buildGraphElements(nodes, edges);
        this.graphInstance.elements().remove();
        this.graphInstance.add(elements);
        if (selectedNodeId) {
            var selected = this.graphInstance.$id(selectedNodeId);
            if (selected) {
                selected.select();
            }
        }
        this.runGraphLayout();
        this.applyGraphFilters();
    };

    GitReaderApp.prototype.ensureGraph = function () {
        if (this.graphInstance) {
            return;
        }
        this.graphInstance = cytoscape({
            container: this.canvasGraph,
            elements: [],
            style: this.getGraphStyles(),
            layout: { name: 'cose', animate: false, fit: true, padding: 24 },
            minZoom: 0.2,
            maxZoom: 2.5,
            wheelSensitivity: 0.2
        });
        this.bindGraphEvents();
    };

    GitReaderApp.prototype.clearGraph = function () {
        if (this.graphInstance) {
            this.graphInstance.elements().remove();
        }
        this.hideGraphTooltip();
    };

    GitReaderApp.prototype.bindGraphEvents = function () {
        var _this = this;
        if (this.graphEventsBound || !this.graphInstance) {
            return;
        }
        this.graphInstance.on('tap', 'node', function (event) {
            var nodeId = event.target.id();
            var node = _this.displayNodeById.get(nodeId) || _this.nodeById.get(nodeId);
            if (!node) {
                return;
            }
            var now = Date.now();
            var isDoubleTap = _this.lastTapNodeId === nodeId && (now - _this.lastTapAt) < _this.doubleTapDelay;
            _this.lastTapNodeId = nodeId;
            _this.lastTapAt = now;
            if (_this.tourActive) {
                if (!_this.isGuidedNodeAllowed(nodeId)) {
                    _this.flashGuidedMessage('Follow the guide to unlock this step.');
                    return;
                }
                _this.advanceTour('jump', nodeId);
                return;
            }
            if (_this.graphLayoutMode === 'cluster' && isDoubleTap && _this.handleClusterNodeToggle(node, event.originalEvent)) {
                return;
            }
            if (_this.graphLayoutMode === 'cluster' && _this.handleClusterFolderSingleClick(node)) {
                event.target.select();
                return;
            }
            if (_this.handleFileFocusClick(node, event.originalEvent)) {
                return;
            }
            event.target.select();
            _this.loadSymbolSnippet(node).catch(function () {
                _this.renderCode(node);
                _this.updateNarrator(node);
            });
        });
        this.graphInstance.on('select', 'node', function () {
            _this.refreshEdgeHighlights();
            _this.updateLabelVisibility();
        });
        this.graphInstance.on('unselect', 'node', function () {
            _this.refreshEdgeHighlights();
            _this.updateLabelVisibility();
        });
        this.graphInstance.on('mouseover', 'node', function (event) {
            var nodeId = event.target.id();
            event.target.addClass('is-hovered');
            _this.setHoveredNode(nodeId);
            _this.showGraphTooltip(event.target, event);
            _this.updateLabelVisibility();
        });
        this.graphInstance.on('mouseout', 'node', function (event) {
            event.target.removeClass('is-hovered');
            _this.setHoveredNode(null);
            _this.hideGraphTooltip();
            _this.updateLabelVisibility();
        });
        this.graphInstance.on('mousemove', 'node', function (event) {
            _this.updateTooltipPosition(event);
        });
        this.graphInstance.on('zoom', function () {
            _this.updateLabelVisibility();
        });
        this.graphEventsBound = true;
    };

    GitReaderApp.prototype.buildGraphElements = function (nodes, edges) {
        var _this = this;
        var nodeElements = nodes.map(function (node) {
            var labelData = _this.formatNodeLabel(node);
            return {
                data: {
                    id: node.id,
                    label: labelData.label,
                    fullLabel: labelData.fullLabel,
                    kindLabel: labelData.kindLabel,
                    kind: node.kind,
                    summary: node.summary || '',
                    path: labelData.path,
                    labelVisible: 'true'
                }
            };
        });
        var edgeElements = edges.map(function (edge, index) {
            return {
                data: {
                    id: 'edge:' + edge.source + ':' + edge.target + ':' + edge.kind + ':' + index,
                    source: edge.source,
                    target: edge.target,
                    kind: edge.kind,
                    confidence: edge.confidence
                }
            };
        });
        return nodeElements.concat(edgeElements);
    };

    GitReaderApp.prototype.formatNodeLabel = function (node) {
        var path = (node.location && node.location.path) || '';
        var fullLabel = node.name || path;
        var displayName = this.getDisplayName(node, fullLabel, path);
        var badge = this.getKindBadge(node.kind);
        var kindLabel = this.getKindLabel(node.kind);
        var label = this.wrapLabel('[' + badge + ']', displayName);
        return { label: label, fullLabel: fullLabel, path: path, kindLabel: kindLabel };
    };

    GitReaderApp.prototype.getDisplayName = function (node, fullLabel, path) {
        if (node.kind === 'file') {
            return this.getBasename(path || fullLabel);
        }
        if (node.kind === 'folder') {
            return node.name || this.getBasename(path || fullLabel);
        }
        return fullLabel || node.name;
    };

    GitReaderApp.prototype.getBasename = function (value) {
        var normalized = value.replace(/\\/g, '/');
        var parts = normalized.split('/');
        return parts.length > 0 ? parts[parts.length - 1] : value;
    };

    GitReaderApp.prototype.wrapLabel = function (prefix, name) {
        var normalized = name.replace(/\s+/g, ' ').trim();
        if (!normalized) {
            return prefix;
        }
        var lineLength = Math.max(8, this.labelLineLength);
        var prefixText = prefix ? prefix + ' ' : '';
        var firstLineLimit = Math.max(4, lineLength - prefixText.length);
        var firstPart = normalized.slice(0, firstLineLimit);
        var remaining = normalized.slice(firstPart.length).trimStart();
        var label = '' + prefixText + firstPart;
        if (remaining) {
            var secondPart = remaining.slice(0, lineLength);
            if (remaining.length > lineLength) {
                var trimmed = secondPart.slice(0, Math.max(0, lineLength - 3));
                secondPart = trimmed + '...';
            }
            label += '\n' + secondPart;
        }
        return label;
    };

    GitReaderApp.prototype.getKindBadge = function (kind) {
        switch (kind) {
            case 'file':
                return 'F';
            case 'folder':
                return 'dir';
            case 'class':
                return 'C';
            case 'function':
                return 'fn';
            case 'method':
                return 'm';
            case 'blueprint':
                return 'bp';
            case 'external':
                return 'ext';
            default:
                return 'id';
        }
    };

    GitReaderApp.prototype.getKindLabel = function (kind) {
        switch (kind) {
            case 'file':
                return 'File';
            case 'folder':
                return 'Folder';
            case 'class':
                return 'Class';
            case 'function':
                return 'Function';
            case 'method':
                return 'Method';
            case 'blueprint':
                return 'Blueprint';
            case 'external':
                return 'External';
            default:
                return 'Symbol';
        }
    };

    GitReaderApp.prototype.getGraphStyles = function () {
        return [
            {
                selector: 'node',
                style: {
                    'background-color': '#e9dfcf',
                    'label': 'data(label)',
                    'font-size': '12px',
                    'font-family': 'Space Grotesk, sans-serif',
                    'text-wrap': 'wrap',
                    'text-max-width': '120px',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'color': '#1e1914',
                    'border-width': 1,
                    'border-color': '#d2c2ad',
                    'padding': '10px',
                    'shape': 'round-rectangle'
                }
            },
            {
                selector: 'node[labelVisible = "false"]',
                style: {
                    'text-opacity': 0,
                    'text-background-opacity': 0
                }
            },
            {
                selector: 'node[kind = "file"]',
                style: { 'background-color': '#f0dcc1' }
            },
            {
                selector: 'node[kind = "folder"]',
                style: { 'background-color': '#f5e6d6', 'border-style': 'dashed' }
            },
            {
                selector: 'node[kind = "class"]',
                style: { 'background-color': '#d9e8f0' }
            },
            {
                selector: 'node[kind = "function"]',
                style: { 'background-color': '#e3f0d9' }
            },
            {
                selector: 'node[kind = "method"]',
                style: { 'background-color': '#f0e3d9' }
            },
            {
                selector: 'node[kind = "blueprint"]',
                style: { 'background-color': '#d9efe7' }
            },
            {
                selector: 'node[kind = "external"]',
                style: { 'background-color': '#efe0f0', 'border-style': 'dashed' }
            },
            {
                selector: 'node:selected',
                style: {
                    'border-width': 2,
                    'border-color': '#237a78',
                    'shadow-blur': 18,
                    'shadow-color': '#237a78',
                    'shadow-opacity': 0.5,
                    'shadow-offset-x': 0,
                    'shadow-offset-y': 0
                }
            },
            {
                selector: 'node.is-hovered',
                style: {
                    'text-opacity': 1,
                    'text-background-opacity': 1,
                    'shadow-blur': 16,
                    'shadow-color': '#237a78',
                    'shadow-opacity': 0.45,
                    'z-index': 10
                }
            },
            {
                selector: 'node.is-guided-focus',
                style: {
                    'border-width': 3,
                    'border-color': '#c75c2a',
                    'shadow-blur': 22,
                    'shadow-color': '#c75c2a',
                    'shadow-opacity': 0.6,
                    'z-index': 12
                }
            },
            {
                selector: 'node.is-guided-hidden',
                style: {
                    'opacity': 0,
                    'text-opacity': 0
                }
            },
            {
                selector: 'edge',
                style: {
                    'line-color': '#bcae9c',
                    'width': 1,
                    'curve-style': 'unbundled-bezier',
                    'control-point-distances': 40,
                    'control-point-weights': 0.5,
                    'target-arrow-shape': 'triangle',
                    'target-arrow-color': '#bcae9c',
                    'opacity': 0.2
                }
            },
            {
                selector: 'edge.is-active',
                style: {
                    'opacity': 0.75,
                    'width': 2
                }
            },
            {
                selector: 'edge[kind = "calls"]',
                style: { 'line-color': '#237a78', 'target-arrow-color': '#237a78' }
            },
            {
                selector: 'edge[kind = "imports"]',
                style: { 'line-color': '#d07838', 'target-arrow-color': '#d07838' }
            },
            {
                selector: 'edge[kind = "inherits"]',
                style: { 'line-color': '#7d6ba6', 'target-arrow-color': '#7d6ba6' }
            },
            {
                selector: 'edge[kind = "contains"]',
                style: { 'line-color': '#5c4d3c', 'target-arrow-color': '#5c4d3c' }
            },
            {
                selector: 'edge[kind = "blueprint"]',
                style: { 'line-color': '#2a9d8f', 'target-arrow-color': '#2a9d8f' }
            },
            {
                selector: 'edge[confidence = "low"]',
                style: { 'line-style': 'dashed', 'opacity': 0.15 }
            },
            {
                selector: 'edge.is-guided-hidden',
                style: { 'opacity': 0 }
            }
        ];
    };

    GitReaderApp.prototype.refreshEdgeHighlights = function () {
        if (!this.graphInstance) {
            return;
        }
        var cy = this.graphInstance;
        cy.edges().removeClass('is-active');
        var selectedNodes = cy.$('node:selected');
        selectedNodes.forEach(function (node) {
            node.connectedEdges().addClass('is-active');
        });
        if (this.hoveredNodeId) {
            var hovered = cy.getElementById(this.hoveredNodeId);
            if (hovered && !hovered.empty()) {
                hovered.connectedEdges().addClass('is-active');
            }
        }
    };

    GitReaderApp.prototype.updateLabelVisibility = function () {
        if (!this.graphInstance) {
            return;
        }
        var zoom = this.graphInstance.zoom();
        var showAll = zoom >= this.labelZoomThreshold;
        var guidedAllowed = this.tourActive && this.guidedAllowedNodeIds ? this.guidedAllowedNodeIds : null;
        this.graphInstance.nodes().forEach(function (node) {
            var shouldShow = showAll || node.selected() || node.hasClass('is-hovered') || (guidedAllowed ? guidedAllowed.has(node.id()) : false);
            node.data('labelVisible', shouldShow ? 'true' : 'false');
        });
    };

    GitReaderApp.prototype.setHoveredNode = function (nodeId) {
        this.hoveredNodeId = nodeId;
        this.refreshEdgeHighlights();
    };

    GitReaderApp.prototype.showGraphTooltip = function (node, event) {
        if (!this.graphTooltip) {
            return;
        }
        var fullLabel = node.data('fullLabel') || node.data('label');
        var kindLabel = node.data('kindLabel') || node.data('kind');
        var path = node.data('path');
        var details = path ? kindLabel + ' - ' + path : kindLabel;
        this.graphTooltip.innerHTML =
            '<div class="tooltip-title">' + escapeHtml(String(fullLabel)) + '</div>' +
            '<div class="tooltip-meta">' + escapeHtml(String(details)) + '</div>';
        this.graphTooltip.setAttribute('aria-hidden', 'false');
        this.graphTooltip.classList.add('is-visible');
        this.updateTooltipPosition(event);
    };

    GitReaderApp.prototype.hideGraphTooltip = function () {
        if (!this.graphTooltip) {
            return;
        }
        this.graphTooltip.classList.remove('is-visible');
        this.graphTooltip.setAttribute('aria-hidden', 'true');
    };

    GitReaderApp.prototype.updateTooltipPosition = function (event) {
        if (!this.graphTooltip || !this.canvasSurface) {
            return;
        }
        var rendered = event.renderedPosition || event.position;
        if (!rendered) {
            return;
        }
        var offset = 12;
        var surfaceRect = this.canvasSurface.getBoundingClientRect();
        var x = Math.min(surfaceRect.width - 20, Math.max(0, rendered.x + offset));
        var y = Math.min(surfaceRect.height - 20, Math.max(0, rendered.y + offset));
        this.graphTooltip.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    };

    GitReaderApp.prototype.runGraphLayout = function () {
        if (!this.graphInstance) {
            return;
        }
        var layout = this.graphInstance.layout(this.getLayoutOptions());
        layout.run();
        this.updateLabelVisibility();
    };

    GitReaderApp.prototype.hasHighlightSupport = function () {
        return typeof hljs !== 'undefined' && typeof hljs.highlight === 'function';
    };

    GitReaderApp.prototype.highlightSnippet = function (body, language) {
        if (!this.hasHighlightSupport()) {
            return escapeHtml(body);
        }
        if (language && hljs.getLanguage && hljs.getLanguage(language)) {
            return hljs.highlight(body, { language: language }).value;
        }
        return hljs.highlightAuto(body).value;
    };

    GitReaderApp.prototype.getHighlightLanguage = function (path) {
        if (!path) {
            return undefined;
        }
        var lower = path.toLowerCase();
        if (lower.endsWith('.py')) {
            return 'python';
        }
        if (lower.endsWith('.js') || lower.endsWith('.jsx')) {
            return 'javascript';
        }
        if (lower.endsWith('.ts')) {
            return 'typescript';
        }
        if (lower.endsWith('.tsx')) {
            return 'tsx';
        }
        if (lower.endsWith('.swift')) {
            return 'swift';
        }
        return undefined;
    };

    GitReaderApp.prototype.setSnippetMode = function (mode) {
        var _this = this;
        if (this.snippetMode === mode) {
            return Promise.resolve();
        }
        this.snippetMode = mode;
        this.snippetCache.clear();
        this.updateSnippetModeUi();
        if (this.currentSymbol) {
            var narrate = !this.activeStoryArc && !_this.tourActive;
            return this.loadSymbolSnippet(this.currentSymbol, narrate).then(function () {
                if (_this.activeStoryArc) {
                    _this.renderStoryArc(_this.activeStoryArc);
                } else if (_this.tourActive && _this.tourStep) {
                    _this.renderTourStep(_this.tourStep);
                }
            });
        }
        return Promise.resolve();
    };

    GitReaderApp.prototype.updateSnippetModeUi = function () {
        var _this = this;
        this.snippetModeButtons.forEach(function (button) {
            button.classList.toggle('is-active', button.dataset.snippetMode === _this.snippetMode);
        });
    };

    GitReaderApp.prototype.copySnippet = function () {
        var _this = this;
        var text = this.currentSnippetText;
        if (!text) {
            this.setCodeStatus('Nothing to copy.');
            return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(function () { return _this.setCodeStatus('Snippet copied.'); })
                .catch(function () { return _this.setCodeStatus('Copy failed.'); });
            return;
        }
        this.setCodeStatus('Copy not supported.');
    };

    GitReaderApp.prototype.jumpToInputLine = function () {
        var input = this.codeSurface.querySelector('[data-line-input]');
        if (!input) {
            return;
        }
        var value = Number(input.value);
        if (!Number.isFinite(value) || value <= 0) {
            this.setCodeStatus('Enter a valid line number.');
            return;
        }
        this.jumpToLine(value);
    };

    GitReaderApp.prototype.jumpToLine = function (line) {
        var lineEl = this.codeSurface.querySelector('[data-line="' + line + '"]');
        if (!lineEl) {
            this.setCodeStatus('Line not in snippet.');
            return;
        }
        this.setCodeStatus('');
        lineEl.classList.add('is-jump');
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(function () { return lineEl.classList.remove('is-jump'); }, 1200);
    };

    GitReaderApp.prototype.setCodeStatus = function (message) {
        var status = this.codeSurface.querySelector('[data-code-status]');
        if (status) {
            status.textContent = message;
        }
    };

    GitReaderApp.prototype.loadGraphPreferences = function () {
        var storedLayout = window.localStorage.getItem('gitreader.graphLayoutMode');
        if (storedLayout && ['cluster', 'layer', 'free'].includes(storedLayout)) {
            this.graphLayoutMode = storedLayout;
        }
    };

    GitReaderApp.prototype.setGraphLayoutMode = function (mode) {
        if (this.graphLayoutMode === mode) {
            return;
        }
        var wasCluster = this.graphLayoutMode === 'cluster';
        this.graphLayoutMode = mode;
        window.localStorage.setItem('gitreader.graphLayoutMode', mode);
        this.updateGraphControls();
        if (wasCluster || mode === 'cluster') {
            this.refreshGraphView();
            return;
        }
        this.runGraphLayout();
    };

    GitReaderApp.prototype.toggleEdgeFilter = function (filter) {
        if (this.edgeFilters.has(filter)) {
            this.edgeFilters.delete(filter);
        } else {
            this.edgeFilters.add(filter);
        }
        this.updateGraphControls();
        this.applyGraphFilters();
    };

    GitReaderApp.prototype.applyGraphFilters = function () {
        var _this = this;
        if (!this.graphInstance) {
            return;
        }
        var cy = this.graphInstance;
        cy.elements().show();
        if (!this.showExternalNodes) {
            cy.nodes().filter('[kind = "external"]').hide();
        }
        cy.edges().forEach(function (edge) {
            if (!_this.edgeFilters.has(edge.data('kind'))) {
                edge.hide();
            }
        });
        cy.edges().forEach(function (edge) {
            if (edge.source().hidden() || edge.target().hidden()) {
                edge.hide();
            }
        });
        this.applyGuidedGraphFilter();
        this.applyFocus();
        this.refreshEdgeHighlights();
        this.updateLabelVisibility();
    };

    GitReaderApp.prototype.focusOnSelected = function () {
        if (!this.graphInstance) {
            return;
        }
        var selected = this.graphInstance.$('node:selected');
        if (!selected || selected.length === 0) {
            this.setCanvasOverlay('Select a node to focus.', true);
            window.setTimeout(function () { return this.setCanvasOverlay('', false); }.bind(this), 1200);
            return;
        }
        this.focusedNodeId = selected[0].id();
        this.applyGraphFilters();
    };

    GitReaderApp.prototype.resetGraphFocus = function () {
        this.focusedNodeId = null;
        this.applyGraphFilters();
        this.refreshGraphViewport();
    };

    GitReaderApp.prototype.applyFocus = function () {
        if (!this.graphInstance || !this.focusedNodeId || this.tourActive) {
            return;
        }
        var cy = this.graphInstance;
        var node = cy.getElementById(this.focusedNodeId);
        if (!node || node.empty() || node.hidden()) {
            this.focusedNodeId = null;
            return;
        }
        var visible = cy.elements(':visible');
        var focusElements = node.closedNeighborhood().intersection(visible);
        visible.not(focusElements).hide();
        cy.fit(focusElements, 40);
    };

    GitReaderApp.prototype.zoomGraph = function (factor) {
        if (!this.graphInstance) {
            return;
        }
        var current = this.graphInstance.zoom();
        var next = Math.min(2.5, Math.max(0.2, current * factor));
        var rect = this.canvasGraph.getBoundingClientRect();
        this.graphInstance.zoom({
            level: next,
            renderedPosition: {
                x: rect.width / 2,
                y: rect.height / 2
            }
        });
        this.updateLabelVisibility();
    };

    GitReaderApp.prototype.fitGraph = function () {
        if (!this.graphInstance) {
            return;
        }
        this.graphInstance.fit(undefined, 40);
        this.updateLabelVisibility();
    };

    GitReaderApp.prototype.updateGraphControls = function () {
        var _this = this;
        this.graphLayoutButtons.forEach(function (button) {
            button.classList.toggle('is-active', button.dataset.layoutAction === _this.graphLayoutMode);
        });
        this.edgeFilterButtons.forEach(function (button) {
            var filter = button.dataset.edgeFilter;
            if (!filter) {
                return;
            }
            button.classList.toggle('is-active', _this.edgeFilters.has(filter));
        });
        this.nodeFilterButtons.forEach(function (button) {
            if (button.dataset.nodeFilter === 'external') {
                button.classList.toggle('is-active', _this.showExternalNodes);
            }
        });
    };

    GitReaderApp.prototype.getLayoutOptions = function () {
        if (this.graphLayoutMode === 'layer') {
            return {
                name: 'breadthfirst',
                animate: false,
                fit: true,
                padding: 36,
                directed: true,
                spacingFactor: 1.35,
                avoidOverlap: true,
                avoidOverlapPadding: 24,
                nodeDimensionsIncludeLabels: true
            };
        }
        if (this.graphLayoutMode === 'free') {
            return {
                name: 'preset',
                animate: false,
                fit: true,
                padding: 24
            };
        }
        return {
            name: 'cose',
            animate: false,
            fit: true,
            padding: 24
        };
    };

    GitReaderApp.prototype.updateNarrator = function (symbol) {
        if (symbol.kind === 'folder') {
            this.renderFileTreeNarrator();
            return Promise.resolve();
        }
        var _this = this;
        var mode = this.currentMode;
        var section = this.getSnippetSection(symbol);
        var cacheKey = symbol.id + ':' + mode + ':' + section;
        var cached = this.narratorCache.get(cacheKey);
        if (cached) {
            this.renderNarration(symbol, cached);
            return Promise.resolve();
        }
        var requestToken = ++this.narratorRequestToken;
        this.renderNarratorLoading(symbol);
        return this.fetchJson(this.buildApiUrl('/gitreader/api/narrate'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: symbol.id,
                mode: mode,
                section: section
            })
        }).then(function (response) {
            if (requestToken !== _this.narratorRequestToken) {
                return;
            }
            if (!response || response.error) {
                throw new Error('Narrator unavailable.');
            }
            _this.narratorCache.set(cacheKey, response);
            _this.renderNarration(symbol, response);
        }).catch(function (error) {
            if (requestToken !== _this.narratorRequestToken) {
                return;
            }
            var message = error instanceof Error ? error.message : 'Narrator unavailable.';
            _this.renderNarratorError(symbol, message);
        });
    };

    GitReaderApp.prototype.renderNarratorLoading = function (symbol) {
        this.narratorOutput.innerHTML =
            '<p class="eyebrow">Narrator</p>' +
            '<h3>Listening to ' + escapeHtml(symbol.name) + '</h3>' +
            '<p>Drafting the next beat in the story.</p>';
    };

    GitReaderApp.prototype.renderNarratorError = function (symbol, message) {
        this.narratorOutput.innerHTML =
            '<p class="eyebrow">Narrator</p>' +
            '<h3>Unable to narrate ' + escapeHtml(symbol.name) + '</h3>' +
            '<p>' + escapeHtml(message) + '</p>';
    };

    GitReaderApp.prototype.renderNarration = function (symbol, narration) {
        var formatted = this.formatNarration(symbol, narration, this.currentMode);
        this.narratorOutput.innerHTML =
            '<p class="eyebrow">' + formatted.eyebrow + '</p>' +
            '<h3>' + formatted.title + '</h3>' +
            formatted.body;
    };

    GitReaderApp.prototype.formatNarration = function (symbol, narration, mode) {
        var name = escapeHtml(symbol.name);
        if (mode === 'summary') {
            var items = (narration.summary || []).map(function (item) { return escapeHtml(item); });
            var body = items.length > 0
                ? '<ul>' + items.map(function (item) { return '<li>' + item + '</li>'; }).join('') + '</ul>'
                : '<p>No summary yet for ' + name + '.</p>';
            return {
                eyebrow: 'What it does',
                title: 'A clear role for ' + name,
                body: body
            };
        }
        if (mode === 'key_lines') {
            var lines = narration.key_lines || [];
            var body = lines.length > 0
                ? '<ul>' + lines.map(function (line) {
                    var label = 'Line ' + line.line + ': ' + line.text;
                    return '<li>' + escapeHtml(label) + '</li>';
                }).join('') + '</ul>'
                : '<p>No key lines captured yet.</p>';
            return {
                eyebrow: 'Key lines',
                title: 'Lines to watch in ' + name,
                body: body
            };
        }
        if (mode === 'connections') {
            var items = (narration.connections || []).map(function (item) { return escapeHtml(item); });
            var body = items.length > 0
                ? '<ul>' + items.map(function (item) { return '<li>' + item + '</li>'; }).join('') + '</ul>'
                : '<p>Connections are still being mapped.</p>';
            return {
                eyebrow: 'Connections',
                title: 'How ' + name + ' links',
                body: body
            };
        }
        if (mode === 'next') {
            var thread = narration.next_thread ? escapeHtml(narration.next_thread) : 'No next thread yet.';
            return {
                eyebrow: 'Next thread',
                title: 'Where to go next',
                body: '<p>' + thread + '</p>'
            };
        }
        var hook = narration.hook ? escapeHtml(narration.hook) : 'A quiet setup around ' + name + '.';
        return {
            eyebrow: 'Hook',
            title: 'The quiet setup behind ' + name,
            body: '<p>' + hook + '</p>'
        };
    };

    GitReaderApp.prototype.renderStoryArc = function (arc) {
        var formatted = this.formatStoryArc(arc, this.currentMode);
        this.narratorOutput.innerHTML =
            '<p class="eyebrow">' + formatted.eyebrow + '</p>' +
            '<h3>' + formatted.title + '</h3>' +
            formatted.body;
    };

    GitReaderApp.prototype.renderStoryArcEmpty = function () {
        this.narratorOutput.innerHTML =
            '<p class="eyebrow">Routes</p>' +
            '<h3>No route selected</h3>' +
            '<p>Pick a route to see its primary flow.</p>';
    };

    GitReaderApp.prototype.renderStoryArcMissing = function () {
        this.narratorOutput.innerHTML =
            '<p class="eyebrow">Routes</p>' +
            '<h3>Route not found</h3>' +
            '<p>Choose another route to continue.</p>';
    };

    GitReaderApp.prototype.renderFileTreeNarrator = function () {
        var fileCount = this.fileNodesByPath.size;
        var countLabel = fileCount > 0 ? fileCount + ' files indexed.' : 'No files indexed yet.';
        this.narratorOutput.innerHTML =
            '<p class="eyebrow">File tree</p>' +
            '<h3>Browse the repository layout</h3>' +
            '<p>Expand folders in the tree to explore the structure. ' + escapeHtml(countLabel) + '</p>';
    };

    GitReaderApp.prototype.renderReaderFileTree = function (focusPath) {
        var normalized = this.normalizePath(focusPath);
        if (!this.fileTreeRoot) {
            this.fileTreeRoot = this.buildFileTreeFromNodes(this.graphNodes);
        }
        this.readerTreeFocusPath = normalized || null;
        this.currentSymbol = null;
        this.currentSnippetText = '';
        this.currentSnippetStartLine = 1;
        var treeHtml = this.buildFileTreeMarkup(normalized);
        this.codeSurface.innerHTML =
            '<article class="code-card">' +
                '<div class="code-meta">' +
                    '<span>FOLDER</span>' +
                    '<span>' + escapeHtml(normalized || 'Repository') + '</span>' +
                '</div>' +
                '<div class="code-actions">' +
                    '<span class="code-status">Folder contents</span>' +
                '</div>' +
                '<div class="file-tree">' + treeHtml + '</div>' +
            '</article>';
    };

    GitReaderApp.prototype.formatStoryArc = function (arc, mode) {
        var routeLabel = escapeHtml(this.formatArcTitle(arc));
        var scenes = Array.isArray(arc.scenes) ? arc.scenes : [];
        if (mode === 'summary') {
            var entryNode = this.nodeById.get(arc.entry_id);
            var summaryText = arc.summary ? escapeHtml(arc.summary) : '';
            var metaItems = this.buildArcMetaItems(arc, entryNode);
            var metaList = metaItems.length > 0
                ? '<ul>' + metaItems.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul>'
                : '';
            var items = scenes.map(function (scene, index) {
                var label = this.formatStorySceneLabel(scene, index, true);
                return '<li>' + escapeHtml(label) + '</li>';
            }, this);
            var flowLabel = scenes.length > 1 ? 'Flow steps' : 'Flow steps (entry only)';
            var flowList = items.length > 0
                ? '<p>' + flowLabel + '</p><ol>' + items.join('') + '</ol>'
                : '<p>No internal calls detected yet.</p>';
            var body = (summaryText ? '<p>' + summaryText + '</p>' : '') + metaList + flowList;
            return {
                eyebrow: 'What it does',
                title: 'Primary flow for ' + routeLabel,
                body: body
            };
        }
        if (mode === 'key_lines') {
            var lineItems = scenes.map(function (scene) {
                var location = this.formatStorySceneLocation(scene);
                var label = scene.name + ' - ' + location;
                return '<li>' + escapeHtml(label) + '</li>';
            }, this);
            var lineBody = lineItems.length > 0
                ? '<ul>' + lineItems.join('') + '</ul>'
                : '<p>No locations captured yet.</p>';
            return {
                eyebrow: 'Key lines',
                title: 'Entry points for ' + routeLabel,
                body: lineBody
            };
        }
        if (mode === 'connections') {
            var connectionItems = this.buildArcConnectionItems(arc, scenes);
            var connectionBody = connectionItems.length > 0
                ? '<ul>' + connectionItems.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul>'
                : '<p>Connections are still being mapped.</p>';
            return {
                eyebrow: 'Connections',
                title: 'Files touched by ' + routeLabel,
                body: connectionBody
            };
        }
        if (mode === 'next') {
            var related = arc.related_ids || [];
            if (related.length > 0) {
                var buttons = related.map(function (arcId) {
                    var target = this.storyArcsById.get(arcId);
                    var label = target ? this.formatArcTitle(target) : arcId;
                    return '<button class="ghost-btn arc-jump" data-arc-id="' + escapeHtml(arcId) + '">' + escapeHtml(label) + '</button>';
                }, this);
                return {
                    eyebrow: 'Next thread',
                    title: 'Where to go next',
                    body: '<p>Jump to a related thread.</p><div class="arc-jump-list">' + buttons.join('') + '</div>'
                };
            }
            var last = scenes[scenes.length - 1];
            var location = last ? this.formatStorySceneLocation(last) : '';
            var label = last
                ? 'Continue at ' + last.name + (location ? ' (' + location + ')' : '') + '.'
                : 'No next thread yet.';
            return {
                eyebrow: 'Next thread',
                title: 'Where to go next',
                body: '<p>' + escapeHtml(label) + '</p>'
            };
        }
        var handler = arc.route && arc.route.handler_name ? 'Handler ' + arc.route.handler_name + '.' : '';
        var summary = arc.summary ? arc.summary : 'Route ' + this.formatRouteLabel(arc) + ' begins the journey.';
        var hook = (summary + (handler ? ' ' + handler : '')).trim();
        return {
            eyebrow: 'Route',
            title: routeLabel,
            body: '<p>' + escapeHtml(hook) + '</p>'
        };
    };

    GitReaderApp.prototype.formatStorySceneLabel = function (scene, index, includeLocation) {
        var roleLabel = scene.role === 'entry' ? 'Entry' : 'Step ' + (index + 1);
        var kindLabel = this.getKindLabel(scene.kind);
        var confidence = scene.confidence === 'low' ? ' (low confidence)' : '';
        var base = roleLabel + ': ' + scene.name + ' (' + kindLabel + ')' + confidence;
        if (!includeLocation) {
            return base;
        }
        var location = this.formatStorySceneLocation(scene);
        return base + ' - ' + location;
    };

    GitReaderApp.prototype.formatStorySceneLocation = function (scene) {
        if (!scene.file_path) {
            return 'location unknown';
        }
        if (scene.line && scene.line > 0) {
            return scene.file_path + ':' + scene.line;
        }
        return scene.file_path;
    };

    GitReaderApp.prototype.buildArcMetaItems = function (arc, entryNode) {
        var items = [];
        var threadLabel = this.getArcThreadLabel(arc);
        if (threadLabel) {
            items.push('Thread: ' + threadLabel);
        }
        var methods = arc.route && arc.route.methods && arc.route.methods.length ? arc.route.methods.join('|') : 'ANY';
        var path = arc.route && arc.route.path ? arc.route.path : '';
        var routeLabel = path ? (methods + ' ' + path).trim() : methods;
        if (routeLabel) {
            items.push('Route: ' + routeLabel);
        }
        if (arc.route && arc.route.handler_name) {
            items.push('Handler: ' + arc.route.handler_name);
        }
        if (arc.route && arc.route.module) {
            items.push('Module: ' + arc.route.module);
        }
        if (arc.route && arc.route.file_path) {
            var line = arc.route.line ? ':' + arc.route.line : '';
            items.push('Defined in: ' + arc.route.file_path + line);
        }
        if (entryNode && entryNode.signature) {
            items.push('Signature: ' + entryNode.signature);
        }
        if (entryNode && entryNode.summary) {
            items.push('Docstring: ' + entryNode.summary);
        }
        var steps = arc.scene_count || 0;
        items.push('Steps detected: ' + steps);
        var internalCalls = (arc.calls && arc.calls.internal) ? arc.calls.internal : [];
        if (internalCalls.length > 0) {
            items.push('Internal calls: ' + internalCalls.slice(0, 4).join(', '));
        }
        var externalCalls = (arc.calls && arc.calls.external) ? arc.calls.external : [];
        if (externalCalls.length > 0) {
            items.push('External calls: ' + externalCalls.slice(0, 4).join(', '));
        }
        return items;
    };

    GitReaderApp.prototype.buildArcConnectionItems = function (arc, scenes) {
        var items = [];
        var internalCalls = (arc.calls && arc.calls.internal) ? arc.calls.internal : [];
        if (internalCalls.length > 0) {
            items.push('Internal calls: ' + internalCalls.slice(0, 5).join(', '));
        }
        var externalCalls = (arc.calls && arc.calls.external) ? arc.calls.external : [];
        if (externalCalls.length > 0) {
            items.push('External calls: ' + externalCalls.slice(0, 5).join(', '));
        }
        var related = arc.related_ids || [];
        if (related.length > 0) {
            var labels = related.map(function (arcId) {
                var target = this.storyArcsById.get(arcId);
                return target ? this.formatArcTitle(target) : arcId;
            }, this);
            items.push('Related threads: ' + labels.join(', '));
        }
        var paths = scenes
            .map(function (scene) { return scene.file_path; })
            .filter(function (path) { return Boolean(path); });
        var unique = Array.from(new Set(paths));
        if (unique.length > 0) {
            items.push('Files: ' + unique.slice(0, 6).join(', '));
        }
        return items;
    };

    GitReaderApp.prototype.getArcThreadLabel = function (arc) {
        if (!arc.thread || arc.thread === 'main') {
            return '';
        }
        if (arc.thread === 'branch') {
            var index = arc.thread_index || 0;
            return 'Branch ' + index;
        }
        return arc.thread;
    };

    GitReaderApp.prototype.formatArcTitle = function (arc) {
        var base = arc.title || this.formatRouteLabel(arc);
        var threadLabel = this.getArcThreadLabel(arc);
        if (!threadLabel) {
            return base;
        }
        if (base.toLowerCase().indexOf('branch') !== -1) {
            return base;
        }
        return base + ' (' + threadLabel + ')';
    };

    GitReaderApp.prototype.setMode = function (mode) {
        this.currentMode = mode;
        this.modeButtons.forEach(function (button) {
            button.classList.toggle('is-active', button.dataset.mode === mode);
        });
        if (this.tourActive) {
            if (this.tocMode === 'routes') {
                if (this.activeStoryArc) {
                    this.renderStoryArc(this.activeStoryArc);
                } else {
                    this.renderStoryArcEmpty();
                }
                return;
            }
            if (this.tocMode === 'tree') {
                this.renderFileTreeNarrator();
                return;
            }
            if (this.tourStep) {
                this.renderTourStep(this.tourStep);
                return;
            }
        }
        if (this.activeStoryArc) {
            this.renderStoryArc(this.activeStoryArc);
            return;
        }
        var chapterId = this.getActiveChapterId();
        var nodes = this.filterNodesForChapter(chapterId || '');
        var selected = this.getSelectedGraphNode();
        var focus = selected && selected.kind !== 'folder'
            ? selected
            : (this.currentSymbol || this.pickFocusNode(nodes));
        this.updateNarrator(focus);
    };

    GitReaderApp.prototype.setLayout = function (layout) {
        this.workspace.dataset.layout = layout;
        this.layoutButtons.forEach(function (button) {
            button.classList.toggle('is-active', button.dataset.layout === layout);
        });
        this.refreshGraphViewport();
    };

    GitReaderApp.prototype.getActiveChapterId = function () {
        var active = this.tocList.querySelector('.toc-item.is-active');
        if (!active) {
            return null;
        }
        return active.dataset.chapterId || null;
    };

    GitReaderApp.prototype.getSelectedGraphNodeId = function () {
        if (!this.graphInstance) {
            return null;
        }
        var selected = this.graphInstance.$('node:selected');
        if (!selected || selected.length === 0) {
            return null;
        }
        return selected[0].id();
    };

    GitReaderApp.prototype.getSelectedGraphNode = function () {
        var nodeId = this.getSelectedGraphNodeId();
        if (!nodeId) {
            return null;
        }
        return this.displayNodeById.get(nodeId) || this.nodeById.get(nodeId) || null;
    };

    GitReaderApp.prototype.updateNarratorToggle = function () {
        this.narratorToggle.classList.toggle('is-active', this.narratorVisible);
        this.narratorToggle.setAttribute('aria-pressed', String(this.narratorVisible));
        this.narratorToggle.textContent = this.narratorVisible ? 'Narrator' : 'Narrator Off';
    };

    GitReaderApp.prototype.updateTourControls = function () {
        document.body.classList.toggle('is-guided', this.tourActive);
        this.tourControls.classList.toggle('is-active', this.tourActive);
        this.tourStartButton.disabled = this.tourActive;
        this.tourPrevButton.disabled = !this.tourActive;
        this.tourNextButton.disabled = !this.tourActive;
        this.tourEndButton.disabled = !this.tourActive;
        var hasRoutes = this.storyArcs.length > 0;
        if (this.tourActive) {
            var allowRoutePicker = this.tocMode === 'routes';
            this.routeSelect.disabled = !allowRoutePicker || !hasRoutes;
            this.routeJump.disabled = !allowRoutePicker || !hasRoutes;
        } else {
            this.routeSelect.disabled = !hasRoutes;
            this.routeJump.disabled = !hasRoutes;
        }
        if (this.tourState && this.tourStep) {
            var total = this.tourStep.total_steps || 0;
            var label = total > 0
                ? 'Step ' + (this.tourState.step_index + 1) + ' of ' + total
                : 'Step ' + (this.tourState.step_index + 1);
            this.tourStatus.textContent = label;
        } else {
            this.tourStatus.textContent = '';
        }
        this.applyGuidedState();
    };

    GitReaderApp.prototype.startTour = function () {
        var _this = this;
        var arcId = this.getActiveTourArcId();
        return this.fetchJson(this.buildApiUrl('/gitreader/api/tour/start'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mode: this.tourMode,
                arc_id: arcId || undefined,
            }),
        }).then(function (response) {
            _this.tourActive = true;
            _this.tourState = response.state;
            _this.tourStep = response.step;
            _this.renderTourStep(response.step);
            _this.updateTourControls();
            return _this.syncTourFocus(response.step);
        }).catch(function (error) {
            var message = error instanceof Error ? error.message : 'Unable to start tour.';
            _this.renderTourError(message);
        });
    };

    GitReaderApp.prototype.advanceTour = function (action, nodeId, arcId) {
        var _this = this;
        if (!this.tourState) {
            return Promise.resolve();
        }
        return this.fetchJson(this.buildApiUrl('/gitreader/api/tour/step'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                state: this.tourState,
                action: action,
                target_node_id: nodeId,
                target_arc_id: arcId,
            }),
        }).then(function (response) {
            _this.tourState = response.state;
            _this.tourStep = response.step;
            _this.renderTourStep(response.step);
            _this.updateTourControls();
            return _this.syncTourFocus(response.step);
        }).catch(function (error) {
            var message = error instanceof Error ? error.message : 'Unable to advance tour.';
            _this.renderTourError(message);
        });
    };

    GitReaderApp.prototype.endTour = function () {
        this.tourActive = false;
        this.tourState = null;
        this.tourStep = null;
        this.guidedAllowedNodeIds = null;
        this.updateTourControls();
        if (this.activeStoryArc) {
            this.renderStoryArc(this.activeStoryArc);
            return;
        }
        if (this.currentSymbol) {
            this.updateNarrator(this.currentSymbol);
            return;
        }
        this.renderStoryArcEmpty();
    };

    GitReaderApp.prototype.getActiveTourArcId = function () {
        if (this.activeStoryArc && this.activeStoryArc.id) {
            return this.activeStoryArc.id;
        }
        if (this.tocMode === 'routes' && this.currentChapterId) {
            return this.currentChapterId;
        }
        if (this.routeSelect.value) {
            return this.routeSelect.value;
        }
        return null;
    };

    GitReaderApp.prototype.syncTourFocus = function (step) {
        var _this = this;
        if (!step) {
            return Promise.resolve();
        }
        return this.loadGraphForScope('full').then(function () {
            var focus = step.focus;
            var nodeId = step.node_id || (focus && focus.node_id);
            var node = nodeId ? _this.nodeById.get(nodeId) || null : null;
            var focusPath = focus && focus.file_path ? _this.normalizePath(focus.file_path) : '';
            var fileNode = focusPath ? _this.fileNodesByPath.get(focusPath) || null : null;
            var targetNode = node || fileNode;
            if (!targetNode) {
                return;
            }
            if (_this.tourActive && (!_this.graphInstance || _this.graphInstance.$id(targetNode.id).empty())) {
                var nodes = _this.graphNodes;
                var edges = _this.filterEdgesForNodes(nodes);
                var graphView = {
                    nodes: nodes,
                    edges: edges,
                    totalNodes: nodes.length,
                    visibleNodes: nodes.length,
                    isCapped: false
                };
                _this.renderGraph(graphView.nodes, graphView.edges);
                _this.updateGraphNodeStatus(graphView);
            }
            if (_this.graphInstance) {
                _this.graphInstance.$('node:selected').unselect();
                var element = _this.graphInstance.$id(targetNode.id);
                if (element && typeof element.select === 'function') {
                    element.select();
                }
            }
            return _this.loadSymbolSnippet(targetNode, false).catch(function () {
                _this.renderCode(targetNode);
            }).then(function () {
                if (focus && focus.start_line) {
                    _this.jumpToLine(focus.start_line);
                }
            });
        });
    };

    GitReaderApp.prototype.handleContextLink = function (nodeId, filePath, line) {
        var _this = this;
        if (nodeId) {
            if (this.tourActive) {
                if (!this.isGuidedNodeAllowed(nodeId)) {
                    this.flashGuidedMessage('Follow the guide to unlock this step.');
                    return;
                }
                this.advanceTour('jump', nodeId);
                return;
            }
            var node = this.nodeById.get(nodeId);
            if (node) {
                this.loadSymbolSnippet(node, false).catch(function () {
                    _this.renderCode(node);
                }).then(function () {
                    if (line) {
                        _this.jumpToLine(line);
                    }
                });
            }
            return;
        }
        if (!filePath) {
            return;
        }
        var normalized = this.normalizePath(filePath);
        var fileNode = this.fileNodesByPath.get(normalized) || null;
        if (fileNode) {
            this.loadSymbolSnippet(fileNode, false).catch(function () {
                _this.renderCode(fileNode);
            }).then(function () {
                if (line) {
                    _this.jumpToLine(line);
                }
            });
            return;
        }
        if (line && this.currentSymbol && this.currentSymbol.location && this.currentSymbol.location.path) {
            if (this.normalizePath(this.currentSymbol.location.path) === normalized) {
                this.jumpToLine(line);
            }
        }
    };

    GitReaderApp.prototype.flashGuidedMessage = function (message) {
        var _this = this;
        this.setCanvasOverlay(message, true);
        window.setTimeout(function () { return _this.setCanvasOverlay('', false); }, 1400);
    };

    GitReaderApp.prototype.isGuidedNodeAllowed = function (nodeId) {
        if (!this.tourActive || !this.guidedAllowedNodeIds) {
            return true;
        }
        return this.guidedAllowedNodeIds.has(nodeId);
    };

    GitReaderApp.prototype.renderTourStep = function (step) {
        var explanation = (step.explanation || []).map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('');
        var relatedNodes = step.related_nodes || [];
        var relatedNodeButtons = relatedNodes.map(function (item) {
            return '<button class="ghost-btn arc-jump" data-tour-node="' + escapeHtml(item.node_id) + '">' + escapeHtml(item.label) + '</button>';
        });
        var relatedArcs = step.related_arcs || [];
        var relatedArcButtons = relatedArcs.map(function (item) {
            return '<button class="ghost-btn arc-jump" data-tour-arc="' + escapeHtml(item.arc_id) + '">' + escapeHtml(item.title) + '</button>';
        });
        var concept = step.concept ? '<p><strong>Concept:</strong> ' + escapeHtml(step.concept) + '</p>' : '';
        var whyHere = step.why_here ? '<p><strong>Why here:</strong> ' + escapeHtml(step.why_here) + '</p>' : '';
        var remember = step.remember ? '<p><strong>Remember:</strong> ' + escapeHtml(step.remember) + '</p>' : '';
        var focus = step.focus && step.focus.file_path ? (function () {
            var start = step.focus.start_line;
            var end = step.focus.end_line;
            var range = start ? '' + start + (end && end !== start ? '-' + end : '') : '';
            return '<p class="tour-focus">Focus: ' + escapeHtml(step.focus.file_path) + (range ? ':' + range : '') + '</p>';
        })() : '';
        var pitfall = step.pitfall ? '<p class="tour-pitfall">' + escapeHtml(step.pitfall) + '</p>' : '';
        var contextLinks = step.context_links || [];
        var contextButtons = contextLinks.map(function (link) {
            var attrs = [
                'data-context-link',
                link.node_id ? 'data-context-node="' + escapeHtml(link.node_id) + '"' : '',
                link.file_path ? 'data-context-file="' + escapeHtml(link.file_path) + '"' : '',
                typeof link.line === 'number' ? 'data-context-line="' + link.line + '"' : '',
            ].filter(Boolean).join(' ');
            return '<button class="ghost-btn context-link" ' + attrs + '>' + escapeHtml(link.label) + '</button>';
        });
        var storySoFarItems = (step.story_so_far || []).map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('');
        var storySoFar = storySoFarItems
            ? '<div class="tour-story"><p class="eyebrow">Story so far</p><ul>' + storySoFarItems + '</ul></div>'
            : '';
        this.narratorOutput.innerHTML =
            '<p class="eyebrow">Tour: ' + escapeHtml(this.tourMode) + '</p>' +
            '<h3>' + escapeHtml(step.title) + '</h3>' +
            '<p>' + escapeHtml(step.hook) + '</p>' +
            focus +
            concept +
            whyHere +
            remember +
            (explanation ? '<ul>' + explanation + '</ul>' : '') +
            '<p><strong>Why it matters:</strong> ' + escapeHtml(step.why_it_matters) + '</p>' +
            '<p><strong>Next:</strong> ' + escapeHtml(step.next_click) + '</p>' +
            pitfall +
            (contextButtons.length > 0 ? '<div class="context-link-list">' + contextButtons.join('') + '</div>' : '') +
            storySoFar +
            (relatedNodeButtons.length > 0 || relatedArcButtons.length > 0
                ? '<div class="arc-jump-list">' + relatedNodeButtons.join('') + relatedArcButtons.join('') + '</div>'
                : '');
    };

    GitReaderApp.prototype.renderTourError = function (message) {
        this.narratorOutput.innerHTML =
            '<p class="eyebrow">Tour</p>' +
            '<h3>Tour unavailable</h3>' +
            '<p>' + escapeHtml(message) + '</p>';
    };

    GitReaderApp.prototype.applyGuidedState = function () {
        if (!this.tourActive || !this.tourStep) {
            this.guidedAllowedNodeIds = null;
            this.applyGuidedToc();
            this.applyGuidedCodeFocus();
            this.applyGraphFilters();
            this.renderFileTree(null);
            return;
        }
        var allowed = new Set(this.tourStep.allowed_node_ids || []);
        var focusPath = this.tourStep.focus && this.tourStep.focus.file_path;
        if (focusPath) {
            var normalized = this.normalizePath(focusPath);
            var fileNode = this.fileNodesByPath.get(normalized);
            if (fileNode) {
                allowed.add(fileNode.id);
            }
        }
        this.guidedAllowedNodeIds = allowed.size > 0 ? allowed : null;
        this.applyGuidedToc();
        this.applyGraphFilters();
        this.applyGuidedCodeFocus();
        this.renderFileTree((this.tourStep.focus && this.tourStep.focus.file_path) || null);
    };

    GitReaderApp.prototype.applyGuidedToc = function () {
        var _this = this;
        var items = Array.from(this.tocList.querySelectorAll('.toc-item'));
        if (!this.tourActive || !this.tourStep || this.tocMode !== 'story') {
            items.forEach(function (item) { return item.classList.remove('is-guided-hidden'); });
            return;
        }
        items.forEach(function (item) {
            var isActive = item.dataset.chapterId === _this.currentChapterId;
            item.classList.toggle('is-guided-hidden', !isActive);
        });
    };

    GitReaderApp.prototype.applyGuidedGraphFilter = function () {
        if (!this.graphInstance) {
            return;
        }
        var cy = this.graphInstance;
        cy.elements().removeClass('is-guided-hidden');
        cy.nodes().removeClass('is-guided-focus');
        if (!this.tourActive || !this.guidedAllowedNodeIds || !this.tourStep) {
            return;
        }
        var allowed = this.guidedAllowedNodeIds;
        var focusId = this.tourStep.node_id;
        cy.nodes().forEach(function (node) {
            var isAllowed = allowed.has(node.id());
            node.toggleClass('is-guided-hidden', !isAllowed);
            node.toggleClass('is-guided-focus', node.id() === focusId);
        });
        cy.edges().forEach(function (edge) {
            var sourceId = edge.data('source');
            var targetId = edge.data('target');
            var isAllowed = allowed.has(sourceId) && allowed.has(targetId);
            edge.toggleClass('is-guided-hidden', !isAllowed);
        });
        cy.elements('.is-guided-hidden').hide();
    };

    GitReaderApp.prototype.applyGuidedCodeFocus = function () {
        var _this = this;
        var lines = Array.from(this.codeSurface.querySelectorAll('.code-line'));
        lines.forEach(function (line) { return line.classList.remove('is-guided-dim', 'is-guided-focus'); });
        if (!this.tourActive || !this.tourStep || !this.tourStep.focus) {
            return;
        }
        var focus = this.tourStep.focus;
        if (!focus || !focus.start_line) {
            return;
        }
        if (focus.file_path && this.currentSymbol && this.currentSymbol.location && this.currentSymbol.location.path) {
            var currentPath = this.normalizePath(this.currentSymbol.location.path);
            var focusPath = this.normalizePath(focus.file_path);
            if (currentPath !== focusPath) {
                return;
            }
        }
        var start = focus.start_line;
        var end = focus.end_line && focus.end_line >= start ? focus.end_line : start;
        lines.forEach(function (line) {
            var lineNumber = Number(line.dataset.line);
            if (!Number.isFinite(lineNumber)) {
                return;
            }
            if (lineNumber >= start && lineNumber <= end) {
                line.classList.add('is-guided-focus');
            } else {
                line.classList.add('is-guided-dim');
            }
        });
    };

    GitReaderApp.prototype.setCanvasOverlay = function (message, visible) {
        this.canvasOverlay.textContent = message;
        this.canvasOverlay.classList.toggle('is-visible', visible);
    };

    GitReaderApp.prototype.refreshGraphViewport = function () {
        if (!this.graphInstance) {
            return;
        }
        this.graphInstance.resize();
        this.graphInstance.fit();
        this.updateLabelVisibility();
    };

    document.addEventListener('DOMContentLoaded', function () {
        var app = new GitReaderApp();
        app.init();
    });
}());
