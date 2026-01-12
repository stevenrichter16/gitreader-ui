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
        this.graphRevealButton.disabled = true;
        this.routeSelect.disabled = true;
        this.routeJump.disabled = true;
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
        this.graphNodes = [];
        this.graphEdges = [];
        this.nodeById = new Map();
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
        this.tocDebounceTimer = null;
        this.tocDebounceDelay = 200;
        this.pendingChapterId = null;
        this.graphNodeCap = 300;
        this.graphNodeCapStep = 200;
        this.labelZoomThreshold = 0.65;
        this.labelLineLength = 18;
    }

    GitReaderApp.prototype.init = function () {
        var _this = this;
        this.renderLoadingState();
        this.loadGraphPreferences();
        this.bindEvents();
        this.updateNarratorToggle();
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
                    _this.applyGraphFilters();
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

        this.routeSelect.addEventListener('change', function () {
            var arcId = _this.routeSelect.value;
            if (!arcId) {
                return;
            }
            _this.setTocMode('routes', arcId);
        });

        this.routeJump.addEventListener('click', function () {
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
            var target = event.target.closest('[data-reader-action]');
            if (!target) {
                return;
            }
            var action = target.dataset.readerAction;
            if (action === 'copy') {
                _this.copySnippet();
            } else if (action === 'jump') {
                _this.jumpToInputLine();
            }
        });

        this.codeSurface.addEventListener('keydown', function (event) {
            var target = event.target;
            if (event.key === 'Enter' && target.matches('[data-line-input]')) {
                event.preventDefault();
                _this.jumpToInputLine();
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
                return this.loadChapter(targetChapterId);
            }
            return Promise.resolve();
        }
        this.tocList.innerHTML = '<li class="toc-item"><div class="toc-title">Loading chapters</div><p class="toc-summary">Switching TOC view...</p></li>';
        return this.loadToc(mode).then(function () {
            var defaultChapterId = targetChapterId || (_this.chapters.length > 0 ? _this.chapters[0].id : '');
            return _this.loadChapter(defaultChapterId);
        });
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
            title: arc.title || handler || 'Route',
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
        var routeLabel = this.formatRouteLabel(arc);
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
    };

    GitReaderApp.prototype.loadChapter = function (chapterId) {
        var _this = this;
        if (this.tocMode === 'routes') {
            return this.loadStoryArc(chapterId);
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

    GitReaderApp.prototype.updateGraphNodeStatus = function (graphView) {
        if (graphView.totalNodes === 0) {
            this.graphNodeStatus.textContent = '';
            this.graphRevealButton.disabled = true;
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
        if (symbol.kind === 'external') {
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
        var priority = ['function', 'method', 'class', 'file', 'blueprint', 'external'];
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
        var snippetHtml = this.renderSnippetLines(snippet);
        var revealLabel = snippet && snippet.section === 'body' ? 'Show body' : 'Show code';
        var codeClass = this.hasHighlightSupport() ? 'hljs language-python' : '';
        this.currentSymbol = symbol;
        this.currentSnippetText = (snippet && snippet.snippet) || '';
        this.codeSurface.innerHTML =
            '<article class="code-card">' +
            '<div class="code-meta">' +
            '<span>' + escapeHtml(symbol.kind.toUpperCase()) + '</span>' +
            '<span>' + escapeHtml(locationLabel) + escapeHtml(truncationLabel) + '</span>' +
            '</div>' +
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

    GitReaderApp.prototype.renderSnippetLines = function (snippet) {
        var rawBody = (snippet && snippet.snippet) || '';
        var body = rawBody.trim().length > 0 ? rawBody : '# body not loaded yet';
        var startLine = (snippet && snippet.start_line) || 1;
        var highlightSet = this.buildHighlightSet((snippet && snippet.highlights) || []);
        var rendered = this.highlightSnippet(body);
        var lines = rendered.replace(/\n$/, '').split('\n');
        return lines.map(function (line, index) {
            var lineNumber = startLine + index;
            var isHighlighted = highlightSet.has(lineNumber);
            var classes = isHighlighted ? 'code-line is-highlight' : 'code-line';
            return '<span class="' + classes + '" data-line="' + lineNumber + '"><span class="line-no">' + lineNumber + '</span>' + line + '</span>';
        }).join('\n');
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
            var node = _this.nodeById.get(nodeId);
            if (!node) {
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
        this.graphInstance.nodes().forEach(function (node) {
            var shouldShow = showAll || node.selected() || node.hasClass('is-hovered');
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

    GitReaderApp.prototype.highlightSnippet = function (body) {
        if (!this.hasHighlightSupport()) {
            return escapeHtml(body);
        }
        var language = hljs.getLanguage && hljs.getLanguage('python') ? 'python' : undefined;
        if (language) {
            return hljs.highlight(body, { language: language }).value;
        }
        return hljs.highlightAuto(body).value;
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
            var narrate = !this.activeStoryArc;
            return this.loadSymbolSnippet(this.currentSymbol, narrate).then(function () {
                if (_this.activeStoryArc) {
                    _this.renderStoryArc(_this.activeStoryArc);
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
        this.graphLayoutMode = mode;
        window.localStorage.setItem('gitreader.graphLayoutMode', mode);
        this.updateGraphControls();
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
        if (!this.graphInstance || !this.focusedNodeId) {
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

    GitReaderApp.prototype.formatStoryArc = function (arc, mode) {
        var routeLabel = escapeHtml(this.formatRouteLabel(arc));
        var scenes = Array.isArray(arc.scenes) ? arc.scenes : [];
        if (mode === 'summary') {
            var items = scenes.map(function (scene, index) {
                var label = this.formatStorySceneLabel(scene, index, true);
                return '<li>' + escapeHtml(label) + '</li>';
            }, this);
            var body = items.length > 0
                ? '<ol>' + items.join('') + '</ol>'
                : '<p>No flow steps captured yet.</p>';
            return {
                eyebrow: 'Scenes',
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
            var paths = scenes
                .map(function (scene) { return scene.file_path; })
                .filter(function (path) { return Boolean(path); });
            var unique = Array.from(new Set(paths));
            var pathItems = unique.map(function (path) { return '<li>' + escapeHtml(path) + '</li>'; });
            var pathBody = pathItems.length > 0
                ? '<ul>' + pathItems.join('') + '</ul>'
                : '<p>No file connections yet.</p>';
            return {
                eyebrow: 'Connections',
                title: 'Files touched by ' + routeLabel,
                body: pathBody
            };
        }
        if (mode === 'next') {
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
        var base = roleLabel + ': ' + scene.name + ' (' + kindLabel + ')';
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

    GitReaderApp.prototype.setMode = function (mode) {
        this.currentMode = mode;
        this.modeButtons.forEach(function (button) {
            button.classList.toggle('is-active', button.dataset.mode === mode);
        });
        if (this.activeStoryArc) {
            this.renderStoryArc(this.activeStoryArc);
            return;
        }
        var chapterId = this.getActiveChapterId();
        var nodes = this.filterNodesForChapter(chapterId || '');
        var focus = this.getSelectedGraphNode() || this.currentSymbol || this.pickFocusNode(nodes);
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
        return this.nodeById.get(nodeId) || null;
    };

    GitReaderApp.prototype.updateNarratorToggle = function () {
        this.narratorToggle.classList.toggle('is-active', this.narratorVisible);
        this.narratorToggle.setAttribute('aria-pressed', String(this.narratorVisible));
        this.narratorToggle.textContent = this.narratorVisible ? 'Narrator' : 'Narrator Off';
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
