(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // node_modules/highlight.js/lib/core.js
  var require_core = __commonJS({
    "node_modules/highlight.js/lib/core.js"(exports, module) {
      function deepFreeze(obj) {
        if (obj instanceof Map) {
          obj.clear = obj.delete = obj.set = function() {
            throw new Error("map is read-only");
          };
        } else if (obj instanceof Set) {
          obj.add = obj.clear = obj.delete = function() {
            throw new Error("set is read-only");
          };
        }
        Object.freeze(obj);
        Object.getOwnPropertyNames(obj).forEach((name) => {
          const prop = obj[name];
          const type = typeof prop;
          if ((type === "object" || type === "function") && !Object.isFrozen(prop)) {
            deepFreeze(prop);
          }
        });
        return obj;
      }
      var Response = class {
        /**
         * @param {CompiledMode} mode
         */
        constructor(mode) {
          if (mode.data === void 0) mode.data = {};
          this.data = mode.data;
          this.isMatchIgnored = false;
        }
        ignoreMatch() {
          this.isMatchIgnored = true;
        }
      };
      function escapeHTML(value) {
        return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
      }
      function inherit$1(original, ...objects) {
        const result = /* @__PURE__ */ Object.create(null);
        for (const key in original) {
          result[key] = original[key];
        }
        objects.forEach(function(obj) {
          for (const key in obj) {
            result[key] = obj[key];
          }
        });
        return (
          /** @type {T} */
          result
        );
      }
      var SPAN_CLOSE = "</span>";
      var emitsWrappingTags = (node) => {
        return !!node.scope;
      };
      var scopeToCSSClass = (name, { prefix }) => {
        if (name.startsWith("language:")) {
          return name.replace("language:", "language-");
        }
        if (name.includes(".")) {
          const pieces = name.split(".");
          return [
            `${prefix}${pieces.shift()}`,
            ...pieces.map((x, i) => `${x}${"_".repeat(i + 1)}`)
          ].join(" ");
        }
        return `${prefix}${name}`;
      };
      var HTMLRenderer = class {
        /**
         * Creates a new HTMLRenderer
         *
         * @param {Tree} parseTree - the parse tree (must support `walk` API)
         * @param {{classPrefix: string}} options
         */
        constructor(parseTree, options) {
          this.buffer = "";
          this.classPrefix = options.classPrefix;
          parseTree.walk(this);
        }
        /**
         * Adds texts to the output stream
         *
         * @param {string} text */
        addText(text) {
          this.buffer += escapeHTML(text);
        }
        /**
         * Adds a node open to the output stream (if needed)
         *
         * @param {Node} node */
        openNode(node) {
          if (!emitsWrappingTags(node)) return;
          const className = scopeToCSSClass(
            node.scope,
            { prefix: this.classPrefix }
          );
          this.span(className);
        }
        /**
         * Adds a node close to the output stream (if needed)
         *
         * @param {Node} node */
        closeNode(node) {
          if (!emitsWrappingTags(node)) return;
          this.buffer += SPAN_CLOSE;
        }
        /**
         * returns the accumulated buffer
        */
        value() {
          return this.buffer;
        }
        // helpers
        /**
         * Builds a span element
         *
         * @param {string} className */
        span(className) {
          this.buffer += `<span class="${className}">`;
        }
      };
      var newNode = (opts = {}) => {
        const result = { children: [] };
        Object.assign(result, opts);
        return result;
      };
      var TokenTree = class _TokenTree {
        constructor() {
          this.rootNode = newNode();
          this.stack = [this.rootNode];
        }
        get top() {
          return this.stack[this.stack.length - 1];
        }
        get root() {
          return this.rootNode;
        }
        /** @param {Node} node */
        add(node) {
          this.top.children.push(node);
        }
        /** @param {string} scope */
        openNode(scope) {
          const node = newNode({ scope });
          this.add(node);
          this.stack.push(node);
        }
        closeNode() {
          if (this.stack.length > 1) {
            return this.stack.pop();
          }
          return void 0;
        }
        closeAllNodes() {
          while (this.closeNode()) ;
        }
        toJSON() {
          return JSON.stringify(this.rootNode, null, 4);
        }
        /**
         * @typedef { import("./html_renderer").Renderer } Renderer
         * @param {Renderer} builder
         */
        walk(builder) {
          return this.constructor._walk(builder, this.rootNode);
        }
        /**
         * @param {Renderer} builder
         * @param {Node} node
         */
        static _walk(builder, node) {
          if (typeof node === "string") {
            builder.addText(node);
          } else if (node.children) {
            builder.openNode(node);
            node.children.forEach((child) => this._walk(builder, child));
            builder.closeNode(node);
          }
          return builder;
        }
        /**
         * @param {Node} node
         */
        static _collapse(node) {
          if (typeof node === "string") return;
          if (!node.children) return;
          if (node.children.every((el) => typeof el === "string")) {
            node.children = [node.children.join("")];
          } else {
            node.children.forEach((child) => {
              _TokenTree._collapse(child);
            });
          }
        }
      };
      var TokenTreeEmitter = class extends TokenTree {
        /**
         * @param {*} options
         */
        constructor(options) {
          super();
          this.options = options;
        }
        /**
         * @param {string} text
         */
        addText(text) {
          if (text === "") {
            return;
          }
          this.add(text);
        }
        /** @param {string} scope */
        startScope(scope) {
          this.openNode(scope);
        }
        endScope() {
          this.closeNode();
        }
        /**
         * @param {Emitter & {root: DataNode}} emitter
         * @param {string} name
         */
        __addSublanguage(emitter, name) {
          const node = emitter.root;
          if (name) node.scope = `language:${name}`;
          this.add(node);
        }
        toHTML() {
          const renderer = new HTMLRenderer(this, this.options);
          return renderer.value();
        }
        finalize() {
          this.closeAllNodes();
          return true;
        }
      };
      function source2(re) {
        if (!re) return null;
        if (typeof re === "string") return re;
        return re.source;
      }
      function lookahead2(re) {
        return concat2("(?=", re, ")");
      }
      function anyNumberOfTimes(re) {
        return concat2("(?:", re, ")*");
      }
      function optional(re) {
        return concat2("(?:", re, ")?");
      }
      function concat2(...args) {
        const joined = args.map((x) => source2(x)).join("");
        return joined;
      }
      function stripOptionsFromArgs2(args) {
        const opts = args[args.length - 1];
        if (typeof opts === "object" && opts.constructor === Object) {
          args.splice(args.length - 1, 1);
          return opts;
        } else {
          return {};
        }
      }
      function either2(...args) {
        const opts = stripOptionsFromArgs2(args);
        const joined = "(" + (opts.capture ? "" : "?:") + args.map((x) => source2(x)).join("|") + ")";
        return joined;
      }
      function countMatchGroups(re) {
        return new RegExp(re.toString() + "|").exec("").length - 1;
      }
      function startsWith(re, lexeme) {
        const match = re && re.exec(lexeme);
        return match && match.index === 0;
      }
      var BACKREF_RE = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;
      function _rewriteBackreferences(regexps, { joinWith }) {
        let numCaptures = 0;
        return regexps.map((regex) => {
          numCaptures += 1;
          const offset = numCaptures;
          let re = source2(regex);
          let out = "";
          while (re.length > 0) {
            const match = BACKREF_RE.exec(re);
            if (!match) {
              out += re;
              break;
            }
            out += re.substring(0, match.index);
            re = re.substring(match.index + match[0].length);
            if (match[0][0] === "\\" && match[1]) {
              out += "\\" + String(Number(match[1]) + offset);
            } else {
              out += match[0];
              if (match[0] === "(") {
                numCaptures++;
              }
            }
          }
          return out;
        }).map((re) => `(${re})`).join(joinWith);
      }
      var MATCH_NOTHING_RE = /\b\B/;
      var IDENT_RE3 = "[a-zA-Z]\\w*";
      var UNDERSCORE_IDENT_RE = "[a-zA-Z_]\\w*";
      var NUMBER_RE = "\\b\\d+(\\.\\d+)?";
      var C_NUMBER_RE = "(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)";
      var BINARY_NUMBER_RE = "\\b(0b[01]+)";
      var RE_STARTERS_RE = "!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~";
      var SHEBANG = (opts = {}) => {
        const beginShebang = /^#![ ]*\//;
        if (opts.binary) {
          opts.begin = concat2(
            beginShebang,
            /.*\b/,
            opts.binary,
            /\b.*/
          );
        }
        return inherit$1({
          scope: "meta",
          begin: beginShebang,
          end: /$/,
          relevance: 0,
          /** @type {ModeCallback} */
          "on:begin": (m, resp) => {
            if (m.index !== 0) resp.ignoreMatch();
          }
        }, opts);
      };
      var BACKSLASH_ESCAPE = {
        begin: "\\\\[\\s\\S]",
        relevance: 0
      };
      var APOS_STRING_MODE = {
        scope: "string",
        begin: "'",
        end: "'",
        illegal: "\\n",
        contains: [BACKSLASH_ESCAPE]
      };
      var QUOTE_STRING_MODE = {
        scope: "string",
        begin: '"',
        end: '"',
        illegal: "\\n",
        contains: [BACKSLASH_ESCAPE]
      };
      var PHRASAL_WORDS_MODE = {
        begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
      };
      var COMMENT = function(begin, end, modeOptions = {}) {
        const mode = inherit$1(
          {
            scope: "comment",
            begin,
            end,
            contains: []
          },
          modeOptions
        );
        mode.contains.push({
          scope: "doctag",
          // hack to avoid the space from being included. the space is necessary to
          // match here to prevent the plain text rule below from gobbling up doctags
          begin: "[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)",
          end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
          excludeBegin: true,
          relevance: 0
        });
        const ENGLISH_WORD = either2(
          // list of common 1 and 2 letter words in English
          "I",
          "a",
          "is",
          "so",
          "us",
          "to",
          "at",
          "if",
          "in",
          "it",
          "on",
          // note: this is not an exhaustive list of contractions, just popular ones
          /[A-Za-z]+['](d|ve|re|ll|t|s|n)/,
          // contractions - can't we'd they're let's, etc
          /[A-Za-z]+[-][a-z]+/,
          // `no-way`, etc.
          /[A-Za-z][a-z]{2,}/
          // allow capitalized words at beginning of sentences
        );
        mode.contains.push(
          {
            // TODO: how to include ", (, ) without breaking grammars that use these for
            // comment delimiters?
            // begin: /[ ]+([()"]?([A-Za-z'-]{3,}|is|a|I|so|us|[tT][oO]|at|if|in|it|on)[.]?[()":]?([.][ ]|[ ]|\))){3}/
            // ---
            // this tries to find sequences of 3 english words in a row (without any
            // "programming" type syntax) this gives us a strong signal that we've
            // TRULY found a comment - vs perhaps scanning with the wrong language.
            // It's possible to find something that LOOKS like the start of the
            // comment - but then if there is no readable text - good chance it is a
            // false match and not a comment.
            //
            // for a visual example please see:
            // https://github.com/highlightjs/highlight.js/issues/2827
            begin: concat2(
              /[ ]+/,
              // necessary to prevent us gobbling up doctags like /* @author Bob Mcgill */
              "(",
              ENGLISH_WORD,
              /[.]?[:]?([.][ ]|[ ])/,
              "){3}"
            )
            // look for 3 words in a row
          }
        );
        return mode;
      };
      var C_LINE_COMMENT_MODE = COMMENT("//", "$");
      var C_BLOCK_COMMENT_MODE = COMMENT("/\\*", "\\*/");
      var HASH_COMMENT_MODE = COMMENT("#", "$");
      var NUMBER_MODE = {
        scope: "number",
        begin: NUMBER_RE,
        relevance: 0
      };
      var C_NUMBER_MODE = {
        scope: "number",
        begin: C_NUMBER_RE,
        relevance: 0
      };
      var BINARY_NUMBER_MODE = {
        scope: "number",
        begin: BINARY_NUMBER_RE,
        relevance: 0
      };
      var REGEXP_MODE = {
        scope: "regexp",
        begin: /\/(?=[^/\n]*\/)/,
        end: /\/[gimuy]*/,
        contains: [
          BACKSLASH_ESCAPE,
          {
            begin: /\[/,
            end: /\]/,
            relevance: 0,
            contains: [BACKSLASH_ESCAPE]
          }
        ]
      };
      var TITLE_MODE = {
        scope: "title",
        begin: IDENT_RE3,
        relevance: 0
      };
      var UNDERSCORE_TITLE_MODE = {
        scope: "title",
        begin: UNDERSCORE_IDENT_RE,
        relevance: 0
      };
      var METHOD_GUARD = {
        // excludes method names from keyword processing
        begin: "\\.\\s*" + UNDERSCORE_IDENT_RE,
        relevance: 0
      };
      var END_SAME_AS_BEGIN = function(mode) {
        return Object.assign(
          mode,
          {
            /** @type {ModeCallback} */
            "on:begin": (m, resp) => {
              resp.data._beginMatch = m[1];
            },
            /** @type {ModeCallback} */
            "on:end": (m, resp) => {
              if (resp.data._beginMatch !== m[1]) resp.ignoreMatch();
            }
          }
        );
      };
      var MODES = /* @__PURE__ */ Object.freeze({
        __proto__: null,
        APOS_STRING_MODE,
        BACKSLASH_ESCAPE,
        BINARY_NUMBER_MODE,
        BINARY_NUMBER_RE,
        COMMENT,
        C_BLOCK_COMMENT_MODE,
        C_LINE_COMMENT_MODE,
        C_NUMBER_MODE,
        C_NUMBER_RE,
        END_SAME_AS_BEGIN,
        HASH_COMMENT_MODE,
        IDENT_RE: IDENT_RE3,
        MATCH_NOTHING_RE,
        METHOD_GUARD,
        NUMBER_MODE,
        NUMBER_RE,
        PHRASAL_WORDS_MODE,
        QUOTE_STRING_MODE,
        REGEXP_MODE,
        RE_STARTERS_RE,
        SHEBANG,
        TITLE_MODE,
        UNDERSCORE_IDENT_RE,
        UNDERSCORE_TITLE_MODE
      });
      function skipIfHasPrecedingDot(match, response) {
        const before = match.input[match.index - 1];
        if (before === ".") {
          response.ignoreMatch();
        }
      }
      function scopeClassName(mode, _parent) {
        if (mode.className !== void 0) {
          mode.scope = mode.className;
          delete mode.className;
        }
      }
      function beginKeywords(mode, parent) {
        if (!parent) return;
        if (!mode.beginKeywords) return;
        mode.begin = "\\b(" + mode.beginKeywords.split(" ").join("|") + ")(?!\\.)(?=\\b|\\s)";
        mode.__beforeBegin = skipIfHasPrecedingDot;
        mode.keywords = mode.keywords || mode.beginKeywords;
        delete mode.beginKeywords;
        if (mode.relevance === void 0) mode.relevance = 0;
      }
      function compileIllegal(mode, _parent) {
        if (!Array.isArray(mode.illegal)) return;
        mode.illegal = either2(...mode.illegal);
      }
      function compileMatch(mode, _parent) {
        if (!mode.match) return;
        if (mode.begin || mode.end) throw new Error("begin & end are not supported with match");
        mode.begin = mode.match;
        delete mode.match;
      }
      function compileRelevance(mode, _parent) {
        if (mode.relevance === void 0) mode.relevance = 1;
      }
      var beforeMatchExt = (mode, parent) => {
        if (!mode.beforeMatch) return;
        if (mode.starts) throw new Error("beforeMatch cannot be used with starts");
        const originalMode = Object.assign({}, mode);
        Object.keys(mode).forEach((key) => {
          delete mode[key];
        });
        mode.keywords = originalMode.keywords;
        mode.begin = concat2(originalMode.beforeMatch, lookahead2(originalMode.begin));
        mode.starts = {
          relevance: 0,
          contains: [
            Object.assign(originalMode, { endsParent: true })
          ]
        };
        mode.relevance = 0;
        delete originalMode.beforeMatch;
      };
      var COMMON_KEYWORDS = [
        "of",
        "and",
        "for",
        "in",
        "not",
        "or",
        "if",
        "then",
        "parent",
        // common variable name
        "list",
        // common variable name
        "value"
        // common variable name
      ];
      var DEFAULT_KEYWORD_SCOPE = "keyword";
      function compileKeywords(rawKeywords, caseInsensitive, scopeName = DEFAULT_KEYWORD_SCOPE) {
        const compiledKeywords = /* @__PURE__ */ Object.create(null);
        if (typeof rawKeywords === "string") {
          compileList(scopeName, rawKeywords.split(" "));
        } else if (Array.isArray(rawKeywords)) {
          compileList(scopeName, rawKeywords);
        } else {
          Object.keys(rawKeywords).forEach(function(scopeName2) {
            Object.assign(
              compiledKeywords,
              compileKeywords(rawKeywords[scopeName2], caseInsensitive, scopeName2)
            );
          });
        }
        return compiledKeywords;
        function compileList(scopeName2, keywordList) {
          if (caseInsensitive) {
            keywordList = keywordList.map((x) => x.toLowerCase());
          }
          keywordList.forEach(function(keyword) {
            const pair = keyword.split("|");
            compiledKeywords[pair[0]] = [scopeName2, scoreForKeyword(pair[0], pair[1])];
          });
        }
      }
      function scoreForKeyword(keyword, providedScore) {
        if (providedScore) {
          return Number(providedScore);
        }
        return commonKeyword(keyword) ? 0 : 1;
      }
      function commonKeyword(keyword) {
        return COMMON_KEYWORDS.includes(keyword.toLowerCase());
      }
      var seenDeprecations = {};
      var error = (message) => {
        console.error(message);
      };
      var warn = (message, ...args) => {
        console.log(`WARN: ${message}`, ...args);
      };
      var deprecated = (version2, message) => {
        if (seenDeprecations[`${version2}/${message}`]) return;
        console.log(`Deprecated as of ${version2}. ${message}`);
        seenDeprecations[`${version2}/${message}`] = true;
      };
      var MultiClassError = new Error();
      function remapScopeNames(mode, regexes, { key }) {
        let offset = 0;
        const scopeNames = mode[key];
        const emit = {};
        const positions = {};
        for (let i = 1; i <= regexes.length; i++) {
          positions[i + offset] = scopeNames[i];
          emit[i + offset] = true;
          offset += countMatchGroups(regexes[i - 1]);
        }
        mode[key] = positions;
        mode[key]._emit = emit;
        mode[key]._multi = true;
      }
      function beginMultiClass(mode) {
        if (!Array.isArray(mode.begin)) return;
        if (mode.skip || mode.excludeBegin || mode.returnBegin) {
          error("skip, excludeBegin, returnBegin not compatible with beginScope: {}");
          throw MultiClassError;
        }
        if (typeof mode.beginScope !== "object" || mode.beginScope === null) {
          error("beginScope must be object");
          throw MultiClassError;
        }
        remapScopeNames(mode, mode.begin, { key: "beginScope" });
        mode.begin = _rewriteBackreferences(mode.begin, { joinWith: "" });
      }
      function endMultiClass(mode) {
        if (!Array.isArray(mode.end)) return;
        if (mode.skip || mode.excludeEnd || mode.returnEnd) {
          error("skip, excludeEnd, returnEnd not compatible with endScope: {}");
          throw MultiClassError;
        }
        if (typeof mode.endScope !== "object" || mode.endScope === null) {
          error("endScope must be object");
          throw MultiClassError;
        }
        remapScopeNames(mode, mode.end, { key: "endScope" });
        mode.end = _rewriteBackreferences(mode.end, { joinWith: "" });
      }
      function scopeSugar(mode) {
        if (mode.scope && typeof mode.scope === "object" && mode.scope !== null) {
          mode.beginScope = mode.scope;
          delete mode.scope;
        }
      }
      function MultiClass(mode) {
        scopeSugar(mode);
        if (typeof mode.beginScope === "string") {
          mode.beginScope = { _wrap: mode.beginScope };
        }
        if (typeof mode.endScope === "string") {
          mode.endScope = { _wrap: mode.endScope };
        }
        beginMultiClass(mode);
        endMultiClass(mode);
      }
      function compileLanguage(language) {
        function langRe(value, global) {
          return new RegExp(
            source2(value),
            "m" + (language.case_insensitive ? "i" : "") + (language.unicodeRegex ? "u" : "") + (global ? "g" : "")
          );
        }
        class MultiRegex {
          constructor() {
            this.matchIndexes = {};
            this.regexes = [];
            this.matchAt = 1;
            this.position = 0;
          }
          // @ts-ignore
          addRule(re, opts) {
            opts.position = this.position++;
            this.matchIndexes[this.matchAt] = opts;
            this.regexes.push([opts, re]);
            this.matchAt += countMatchGroups(re) + 1;
          }
          compile() {
            if (this.regexes.length === 0) {
              this.exec = () => null;
            }
            const terminators = this.regexes.map((el) => el[1]);
            this.matcherRe = langRe(_rewriteBackreferences(terminators, { joinWith: "|" }), true);
            this.lastIndex = 0;
          }
          /** @param {string} s */
          exec(s) {
            this.matcherRe.lastIndex = this.lastIndex;
            const match = this.matcherRe.exec(s);
            if (!match) {
              return null;
            }
            const i = match.findIndex((el, i2) => i2 > 0 && el !== void 0);
            const matchData = this.matchIndexes[i];
            match.splice(0, i);
            return Object.assign(match, matchData);
          }
        }
        class ResumableMultiRegex {
          constructor() {
            this.rules = [];
            this.multiRegexes = [];
            this.count = 0;
            this.lastIndex = 0;
            this.regexIndex = 0;
          }
          // @ts-ignore
          getMatcher(index) {
            if (this.multiRegexes[index]) return this.multiRegexes[index];
            const matcher = new MultiRegex();
            this.rules.slice(index).forEach(([re, opts]) => matcher.addRule(re, opts));
            matcher.compile();
            this.multiRegexes[index] = matcher;
            return matcher;
          }
          resumingScanAtSamePosition() {
            return this.regexIndex !== 0;
          }
          considerAll() {
            this.regexIndex = 0;
          }
          // @ts-ignore
          addRule(re, opts) {
            this.rules.push([re, opts]);
            if (opts.type === "begin") this.count++;
          }
          /** @param {string} s */
          exec(s) {
            const m = this.getMatcher(this.regexIndex);
            m.lastIndex = this.lastIndex;
            let result = m.exec(s);
            if (this.resumingScanAtSamePosition()) {
              if (result && result.index === this.lastIndex) ;
              else {
                const m2 = this.getMatcher(0);
                m2.lastIndex = this.lastIndex + 1;
                result = m2.exec(s);
              }
            }
            if (result) {
              this.regexIndex += result.position + 1;
              if (this.regexIndex === this.count) {
                this.considerAll();
              }
            }
            return result;
          }
        }
        function buildModeRegex(mode) {
          const mm = new ResumableMultiRegex();
          mode.contains.forEach((term) => mm.addRule(term.begin, { rule: term, type: "begin" }));
          if (mode.terminatorEnd) {
            mm.addRule(mode.terminatorEnd, { type: "end" });
          }
          if (mode.illegal) {
            mm.addRule(mode.illegal, { type: "illegal" });
          }
          return mm;
        }
        function compileMode(mode, parent) {
          const cmode = (
            /** @type CompiledMode */
            mode
          );
          if (mode.isCompiled) return cmode;
          [
            scopeClassName,
            // do this early so compiler extensions generally don't have to worry about
            // the distinction between match/begin
            compileMatch,
            MultiClass,
            beforeMatchExt
          ].forEach((ext) => ext(mode, parent));
          language.compilerExtensions.forEach((ext) => ext(mode, parent));
          mode.__beforeBegin = null;
          [
            beginKeywords,
            // do this later so compiler extensions that come earlier have access to the
            // raw array if they wanted to perhaps manipulate it, etc.
            compileIllegal,
            // default to 1 relevance if not specified
            compileRelevance
          ].forEach((ext) => ext(mode, parent));
          mode.isCompiled = true;
          let keywordPattern = null;
          if (typeof mode.keywords === "object" && mode.keywords.$pattern) {
            mode.keywords = Object.assign({}, mode.keywords);
            keywordPattern = mode.keywords.$pattern;
            delete mode.keywords.$pattern;
          }
          keywordPattern = keywordPattern || /\w+/;
          if (mode.keywords) {
            mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);
          }
          cmode.keywordPatternRe = langRe(keywordPattern, true);
          if (parent) {
            if (!mode.begin) mode.begin = /\B|\b/;
            cmode.beginRe = langRe(cmode.begin);
            if (!mode.end && !mode.endsWithParent) mode.end = /\B|\b/;
            if (mode.end) cmode.endRe = langRe(cmode.end);
            cmode.terminatorEnd = source2(cmode.end) || "";
            if (mode.endsWithParent && parent.terminatorEnd) {
              cmode.terminatorEnd += (mode.end ? "|" : "") + parent.terminatorEnd;
            }
          }
          if (mode.illegal) cmode.illegalRe = langRe(
            /** @type {RegExp | string} */
            mode.illegal
          );
          if (!mode.contains) mode.contains = [];
          mode.contains = [].concat(...mode.contains.map(function(c) {
            return expandOrCloneMode(c === "self" ? mode : c);
          }));
          mode.contains.forEach(function(c) {
            compileMode(
              /** @type Mode */
              c,
              cmode
            );
          });
          if (mode.starts) {
            compileMode(mode.starts, parent);
          }
          cmode.matcher = buildModeRegex(cmode);
          return cmode;
        }
        if (!language.compilerExtensions) language.compilerExtensions = [];
        if (language.contains && language.contains.includes("self")) {
          throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");
        }
        language.classNameAliases = inherit$1(language.classNameAliases || {});
        return compileMode(
          /** @type Mode */
          language
        );
      }
      function dependencyOnParent(mode) {
        if (!mode) return false;
        return mode.endsWithParent || dependencyOnParent(mode.starts);
      }
      function expandOrCloneMode(mode) {
        if (mode.variants && !mode.cachedVariants) {
          mode.cachedVariants = mode.variants.map(function(variant) {
            return inherit$1(mode, { variants: null }, variant);
          });
        }
        if (mode.cachedVariants) {
          return mode.cachedVariants;
        }
        if (dependencyOnParent(mode)) {
          return inherit$1(mode, { starts: mode.starts ? inherit$1(mode.starts) : null });
        }
        if (Object.isFrozen(mode)) {
          return inherit$1(mode);
        }
        return mode;
      }
      var version = "11.9.0";
      var HTMLInjectionError = class extends Error {
        constructor(reason, html) {
          super(reason);
          this.name = "HTMLInjectionError";
          this.html = html;
        }
      };
      var escape = escapeHTML;
      var inherit = inherit$1;
      var NO_MATCH = Symbol("nomatch");
      var MAX_KEYWORD_HITS = 7;
      var HLJS = function(hljs) {
        const languages = /* @__PURE__ */ Object.create(null);
        const aliases = /* @__PURE__ */ Object.create(null);
        const plugins = [];
        let SAFE_MODE = true;
        const LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";
        const PLAINTEXT_LANGUAGE = { disableAutodetect: true, name: "Plain text", contains: [] };
        let options = {
          ignoreUnescapedHTML: false,
          throwUnescapedHTML: false,
          noHighlightRe: /^(no-?highlight)$/i,
          languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
          classPrefix: "hljs-",
          cssSelector: "pre code",
          languages: null,
          // beta configuration options, subject to change, welcome to discuss
          // https://github.com/highlightjs/highlight.js/issues/1086
          __emitter: TokenTreeEmitter
        };
        function shouldNotHighlight(languageName) {
          return options.noHighlightRe.test(languageName);
        }
        function blockLanguage(block) {
          let classes = block.className + " ";
          classes += block.parentNode ? block.parentNode.className : "";
          const match = options.languageDetectRe.exec(classes);
          if (match) {
            const language = getLanguage(match[1]);
            if (!language) {
              warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
              warn("Falling back to no-highlight mode for this block.", block);
            }
            return language ? match[1] : "no-highlight";
          }
          return classes.split(/\s+/).find((_class) => shouldNotHighlight(_class) || getLanguage(_class));
        }
        function highlight2(codeOrLanguageName, optionsOrCode, ignoreIllegals) {
          let code = "";
          let languageName = "";
          if (typeof optionsOrCode === "object") {
            code = codeOrLanguageName;
            ignoreIllegals = optionsOrCode.ignoreIllegals;
            languageName = optionsOrCode.language;
          } else {
            deprecated("10.7.0", "highlight(lang, code, ...args) has been deprecated.");
            deprecated("10.7.0", "Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277");
            languageName = codeOrLanguageName;
            code = optionsOrCode;
          }
          if (ignoreIllegals === void 0) {
            ignoreIllegals = true;
          }
          const context = {
            code,
            language: languageName
          };
          fire("before:highlight", context);
          const result = context.result ? context.result : _highlight(context.language, context.code, ignoreIllegals);
          result.code = context.code;
          fire("after:highlight", result);
          return result;
        }
        function _highlight(languageName, codeToHighlight, ignoreIllegals, continuation) {
          const keywordHits = /* @__PURE__ */ Object.create(null);
          function keywordData(mode, matchText) {
            return mode.keywords[matchText];
          }
          function processKeywords() {
            if (!top.keywords) {
              emitter.addText(modeBuffer);
              return;
            }
            let lastIndex = 0;
            top.keywordPatternRe.lastIndex = 0;
            let match = top.keywordPatternRe.exec(modeBuffer);
            let buf = "";
            while (match) {
              buf += modeBuffer.substring(lastIndex, match.index);
              const word = language.case_insensitive ? match[0].toLowerCase() : match[0];
              const data = keywordData(top, word);
              if (data) {
                const [kind, keywordRelevance] = data;
                emitter.addText(buf);
                buf = "";
                keywordHits[word] = (keywordHits[word] || 0) + 1;
                if (keywordHits[word] <= MAX_KEYWORD_HITS) relevance += keywordRelevance;
                if (kind.startsWith("_")) {
                  buf += match[0];
                } else {
                  const cssClass = language.classNameAliases[kind] || kind;
                  emitKeyword(match[0], cssClass);
                }
              } else {
                buf += match[0];
              }
              lastIndex = top.keywordPatternRe.lastIndex;
              match = top.keywordPatternRe.exec(modeBuffer);
            }
            buf += modeBuffer.substring(lastIndex);
            emitter.addText(buf);
          }
          function processSubLanguage() {
            if (modeBuffer === "") return;
            let result2 = null;
            if (typeof top.subLanguage === "string") {
              if (!languages[top.subLanguage]) {
                emitter.addText(modeBuffer);
                return;
              }
              result2 = _highlight(top.subLanguage, modeBuffer, true, continuations[top.subLanguage]);
              continuations[top.subLanguage] = /** @type {CompiledMode} */
              result2._top;
            } else {
              result2 = highlightAuto(modeBuffer, top.subLanguage.length ? top.subLanguage : null);
            }
            if (top.relevance > 0) {
              relevance += result2.relevance;
            }
            emitter.__addSublanguage(result2._emitter, result2.language);
          }
          function processBuffer() {
            if (top.subLanguage != null) {
              processSubLanguage();
            } else {
              processKeywords();
            }
            modeBuffer = "";
          }
          function emitKeyword(keyword, scope) {
            if (keyword === "") return;
            emitter.startScope(scope);
            emitter.addText(keyword);
            emitter.endScope();
          }
          function emitMultiClass(scope, match) {
            let i = 1;
            const max = match.length - 1;
            while (i <= max) {
              if (!scope._emit[i]) {
                i++;
                continue;
              }
              const klass = language.classNameAliases[scope[i]] || scope[i];
              const text = match[i];
              if (klass) {
                emitKeyword(text, klass);
              } else {
                modeBuffer = text;
                processKeywords();
                modeBuffer = "";
              }
              i++;
            }
          }
          function startNewMode(mode, match) {
            if (mode.scope && typeof mode.scope === "string") {
              emitter.openNode(language.classNameAliases[mode.scope] || mode.scope);
            }
            if (mode.beginScope) {
              if (mode.beginScope._wrap) {
                emitKeyword(modeBuffer, language.classNameAliases[mode.beginScope._wrap] || mode.beginScope._wrap);
                modeBuffer = "";
              } else if (mode.beginScope._multi) {
                emitMultiClass(mode.beginScope, match);
                modeBuffer = "";
              }
            }
            top = Object.create(mode, { parent: { value: top } });
            return top;
          }
          function endOfMode(mode, match, matchPlusRemainder) {
            let matched = startsWith(mode.endRe, matchPlusRemainder);
            if (matched) {
              if (mode["on:end"]) {
                const resp = new Response(mode);
                mode["on:end"](match, resp);
                if (resp.isMatchIgnored) matched = false;
              }
              if (matched) {
                while (mode.endsParent && mode.parent) {
                  mode = mode.parent;
                }
                return mode;
              }
            }
            if (mode.endsWithParent) {
              return endOfMode(mode.parent, match, matchPlusRemainder);
            }
          }
          function doIgnore(lexeme) {
            if (top.matcher.regexIndex === 0) {
              modeBuffer += lexeme[0];
              return 1;
            } else {
              resumeScanAtSamePosition = true;
              return 0;
            }
          }
          function doBeginMatch(match) {
            const lexeme = match[0];
            const newMode = match.rule;
            const resp = new Response(newMode);
            const beforeCallbacks = [newMode.__beforeBegin, newMode["on:begin"]];
            for (const cb of beforeCallbacks) {
              if (!cb) continue;
              cb(match, resp);
              if (resp.isMatchIgnored) return doIgnore(lexeme);
            }
            if (newMode.skip) {
              modeBuffer += lexeme;
            } else {
              if (newMode.excludeBegin) {
                modeBuffer += lexeme;
              }
              processBuffer();
              if (!newMode.returnBegin && !newMode.excludeBegin) {
                modeBuffer = lexeme;
              }
            }
            startNewMode(newMode, match);
            return newMode.returnBegin ? 0 : lexeme.length;
          }
          function doEndMatch(match) {
            const lexeme = match[0];
            const matchPlusRemainder = codeToHighlight.substring(match.index);
            const endMode = endOfMode(top, match, matchPlusRemainder);
            if (!endMode) {
              return NO_MATCH;
            }
            const origin = top;
            if (top.endScope && top.endScope._wrap) {
              processBuffer();
              emitKeyword(lexeme, top.endScope._wrap);
            } else if (top.endScope && top.endScope._multi) {
              processBuffer();
              emitMultiClass(top.endScope, match);
            } else if (origin.skip) {
              modeBuffer += lexeme;
            } else {
              if (!(origin.returnEnd || origin.excludeEnd)) {
                modeBuffer += lexeme;
              }
              processBuffer();
              if (origin.excludeEnd) {
                modeBuffer = lexeme;
              }
            }
            do {
              if (top.scope) {
                emitter.closeNode();
              }
              if (!top.skip && !top.subLanguage) {
                relevance += top.relevance;
              }
              top = top.parent;
            } while (top !== endMode.parent);
            if (endMode.starts) {
              startNewMode(endMode.starts, match);
            }
            return origin.returnEnd ? 0 : lexeme.length;
          }
          function processContinuations() {
            const list = [];
            for (let current = top; current !== language; current = current.parent) {
              if (current.scope) {
                list.unshift(current.scope);
              }
            }
            list.forEach((item) => emitter.openNode(item));
          }
          let lastMatch = {};
          function processLexeme(textBeforeMatch, match) {
            const lexeme = match && match[0];
            modeBuffer += textBeforeMatch;
            if (lexeme == null) {
              processBuffer();
              return 0;
            }
            if (lastMatch.type === "begin" && match.type === "end" && lastMatch.index === match.index && lexeme === "") {
              modeBuffer += codeToHighlight.slice(match.index, match.index + 1);
              if (!SAFE_MODE) {
                const err = new Error(`0 width match regex (${languageName})`);
                err.languageName = languageName;
                err.badRule = lastMatch.rule;
                throw err;
              }
              return 1;
            }
            lastMatch = match;
            if (match.type === "begin") {
              return doBeginMatch(match);
            } else if (match.type === "illegal" && !ignoreIllegals) {
              const err = new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.scope || "<unnamed>") + '"');
              err.mode = top;
              throw err;
            } else if (match.type === "end") {
              const processed = doEndMatch(match);
              if (processed !== NO_MATCH) {
                return processed;
              }
            }
            if (match.type === "illegal" && lexeme === "") {
              return 1;
            }
            if (iterations > 1e5 && iterations > match.index * 3) {
              const err = new Error("potential infinite loop, way more iterations than matches");
              throw err;
            }
            modeBuffer += lexeme;
            return lexeme.length;
          }
          const language = getLanguage(languageName);
          if (!language) {
            error(LANGUAGE_NOT_FOUND.replace("{}", languageName));
            throw new Error('Unknown language: "' + languageName + '"');
          }
          const md = compileLanguage(language);
          let result = "";
          let top = continuation || md;
          const continuations = {};
          const emitter = new options.__emitter(options);
          processContinuations();
          let modeBuffer = "";
          let relevance = 0;
          let index = 0;
          let iterations = 0;
          let resumeScanAtSamePosition = false;
          try {
            if (!language.__emitTokens) {
              top.matcher.considerAll();
              for (; ; ) {
                iterations++;
                if (resumeScanAtSamePosition) {
                  resumeScanAtSamePosition = false;
                } else {
                  top.matcher.considerAll();
                }
                top.matcher.lastIndex = index;
                const match = top.matcher.exec(codeToHighlight);
                if (!match) break;
                const beforeMatch = codeToHighlight.substring(index, match.index);
                const processedCount = processLexeme(beforeMatch, match);
                index = match.index + processedCount;
              }
              processLexeme(codeToHighlight.substring(index));
            } else {
              language.__emitTokens(codeToHighlight, emitter);
            }
            emitter.finalize();
            result = emitter.toHTML();
            return {
              language: languageName,
              value: result,
              relevance,
              illegal: false,
              _emitter: emitter,
              _top: top
            };
          } catch (err) {
            if (err.message && err.message.includes("Illegal")) {
              return {
                language: languageName,
                value: escape(codeToHighlight),
                illegal: true,
                relevance: 0,
                _illegalBy: {
                  message: err.message,
                  index,
                  context: codeToHighlight.slice(index - 100, index + 100),
                  mode: err.mode,
                  resultSoFar: result
                },
                _emitter: emitter
              };
            } else if (SAFE_MODE) {
              return {
                language: languageName,
                value: escape(codeToHighlight),
                illegal: false,
                relevance: 0,
                errorRaised: err,
                _emitter: emitter,
                _top: top
              };
            } else {
              throw err;
            }
          }
        }
        function justTextHighlightResult(code) {
          const result = {
            value: escape(code),
            illegal: false,
            relevance: 0,
            _top: PLAINTEXT_LANGUAGE,
            _emitter: new options.__emitter(options)
          };
          result._emitter.addText(code);
          return result;
        }
        function highlightAuto(code, languageSubset) {
          languageSubset = languageSubset || options.languages || Object.keys(languages);
          const plaintext = justTextHighlightResult(code);
          const results = languageSubset.filter(getLanguage).filter(autoDetection).map(
            (name) => _highlight(name, code, false)
          );
          results.unshift(plaintext);
          const sorted = results.sort((a, b) => {
            if (a.relevance !== b.relevance) return b.relevance - a.relevance;
            if (a.language && b.language) {
              if (getLanguage(a.language).supersetOf === b.language) {
                return 1;
              } else if (getLanguage(b.language).supersetOf === a.language) {
                return -1;
              }
            }
            return 0;
          });
          const [best, secondBest] = sorted;
          const result = best;
          result.secondBest = secondBest;
          return result;
        }
        function updateClassName(element, currentLang, resultLang) {
          const language = currentLang && aliases[currentLang] || resultLang;
          element.classList.add("hljs");
          element.classList.add(`language-${language}`);
        }
        function highlightElement(element) {
          let node = null;
          const language = blockLanguage(element);
          if (shouldNotHighlight(language)) return;
          fire(
            "before:highlightElement",
            { el: element, language }
          );
          if (element.dataset.highlighted) {
            console.log("Element previously highlighted. To highlight again, first unset `dataset.highlighted`.", element);
            return;
          }
          if (element.children.length > 0) {
            if (!options.ignoreUnescapedHTML) {
              console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk.");
              console.warn("https://github.com/highlightjs/highlight.js/wiki/security");
              console.warn("The element with unescaped HTML:");
              console.warn(element);
            }
            if (options.throwUnescapedHTML) {
              const err = new HTMLInjectionError(
                "One of your code blocks includes unescaped HTML.",
                element.innerHTML
              );
              throw err;
            }
          }
          node = element;
          const text = node.textContent;
          const result = language ? highlight2(text, { language, ignoreIllegals: true }) : highlightAuto(text);
          element.innerHTML = result.value;
          element.dataset.highlighted = "yes";
          updateClassName(element, language, result.language);
          element.result = {
            language: result.language,
            // TODO: remove with version 11.0
            re: result.relevance,
            relevance: result.relevance
          };
          if (result.secondBest) {
            element.secondBest = {
              language: result.secondBest.language,
              relevance: result.secondBest.relevance
            };
          }
          fire("after:highlightElement", { el: element, result, text });
        }
        function configure(userOptions) {
          options = inherit(options, userOptions);
        }
        const initHighlighting = () => {
          highlightAll();
          deprecated("10.6.0", "initHighlighting() deprecated.  Use highlightAll() now.");
        };
        function initHighlightingOnLoad() {
          highlightAll();
          deprecated("10.6.0", "initHighlightingOnLoad() deprecated.  Use highlightAll() now.");
        }
        let wantsHighlight = false;
        function highlightAll() {
          if (document.readyState === "loading") {
            wantsHighlight = true;
            return;
          }
          const blocks = document.querySelectorAll(options.cssSelector);
          blocks.forEach(highlightElement);
        }
        function boot() {
          if (wantsHighlight) highlightAll();
        }
        if (typeof window !== "undefined" && window.addEventListener) {
          window.addEventListener("DOMContentLoaded", boot, false);
        }
        function registerLanguage(languageName, languageDefinition) {
          let lang = null;
          try {
            lang = languageDefinition(hljs);
          } catch (error$1) {
            error("Language definition for '{}' could not be registered.".replace("{}", languageName));
            if (!SAFE_MODE) {
              throw error$1;
            } else {
              error(error$1);
            }
            lang = PLAINTEXT_LANGUAGE;
          }
          if (!lang.name) lang.name = languageName;
          languages[languageName] = lang;
          lang.rawDefinition = languageDefinition.bind(null, hljs);
          if (lang.aliases) {
            registerAliases(lang.aliases, { languageName });
          }
        }
        function unregisterLanguage(languageName) {
          delete languages[languageName];
          for (const alias of Object.keys(aliases)) {
            if (aliases[alias] === languageName) {
              delete aliases[alias];
            }
          }
        }
        function listLanguages() {
          return Object.keys(languages);
        }
        function getLanguage(name) {
          name = (name || "").toLowerCase();
          return languages[name] || languages[aliases[name]];
        }
        function registerAliases(aliasList, { languageName }) {
          if (typeof aliasList === "string") {
            aliasList = [aliasList];
          }
          aliasList.forEach((alias) => {
            aliases[alias.toLowerCase()] = languageName;
          });
        }
        function autoDetection(name) {
          const lang = getLanguage(name);
          return lang && !lang.disableAutodetect;
        }
        function upgradePluginAPI(plugin) {
          if (plugin["before:highlightBlock"] && !plugin["before:highlightElement"]) {
            plugin["before:highlightElement"] = (data) => {
              plugin["before:highlightBlock"](
                Object.assign({ block: data.el }, data)
              );
            };
          }
          if (plugin["after:highlightBlock"] && !plugin["after:highlightElement"]) {
            plugin["after:highlightElement"] = (data) => {
              plugin["after:highlightBlock"](
                Object.assign({ block: data.el }, data)
              );
            };
          }
        }
        function addPlugin(plugin) {
          upgradePluginAPI(plugin);
          plugins.push(plugin);
        }
        function removePlugin(plugin) {
          const index = plugins.indexOf(plugin);
          if (index !== -1) {
            plugins.splice(index, 1);
          }
        }
        function fire(event, args) {
          const cb = event;
          plugins.forEach(function(plugin) {
            if (plugin[cb]) {
              plugin[cb](args);
            }
          });
        }
        function deprecateHighlightBlock(el) {
          deprecated("10.7.0", "highlightBlock will be removed entirely in v12.0");
          deprecated("10.7.0", "Please use highlightElement now.");
          return highlightElement(el);
        }
        Object.assign(hljs, {
          highlight: highlight2,
          highlightAuto,
          highlightAll,
          highlightElement,
          // TODO: Remove with v12 API
          highlightBlock: deprecateHighlightBlock,
          configure,
          initHighlighting,
          initHighlightingOnLoad,
          registerLanguage,
          unregisterLanguage,
          listLanguages,
          getLanguage,
          registerAliases,
          autoDetection,
          inherit,
          addPlugin,
          removePlugin
        });
        hljs.debugMode = function() {
          SAFE_MODE = false;
        };
        hljs.safeMode = function() {
          SAFE_MODE = true;
        };
        hljs.versionString = version;
        hljs.regex = {
          concat: concat2,
          lookahead: lookahead2,
          either: either2,
          optional,
          anyNumberOfTimes
        };
        for (const key in MODES) {
          if (typeof MODES[key] === "object") {
            deepFreeze(MODES[key]);
          }
        }
        Object.assign(hljs, MODES);
        return hljs;
      };
      var highlight = HLJS({});
      highlight.newInstance = () => HLJS({});
      module.exports = highlight;
      highlight.HighlightJS = highlight;
      highlight.default = highlight;
    }
  });

  // app/static/gitreader/modules/utils/url.ts
  function buildRepoParams(search) {
    const params = new URLSearchParams(search);
    const allowed = new URLSearchParams();
    const repoValue = params.get("repo");
    const localValue = params.get("local");
    if (repoValue) {
      allowed.set("repo", repoValue);
    } else if (localValue) {
      allowed.set("local", localValue);
    }
    const refValue = params.get("ref");
    if (refValue) {
      allowed.set("ref", refValue);
    }
    const subdirValue = params.get("subdir");
    if (subdirValue) {
      allowed.set("subdir", subdirValue);
    }
    return allowed;
  }
  function buildApiUrl(baseParams, path, extra) {
    const params = new URLSearchParams(baseParams.toString());
    if (extra) {
      Object.keys(extra).forEach((key) => {
        const value = extra[key];
        if (value !== void 0 && value !== null && value !== "") {
          params.set(key, value);
        }
      });
    }
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  }

  // app/static/gitreader/modules/data/api.ts
  function createApiClient(repoParams) {
    const buildUrl = (path, extra) => buildApiUrl(repoParams, path, extra);
    const fetchJson = async (path, extra, init) => {
      const url = buildUrl(path, extra);
      const headers = new Headers(init == null ? void 0 : init.headers);
      headers.set("Accept", "application/json");
      const response = await fetch(url, {
        ...init,
        headers
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    };
    return { buildUrl, fetchJson };
  }

  // app/static/gitreader/modules/utils/strings.ts
  function normalizePath(path) {
    return path.replace(/\\/g, "/");
  }
  function escapeHtml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // app/static/gitreader/modules/utils/paths.ts
  function getBasename(value) {
    const normalized = normalizePath(value);
    const parts = normalized.split("/");
    return parts.length > 0 ? parts[parts.length - 1] : value;
  }
  function getParentPath(path) {
    if (!path) {
      return null;
    }
    const normalized = normalizePath(path);
    const parts = normalized.split("/").filter(Boolean);
    if (parts.length <= 1) {
      return null;
    }
    return parts.slice(0, -1).join("/");
  }
  function getBreadcrumbLabel(path) {
    const normalized = normalizePath(path);
    const parts = normalized.split("/").filter(Boolean);
    if (parts.length <= 2) {
      return normalized;
    }
    return `.../${parts.slice(-2).join("/")}`;
  }

  // app/static/gitreader/modules/ui/fileTree.ts
  function buildFileTreeFromNodes(nodes) {
    const root = {
      name: "",
      path: "",
      isFile: false,
      children: /* @__PURE__ */ new Map()
    };
    nodes.forEach((node) => {
      var _a;
      if (node.kind !== "file" || !((_a = node.location) == null ? void 0 : _a.path)) {
        return;
      }
      const normalized = normalizePath(node.location.path);
      const parts = normalized.split("/").filter(Boolean);
      let cursor = root;
      let currentPath = "";
      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isFile = index === parts.length - 1;
        let next = cursor.children.get(part);
        if (!next) {
          next = {
            name: part,
            path: currentPath,
            isFile,
            children: /* @__PURE__ */ new Map()
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
  }
  function countFilesInTree(node) {
    if (node.isFile) {
      return 1;
    }
    let count = 0;
    node.children.forEach((child) => {
      count += countFilesInTree(child);
    });
    return count;
  }
  function renderFileTreeMarkup(root, focusPath, collapsed) {
    const normalizedFocus = focusPath ? normalizePath(focusPath) : "";
    if (!root || root.children.size === 0) {
      return { html: '<p class="file-tree-empty">No files loaded yet.</p>', rows: [] };
    }
    const focusParentPath = getParentPath(normalizedFocus);
    const collapsedFocusParents = getCollapsedFocusParents(normalizedFocus, collapsed);
    const rows = [];
    const html = renderFileTreeNode(
      root,
      normalizedFocus,
      focusParentPath,
      collapsedFocusParents,
      collapsed,
      rows,
      0
    );
    return {
      html: html || '<p class="file-tree-empty">No files loaded yet.</p>',
      rows
    };
  }
  function getCollapsedFocusParents(path, collapsed) {
    const collapsedParents = /* @__PURE__ */ new Set();
    if (!path) {
      return collapsedParents;
    }
    const parts = normalizePath(path).split("/").filter(Boolean);
    let current = "";
    for (const part of parts.slice(0, -1)) {
      current = current ? `${current}/${part}` : part;
      if (collapsed.has(current)) {
        collapsedParents.add(current);
      }
    }
    return collapsedParents;
  }
  function renderFileTreeNode(node, focusPath, focusParentPath, collapsedFocusParents, collapsed, rows, depth) {
    const entries = Array.from(node.children.values());
    if (entries.length === 0) {
      return "";
    }
    entries.sort((a, b) => {
      if (a.isFile !== b.isFile) {
        return a.isFile ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });
    const items = entries.map((child) => {
      const isFocus = Boolean(focusPath && child.path === focusPath);
      const isFocusFile = child.isFile && isFocus;
      const isFocusDir = !child.isFile && isFocus;
      const isFocusParent = !child.isFile && focusParentPath && child.path === focusParentPath;
      if (child.isFile) {
        rows.push({
          path: child.path,
          name: child.name,
          depth,
          isFile: true,
          isCollapsed: false,
          isFocus: isFocusFile,
          isFocusParent: false,
          isCollapsedFocusParent: false
        });
        return `
                <li class="file-tree-item${isFocusFile ? " is-focus" : ""}" data-tree-file="${escapeHtml(child.path)}">
                    <span class="file-tree-name">${escapeHtml(child.name)}</span>
                </li>
            `;
      }
      const isCollapsed = collapsed.has(child.path);
      const isCollapsedFocusParent = isCollapsed && collapsedFocusParents.has(child.path);
      rows.push({
        path: child.path,
        name: child.name,
        depth,
        isFile: false,
        isCollapsed,
        isFocus: isFocusDir,
        isFocusParent: Boolean(isFocusParent),
        isCollapsedFocusParent
      });
      const childrenHtml = renderFileTreeNode(
        child,
        focusPath,
        focusParentPath,
        collapsedFocusParents,
        collapsed,
        rows,
        depth + 1
      );
      return `
            <li class="file-tree-item is-dir${isCollapsed ? " is-collapsed" : ""}${isFocusDir || isCollapsedFocusParent ? " is-focus" : ""}">
                <button class="file-tree-toggle" type="button" data-tree-toggle="${escapeHtml(child.path)}">
                    <span class="file-tree-caret"></span>
                    <span class="file-tree-name">${escapeHtml(child.name)}/</span>
                </button>
                <div class="file-tree-children">${childrenHtml}</div>
            </li>
        `;
    });
    return `<ul class="file-tree-list">${items.join("")}</ul>`;
  }

  // app/static/gitreader/modules/ui/fileTreeController.ts
  var FileTreeController = class {
    // Captures the view + container so GitReaderApp can call refresh/render as needed.
    constructor(deps) {
      this.deps = deps;
    }
    // Re-renders the narrator file tree using the existing focus path.
    refresh() {
      const { html } = this.deps.fileTreeView.renderNarratorTree();
      this.deps.narratorContainer.innerHTML = html;
    }
    // Renders the narrator file tree for an explicit focus path, used after selections.
    render(focusPath) {
      const { html } = this.deps.fileTreeView.renderNarratorTree(focusPath);
      this.deps.narratorContainer.innerHTML = html;
    }
  };

  // app/static/gitreader/modules/ui/fileTreeEvents.ts
  var boundContainers = /* @__PURE__ */ new WeakSet();
  function bindFileTreeEvents(container, handlers) {
    if (!container || boundContainers.has(container)) {
      return;
    }
    boundContainers.add(container);
    container.addEventListener("click", (event) => {
      const toggleTarget = event.target.closest("[data-tree-toggle]");
      if (toggleTarget) {
        const path = toggleTarget.dataset.treeToggle;
        if (path) {
          handlers.onToggle(path);
        }
        return;
      }
      const fileTarget = event.target.closest("[data-tree-file]");
      if (!fileTarget) {
        return;
      }
      const filePath = fileTarget.dataset.treeFile;
      if (!filePath) {
        return;
      }
      handlers.onSelectFile(filePath);
    });
  }

  // app/static/gitreader/modules/ui/graphEvents.ts
  function bindGraphEvents(bindings) {
    const { graph, isBound, state, handlers } = bindings;
    if (isBound || !graph) {
      return false;
    }
    graph.on("tap", () => {
      handlers.hideGraphContextMenu();
    });
    graph.on("tap", "node", (event) => {
      var _a;
      handlers.hideGraphContextMenu();
      const nodeId = event.target.id();
      const node = handlers.resolveNode(nodeId);
      if (!node) {
        return;
      }
      if (handlers.isTourActive()) {
        if (!handlers.isGuidedNodeAllowed(nodeId)) {
          handlers.flashGuidedMessage("Follow the guide to unlock this step.");
          return;
        }
        void handlers.advanceTour("jump", nodeId);
        return;
      }
      const modifierEvent = (_a = event.originalEvent) != null ? _a : event;
      if (handlers.isSiblingSelectClick(modifierEvent)) {
        if (handlers.handleSiblingSelection(node)) {
          state.setLastTapNodeId(null);
          state.setLastTapAt(0);
          return;
        }
      }
      if (handlers.isShiftClick(modifierEvent)) {
        if (handlers.handleShiftFolderSelection(node)) {
          state.setLastTapNodeId(null);
          state.setLastTapAt(0);
          return;
        }
        if (handlers.handleShiftClassSelection(node)) {
          state.setLastTapNodeId(null);
          state.setLastTapAt(0);
          return;
        }
        if (handlers.handleFileClassSelection(event.target)) {
          state.setLastTapNodeId(null);
          state.setLastTapAt(0);
          return;
        }
      }
      if (handlers.isModifierClick(modifierEvent)) {
        state.setLastTapNodeId(null);
        state.setLastTapAt(0);
        return;
      }
      const now = Date.now();
      const isDoubleTap = state.getLastTapNodeId() === nodeId && now - state.getLastTapAt() < state.doubleTapDelay;
      state.setLastTapNodeId(nodeId);
      state.setLastTapAt(now);
      if (handlers.getGraphLayoutMode() === "cluster" && isDoubleTap && handlers.handleClusterNodeToggle(node, event.originalEvent)) {
        return;
      }
      if (handlers.getGraphLayoutMode() === "cluster" && handlers.handleClusterFolderSingleClick(node)) {
        graph.$("node:selected").not(event.target).unselect();
        return;
      }
      if (isDoubleTap && handlers.handleFileFocusClick(node, event.originalEvent)) {
        return;
      }
      graph.$("node:selected").not(event.target).unselect();
      handlers.loadSymbolSnippet(node).catch(() => {
        handlers.renderCode(node);
        handlers.updateNarrator(node);
      });
    });
    graph.on("select", "node", () => {
      handlers.refreshEdgeHighlights();
      handlers.updateLabelVisibility();
    });
    graph.on("cxttap", "node", (event) => {
      if (event.originalEvent && typeof event.originalEvent.preventDefault === "function") {
        event.originalEvent.preventDefault();
      }
      const nodeId = event.target.id();
      const node = handlers.resolveNode(nodeId);
      if (!node) {
        return;
      }
      handlers.openGraphContextMenu(node, event);
    });
    graph.on("unselect", "node", () => {
      handlers.refreshEdgeHighlights();
      handlers.updateLabelVisibility();
    });
    graph.on("mouseover", "node", (event) => {
      const nodeId = event.target.id();
      event.target.addClass("is-hovered");
      handlers.setHoveredNode(nodeId);
      handlers.showGraphTooltip(event.target, event);
      handlers.updateLabelVisibility();
    });
    graph.on("mouseout", "node", (event) => {
      event.target.removeClass("is-hovered");
      handlers.setHoveredNode(null);
      handlers.hideGraphTooltip();
      handlers.updateLabelVisibility();
    });
    graph.on("mousemove", "node", (event) => {
      handlers.updateTooltipPosition(event);
    });
    graph.on("zoom", () => {
      handlers.updateLabelVisibility();
      handlers.updateOrganizedCircleOverlay();
    });
    graph.on("pan", () => {
      handlers.updateOrganizedCircleOverlay();
    });
    return true;
  }

  // app/static/gitreader/modules/utils/labels.ts
  function formatNodeLabel(node, lineLength) {
    var _a, _b;
    const path = (_b = (_a = node.location) == null ? void 0 : _a.path) != null ? _b : "";
    const fullLabel = node.name || path;
    const displayName = getDisplayName(node, fullLabel, path);
    const badge = getKindBadge(node.kind);
    const kindLabel = getKindLabel(node.kind);
    const label = wrapLabel(`[${badge}]`, displayName, lineLength);
    return { label, fullLabel, path, kindLabel };
  }
  function getDisplayName(node, fullLabel, path) {
    if (node.kind === "file") {
      return getBasename(path || fullLabel);
    }
    if (node.kind === "folder") {
      return node.name || getBasename(path || fullLabel);
    }
    return fullLabel || node.name || "";
  }
  function wrapLabel(prefix, name, lineLength) {
    const normalized = name.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return prefix;
    }
    const maxLength = Math.max(8, lineLength);
    const prefixText = prefix ? `${prefix} ` : "";
    const firstLineLimit = Math.max(4, maxLength - prefixText.length);
    const firstPart = normalized.slice(0, firstLineLimit);
    let remaining = normalized.slice(firstPart.length).trimStart();
    let label = `${prefixText}${firstPart}`;
    if (remaining) {
      let secondPart = remaining.slice(0, maxLength);
      if (remaining.length > maxLength) {
        const trimmed = secondPart.slice(0, Math.max(0, maxLength - 3));
        secondPart = `${trimmed}...`;
      }
      label += `
${secondPart}`;
    }
    return label;
  }
  function getKindBadge(kind) {
    switch (kind) {
      case "file":
        return "F";
      case "folder":
        return "dir";
      case "class":
        return "C";
      case "function":
        return "fn";
      case "method":
        return "m";
      case "blueprint":
        return "bp";
      case "external":
        return "ext";
      default:
        return "id";
    }
  }
  function getKindLabel(kind) {
    switch (kind) {
      case "file":
        return "File";
      case "folder":
        return "Folder";
      case "class":
        return "Class";
      case "function":
        return "Function";
      case "method":
        return "Method";
      case "blueprint":
        return "Blueprint";
      case "external":
        return "External";
      default:
        return "Symbol";
    }
  }

  // app/static/gitreader/modules/ui/graphLabels.ts
  function formatGraphNodeLabel(node, lineLength) {
    return formatNodeLabel(node, lineLength);
  }
  function buildGraphTooltipHtml(data) {
    const details = data.path ? `${data.kindLabel} - ${data.path}` : data.kindLabel;
    return `
        <div class="tooltip-title">${escapeHtml(String(data.fullLabel))}</div>
        <div class="tooltip-meta">${escapeHtml(String(details))}</div>
    `;
  }

  // app/static/gitreader/modules/ui/graphContextMenu.ts
  var GraphContextMenu = class {
    // Creates the menu DOM and wires global dismiss handlers.
    constructor(deps) {
      this.deps = deps;
      __publicField(this, "menuElement");
      __publicField(this, "titleElement");
      __publicField(this, "listElement");
      __publicField(this, "visible", false);
      // Closes the menu when clicking outside its bounds.
      __publicField(this, "handleGlobalPointerDown", (event) => {
        if (!this.visible) {
          return;
        }
        if (event.target instanceof Node && this.menuElement.contains(event.target)) {
          return;
        }
        this.hide();
      });
      // Closes the menu when the user presses Escape.
      __publicField(this, "handleGlobalKeydown", (event) => {
        if (!this.visible) {
          return;
        }
        if (event.key === "Escape") {
          this.hide();
        }
      });
      this.menuElement = document.createElement("div");
      this.menuElement.className = "graph-context-menu";
      this.menuElement.setAttribute("role", "menu");
      this.menuElement.setAttribute("aria-hidden", "true");
      this.titleElement = document.createElement("div");
      this.titleElement.className = "graph-context-menu__title";
      this.menuElement.appendChild(this.titleElement);
      this.listElement = document.createElement("ul");
      this.listElement.className = "graph-context-menu__list";
      this.menuElement.appendChild(this.listElement);
      this.menuElement.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      this.deps.container.appendChild(this.menuElement);
      document.addEventListener("pointerdown", this.handleGlobalPointerDown);
      document.addEventListener("keydown", this.handleGlobalKeydown);
    }
    // Returns whether the menu is currently visible.
    isOpen() {
      return this.visible;
    }
    // Renders the menu actions and positions the menu at the given coordinates.
    show(options) {
      var _a;
      const actions = options.actions.filter((action) => action && action.label);
      if (actions.length === 0) {
        this.hide();
        return;
      }
      this.titleElement.textContent = (_a = options.title) != null ? _a : "";
      this.titleElement.classList.toggle("is-hidden", !options.title);
      this.listElement.innerHTML = "";
      actions.forEach((action) => {
        const item = document.createElement("li");
        item.className = "graph-context-menu__item";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "graph-context-menu__button";
        button.textContent = action.label;
        button.disabled = Boolean(action.disabled);
        if (action.disabled) {
          button.classList.add("is-disabled");
        }
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (action.disabled) {
            return;
          }
          this.hide();
          action.onSelect();
        });
        item.appendChild(button);
        this.listElement.appendChild(item);
      });
      this.menuElement.classList.add("is-visible");
      this.menuElement.setAttribute("aria-hidden", "false");
      this.visible = true;
      this.positionMenu(options.x, options.y);
    }
    // Hides the menu and resets its visibility state.
    hide() {
      if (!this.visible) {
        return;
      }
      this.menuElement.classList.remove("is-visible");
      this.menuElement.setAttribute("aria-hidden", "true");
      this.visible = false;
    }
    // Positions the menu while keeping it within the viewport.
    positionMenu(x, y) {
      const padding = 12;
      this.menuElement.style.left = `${x}px`;
      this.menuElement.style.top = `${y}px`;
      const rect = this.menuElement.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - padding;
      const maxY = window.innerHeight - rect.height - padding;
      const clampedX = Math.max(padding, Math.min(x, maxX));
      const clampedY = Math.max(padding, Math.min(y, maxY));
      this.menuElement.style.left = `${clampedX}px`;
      this.menuElement.style.top = `${clampedY}px`;
    }
  };

  // app/static/gitreader/modules/ui/graphView.ts
  var GraphViewController = class {
    // Holds dependency references so GraphViewController can orchestrate graph rendering later.
    constructor(deps) {
      this.deps = deps;
      __publicField(this, "graph", null);
      __publicField(this, "layoutMode", "cluster");
      __publicField(this, "edgeFilters", /* @__PURE__ */ new Set(["calls", "imports", "inherits", "contains", "blueprint"]));
      __publicField(this, "showExternalNodes", true);
      __publicField(this, "focusedNodeId", null);
      __publicField(this, "hoveredNodeId", null);
      __publicField(this, "lastVisibilitySignature", null);
      __publicField(this, "nodeCapByScope", /* @__PURE__ */ new Map());
      __publicField(this, "nodeCap", 300);
      __publicField(this, "nodeCapStep", 200);
      __publicField(this, "clusterManualLayout", false);
    }
    // Renders the provided nodes/edges and rebuilds Cytoscape when needed.
    render(input) {
      const previousLayout = this.layoutMode;
      this.layoutMode = input.layoutMode;
      if (input.nodes.length === 0) {
        this.deps.clearGraph();
        this.deps.setCanvasOverlay("No nodes yet. Graph data has not loaded.", true);
        return;
      }
      if (!this.graph && typeof cytoscape !== "function") {
        this.deps.setCanvasOverlay("Graph library not loaded.", true);
        return;
      }
      this.deps.setDisplayNodes(input.nodes);
      this.deps.setCanvasOverlay("", false);
      const hadGraph = Boolean(this.graph);
      this.ensureGraph();
      if (!this.graph) {
        return;
      }
      const selectedNodeIds = this.graph.$("node:selected").map((node) => node.id());
      const positionCache = this.shouldUseManualClusterLayout() ? this.captureNodePositions() : null;
      const elements = this.buildGraphElements(input.nodes, input.edges, positionCache);
      const { added, removed } = this.syncGraphElements(elements);
      const layoutChanged = previousLayout !== this.layoutMode;
      const needsLayout = !this.shouldUseManualClusterLayout() && (!hadGraph || layoutChanged || added > 0 || removed > 0);
      if (needsLayout) {
        this.runLayout();
      } else {
        this.deps.updateLabelVisibility();
      }
      selectedNodeIds.forEach((nodeId) => {
        var _a;
        const selected = (_a = this.graph) == null ? void 0 : _a.$id(nodeId);
        if (selected && !selected.empty()) {
          selected.select();
        }
      });
      this.applyFilters({ forceVisibility: true });
    }
    // Updates the layout mode and reruns layout when graph data is already present.
    setLayout(mode) {
      this.layoutMode = mode;
      if (mode !== "cluster") {
        this.clusterManualLayout = false;
      }
      this.runLayout();
    }
    // Enables or disables manual cluster layout so child organization remains stable across refreshes.
    setClusterManualLayout(enabled) {
      this.clusterManualLayout = enabled;
    }
    // Updates edge/node filters wholesale when app state restores or resets.
    setFilters(filters) {
      this.edgeFilters = new Set(filters.edgeFilters);
      this.showExternalNodes = filters.showExternalNodes;
      this.applyFilters({ forceVisibility: true });
    }
    // Syncs focused node state from the orchestrator, then reapplies filters.
    setSelection(state) {
      this.focusedNodeId = state.focusedNodeId;
      this.applyFilters({ forceVisibility: true });
    }
    // Returns the current edge/node filter state so UI controls can reflect it.
    getFilterState() {
      return {
        edgeFilters: this.edgeFilters,
        showExternalNodes: this.showExternalNodes
      };
    }
    // Exposes the focused node id so app-level capping can keep it visible.
    getFocusedNodeId() {
      return this.focusedNodeId;
    }
    // Updates the focused node id without applying filters immediately.
    setFocusedNodeId(nodeId) {
      this.focusedNodeId = nodeId;
    }
    // Returns a stable cap for a scope so repeated renders keep consistent node limits.
    getNodeCapForScope(scope, totalNodes) {
      let cap = this.nodeCapByScope.get(scope);
      if (cap === void 0) {
        cap = Math.min(this.nodeCap, totalNodes);
        this.nodeCapByScope.set(scope, cap);
      } else if (cap > totalNodes) {
        cap = totalNodes;
        this.nodeCapByScope.set(scope, cap);
      }
      return cap;
    }
    // Increases the cap for a scope and returns whether a refresh is needed.
    revealMoreNodes(scope, totalNodes) {
      const cap = this.getNodeCapForScope(scope, totalNodes);
      if (cap >= totalNodes) {
        return false;
      }
      const nextCap = Math.min(totalNodes, cap + this.nodeCapStep);
      this.nodeCapByScope.set(scope, nextCap);
      return true;
    }
    // Updates the node status label and reveal button to match current cap state.
    updateNodeStatus(graphView) {
      if (graphView.totalNodes === 0) {
        this.deps.nodeStatusElement.textContent = "";
        this.deps.revealButton.disabled = true;
        return;
      }
      if (this.deps.isTourActive()) {
        this.deps.nodeStatusElement.textContent = `Guided view: ${graphView.visibleNodes}/${graphView.totalNodes}`;
        this.deps.revealButton.disabled = true;
        this.deps.revealButton.textContent = "Guided";
        return;
      }
      if (this.layoutMode === "cluster") {
        this.deps.nodeStatusElement.textContent = `Cluster view: ${graphView.visibleNodes} groups from ${graphView.totalNodes}`;
        this.deps.revealButton.disabled = true;
        this.deps.revealButton.textContent = "Show more";
        return;
      }
      if (!graphView.isCapped) {
        this.deps.nodeStatusElement.textContent = `Showing ${graphView.visibleNodes} nodes`;
        this.deps.revealButton.disabled = true;
        this.deps.revealButton.textContent = "Show more";
        return;
      }
      this.deps.nodeStatusElement.textContent = `Showing ${graphView.visibleNodes} of ${graphView.totalNodes}`;
      const nextCap = Math.min(graphView.totalNodes, graphView.visibleNodes + this.nodeCapStep);
      this.deps.revealButton.textContent = nextCap >= graphView.totalNodes ? "Show all" : "Show more";
      this.deps.revealButton.disabled = false;
    }
    // Toggles an edge filter and reapplies visibility rules on the canvas.
    toggleEdgeFilter(filter) {
      if (this.edgeFilters.has(filter)) {
        this.edgeFilters.delete(filter);
      } else {
        this.edgeFilters.add(filter);
      }
      this.applyFilters({ forceVisibility: true });
    }
    // Toggles external-node visibility and returns the new state.
    toggleExternalNodes() {
      this.showExternalNodes = !this.showExternalNodes;
      return this.showExternalNodes;
    }
    // Builds a signature of the current visibility-affecting state to detect changes.
    buildVisibilitySignature() {
      var _a;
      const filters = Array.from(this.edgeFilters).sort().join("|");
      const focus = (_a = this.focusedNodeId) != null ? _a : "";
      const external = this.showExternalNodes ? "1" : "0";
      const guided = this.deps.isTourActive() ? "1" : "0";
      return `${filters}|${external}|${focus}|${guided}`;
    }
    // Applies edge/node filters, guided filters, and focus trimming in one pass.
    applyFilters(options) {
      var _a;
      if (!this.graph) {
        return;
      }
      const cy = this.graph;
      const forceVisibility = (_a = options == null ? void 0 : options.forceVisibility) != null ? _a : false;
      const signature = this.buildVisibilitySignature();
      const shouldApplyVisibility = forceVisibility || this.lastVisibilitySignature !== signature;
      if (shouldApplyVisibility) {
        cy.elements().show();
        if (!this.showExternalNodes) {
          cy.nodes().filter('[kind = "external"]').hide();
        }
        cy.edges().forEach((edge) => {
          if (!this.edgeFilters.has(edge.data("kind"))) {
            edge.hide();
          }
        });
        cy.edges().forEach((edge) => {
          if (edge.source().hidden() || edge.target().hidden()) {
            edge.hide();
          }
        });
        this.deps.applyGuidedFilter();
        this.applyFocus();
        this.lastVisibilitySignature = signature;
      }
      this.refreshEdgeHighlights();
      this.deps.updateLabelVisibility();
    }
    // Updates the hovered node state so edge highlights track cursor focus.
    setHoveredNode(nodeId) {
      this.hoveredNodeId = nodeId;
      this.refreshEdgeHighlights();
    }
    // Refreshes edge emphasis based on selected and hovered nodes.
    refreshEdgeHighlights() {
      if (!this.graph) {
        return;
      }
      const cy = this.graph;
      cy.edges().removeClass("is-active");
      const selectedNodes = cy.$("node:selected");
      selectedNodes.forEach((node) => {
        node.connectedEdges().addClass("is-active");
      });
      if (this.hoveredNodeId) {
        const hovered = cy.getElementById(this.hoveredNodeId);
        if (hovered && !hovered.empty()) {
          hovered.connectedEdges().addClass("is-active");
        }
      }
    }
    // Shows the hover tooltip with label metadata for the active node.
    showTooltip(node, event) {
      const fullLabel = node.data("fullLabel") || node.data("label");
      const kindLabel = node.data("kindLabel") || node.data("kind") || "Symbol";
      const path = node.data("path");
      this.deps.tooltipElement.innerHTML = buildGraphTooltipHtml({
        fullLabel: String(fullLabel),
        kindLabel: String(kindLabel),
        path: path ? String(path) : void 0
      });
      this.deps.tooltipElement.setAttribute("aria-hidden", "false");
      this.deps.tooltipElement.classList.add("is-visible");
      this.updateTooltipPosition(event);
    }
    // Hides the hover tooltip when the pointer leaves the node.
    hideTooltip() {
      this.deps.tooltipElement.classList.remove("is-visible");
      this.deps.tooltipElement.setAttribute("aria-hidden", "true");
    }
    // Repositions the tooltip to follow the cursor within the canvas bounds.
    updateTooltipPosition(event) {
      const rendered = event.renderedPosition || event.position;
      if (!rendered) {
        return;
      }
      const offset = 12;
      const surfaceRect = this.deps.tooltipContainer.getBoundingClientRect();
      const x = Math.min(surfaceRect.width - 20, Math.max(0, rendered.x + offset));
      const y = Math.min(surfaceRect.height - 20, Math.max(0, rendered.y + offset));
      this.deps.tooltipElement.style.transform = `translate(${x}px, ${y}px)`;
    }
    // Focuses the graph around the currently selected node, if any.
    focusOnSelected() {
      if (!this.graph) {
        return;
      }
      const selected = this.graph.$("node:selected");
      if (!selected || selected.length === 0) {
        this.flashCanvasMessage("Select a node to focus.");
        return;
      }
      this.focusedNodeId = selected[0].id();
      this.applyFilters({ forceVisibility: true });
    }
    // Clears the focused node and restores the default visibility rules.
    resetFocus() {
      this.focusedNodeId = null;
      this.applyFilters({ forceVisibility: true });
    }
    // Creates the Cytoscape instance once and informs the app for event binding.
    ensureGraph() {
      if (this.graph) {
        return;
      }
      if (typeof cytoscape !== "function") {
        return;
      }
      this.graph = cytoscape({
        container: this.deps.container,
        elements: [],
        style: this.getGraphStyles(),
        layout: { name: "cose", animate: false, fit: true, padding: 24 },
        minZoom: 0.2,
        maxZoom: 2.5,
        wheelSensitivity: 0.2,
        selectionType: "additive"
      });
      if (typeof this.graph.selectionType === "function") {
        this.graph.selectionType("additive");
      }
      this.deps.onGraphReady(this.graph);
    }
    // Applies focus trimming to the current graph to isolate a focused node.
    applyFocus() {
      if (!this.graph || !this.focusedNodeId || this.deps.isTourActive()) {
        return;
      }
      const node = this.graph.getElementById(this.focusedNodeId);
      if (!node || node.empty() || node.hidden()) {
        this.focusedNodeId = null;
        return;
      }
      const visible = this.graph.elements(":visible");
      const focusElements = node.closedNeighborhood().intersection(visible);
      visible.not(focusElements).hide();
      this.graph.fit(focusElements, 40);
    }
    // Flashes a short overlay message to guide focus interactions.
    flashCanvasMessage(message) {
      this.deps.setCanvasOverlay(message, true);
      window.setTimeout(() => this.deps.setCanvasOverlay("", false), 1200);
    }
    // Re-runs the current layout mode on the active graph instance.
    runLayout() {
      if (!this.graph) {
        return;
      }
      if (this.shouldUseManualClusterLayout()) {
        this.deps.updateLabelVisibility();
        return;
      }
      const layout = this.graph.layout(this.getLayoutOptions());
      layout.run();
      this.deps.updateLabelVisibility();
    }
    // Zooms the canvas around its center so focus stays predictable.
    zoom(factor) {
      if (!this.graph) {
        return;
      }
      const current = this.graph.zoom();
      const next = Math.min(2.5, Math.max(0.2, current * factor));
      const rect = this.deps.container.getBoundingClientRect();
      this.graph.zoom({
        level: next,
        renderedPosition: {
          x: rect.width / 2,
          y: rect.height / 2
        }
      });
      this.deps.updateLabelVisibility();
    }
    // Fits all visible graph elements within the viewport.
    fit() {
      if (!this.graph) {
        return;
      }
      this.graph.fit(void 0, 40);
      this.deps.updateLabelVisibility();
    }
    // Chooses layout options based on the current layout mode.
    getLayoutOptions() {
      if (this.layoutMode === "layer") {
        return {
          name: "breadthfirst",
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
      if (this.layoutMode === "free") {
        return {
          name: "preset",
          animate: false,
          fit: true,
          padding: 24
        };
      }
      return {
        name: "cose",
        animate: false,
        fit: true,
        padding: 24
      };
    }
    // Builds Cytoscape element data for nodes and edges using shared label formatting.
    buildGraphElements(nodes, edges, positionCache) {
      const useManualLayout = this.shouldUseManualClusterLayout() && positionCache;
      const parentByChild = /* @__PURE__ */ new Map();
      const childrenByParent = /* @__PURE__ */ new Map();
      if (useManualLayout) {
        edges.forEach((edge) => {
          var _a;
          if (edge.kind !== "contains") {
            return;
          }
          parentByChild.set(edge.target, edge.source);
          const siblings = (_a = childrenByParent.get(edge.source)) != null ? _a : [];
          siblings.push(edge.target);
          childrenByParent.set(edge.source, siblings);
        });
      }
      const nodeElements = nodes.map((node) => {
        const labelData = this.deps.formatLabel(node);
        const element = {
          data: {
            id: node.id,
            label: labelData.label,
            fullLabel: labelData.fullLabel,
            kindLabel: labelData.kindLabel,
            kind: node.kind,
            summary: node.summary || "",
            path: labelData.path,
            labelVisible: "true"
          }
        };
        if (useManualLayout) {
          const cached = positionCache.get(node.id);
          const fallback = cached ? null : this.getManualFallbackPosition(node.id, parentByChild, childrenByParent, positionCache);
          const position = cached != null ? cached : fallback;
          if (position) {
            element.position = position;
          }
        }
        return element;
      });
      const edgeElements = edges.map((edge, index) => ({
        data: {
          id: `edge:${edge.source}:${edge.target}:${edge.kind}:${index}`,
          source: edge.source,
          target: edge.target,
          kind: edge.kind,
          confidence: edge.confidence
        }
      }));
      return [...nodeElements, ...edgeElements];
    }
    // Applies a diff between the current graph and the next element set.
    syncGraphElements(elements) {
      if (!this.graph) {
        return { added: 0, removed: 0 };
      }
      const elementsById = /* @__PURE__ */ new Map();
      elements.forEach((element) => {
        elementsById.set(String(element.data.id), element);
      });
      const currentElements = this.graph.elements();
      const currentIds = /* @__PURE__ */ new Set();
      currentElements.forEach((element) => {
        currentIds.add(element.id());
      });
      let removed = 0;
      currentElements.forEach((element) => {
        const next = elementsById.get(element.id());
        if (!next) {
          element.remove();
          removed += 1;
          return;
        }
        element.data(next.data);
      });
      const toAdd = [];
      elements.forEach((element) => {
        const id = String(element.data.id);
        if (!currentIds.has(id)) {
          toAdd.push(element);
        }
      });
      if (toAdd.length > 0) {
        this.graph.add(toAdd);
      }
      return { added: toAdd.length, removed };
    }
    // Captures the current node positions so manual cluster layout can preserve them across refreshes.
    captureNodePositions() {
      const positions = /* @__PURE__ */ new Map();
      if (!this.graph) {
        return positions;
      }
      this.graph.nodes().forEach((node) => {
        const position = node.position();
        positions.set(node.id(), { x: position.x, y: position.y });
      });
      return positions;
    }
    // Computes a fallback position near the parent when a new node appears in manual layout.
    getManualFallbackPosition(nodeId, parentByChild, childrenByParent, positionCache) {
      var _a;
      const parentId = parentByChild.get(nodeId);
      if (!parentId) {
        return null;
      }
      const parentPosition = positionCache.get(parentId);
      if (!parentPosition) {
        return null;
      }
      const siblings = (_a = childrenByParent.get(parentId)) != null ? _a : [];
      const index = Math.max(0, siblings.indexOf(nodeId));
      const radius = this.getManualChildSpacing();
      const angle = 2 * Math.PI * index / Math.max(1, siblings.length);
      return {
        x: parentPosition.x + radius * Math.cos(angle),
        y: parentPosition.y + radius * Math.sin(angle)
      };
    }
    // Returns true when cluster layout should stay manual to preserve user-arranged positions.
    shouldUseManualClusterLayout() {
      return this.layoutMode === "cluster" && this.clusterManualLayout;
    }
    // Provides the default spacing for placing new children near their parent in manual mode.
    getManualChildSpacing() {
      return 120;
    }
    // Supplies the Cytoscape stylesheet that defines node/edge appearance and state styling.
    getGraphStyles() {
      return [
        {
          selector: "node",
          style: {
            "background-color": "#e9dfcf",
            "label": "data(label)",
            "font-size": "12px",
            "font-family": "Space Grotesk, sans-serif",
            "text-wrap": "wrap",
            "text-max-width": "120px",
            "text-valign": "center",
            "text-halign": "center",
            "color": "#1e1914",
            "border-width": 1,
            "border-color": "#d2c2ad",
            "padding": "10px",
            "shape": "round-rectangle"
          }
        },
        {
          selector: 'node[labelVisible = "false"]',
          style: {
            "text-opacity": 0,
            "text-background-opacity": 0
          }
        },
        {
          selector: 'node[kind = "file"]',
          style: { "background-color": "#f0dcc1" }
        },
        {
          selector: 'node[kind = "folder"]',
          style: { "background-color": "#f5e6d6", "border-style": "dashed" }
        },
        {
          selector: 'node[kind = "class"]',
          style: { "background-color": "#d9e8f0" }
        },
        {
          selector: 'node[kind = "function"]',
          style: { "background-color": "#e3f0d9" }
        },
        {
          selector: 'node[kind = "method"]',
          style: { "background-color": "#f0e3d9" }
        },
        {
          selector: 'node[kind = "blueprint"]',
          style: { "background-color": "#d9efe7" }
        },
        {
          selector: 'node[kind = "external"]',
          style: { "background-color": "#efe0f0", "border-style": "dashed" }
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 2,
            "border-color": "#237a78",
            "shadow-blur": 18,
            "shadow-color": "#237a78",
            "shadow-opacity": 0.5,
            "shadow-offset-x": 0,
            "shadow-offset-y": 0
          }
        },
        {
          selector: "node.is-hovered",
          style: {
            "text-opacity": 1,
            "text-background-opacity": 1,
            "shadow-blur": 16,
            "shadow-color": "#237a78",
            "shadow-opacity": 0.45,
            "z-index": 10
          }
        },
        {
          selector: "node.is-guided-focus",
          style: {
            "border-width": 3,
            "border-color": "#c75c2a",
            "shadow-blur": 22,
            "shadow-color": "#c75c2a",
            "shadow-opacity": 0.6,
            "z-index": 12
          }
        },
        {
          selector: "node.is-guided-hidden",
          style: {
            "opacity": 0,
            "text-opacity": 0
          }
        },
        {
          selector: "edge",
          style: {
            "line-color": "#bcae9c",
            "width": 1,
            "curve-style": "unbundled-bezier",
            "control-point-distances": 40,
            "control-point-weights": 0.5,
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#bcae9c",
            "opacity": 0.2
          }
        },
        {
          selector: "edge.is-active",
          style: {
            "opacity": 0.75,
            "width": 2
          }
        },
        {
          selector: 'edge[kind = "calls"]',
          style: { "line-color": "#237a78", "target-arrow-color": "#237a78" }
        },
        {
          selector: 'edge[kind = "imports"]',
          style: { "line-color": "#d07838", "target-arrow-color": "#d07838" }
        },
        {
          selector: 'edge[kind = "inherits"]',
          style: { "line-color": "#7d6ba6", "target-arrow-color": "#7d6ba6" }
        },
        {
          selector: 'edge[kind = "contains"]',
          style: { "line-color": "#5c4d3c", "target-arrow-color": "#5c4d3c" }
        },
        {
          selector: 'edge[kind = "blueprint"]',
          style: { "line-color": "#2a9d8f", "target-arrow-color": "#2a9d8f" }
        },
        {
          selector: 'edge[confidence = "low"]',
          style: { "line-style": "dashed", "opacity": 0.15 }
        },
        {
          selector: "edge.is-guided-hidden",
          style: { "opacity": 0 }
        }
      ];
    }
  };

  // app/static/gitreader/modules/ui/fileTreeInteractions.ts
  function expandFileTreePath(collapsed, path) {
    const normalized = normalizePath(path);
    const parts = normalized.split("/").filter(Boolean);
    let current = "";
    for (const part of parts.slice(0, -1)) {
      current = current ? `${current}/${part}` : part;
      if (collapsed.has(current)) {
        break;
      }
      collapsed.delete(current);
    }
  }
  function expandFileTreeForFocus(collapsed, path, fileNodesByPath) {
    const normalized = normalizePath(path);
    if (fileNodesByPath.has(normalized)) {
      expandFileTreePath(collapsed, normalized);
      return;
    }
    expandFileTreeFolder(collapsed, normalized);
  }
  function expandFileTreeFolder(collapsed, path) {
    const normalized = normalizePath(path);
    const parts = normalized.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      collapsed.delete(current);
    }
  }

  // app/static/gitreader/modules/ui/fileTreeView.ts
  var FileTreeView = class {
    // Captures rendering helpers so the view can be reused by app and reader modules.
    constructor(deps) {
      this.deps = deps;
      __publicField(this, "root", null);
      __publicField(this, "nodes", []);
      __publicField(this, "fileNodesByPath", /* @__PURE__ */ new Map());
      __publicField(this, "collapsed", /* @__PURE__ */ new Set());
      __publicField(this, "narratorFocusPath", null);
      __publicField(this, "narratorRows", []);
      __publicField(this, "readerRows", []);
    }
    // Rebuilds the tree model when graph nodes change and keeps file-node lookups in sync.
    setNodes(nodes, fileNodesByPath) {
      this.nodes = nodes;
      this.fileNodesByPath = fileNodesByPath;
      this.root = this.deps.buildTree(nodes);
    }
    // Returns the latest narrator rows (primarily for debugging or future use).
    getNarratorRows() {
      return this.narratorRows;
    }
    // Returns the latest reader rows (primarily for debugging or future use).
    getReaderRows() {
      return this.readerRows;
    }
    // Reads the current narrator focus path so callers can restore focus after updates.
    getNarratorFocusPath() {
      return this.narratorFocusPath;
    }
    // Toggles a folder path in the collapsed set to expand/collapse descendants.
    toggle(path) {
      const normalized = this.deps.normalizePath(path);
      if (this.collapsed.has(normalized)) {
        this.collapsed.delete(normalized);
      } else {
        this.collapsed.add(normalized);
      }
    }
    // Renders the narrator file tree, expanding the focus path when provided.
    renderNarratorTree(focusPath) {
      var _a;
      const normalized = typeof focusPath === "undefined" ? (_a = this.narratorFocusPath) != null ? _a : "" : this.normalizeFocusPath(focusPath);
      this.narratorFocusPath = normalized || null;
      if (normalized) {
        this.deps.expandForFocus(this.collapsed, normalized, this.fileNodesByPath);
      }
      const result = this.renderTree(normalized);
      this.narratorRows = result.rows;
      return result;
    }
    // Renders the reader file tree for a specific focus path.
    renderReaderTree(focusPath) {
      const normalized = this.normalizeFocusPath(focusPath);
      if (normalized) {
        this.deps.expandForFocus(this.collapsed, normalized, this.fileNodesByPath);
      }
      const result = this.renderTree(normalized);
      this.readerRows = result.rows;
      return result;
    }
    // Ensures the tree model exists before rendering so empty graphs still render gracefully.
    renderTree(focusPath) {
      if (!this.root) {
        this.root = this.nodes.length > 0 ? this.deps.buildTree(this.nodes) : null;
      }
      return this.deps.renderTree(this.root, focusPath, this.collapsed);
    }
    // Normalizes focus paths to avoid mismatched separators or empty values.
    normalizeFocusPath(path) {
      if (!path) {
        return "";
      }
      return this.deps.normalizePath(path);
    }
  };
  var fileTreeViewDefaults = {
    buildTree: buildFileTreeFromNodes,
    renderTree: renderFileTreeMarkup,
    expandForFocus: expandFileTreeForFocus,
    normalizePath
  };

  // app/static/gitreader/modules/ui/readerController.ts
  var ReaderController = class {
    constructor(deps) {
      this.deps = deps;
    }
    // Renders a symbol/snippet pair into the reader; called after snippet fetches.
    render(symbol, snippet) {
      this.deps.readerView.renderCode(symbol, snippet);
    }
    // Shows the reader file tree for a given path; used by file tree and cluster navigation.
    showFileTree(path) {
      this.deps.readerInteractions.renderReaderFileTree(path);
    }
    // Switches snippet mode (body/full) and triggers reloads as needed.
    setSnippetMode(mode) {
      return this.deps.readerView.setSnippetMode(mode);
    }
    // Handles reader click events, including copy/jump/import/definition actions.
    handleCodeSurfaceClick(event) {
      this.deps.readerInteractions.handleCodeSurfaceClick(event);
    }
    // Handles reader keydown events, including the line-jump input enter key.
    handleCodeSurfaceKeydown(event) {
      this.deps.readerInteractions.handleCodeSurfaceKeydown(event);
    }
  };

  // node_modules/highlight.js/es/core.js
  var import_core = __toESM(require_core(), 1);
  var core_default = import_core.default;

  // node_modules/highlight.js/es/languages/javascript.js
  var IDENT_RE = "[A-Za-z$_][0-9A-Za-z$_]*";
  var KEYWORDS = [
    "as",
    // for exports
    "in",
    "of",
    "if",
    "for",
    "while",
    "finally",
    "var",
    "new",
    "function",
    "do",
    "return",
    "void",
    "else",
    "break",
    "catch",
    "instanceof",
    "with",
    "throw",
    "case",
    "default",
    "try",
    "switch",
    "continue",
    "typeof",
    "delete",
    "let",
    "yield",
    "const",
    "class",
    // JS handles these with a special rule
    // "get",
    // "set",
    "debugger",
    "async",
    "await",
    "static",
    "import",
    "from",
    "export",
    "extends"
  ];
  var LITERALS = [
    "true",
    "false",
    "null",
    "undefined",
    "NaN",
    "Infinity"
  ];
  var TYPES = [
    // Fundamental objects
    "Object",
    "Function",
    "Boolean",
    "Symbol",
    // numbers and dates
    "Math",
    "Date",
    "Number",
    "BigInt",
    // text
    "String",
    "RegExp",
    // Indexed collections
    "Array",
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Int32Array",
    "Uint16Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array",
    // Keyed collections
    "Set",
    "Map",
    "WeakSet",
    "WeakMap",
    // Structured data
    "ArrayBuffer",
    "SharedArrayBuffer",
    "Atomics",
    "DataView",
    "JSON",
    // Control abstraction objects
    "Promise",
    "Generator",
    "GeneratorFunction",
    "AsyncFunction",
    // Reflection
    "Reflect",
    "Proxy",
    // Internationalization
    "Intl",
    // WebAssembly
    "WebAssembly"
  ];
  var ERROR_TYPES = [
    "Error",
    "EvalError",
    "InternalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError"
  ];
  var BUILT_IN_GLOBALS = [
    "setInterval",
    "setTimeout",
    "clearInterval",
    "clearTimeout",
    "require",
    "exports",
    "eval",
    "isFinite",
    "isNaN",
    "parseFloat",
    "parseInt",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "escape",
    "unescape"
  ];
  var BUILT_IN_VARIABLES = [
    "arguments",
    "this",
    "super",
    "console",
    "window",
    "document",
    "localStorage",
    "sessionStorage",
    "module",
    "global"
    // Node.js
  ];
  var BUILT_INS = [].concat(
    BUILT_IN_GLOBALS,
    TYPES,
    ERROR_TYPES
  );
  function javascript(hljs) {
    const regex = hljs.regex;
    const hasClosingTag = (match, { after }) => {
      const tag = "</" + match[0].slice(1);
      const pos = match.input.indexOf(tag, after);
      return pos !== -1;
    };
    const IDENT_RE$1 = IDENT_RE;
    const FRAGMENT = {
      begin: "<>",
      end: "</>"
    };
    const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
    const XML_TAG = {
      begin: /<[A-Za-z0-9\\._:-]+/,
      end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
      /**
       * @param {RegExpMatchArray} match
       * @param {CallbackResponse} response
       */
      isTrulyOpeningTag: (match, response) => {
        const afterMatchIndex = match[0].length + match.index;
        const nextChar = match.input[afterMatchIndex];
        if (
          // HTML should not include another raw `<` inside a tag
          // nested type?
          // `<Array<Array<number>>`, etc.
          nextChar === "<" || // the , gives away that this is not HTML
          // `<T, A extends keyof T, V>`
          nextChar === ","
        ) {
          response.ignoreMatch();
          return;
        }
        if (nextChar === ">") {
          if (!hasClosingTag(match, { after: afterMatchIndex })) {
            response.ignoreMatch();
          }
        }
        let m;
        const afterMatch = match.input.substring(afterMatchIndex);
        if (m = afterMatch.match(/^\s*=/)) {
          response.ignoreMatch();
          return;
        }
        if (m = afterMatch.match(/^\s+extends\s+/)) {
          if (m.index === 0) {
            response.ignoreMatch();
            return;
          }
        }
      }
    };
    const KEYWORDS$1 = {
      $pattern: IDENT_RE,
      keyword: KEYWORDS,
      literal: LITERALS,
      built_in: BUILT_INS,
      "variable.language": BUILT_IN_VARIABLES
    };
    const decimalDigits = "[0-9](_?[0-9])*";
    const frac = `\\.(${decimalDigits})`;
    const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
    const NUMBER = {
      className: "number",
      variants: [
        // DecimalLiteral
        { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))[eE][+-]?(${decimalDigits})\\b` },
        { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },
        // DecimalBigIntegerLiteral
        { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },
        // NonDecimalIntegerLiteral
        { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
        { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
        { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },
        // LegacyOctalIntegerLiteral (does not include underscore separators)
        // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
        { begin: "\\b0[0-7]+n?\\b" }
      ],
      relevance: 0
    };
    const SUBST = {
      className: "subst",
      begin: "\\$\\{",
      end: "\\}",
      keywords: KEYWORDS$1,
      contains: []
      // defined later
    };
    const HTML_TEMPLATE = {
      begin: "html`",
      end: "",
      starts: {
        end: "`",
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: "xml"
      }
    };
    const CSS_TEMPLATE = {
      begin: "css`",
      end: "",
      starts: {
        end: "`",
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: "css"
      }
    };
    const GRAPHQL_TEMPLATE = {
      begin: "gql`",
      end: "",
      starts: {
        end: "`",
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: "graphql"
      }
    };
    const TEMPLATE_STRING = {
      className: "string",
      begin: "`",
      end: "`",
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ]
    };
    const JSDOC_COMMENT = hljs.COMMENT(
      /\/\*\*(?!\/)/,
      "\\*/",
      {
        relevance: 0,
        contains: [
          {
            begin: "(?=@[A-Za-z]+)",
            relevance: 0,
            contains: [
              {
                className: "doctag",
                begin: "@[A-Za-z]+"
              },
              {
                className: "type",
                begin: "\\{",
                end: "\\}",
                excludeEnd: true,
                excludeBegin: true,
                relevance: 0
              },
              {
                className: "variable",
                begin: IDENT_RE$1 + "(?=\\s*(-)|$)",
                endsParent: true,
                relevance: 0
              },
              // eat spaces (not newlines) so we can find
              // types or variables
              {
                begin: /(?=[^\n])\s/,
                relevance: 0
              }
            ]
          }
        ]
      }
    );
    const COMMENT = {
      className: "comment",
      variants: [
        JSDOC_COMMENT,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_LINE_COMMENT_MODE
      ]
    };
    const SUBST_INTERNALS = [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      GRAPHQL_TEMPLATE,
      TEMPLATE_STRING,
      // Skip numbers when they are part of a variable name
      { match: /\$\d+/ },
      NUMBER
      // This is intentional:
      // See https://github.com/highlightjs/highlight.js/issues/3288
      // hljs.REGEXP_MODE
    ];
    SUBST.contains = SUBST_INTERNALS.concat({
      // we need to pair up {} inside our subst to prevent
      // it from ending too early by matching another }
      begin: /\{/,
      end: /\}/,
      keywords: KEYWORDS$1,
      contains: [
        "self"
      ].concat(SUBST_INTERNALS)
    });
    const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
    const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
      // eat recursive parens in sub expressions
      {
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS$1,
        contains: ["self"].concat(SUBST_AND_COMMENTS)
      }
    ]);
    const PARAMS = {
      className: "params",
      begin: /\(/,
      end: /\)/,
      excludeBegin: true,
      excludeEnd: true,
      keywords: KEYWORDS$1,
      contains: PARAMS_CONTAINS
    };
    const CLASS_OR_EXTENDS = {
      variants: [
        // class Car extends vehicle
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1,
            /\s+/,
            /extends/,
            /\s+/,
            regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
          ],
          scope: {
            1: "keyword",
            3: "title.class",
            5: "keyword",
            7: "title.class.inherited"
          }
        },
        // class Car
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1
          ],
          scope: {
            1: "keyword",
            3: "title.class"
          }
        }
      ]
    };
    const CLASS_REFERENCE = {
      relevance: 0,
      match: regex.either(
        // Hard coded exceptions
        /\bJSON/,
        // Float32Array, OutT
        /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
        // CSSFactory, CSSFactoryT
        /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
        // FPs, FPsT
        /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/
        // P
        // single letters are not highlighted
        // BLAH
        // this will be flagged as a UPPER_CASE_CONSTANT instead
      ),
      className: "title.class",
      keywords: {
        _: [
          // se we still get relevance credit for JS library classes
          ...TYPES,
          ...ERROR_TYPES
        ]
      }
    };
    const USE_STRICT = {
      label: "use_strict",
      className: "meta",
      relevance: 10,
      begin: /^\s*['"]use (strict|asm)['"]/
    };
    const FUNCTION_DEFINITION = {
      variants: [
        {
          match: [
            /function/,
            /\s+/,
            IDENT_RE$1,
            /(?=\s*\()/
          ]
        },
        // anonymous function
        {
          match: [
            /function/,
            /\s*(?=\()/
          ]
        }
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      label: "func.def",
      contains: [PARAMS],
      illegal: /%/
    };
    const UPPER_CASE_CONSTANT = {
      relevance: 0,
      match: /\b[A-Z][A-Z_0-9]+\b/,
      className: "variable.constant"
    };
    function noneOf(list) {
      return regex.concat("(?!", list.join("|"), ")");
    }
    const FUNCTION_CALL = {
      match: regex.concat(
        /\b/,
        noneOf([
          ...BUILT_IN_GLOBALS,
          "super",
          "import"
        ]),
        IDENT_RE$1,
        regex.lookahead(/\(/)
      ),
      className: "title.function",
      relevance: 0
    };
    const PROPERTY_ACCESS = {
      begin: regex.concat(/\./, regex.lookahead(
        regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
      )),
      end: IDENT_RE$1,
      excludeBegin: true,
      keywords: "prototype",
      className: "property",
      relevance: 0
    };
    const GETTER_OR_SETTER = {
      match: [
        /get|set/,
        /\s+/,
        IDENT_RE$1,
        /(?=\()/
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        {
          // eat to avoid empty params
          begin: /\(\)/
        },
        PARAMS
      ]
    };
    const FUNC_LEAD_IN_RE = "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + hljs.UNDERSCORE_IDENT_RE + ")\\s*=>";
    const FUNCTION_VARIABLE = {
      match: [
        /const|var|let/,
        /\s+/,
        IDENT_RE$1,
        /\s*/,
        /=\s*/,
        /(async\s*)?/,
        // async is optional
        regex.lookahead(FUNC_LEAD_IN_RE)
      ],
      keywords: "async",
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        PARAMS
      ]
    };
    return {
      name: "JavaScript",
      aliases: ["js", "jsx", "mjs", "cjs"],
      keywords: KEYWORDS$1,
      // this will be extended by TypeScript
      exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
      illegal: /#(?![$_A-z])/,
      contains: [
        hljs.SHEBANG({
          label: "shebang",
          binary: "node",
          relevance: 5
        }),
        USE_STRICT,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        HTML_TEMPLATE,
        CSS_TEMPLATE,
        GRAPHQL_TEMPLATE,
        TEMPLATE_STRING,
        COMMENT,
        // Skip numbers when they are part of a variable name
        { match: /\$\d+/ },
        NUMBER,
        CLASS_REFERENCE,
        {
          className: "attr",
          begin: IDENT_RE$1 + regex.lookahead(":"),
          relevance: 0
        },
        FUNCTION_VARIABLE,
        {
          // "value" container
          begin: "(" + hljs.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
          keywords: "return throw case",
          relevance: 0,
          contains: [
            COMMENT,
            hljs.REGEXP_MODE,
            {
              className: "function",
              // we have to count the parens to make sure we actually have the
              // correct bounding ( ) before the =>.  There could be any number of
              // sub-expressions inside also surrounded by parens.
              begin: FUNC_LEAD_IN_RE,
              returnBegin: true,
              end: "\\s*=>",
              contains: [
                {
                  className: "params",
                  variants: [
                    {
                      begin: hljs.UNDERSCORE_IDENT_RE,
                      relevance: 0
                    },
                    {
                      className: null,
                      begin: /\(\s*\)/,
                      skip: true
                    },
                    {
                      begin: /\(/,
                      end: /\)/,
                      excludeBegin: true,
                      excludeEnd: true,
                      keywords: KEYWORDS$1,
                      contains: PARAMS_CONTAINS
                    }
                  ]
                }
              ]
            },
            {
              // could be a comma delimited list of params to a function call
              begin: /,/,
              relevance: 0
            },
            {
              match: /\s+/,
              relevance: 0
            },
            {
              // JSX
              variants: [
                { begin: FRAGMENT.begin, end: FRAGMENT.end },
                { match: XML_SELF_CLOSING },
                {
                  begin: XML_TAG.begin,
                  // we carefully check the opening tag to see if it truly
                  // is a tag and not a false positive
                  "on:begin": XML_TAG.isTrulyOpeningTag,
                  end: XML_TAG.end
                }
              ],
              subLanguage: "xml",
              contains: [
                {
                  begin: XML_TAG.begin,
                  end: XML_TAG.end,
                  skip: true,
                  contains: ["self"]
                }
              ]
            }
          ]
        },
        FUNCTION_DEFINITION,
        {
          // prevent this from getting swallowed up by function
          // since they appear "function like"
          beginKeywords: "while if switch catch for"
        },
        {
          // we have to count the parens to make sure we actually have the correct
          // bounding ( ).  There could be any number of sub-expressions inside
          // also surrounded by parens.
          begin: "\\b(?!function)" + hljs.UNDERSCORE_IDENT_RE + "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
          // end parens
          returnBegin: true,
          label: "func.def",
          contains: [
            PARAMS,
            hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
          ]
        },
        // catch ... so it won't trigger the property rule below
        {
          match: /\.\.\./,
          relevance: 0
        },
        PROPERTY_ACCESS,
        // hack: prevents detection of keywords in some circumstances
        // .keyword()
        // $keyword = x
        {
          match: "\\$" + IDENT_RE$1,
          relevance: 0
        },
        {
          match: [/\bconstructor(?=\s*\()/],
          className: { 1: "title.function" },
          contains: [PARAMS]
        },
        FUNCTION_CALL,
        UPPER_CASE_CONSTANT,
        CLASS_OR_EXTENDS,
        GETTER_OR_SETTER,
        {
          match: /\$[(.]/
          // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
        }
      ]
    };
  }

  // node_modules/highlight.js/es/languages/typescript.js
  var IDENT_RE2 = "[A-Za-z$_][0-9A-Za-z$_]*";
  var KEYWORDS2 = [
    "as",
    // for exports
    "in",
    "of",
    "if",
    "for",
    "while",
    "finally",
    "var",
    "new",
    "function",
    "do",
    "return",
    "void",
    "else",
    "break",
    "catch",
    "instanceof",
    "with",
    "throw",
    "case",
    "default",
    "try",
    "switch",
    "continue",
    "typeof",
    "delete",
    "let",
    "yield",
    "const",
    "class",
    // JS handles these with a special rule
    // "get",
    // "set",
    "debugger",
    "async",
    "await",
    "static",
    "import",
    "from",
    "export",
    "extends"
  ];
  var LITERALS2 = [
    "true",
    "false",
    "null",
    "undefined",
    "NaN",
    "Infinity"
  ];
  var TYPES2 = [
    // Fundamental objects
    "Object",
    "Function",
    "Boolean",
    "Symbol",
    // numbers and dates
    "Math",
    "Date",
    "Number",
    "BigInt",
    // text
    "String",
    "RegExp",
    // Indexed collections
    "Array",
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Int32Array",
    "Uint16Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array",
    // Keyed collections
    "Set",
    "Map",
    "WeakSet",
    "WeakMap",
    // Structured data
    "ArrayBuffer",
    "SharedArrayBuffer",
    "Atomics",
    "DataView",
    "JSON",
    // Control abstraction objects
    "Promise",
    "Generator",
    "GeneratorFunction",
    "AsyncFunction",
    // Reflection
    "Reflect",
    "Proxy",
    // Internationalization
    "Intl",
    // WebAssembly
    "WebAssembly"
  ];
  var ERROR_TYPES2 = [
    "Error",
    "EvalError",
    "InternalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError"
  ];
  var BUILT_IN_GLOBALS2 = [
    "setInterval",
    "setTimeout",
    "clearInterval",
    "clearTimeout",
    "require",
    "exports",
    "eval",
    "isFinite",
    "isNaN",
    "parseFloat",
    "parseInt",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "escape",
    "unescape"
  ];
  var BUILT_IN_VARIABLES2 = [
    "arguments",
    "this",
    "super",
    "console",
    "window",
    "document",
    "localStorage",
    "sessionStorage",
    "module",
    "global"
    // Node.js
  ];
  var BUILT_INS2 = [].concat(
    BUILT_IN_GLOBALS2,
    TYPES2,
    ERROR_TYPES2
  );
  function javascript2(hljs) {
    const regex = hljs.regex;
    const hasClosingTag = (match, { after }) => {
      const tag = "</" + match[0].slice(1);
      const pos = match.input.indexOf(tag, after);
      return pos !== -1;
    };
    const IDENT_RE$1 = IDENT_RE2;
    const FRAGMENT = {
      begin: "<>",
      end: "</>"
    };
    const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
    const XML_TAG = {
      begin: /<[A-Za-z0-9\\._:-]+/,
      end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
      /**
       * @param {RegExpMatchArray} match
       * @param {CallbackResponse} response
       */
      isTrulyOpeningTag: (match, response) => {
        const afterMatchIndex = match[0].length + match.index;
        const nextChar = match.input[afterMatchIndex];
        if (
          // HTML should not include another raw `<` inside a tag
          // nested type?
          // `<Array<Array<number>>`, etc.
          nextChar === "<" || // the , gives away that this is not HTML
          // `<T, A extends keyof T, V>`
          nextChar === ","
        ) {
          response.ignoreMatch();
          return;
        }
        if (nextChar === ">") {
          if (!hasClosingTag(match, { after: afterMatchIndex })) {
            response.ignoreMatch();
          }
        }
        let m;
        const afterMatch = match.input.substring(afterMatchIndex);
        if (m = afterMatch.match(/^\s*=/)) {
          response.ignoreMatch();
          return;
        }
        if (m = afterMatch.match(/^\s+extends\s+/)) {
          if (m.index === 0) {
            response.ignoreMatch();
            return;
          }
        }
      }
    };
    const KEYWORDS$1 = {
      $pattern: IDENT_RE2,
      keyword: KEYWORDS2,
      literal: LITERALS2,
      built_in: BUILT_INS2,
      "variable.language": BUILT_IN_VARIABLES2
    };
    const decimalDigits = "[0-9](_?[0-9])*";
    const frac = `\\.(${decimalDigits})`;
    const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
    const NUMBER = {
      className: "number",
      variants: [
        // DecimalLiteral
        { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))[eE][+-]?(${decimalDigits})\\b` },
        { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },
        // DecimalBigIntegerLiteral
        { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },
        // NonDecimalIntegerLiteral
        { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
        { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
        { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },
        // LegacyOctalIntegerLiteral (does not include underscore separators)
        // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
        { begin: "\\b0[0-7]+n?\\b" }
      ],
      relevance: 0
    };
    const SUBST = {
      className: "subst",
      begin: "\\$\\{",
      end: "\\}",
      keywords: KEYWORDS$1,
      contains: []
      // defined later
    };
    const HTML_TEMPLATE = {
      begin: "html`",
      end: "",
      starts: {
        end: "`",
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: "xml"
      }
    };
    const CSS_TEMPLATE = {
      begin: "css`",
      end: "",
      starts: {
        end: "`",
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: "css"
      }
    };
    const GRAPHQL_TEMPLATE = {
      begin: "gql`",
      end: "",
      starts: {
        end: "`",
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: "graphql"
      }
    };
    const TEMPLATE_STRING = {
      className: "string",
      begin: "`",
      end: "`",
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ]
    };
    const JSDOC_COMMENT = hljs.COMMENT(
      /\/\*\*(?!\/)/,
      "\\*/",
      {
        relevance: 0,
        contains: [
          {
            begin: "(?=@[A-Za-z]+)",
            relevance: 0,
            contains: [
              {
                className: "doctag",
                begin: "@[A-Za-z]+"
              },
              {
                className: "type",
                begin: "\\{",
                end: "\\}",
                excludeEnd: true,
                excludeBegin: true,
                relevance: 0
              },
              {
                className: "variable",
                begin: IDENT_RE$1 + "(?=\\s*(-)|$)",
                endsParent: true,
                relevance: 0
              },
              // eat spaces (not newlines) so we can find
              // types or variables
              {
                begin: /(?=[^\n])\s/,
                relevance: 0
              }
            ]
          }
        ]
      }
    );
    const COMMENT = {
      className: "comment",
      variants: [
        JSDOC_COMMENT,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_LINE_COMMENT_MODE
      ]
    };
    const SUBST_INTERNALS = [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      GRAPHQL_TEMPLATE,
      TEMPLATE_STRING,
      // Skip numbers when they are part of a variable name
      { match: /\$\d+/ },
      NUMBER
      // This is intentional:
      // See https://github.com/highlightjs/highlight.js/issues/3288
      // hljs.REGEXP_MODE
    ];
    SUBST.contains = SUBST_INTERNALS.concat({
      // we need to pair up {} inside our subst to prevent
      // it from ending too early by matching another }
      begin: /\{/,
      end: /\}/,
      keywords: KEYWORDS$1,
      contains: [
        "self"
      ].concat(SUBST_INTERNALS)
    });
    const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
    const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
      // eat recursive parens in sub expressions
      {
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS$1,
        contains: ["self"].concat(SUBST_AND_COMMENTS)
      }
    ]);
    const PARAMS = {
      className: "params",
      begin: /\(/,
      end: /\)/,
      excludeBegin: true,
      excludeEnd: true,
      keywords: KEYWORDS$1,
      contains: PARAMS_CONTAINS
    };
    const CLASS_OR_EXTENDS = {
      variants: [
        // class Car extends vehicle
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1,
            /\s+/,
            /extends/,
            /\s+/,
            regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
          ],
          scope: {
            1: "keyword",
            3: "title.class",
            5: "keyword",
            7: "title.class.inherited"
          }
        },
        // class Car
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1
          ],
          scope: {
            1: "keyword",
            3: "title.class"
          }
        }
      ]
    };
    const CLASS_REFERENCE = {
      relevance: 0,
      match: regex.either(
        // Hard coded exceptions
        /\bJSON/,
        // Float32Array, OutT
        /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
        // CSSFactory, CSSFactoryT
        /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
        // FPs, FPsT
        /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/
        // P
        // single letters are not highlighted
        // BLAH
        // this will be flagged as a UPPER_CASE_CONSTANT instead
      ),
      className: "title.class",
      keywords: {
        _: [
          // se we still get relevance credit for JS library classes
          ...TYPES2,
          ...ERROR_TYPES2
        ]
      }
    };
    const USE_STRICT = {
      label: "use_strict",
      className: "meta",
      relevance: 10,
      begin: /^\s*['"]use (strict|asm)['"]/
    };
    const FUNCTION_DEFINITION = {
      variants: [
        {
          match: [
            /function/,
            /\s+/,
            IDENT_RE$1,
            /(?=\s*\()/
          ]
        },
        // anonymous function
        {
          match: [
            /function/,
            /\s*(?=\()/
          ]
        }
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      label: "func.def",
      contains: [PARAMS],
      illegal: /%/
    };
    const UPPER_CASE_CONSTANT = {
      relevance: 0,
      match: /\b[A-Z][A-Z_0-9]+\b/,
      className: "variable.constant"
    };
    function noneOf(list) {
      return regex.concat("(?!", list.join("|"), ")");
    }
    const FUNCTION_CALL = {
      match: regex.concat(
        /\b/,
        noneOf([
          ...BUILT_IN_GLOBALS2,
          "super",
          "import"
        ]),
        IDENT_RE$1,
        regex.lookahead(/\(/)
      ),
      className: "title.function",
      relevance: 0
    };
    const PROPERTY_ACCESS = {
      begin: regex.concat(/\./, regex.lookahead(
        regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
      )),
      end: IDENT_RE$1,
      excludeBegin: true,
      keywords: "prototype",
      className: "property",
      relevance: 0
    };
    const GETTER_OR_SETTER = {
      match: [
        /get|set/,
        /\s+/,
        IDENT_RE$1,
        /(?=\()/
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        {
          // eat to avoid empty params
          begin: /\(\)/
        },
        PARAMS
      ]
    };
    const FUNC_LEAD_IN_RE = "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + hljs.UNDERSCORE_IDENT_RE + ")\\s*=>";
    const FUNCTION_VARIABLE = {
      match: [
        /const|var|let/,
        /\s+/,
        IDENT_RE$1,
        /\s*/,
        /=\s*/,
        /(async\s*)?/,
        // async is optional
        regex.lookahead(FUNC_LEAD_IN_RE)
      ],
      keywords: "async",
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        PARAMS
      ]
    };
    return {
      name: "JavaScript",
      aliases: ["js", "jsx", "mjs", "cjs"],
      keywords: KEYWORDS$1,
      // this will be extended by TypeScript
      exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
      illegal: /#(?![$_A-z])/,
      contains: [
        hljs.SHEBANG({
          label: "shebang",
          binary: "node",
          relevance: 5
        }),
        USE_STRICT,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        HTML_TEMPLATE,
        CSS_TEMPLATE,
        GRAPHQL_TEMPLATE,
        TEMPLATE_STRING,
        COMMENT,
        // Skip numbers when they are part of a variable name
        { match: /\$\d+/ },
        NUMBER,
        CLASS_REFERENCE,
        {
          className: "attr",
          begin: IDENT_RE$1 + regex.lookahead(":"),
          relevance: 0
        },
        FUNCTION_VARIABLE,
        {
          // "value" container
          begin: "(" + hljs.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
          keywords: "return throw case",
          relevance: 0,
          contains: [
            COMMENT,
            hljs.REGEXP_MODE,
            {
              className: "function",
              // we have to count the parens to make sure we actually have the
              // correct bounding ( ) before the =>.  There could be any number of
              // sub-expressions inside also surrounded by parens.
              begin: FUNC_LEAD_IN_RE,
              returnBegin: true,
              end: "\\s*=>",
              contains: [
                {
                  className: "params",
                  variants: [
                    {
                      begin: hljs.UNDERSCORE_IDENT_RE,
                      relevance: 0
                    },
                    {
                      className: null,
                      begin: /\(\s*\)/,
                      skip: true
                    },
                    {
                      begin: /\(/,
                      end: /\)/,
                      excludeBegin: true,
                      excludeEnd: true,
                      keywords: KEYWORDS$1,
                      contains: PARAMS_CONTAINS
                    }
                  ]
                }
              ]
            },
            {
              // could be a comma delimited list of params to a function call
              begin: /,/,
              relevance: 0
            },
            {
              match: /\s+/,
              relevance: 0
            },
            {
              // JSX
              variants: [
                { begin: FRAGMENT.begin, end: FRAGMENT.end },
                { match: XML_SELF_CLOSING },
                {
                  begin: XML_TAG.begin,
                  // we carefully check the opening tag to see if it truly
                  // is a tag and not a false positive
                  "on:begin": XML_TAG.isTrulyOpeningTag,
                  end: XML_TAG.end
                }
              ],
              subLanguage: "xml",
              contains: [
                {
                  begin: XML_TAG.begin,
                  end: XML_TAG.end,
                  skip: true,
                  contains: ["self"]
                }
              ]
            }
          ]
        },
        FUNCTION_DEFINITION,
        {
          // prevent this from getting swallowed up by function
          // since they appear "function like"
          beginKeywords: "while if switch catch for"
        },
        {
          // we have to count the parens to make sure we actually have the correct
          // bounding ( ).  There could be any number of sub-expressions inside
          // also surrounded by parens.
          begin: "\\b(?!function)" + hljs.UNDERSCORE_IDENT_RE + "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
          // end parens
          returnBegin: true,
          label: "func.def",
          contains: [
            PARAMS,
            hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
          ]
        },
        // catch ... so it won't trigger the property rule below
        {
          match: /\.\.\./,
          relevance: 0
        },
        PROPERTY_ACCESS,
        // hack: prevents detection of keywords in some circumstances
        // .keyword()
        // $keyword = x
        {
          match: "\\$" + IDENT_RE$1,
          relevance: 0
        },
        {
          match: [/\bconstructor(?=\s*\()/],
          className: { 1: "title.function" },
          contains: [PARAMS]
        },
        FUNCTION_CALL,
        UPPER_CASE_CONSTANT,
        CLASS_OR_EXTENDS,
        GETTER_OR_SETTER,
        {
          match: /\$[(.]/
          // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
        }
      ]
    };
  }
  function typescript(hljs) {
    const tsLanguage = javascript2(hljs);
    const IDENT_RE$1 = IDENT_RE2;
    const TYPES3 = [
      "any",
      "void",
      "number",
      "boolean",
      "string",
      "object",
      "never",
      "symbol",
      "bigint",
      "unknown"
    ];
    const NAMESPACE = {
      beginKeywords: "namespace",
      end: /\{/,
      excludeEnd: true,
      contains: [tsLanguage.exports.CLASS_REFERENCE]
    };
    const INTERFACE = {
      beginKeywords: "interface",
      end: /\{/,
      excludeEnd: true,
      keywords: {
        keyword: "interface extends",
        built_in: TYPES3
      },
      contains: [tsLanguage.exports.CLASS_REFERENCE]
    };
    const USE_STRICT = {
      className: "meta",
      relevance: 10,
      begin: /^\s*['"]use strict['"]/
    };
    const TS_SPECIFIC_KEYWORDS = [
      "type",
      "namespace",
      "interface",
      "public",
      "private",
      "protected",
      "implements",
      "declare",
      "abstract",
      "readonly",
      "enum",
      "override"
    ];
    const KEYWORDS$1 = {
      $pattern: IDENT_RE2,
      keyword: KEYWORDS2.concat(TS_SPECIFIC_KEYWORDS),
      literal: LITERALS2,
      built_in: BUILT_INS2.concat(TYPES3),
      "variable.language": BUILT_IN_VARIABLES2
    };
    const DECORATOR = {
      className: "meta",
      begin: "@" + IDENT_RE$1
    };
    const swapMode = (mode, label, replacement) => {
      const indx = mode.contains.findIndex((m) => m.label === label);
      if (indx === -1) {
        throw new Error("can not find mode to replace");
      }
      mode.contains.splice(indx, 1, replacement);
    };
    Object.assign(tsLanguage.keywords, KEYWORDS$1);
    tsLanguage.exports.PARAMS_CONTAINS.push(DECORATOR);
    tsLanguage.contains = tsLanguage.contains.concat([
      DECORATOR,
      NAMESPACE,
      INTERFACE
    ]);
    swapMode(tsLanguage, "shebang", hljs.SHEBANG());
    swapMode(tsLanguage, "use_strict", USE_STRICT);
    const functionDeclaration = tsLanguage.contains.find((m) => m.label === "func.def");
    functionDeclaration.relevance = 0;
    Object.assign(tsLanguage, {
      name: "TypeScript",
      aliases: [
        "ts",
        "tsx",
        "mts",
        "cts"
      ]
    });
    return tsLanguage;
  }

  // node_modules/highlight.js/es/languages/python.js
  function python(hljs) {
    const regex = hljs.regex;
    const IDENT_RE3 = /[\p{XID_Start}_]\p{XID_Continue}*/u;
    const RESERVED_WORDS = [
      "and",
      "as",
      "assert",
      "async",
      "await",
      "break",
      "case",
      "class",
      "continue",
      "def",
      "del",
      "elif",
      "else",
      "except",
      "finally",
      "for",
      "from",
      "global",
      "if",
      "import",
      "in",
      "is",
      "lambda",
      "match",
      "nonlocal|10",
      "not",
      "or",
      "pass",
      "raise",
      "return",
      "try",
      "while",
      "with",
      "yield"
    ];
    const BUILT_INS3 = [
      "__import__",
      "abs",
      "all",
      "any",
      "ascii",
      "bin",
      "bool",
      "breakpoint",
      "bytearray",
      "bytes",
      "callable",
      "chr",
      "classmethod",
      "compile",
      "complex",
      "delattr",
      "dict",
      "dir",
      "divmod",
      "enumerate",
      "eval",
      "exec",
      "filter",
      "float",
      "format",
      "frozenset",
      "getattr",
      "globals",
      "hasattr",
      "hash",
      "help",
      "hex",
      "id",
      "input",
      "int",
      "isinstance",
      "issubclass",
      "iter",
      "len",
      "list",
      "locals",
      "map",
      "max",
      "memoryview",
      "min",
      "next",
      "object",
      "oct",
      "open",
      "ord",
      "pow",
      "print",
      "property",
      "range",
      "repr",
      "reversed",
      "round",
      "set",
      "setattr",
      "slice",
      "sorted",
      "staticmethod",
      "str",
      "sum",
      "super",
      "tuple",
      "type",
      "vars",
      "zip"
    ];
    const LITERALS3 = [
      "__debug__",
      "Ellipsis",
      "False",
      "None",
      "NotImplemented",
      "True"
    ];
    const TYPES3 = [
      "Any",
      "Callable",
      "Coroutine",
      "Dict",
      "List",
      "Literal",
      "Generic",
      "Optional",
      "Sequence",
      "Set",
      "Tuple",
      "Type",
      "Union"
    ];
    const KEYWORDS3 = {
      $pattern: /[A-Za-z]\w+|__\w+__/,
      keyword: RESERVED_WORDS,
      built_in: BUILT_INS3,
      literal: LITERALS3,
      type: TYPES3
    };
    const PROMPT = {
      className: "meta",
      begin: /^(>>>|\.\.\.) /
    };
    const SUBST = {
      className: "subst",
      begin: /\{/,
      end: /\}/,
      keywords: KEYWORDS3,
      illegal: /#/
    };
    const LITERAL_BRACKET = {
      begin: /\{\{/,
      relevance: 0
    };
    const STRING = {
      className: "string",
      contains: [hljs.BACKSLASH_ESCAPE],
      variants: [
        {
          begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,
          end: /'''/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            PROMPT
          ],
          relevance: 10
        },
        {
          begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,
          end: /"""/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            PROMPT
          ],
          relevance: 10
        },
        {
          begin: /([fF][rR]|[rR][fF]|[fF])'''/,
          end: /'''/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            PROMPT,
            LITERAL_BRACKET,
            SUBST
          ]
        },
        {
          begin: /([fF][rR]|[rR][fF]|[fF])"""/,
          end: /"""/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            PROMPT,
            LITERAL_BRACKET,
            SUBST
          ]
        },
        {
          begin: /([uU]|[rR])'/,
          end: /'/,
          relevance: 10
        },
        {
          begin: /([uU]|[rR])"/,
          end: /"/,
          relevance: 10
        },
        {
          begin: /([bB]|[bB][rR]|[rR][bB])'/,
          end: /'/
        },
        {
          begin: /([bB]|[bB][rR]|[rR][bB])"/,
          end: /"/
        },
        {
          begin: /([fF][rR]|[rR][fF]|[fF])'/,
          end: /'/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            LITERAL_BRACKET,
            SUBST
          ]
        },
        {
          begin: /([fF][rR]|[rR][fF]|[fF])"/,
          end: /"/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            LITERAL_BRACKET,
            SUBST
          ]
        },
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE
      ]
    };
    const digitpart = "[0-9](_?[0-9])*";
    const pointfloat = `(\\b(${digitpart}))?\\.(${digitpart})|\\b(${digitpart})\\.`;
    const lookahead2 = `\\b|${RESERVED_WORDS.join("|")}`;
    const NUMBER = {
      className: "number",
      relevance: 0,
      variants: [
        // exponentfloat, pointfloat
        // https://docs.python.org/3.9/reference/lexical_analysis.html#floating-point-literals
        // optionally imaginary
        // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
        // Note: no leading \b because floats can start with a decimal point
        // and we don't want to mishandle e.g. `fn(.5)`,
        // no trailing \b for pointfloat because it can end with a decimal point
        // and we don't want to mishandle e.g. `0..hex()`; this should be safe
        // because both MUST contain a decimal point and so cannot be confused with
        // the interior part of an identifier
        {
          begin: `(\\b(${digitpart})|(${pointfloat}))[eE][+-]?(${digitpart})[jJ]?(?=${lookahead2})`
        },
        {
          begin: `(${pointfloat})[jJ]?`
        },
        // decinteger, bininteger, octinteger, hexinteger
        // https://docs.python.org/3.9/reference/lexical_analysis.html#integer-literals
        // optionally "long" in Python 2
        // https://docs.python.org/2.7/reference/lexical_analysis.html#integer-and-long-integer-literals
        // decinteger is optionally imaginary
        // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
        {
          begin: `\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${lookahead2})`
        },
        {
          begin: `\\b0[bB](_?[01])+[lL]?(?=${lookahead2})`
        },
        {
          begin: `\\b0[oO](_?[0-7])+[lL]?(?=${lookahead2})`
        },
        {
          begin: `\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${lookahead2})`
        },
        // imagnumber (digitpart-based)
        // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
        {
          begin: `\\b(${digitpart})[jJ](?=${lookahead2})`
        }
      ]
    };
    const COMMENT_TYPE = {
      className: "comment",
      begin: regex.lookahead(/# type:/),
      end: /$/,
      keywords: KEYWORDS3,
      contains: [
        {
          // prevent keywords from coloring `type`
          begin: /# type:/
        },
        // comment within a datatype comment includes no keywords
        {
          begin: /#/,
          end: /\b\B/,
          endsWithParent: true
        }
      ]
    };
    const PARAMS = {
      className: "params",
      variants: [
        // Exclude params in functions without params
        {
          className: "",
          begin: /\(\s*\)/,
          skip: true
        },
        {
          begin: /\(/,
          end: /\)/,
          excludeBegin: true,
          excludeEnd: true,
          keywords: KEYWORDS3,
          contains: [
            "self",
            PROMPT,
            NUMBER,
            STRING,
            hljs.HASH_COMMENT_MODE
          ]
        }
      ]
    };
    SUBST.contains = [
      STRING,
      NUMBER,
      PROMPT
    ];
    return {
      name: "Python",
      aliases: [
        "py",
        "gyp",
        "ipython"
      ],
      unicodeRegex: true,
      keywords: KEYWORDS3,
      illegal: /(<\/|\?)|=>/,
      contains: [
        PROMPT,
        NUMBER,
        {
          // very common convention
          begin: /\bself\b/
        },
        {
          // eat "if" prior to string so that it won't accidentally be
          // labeled as an f-string
          beginKeywords: "if",
          relevance: 0
        },
        STRING,
        COMMENT_TYPE,
        hljs.HASH_COMMENT_MODE,
        {
          match: [
            /\bdef/,
            /\s+/,
            IDENT_RE3
          ],
          scope: {
            1: "keyword",
            3: "title.function"
          },
          contains: [PARAMS]
        },
        {
          variants: [
            {
              match: [
                /\bclass/,
                /\s+/,
                IDENT_RE3,
                /\s*/,
                /\(\s*/,
                IDENT_RE3,
                /\s*\)/
              ]
            },
            {
              match: [
                /\bclass/,
                /\s+/,
                IDENT_RE3
              ]
            }
          ],
          scope: {
            1: "keyword",
            3: "title.class",
            6: "title.class.inherited"
          }
        },
        {
          className: "meta",
          begin: /^[\t ]*@/,
          end: /(?=#)|$/,
          contains: [
            NUMBER,
            PARAMS,
            STRING
          ]
        }
      ]
    };
  }

  // node_modules/highlight.js/es/languages/swift.js
  function source(re) {
    if (!re) return null;
    if (typeof re === "string") return re;
    return re.source;
  }
  function lookahead(re) {
    return concat("(?=", re, ")");
  }
  function concat(...args) {
    const joined = args.map((x) => source(x)).join("");
    return joined;
  }
  function stripOptionsFromArgs(args) {
    const opts = args[args.length - 1];
    if (typeof opts === "object" && opts.constructor === Object) {
      args.splice(args.length - 1, 1);
      return opts;
    } else {
      return {};
    }
  }
  function either(...args) {
    const opts = stripOptionsFromArgs(args);
    const joined = "(" + (opts.capture ? "" : "?:") + args.map((x) => source(x)).join("|") + ")";
    return joined;
  }
  var keywordWrapper = (keyword) => concat(
    /\b/,
    keyword,
    /\w$/.test(keyword) ? /\b/ : /\B/
  );
  var dotKeywords = [
    "Protocol",
    // contextual
    "Type"
    // contextual
  ].map(keywordWrapper);
  var optionalDotKeywords = [
    "init",
    "self"
  ].map(keywordWrapper);
  var keywordTypes = [
    "Any",
    "Self"
  ];
  var keywords = [
    // strings below will be fed into the regular `keywords` engine while regex
    // will result in additional modes being created to scan for those keywords to
    // avoid conflicts with other rules
    "actor",
    "any",
    // contextual
    "associatedtype",
    "async",
    "await",
    /as\?/,
    // operator
    /as!/,
    // operator
    "as",
    // operator
    "borrowing",
    // contextual
    "break",
    "case",
    "catch",
    "class",
    "consume",
    // contextual
    "consuming",
    // contextual
    "continue",
    "convenience",
    // contextual
    "copy",
    // contextual
    "default",
    "defer",
    "deinit",
    "didSet",
    // contextual
    "distributed",
    "do",
    "dynamic",
    // contextual
    "each",
    "else",
    "enum",
    "extension",
    "fallthrough",
    /fileprivate\(set\)/,
    "fileprivate",
    "final",
    // contextual
    "for",
    "func",
    "get",
    // contextual
    "guard",
    "if",
    "import",
    "indirect",
    // contextual
    "infix",
    // contextual
    /init\?/,
    /init!/,
    "inout",
    /internal\(set\)/,
    "internal",
    "in",
    "is",
    // operator
    "isolated",
    // contextual
    "nonisolated",
    // contextual
    "lazy",
    // contextual
    "let",
    "macro",
    "mutating",
    // contextual
    "nonmutating",
    // contextual
    /open\(set\)/,
    // contextual
    "open",
    // contextual
    "operator",
    "optional",
    // contextual
    "override",
    // contextual
    "postfix",
    // contextual
    "precedencegroup",
    "prefix",
    // contextual
    /private\(set\)/,
    "private",
    "protocol",
    /public\(set\)/,
    "public",
    "repeat",
    "required",
    // contextual
    "rethrows",
    "return",
    "set",
    // contextual
    "some",
    // contextual
    "static",
    "struct",
    "subscript",
    "super",
    "switch",
    "throws",
    "throw",
    /try\?/,
    // operator
    /try!/,
    // operator
    "try",
    // operator
    "typealias",
    /unowned\(safe\)/,
    // contextual
    /unowned\(unsafe\)/,
    // contextual
    "unowned",
    // contextual
    "var",
    "weak",
    // contextual
    "where",
    "while",
    "willSet"
    // contextual
  ];
  var literals = [
    "false",
    "nil",
    "true"
  ];
  var precedencegroupKeywords = [
    "assignment",
    "associativity",
    "higherThan",
    "left",
    "lowerThan",
    "none",
    "right"
  ];
  var numberSignKeywords = [
    "#colorLiteral",
    "#column",
    "#dsohandle",
    "#else",
    "#elseif",
    "#endif",
    "#error",
    "#file",
    "#fileID",
    "#fileLiteral",
    "#filePath",
    "#function",
    "#if",
    "#imageLiteral",
    "#keyPath",
    "#line",
    "#selector",
    "#sourceLocation",
    "#warning"
  ];
  var builtIns = [
    "abs",
    "all",
    "any",
    "assert",
    "assertionFailure",
    "debugPrint",
    "dump",
    "fatalError",
    "getVaList",
    "isKnownUniquelyReferenced",
    "max",
    "min",
    "numericCast",
    "pointwiseMax",
    "pointwiseMin",
    "precondition",
    "preconditionFailure",
    "print",
    "readLine",
    "repeatElement",
    "sequence",
    "stride",
    "swap",
    "swift_unboxFromSwiftValueWithType",
    "transcode",
    "type",
    "unsafeBitCast",
    "unsafeDowncast",
    "withExtendedLifetime",
    "withUnsafeMutablePointer",
    "withUnsafePointer",
    "withVaList",
    "withoutActuallyEscaping",
    "zip"
  ];
  var operatorHead = either(
    /[/=\-+!*%<>&|^~?]/,
    /[\u00A1-\u00A7]/,
    /[\u00A9\u00AB]/,
    /[\u00AC\u00AE]/,
    /[\u00B0\u00B1]/,
    /[\u00B6\u00BB\u00BF\u00D7\u00F7]/,
    /[\u2016-\u2017]/,
    /[\u2020-\u2027]/,
    /[\u2030-\u203E]/,
    /[\u2041-\u2053]/,
    /[\u2055-\u205E]/,
    /[\u2190-\u23FF]/,
    /[\u2500-\u2775]/,
    /[\u2794-\u2BFF]/,
    /[\u2E00-\u2E7F]/,
    /[\u3001-\u3003]/,
    /[\u3008-\u3020]/,
    /[\u3030]/
  );
  var operatorCharacter = either(
    operatorHead,
    /[\u0300-\u036F]/,
    /[\u1DC0-\u1DFF]/,
    /[\u20D0-\u20FF]/,
    /[\uFE00-\uFE0F]/,
    /[\uFE20-\uFE2F]/
    // TODO: The following characters are also allowed, but the regex isn't supported yet.
    // /[\u{E0100}-\u{E01EF}]/u
  );
  var operator = concat(operatorHead, operatorCharacter, "*");
  var identifierHead = either(
    /[a-zA-Z_]/,
    /[\u00A8\u00AA\u00AD\u00AF\u00B2-\u00B5\u00B7-\u00BA]/,
    /[\u00BC-\u00BE\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/,
    /[\u0100-\u02FF\u0370-\u167F\u1681-\u180D\u180F-\u1DBF]/,
    /[\u1E00-\u1FFF]/,
    /[\u200B-\u200D\u202A-\u202E\u203F-\u2040\u2054\u2060-\u206F]/,
    /[\u2070-\u20CF\u2100-\u218F\u2460-\u24FF\u2776-\u2793]/,
    /[\u2C00-\u2DFF\u2E80-\u2FFF]/,
    /[\u3004-\u3007\u3021-\u302F\u3031-\u303F\u3040-\uD7FF]/,
    /[\uF900-\uFD3D\uFD40-\uFDCF\uFDF0-\uFE1F\uFE30-\uFE44]/,
    /[\uFE47-\uFEFE\uFF00-\uFFFD]/
    // Should be /[\uFE47-\uFFFD]/, but we have to exclude FEFF.
    // The following characters are also allowed, but the regexes aren't supported yet.
    // /[\u{10000}-\u{1FFFD}\u{20000-\u{2FFFD}\u{30000}-\u{3FFFD}\u{40000}-\u{4FFFD}]/u,
    // /[\u{50000}-\u{5FFFD}\u{60000-\u{6FFFD}\u{70000}-\u{7FFFD}\u{80000}-\u{8FFFD}]/u,
    // /[\u{90000}-\u{9FFFD}\u{A0000-\u{AFFFD}\u{B0000}-\u{BFFFD}\u{C0000}-\u{CFFFD}]/u,
    // /[\u{D0000}-\u{DFFFD}\u{E0000-\u{EFFFD}]/u
  );
  var identifierCharacter = either(
    identifierHead,
    /\d/,
    /[\u0300-\u036F\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/
  );
  var identifier = concat(identifierHead, identifierCharacter, "*");
  var typeIdentifier = concat(/[A-Z]/, identifierCharacter, "*");
  var keywordAttributes = [
    "attached",
    "autoclosure",
    concat(/convention\(/, either("swift", "block", "c"), /\)/),
    "discardableResult",
    "dynamicCallable",
    "dynamicMemberLookup",
    "escaping",
    "freestanding",
    "frozen",
    "GKInspectable",
    "IBAction",
    "IBDesignable",
    "IBInspectable",
    "IBOutlet",
    "IBSegueAction",
    "inlinable",
    "main",
    "nonobjc",
    "NSApplicationMain",
    "NSCopying",
    "NSManaged",
    concat(/objc\(/, identifier, /\)/),
    "objc",
    "objcMembers",
    "propertyWrapper",
    "requires_stored_property_inits",
    "resultBuilder",
    "Sendable",
    "testable",
    "UIApplicationMain",
    "unchecked",
    "unknown",
    "usableFromInline",
    "warn_unqualified_access"
  ];
  var availabilityKeywords = [
    "iOS",
    "iOSApplicationExtension",
    "macOS",
    "macOSApplicationExtension",
    "macCatalyst",
    "macCatalystApplicationExtension",
    "watchOS",
    "watchOSApplicationExtension",
    "tvOS",
    "tvOSApplicationExtension",
    "swift"
  ];
  function swift(hljs) {
    const WHITESPACE = {
      match: /\s+/,
      relevance: 0
    };
    const BLOCK_COMMENT = hljs.COMMENT(
      "/\\*",
      "\\*/",
      { contains: ["self"] }
    );
    const COMMENTS = [
      hljs.C_LINE_COMMENT_MODE,
      BLOCK_COMMENT
    ];
    const DOT_KEYWORD = {
      match: [
        /\./,
        either(...dotKeywords, ...optionalDotKeywords)
      ],
      className: { 2: "keyword" }
    };
    const KEYWORD_GUARD = {
      // Consume .keyword to prevent highlighting properties and methods as keywords.
      match: concat(/\./, either(...keywords)),
      relevance: 0
    };
    const PLAIN_KEYWORDS = keywords.filter((kw) => typeof kw === "string").concat(["_|0"]);
    const REGEX_KEYWORDS = keywords.filter((kw) => typeof kw !== "string").concat(keywordTypes).map(keywordWrapper);
    const KEYWORD = { variants: [
      {
        className: "keyword",
        match: either(...REGEX_KEYWORDS, ...optionalDotKeywords)
      }
    ] };
    const KEYWORDS3 = {
      $pattern: either(
        /\b\w+/,
        // regular keywords
        /#\w+/
        // number keywords
      ),
      keyword: PLAIN_KEYWORDS.concat(numberSignKeywords),
      literal: literals
    };
    const KEYWORD_MODES = [
      DOT_KEYWORD,
      KEYWORD_GUARD,
      KEYWORD
    ];
    const BUILT_IN_GUARD = {
      // Consume .built_in to prevent highlighting properties and methods.
      match: concat(/\./, either(...builtIns)),
      relevance: 0
    };
    const BUILT_IN = {
      className: "built_in",
      match: concat(/\b/, either(...builtIns), /(?=\()/)
    };
    const BUILT_INS3 = [
      BUILT_IN_GUARD,
      BUILT_IN
    ];
    const OPERATOR_GUARD = {
      // Prevent -> from being highlighting as an operator.
      match: /->/,
      relevance: 0
    };
    const OPERATOR = {
      className: "operator",
      relevance: 0,
      variants: [
        { match: operator },
        {
          // dot-operator: only operators that start with a dot are allowed to use dots as
          // characters (..., ...<, .*, etc). So there rule here is: a dot followed by one or more
          // characters that may also include dots.
          match: `\\.(\\.|${operatorCharacter})+`
        }
      ]
    };
    const OPERATORS = [
      OPERATOR_GUARD,
      OPERATOR
    ];
    const decimalDigits = "([0-9]_*)+";
    const hexDigits = "([0-9a-fA-F]_*)+";
    const NUMBER = {
      className: "number",
      relevance: 0,
      variants: [
        // decimal floating-point-literal (subsumes decimal-literal)
        { match: `\\b(${decimalDigits})(\\.(${decimalDigits}))?([eE][+-]?(${decimalDigits}))?\\b` },
        // hexadecimal floating-point-literal (subsumes hexadecimal-literal)
        { match: `\\b0x(${hexDigits})(\\.(${hexDigits}))?([pP][+-]?(${decimalDigits}))?\\b` },
        // octal-literal
        { match: /\b0o([0-7]_*)+\b/ },
        // binary-literal
        { match: /\b0b([01]_*)+\b/ }
      ]
    };
    const ESCAPED_CHARACTER = (rawDelimiter = "") => ({
      className: "subst",
      variants: [
        { match: concat(/\\/, rawDelimiter, /[0\\tnr"']/) },
        { match: concat(/\\/, rawDelimiter, /u\{[0-9a-fA-F]{1,8}\}/) }
      ]
    });
    const ESCAPED_NEWLINE = (rawDelimiter = "") => ({
      className: "subst",
      match: concat(/\\/, rawDelimiter, /[\t ]*(?:[\r\n]|\r\n)/)
    });
    const INTERPOLATION = (rawDelimiter = "") => ({
      className: "subst",
      label: "interpol",
      begin: concat(/\\/, rawDelimiter, /\(/),
      end: /\)/
    });
    const MULTILINE_STRING = (rawDelimiter = "") => ({
      begin: concat(rawDelimiter, /"""/),
      end: concat(/"""/, rawDelimiter),
      contains: [
        ESCAPED_CHARACTER(rawDelimiter),
        ESCAPED_NEWLINE(rawDelimiter),
        INTERPOLATION(rawDelimiter)
      ]
    });
    const SINGLE_LINE_STRING = (rawDelimiter = "") => ({
      begin: concat(rawDelimiter, /"/),
      end: concat(/"/, rawDelimiter),
      contains: [
        ESCAPED_CHARACTER(rawDelimiter),
        INTERPOLATION(rawDelimiter)
      ]
    });
    const STRING = {
      className: "string",
      variants: [
        MULTILINE_STRING(),
        MULTILINE_STRING("#"),
        MULTILINE_STRING("##"),
        MULTILINE_STRING("###"),
        SINGLE_LINE_STRING(),
        SINGLE_LINE_STRING("#"),
        SINGLE_LINE_STRING("##"),
        SINGLE_LINE_STRING("###")
      ]
    };
    const REGEXP_CONTENTS = [
      hljs.BACKSLASH_ESCAPE,
      {
        begin: /\[/,
        end: /\]/,
        relevance: 0,
        contains: [hljs.BACKSLASH_ESCAPE]
      }
    ];
    const BARE_REGEXP_LITERAL = {
      begin: /\/[^\s](?=[^/\n]*\/)/,
      end: /\//,
      contains: REGEXP_CONTENTS
    };
    const EXTENDED_REGEXP_LITERAL = (rawDelimiter) => {
      const begin = concat(rawDelimiter, /\//);
      const end = concat(/\//, rawDelimiter);
      return {
        begin,
        end,
        contains: [
          ...REGEXP_CONTENTS,
          {
            scope: "comment",
            begin: `#(?!.*${end})`,
            end: /$/
          }
        ]
      };
    };
    const REGEXP = {
      scope: "regexp",
      variants: [
        EXTENDED_REGEXP_LITERAL("###"),
        EXTENDED_REGEXP_LITERAL("##"),
        EXTENDED_REGEXP_LITERAL("#"),
        BARE_REGEXP_LITERAL
      ]
    };
    const QUOTED_IDENTIFIER = { match: concat(/`/, identifier, /`/) };
    const IMPLICIT_PARAMETER = {
      className: "variable",
      match: /\$\d+/
    };
    const PROPERTY_WRAPPER_PROJECTION = {
      className: "variable",
      match: `\\$${identifierCharacter}+`
    };
    const IDENTIFIERS = [
      QUOTED_IDENTIFIER,
      IMPLICIT_PARAMETER,
      PROPERTY_WRAPPER_PROJECTION
    ];
    const AVAILABLE_ATTRIBUTE = {
      match: /(@|#(un)?)available/,
      scope: "keyword",
      starts: { contains: [
        {
          begin: /\(/,
          end: /\)/,
          keywords: availabilityKeywords,
          contains: [
            ...OPERATORS,
            NUMBER,
            STRING
          ]
        }
      ] }
    };
    const KEYWORD_ATTRIBUTE = {
      scope: "keyword",
      match: concat(/@/, either(...keywordAttributes))
    };
    const USER_DEFINED_ATTRIBUTE = {
      scope: "meta",
      match: concat(/@/, identifier)
    };
    const ATTRIBUTES = [
      AVAILABLE_ATTRIBUTE,
      KEYWORD_ATTRIBUTE,
      USER_DEFINED_ATTRIBUTE
    ];
    const TYPE = {
      match: lookahead(/\b[A-Z]/),
      relevance: 0,
      contains: [
        {
          // Common Apple frameworks, for relevance boost
          className: "type",
          match: concat(/(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)/, identifierCharacter, "+")
        },
        {
          // Type identifier
          className: "type",
          match: typeIdentifier,
          relevance: 0
        },
        {
          // Optional type
          match: /[?!]+/,
          relevance: 0
        },
        {
          // Variadic parameter
          match: /\.\.\./,
          relevance: 0
        },
        {
          // Protocol composition
          match: concat(/\s+&\s+/, lookahead(typeIdentifier)),
          relevance: 0
        }
      ]
    };
    const GENERIC_ARGUMENTS = {
      begin: /</,
      end: />/,
      keywords: KEYWORDS3,
      contains: [
        ...COMMENTS,
        ...KEYWORD_MODES,
        ...ATTRIBUTES,
        OPERATOR_GUARD,
        TYPE
      ]
    };
    TYPE.contains.push(GENERIC_ARGUMENTS);
    const TUPLE_ELEMENT_NAME = {
      match: concat(identifier, /\s*:/),
      keywords: "_|0",
      relevance: 0
    };
    const TUPLE = {
      begin: /\(/,
      end: /\)/,
      relevance: 0,
      keywords: KEYWORDS3,
      contains: [
        "self",
        TUPLE_ELEMENT_NAME,
        ...COMMENTS,
        REGEXP,
        ...KEYWORD_MODES,
        ...BUILT_INS3,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...IDENTIFIERS,
        ...ATTRIBUTES,
        TYPE
      ]
    };
    const GENERIC_PARAMETERS = {
      begin: /</,
      end: />/,
      keywords: "repeat each",
      contains: [
        ...COMMENTS,
        TYPE
      ]
    };
    const FUNCTION_PARAMETER_NAME = {
      begin: either(
        lookahead(concat(identifier, /\s*:/)),
        lookahead(concat(identifier, /\s+/, identifier, /\s*:/))
      ),
      end: /:/,
      relevance: 0,
      contains: [
        {
          className: "keyword",
          match: /\b_\b/
        },
        {
          className: "params",
          match: identifier
        }
      ]
    };
    const FUNCTION_PARAMETERS = {
      begin: /\(/,
      end: /\)/,
      keywords: KEYWORDS3,
      contains: [
        FUNCTION_PARAMETER_NAME,
        ...COMMENTS,
        ...KEYWORD_MODES,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...ATTRIBUTES,
        TYPE,
        TUPLE
      ],
      endsParent: true,
      illegal: /["']/
    };
    const FUNCTION_OR_MACRO = {
      match: [
        /(func|macro)/,
        /\s+/,
        either(QUOTED_IDENTIFIER.match, identifier, operator)
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        GENERIC_PARAMETERS,
        FUNCTION_PARAMETERS,
        WHITESPACE
      ],
      illegal: [
        /\[/,
        /%/
      ]
    };
    const INIT_SUBSCRIPT = {
      match: [
        /\b(?:subscript|init[?!]?)/,
        /\s*(?=[<(])/
      ],
      className: { 1: "keyword" },
      contains: [
        GENERIC_PARAMETERS,
        FUNCTION_PARAMETERS,
        WHITESPACE
      ],
      illegal: /\[|%/
    };
    const OPERATOR_DECLARATION = {
      match: [
        /operator/,
        /\s+/,
        operator
      ],
      className: {
        1: "keyword",
        3: "title"
      }
    };
    const PRECEDENCEGROUP = {
      begin: [
        /precedencegroup/,
        /\s+/,
        typeIdentifier
      ],
      className: {
        1: "keyword",
        3: "title"
      },
      contains: [TYPE],
      keywords: [
        ...precedencegroupKeywords,
        ...literals
      ],
      end: /}/
    };
    for (const variant of STRING.variants) {
      const interpolation = variant.contains.find((mode) => mode.label === "interpol");
      interpolation.keywords = KEYWORDS3;
      const submodes = [
        ...KEYWORD_MODES,
        ...BUILT_INS3,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...IDENTIFIERS
      ];
      interpolation.contains = [
        ...submodes,
        {
          begin: /\(/,
          end: /\)/,
          contains: [
            "self",
            ...submodes
          ]
        }
      ];
    }
    return {
      name: "Swift",
      keywords: KEYWORDS3,
      contains: [
        ...COMMENTS,
        FUNCTION_OR_MACRO,
        INIT_SUBSCRIPT,
        {
          beginKeywords: "struct protocol class extension enum actor",
          end: "\\{",
          excludeEnd: true,
          keywords: KEYWORDS3,
          contains: [
            hljs.inherit(hljs.TITLE_MODE, {
              className: "title.class",
              begin: /[A-Za-z$_][\u00C0-\u02B80-9A-Za-z$_]*/
            }),
            ...KEYWORD_MODES
          ]
        },
        OPERATOR_DECLARATION,
        PRECEDENCEGROUP,
        {
          beginKeywords: "import",
          end: /$/,
          contains: [...COMMENTS],
          relevance: 0
        },
        REGEXP,
        ...KEYWORD_MODES,
        ...BUILT_INS3,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...IDENTIFIERS,
        ...ATTRIBUTES,
        TYPE,
        TUPLE
      ]
    };
  }

  // app/static/gitreader/modules/utils/highlight.ts
  core_default.registerLanguage("javascript", javascript);
  core_default.registerLanguage("typescript", typescript);
  core_default.registerLanguage("python", python);
  core_default.registerLanguage("swift", swift);
  if (core_default.registerAliases) {
    core_default.registerAliases(["js", "jsx"], { languageName: "javascript" });
    core_default.registerAliases(["ts", "tsx"], { languageName: "typescript" });
  }
  var hasHighlightSupport = () => typeof core_default.highlight === "function";

  // app/static/gitreader/modules/ui/reader.ts
  var ReaderView = class {
    constructor(deps) {
      this.deps = deps;
      __publicField(this, "snippetMode", "body");
      __publicField(this, "maxHighlightLines", 800);
    }
    // Exposes the current snippet mode so GitReaderApp can choose which section to fetch.
    getSnippetMode() {
      return this.snippetMode;
    }
    // Renders the reader code card for a symbol/snippet and updates reader state.
    renderCode(symbol, snippet) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
      const summary = (_b = (_a = snippet == null ? void 0 : snippet.summary) != null ? _a : symbol.summary) != null ? _b : "No summary yet.";
      const signature = (_d = (_c = snippet == null ? void 0 : snippet.signature) != null ? _c : symbol.signature) != null ? _d : "signature pending";
      const displayRange = this.getDisplayRange(symbol, snippet);
      const locationLabel = this.deps.formatLocation(symbol.location, displayRange.startLine, displayRange.endLine);
      const truncationLabel = (snippet == null ? void 0 : snippet.truncated) ? " (truncated)" : "";
      const language = this.deps.getHighlightLanguage((_e = symbol.location) == null ? void 0 : _e.path);
      const snippetHtml = this.renderSnippetLines(snippet, language);
      const revealLabel = (snippet == null ? void 0 : snippet.section) === "body" ? "Show body" : "Show code";
      const codeClass = this.deps.hasHighlightSupport() ? `hljs${language ? ` language-${language}` : ""}` : "";
      const breadcrumbHtml = this.deps.renderImportBreadcrumbs((_f = symbol.location) == null ? void 0 : _f.path);
      this.deps.setReaderState({
        currentSymbol: symbol,
        pendingSymbol: symbol,
        pendingSnippet: snippet != null ? snippet : null,
        readerTreeFocusPath: null,
        currentSnippetText: (_g = snippet == null ? void 0 : snippet.snippet) != null ? _g : "",
        currentSnippetStartLine: (_j = (_i = snippet == null ? void 0 : snippet.start_line) != null ? _i : (_h = symbol.location) == null ? void 0 : _h.start_line) != null ? _j : 1
      });
      const header = this.renderSnippetHeader({
        symbol,
        locationLabel,
        truncationLabel,
        breadcrumbHtml,
        summary,
        signature
      });
      const footer = this.renderSnippetFooter({
        revealLabel,
        codeClass,
        snippetHtml
      });
      this.deps.readerMeta.innerHTML = header;
      this.deps.codeSurface.innerHTML = `
            <article class="code-card code-card--body">
                ${footer}
            </article>
        `;
      this.deps.applyGuidedCodeFocus();
      this.deps.decorateImportLines(snippet, language);
      this.deps.applyFoldControls(symbol);
      this.deps.updateReaderControls();
    }
    // Renders the snippet header section (meta, breadcrumbs, actions, summary).
    renderSnippetHeader(params) {
      return `
            <div class="code-meta">
                <span>${this.deps.escapeHtml(params.symbol.kind.toUpperCase())}</span>
                <span>${this.deps.escapeHtml(params.locationLabel)}${this.deps.escapeHtml(params.truncationLabel)}</span>
            </div>
            ${params.breadcrumbHtml}
            <div class="code-actions">
                <button class="ghost-btn" data-reader-action="copy">Copy snippet</button>
                <div class="jump-control">
                    <label for="line-jump">Line</label>
                    <input id="line-jump" type="number" min="1" placeholder="Line" data-line-input>
                    <button class="ghost-btn" data-reader-action="jump">Go</button>
                </div>
                <span class="code-status" data-code-status></span>
            </div>
            <div>
                <h3>${this.deps.escapeHtml(params.symbol.name)}</h3>
                <p>${this.deps.escapeHtml(params.summary)}</p>
            </div>
            <div class="code-signature">${this.deps.escapeHtml(params.signature)}</div>
        `;
    }
    // Renders the snippet body footer (details + highlighted code).
    renderSnippetFooter(params) {
      return `
            <details class="code-details code-details--scroll" open>
                <summary>${params.revealLabel}</summary>
                <pre><code class="${params.codeClass}">${params.snippetHtml}</code></pre>
            </details>
        `;
    }
    // Converts a snippet response into HTML line spans with highlight markers.
    renderSnippetLines(snippet, language) {
      var _a, _b, _c;
      const rawBody = (_a = snippet == null ? void 0 : snippet.snippet) != null ? _a : "";
      const body = rawBody.trim().length > 0 ? rawBody : "# body not loaded yet";
      const startLine = (_b = snippet == null ? void 0 : snippet.start_line) != null ? _b : 1;
      const highlightSet = this.buildHighlightSet((_c = snippet == null ? void 0 : snippet.highlights) != null ? _c : []);
      const lineCount = body.split("\n").length;
      const rendered = this.highlightSnippet(body, language, lineCount);
      const lines = rendered.replace(/\n$/, "").split("\n");
      return lines.map((line, index) => {
        const lineNumber = startLine + index;
        const isHighlighted = highlightSet.has(lineNumber);
        const classes = isHighlighted ? "code-line is-highlight" : "code-line";
        return `<span class="${classes}" data-line="${lineNumber}"><span class="line-no">${lineNumber}</span><span class="line-text">${line}</span></span>`;
      }).join("");
    }
    // Applies highlight.js (if available) or falls back to escaped text.
    highlightSnippet(body, language, lineCount) {
      if (lineCount && lineCount > this.maxHighlightLines) {
        return this.deps.escapeHtml(body);
      }
      if (!this.deps.hasHighlightSupport()) {
        return this.deps.escapeHtml(body);
      }
      if (language && core_default.getLanguage && core_default.getLanguage(language)) {
        return core_default.highlight(body, { language }).value;
      }
      return core_default.highlightAuto(body).value;
    }
    // Handles snippet mode switching and triggers re-fetch when needed.
    async setSnippetMode(mode) {
      var _a;
      if (this.snippetMode === mode && !this.deps.getReaderTreeFocusPath()) {
        return;
      }
      this.snippetMode = mode;
      this.deps.clearSnippetCache();
      this.updateSnippetModeUi();
      if (this.deps.getReaderTreeFocusPath()) {
        this.deps.setReaderTreeFocusPath(null);
        const pendingSymbol = this.deps.getPendingSymbol();
        if (pendingSymbol) {
          this.renderCode(pendingSymbol, (_a = this.deps.getPendingSnippet()) != null ? _a : void 0);
          return;
        }
      }
      const currentSymbol = this.deps.getCurrentSymbol();
      if (currentSymbol) {
        const narrate = !this.deps.isActiveStoryArc() && !this.deps.isTourActive();
        await this.deps.loadSymbolSnippet(currentSymbol, narrate);
        const activeArc = this.deps.getActiveStoryArc();
        if (activeArc) {
          this.deps.renderStoryArc(activeArc);
        } else if (this.deps.isTourActive()) {
          const step = this.deps.getTourStep();
          if (step) {
            this.deps.renderTourStep(step);
          }
        }
      }
    }
    // Syncs the snippet mode UI buttons with the active mode.
    updateSnippetModeUi() {
      this.deps.snippetModeButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.snippetMode === this.snippetMode);
      });
    }
    // Converts highlight ranges into a lookup set for efficient line marking.
    buildHighlightSet(highlights) {
      const highlightSet = /* @__PURE__ */ new Set();
      highlights.forEach((range) => {
        const start = Math.min(range.start_line, range.end_line);
        const end = Math.max(range.start_line, range.end_line);
        for (let line = start; line <= end; line += 1) {
          highlightSet.add(line);
        }
      });
      return highlightSet;
    }
    // Computes the snippet display range so the header line label stays accurate.
    getDisplayRange(symbol, snippet) {
      var _a, _b;
      if ((snippet == null ? void 0 : snippet.section) === "body" && snippet.start_line) {
        return { startLine: snippet.start_line, endLine: snippet.end_line };
      }
      if ((symbol.kind === "function" || symbol.kind === "method" || symbol.kind === "class") && ((_a = symbol.location) == null ? void 0 : _a.start_line)) {
        return {
          startLine: symbol.location.start_line,
          endLine: symbol.location.end_line || (snippet == null ? void 0 : snippet.end_line) || symbol.location.start_line
        };
      }
      if (snippet == null ? void 0 : snippet.start_line) {
        return { startLine: snippet.start_line, endLine: snippet.end_line };
      }
      if ((_b = symbol.location) == null ? void 0 : _b.start_line) {
        return { startLine: symbol.location.start_line, endLine: symbol.location.end_line };
      }
      return {};
    }
  };

  // app/static/gitreader/modules/ui/breadcrumbs.ts
  function renderImportBreadcrumbs(path, breadcrumbs) {
    if (!path || breadcrumbs.length < 2) {
      return "";
    }
    const normalized = normalizePath(path);
    const currentIndex = breadcrumbs.lastIndexOf(normalized);
    if (currentIndex < 0) {
      return "";
    }
    const items = breadcrumbs.map((crumbPath, index) => {
      const label = escapeHtml(getBreadcrumbLabel(crumbPath));
      const escapedPath = escapeHtml(crumbPath);
      const isCurrent = index === currentIndex;
      const currentAttr = isCurrent ? ' aria-current="page"' : "";
      const currentClass = isCurrent ? " is-current" : "";
      return `<button class="breadcrumb${currentClass}" data-breadcrumb-path="${escapedPath}"${currentAttr}>${label}</button>`;
    });
    return `
        <nav class="code-breadcrumbs" aria-label="Import trail">
            ${items.join('<span class="breadcrumb-sep">&gt;</span>')}
        </nav>
    `;
  }

  // app/static/gitreader/modules/ui/readerInteractions.ts
  var ReaderInteractions = class {
    // Captures app dependencies so reader handlers can orchestrate navigation and UI updates.
    constructor(deps) {
      this.deps = deps;
      __publicField(this, "importModal", null);
      __publicField(this, "importModalMessage", null);
    }
    // Handles reader click interactions (folds, breadcrumbs, imports, cmd-click).
    handleCodeSurfaceClick(event) {
      const target = event.target;
      const foldToggle = target.closest("[data-fold-toggle]");
      if (foldToggle) {
        const foldId = foldToggle.dataset.foldToggle;
        if (foldId) {
          this.toggleFold(foldId);
        }
        return;
      }
      const breadcrumbTarget = target.closest("[data-breadcrumb-path]");
      if (breadcrumbTarget) {
        const path = breadcrumbTarget.dataset.breadcrumbPath;
        if (path) {
          this.navigateBreadcrumb(path);
        }
        return;
      }
      const actionTarget = target.closest("[data-reader-action]");
      if (actionTarget) {
        const action = actionTarget.dataset.readerAction;
        if (action === "copy") {
          this.deps.copySnippet();
        } else if (action === "jump") {
          this.deps.jumpToInputLine();
        }
        return;
      }
      const importTarget = target.closest("[data-import-name]");
      if (importTarget) {
        const importName = importTarget.dataset.importName;
        if (importName) {
          if (this.deps.isModifierClick(event)) {
            this.handleImportJump(importName, importTarget.closest(".code-line"));
          } else {
            this.highlightImportUsage(importName);
          }
        }
        return;
      }
      const importLine = target.closest(".code-line[data-imports]");
      if (importLine) {
        const imports = (importLine.dataset.imports || "").split(",").map((value) => value.trim()).filter(Boolean);
        if (imports.length > 0) {
          if (this.deps.isModifierClick(event)) {
            this.handleImportJump(imports[0], importLine);
          } else {
            this.highlightImportUsage(imports[0]);
          }
        }
        return;
      }
      if (this.handleDefinitionJump(event, target)) {
        return;
      }
    }
    // Handles keydown events in the reader (line jump input).
    handleCodeSurfaceKeydown(event) {
      const target = event.target;
      if (event.key === "Enter" && target.matches("[data-line-input]")) {
        event.preventDefault();
        this.deps.jumpToInputLine();
      }
    }
    // Switches the reader into file tree mode for the current file/folder context.
    showReaderFileTreeForCurrent() {
      var _a, _b, _c;
      const path = (_c = (_b = (_a = this.deps.state.getCurrentSymbol()) == null ? void 0 : _a.location) == null ? void 0 : _b.path) != null ? _c : this.deps.state.getReaderTreeFocusPath();
      if (!path) {
        return;
      }
      this.renderReaderFileTree(path);
      this.deps.renderFileTree(path);
      this.updateReaderControls();
    }
    // Renders the file tree inside the reader, updating shared state as needed.
    renderReaderFileTree(focusPath) {
      const normalized = normalizePath(focusPath);
      const state = this.deps.state;
      state.setReaderState({
        readerTreeFocusPath: normalized || null,
        currentSymbol: null,
        currentSnippetText: "",
        currentSnippetStartLine: 1
      });
      const { html } = this.deps.fileTreeView.renderReaderTree(normalized);
      const treeHtml = html;
      this.deps.readerMeta.innerHTML = `
            <div class="code-meta">
                <span>FOLDER</span>
                <span>${escapeHtml(normalized || "Repository")}</span>
            </div>
            <div class="code-actions">
                <span class="code-status">Folder contents</span>
            </div>
        `;
      this.deps.codeSurface.innerHTML = `
            <article class="code-card code-card--body">
                <div class="code-details code-details--scroll">
                    <div class="file-tree">${treeHtml}</div>
                </div>
            </article>
        `;
      this.updateReaderControls();
    }
    // Keeps reader controls in sync with file tree vs snippet view state.
    updateReaderControls() {
      if (!this.deps.readerFileTreeButton) {
        return;
      }
      const isFileTree = Boolean(this.deps.state.getReaderTreeFocusPath());
      this.deps.readerFileTreeButton.classList.toggle("is-active", isFileTree);
      if (isFileTree) {
        this.deps.snippetModeButtons.forEach((button) => button.classList.remove("is-active"));
      } else {
        this.deps.updateSnippetModeUi();
      }
    }
    // Builds the reader breadcrumb HTML from the current import trail.
    renderImportBreadcrumbs(path) {
      return renderImportBreadcrumbs(path, this.deps.state.getImportBreadcrumbs());
    }
    // Decorates import statements in the rendered snippet so tokens are clickable.
    decorateImportLines(snippet, language) {
      var _a, _b;
      if (!(snippet == null ? void 0 : snippet.snippet) || !this.deps.state.getCurrentSymbol() || ((_a = this.deps.state.getCurrentSymbol()) == null ? void 0 : _a.kind) !== "file") {
        return;
      }
      this.clearImportUsageHighlights();
      const raw = snippet.snippet.replace(/\n$/, "");
      if (!raw) {
        return;
      }
      const lines = raw.split("\n");
      const startLine = (_b = snippet.start_line) != null ? _b : 1;
      const isJsFamily = language === "javascript" || language === "typescript" || language === "tsx";
      if (isJsFamily) {
        const blocks = this.findJSImportBlocks(lines);
        if (blocks.length > 0) {
          blocks.forEach((block) => {
            const normalized = block.text.replace(/\s+/g, " ").trim();
            const importNames = this.extractImportNames(normalized, language);
            if (importNames.length === 0) {
              return;
            }
            for (let index = block.start; index <= block.end; index += 1) {
              const lineText = lines[index];
              const lineImports = this.filterImportNamesForLine(lineText, importNames);
              if (lineImports.length === 0) {
                continue;
              }
              const lineNumber = startLine + index;
              const lineEl = this.deps.codeSurface.querySelector(`[data-line="${lineNumber}"]`);
              if (!lineEl) {
                continue;
              }
              lineEl.dataset.imports = lineImports.join(",");
              lineEl.dataset.importStatement = normalized;
              this.decorateImportLine(lineEl, lineImports);
            }
          });
          return;
        }
      }
      lines.forEach((lineText, index) => {
        const importNames = this.extractImportNames(lineText, language);
        if (importNames.length === 0) {
          return;
        }
        const lineNumber = startLine + index;
        const lineEl = this.deps.codeSurface.querySelector(`[data-line="${lineNumber}"]`);
        if (!lineEl) {
          return;
        }
        lineEl.dataset.imports = importNames.join(",");
        this.decorateImportLine(lineEl, importNames);
      });
    }
    // Adds fold toggles to the rendered file and syncs them with fold state.
    applyFoldControls(symbol) {
      var _a;
      if (symbol.kind !== "file" || !((_a = symbol.location) == null ? void 0 : _a.path)) {
        this.deps.state.setCurrentFoldRanges(/* @__PURE__ */ new Map());
        this.deps.state.setCurrentFoldPath(null);
        return;
      }
      const path = normalizePath(symbol.location.path);
      const ranges = this.getFoldableRangesForPath(path);
      this.deps.state.setCurrentFoldRanges(new Map(ranges.map((range) => [range.id, range])));
      this.deps.state.setCurrentFoldPath(path);
      const foldedSymbolIds = this.deps.state.getFoldedSymbolIds();
      ranges.forEach((range) => {
        var _a2, _b;
        const lineEl = this.deps.codeSurface.querySelector(`[data-line="${range.start}"]`);
        if (!lineEl) {
          return;
        }
        if (lineEl.dataset.foldId === range.id) {
          return;
        }
        lineEl.dataset.foldId = range.id;
        lineEl.dataset.foldEnd = String(range.end);
        lineEl.classList.add("is-fold-start");
        const lineNo = lineEl.querySelector(".line-no");
        if (!lineNo) {
          return;
        }
        const lineNumber = ((_b = (_a2 = lineEl.dataset.line) != null ? _a2 : lineNo.textContent) != null ? _b : "").trim();
        lineNo.textContent = "";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "fold-toggle";
        button.dataset.foldToggle = range.id;
        button.setAttribute("aria-label", `Toggle ${range.kind} ${range.name}`);
        button.textContent = foldedSymbolIds.has(range.id) ? "+" : "-";
        const numberSpan = document.createElement("span");
        numberSpan.className = "line-num";
        numberSpan.textContent = lineNumber;
        lineNo.append(button, numberSpan);
      });
      this.refreshFoldVisibility();
    }
    // Wraps matching import identifiers in a line with clickable tokens.
    decorateImportLine(lineEl, importNames) {
      if (importNames.length === 0) {
        return;
      }
      const escaped = importNames.map((name) => this.escapeRegex(name));
      const matcher = new RegExp(`\\b(${escaped.join("|")})\\b`, "g");
      const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          if (!node.textContent || !matcher.test(node.textContent)) {
            matcher.lastIndex = 0;
            return NodeFilter.FILTER_REJECT;
          }
          matcher.lastIndex = 0;
          const parent = node.parentElement;
          if (!parent || parent.closest(".line-no")) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.closest(".code-import")) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const textNodes = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }
      textNodes.forEach((textNode) => {
        var _a, _b;
        const text = (_a = textNode.textContent) != null ? _a : "";
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match = matcher.exec(text);
        while (match) {
          const start = match.index;
          const end = start + match[0].length;
          if (start > lastIndex) {
            fragment.append(text.slice(lastIndex, start));
          }
          const button = document.createElement("button");
          button.type = "button";
          button.className = "code-import";
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
        (_b = textNode.parentNode) == null ? void 0 : _b.replaceChild(fragment, textNode);
      });
    }
    // Updates the breadcrumb trail when navigation jumps between files.
    updateImportBreadcrumbs(fromPath, toPath) {
      const from = normalizePath(fromPath);
      const to = normalizePath(toPath);
      if (!from || !to) {
        return;
      }
      const breadcrumbs = this.deps.state.getImportBreadcrumbs();
      const last = breadcrumbs[breadcrumbs.length - 1];
      let next = breadcrumbs;
      if (!last || last !== from) {
        next = [from];
      }
      if (from !== to && next[next.length - 1] !== to) {
        next = [...next, to];
      }
      if (next !== breadcrumbs) {
        this.deps.state.setImportBreadcrumbs(next);
      }
    }
    // Navigates to a breadcrumb path when the reader header buttons are clicked.
    navigateBreadcrumb(path) {
      const normalized = normalizePath(path);
      const breadcrumbs = this.deps.state.getImportBreadcrumbs();
      const index = breadcrumbs.lastIndexOf(normalized);
      if (index < 0) {
        this.deps.state.setImportBreadcrumbs([normalized]);
      }
      const fileNode = this.deps.state.getFileNodesByPath().get(normalized);
      if (!fileNode) {
        this.deps.setCodeStatus(`"${normalized}" is not indexed in this project.`);
        return;
      }
      this.deps.jumpToSymbol(fileNode);
    }
    // Groups multi-line JS import/export blocks so we decorate every line in the block.
    findJSImportBlocks(lines) {
      const blocks = [];
      let inBlock = false;
      let blockStart = 0;
      let blockText = "";
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!inBlock) {
          if (!this.isJSImportStart(trimmed)) {
            return;
          }
          inBlock = true;
          blockStart = index;
          blockText = trimmed;
          if (this.isJSImportComplete(blockText)) {
            blocks.push({ start: blockStart, end: index, text: blockText });
            inBlock = false;
            blockText = "";
          }
          return;
        }
        if (trimmed) {
          blockText = blockText ? `${blockText} ${trimmed}` : trimmed;
        }
        if (this.isJSImportComplete(blockText)) {
          blocks.push({ start: blockStart, end: index, text: blockText });
          inBlock = false;
          blockText = "";
        }
      });
      if (inBlock) {
        blocks.push({ start: blockStart, end: lines.length - 1, text: blockText });
      }
      return blocks;
    }
    // Detects the start of a JS import/export statement so blocks can be collected.
    isJSImportStart(trimmed) {
      if (!trimmed) {
        return false;
      }
      if (trimmed.startsWith("import(")) {
        return false;
      }
      return /^import\b/.test(trimmed) || /^export\b/.test(trimmed);
    }
    // Determines when a JS import/export statement is complete for block grouping.
    isJSImportComplete(statement) {
      const normalized = statement.replace(/\s+/g, " ").trim();
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
      return normalized.endsWith(";");
    }
    // Filters import names to those actually present on the given line.
    filterImportNamesForLine(lineText, importNames) {
      if (!lineText || importNames.length === 0) {
        return [];
      }
      return importNames.filter((name) => {
        const matcher = new RegExp(`\\b${this.escapeRegex(name)}\\b`);
        return matcher.test(lineText);
      });
    }
    // Highlights usage lines for an import and scrolls to the first match.
    highlightImportUsage(importName) {
      if (!importName) {
        return;
      }
      this.clearImportUsageHighlights();
      const lines = Array.from(this.deps.codeSurface.querySelectorAll(".code-line"));
      let firstMatch = null;
      let matchCount = 0;
      lines.forEach((line) => {
        const imports = (line.dataset.imports || "").split(",").map((value) => value.trim());
        if (imports.includes(importName)) {
          return;
        }
        if (this.lineHasIdentifierUsage(line, importName)) {
          line.classList.add("is-import-usage");
          matchCount += 1;
          if (!firstMatch) {
            firstMatch = line;
          }
        }
      });
      if (!firstMatch) {
        this.deps.setCodeStatus(`No usages of ${importName} in this snippet.`);
        return;
      }
      this.deps.setCodeStatus(`Found ${matchCount} usage${matchCount === 1 ? "" : "s"} of ${importName}.`);
      firstMatch.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Resolves cmd/ctrl-clicked imports into definitions and navigates the reader.
    handleImportJump(importName, lineEl) {
      var _a, _b, _c, _d, _e;
      const lineText = this.getLineTextForElement(lineEl != null ? lineEl : void 0);
      const language = this.deps.getHighlightLanguage((_b = (_a = this.deps.state.getCurrentSymbol()) == null ? void 0 : _a.location) == null ? void 0 : _b.path);
      const currentPath = (_d = (_c = this.deps.state.getCurrentSymbol()) == null ? void 0 : _c.location) == null ? void 0 : _d.path;
      const statement = (_e = lineEl == null ? void 0 : lineEl.dataset.importStatement) != null ? _e : lineText;
      const target = this.resolveImportTarget(importName, statement, language, currentPath);
      if (target) {
        const definitionName = this.getImportDefinitionName(importName, statement, language);
        this.navigateToSymbolDefinition(target, currentPath, definitionName);
        return;
      }
      const sourceLabel = statement ? ` from "${statement.trim()}"` : "";
      this.showImportModal(`"${importName}" is not defined in this project${sourceLabel}.`);
    }
    // Extracts a line of text for a code line element, preferring raw snippet text.
    getLineTextForElement(lineEl) {
      var _a;
      if (!lineEl) {
        return "";
      }
      const lineNumber = Number(lineEl.dataset.line);
      if (Number.isFinite(lineNumber) && this.deps.state.getCurrentSnippetText()) {
        const lines = this.deps.state.getCurrentSnippetText().replace(/\n$/, "").split("\n");
        const index = lineNumber - this.deps.state.getCurrentSnippetStartLine();
        if (index >= 0 && index < lines.length) {
          return lines[index];
        }
      }
      const textEl = lineEl.querySelector(".line-text");
      return (_a = textEl == null ? void 0 : textEl.textContent) != null ? _a : "";
    }
    // Routes import resolution based on the current snippet language.
    resolveImportTarget(importName, lineText, language, currentPath) {
      const normalizedPath = currentPath ? normalizePath(currentPath) : "";
      if (language === "python") {
        return this.resolvePythonImportTarget(importName, lineText, normalizedPath);
      }
      if (language === "swift") {
        return this.resolveSwiftImportTarget(importName, lineText);
      }
      if (language === "javascript" || language === "typescript" || language === "tsx") {
        return this.resolveJsImportTarget(importName, lineText, normalizedPath);
      }
      return null;
    }
    // Resolves Python import statements to candidate files or symbols.
    resolvePythonImportTarget(importName, lineText, currentPath) {
      var _a;
      const entry = this.parsePythonImportEntry(lineText, importName);
      if (!entry) {
        return null;
      }
      const candidates = this.resolvePythonModuleCandidates(entry.module, currentPath);
      if (!entry.importedName) {
        return this.findFileByCandidates(candidates);
      }
      const symbolName = (_a = entry.importedName) != null ? _a : importName;
      const symbol = this.findSymbolInFiles(symbolName, candidates);
      if (symbol) {
        return symbol;
      }
      const fileNode = this.findFileByCandidates(candidates);
      if (fileNode) {
        return fileNode;
      }
      if (entry.importedName) {
        const extended = this.resolvePythonModuleCandidates(`${entry.module}.${entry.importedName}`, currentPath);
        const extendedFile = this.findFileByCandidates(extended);
        if (extendedFile) {
          return extendedFile;
        }
      }
      return null;
    }
    // Resolves JS/TS import statements to candidate files or symbols.
    resolveJsImportTarget(importName, lineText, currentPath) {
      var _a;
      const info = this.parseJsImportEntry(lineText, importName);
      if (!info || !info.source) {
        return null;
      }
      if (!this.isRelativeImport(info.source)) {
        return null;
      }
      const candidates = this.resolveJsModuleCandidates(info.source, currentPath);
      if (candidates.length === 0) {
        return null;
      }
      const importedName = (_a = info.importedName) != null ? _a : importName;
      const symbol = this.findSymbolInFiles(importedName, candidates);
      if (symbol) {
        return symbol;
      }
      return this.findFileByCandidates(candidates);
    }
    // Resolves Swift import statements to a matching module file if present.
    resolveSwiftImportTarget(importName, lineText) {
      const moduleName = this.parseSwiftImportModule(lineText);
      if (!moduleName) {
        return null;
      }
      const moduleFile = this.findSwiftModuleFile(moduleName);
      if (moduleFile) {
        return moduleFile;
      }
      if (moduleName !== importName) {
        return this.findSwiftModuleFile(importName);
      }
      return null;
    }
    // Parses a Python import line to identify module and imported symbol.
    parsePythonImportEntry(lineText, importName) {
      var _a, _b;
      const trimmed = lineText.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return null;
      }
      if (trimmed.startsWith("import ")) {
        const rest = trimmed.slice("import ".length);
        const parts = rest.split(",");
        for (const part of parts) {
          const piece = part.trim();
          if (!piece) {
            continue;
          }
          const segments = piece.split(/\s+as\s+/);
          const modulePart = segments[0].trim();
          const local = ((_a = segments[1]) != null ? _a : modulePart).trim();
          if (local === importName) {
            return { module: modulePart };
          }
        }
        return null;
      }
      if (trimmed.startsWith("from ")) {
        const match = trimmed.match(/^from\s+(\S+)\s+import\s+(.+)$/);
        if (!match) {
          return null;
        }
        const modulePart = match[1].trim();
        const importPart = match[2].split("#")[0].trim();
        const parts = importPart.split(",");
        for (const part of parts) {
          const piece = part.trim();
          if (!piece || piece === "*") {
            continue;
          }
          const segments = piece.split(/\s+as\s+/);
          const imported = segments[0].trim();
          const local = ((_b = segments[1]) != null ? _b : imported).trim();
          if (local === importName) {
            return { module: modulePart, importedName: imported };
          }
        }
      }
      return null;
    }
    // Picks the best expected symbol name for a clicked import (handles aliases).
    getImportDefinitionName(importName, statement, language) {
      var _a, _b;
      if (!statement) {
        return null;
      }
      if (language === "python") {
        const entry = this.parsePythonImportEntry(statement, importName);
        return (_a = entry == null ? void 0 : entry.importedName) != null ? _a : null;
      }
      if (language === "javascript" || language === "typescript" || language === "tsx") {
        const entry = this.parseJsImportEntry(statement, importName);
        if (!entry) {
          return null;
        }
        return (_b = entry.importedName) != null ? _b : importName;
      }
      return null;
    }
    // Parses JS/TS import/export lines to determine module source and local name mapping.
    parseJsImportEntry(lineText, importName) {
      const importMatch = lineText.match(/^import\s+(?:type\s+)?(.+?)\s+from\s+['"]([^'"]+)['"]/);
      const exportMatch = lineText.match(/^export\s+(?:type\s+)?(.+?)\s+from\s+['"]([^'"]+)['"]/);
      const match = importMatch != null ? importMatch : exportMatch;
      if (match) {
        const binding = match[1];
        const source2 = match[2];
        const nameMap = this.parseJsImportBindingsMap(binding);
        if (nameMap.has(importName)) {
          return { source: source2, importedName: nameMap.get(importName) };
        }
        return { source: source2 };
      }
      const importEqualsMatch = lineText.match(/^import\s+([A-Za-z_$][\w$]*)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (importEqualsMatch) {
        const local = importEqualsMatch[1];
        const source2 = importEqualsMatch[2];
        if (local === importName) {
          return { source: source2, importedName: local };
        }
        return { source: source2 };
      }
      const requireMatch = lineText.match(/^(?:const|let|var)\s+(.+?)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (requireMatch) {
        const binding = requireMatch[1];
        const source2 = requireMatch[2];
        const nameMap = this.parseJsRequireBindingMap(binding);
        if (nameMap.has(importName)) {
          return { source: source2, importedName: nameMap.get(importName) };
        }
        return { source: source2 };
      }
      return null;
    }
    // Extracts the module name from a Swift import statement.
    parseSwiftImportModule(lineText) {
      const trimmed = lineText.trim();
      if (!trimmed.startsWith("import ")) {
        return null;
      }
      const rest = trimmed.slice("import ".length).trim();
      const moduleName = rest.split(/\s+/)[0];
      return moduleName || null;
    }
    // Builds a map of local import names to original names for ES module bindings.
    parseJsImportBindingsMap(binding) {
      var _a;
      const map = /* @__PURE__ */ new Map();
      const trimmed = binding.trim();
      if (!trimmed) {
        return map;
      }
      if (trimmed.startsWith("{")) {
        this.fillBraceListMap(trimmed, map);
        return map;
      }
      if (trimmed.startsWith("*")) {
        const starMatch = trimmed.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
        if (starMatch) {
          map.set(starMatch[1], starMatch[1]);
        }
        return map;
      }
      const parts = trimmed.split(",");
      const defaultName = (_a = parts[0]) == null ? void 0 : _a.trim();
      if (defaultName) {
        map.set(defaultName, defaultName);
      }
      if (parts.length > 1) {
        const rest = parts.slice(1).join(",").trim();
        if (rest.startsWith("{")) {
          this.fillBraceListMap(rest, map);
        } else if (rest.startsWith("*")) {
          const starMatch = rest.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
          if (starMatch) {
            map.set(starMatch[1], starMatch[1]);
          }
        }
      }
      return map;
    }
    // Builds a map of local require bindings to their source names.
    parseJsRequireBindingMap(binding) {
      const map = /* @__PURE__ */ new Map();
      const trimmed = binding.trim();
      if (!trimmed) {
        return map;
      }
      if (trimmed.startsWith("{")) {
        this.fillBraceListMap(trimmed, map);
        return map;
      }
      if (trimmed.startsWith("[")) {
        return map;
      }
      const local = trimmed.split(/\s+/)[0];
      if (local) {
        map.set(local, local);
      }
      return map;
    }
    // Fills a mapping based on brace-list import syntax for JS/TS.
    fillBraceListMap(segment, map) {
      const content = segment.replace(/^{/, "").replace(/}.*$/, "");
      content.split(",").map((part) => part.trim()).forEach((part) => {
        if (!part) {
          return;
        }
        if (part.includes(" as ")) {
          const [imported, local] = part.split(/\s+as\s+/);
          if (local && imported) {
            map.set(local.trim(), imported.trim());
          }
          return;
        }
        if (part.includes(":")) {
          const [imported, local] = part.split(":");
          if (local && imported) {
            map.set(local.trim(), imported.trim());
          }
          return;
        }
        map.set(part, part);
      });
    }
    // Resolves Python module names to candidate file paths.
    resolvePythonModuleCandidates(modulePath, currentPath) {
      if (!modulePath) {
        return [];
      }
      const normalizedCurrent = currentPath ? normalizePath(currentPath) : "";
      const baseDir = normalizedCurrent.split("/").slice(0, -1).join("/");
      const relativeMatch = modulePath.match(/^(\.+)(.*)$/);
      let baseParts = baseDir ? baseDir.split("/").filter(Boolean) : [];
      let remainder = modulePath;
      if (relativeMatch) {
        const dots = relativeMatch[1].length;
        remainder = relativeMatch[2] || "";
        for (let i = 1; i < dots; i += 1) {
          baseParts = baseParts.slice(0, -1);
        }
      }
      const moduleSuffix = remainder.replace(/^\./, "");
      const modulePathParts = moduleSuffix ? moduleSuffix.split(".").filter(Boolean) : [];
      const joined = [...baseParts, ...modulePathParts].join("/");
      if (!joined) {
        return [];
      }
      return [`${joined}.py`, `${joined}/__init__.py`];
    }
    // Resolves JS module paths to possible file candidates for local imports.
    resolveJsModuleCandidates(modulePath, currentPath) {
      const extensions = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];
      const normalizedCurrent = currentPath ? normalizePath(currentPath) : "";
      const baseDir = normalizedCurrent.split("/").slice(0, -1).join("/");
      const resolved = this.resolvePath(baseDir, modulePath);
      if (!resolved) {
        return [];
      }
      const hasExtension = extensions.some((ext) => resolved.endsWith(ext));
      if (hasExtension) {
        return [resolved];
      }
      const candidates = extensions.map((ext) => `${resolved}${ext}`);
      extensions.forEach((ext) => candidates.push(`${resolved}/index${ext}`));
      return candidates;
    }
    // Determines whether a JS import source is a relative/local path.
    isRelativeImport(modulePath) {
      return modulePath.startsWith(".") || modulePath.startsWith("/");
    }
    // Resolves relative path segments against a base directory for import lookup.
    resolvePath(baseDir, relative) {
      const cleaned = relative.startsWith("/") ? relative.slice(1) : relative;
      const parts = [...baseDir ? baseDir.split("/").filter(Boolean) : [], ...cleaned.split("/")];
      const stack = [];
      parts.forEach((part) => {
        if (!part || part === ".") {
          return;
        }
        if (part === "..") {
          stack.pop();
          return;
        }
        stack.push(part);
      });
      return stack.join("/");
    }
    // Finds a Swift module file matching the import name.
    findSwiftModuleFile(moduleName) {
      if (!moduleName) {
        return null;
      }
      const target = `${moduleName}.swift`;
      for (const [path, node] of this.deps.state.getFileNodesByPath().entries()) {
        if (path.endsWith(`/${target}`) || path === target) {
          return node;
        }
      }
      return null;
    }
    // Searches candidate files for a named symbol within the graph node list.
    findSymbolInFiles(symbolName, candidates) {
      var _a;
      if (!symbolName || candidates.length === 0) {
        return null;
      }
      const candidateSet = new Set(candidates.map((path) => normalizePath(path)));
      return (_a = this.deps.state.getGraphNodes().find((node) => {
        var _a2;
        if (!((_a2 = node.location) == null ? void 0 : _a2.path) || node.kind === "external" || node.kind === "folder") {
          return false;
        }
        if (node.name !== symbolName) {
          return false;
        }
        return candidateSet.has(normalizePath(node.location.path));
      })) != null ? _a : null;
    }
    // Picks the first file node that matches a list of possible file paths.
    findFileByCandidates(candidates) {
      for (const candidate of candidates) {
        const normalized = normalizePath(candidate);
        const node = this.deps.state.getFileNodesByPath().get(normalized);
        if (node) {
          return node;
        }
      }
      return null;
    }
    // Creates the import modal lazily the first time a missing import is shown.
    ensureImportModal() {
      if (this.importModal) {
        return;
      }
      const modal = document.createElement("div");
      modal.className = "import-modal";
      modal.setAttribute("aria-hidden", "true");
      modal.innerHTML = `
            <div class="import-modal__backdrop" data-import-modal-close></div>
            <div class="import-modal__dialog" role="dialog" aria-modal="true" aria-label="Import lookup">
                <h3>Not in this project</h3>
                <p class="import-modal__message"></p>
                <div class="import-modal__actions">
                    <button class="ghost-btn" type="button" data-import-modal-close>Close</button>
                </div>
            </div>
        `;
      modal.addEventListener("click", (event) => {
        const target = event.target;
        if (target.closest("[data-import-modal-close]")) {
          this.hideImportModal();
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          this.hideImportModal();
        }
      });
      document.body.append(modal);
      this.importModal = modal;
      this.importModalMessage = modal.querySelector(".import-modal__message");
    }
    // Opens the import modal with a message when a definition cannot be found.
    showImportModal(message) {
      this.ensureImportModal();
      if (this.importModalMessage) {
        this.importModalMessage.textContent = message;
      }
      if (this.importModal) {
        this.importModal.classList.add("is-visible");
        this.importModal.setAttribute("aria-hidden", "false");
      }
    }
    // Closes the import modal after the user dismisses it.
    hideImportModal() {
      if (!this.importModal) {
        return;
      }
      this.importModal.classList.remove("is-visible");
      this.importModal.setAttribute("aria-hidden", "true");
    }
    // Checks whether a line contains identifier usage outside strings/comments.
    lineHasIdentifierUsage(lineEl, importName) {
      const escaped = this.escapeRegex(importName);
      const matcher = new RegExp(`\\b${escaped}\\b`);
      const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          if (!node.textContent || !matcher.test(node.textContent)) {
            matcher.lastIndex = 0;
            return NodeFilter.FILTER_REJECT;
          }
          matcher.lastIndex = 0;
          const parent = node.parentElement;
          if (!parent || parent.closest(".line-no")) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.closest(".hljs-string") || parent.closest(".hljs-comment")) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      while (walker.nextNode()) {
        return true;
      }
      return false;
    }
    // Rebuilds fold ranges for the current file based on graph node metadata.
    getFoldableRangesForPath(path) {
      const ranges = [];
      this.deps.state.getGraphNodes().forEach((node) => {
        var _a;
        if (!((_a = node.location) == null ? void 0 : _a.path) || !node.location.start_line || !node.location.end_line) {
          return;
        }
        if (node.kind !== "function" && node.kind !== "method" && node.kind !== "class") {
          return;
        }
        if (normalizePath(node.location.path) !== path) {
          return;
        }
        const start = node.location.start_line;
        const end = node.location.end_line;
        if (end <= start) {
          return;
        }
        ranges.push({
          id: node.id,
          name: node.name,
          kind: node.kind,
          start,
          end
        });
      });
      ranges.sort((a, b) => a.start - b.start || b.end - a.end);
      return ranges;
    }
    // Applies fold collapsed classes for the current file after toggles change.
    refreshFoldVisibility() {
      this.deps.codeSurface.querySelectorAll(".code-line.is-folded").forEach((line) => line.classList.remove("is-folded"));
      this.deps.codeSurface.querySelectorAll(".code-line.is-fold-collapsed").forEach((line) => line.classList.remove("is-fold-collapsed"));
      const foldedSymbolIds = this.deps.state.getFoldedSymbolIds();
      this.deps.state.getCurrentFoldRanges().forEach((range) => {
        const isCollapsed = foldedSymbolIds.has(range.id);
        const startLine = this.deps.codeSurface.querySelector(`[data-line="${range.start}"]`);
        if (startLine) {
          startLine.classList.toggle("is-fold-collapsed", isCollapsed);
          const toggle = startLine.querySelector("[data-fold-toggle]");
          if (toggle) {
            toggle.textContent = isCollapsed ? "+" : "-";
          }
        }
        if (!isCollapsed) {
          return;
        }
        for (let line = range.start + 1; line <= range.end; line += 1) {
          const lineEl = this.deps.codeSurface.querySelector(`[data-line="${line}"]`);
          if (lineEl) {
            lineEl.classList.add("is-folded");
          }
        }
      });
    }
    // Toggles a fold id in the persistent folded set and refreshes classes.
    toggleFold(foldId) {
      if (!this.deps.state.getCurrentFoldRanges().has(foldId)) {
        return;
      }
      const foldedSymbolIds = this.deps.state.getFoldedSymbolIds();
      if (foldedSymbolIds.has(foldId)) {
        foldedSymbolIds.delete(foldId);
      } else {
        foldedSymbolIds.add(foldId);
      }
      this.refreshFoldVisibility();
    }
    // Handles cmd/ctrl-clicks on identifiers to jump to their definitions.
    handleDefinitionJump(event, target) {
      var _a, _b;
      if (!this.deps.isModifierClick(event)) {
        return false;
      }
      if (!((_b = (_a = this.deps.state.getCurrentSymbol()) == null ? void 0 : _a.location) == null ? void 0 : _b.path)) {
        return false;
      }
      const lineEl = target.closest(".code-line");
      if (!lineEl) {
        return false;
      }
      if (target.closest(".code-import")) {
        return false;
      }
      const identifier2 = this.getIdentifierAtClick(event);
      if (!identifier2) {
        return false;
      }
      const symbol = this.resolveDefinitionSymbol(identifier2, this.deps.state.getCurrentSymbol().location.path);
      if (!symbol) {
        this.deps.setCodeStatus(`No definition found for ${identifier2}.`);
        return true;
      }
      this.navigateToSymbolDefinition(symbol, this.deps.state.getCurrentSymbol().location.path);
      return true;
    }
    // Reads the identifier under the cursor, skipping comments and string tokens.
    getIdentifierAtClick(event) {
      var _a, _b;
      const range = this.getCaretRangeFromPoint(event.clientX, event.clientY);
      if (!range) {
        return null;
      }
      const node = range.startContainer;
      if (!node || node.nodeType !== Node.TEXT_NODE) {
        return null;
      }
      const textNode = node;
      const parent = textNode.parentElement;
      if (!parent || parent.closest(".line-no") || parent.closest(".hljs-string") || parent.closest(".hljs-comment")) {
        return null;
      }
      const text = (_a = textNode.textContent) != null ? _a : "";
      if (!text) {
        return null;
      }
      let offset = Math.min(range.startOffset, text.length);
      const isWordChar = (char) => /[A-Za-z0-9_$]/.test(char);
      if (offset > 0 && (!text[offset] || !isWordChar(text[offset])) && isWordChar(text[offset - 1])) {
        offset -= 1;
      }
      if (!isWordChar((_b = text[offset]) != null ? _b : "")) {
        return null;
      }
      let start = offset;
      while (start > 0 && isWordChar(text[start - 1])) {
        start -= 1;
      }
      let end = offset;
      while (end < text.length && isWordChar(text[end])) {
        end += 1;
      }
      const word = text.slice(start, end);
      if (!word || !/^[A-Za-z_$][\w$]*$/.test(word)) {
        return null;
      }
      return word;
    }
    // Cross-browser caret range lookup used by identifier detection.
    getCaretRangeFromPoint(x, y) {
      const doc = document;
      if (doc.caretRangeFromPoint) {
        return doc.caretRangeFromPoint(x, y);
      }
      if (doc.caretPositionFromPoint) {
        const position = doc.caretPositionFromPoint(x, y);
        if (position) {
          const range = document.createRange();
          range.setStart(position.offsetNode, position.offset);
          range.collapse(true);
          return range;
        }
      }
      return null;
    }
    // Resolves a clicked identifier to a hint symbol using graph metadata.
    resolveDefinitionSymbol(identifier2, currentPath) {
      const normalizedCurrent = normalizePath(currentPath);
      const kinds = /* @__PURE__ */ new Set(["function", "method", "class"]);
      const matches = this.deps.state.getGraphNodes().filter((node) => {
        var _a;
        if (!((_a = node.location) == null ? void 0 : _a.path)) {
          return false;
        }
        if (!kinds.has(node.kind)) {
          return false;
        }
        return node.name === identifier2;
      });
      if (matches.length === 0) {
        return null;
      }
      const sameFile = matches.find((node) => {
        var _a, _b;
        return normalizePath((_b = (_a = node.location) == null ? void 0 : _a.path) != null ? _b : "") === normalizedCurrent;
      });
      if (sameFile) {
        return sameFile;
      }
      return matches[0];
    }
    // Navigates to a symbol definition while syncing breadcrumbs and graph selection.
    navigateToSymbolDefinition(symbol, fromPath, preferredSymbolName) {
      var _a, _b, _c, _d, _e, _f, _g;
      const fileNode = symbol.kind === "file" ? symbol : this.deps.getFileNodeForSymbol(symbol);
      const sourcePath = fromPath != null ? fromPath : (_b = (_a = this.deps.state.getCurrentSymbol()) == null ? void 0 : _a.location) == null ? void 0 : _b.path;
      const targetPath = (_e = (_c = fileNode == null ? void 0 : fileNode.location) == null ? void 0 : _c.path) != null ? _e : (_d = symbol.location) == null ? void 0 : _d.path;
      if (sourcePath && targetPath) {
        const normalizedSource = normalizePath(sourcePath);
        const normalizedTarget = normalizePath(targetPath);
        if (normalizedSource !== normalizedTarget) {
          this.updateImportBreadcrumbs(normalizedSource, normalizedTarget);
        }
      }
      if (fileNode && preferredSymbolName) {
        const filePath = (_g = (_f = fileNode.location) == null ? void 0 : _f.path) != null ? _g : "";
        const candidate = this.findSymbolInFiles(preferredSymbolName, [filePath]);
        if (candidate) {
          void this.deps.highlightSymbolInFile(fileNode, candidate);
          return;
        }
      }
      if (fileNode && symbol.kind !== "file") {
        this.deps.selectGraphNodes(fileNode, symbol);
        void this.deps.highlightSymbolInFile(fileNode, symbol);
        return;
      }
      this.deps.jumpToSymbol(symbol);
    }
    // Clears any existing import usage highlights in the reader.
    clearImportUsageHighlights() {
      this.deps.codeSurface.querySelectorAll(".code-line.is-import-usage").forEach((line) => line.classList.remove("is-import-usage"));
    }
    // Extracts import names from a language-specific import statement.
    extractImportNames(lineText, language) {
      const trimmed = lineText.trim();
      if (!trimmed) {
        return [];
      }
      if (trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
        return [];
      }
      if (language === "python") {
        return this.extractPythonImportNames(trimmed);
      }
      if (language === "swift") {
        return this.extractSwiftImportNames(trimmed);
      }
      if (language === "javascript" || language === "typescript" || language === "tsx") {
        return this.extractJsImportNames(trimmed);
      }
      return [];
    }
    // Extracts imported names from Python import statements.
    extractPythonImportNames(lineText) {
      if (lineText.startsWith("import ")) {
        const rest = lineText.slice("import ".length);
        return rest.split(",").map((part) => part.trim()).map((part) => {
          var _a;
          return (_a = part.split(/\s+as\s+/).pop()) != null ? _a : "";
        }).map((part) => part.trim()).filter(Boolean);
      }
      if (lineText.startsWith("from ")) {
        const match = lineText.match(/^from\s+.+?\s+import\s+(.+)$/);
        if (!match) {
          return [];
        }
        const importPart = match[1];
        if (importPart.includes("*")) {
          return [];
        }
        return importPart.split(",").map((part) => part.trim()).map((part) => {
          var _a;
          return (_a = part.split(/\s+as\s+/).pop()) != null ? _a : "";
        }).map((part) => part.trim()).filter(Boolean);
      }
      return [];
    }
    // Extracts imported module names from Swift import statements.
    extractSwiftImportNames(lineText) {
      if (!lineText.startsWith("import ")) {
        return [];
      }
      const rest = lineText.slice("import ".length).trim();
      const moduleName = rest.split(/\s+/)[0];
      return moduleName ? [moduleName] : [];
    }
    // Extracts import names from JS/TS import and require syntax.
    extractJsImportNames(lineText) {
      const names = [];
      const bindingMatch = lineText.match(/^import\s+(?:type\s+)?(.+?)\s+from\s+['"]/);
      if (bindingMatch) {
        names.push(...this.parseJsImportBindings(bindingMatch[1]));
      }
      const exportMatch = lineText.match(/^export\s+(?:type\s+)?(.+?)\s+from\s+['"]/);
      if (exportMatch) {
        names.push(...this.parseJsImportBindings(exportMatch[1]));
      }
      const importEqualsMatch = lineText.match(/^import\s+([A-Za-z_$][\w$]*)\s*=\s*require\s*\(/);
      if (importEqualsMatch) {
        names.push(importEqualsMatch[1]);
      }
      const requireMatch = lineText.match(/^(?:const|let|var)\s+(.+?)\s*=\s*require\s*\(/);
      if (requireMatch) {
        names.push(...this.parseJsRequireBinding(requireMatch[1]));
      }
      return Array.from(new Set(names.filter(Boolean)));
    }
    // Parses binding lists in JS/TS import clauses.
    parseJsImportBindings(binding) {
      const names = [];
      const trimmed = binding.trim();
      if (!trimmed) {
        return names;
      }
      if (trimmed.startsWith("{")) {
        names.push(...this.parseBraceList(trimmed));
        return names;
      }
      if (trimmed.startsWith("*")) {
        const starMatch = trimmed.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
        if (starMatch) {
          names.push(starMatch[1]);
        }
        return names;
      }
      const parts = trimmed.split(",");
      if (parts.length > 0) {
        const defaultName = parts[0].trim();
        if (defaultName) {
          names.push(defaultName);
        }
      }
      if (parts.length > 1) {
        const rest = parts.slice(1).join(",").trim();
        if (rest.startsWith("{")) {
          names.push(...this.parseBraceList(rest));
        } else if (rest.startsWith("*")) {
          const starMatch = rest.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
          if (starMatch) {
            names.push(starMatch[1]);
          }
        }
      }
      return names;
    }
    // Parses binding lists in JS/TS require assignments.
    parseJsRequireBinding(binding) {
      const trimmed = binding.trim();
      if (trimmed.startsWith("{")) {
        return this.parseBraceList(trimmed);
      }
      if (trimmed.startsWith("[")) {
        return [];
      }
      return trimmed ? [trimmed.split(/\s+/)[0]] : [];
    }
    // Parses brace lists into individual identifiers for imports or requires.
    parseBraceList(segment) {
      const content = segment.replace(/^{/, "").replace(/}.*$/, "");
      return content.split(",").map((part) => part.trim()).map((part) => {
        var _a, _b;
        if (!part) {
          return "";
        }
        if (part.includes(" as ")) {
          return (_a = part.split(/\s+as\s+/).pop()) != null ? _a : "";
        }
        if (part.includes(":")) {
          return (_b = part.split(":").pop()) != null ? _b : "";
        }
        return part;
      }).map((part) => part.trim()).filter((part) => /^[A-Za-z_$][\w$]*$/.test(part));
    }
    // Escapes regex metacharacters to build safe identifier matchers.
    escapeRegex(value) {
      return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };

  // app/static/gitreader/modules/utils/story.ts
  function formatArcOptionLabel(arc) {
    var _a;
    const routeLabel = formatArcTitle(arc);
    const handler = ((_a = arc.route) == null ? void 0 : _a.handler_name) ? ` - ${arc.route.handler_name}` : "";
    return `${routeLabel}${handler}`.trim();
  }
  function formatRouteLabel(arc) {
    var _a, _b, _c, _d;
    if (arc.title) {
      return arc.title;
    }
    const methods = ((_b = (_a = arc.route) == null ? void 0 : _a.methods) == null ? void 0 : _b.length) ? arc.route.methods.join("|") : "ANY";
    const target = ((_c = arc.route) == null ? void 0 : _c.path) || ((_d = arc.route) == null ? void 0 : _d.handler_name) || "route";
    return `${methods} ${target}`.trim();
  }
  function getArcThreadLabel(arc) {
    var _a;
    if (!arc.thread || arc.thread === "main") {
      return "";
    }
    if (arc.thread === "branch") {
      const index = (_a = arc.thread_index) != null ? _a : 0;
      return `Branch ${index}`;
    }
    return arc.thread;
  }
  function formatArcTitle(arc) {
    const base = arc.title || formatRouteLabel(arc);
    const threadLabel = getArcThreadLabel(arc);
    if (!threadLabel) {
      return base;
    }
    if (base.toLowerCase().includes("branch")) {
      return base;
    }
    return `${base} (${threadLabel})`;
  }
  function formatStorySceneLocation(scene) {
    if (!scene.file_path) {
      return "location unknown";
    }
    if (scene.line && scene.line > 0) {
      return `${scene.file_path}:${scene.line}`;
    }
    return scene.file_path;
  }
  function formatStorySceneLabel(scene, index, includeLocation, kindLabelFor) {
    var _a;
    const roleLabel = scene.role === "entry" ? "Entry" : `Step ${index + 1}`;
    const kindLabel = kindLabelFor((_a = scene.kind) != null ? _a : "");
    const confidence = scene.confidence === "low" ? " (low confidence)" : "";
    const base = `${roleLabel}: ${scene.name} (${kindLabel})${confidence}`;
    if (!includeLocation) {
      return base;
    }
    const location = formatStorySceneLocation(scene);
    return `${base} - ${location}`;
  }

  // app/static/gitreader/modules/ui/narratorView.ts
  function buildNarratorLoadingHtml(symbolName) {
    return `
        <p class="eyebrow">Narrator</p>
        <h3>Listening to ${escapeHtml(symbolName)}</h3>
        <p>Drafting the next beat in the story.</p>
    `;
  }
  function buildNarratorErrorHtml(symbolName, message) {
    return `
        <p class="eyebrow">Narrator</p>
        <h3>Unable to narrate ${escapeHtml(symbolName)}</h3>
        <p>${escapeHtml(message)}</p>
    `;
  }
  function buildNarrationHtml(symbolName, narration, mode) {
    const formatted = formatNarration(symbolName, narration, mode);
    return `
        <p class="eyebrow">${formatted.eyebrow}</p>
        <h3>${formatted.title}</h3>
        ${formatted.body}
    `;
  }
  function formatNarration(symbolName, narration, mode) {
    var _a, _b, _c;
    const name = escapeHtml(symbolName);
    if (mode === "summary") {
      const items = ((_a = narration.summary) != null ? _a : []).map((item) => escapeHtml(item));
      const body = items.length > 0 ? `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>` : `<p>No summary yet for ${name}.</p>`;
      return {
        eyebrow: "What it does",
        title: `A clear role for ${name}`,
        body
      };
    }
    if (mode === "key_lines") {
      const lines = (_b = narration.key_lines) != null ? _b : [];
      const body = lines.length > 0 ? `<ul>${lines.map((line) => {
        const label = `Line ${line.line}: ${line.text}`;
        return `<li>${escapeHtml(label)}</li>`;
      }).join("")}</ul>` : "<p>No key lines captured yet.</p>";
      return {
        eyebrow: "Key lines",
        title: `Lines to watch in ${name}`,
        body
      };
    }
    if (mode === "connections") {
      const items = ((_c = narration.connections) != null ? _c : []).map((item) => escapeHtml(item));
      const body = items.length > 0 ? `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>` : "<p>Connections are still being mapped.</p>";
      return {
        eyebrow: "Connections",
        title: `How ${name} links`,
        body
      };
    }
    if (mode === "next") {
      const thread = narration.next_thread ? escapeHtml(narration.next_thread) : "No next thread yet.";
      return {
        eyebrow: "Next thread",
        title: "Where to go next",
        body: `<p>${thread}</p>`
      };
    }
    const hook = narration.hook ? escapeHtml(narration.hook) : `A quiet setup around ${name}.`;
    return {
      eyebrow: "Hook",
      title: `The quiet setup behind ${name}`,
      body: `<p>${hook}</p>`
    };
  }
  function buildStoryArcHtml(context) {
    const formatted = formatStoryArc(context);
    return `
        <p class="eyebrow">${formatted.eyebrow}</p>
        <h3>${formatted.title}</h3>
        ${formatted.body}
    `;
  }
  function buildStoryArcEmptyHtml() {
    return `
        <p class="eyebrow">Routes</p>
        <h3>No route selected</h3>
        <p>Pick a route to see its primary flow.</p>
    `;
  }
  function buildStoryArcMissingHtml() {
    return `
        <p class="eyebrow">Routes</p>
        <h3>Route not found</h3>
        <p>Choose another route to continue.</p>
    `;
  }
  function buildFileTreeNarratorHtml(fileCount) {
    const countLabel = fileCount > 0 ? `${fileCount} files indexed.` : "No files indexed yet.";
    return `
        <p class="eyebrow">File tree</p>
        <h3>Browse the repository layout</h3>
        <p>Expand folders in the tree to explore the structure. ${escapeHtml(countLabel)}</p>
    `;
  }
  function formatStoryArc(context) {
    var _a, _b;
    const { arc, mode, entryNode, resolveArcLabel, kindLabelFor } = context;
    const routeLabel = escapeHtml(formatArcTitle(arc));
    const scenes = Array.isArray(arc.scenes) ? arc.scenes : [];
    if (mode === "summary") {
      const summaryText = arc.summary ? escapeHtml(arc.summary) : "";
      const metaItems = buildArcMetaItems(arc, entryNode);
      const metaList = metaItems.length > 0 ? `<ul>${metaItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";
      const items = scenes.map((scene, index) => {
        const label = formatStorySceneLabel(scene, index, true, kindLabelFor);
        return `<li>${escapeHtml(label)}</li>`;
      });
      const flowLabel = scenes.length > 1 ? "Flow steps" : "Flow steps (entry only)";
      const flowList = items.length > 0 ? `<p>${flowLabel}</p><ol>${items.join("")}</ol>` : "<p>No internal calls detected yet.</p>";
      const body = `
            ${summaryText ? `<p>${summaryText}</p>` : ""}
            ${metaList}
            ${flowList}
        `;
      return {
        eyebrow: "What it does",
        title: `Primary flow for ${routeLabel}`,
        body
      };
    }
    if (mode === "key_lines") {
      const items = scenes.map((scene) => {
        const location = formatStorySceneLocation(scene);
        const label = `${scene.name} - ${location}`;
        return `<li>${escapeHtml(label)}</li>`;
      });
      const body = items.length > 0 ? `<ul>${items.join("")}</ul>` : "<p>No locations captured yet.</p>";
      return {
        eyebrow: "Key lines",
        title: `Entry points for ${routeLabel}`,
        body
      };
    }
    if (mode === "connections") {
      const connectionItems = buildArcConnectionItems(arc, scenes, resolveArcLabel);
      const body = connectionItems.length > 0 ? `<ul>${connectionItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>Connections are still being mapped.</p>";
      return {
        eyebrow: "Connections",
        title: `Files touched by ${routeLabel}`,
        body
      };
    }
    if (mode === "next") {
      const related = (_a = arc.related_ids) != null ? _a : [];
      if (related.length > 0) {
        const buttons = related.map((arcId) => {
          var _a2;
          const label2 = (_a2 = resolveArcLabel(arcId)) != null ? _a2 : arcId;
          return `<button class="ghost-btn arc-jump" data-arc-id="${escapeHtml(arcId)}">${escapeHtml(label2)}</button>`;
        });
        return {
          eyebrow: "Next thread",
          title: "Where to go next",
          body: `<p>Jump to a related thread.</p><div class="arc-jump-list">${buttons.join("")}</div>`
        };
      }
      const last = scenes[scenes.length - 1];
      const location = last ? formatStorySceneLocation(last) : "";
      const label = last ? `Continue at ${last.name}${location ? ` (${location})` : ""}.` : "No next thread yet.";
      return {
        eyebrow: "Next thread",
        title: "Where to go next",
        body: `<p>${escapeHtml(label)}</p>`
      };
    }
    const handler = ((_b = arc.route) == null ? void 0 : _b.handler_name) ? `Handler ${arc.route.handler_name}.` : "";
    const summary = arc.summary ? arc.summary : `Route ${formatRouteLabel(arc)} begins the journey.`;
    const hook = `${summary}${handler ? ` ${handler}` : ""}`.trim();
    return {
      eyebrow: "Route",
      title: routeLabel,
      body: `<p>${escapeHtml(hook)}</p>`
    };
  }
  function buildArcMetaItems(arc, entryNode) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const items = [];
    let threadLabel = "";
    if (arc.thread && arc.thread !== "main") {
      if (arc.thread === "branch") {
        threadLabel = `Branch ${(_a = arc.thread_index) != null ? _a : 0}`;
      } else {
        threadLabel = arc.thread;
      }
    }
    if (threadLabel) {
      items.push(`Thread: ${threadLabel}`);
    }
    const methods = ((_c = (_b = arc.route) == null ? void 0 : _b.methods) == null ? void 0 : _c.length) ? arc.route.methods.join("|") : "ANY";
    const path = ((_d = arc.route) == null ? void 0 : _d.path) ? arc.route.path : "";
    const routeLabel = path ? `${methods} ${path}`.trim() : methods;
    if (routeLabel) {
      items.push(`Route: ${routeLabel}`);
    }
    if ((_e = arc.route) == null ? void 0 : _e.handler_name) {
      items.push(`Handler: ${arc.route.handler_name}`);
    }
    if ((_f = arc.route) == null ? void 0 : _f.module) {
      items.push(`Module: ${arc.route.module}`);
    }
    if ((_g = arc.route) == null ? void 0 : _g.file_path) {
      const line = arc.route.line ? `:${arc.route.line}` : "";
      items.push(`Defined in: ${arc.route.file_path}${line}`);
    }
    if (entryNode == null ? void 0 : entryNode.signature) {
      items.push(`Signature: ${entryNode.signature}`);
    }
    if (entryNode == null ? void 0 : entryNode.summary) {
      items.push(`Docstring: ${entryNode.summary}`);
    }
    const steps = arc.scene_count || 0;
    items.push(`Steps detected: ${steps}`);
    const internalCalls = (_i = (_h = arc.calls) == null ? void 0 : _h.internal) != null ? _i : [];
    if (internalCalls.length > 0) {
      items.push(`Internal calls: ${internalCalls.slice(0, 4).join(", ")}`);
    }
    const externalCalls = (_k = (_j = arc.calls) == null ? void 0 : _j.external) != null ? _k : [];
    if (externalCalls.length > 0) {
      items.push(`External calls: ${externalCalls.slice(0, 4).join(", ")}`);
    }
    return items;
  }
  function buildArcConnectionItems(arc, scenes, resolveArcLabel) {
    var _a, _b, _c, _d, _e;
    const items = [];
    const internalCalls = (_b = (_a = arc.calls) == null ? void 0 : _a.internal) != null ? _b : [];
    if (internalCalls.length > 0) {
      items.push(`Internal calls: ${internalCalls.slice(0, 5).join(", ")}`);
    }
    const externalCalls = (_d = (_c = arc.calls) == null ? void 0 : _c.external) != null ? _d : [];
    if (externalCalls.length > 0) {
      items.push(`External calls: ${externalCalls.slice(0, 5).join(", ")}`);
    }
    const related = (_e = arc.related_ids) != null ? _e : [];
    if (related.length > 0) {
      const labels = related.map((arcId) => {
        var _a2;
        return (_a2 = resolveArcLabel(arcId)) != null ? _a2 : arcId;
      });
      items.push(`Related threads: ${labels.join(", ")}`);
    }
    const paths = scenes.map((scene) => scene.file_path).filter((path) => Boolean(path));
    const unique = Array.from(new Set(paths));
    if (unique.length > 0) {
      items.push(`Files: ${unique.slice(0, 6).join(", ")}`);
    }
    return items;
  }

  // app/static/gitreader/modules/utils/dom.ts
  function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing element: ${id}`);
    }
    return element;
  }

  // app/static/gitreader/modules/utils/format.ts
  function formatLocation(location, startLine, endLine) {
    if (!location || !location.path) {
      return "location unknown";
    }
    if (startLine && startLine > 0) {
      const endLabel = endLine && endLine !== startLine ? `-${endLine}` : "";
      return `${location.path}:${startLine}${endLabel}`;
    }
    if (location.start_line) {
      const endLabel = location.end_line && location.end_line !== location.start_line ? `-${location.end_line}` : "";
      return `${location.path}:${location.start_line}${endLabel}`;
    }
    return location.path;
  }

  // app/static/gitreader/app.ts
  var GitReaderApp = class {
    constructor() {
      __publicField(this, "tocList");
      __publicField(this, "codeSurface");
      __publicField(this, "codePane");
      __publicField(this, "canvasGraph");
      __publicField(this, "canvasSurface");
      __publicField(this, "canvasOverlay");
      __publicField(this, "canvasPane");
      __publicField(this, "narratorOutput");
      __publicField(this, "narratorFileTree");
      __publicField(this, "modeButtons");
      __publicField(this, "layoutButtons");
      __publicField(this, "tocModeButtons");
      __publicField(this, "snippetModeButtons");
      __publicField(this, "graphLayoutButtons");
      __publicField(this, "edgeFilterButtons");
      __publicField(this, "nodeFilterButtons");
      __publicField(this, "graphActionButtons");
      __publicField(this, "narratorToggle");
      __publicField(this, "workspace");
      __publicField(this, "workspaceSplitter");
      __publicField(this, "tocPill");
      __publicField(this, "tocSubtitle");
      __publicField(this, "graphNodeStatus");
      __publicField(this, "graphRevealButton");
      __publicField(this, "graphTooltip");
      __publicField(this, "organizedCircleOverlay");
      __publicField(this, "organizedCircleButton");
      __publicField(this, "narratorPane");
      __publicField(this, "readerFileTreeButton");
      __publicField(this, "readerMeta");
      __publicField(this, "routePicker");
      __publicField(this, "routeSelect");
      __publicField(this, "routeJump");
      __publicField(this, "tourControls");
      __publicField(this, "tourModeSelect");
      __publicField(this, "tourStartButton");
      __publicField(this, "tourPrevButton");
      __publicField(this, "tourNextButton");
      __publicField(this, "tourEndButton");
      __publicField(this, "tourStatus");
      __publicField(this, "repoForm");
      __publicField(this, "repoInput");
      __publicField(this, "localInput");
      __publicField(this, "refInput");
      __publicField(this, "subdirInput");
      __publicField(this, "repoParams");
      __publicField(this, "api");
      __publicField(this, "currentMode", "hook");
      __publicField(this, "tocMode", "story");
      __publicField(this, "fileTreeView");
      __publicField(this, "fileTreeController");
      __publicField(this, "graphView");
      __publicField(this, "graphContextMenu");
      __publicField(this, "readerView");
      __publicField(this, "readerInteractions");
      __publicField(this, "readerController");
      __publicField(this, "graphLayoutMode", "cluster");
      __publicField(this, "chapters", []);
      __publicField(this, "storyArcs", []);
      __publicField(this, "storyArcsById", /* @__PURE__ */ new Map());
      __publicField(this, "activeStoryArc", null);
      __publicField(this, "tourActive", false);
      __publicField(this, "tourState", null);
      __publicField(this, "tourStep", null);
      __publicField(this, "tourMode", "story");
      __publicField(this, "guidedAllowedNodeIds", null);
      __publicField(this, "readerTreeFocusPath", null);
      __publicField(this, "graphNodes", []);
      __publicField(this, "graphEdges", []);
      __publicField(this, "nodeById", /* @__PURE__ */ new Map());
      __publicField(this, "displayNodeById", /* @__PURE__ */ new Map());
      __publicField(this, "fileNodesByPath", /* @__PURE__ */ new Map());
      __publicField(this, "snippetCache", /* @__PURE__ */ new Map());
      __publicField(this, "graphCache", /* @__PURE__ */ new Map());
      __publicField(this, "graphLoadPromises", /* @__PURE__ */ new Map());
      __publicField(this, "narratorCache", /* @__PURE__ */ new Map());
      __publicField(this, "narratorRequestToken", 0);
      __publicField(this, "chapterRequestToken", 0);
      __publicField(this, "graphRequestToken", 0);
      __publicField(this, "narratorVisible", true);
      __publicField(this, "graphInstance", null);
      __publicField(this, "graphEventsBound", false);
      __publicField(this, "currentScope", "full");
      __publicField(this, "currentChapterId", null);
      __publicField(this, "currentSymbol", null);
      __publicField(this, "currentSnippetText", "");
      __publicField(this, "currentSnippetStartLine", 1);
      __publicField(this, "clusterExpanded", /* @__PURE__ */ new Set());
      __publicField(this, "clusterAutoExpanded", /* @__PURE__ */ new Set());
      __publicField(this, "clusterFocusPath", null);
      __publicField(this, "classExpanded", /* @__PURE__ */ new Set());
      __publicField(this, "tocDebounceTimer", null);
      __publicField(this, "tocDebounceDelay", 200);
      __publicField(this, "pendingChapterId", null);
      __publicField(this, "labelZoomThreshold", 0.65);
      __publicField(this, "labelLineLength", 18);
      __publicField(this, "lastTapNodeId", null);
      __publicField(this, "lastTapAt", 0);
      __publicField(this, "doubleTapDelay", 320);
      __publicField(this, "siblingSelectKeyActive", false);
      __publicField(this, "organizedCircleState", null);
      __publicField(this, "organizedCircleDragActive", false);
      __publicField(this, "organizedCircleDragPointerId", null);
      __publicField(this, "organizedCircleDismissStart", null);
      __publicField(this, "organizedCircleDismissPointerId", null);
      __publicField(this, "organizedCircleDismissMoved", false);
      __publicField(this, "importBreadcrumbs", []);
      __publicField(this, "foldedSymbolIds", /* @__PURE__ */ new Set());
      __publicField(this, "currentFoldRanges", /* @__PURE__ */ new Map());
      __publicField(this, "currentFoldPath", null);
      __publicField(this, "pendingSymbol", null);
      __publicField(this, "pendingSnippet", null);
      __publicField(this, "labelVisibilityRaf", null);
      __publicField(this, "lastLabelZoomBucket", null);
      __publicField(this, "lastForcedLabelIds", /* @__PURE__ */ new Set());
      this.tocList = this.getElement("toc-list");
      this.codeSurface = this.getElement("code-surface");
      this.codePane = this.getElement("code-view");
      this.canvasGraph = this.getElement("canvas-graph");
      this.canvasSurface = this.getElement("canvas-surface");
      this.canvasOverlay = this.getElement("canvas-overlay");
      this.canvasPane = this.getElement("graph-canvas");
      this.narratorOutput = this.getElement("narrator-output");
      this.narratorFileTree = this.getElement("narrator-file-tree");
      this.modeButtons = document.querySelectorAll(".mode-btn");
      this.layoutButtons = document.querySelectorAll(".nav-btn[data-layout]");
      this.tocModeButtons = document.querySelectorAll(".nav-btn[data-toc-mode]");
      this.snippetModeButtons = document.querySelectorAll("[data-snippet-mode]");
      this.graphLayoutButtons = document.querySelectorAll("[data-layout-action]");
      this.edgeFilterButtons = document.querySelectorAll("[data-edge-filter]");
      this.nodeFilterButtons = document.querySelectorAll("[data-node-filter]");
      this.graphActionButtons = document.querySelectorAll("[data-graph-action]");
      this.narratorToggle = this.getElement("narrator-toggle");
      this.workspace = this.getElement("workspace");
      this.workspaceSplitter = this.getElement("workspace-splitter");
      this.tocPill = this.getElement("toc-pill");
      this.tocSubtitle = this.getElement("toc-subtitle");
      this.graphNodeStatus = this.getElement("graph-node-status");
      this.graphRevealButton = this.getElement("graph-reveal");
      this.graphTooltip = this.getElement("graph-tooltip");
      this.initializeOrganizedCircleOverlay();
      this.narratorPane = this.getElement("narrator");
      this.readerFileTreeButton = this.getElement("reader-file-tree");
      this.readerMeta = this.getElement("reader-meta");
      this.routePicker = this.getElement("route-picker");
      this.routeSelect = this.getElement("route-select");
      this.routeJump = this.getElement("route-jump");
      this.tourControls = this.getElement("tour-controls");
      this.tourModeSelect = this.getElement("tour-mode");
      this.tourStartButton = this.getElement("tour-start");
      this.tourPrevButton = this.getElement("tour-prev");
      this.tourNextButton = this.getElement("tour-next");
      this.tourEndButton = this.getElement("tour-end");
      this.tourStatus = this.getElement("tour-status");
      this.tourModeSelect.value = this.tourMode;
      this.graphRevealButton.disabled = true;
      this.routeSelect.disabled = true;
      this.routeJump.disabled = true;
      this.tourPrevButton.disabled = true;
      this.tourNextButton.disabled = true;
      this.tourEndButton.disabled = true;
      this.repoForm = this.getElement("repo-picker");
      this.repoInput = this.getElement("repo-input");
      this.localInput = this.getElement("local-input");
      this.refInput = this.getElement("ref-input");
      this.subdirInput = this.getElement("subdir-input");
      this.repoParams = this.buildRepoParams();
      this.api = createApiClient(this.repoParams);
      this.fileTreeView = new FileTreeView(fileTreeViewDefaults);
      this.fileTreeController = new FileTreeController({
        fileTreeView: this.fileTreeView,
        narratorContainer: this.narratorFileTree
      });
      this.graphView = new GraphViewController({
        container: this.canvasGraph,
        tooltipElement: this.graphTooltip,
        tooltipContainer: this.canvasSurface,
        nodeStatusElement: this.graphNodeStatus,
        revealButton: this.graphRevealButton,
        setCanvasOverlay: (message, visible) => this.setCanvasOverlay(message, visible),
        clearGraph: () => this.clearGraph(),
        getSelectedNodeId: () => this.getSelectedGraphNodeId(),
        isTourActive: () => this.tourActive,
        applyGuidedFilter: () => this.applyGuidedGraphFilter(),
        updateLabelVisibility: () => this.updateLabelVisibility(),
        setDisplayNodes: (nodes) => {
          this.displayNodeById = new Map(nodes.map((node) => [node.id, node]));
        },
        formatLabel: (node) => this.formatNodeLabel(node),
        onGraphReady: (graph) => {
          this.graphInstance = graph;
          this.bindGraphEvents();
        }
      });
      this.graphContextMenu = new GraphContextMenu({ container: document.body });
      const setReaderState = (update) => {
        var _a, _b, _c, _d, _e, _f;
        if (Object.prototype.hasOwnProperty.call(update, "currentSymbol")) {
          this.currentSymbol = (_a = update.currentSymbol) != null ? _a : null;
        }
        if (Object.prototype.hasOwnProperty.call(update, "pendingSymbol")) {
          this.pendingSymbol = (_b = update.pendingSymbol) != null ? _b : null;
        }
        if (Object.prototype.hasOwnProperty.call(update, "pendingSnippet")) {
          this.pendingSnippet = (_c = update.pendingSnippet) != null ? _c : null;
        }
        if (Object.prototype.hasOwnProperty.call(update, "readerTreeFocusPath")) {
          this.readerTreeFocusPath = (_d = update.readerTreeFocusPath) != null ? _d : null;
        }
        if (Object.prototype.hasOwnProperty.call(update, "currentSnippetText")) {
          this.currentSnippetText = (_e = update.currentSnippetText) != null ? _e : "";
        }
        if (Object.prototype.hasOwnProperty.call(update, "currentSnippetStartLine")) {
          this.currentSnippetStartLine = (_f = update.currentSnippetStartLine) != null ? _f : 1;
        }
      };
      this.readerInteractions = new ReaderInteractions({
        codeSurface: this.codeSurface,
        readerMeta: this.readerMeta,
        snippetModeButtons: this.snippetModeButtons,
        readerFileTreeButton: this.readerFileTreeButton,
        getHighlightLanguage: (path) => this.getHighlightLanguage(path),
        isModifierClick: (event) => this.isModifierClick(event),
        setCodeStatus: (message) => this.setCodeStatus(message),
        renderFileTree: (focusPath) => this.fileTreeController.render(focusPath),
        updateSnippetModeUi: () => this.readerView.updateSnippetModeUi(),
        jumpToSymbol: (symbol) => this.jumpToSymbol(symbol),
        highlightSymbolInFile: (fileNode, symbol) => this.highlightSymbolInFile(fileNode, symbol),
        getFileNodeForSymbol: (symbol) => this.getFileNodeForSymbol(symbol),
        selectGraphNodes: (fileNode, symbol) => {
          if (!this.graphInstance) {
            return;
          }
          if (!fileNode) {
            return;
          }
          const fileElement = this.graphInstance.$id(fileNode.id);
          const symbolElement = symbol ? this.graphInstance.$id(symbol.id) : null;
          if (fileElement && !fileElement.empty()) {
            this.graphInstance.$("node:selected").unselect();
            fileElement.select();
            if (symbolElement && !symbolElement.empty() && symbolElement.id() !== fileElement.id()) {
              symbolElement.select();
            }
          } else if (symbolElement && !symbolElement.empty()) {
            this.graphInstance.$("node:selected").unselect();
            symbolElement.select();
          }
        },
        copySnippet: () => this.copySnippet(),
        jumpToInputLine: () => this.jumpToInputLine(),
        fileTreeView: this.fileTreeView,
        state: {
          getCurrentSymbol: () => this.currentSymbol,
          getCurrentSnippetText: () => this.currentSnippetText,
          getCurrentSnippetStartLine: () => this.currentSnippetStartLine,
          getReaderTreeFocusPath: () => this.readerTreeFocusPath,
          setReaderState,
          getImportBreadcrumbs: () => this.importBreadcrumbs,
          setImportBreadcrumbs: (breadcrumbs) => {
            this.importBreadcrumbs = breadcrumbs;
          },
          getFoldedSymbolIds: () => this.foldedSymbolIds,
          getCurrentFoldRanges: () => this.currentFoldRanges,
          setCurrentFoldRanges: (ranges) => {
            this.currentFoldRanges = ranges;
          },
          setCurrentFoldPath: (path) => {
            this.currentFoldPath = path;
          },
          getGraphNodes: () => this.graphNodes,
          getFileNodesByPath: () => this.fileNodesByPath
        }
      });
      this.readerView = new ReaderView({
        codeSurface: this.codeSurface,
        readerMeta: this.readerMeta,
        snippetModeButtons: this.snippetModeButtons,
        escapeHtml: (value) => this.escapeHtml(value),
        formatLocation: (location, startLine, endLine) => this.formatLocation(location, startLine, endLine),
        getHighlightLanguage: (path) => this.getHighlightLanguage(path),
        hasHighlightSupport: () => this.hasHighlightSupport(),
        renderImportBreadcrumbs: (path) => this.readerInteractions.renderImportBreadcrumbs(path),
        applyGuidedCodeFocus: () => this.applyGuidedCodeFocus(),
        decorateImportLines: (snippet, language) => this.readerInteractions.decorateImportLines(snippet, language),
        applyFoldControls: (symbol) => this.readerInteractions.applyFoldControls(symbol),
        updateReaderControls: () => this.readerInteractions.updateReaderControls(),
        setReaderState,
        getReaderTreeFocusPath: () => this.readerTreeFocusPath,
        setReaderTreeFocusPath: (path) => {
          this.readerTreeFocusPath = path;
        },
        getPendingSymbol: () => this.pendingSymbol,
        getPendingSnippet: () => this.pendingSnippet,
        getCurrentSymbol: () => this.currentSymbol,
        clearSnippetCache: () => {
          this.snippetCache.clear();
        },
        loadSymbolSnippet: (symbol, narrate) => this.loadSymbolSnippet(symbol, narrate),
        isActiveStoryArc: () => Boolean(this.activeStoryArc),
        getActiveStoryArc: () => this.activeStoryArc,
        renderStoryArc: (arc) => this.renderStoryArc(arc),
        isTourActive: () => this.tourActive,
        getTourStep: () => this.tourStep,
        renderTourStep: (step) => this.renderTourStep(step)
      });
      this.readerController = new ReaderController({
        readerView: this.readerView,
        readerInteractions: this.readerInteractions
      });
      this.syncRepoInputsFromParams();
    }
    init() {
      this.renderLoadingState();
      this.loadGraphPreferences();
      this.bindEvents();
      this.updateNarratorToggle();
      this.updateTourControls();
      this.readerView.updateSnippetModeUi();
      this.updateGraphControls();
      this.loadData().catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to load data.";
        this.renderErrorState(message);
      });
    }
    getElement(id) {
      return getElement(id);
    }
    async loadData() {
      await this.loadToc(this.tocMode);
      const defaultChapterId = this.chapters.length > 0 ? this.chapters[0].id : "";
      await this.loadChapter(defaultChapterId);
    }
    buildRepoParams() {
      return buildRepoParams(window.location.search);
    }
    syncRepoInputsFromParams() {
      var _a, _b, _c, _d;
      this.repoInput.value = (_a = this.repoParams.get("repo")) != null ? _a : "";
      this.localInput.value = (_b = this.repoParams.get("local")) != null ? _b : "";
      this.refInput.value = (_c = this.repoParams.get("ref")) != null ? _c : "";
      this.subdirInput.value = (_d = this.repoParams.get("subdir")) != null ? _d : "";
    }
    applyRepoSelection() {
      const repoValue = this.repoInput.value.trim();
      const localValue = this.localInput.value.trim();
      const refValue = this.refInput.value.trim();
      const subdirValue = this.subdirInput.value.trim();
      const params = new URLSearchParams();
      if (repoValue) {
        params.set("repo", repoValue);
      } else if (localValue) {
        params.set("local", localValue);
      }
      if (refValue) {
        params.set("ref", refValue);
      }
      if (subdirValue) {
        params.set("subdir", subdirValue);
      }
      const query = params.toString();
      window.location.search = query ? `?${query}` : "";
    }
    renderLoadingState() {
      this.tocList.innerHTML = '<li class="toc-item"><div class="toc-title">Loading chapters</div><p class="toc-summary">Scanning repository...</p></li>';
      this.readerMeta.innerHTML = "";
      this.codeSurface.innerHTML = '<article class="code-card"><h3>Loading symbols...</h3><p>Fetching graph data.</p></article>';
      this.setCanvasOverlay("Preparing nodes and edges...", true);
      this.narratorOutput.innerHTML = '<p class="eyebrow">Narrator</p><h3>Loading</h3><p>Gathering the first clues.</p>';
    }
    renderErrorState(message) {
      this.tocList.innerHTML = `<li class="toc-item"><div class="toc-title">Failed to load</div><p class="toc-summary">${this.escapeHtml(message)}</p></li>`;
      this.readerMeta.innerHTML = "";
      this.codeSurface.innerHTML = `<article class="code-card"><h3>Unable to load</h3><p>${this.escapeHtml(message)}</p></article>`;
      this.setCanvasOverlay(message, true);
      this.narratorOutput.innerHTML = `<p class="eyebrow">Narrator</p><h3>Paused</h3><p>${this.escapeHtml(message)}</p>`;
    }
    bindEvents() {
      this.tocList.addEventListener("click", (event) => {
        const target = event.target.closest(".toc-item");
        if (!target) {
          return;
        }
        const chapterId = target.dataset.chapterId;
        if (chapterId) {
          if (this.tourActive) {
            if (this.tocMode === "routes") {
              void this.setTocMode("routes", chapterId);
            }
            return;
          }
          this.scheduleChapterLoad(chapterId);
        }
      });
      this.tocModeButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const mode = button.dataset.tocMode;
          if (mode) {
            void this.setTocMode(mode);
          }
        });
      });
      this.snippetModeButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const mode = button.dataset.snippetMode;
          if (mode) {
            void this.readerController.setSnippetMode(mode);
          }
        });
      });
      this.readerFileTreeButton.addEventListener("click", () => {
        var _a, _b, _c;
        const path = (_c = (_b = (_a = this.currentSymbol) == null ? void 0 : _a.location) == null ? void 0 : _b.path) != null ? _c : this.readerTreeFocusPath;
        if (!path) {
          return;
        }
        this.readerController.showFileTree(path);
        this.fileTreeController.render(path);
      });
      this.graphLayoutButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const layout = button.dataset.layoutAction;
          if (layout) {
            this.setGraphLayoutMode(layout);
          }
        });
      });
      this.edgeFilterButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const filter = button.dataset.edgeFilter;
          if (filter) {
            this.graphView.toggleEdgeFilter(filter);
            this.updateGraphControls();
          }
        });
      });
      this.nodeFilterButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const filter = button.dataset.nodeFilter;
          if (filter === "external") {
            this.graphView.toggleExternalNodes();
            this.updateGraphControls();
            if (this.graphLayoutMode === "cluster") {
              this.refreshGraphView();
            } else {
              this.graphView.applyFilters({ forceVisibility: true });
            }
          }
        });
      });
      this.graphActionButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const action = button.dataset.graphAction;
          if (action === "focus") {
            this.graphView.focusOnSelected();
          } else if (action === "reset") {
            this.graphView.resetFocus();
            this.refreshGraphViewport();
          } else if (action === "reveal") {
            if (!this.currentChapterId) {
              return;
            }
            const nodes = this.filterNodesForChapter(this.currentChapterId);
            if (this.graphView.revealMoreNodes(this.currentScope, nodes.length)) {
              this.refreshGraphView();
            }
          } else if (action === "zoom-in") {
            this.graphView.zoom(1.2);
          } else if (action === "zoom-out") {
            this.graphView.zoom(0.8);
          } else if (action === "fit") {
            this.graphView.fit();
          }
        });
      });
      this.modeButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const mode = button.dataset.mode;
          if (mode) {
            this.setMode(mode);
          }
        });
      });
      this.tourModeSelect.addEventListener("change", () => {
        const mode = this.tourModeSelect.value;
        this.tourMode = mode;
        if (this.tourActive) {
          void this.startTour();
        }
      });
      this.tourStartButton.addEventListener("click", () => {
        void this.startTour();
      });
      this.tourPrevButton.addEventListener("click", () => {
        void this.advanceTour("prev");
      });
      this.tourNextButton.addEventListener("click", () => {
        void this.advanceTour("next");
      });
      this.tourEndButton.addEventListener("click", () => {
        this.endTour();
      });
      this.routeSelect.addEventListener("change", () => {
        if (this.tourActive && this.tocMode !== "routes") {
          return;
        }
        const arcId = this.routeSelect.value;
        if (!arcId) {
          return;
        }
        void this.setTocMode("routes", arcId);
      });
      this.routeJump.addEventListener("click", () => {
        if (this.tourActive && this.tocMode !== "routes") {
          return;
        }
        const arcId = this.routeSelect.value;
        if (!arcId) {
          return;
        }
        void this.setTocMode("routes", arcId);
      });
      this.layoutButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const layout = button.dataset.layout;
          if (layout) {
            this.setLayout(layout);
          }
        });
      });
      this.narratorToggle.addEventListener("click", () => {
        this.narratorVisible = !this.narratorVisible;
        this.narratorPane.classList.toggle("is-hidden", !this.narratorVisible);
        this.updateNarratorToggle();
        this.refreshGraphViewport();
      });
      document.addEventListener("keydown", (event) => {
        if (this.isEditableTarget(event.target)) {
          return;
        }
        if (event.key === "s" || event.key === "S") {
          this.siblingSelectKeyActive = true;
        }
      });
      document.addEventListener("keyup", (event) => {
        if (event.key === "s" || event.key === "S") {
          this.siblingSelectKeyActive = false;
        }
      });
      window.addEventListener("blur", () => {
        this.siblingSelectKeyActive = false;
      });
      this.codeSurface.addEventListener("click", (event) => {
        this.readerController.handleCodeSurfaceClick(event);
      });
      this.codeSurface.addEventListener("keydown", (event) => {
        this.readerController.handleCodeSurfaceKeydown(event);
      });
      this.readerMeta.addEventListener("click", (event) => {
        this.readerController.handleCodeSurfaceClick(event);
      });
      this.readerMeta.addEventListener("keydown", (event) => {
        this.readerController.handleCodeSurfaceKeydown(event);
      });
      this.narratorOutput.addEventListener("click", (event) => {
        const target = event.target.closest("[data-arc-id]");
        if (!target) {
          return;
        }
        const arcId = target.dataset.arcId;
        if (arcId) {
          void this.setTocMode("routes", arcId);
        }
      });
      this.narratorOutput.addEventListener("click", (event) => {
        const target = event.target.closest("[data-tour-node]");
        if (!target) {
          return;
        }
        const nodeId = target.dataset.tourNode;
        if (nodeId) {
          void this.advanceTour("jump", nodeId);
        }
      });
      this.narratorOutput.addEventListener("click", (event) => {
        const target = event.target.closest("[data-tour-arc]");
        if (!target) {
          return;
        }
        const arcId = target.dataset.tourArc;
        if (arcId) {
          void this.advanceTour("branch", void 0, arcId);
        }
      });
      this.narratorOutput.addEventListener("click", (event) => {
        const target = event.target.closest("[data-context-link]");
        if (!target) {
          return;
        }
        const nodeId = target.dataset.contextNode;
        const filePath = target.dataset.contextFile;
        const line = target.dataset.contextLine ? Number(target.dataset.contextLine) : void 0;
        this.handleContextLink(nodeId, filePath, line);
      });
      bindFileTreeEvents(this.narratorFileTree, {
        onToggle: (path) => this.toggleFileTreePath(path),
        onSelectFile: (path) => this.handleFileTreeFileSelection(path)
      });
      bindFileTreeEvents(this.codeSurface, {
        onToggle: (path) => this.toggleFileTreePath(path),
        onSelectFile: (path) => this.handleFileTreeFileSelection(path)
      });
      this.repoForm.addEventListener("submit", (event) => {
        event.preventDefault();
        this.applyRepoSelection();
      });
      this.bindWorkspaceResize();
    }
    bindWorkspaceResize() {
      const minPaneWidth = 320;
      this.workspaceSplitter.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }
        if (this.workspace.dataset.layout !== "both") {
          return;
        }
        event.preventDefault();
        const splitterRect = this.workspaceSplitter.getBoundingClientRect();
        const codeRect = this.codePane.getBoundingClientRect();
        const canvasRect = this.canvasPane.getBoundingClientRect();
        const totalWidth = codeRect.width + canvasRect.width + splitterRect.width;
        const maxReaderWidth = Math.max(minPaneWidth, totalWidth - splitterRect.width - minPaneWidth);
        const startX = event.clientX;
        const startReaderWidth = codeRect.width;
        const updateSplitterAria = (value) => {
          this.workspaceSplitter.setAttribute("aria-valuemin", String(minPaneWidth));
          this.workspaceSplitter.setAttribute("aria-valuemax", String(Math.round(maxReaderWidth)));
          this.workspaceSplitter.setAttribute("aria-valuenow", String(Math.round(value)));
        };
        updateSplitterAria(startReaderWidth);
        const handleMove = (moveEvent) => {
          if (moveEvent.pointerId !== event.pointerId) {
            return;
          }
          const delta = moveEvent.clientX - startX;
          const nextWidth = Math.min(
            maxReaderWidth,
            Math.max(minPaneWidth, startReaderWidth + delta)
          );
          this.workspace.style.setProperty("--reader-width", `${nextWidth}px`);
          updateSplitterAria(nextWidth);
        };
        const stopResize = (endEvent) => {
          if (endEvent.pointerId !== event.pointerId) {
            return;
          }
          this.workspaceSplitter.releasePointerCapture(event.pointerId);
          this.workspaceSplitter.removeEventListener("pointermove", handleMove);
          this.workspaceSplitter.removeEventListener("pointerup", stopResize);
          this.workspaceSplitter.removeEventListener("pointercancel", stopResize);
          document.body.classList.remove("is-resizing");
          if (this.graphInstance) {
            this.graphInstance.resize();
            this.updateLabelVisibility();
          }
        };
        document.body.classList.add("is-resizing");
        this.workspaceSplitter.setPointerCapture(event.pointerId);
        this.workspaceSplitter.addEventListener("pointermove", handleMove);
        this.workspaceSplitter.addEventListener("pointerup", stopResize);
        this.workspaceSplitter.addEventListener("pointercancel", stopResize);
      });
    }
    scheduleChapterLoad(chapterId) {
      this.pendingChapterId = chapterId;
      this.setActiveToc(chapterId);
      if (this.tocDebounceTimer !== null) {
        window.clearTimeout(this.tocDebounceTimer);
      }
      this.tocDebounceTimer = window.setTimeout(() => {
        this.tocDebounceTimer = null;
        if (this.pendingChapterId) {
          void this.loadChapter(this.pendingChapterId);
        }
      }, this.tocDebounceDelay);
    }
    async setTocMode(mode, targetChapterId) {
      if (this.tocMode === mode) {
        if (targetChapterId) {
          if (this.tourActive) {
            this.currentChapterId = targetChapterId;
            this.setActiveToc(targetChapterId);
            this.resetNarratorForTocMode(mode, targetChapterId);
            this.updateTourControls();
            return;
          }
          await this.loadChapter(targetChapterId);
          return;
        }
        if (this.tourActive) {
          this.resetNarratorForTocMode(mode);
          this.updateTourControls();
        }
        return;
      }
      this.tocList.innerHTML = '<li class="toc-item"><div class="toc-title">Loading chapters</div><p class="toc-summary">Switching TOC view...</p></li>';
      await this.loadToc(mode);
      const defaultChapterId = targetChapterId != null ? targetChapterId : this.chapters.length > 0 ? this.chapters[0].id : "";
      if (this.tourActive) {
        this.currentChapterId = defaultChapterId;
        this.setActiveToc(defaultChapterId);
        this.resetNarratorForTocMode(mode, defaultChapterId);
        this.updateTourControls();
        return;
      }
      await this.loadChapter(defaultChapterId);
    }
    resetNarratorForTocMode(mode, targetChapterId) {
      if (!this.tourActive) {
        return;
      }
      if (mode === "routes") {
        const arcId = targetChapterId || this.currentChapterId || this.routeSelect.value || "";
        const arc = arcId ? this.storyArcsById.get(arcId) : void 0;
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
      if (mode === "tree") {
        this.renderFileTreeNarrator();
        return;
      }
      if (this.tourStep) {
        this.renderTourStep(this.tourStep);
      }
    }
    async loadToc(mode) {
      var _a;
      if (mode === "routes") {
        await this.loadRouteToc();
        return;
      }
      const tocData = await this.api.fetchJson(
        "/gitreader/api/toc",
        { mode }
      );
      this.chapters = Array.isArray(tocData.chapters) ? tocData.chapters : [];
      this.tocMode = (_a = tocData.mode) != null ? _a : mode;
      this.activeStoryArc = null;
      this.updateTocModeUi();
      this.renderToc();
    }
    async loadRouteToc() {
      const storyData = await this.api.fetchJson("/gitreader/api/story");
      this.storyArcs = Array.isArray(storyData.arcs) ? storyData.arcs : [];
      this.storyArcsById = new Map(this.storyArcs.map((arc) => [arc.id, arc]));
      this.chapters = this.storyArcs.map((arc) => this.buildArcChapter(arc));
      this.tocMode = "routes";
      this.activeStoryArc = null;
      this.updateTocModeUi();
      this.renderToc();
      this.populateRoutePicker(this.storyArcs);
    }
    updateTocModeUi() {
      this.tocModeButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.tocMode === this.tocMode);
      });
      const isStory = this.tocMode === "story";
      const isRoutes = this.tocMode === "routes";
      if (isRoutes) {
        this.tocPill.textContent = "routes";
        this.tocSubtitle.textContent = "Trace Flask routes into their primary flow.";
      } else {
        this.tocPill.textContent = isStory ? "story" : "file tree";
        this.tocSubtitle.textContent = isStory ? "Follow the story arc of the repository." : "Browse the repository by folder.";
      }
      this.routePicker.classList.toggle("is-hidden", !isRoutes);
    }
    buildArcChapter(arc) {
      var _a;
      const handler = ((_a = arc.route) == null ? void 0 : _a.handler_name) ? `Handler ${arc.route.handler_name}` : "";
      const summary = [handler, arc.summary].filter(Boolean).join(" - ") || "Route arc";
      return {
        id: arc.id,
        title: this.formatArcTitle(arc) || handler || "Route",
        summary
      };
    }
    populateRoutePicker(arcs) {
      this.routeSelect.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = arcs.length > 0 ? "Select a route" : "No routes found";
      this.routeSelect.appendChild(placeholder);
      arcs.forEach((arc) => {
        const option = document.createElement("option");
        option.value = arc.id;
        option.textContent = this.formatArcOptionLabel(arc);
        this.routeSelect.appendChild(option);
      });
      const hasRoutes = arcs.length > 0;
      this.routeSelect.disabled = !hasRoutes;
      this.routeJump.disabled = !hasRoutes;
      if (!hasRoutes) {
        this.routeSelect.value = "";
      } else if (this.currentChapterId && this.storyArcsById.has(this.currentChapterId)) {
        this.routeSelect.value = this.currentChapterId;
      }
    }
    formatArcOptionLabel(arc) {
      return formatArcOptionLabel(arc);
    }
    formatRouteLabel(arc) {
      return formatRouteLabel(arc);
    }
    renderToc() {
      this.tocList.innerHTML = "";
      if (this.chapters.length === 0) {
        this.tocList.innerHTML = '<li class="toc-item"><div class="toc-title">No chapters yet</div><p class="toc-summary">Scan another repository.</p></li>';
        return;
      }
      this.chapters.forEach((chapter) => {
        const item = document.createElement("li");
        item.className = "toc-item";
        item.dataset.chapterId = chapter.id;
        if (chapter.scope) {
          item.dataset.scope = chapter.scope;
        }
        item.innerHTML = `
                <div class="toc-title">${this.escapeHtml(chapter.title)}</div>
                <p class="toc-summary">${this.escapeHtml(chapter.summary)}</p>
            `;
        this.tocList.appendChild(item);
      });
      this.applyGuidedToc();
    }
    async loadChapter(chapterId) {
      var _a;
      if (this.tocMode === "routes") {
        await this.loadStoryArc(chapterId);
        return;
      }
      if (this.tourActive) {
        return;
      }
      const requestToken = ++this.chapterRequestToken;
      this.currentChapterId = chapterId;
      this.setActiveToc(chapterId);
      this.activeStoryArc = null;
      const chapter = this.chapters.find((entry) => entry.id === chapterId);
      const scope = (_a = chapter == null ? void 0 : chapter.scope) != null ? _a : this.getScopeForChapter(chapterId);
      this.graphView.setFocusedNodeId(null);
      await this.loadGraphForScope(scope);
      if (requestToken !== this.chapterRequestToken) {
        return;
      }
      const nodes = this.filterNodesForChapter(chapterId);
      const edges = this.filterEdgesForNodes(nodes);
      const graphView = this.buildGraphView(nodes, edges, scope);
      const focus = this.pickFocusNode(graphView.nodes);
      this.resetLabelVisibilityCache();
      this.graphView.render({
        nodes: graphView.nodes,
        edges: graphView.edges,
        layoutMode: this.graphLayoutMode
      });
      this.graphView.updateNodeStatus(graphView);
      this.loadSymbolSnippet(focus).catch(() => {
        this.readerController.render(focus);
        void this.updateNarrator(focus);
      });
    }
    async loadStoryArc(arcId) {
      var _a;
      const requestToken = ++this.chapterRequestToken;
      this.currentChapterId = arcId;
      this.setActiveToc(arcId);
      this.activeStoryArc = null;
      if (!arcId) {
        this.renderStoryArcEmpty();
        return;
      }
      if (this.tourActive) {
        return;
      }
      let arc = this.storyArcsById.get(arcId);
      if (!arc) {
        const response = await this.api.fetchJson(
          "/gitreader/api/story",
          { id: arcId }
        );
        arc = Array.isArray(response.arcs) ? response.arcs[0] : void 0;
      }
      if (requestToken !== this.chapterRequestToken) {
        return;
      }
      if (!arc) {
        this.renderStoryArcMissing();
        return;
      }
      this.activeStoryArc = arc;
      this.syncRoutePickerSelection(arcId);
      this.graphView.setFocusedNodeId(arc.entry_id);
      await this.loadGraphForScope("full");
      if (requestToken !== this.chapterRequestToken) {
        return;
      }
      const nodes = this.graphNodes;
      const edges = this.filterEdgesForNodes(nodes);
      const graphView = this.buildGraphView(nodes, edges, "full");
      this.resetLabelVisibilityCache();
      this.graphView.render({
        nodes: graphView.nodes,
        edges: graphView.edges,
        layoutMode: this.graphLayoutMode
      });
      this.graphView.updateNodeStatus(graphView);
      const entryNode = (_a = this.nodeById.get(arc.entry_id)) != null ? _a : this.pickFocusNode(graphView.nodes);
      if (entryNode) {
        if (this.graphInstance) {
          this.graphInstance.$("node:selected").unselect();
          const element = this.graphInstance.$id(entryNode.id);
          if (element && typeof element.select === "function") {
            element.select();
          }
        }
        try {
          await this.loadSymbolSnippet(entryNode, false);
        } catch {
          this.readerController.render(entryNode);
        }
      }
      this.renderStoryArc(arc);
    }
    getScopeForChapter(chapterId) {
      if (chapterId && (chapterId.startsWith("group:") || chapterId.startsWith("story:"))) {
        return chapterId;
      }
      return "full";
    }
    async loadGraphForScope(scope) {
      if (this.currentScope === scope && this.graphNodes.length > 0) {
        return;
      }
      const requestToken = ++this.graphRequestToken;
      this.currentScope = scope;
      const cached = this.graphCache.get(scope);
      if (cached) {
        this.setGraphData(cached);
        return;
      }
      let graphPromise = this.graphLoadPromises.get(scope);
      if (!graphPromise) {
        graphPromise = this.api.fetchJson(
          "/gitreader/api/graph",
          scope && scope !== "full" ? { scope } : void 0
        );
        this.graphLoadPromises.set(scope, graphPromise);
      }
      const graphData = await graphPromise;
      this.graphLoadPromises.delete(scope);
      if (requestToken !== this.graphRequestToken) {
        return;
      }
      this.graphCache.set(scope, graphData);
      this.setGraphData(graphData);
    }
    buildGraphView(nodes, edges, scope) {
      if (this.graphLayoutMode === "cluster") {
        return this.buildClusterView(nodes, edges);
      }
      const totalNodes = nodes.length;
      const cap = this.graphView.getNodeCapForScope(scope, totalNodes);
      if (cap >= totalNodes) {
        return {
          nodes,
          edges,
          totalNodes,
          visibleNodes: totalNodes,
          isCapped: false
        };
      }
      const nodeMap = new Map(nodes.map((node) => [node.id, node]));
      const degree = /* @__PURE__ */ new Map();
      edges.forEach((edge) => {
        var _a, _b;
        if (nodeMap.has(edge.source)) {
          degree.set(edge.source, ((_a = degree.get(edge.source)) != null ? _a : 0) + 1);
        }
        if (nodeMap.has(edge.target)) {
          degree.set(edge.target, ((_b = degree.get(edge.target)) != null ? _b : 0) + 1);
        }
      });
      const keepIds = /* @__PURE__ */ new Set();
      const selectedNodeId = this.getSelectedGraphNodeId();
      if (selectedNodeId && nodeMap.has(selectedNodeId)) {
        keepIds.add(selectedNodeId);
      }
      if (this.currentSymbol && nodeMap.has(this.currentSymbol.id)) {
        keepIds.add(this.currentSymbol.id);
        const fileNode = this.getFileNodeForSymbol(this.currentSymbol);
        if (fileNode && nodeMap.has(fileNode.id)) {
          keepIds.add(fileNode.id);
        }
      }
      const focusedNodeId = this.graphView.getFocusedNodeId();
      if (focusedNodeId && nodeMap.has(focusedNodeId)) {
        keepIds.add(focusedNodeId);
      }
      const kindWeight = {
        function: 0,
        method: 1,
        class: 2,
        file: 3,
        blueprint: 4,
        external: 5
      };
      const sorted = nodes.slice().sort((a, b) => {
        var _a, _b, _c, _d;
        const aDegree = (_a = degree.get(a.id)) != null ? _a : 0;
        const bDegree = (_b = degree.get(b.id)) != null ? _b : 0;
        if (aDegree !== bDegree) {
          return bDegree - aDegree;
        }
        const aWeight = (_c = kindWeight[a.kind]) != null ? _c : 10;
        const bWeight = (_d = kindWeight[b.kind]) != null ? _d : 10;
        if (aWeight !== bWeight) {
          return aWeight - bWeight;
        }
        return a.name.localeCompare(b.name);
      });
      const targetSize = Math.max(cap, keepIds.size);
      const selectedNodes = [];
      sorted.forEach((node) => {
        if (keepIds.has(node.id)) {
          selectedNodes.push(node);
        }
      });
      for (const node of sorted) {
        if (selectedNodes.length >= targetSize) {
          break;
        }
        if (keepIds.has(node.id)) {
          continue;
        }
        selectedNodes.push(node);
      }
      const selectedIds = new Set(selectedNodes.map((node) => node.id));
      const trimmedEdges = edges.filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target));
      return {
        nodes: selectedNodes,
        edges: trimmedEdges,
        totalNodes,
        visibleNodes: selectedNodes.length,
        isCapped: totalNodes > selectedNodes.length
      };
    }
    buildClusterView(nodes, edges) {
      const totalNodes = nodes.length;
      const fileNodes = nodes.filter((node) => {
        var _a;
        return node.kind === "file" && ((_a = node.location) == null ? void 0 : _a.path);
      });
      if (fileNodes.length === 0) {
        return {
          nodes,
          edges,
          totalNodes,
          visibleNodes: nodes.length,
          isCapped: false
        };
      }
      const fileTree = buildFileTreeFromNodes(fileNodes);
      const pathToFileNode = /* @__PURE__ */ new Map();
      const filePathById = /* @__PURE__ */ new Map();
      fileNodes.forEach((node) => {
        var _a;
        const normalized = this.normalizePath(((_a = node.location) == null ? void 0 : _a.path) || "");
        if (!normalized) {
          return;
        }
        pathToFileNode.set(normalized, node);
        filePathById.set(node.id, normalized);
      });
      const nodeMap = new Map(nodes.map((node) => [node.id, node]));
      const directChildrenByFile = /* @__PURE__ */ new Map();
      const directChildIdsByFile = /* @__PURE__ */ new Map();
      const directChildrenByClass = /* @__PURE__ */ new Map();
      const directChildIdsByClass = /* @__PURE__ */ new Map();
      edges.forEach((edge) => {
        var _a, _b, _c, _d;
        if (edge.kind !== "contains") {
          return;
        }
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (!sourceNode || !targetNode) {
          return;
        }
        if (sourceNode.kind === "file") {
          if (targetNode.kind === "file" || targetNode.kind === "external") {
            return;
          }
          const existing = (_a = directChildrenByFile.get(sourceNode.id)) != null ? _a : [];
          const existingIds = (_b = directChildIdsByFile.get(sourceNode.id)) != null ? _b : /* @__PURE__ */ new Set();
          if (existingIds.has(targetNode.id)) {
            return;
          }
          existing.push(targetNode);
          existingIds.add(targetNode.id);
          directChildrenByFile.set(sourceNode.id, existing);
          directChildIdsByFile.set(sourceNode.id, existingIds);
          return;
        }
        if (sourceNode.kind === "class" && targetNode.kind === "method") {
          const existing = (_c = directChildrenByClass.get(sourceNode.id)) != null ? _c : [];
          const existingIds = (_d = directChildIdsByClass.get(sourceNode.id)) != null ? _d : /* @__PURE__ */ new Set();
          if (existingIds.has(targetNode.id)) {
            return;
          }
          existing.push(targetNode);
          existingIds.add(targetNode.id);
          directChildrenByClass.set(sourceNode.id, existing);
          directChildIdsByClass.set(sourceNode.id, existingIds);
        }
      });
      const visibleNodes = [];
      const visibleNodeIds = /* @__PURE__ */ new Set();
      const visibleFileIds = /* @__PURE__ */ new Set();
      const folderEdges = [];
      const addNode = (node) => {
        if (visibleNodeIds.has(node.id)) {
          return;
        }
        visibleNodes.push(node);
        visibleNodeIds.add(node.id);
      };
      const addFolderEdge = (source2, target) => {
        folderEdges.push({
          source: source2,
          target,
          kind: "contains",
          confidence: "low"
        });
      };
      const visitTree = (treeNode, parentFolderId) => {
        let entries = Array.from(treeNode.children.values());
        const currentPath = treeNode.path;
        if (currentPath) {
          const currentFolderId = this.getFolderClusterId(currentPath);
          const isUserExpanded = this.clusterExpanded.has(currentFolderId);
          const isAutoExpanded = this.clusterAutoExpanded.has(currentFolderId);
          const isFocusFolder = this.clusterFocusPath === currentPath;
          if (isAutoExpanded && !isUserExpanded && !isFocusFolder) {
            const focusChildName = this.getClusterFocusChildName(currentPath);
            if (focusChildName) {
              entries = entries.filter((entry) => entry.name === focusChildName);
            }
          }
        }
        entries.sort((a, b) => {
          if (a.isFile !== b.isFile) {
            return a.isFile ? 1 : -1;
          }
          return a.name.localeCompare(b.name);
        });
        entries.forEach((child) => {
          if (child.isFile) {
            const fileNode = pathToFileNode.get(child.path);
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
          const folderId = this.getFolderClusterId(child.path);
          const fileCount = countFilesInTree(child);
          const folderNode = {
            id: folderId,
            name: `(${fileCount} files) ${child.name}`,
            kind: "folder",
            summary: "",
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
          if (this.isClusterFolderExpanded(folderId)) {
            visitTree(child, folderId);
          }
        });
      };
      visitTree(fileTree, null);
      const { showExternalNodes } = this.graphView.getFilterState();
      if (showExternalNodes) {
        nodes.forEach((node) => {
          if (node.kind === "external") {
            addNode(node);
          }
        });
      }
      visibleFileIds.forEach((fileId) => {
        if (!this.clusterExpanded.has(fileId)) {
          return;
        }
        const children = directChildrenByFile.get(fileId);
        if (!children || children.length === 0) {
          return;
        }
        children.forEach((child) => addNode(child));
      });
      visibleNodes.forEach((node) => {
        if (node.kind !== "class") {
          return;
        }
        if (!this.classExpanded.has(node.id)) {
          return;
        }
        const children = directChildrenByClass.get(node.id);
        if (!children || children.length === 0) {
          return;
        }
        children.forEach((child) => addNode(child));
      });
      const edgeMap = /* @__PURE__ */ new Map();
      const confidenceRank = { low: 0, medium: 1, high: 2 };
      const addEdge = (source2, target, kind, confidence) => {
        const key = `${source2}:${target}:${kind}`;
        const existing = edgeMap.get(key);
        if (!existing) {
          edgeMap.set(key, { source: source2, target, kind, confidence });
          return;
        }
        if (confidenceRank[confidence] > confidenceRank[existing.confidence]) {
          existing.confidence = confidence;
        }
      };
      const resolveRepresentative = (node) => {
        var _a;
        if (node.kind === "external") {
          return showExternalNodes ? node.id : null;
        }
        const path = (_a = node.location) == null ? void 0 : _a.path;
        if (!path) {
          return visibleNodeIds.has(node.id) ? node.id : null;
        }
        const normalized = this.normalizePath(path);
        if (this.clusterFocusPath && !this.isPathWithinFocus(normalized)) {
          const divergencePath = this.getClusterFocusDivergencePath(normalized);
          if (divergencePath) {
            const divergenceId = this.getFolderClusterId(divergencePath);
            if (visibleNodeIds.has(divergenceId)) {
              return divergenceId;
            }
          }
        }
        const fileNode = pathToFileNode.get(normalized);
        const fileId = fileNode == null ? void 0 : fileNode.id;
        const fileVisible = Boolean(fileId && visibleNodeIds.has(fileId));
        if (node.kind === "file") {
          if (fileVisible && fileId) {
            return fileId;
          }
          const folderId2 = this.findCollapsedFolderId(normalized);
          if (folderId2 && visibleNodeIds.has(folderId2)) {
            return folderId2;
          }
          return fileId != null ? fileId : null;
        }
        if (fileVisible && fileId) {
          if (this.clusterExpanded.has(fileId) && visibleNodeIds.has(node.id)) {
            return node.id;
          }
          return fileId;
        }
        const folderId = this.findCollapsedFolderId(normalized);
        if (folderId && visibleNodeIds.has(folderId)) {
          return folderId;
        }
        return fileId != null ? fileId : null;
      };
      edges.forEach((edge) => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (!sourceNode || !targetNode) {
          return;
        }
        const sourceRep = resolveRepresentative(sourceNode);
        const targetRep = resolveRepresentative(targetNode);
        if (!sourceRep || !targetRep || sourceRep === targetRep) {
          return;
        }
        addEdge(sourceRep, targetRep, edge.kind, edge.confidence);
      });
      folderEdges.forEach((edge) => addEdge(edge.source, edge.target, edge.kind, edge.confidence));
      return {
        nodes: visibleNodes,
        edges: Array.from(edgeMap.values()),
        totalNodes,
        visibleNodes: visibleNodes.length,
        isCapped: false
      };
    }
    refreshGraphView() {
      if (!this.currentChapterId) {
        return;
      }
      const nodes = this.filterNodesForChapter(this.currentChapterId);
      const edges = this.filterEdgesForNodes(nodes);
      const graphView = this.buildGraphView(nodes, edges, this.currentScope);
      this.resetLabelVisibilityCache();
      this.graphView.render({
        nodes: graphView.nodes,
        edges: graphView.edges,
        layoutMode: this.graphLayoutMode
      });
      this.graphView.updateNodeStatus(graphView);
      this.updateOrganizedCircleOverlay();
    }
    setGraphData(graphData) {
      this.graphNodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
      this.graphEdges = Array.isArray(graphData.edges) ? graphData.edges : [];
      this.nodeById = new Map(this.graphNodes.map((node) => [node.id, node]));
      this.fileNodesByPath = /* @__PURE__ */ new Map();
      this.graphNodes.forEach((node) => {
        var _a;
        if (node.kind !== "file" || !((_a = node.location) == null ? void 0 : _a.path)) {
          return;
        }
        this.fileNodesByPath.set(this.normalizePath(node.location.path), node);
      });
      this.fileTreeView.setNodes(this.graphNodes, this.fileNodesByPath);
      if (this.currentScope === "full" || this.tourActive) {
        this.fileTreeController.refresh();
      }
    }
    async loadSymbolSnippet(symbol, shouldNarrate = true) {
      if (shouldNarrate) {
        this.activeStoryArc = null;
      }
      if (!this.canFetchSnippet(symbol)) {
        this.readerController.render(symbol);
        if (shouldNarrate) {
          void this.updateNarrator(symbol);
        }
        return;
      }
      const section = this.getSnippetSection(symbol);
      const cacheKey = `${symbol.id}:${section}`;
      const cached = this.snippetCache.get(cacheKey);
      if (cached) {
        this.readerController.render(symbol, cached);
        if (shouldNarrate) {
          void this.updateNarrator(symbol);
        }
        return;
      }
      const response = await this.api.fetchJson(
        "/gitreader/api/symbol",
        { id: symbol.id, section }
      );
      this.snippetCache.set(cacheKey, response);
      this.pendingSymbol = symbol;
      this.pendingSnippet = response;
      this.readerController.render(symbol, response);
      if (shouldNarrate) {
        void this.updateNarrator(symbol);
      }
    }
    getSnippetSection(symbol) {
      if (this.readerView.getSnippetMode() === "full") {
        return "full";
      }
      if (symbol.kind === "function" || symbol.kind === "method" || symbol.kind === "class") {
        return "body";
      }
      return "full";
    }
    canFetchSnippet(symbol) {
      if (!symbol.id) {
        return false;
      }
      if (symbol.kind === "external" || symbol.kind === "folder") {
        return false;
      }
      return Boolean(symbol.location && symbol.location.path);
    }
    filterNodesForChapter(chapterId) {
      if (!chapterId || !chapterId.startsWith("group:")) {
        return this.graphNodes;
      }
      const group = chapterId.slice("group:".length);
      const filtered = this.graphNodes.filter((node) => {
        const path = this.getNodePath(node);
        if (!path) {
          return false;
        }
        const normalized = path.replace(/\\/g, "/");
        if (group === "root") {
          return normalized.indexOf("/") === -1;
        }
        return normalized.startsWith(`${group}/`);
      });
      return filtered.length > 0 ? filtered : this.graphNodes;
    }
    filterEdgesForNodes(nodes) {
      const allowed = new Set(nodes.map((node) => node.id));
      return this.graphEdges.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target));
    }
    pickFocusNode(nodes) {
      if (nodes.length === 0) {
        return this.fallbackSymbol();
      }
      const priority = ["function", "method", "class", "file", "folder", "blueprint", "external"];
      for (const kind of priority) {
        const match = nodes.find((node) => node.kind === kind);
        if (match) {
          return match;
        }
      }
      return nodes[0];
    }
    fallbackSymbol() {
      return {
        id: "fallback",
        name: "Repository",
        kind: "file",
        summary: "Select a chapter to explore symbols."
      };
    }
    getNodePath(node) {
      if (node.location && node.location.path) {
        return node.location.path;
      }
      return null;
    }
    normalizePath(path) {
      return normalizePath(path);
    }
    isReaderVisible() {
      return this.workspace.dataset.layout !== "canvas";
    }
    getFolderClusterId(path) {
      return `cluster:folder:${path}`;
    }
    // Checks whether a folder is expanded either by user action or auto-focus.
    isClusterFolderExpanded(folderId) {
      return this.clusterExpanded.has(folderId) || this.clusterAutoExpanded.has(folderId);
    }
    findCollapsedFolderId(path) {
      const normalized = this.normalizePath(path);
      const parts = normalized.split("/").filter(Boolean);
      let current = "";
      for (const part of parts.slice(0, -1)) {
        current = current ? `${current}/${part}` : part;
        const folderId = this.getFolderClusterId(current);
        if (!this.isClusterFolderExpanded(folderId)) {
          return folderId;
        }
      }
      return null;
    }
    toggleFileTreePath(path) {
      this.fileTreeView.toggle(path);
      this.fileTreeController.render(this.fileTreeView.getNarratorFocusPath());
      if (this.readerTreeFocusPath) {
        this.readerController.showFileTree(this.readerTreeFocusPath);
      }
    }
    // Loads a file from the file tree into the reader while keeping graph selection in sync.
    handleFileTreeFileSelection(path) {
      const normalized = this.normalizePath(path);
      const fileNode = this.fileNodesByPath.get(normalized);
      if (!fileNode) {
        this.setCodeStatus("File not found in graph.");
        return;
      }
      const folderPath = normalized.split("/").slice(0, -1).join("/");
      this.setClusterFocusPath(folderPath);
      if (this.graphLayoutMode === "cluster") {
        this.refreshGraphView();
      }
      if (this.graphInstance) {
        this.graphInstance.$("node:selected").unselect();
        const fileElement = this.graphInstance.$id(fileNode.id);
        if (fileElement && !fileElement.empty()) {
          fileElement.select();
        }
      }
      this.loadSymbolSnippet(fileNode, false).catch(() => {
        this.readerController.render(fileNode);
      });
      this.fileTreeController.render(normalized);
    }
    // Marks a folder path for auto-expansion while remembering the focused folder scope.
    setClusterFocusPath(path) {
      const normalized = this.normalizePath(path);
      this.clusterFocusPath = normalized || null;
      this.clusterAutoExpanded.clear();
      if (!normalized) {
        return;
      }
      const parts = normalized.split("/").filter(Boolean);
      let current = "";
      for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        const folderId = this.getFolderClusterId(current);
        if (!this.clusterExpanded.has(folderId)) {
          this.clusterAutoExpanded.add(folderId);
        }
      }
    }
    // Checks whether a node path is inside the focused folder subtree.
    isPathWithinFocus(path) {
      if (!this.clusterFocusPath) {
        return false;
      }
      const normalized = this.normalizePath(path);
      if (normalized === this.clusterFocusPath) {
        return true;
      }
      return normalized.startsWith(`${this.clusterFocusPath}/`);
    }
    // Returns the immediate focus child name for a folder so auto-expansion reveals only that branch.
    getClusterFocusChildName(parentPath) {
      var _a;
      if (!this.clusterFocusPath) {
        return null;
      }
      const normalizedParent = this.normalizePath(parentPath);
      const focusParts = this.clusterFocusPath.split("/").filter(Boolean);
      const parentParts = normalizedParent.split("/").filter(Boolean);
      if (parentParts.length >= focusParts.length) {
        return null;
      }
      for (let index = 0; index < parentParts.length; index += 1) {
        if (parentParts[index] !== focusParts[index]) {
          return null;
        }
      }
      return (_a = focusParts[parentParts.length]) != null ? _a : null;
    }
    // Finds the closest shared ancestor between the focus path and a non-focus node path.
    getClusterFocusDivergencePath(path) {
      if (!this.clusterFocusPath) {
        return null;
      }
      const focusParts = this.clusterFocusPath.split("/").filter(Boolean);
      const targetParts = this.normalizePath(path).split("/").filter(Boolean);
      const common = [];
      const max = Math.min(focusParts.length, targetParts.length);
      for (let index = 0; index < max; index += 1) {
        if (focusParts[index] !== targetParts[index]) {
          break;
        }
        common.push(focusParts[index]);
      }
      if (common.length === 0) {
        return null;
      }
      return common.join("/");
    }
    getFileNodeForSymbol(symbol) {
      var _a, _b;
      const path = (_a = symbol.location) == null ? void 0 : _a.path;
      if (!path) {
        return null;
      }
      return (_b = this.fileNodesByPath.get(this.normalizePath(path))) != null ? _b : null;
    }
    // Detects cmd/ctrl clicks so graph interactions can support multi-select behavior.
    isModifierClick(event) {
      if (!event) {
        return false;
      }
      const anyEvent = event;
      if (typeof anyEvent.getModifierState === "function") {
        if (anyEvent.getModifierState("Meta") || anyEvent.getModifierState("Control")) {
          return true;
        }
      }
      return Boolean(anyEvent.metaKey || anyEvent.ctrlKey);
    }
    // Detects shift-clicks so folder selections can bulk-highlight descendants.
    isShiftClick(event) {
      if (!event) {
        return false;
      }
      const anyEvent = event;
      if (typeof anyEvent.getModifierState === "function") {
        if (anyEvent.getModifierState("Shift")) {
          return true;
        }
      }
      return Boolean(anyEvent.shiftKey);
    }
    // Detects the "s+click" chord so sibling selection can short-circuit normal click behavior.
    isSiblingSelectClick(event) {
      if (!this.siblingSelectKeyActive) {
        return false;
      }
      if (!event) {
        return true;
      }
      if (this.isShiftClick(event) || this.isModifierClick(event)) {
        return false;
      }
      return true;
    }
    // Returns true when the event target is an editable surface that should ignore graph hotkeys.
    isEditableTarget(target) {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      if (target.isContentEditable) {
        return true;
      }
      const tag = target.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select";
    }
    isFileNodeActive(fileNode) {
      var _a, _b;
      if (this.currentSymbol && this.currentSymbol.kind === "file") {
        if (this.currentSymbol.id === fileNode.id) {
          return true;
        }
        const currentPath = (_a = this.currentSymbol.location) == null ? void 0 : _a.path;
        const filePath = (_b = fileNode.location) == null ? void 0 : _b.path;
        if (currentPath && filePath && this.normalizePath(currentPath) === this.normalizePath(filePath)) {
          return true;
        }
      }
      if (!this.graphInstance) {
        return false;
      }
      const element = this.graphInstance.$id(fileNode.id);
      return Boolean(element && typeof element.selected === "function" && element.selected());
    }
    async highlightSymbolInFile(fileNode, symbol) {
      if (!this.currentSymbol || this.currentSymbol.id !== fileNode.id) {
        try {
          await this.loadSymbolSnippet(fileNode);
        } catch {
          this.readerController.render(fileNode);
          void this.updateNarrator(fileNode);
        }
      }
      this.applyFocusHighlight(symbol);
    }
    handleFileFocusClick(symbol, event) {
      if (symbol.kind !== "function" && symbol.kind !== "method") {
        return false;
      }
      const fileNode = this.getFileNodeForSymbol(symbol);
      if (!fileNode || !this.isFileNodeActive(fileNode)) {
        return false;
      }
      if (this.graphInstance) {
        this.graphInstance.$("node:selected").unselect();
        this.graphInstance.$id(fileNode.id).select();
        this.graphInstance.$id(symbol.id).select();
      }
      void this.highlightSymbolInFile(fileNode, symbol);
      return true;
    }
    // Selects visible descendants of a folder node so groups can be moved together.
    handleShiftFolderSelection(symbol) {
      var _a;
      if (this.graphLayoutMode !== "cluster") {
        return false;
      }
      if (symbol.kind !== "folder") {
        return false;
      }
      if (!this.graphInstance) {
        return false;
      }
      const folderElement = this.graphInstance.$id(symbol.id);
      if (!folderElement || folderElement.empty()) {
        return false;
      }
      const folderPath = folderElement.data("path") || ((_a = symbol.location) == null ? void 0 : _a.path);
      if (!folderPath) {
        this.graphInstance.$("node:selected").unselect();
        this.graphView.refreshEdgeHighlights();
        this.updateLabelVisibility();
        return true;
      }
      const normalizedFolderPath = this.normalizePath(String(folderPath));
      const prefix = normalizedFolderPath ? `${normalizedFolderPath}/` : "";
      const visibleNodes = this.graphInstance.nodes(":visible");
      const nodesToSelect = visibleNodes.filter((node) => {
        const nodePath = node.data("path");
        if (!nodePath) {
          return false;
        }
        const normalizedNodePath = this.normalizePath(String(nodePath));
        return Boolean(prefix && normalizedNodePath.startsWith(prefix));
      });
      this.graphInstance.$("node:selected").unselect();
      nodesToSelect.select();
      this.graphView.refreshEdgeHighlights();
      this.updateLabelVisibility();
      return true;
    }
    // Replaces selection with visible class nodes that belong to a file node element.
    handleFileClassSelection(node) {
      if (!this.graphInstance) {
        return false;
      }
      if (!node || typeof node.data !== "function") {
        return false;
      }
      if (node.data("kind") !== "file") {
        return false;
      }
      const filePath = node.data("path");
      if (!filePath) {
        return false;
      }
      const normalizedFilePath = this.normalizePath(String(filePath));
      const visibleSymbols = this.graphInstance.nodes(":visible").filter((element) => {
        const kind = element.data("kind");
        if (kind !== "class" && kind !== "function") {
          return false;
        }
        const symbolPath = element.data("path");
        if (!symbolPath) {
          return false;
        }
        return this.normalizePath(String(symbolPath)) === normalizedFilePath;
      });
      if (!visibleSymbols || visibleSymbols.empty()) {
        return false;
      }
      this.graphInstance.$("node:selected").unselect();
      if (typeof node.unselect === "function") {
        node.unselect();
      }
      visibleSymbols.select();
      return true;
    }
    // Replaces selection with visible method nodes when a class is expanded and shift-clicked.
    handleShiftClassSelection(symbol) {
      if (this.graphLayoutMode !== "cluster") {
        return false;
      }
      if (!symbol || symbol.kind !== "class") {
        return false;
      }
      if (!this.classExpanded.has(symbol.id)) {
        return false;
      }
      if (!this.graphInstance) {
        return false;
      }
      const methodIds = this.graphEdges.filter((edge) => edge.kind === "contains" && edge.source === symbol.id).map((edge) => edge.target).filter((targetId) => {
        var _a;
        return ((_a = this.nodeById.get(targetId)) == null ? void 0 : _a.kind) === "method";
      });
      if (methodIds.length === 0) {
        return false;
      }
      const methodIdSet = new Set(methodIds);
      const visibleMethods = this.graphInstance.nodes(":visible").filter((element) => {
        if (element.data("kind") !== "method") {
          return false;
        }
        return methodIdSet.has(element.id());
      });
      if (!visibleMethods || visibleMethods.empty()) {
        return false;
      }
      this.graphInstance.$("node:selected").unselect();
      visibleMethods.select();
      return true;
    }
    // Selects visible siblings that share the same parent when the user s-clicks a node.
    handleSiblingSelection(symbol) {
      if (!this.graphInstance || !(symbol == null ? void 0 : symbol.id)) {
        return false;
      }
      const parentElement = this.resolveVisibleParent(symbol);
      if (!parentElement) {
        return true;
      }
      const siblings = this.getVisibleSiblingNodes(parentElement.id(), symbol.id);
      this.graphInstance.$("node:selected").unselect();
      if (siblings && !siblings.empty()) {
        siblings.select();
      }
      this.graphView.refreshEdgeHighlights();
      this.updateLabelVisibility();
      return true;
    }
    // Collects visible sibling nodes by following contains edges from a shared parent id.
    getVisibleSiblingNodes(parentId, excludeId) {
      if (!this.graphInstance) {
        return null;
      }
      const edges = this.graphInstance.edges().filter((edge) => edge.data("kind") === "contains" && edge.data("source") === parentId);
      return edges.targets().filter(":visible").filter((node) => node.id() !== excludeId);
    }
    // Hides the graph context menu when the user clicks elsewhere.
    hideGraphContextMenu() {
      this.graphContextMenu.hide();
    }
    // Opens the graph context menu for the given node and click event.
    openGraphContextMenu(symbol, event) {
      if (!(symbol == null ? void 0 : symbol.id)) {
        return;
      }
      if (this.tourActive && !this.isGuidedNodeAllowed(symbol.id)) {
        this.flashGuidedMessage("Follow the guide to unlock this step.");
        return;
      }
      const anchor = this.getContextMenuAnchor(event);
      const actions = this.buildGraphContextMenuActions(symbol);
      if (actions.length === 0) {
        this.graphContextMenu.hide();
        return;
      }
      this.graphContextMenu.show({
        x: anchor.x,
        y: anchor.y,
        title: symbol.name || symbol.id,
        actions
      });
    }
    // Computes the screen-space anchor for the context menu.
    getContextMenuAnchor(event) {
      const originalEvent = event == null ? void 0 : event.originalEvent;
      if (originalEvent) {
        return { x: originalEvent.clientX, y: originalEvent.clientY };
      }
      const rendered = event == null ? void 0 : event.renderedPosition;
      if (rendered && this.canvasGraph) {
        const rect = this.canvasGraph.getBoundingClientRect();
        return { x: rect.left + rendered.x, y: rect.top + rendered.y };
      }
      return { x: 0, y: 0 };
    }
    // Builds the action list for the graph context menu based on node relationships.
    buildGraphContextMenuActions(symbol) {
      const actions = [];
      const hasParent = Boolean(this.resolveVisibleParent(symbol));
      const hasChildren = Boolean(this.getVisibleChildren(symbol));
      const expansionState = this.getChildExpansionState(symbol);
      const canOpenChildren = this.graphLayoutMode === "cluster" && expansionState.hasChildren && !expansionState.isExpanded;
      const canCloseChildren = this.graphLayoutMode === "cluster" && expansionState.hasChildren && expansionState.isExpanded;
      actions.push({
        id: "select-parent",
        label: "Select Parent",
        disabled: !hasParent,
        onSelect: () => {
          this.selectParent(symbol);
        }
      });
      actions.push({
        id: "select-children",
        label: "Select Children",
        disabled: !hasChildren,
        onSelect: () => {
          this.selectChildren(symbol);
        }
      });
      actions.push({
        id: "open-children",
        label: "Open Children",
        disabled: !canOpenChildren,
        onSelect: () => {
          this.openChildren(symbol);
        }
      });
      actions.push({
        id: "close-children",
        label: "Close Children",
        disabled: !canCloseChildren,
        onSelect: () => {
          this.closeChildren(symbol);
        }
      });
      actions.push({
        id: "organize-children-circle",
        label: "Organize Children: Circle",
        disabled: !hasChildren,
        onSelect: () => {
          this.organizeChildren(symbol, "circle");
        }
      });
      actions.push({
        id: "organize-children-grid",
        label: "Organize Children: Grid",
        disabled: !hasChildren,
        onSelect: () => {
          this.organizeChildren(symbol, "grid");
        }
      });
      return actions;
    }
    // Reports whether a node has expandable children and whether they're currently expanded so the context menu can enable Open/Close.
    getChildExpansionState(symbol) {
      if (!(symbol == null ? void 0 : symbol.id)) {
        return { hasChildren: false, isExpanded: false };
      }
      if (symbol.kind === "folder") {
        return {
          hasChildren: this.folderHasClusterChildren(symbol),
          isExpanded: this.isClusterFolderExpanded(symbol.id)
        };
      }
      if (symbol.kind === "file") {
        return {
          hasChildren: this.fileHasClusterChildren(symbol),
          isExpanded: this.clusterExpanded.has(symbol.id)
        };
      }
      if (symbol.kind === "class") {
        return {
          hasChildren: this.classHasClusterChildren(symbol),
          isExpanded: this.classExpanded.has(symbol.id)
        };
      }
      return { hasChildren: false, isExpanded: false };
    }
    // Expands a node's immediate children in cluster view when the context menu requests "Open Children".
    openChildren(symbol) {
      if (this.graphLayoutMode !== "cluster" || !(symbol == null ? void 0 : symbol.id)) {
        return;
      }
      let changed = false;
      if (symbol.kind === "folder") {
        if (this.folderHasClusterChildren(symbol) && !this.isClusterFolderExpanded(symbol.id)) {
          this.clusterExpanded.add(symbol.id);
          changed = true;
        }
      } else if (symbol.kind === "file") {
        if (this.fileHasClusterChildren(symbol) && !this.clusterExpanded.has(symbol.id)) {
          this.clusterExpanded.add(symbol.id);
          changed = true;
        }
      } else if (symbol.kind === "class") {
        if (this.classHasClusterChildren(symbol) && !this.classExpanded.has(symbol.id)) {
          this.classExpanded.add(symbol.id);
          changed = true;
        }
      }
      if (changed) {
        this.refreshGraphView();
      }
    }
    // Collapses a node's immediate children in cluster view when the context menu requests "Close Children".
    closeChildren(symbol) {
      if (this.graphLayoutMode !== "cluster" || !(symbol == null ? void 0 : symbol.id)) {
        return;
      }
      let changed = false;
      if (symbol.kind === "folder") {
        if (this.isClusterFolderExpanded(symbol.id)) {
          this.clusterExpanded.delete(symbol.id);
          this.clusterAutoExpanded.delete(symbol.id);
          changed = true;
        }
      } else if (symbol.kind === "file") {
        if (this.clusterExpanded.has(symbol.id)) {
          this.clusterExpanded.delete(symbol.id);
          changed = true;
        }
      } else if (symbol.kind === "class") {
        if (this.classExpanded.has(symbol.id)) {
          this.classExpanded.delete(symbol.id);
          changed = true;
        }
      }
      if (changed) {
        this.refreshGraphView();
      }
    }
    // Resolves a visible parent node element for the provided symbol.
    resolveVisibleParent(symbol) {
      if (!this.graphInstance) {
        return null;
      }
      const parentId = this.getParentNodeId(symbol);
      if (!parentId) {
        return null;
      }
      const parentElement = this.graphInstance.$id(parentId);
      if (!parentElement || parentElement.empty() || parentElement.hidden()) {
        return null;
      }
      return parentElement;
    }
    // Selects the parent node and centers the canvas on it.
    selectParent(symbol) {
      if (!this.graphInstance) {
        return;
      }
      const parentElement = this.resolveVisibleParent(symbol);
      if (!parentElement) {
        this.flashGuidedMessage("No parent available in the current view.");
        return;
      }
      this.graphInstance.$("node:selected").unselect();
      parentElement.select();
      this.graphView.refreshEdgeHighlights();
      this.updateLabelVisibility();
      if (typeof this.graphInstance.center === "function") {
        this.graphInstance.center(parentElement);
      }
    }
    // Selects visible children for the given symbol based on contains edges or folder paths.
    selectChildren(symbol) {
      if (!this.graphInstance) {
        return;
      }
      const children = this.getVisibleChildren(symbol);
      if (!children || children.empty()) {
        this.flashGuidedMessage("No visible children to select.");
        return;
      }
      this.graphInstance.$("node:selected").unselect();
      children.select();
      this.graphView.refreshEdgeHighlights();
      this.updateLabelVisibility();
    }
    // Organizes visible children around their parent using the chosen layout style.
    organizeChildren(symbol, layout) {
      if (!this.graphInstance) {
        return;
      }
      if (this.graphLayoutMode === "cluster") {
        this.graphView.setClusterManualLayout(true);
      }
      const parentElement = this.graphInstance.$id(symbol.id);
      const children = this.getVisibleChildren(symbol);
      if (!parentElement || parentElement.empty() || !children || children.empty()) {
        return;
      }
      this.clearOrganizedCircleOverlay();
      const center = parentElement.position();
      const count = children.length;
      if (layout === "circle") {
        const radius = Math.max(80, 28 * count);
        const childIds = [];
        children.forEach((child, index) => {
          childIds.push(child.id());
          const angle = 2 * Math.PI * index / Math.max(1, count);
          child.position({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle)
          });
        });
        this.setOrganizedCircleState(parentElement.id(), childIds, radius);
        return;
      }
      const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
      const spacing = 80;
      const rows = Math.ceil(count / columns);
      const startX = center.x - (columns - 1) * spacing / 2;
      const startY = center.y - (rows - 1) * spacing / 2;
      children.forEach((child, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        child.position({
          x: startX + col * spacing,
          y: startY + row * spacing
        });
      });
    }
    // Builds the overlay UI that lets users tighten an organized circle of children.
    initializeOrganizedCircleOverlay() {
      this.organizedCircleOverlay = document.createElement("div");
      this.organizedCircleOverlay.className = "graph-orbit";
      this.organizedCircleOverlay.setAttribute("aria-hidden", "true");
      this.organizedCircleButton = document.createElement("button");
      this.organizedCircleButton.type = "button";
      this.organizedCircleButton.className = "graph-orbit__button";
      this.organizedCircleButton.textContent = "<->";
      this.organizedCircleButton.setAttribute("aria-label", "Drag to move children inward or outward");
      this.organizedCircleButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.handleOrganizedCircleDragStart(event);
      });
      this.organizedCircleOverlay.appendChild(this.organizedCircleButton);
      this.canvasSurface.appendChild(this.organizedCircleOverlay);
      this.canvasSurface.addEventListener("pointerdown", (event) => {
        this.handleOrganizedCircleDismissStart(event);
      });
      window.addEventListener("pointermove", (event) => {
        this.handleOrganizedCircleDragMove(event);
        this.handleOrganizedCircleDismissMove(event);
      });
      window.addEventListener("pointerup", (event) => {
        this.handleOrganizedCircleDragEnd(event);
        this.handleOrganizedCircleDismissEnd(event);
      });
      window.addEventListener("pointercancel", (event) => {
        this.handleOrganizedCircleDragEnd(event);
        this.handleOrganizedCircleDismissEnd(event);
      });
    }
    // Stores the last organized circle state so we can re-render its overlay on zoom or pan.
    setOrganizedCircleState(parentId, childIds, radius) {
      if (!parentId || childIds.length === 0) {
        this.clearOrganizedCircleOverlay();
        return;
      }
      this.organizedCircleState = {
        parentId,
        childIds,
        radius
      };
      this.updateOrganizedCircleOverlay();
    }
    // Clears the organized circle overlay when it is no longer relevant.
    clearOrganizedCircleOverlay() {
      this.organizedCircleState = null;
      if (!this.organizedCircleOverlay) {
        return;
      }
      this.organizedCircleOverlay.classList.remove("is-visible");
      this.organizedCircleOverlay.setAttribute("aria-hidden", "true");
    }
    // Repositions the organized circle overlay to stay centered on the parent and sized to the child radius.
    updateOrganizedCircleOverlay() {
      if (!this.organizedCircleState || !this.graphInstance || this.graphLayoutMode !== "cluster") {
        this.clearOrganizedCircleOverlay();
        return;
      }
      const parentElement = this.graphInstance.$id(this.organizedCircleState.parentId);
      if (!parentElement || parentElement.empty() || parentElement.hidden()) {
        this.clearOrganizedCircleOverlay();
        return;
      }
      const children = this.getOrganizedChildrenElements(this.organizedCircleState);
      if (!children || children.empty()) {
        this.clearOrganizedCircleOverlay();
        return;
      }
      const zoom = this.graphInstance.zoom();
      const center = parentElement.position();
      const renderedCenter = this.getRenderedPoint(center);
      const ringPadding = this.getOrganizedCirclePadding();
      const renderedRadius = Math.max(24, (this.organizedCircleState.radius + ringPadding) * zoom);
      const surfaceRect = this.canvasSurface.getBoundingClientRect();
      const graphRect = this.canvasGraph.getBoundingClientRect();
      const offsetX = graphRect.left - surfaceRect.left;
      const offsetY = graphRect.top - surfaceRect.top;
      this.organizedCircleOverlay.style.left = `${offsetX + renderedCenter.x - renderedRadius}px`;
      this.organizedCircleOverlay.style.top = `${offsetY + renderedCenter.y - renderedRadius}px`;
      this.organizedCircleOverlay.style.width = `${renderedRadius * 2}px`;
      this.organizedCircleOverlay.style.height = `${renderedRadius * 2}px`;
      this.organizedCircleOverlay.classList.add("is-visible");
      this.organizedCircleOverlay.setAttribute("aria-hidden", "false");
      this.organizedCircleButton.disabled = this.organizedCircleState.radius <= this.getOrganizedCircleMinRadius();
    }
    // Moves the organized children closer to their parent by shrinking the circle radius.
    nudgeOrganizedChildrenInward() {
      if (!this.graphInstance || !this.organizedCircleState) {
        return;
      }
      const parentElement = this.graphInstance.$id(this.organizedCircleState.parentId);
      const children = this.getOrganizedChildrenElements(this.organizedCircleState);
      if (!parentElement || parentElement.empty() || !children || children.empty()) {
        this.clearOrganizedCircleOverlay();
        return;
      }
      const center = parentElement.position();
      const minRadius = this.getOrganizedCircleMinRadius();
      const nextRadius = Math.max(minRadius, this.organizedCircleState.radius * 0.82);
      this.graphInstance.batch(() => {
        this.positionChildrenOnCircle(children, center, nextRadius);
      });
      this.organizedCircleState.radius = nextRadius;
      this.updateOrganizedCircleOverlay();
    }
    // Begins dragging the orbit handle so pointer movement can resize the circle.
    handleOrganizedCircleDragStart(event) {
      if (!this.organizedCircleState) {
        return;
      }
      this.organizedCircleDragActive = true;
      this.organizedCircleDragPointerId = event.pointerId;
      if (typeof this.organizedCircleButton.setPointerCapture === "function") {
        this.organizedCircleButton.setPointerCapture(event.pointerId);
      }
      this.updateOrganizedCircleRadiusFromPointer(event);
    }
    // Updates the organized circle radius while dragging the handle.
    handleOrganizedCircleDragMove(event) {
      if (!this.organizedCircleDragActive) {
        return;
      }
      if (this.organizedCircleDragPointerId !== null && event.pointerId !== this.organizedCircleDragPointerId) {
        return;
      }
      this.updateOrganizedCircleRadiusFromPointer(event);
    }
    // Ends the drag interaction and releases the pointer capture when finished.
    handleOrganizedCircleDragEnd(event) {
      if (!this.organizedCircleDragActive) {
        return;
      }
      if (this.organizedCircleDragPointerId !== null && event.pointerId !== this.organizedCircleDragPointerId) {
        return;
      }
      this.organizedCircleDragActive = false;
      this.organizedCircleDragPointerId = null;
      if (typeof this.organizedCircleButton.releasePointerCapture === "function") {
        this.organizedCircleButton.releasePointerCapture(event.pointerId);
      }
    }
    // Begins tracking a pointerdown so a simple click can dismiss the orbit without affecting drags.
    handleOrganizedCircleDismissStart(event) {
      if (!this.organizedCircleState || this.organizedCircleDragActive) {
        return;
      }
      if (event.target === this.organizedCircleButton) {
        return;
      }
      if (event.target instanceof Node && this.organizedCircleOverlay.contains(event.target)) {
        return;
      }
      this.organizedCircleDismissStart = { x: event.clientX, y: event.clientY };
      this.organizedCircleDismissPointerId = event.pointerId;
      this.organizedCircleDismissMoved = false;
    }
    // Tracks pointer movement to distinguish drags from simple clicks when dismissing the orbit.
    handleOrganizedCircleDismissMove(event) {
      if (!this.organizedCircleDismissStart) {
        return;
      }
      if (this.organizedCircleDismissPointerId !== null && event.pointerId !== this.organizedCircleDismissPointerId) {
        return;
      }
      if (this.organizedCircleDragActive) {
        this.resetOrganizedCircleDismissTracking();
        return;
      }
      const dx = event.clientX - this.organizedCircleDismissStart.x;
      const dy = event.clientY - this.organizedCircleDismissStart.y;
      if (Math.hypot(dx, dy) > this.getOrganizedCircleDismissThreshold()) {
        this.organizedCircleDismissMoved = true;
      }
    }
    // Clears the orbit only when the user clicks without dragging on the canvas.
    handleOrganizedCircleDismissEnd(event) {
      if (!this.organizedCircleDismissStart) {
        return;
      }
      if (this.organizedCircleDismissPointerId !== null && event.pointerId !== this.organizedCircleDismissPointerId) {
        return;
      }
      const shouldDismiss = !this.organizedCircleDismissMoved && !this.organizedCircleDragActive;
      this.resetOrganizedCircleDismissTracking();
      if (shouldDismiss) {
        this.clearOrganizedCircleOverlay();
      }
    }
    // Resets tracking data used for click-to-dismiss detection.
    resetOrganizedCircleDismissTracking() {
      this.organizedCircleDismissStart = null;
      this.organizedCircleDismissPointerId = null;
      this.organizedCircleDismissMoved = false;
    }
    // Computes a new radius from pointer distance and reapplies the circular layout.
    updateOrganizedCircleRadiusFromPointer(event) {
      if (!this.graphInstance || !this.organizedCircleState) {
        return;
      }
      const parentElement = this.graphInstance.$id(this.organizedCircleState.parentId);
      const children = this.getOrganizedChildrenElements(this.organizedCircleState);
      if (!parentElement || parentElement.empty() || !children || children.empty()) {
        this.clearOrganizedCircleOverlay();
        return;
      }
      const graphRect = this.canvasGraph.getBoundingClientRect();
      const pointerX = event.clientX - graphRect.left;
      const pointerY = event.clientY - graphRect.top;
      const zoom = this.graphInstance.zoom();
      const center = parentElement.position();
      const renderedCenter = this.getRenderedPoint(center);
      const distance = Math.hypot(pointerX - renderedCenter.x, pointerY - renderedCenter.y);
      const ringPadding = this.getOrganizedCirclePadding();
      const minRadius = this.getOrganizedCircleMinRadius();
      const nextRadius = Math.max(minRadius, distance / zoom - ringPadding);
      this.graphInstance.batch(() => {
        this.positionChildrenOnCircle(children, center, nextRadius);
      });
      this.organizedCircleState.radius = nextRadius;
      this.updateOrganizedCircleOverlay();
    }
    // Positions the provided child nodes around the parent at a fixed radius.
    positionChildrenOnCircle(children, center, radius) {
      children.forEach((child) => {
        const position = child.position();
        const angle = Math.atan2(position.y - center.y, position.x - center.x);
        child.position({
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle)
        });
      });
    }
    // Returns the ring padding applied around organized children for the orbit overlay.
    getOrganizedCirclePadding() {
      return 32;
    }
    // Returns the pixel distance threshold used to treat a pointer interaction as a drag.
    getOrganizedCircleDismissThreshold() {
      return 6;
    }
    // Returns the smallest radius allowed when tightening the orbit around a parent.
    getOrganizedCircleMinRadius() {
      return 56;
    }
    // Resolves the visible child node elements for the active organized circle state.
    getOrganizedChildrenElements(state) {
      if (!this.graphInstance) {
        return null;
      }
      const visibleIds = state.childIds.filter((childId) => {
        const element = this.graphInstance.$id(childId);
        return element && !element.empty() && !element.hidden();
      });
      if (visibleIds.length === 0) {
        return null;
      }
      const visibleIdSet = new Set(visibleIds);
      return this.graphInstance.nodes(":visible").filter((element) => visibleIdSet.has(element.id()));
    }
    // Converts a model-space point into rendered pixel coordinates in the graph container.
    getRenderedPoint(position) {
      if (!this.graphInstance) {
        return { x: 0, y: 0 };
      }
      const zoom = this.graphInstance.zoom();
      const pan = this.graphInstance.pan();
      return {
        x: position.x * zoom + pan.x,
        y: position.y * zoom + pan.y
      };
    }
    // Finds the parent node id for the provided symbol based on contains edges or folder paths.
    getParentNodeId(symbol) {
      var _a, _b, _c;
      if (!(symbol == null ? void 0 : symbol.id)) {
        return null;
      }
      if (symbol.kind === "method") {
        const edge = this.graphEdges.find((item) => {
          var _a2;
          return item.kind === "contains" && item.target === symbol.id && ((_a2 = this.nodeById.get(item.source)) == null ? void 0 : _a2.kind) === "class";
        });
        return (_a = edge == null ? void 0 : edge.source) != null ? _a : null;
      }
      if (symbol.kind === "class" || symbol.kind === "function") {
        const edge = this.graphEdges.find((item) => {
          var _a2;
          return item.kind === "contains" && item.target === symbol.id && ((_a2 = this.nodeById.get(item.source)) == null ? void 0 : _a2.kind) === "file";
        });
        return (_b = edge == null ? void 0 : edge.source) != null ? _b : null;
      }
      if (symbol.kind === "file" || symbol.kind === "folder") {
        const path = (_c = symbol.location) == null ? void 0 : _c.path;
        if (!path) {
          return null;
        }
        const normalized = this.normalizePath(path);
        const parts = normalized.split("/").filter(Boolean);
        if (parts.length <= 1) {
          return null;
        }
        const parentPath = parts.slice(0, -1).join("/");
        return this.getFolderClusterId(parentPath);
      }
      return null;
    }
    // Collects visible child node elements based on the symbol's kind.
    getVisibleChildren(symbol) {
      var _a;
      if (!this.graphInstance || !(symbol == null ? void 0 : symbol.id)) {
        return null;
      }
      const visibleNodes = this.graphInstance.nodes(":visible");
      if (symbol.kind === "file") {
        const childIds = this.graphEdges.filter((edge) => edge.kind === "contains" && edge.source === symbol.id).map((edge) => edge.target).filter((target) => {
          var _a2;
          const kind = (_a2 = this.nodeById.get(target)) == null ? void 0 : _a2.kind;
          return kind === "class" || kind === "function";
        });
        if (childIds.length === 0) {
          return null;
        }
        const childIdSet = new Set(childIds);
        return visibleNodes.filter((node) => childIdSet.has(node.id()));
      }
      if (symbol.kind === "class") {
        const childIds = this.graphEdges.filter((edge) => edge.kind === "contains" && edge.source === symbol.id).map((edge) => edge.target).filter((target) => {
          var _a2;
          return ((_a2 = this.nodeById.get(target)) == null ? void 0 : _a2.kind) === "method";
        });
        if (childIds.length === 0) {
          return null;
        }
        const childIdSet = new Set(childIds);
        return visibleNodes.filter((node) => childIdSet.has(node.id()));
      }
      if (symbol.kind === "folder") {
        const path = (_a = symbol.location) == null ? void 0 : _a.path;
        if (!path) {
          return null;
        }
        const normalized = this.normalizePath(path);
        const prefix = normalized ? `${normalized}/` : "";
        if (!prefix) {
          return null;
        }
        return visibleNodes.filter((node) => {
          const nodePath = node.data("path");
          if (!nodePath) {
            return false;
          }
          const normalizedNodePath = this.normalizePath(String(nodePath));
          return normalizedNodePath.startsWith(prefix);
        });
      }
      return null;
    }
    handleClusterNodeToggle(symbol, event) {
      var _a;
      if (symbol.kind === "folder") {
        this.toggleClusterExpansion(symbol.id);
        return true;
      }
      if (symbol.kind === "class") {
        if (this.isModifierClick(event)) {
          return false;
        }
        if (!this.classHasClusterChildren(symbol)) {
          return false;
        }
        this.toggleClassExpansion(symbol.id);
        return true;
      }
      if (symbol.kind !== "file") {
        return false;
      }
      if (this.isModifierClick(event)) {
        return false;
      }
      if (!((_a = symbol.location) == null ? void 0 : _a.path)) {
        return false;
      }
      if (!this.fileHasClusterChildren(symbol)) {
        return false;
      }
      this.toggleClusterExpansion(symbol.id);
      return true;
    }
    handleClusterFolderSingleClick(symbol) {
      var _a;
      if (symbol.kind !== "folder") {
        return false;
      }
      if (this.isReaderVisible()) {
        const folderPath = (_a = symbol.location) == null ? void 0 : _a.path;
        if (folderPath) {
          this.readerController.showFileTree(folderPath);
          this.fileTreeController.render(folderPath);
          this.renderFileTreeNarrator();
        }
      }
      return true;
    }
    toggleClusterExpansion(nodeId) {
      if (this.clusterExpanded.has(nodeId) || this.clusterAutoExpanded.has(nodeId)) {
        this.clusterExpanded.delete(nodeId);
        this.clusterAutoExpanded.delete(nodeId);
      } else {
        this.clusterExpanded.add(nodeId);
      }
      this.refreshGraphView();
    }
    // Toggles class expansion so double-click reveals method nodes for that class.
    toggleClassExpansion(nodeId) {
      if (this.classExpanded.has(nodeId)) {
        this.classExpanded.delete(nodeId);
      } else {
        this.classExpanded.add(nodeId);
      }
      this.refreshGraphView();
    }
    fileHasClusterChildren(fileNode) {
      var _a;
      const path = (_a = fileNode.location) == null ? void 0 : _a.path;
      if (!path) {
        return false;
      }
      const normalized = this.normalizePath(path);
      return this.graphNodes.some((node) => {
        var _a2;
        if (node.kind === "file" || node.kind === "external") {
          return false;
        }
        if (!((_a2 = node.location) == null ? void 0 : _a2.path)) {
          return false;
        }
        return this.normalizePath(node.location.path) === normalized;
      });
    }
    // Checks whether a cluster folder represents at least one file descendant so Open/Close actions only appear when meaningful.
    folderHasClusterChildren(folderNode) {
      var _a;
      const path = (_a = folderNode.location) == null ? void 0 : _a.path;
      if (!path) {
        return false;
      }
      const normalized = this.normalizePath(path);
      if (!normalized) {
        return false;
      }
      const prefix = `${normalized}/`;
      return this.graphNodes.some((node) => {
        var _a2;
        if (!((_a2 = node.location) == null ? void 0 : _a2.path)) {
          return false;
        }
        return this.normalizePath(node.location.path).startsWith(prefix);
      });
    }
    // Checks whether a class node has method children so it can be expanded.
    classHasClusterChildren(classNode) {
      if (!classNode.id) {
        return false;
      }
      return this.graphEdges.some((edge) => {
        if (edge.kind !== "contains" || edge.source !== classNode.id) {
          return false;
        }
        const target = this.nodeById.get(edge.target);
        return (target == null ? void 0 : target.kind) === "method";
      });
    }
    applyFocusHighlight(symbol) {
      var _a, _b, _c, _d;
      const start = (_b = (_a = symbol.location) == null ? void 0 : _a.start_line) != null ? _b : 0;
      const end = (_d = (_c = symbol.location) == null ? void 0 : _c.end_line) != null ? _d : start;
      if (!start) {
        this.setCodeStatus("Line range unavailable.");
        return;
      }
      this.clearFocusHighlights();
      let firstLine = null;
      let found = false;
      for (let line = start; line <= end; line += 1) {
        const lineEl = this.codeSurface.querySelector(`[data-line="${line}"]`);
        if (!lineEl) {
          continue;
        }
        lineEl.classList.add("is-focus");
        if (!firstLine) {
          firstLine = lineEl;
        }
        found = true;
      }
      if (!found) {
        this.setCodeStatus("Selection outside snippet.");
        return;
      }
      this.setCodeStatus(`Highlighted ${symbol.name}.`);
      if (firstLine) {
        firstLine.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    clearFocusHighlights() {
      this.codeSurface.querySelectorAll(".code-line.is-focus").forEach((line) => line.classList.remove("is-focus"));
    }
    setActiveToc(chapterId) {
      Array.from(this.tocList.children).forEach((child) => {
        const element = child;
        const isActive = element.dataset.chapterId === chapterId;
        element.classList.toggle("is-active", isActive);
      });
      if (this.tocMode === "routes") {
        this.syncRoutePickerSelection(chapterId);
      } else {
        this.syncRoutePickerSelection("");
      }
    }
    syncRoutePickerSelection(arcId) {
      if (!this.storyArcsById.has(arcId)) {
        this.routeSelect.value = "";
        return;
      }
      this.routeSelect.value = arcId;
    }
    formatLocation(location, startLine, endLine) {
      return formatLocation(location, startLine, endLine);
    }
    jumpToSymbol(symbol) {
      if (this.graphInstance) {
        const fileNode = this.getFileNodeForSymbol(symbol);
        const fileElement = fileNode ? this.graphInstance.$id(fileNode.id) : null;
        const symbolElement = this.graphInstance.$id(symbol.id);
        if (fileElement && !fileElement.empty()) {
          this.graphInstance.$("node:selected").unselect();
          fileElement.select();
          if (symbolElement && !symbolElement.empty() && symbolElement.id() !== fileElement.id()) {
            symbolElement.select();
          }
        } else if (symbolElement && !symbolElement.empty()) {
          this.graphInstance.$("node:selected").unselect();
          symbolElement.select();
        }
      }
      this.loadSymbolSnippet(symbol).catch(() => {
        this.readerController.render(symbol);
        void this.updateNarrator(symbol);
      });
    }
    clearGraph() {
      if (this.graphInstance) {
        this.graphInstance.elements().remove();
      }
      this.graphView.hideTooltip();
    }
    bindGraphEvents() {
      if (!this.graphInstance) {
        return;
      }
      const didBind = bindGraphEvents({
        graph: this.graphInstance,
        isBound: this.graphEventsBound,
        state: {
          getLastTapNodeId: () => this.lastTapNodeId,
          setLastTapNodeId: (nodeId) => {
            this.lastTapNodeId = nodeId;
          },
          getLastTapAt: () => this.lastTapAt,
          setLastTapAt: (timestamp) => {
            this.lastTapAt = timestamp;
          },
          doubleTapDelay: this.doubleTapDelay
        },
        handlers: {
          resolveNode: (nodeId) => {
            var _a, _b;
            return (_b = (_a = this.displayNodeById.get(nodeId)) != null ? _a : this.nodeById.get(nodeId)) != null ? _b : null;
          },
          getGraphLayoutMode: () => this.graphLayoutMode,
          isTourActive: () => this.tourActive,
          isGuidedNodeAllowed: (nodeId) => this.isGuidedNodeAllowed(nodeId),
          flashGuidedMessage: (message) => this.flashGuidedMessage(message),
          advanceTour: (action, nodeId) => this.advanceTour(action, nodeId),
          handleClusterNodeToggle: (node, event) => this.handleClusterNodeToggle(node, event),
          handleClusterFolderSingleClick: (node) => this.handleClusterFolderSingleClick(node),
          handleFileFocusClick: (node, event) => this.handleFileFocusClick(node, event),
          loadSymbolSnippet: (node) => this.loadSymbolSnippet(node),
          renderCode: (node) => this.readerController.render(node),
          updateNarrator: (node) => this.updateNarrator(node),
          isModifierClick: (event) => this.isModifierClick(event),
          isShiftClick: (event) => this.isShiftClick(event),
          isSiblingSelectClick: (event) => this.isSiblingSelectClick(event),
          handleShiftFolderSelection: (node) => this.handleShiftFolderSelection(node),
          handleFileClassSelection: (node) => this.handleFileClassSelection(node),
          handleShiftClassSelection: (node) => this.handleShiftClassSelection(node),
          handleSiblingSelection: (node) => this.handleSiblingSelection(node),
          openGraphContextMenu: (node, event) => this.openGraphContextMenu(node, event),
          hideGraphContextMenu: () => this.hideGraphContextMenu(),
          refreshEdgeHighlights: () => this.graphView.refreshEdgeHighlights(),
          updateLabelVisibility: () => this.updateLabelVisibility(),
          setHoveredNode: (nodeId) => this.graphView.setHoveredNode(nodeId),
          showGraphTooltip: (node, event) => this.graphView.showTooltip(node, event),
          hideGraphTooltip: () => this.graphView.hideTooltip(),
          updateTooltipPosition: (event) => this.graphView.updateTooltipPosition(event),
          updateOrganizedCircleOverlay: () => this.updateOrganizedCircleOverlay()
        }
      });
      if (didBind) {
        this.graphEventsBound = true;
      }
    }
    formatNodeLabel(node) {
      return formatGraphNodeLabel(node, this.labelLineLength);
    }
    getDisplayName(node, fullLabel, path) {
      return getDisplayName(node, fullLabel, path);
    }
    getBasename(value) {
      return getBasename(value);
    }
    wrapLabel(prefix, name) {
      return wrapLabel(prefix, name, this.labelLineLength);
    }
    getKindBadge(kind) {
      return getKindBadge(kind);
    }
    getKindLabel(kind) {
      return getKindLabel(kind);
    }
    updateLabelVisibility() {
      if (!this.graphInstance) {
        return;
      }
      if (this.labelVisibilityRaf !== null) {
        return;
      }
      this.labelVisibilityRaf = window.requestAnimationFrame(() => {
        this.labelVisibilityRaf = null;
        this.updateLabelVisibilityNow();
      });
    }
    updateLabelVisibilityNow() {
      if (!this.graphInstance) {
        return;
      }
      const zoom = this.graphInstance.zoom();
      const showAll = zoom >= this.labelZoomThreshold;
      const guidedAllowed = this.tourActive && this.guidedAllowedNodeIds ? this.guidedAllowedNodeIds : null;
      if (showAll) {
        if (this.lastLabelZoomBucket === true) {
          return;
        }
        this.graphInstance.nodes().forEach((node) => {
          node.data("labelVisible", "true");
        });
        this.lastLabelZoomBucket = true;
        this.lastForcedLabelIds.clear();
        return;
      }
      const forcedIds = /* @__PURE__ */ new Set();
      this.graphInstance.$("node:selected").forEach((node) => {
        forcedIds.add(node.id());
      });
      this.graphInstance.$("node.is-hovered").forEach((node) => {
        forcedIds.add(node.id());
      });
      if (guidedAllowed) {
        guidedAllowed.forEach((id) => forcedIds.add(id));
      }
      if (this.lastLabelZoomBucket !== false) {
        this.graphInstance.nodes().forEach((node) => {
          node.data("labelVisible", "false");
        });
      }
      this.lastForcedLabelIds.forEach((id) => {
        var _a;
        if (!forcedIds.has(id)) {
          const node = (_a = this.graphInstance) == null ? void 0 : _a.$id(id);
          if (node && !node.empty()) {
            node.data("labelVisible", "false");
          }
        }
      });
      forcedIds.forEach((id) => {
        var _a;
        if (!this.lastForcedLabelIds.has(id)) {
          const node = (_a = this.graphInstance) == null ? void 0 : _a.$id(id);
          if (node && !node.empty()) {
            node.data("labelVisible", "true");
          }
        }
      });
      this.lastLabelZoomBucket = false;
      this.lastForcedLabelIds = forcedIds;
    }
    resetLabelVisibilityCache() {
      this.lastLabelZoomBucket = null;
      this.lastForcedLabelIds.clear();
      if (this.labelVisibilityRaf !== null) {
        window.cancelAnimationFrame(this.labelVisibilityRaf);
        this.labelVisibilityRaf = null;
      }
    }
    async updateNarrator(symbol) {
      if (symbol.kind === "folder") {
        this.renderFileTreeNarrator();
        return;
      }
      const mode = this.currentMode;
      const section = this.getSnippetSection(symbol);
      const cacheKey = `${symbol.id}:${mode}:${section}`;
      const cached = this.narratorCache.get(cacheKey);
      if (cached) {
        this.renderNarration(symbol, cached);
        return;
      }
      const requestToken = ++this.narratorRequestToken;
      this.renderNarratorLoading(symbol);
      try {
        const response = await this.api.fetchJson("/gitreader/api/narrate", void 0, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id: symbol.id,
            mode,
            section
          })
        });
        if (requestToken !== this.narratorRequestToken) {
          return;
        }
        if (!response || response.error) {
          throw new Error("Narrator unavailable.");
        }
        this.narratorCache.set(cacheKey, response);
        this.renderNarration(symbol, response);
      } catch (error) {
        if (requestToken !== this.narratorRequestToken) {
          return;
        }
        const message = error instanceof Error ? error.message : "Narrator unavailable.";
        this.renderNarratorError(symbol, message);
      }
    }
    renderNarratorLoading(symbol) {
      this.narratorOutput.innerHTML = buildNarratorLoadingHtml(symbol.name);
    }
    renderNarratorError(symbol, message) {
      this.narratorOutput.innerHTML = buildNarratorErrorHtml(symbol.name, message);
    }
    renderNarration(symbol, narration) {
      this.narratorOutput.innerHTML = buildNarrationHtml(symbol.name, narration, this.currentMode);
    }
    renderStoryArc(arc) {
      const entryNode = this.nodeById.get(arc.entry_id);
      this.narratorOutput.innerHTML = buildStoryArcHtml({
        arc,
        mode: this.currentMode,
        entryNode: entryNode != null ? entryNode : void 0,
        resolveArcLabel: (arcId) => {
          const target = this.storyArcsById.get(arcId);
          return target ? this.formatArcTitle(target) : null;
        },
        kindLabelFor: (kind) => this.getKindLabel(kind)
      });
    }
    renderStoryArcEmpty() {
      this.narratorOutput.innerHTML = buildStoryArcEmptyHtml();
    }
    renderStoryArcMissing() {
      this.narratorOutput.innerHTML = buildStoryArcMissingHtml();
    }
    renderFileTreeNarrator() {
      this.narratorOutput.innerHTML = buildFileTreeNarratorHtml(this.fileNodesByPath.size);
    }
    getArcThreadLabel(arc) {
      return getArcThreadLabel(arc);
    }
    formatArcTitle(arc) {
      return formatArcTitle(arc);
    }
    setMode(mode) {
      var _a;
      this.currentMode = mode;
      this.modeButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.mode === mode);
      });
      if (this.tourActive) {
        if (this.tocMode === "routes") {
          if (this.activeStoryArc) {
            this.renderStoryArc(this.activeStoryArc);
          } else {
            this.renderStoryArcEmpty();
          }
          return;
        }
        if (this.tocMode === "tree") {
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
      const chapterId = this.getActiveChapterId();
      const nodes = this.filterNodesForChapter(chapterId != null ? chapterId : "");
      const selected = this.getSelectedGraphNode();
      const focus = selected && selected.kind !== "folder" ? selected : (_a = this.currentSymbol) != null ? _a : this.pickFocusNode(nodes);
      void this.updateNarrator(focus);
    }
    setLayout(layout) {
      this.workspace.dataset.layout = layout;
      this.layoutButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.layout === layout);
      });
      this.refreshGraphViewport();
    }
    getActiveChapterId() {
      var _a;
      const active = this.tocList.querySelector(".toc-item.is-active");
      if (!active) {
        return null;
      }
      return (_a = active.dataset.chapterId) != null ? _a : null;
    }
    getSelectedGraphNodeId() {
      if (!this.graphInstance) {
        return null;
      }
      const selected = this.graphInstance.$("node:selected");
      if (!selected || selected.length === 0) {
        return null;
      }
      return selected[0].id();
    }
    getSelectedGraphNode() {
      var _a, _b;
      const nodeId = this.getSelectedGraphNodeId();
      if (!nodeId) {
        return null;
      }
      return (_b = (_a = this.displayNodeById.get(nodeId)) != null ? _a : this.nodeById.get(nodeId)) != null ? _b : null;
    }
    escapeHtml(value) {
      return escapeHtml(value);
    }
    updateNarratorToggle() {
      this.narratorToggle.classList.toggle("is-active", this.narratorVisible);
      this.narratorToggle.setAttribute("aria-pressed", String(this.narratorVisible));
      this.narratorToggle.textContent = this.narratorVisible ? "Narrator" : "Narrator Off";
    }
    updateTourControls() {
      var _a;
      document.body.classList.toggle("is-guided", this.tourActive);
      this.tourControls.classList.toggle("is-active", this.tourActive);
      this.tourStartButton.disabled = this.tourActive;
      this.tourPrevButton.disabled = !this.tourActive;
      this.tourNextButton.disabled = !this.tourActive;
      this.tourEndButton.disabled = !this.tourActive;
      const hasRoutes = this.storyArcs.length > 0;
      if (this.tourActive) {
        const allowRoutePicker = this.tocMode === "routes";
        this.routeSelect.disabled = !allowRoutePicker || !hasRoutes;
        this.routeJump.disabled = !allowRoutePicker || !hasRoutes;
      } else {
        this.routeSelect.disabled = !hasRoutes;
        this.routeJump.disabled = !hasRoutes;
      }
      if (this.tourState && this.tourStep) {
        const total = (_a = this.tourStep.total_steps) != null ? _a : 0;
        const label = total > 0 ? `Step ${this.tourState.step_index + 1} of ${total}` : `Step ${this.tourState.step_index + 1}`;
        this.tourStatus.textContent = label;
      } else {
        this.tourStatus.textContent = "";
      }
      this.applyGuidedState();
    }
    async startTour() {
      const arcId = this.getActiveTourArcId();
      try {
        const response = await this.api.fetchJson("/gitreader/api/tour/start", void 0, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            mode: this.tourMode,
            arc_id: arcId || void 0
          })
        });
        this.tourActive = true;
        this.tourState = response.state;
        this.tourStep = response.step;
        this.renderTourStep(response.step);
        this.updateTourControls();
        await this.syncTourFocus(response.step);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to start tour.";
        this.renderTourError(message);
      }
    }
    async advanceTour(action, nodeId, arcId) {
      if (!this.tourState) {
        return;
      }
      try {
        const response = await this.api.fetchJson("/gitreader/api/tour/step", void 0, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            state: this.tourState,
            action,
            target_node_id: nodeId,
            target_arc_id: arcId
          })
        });
        this.tourState = response.state;
        this.tourStep = response.step;
        this.renderTourStep(response.step);
        this.updateTourControls();
        await this.syncTourFocus(response.step);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to advance tour.";
        this.renderTourError(message);
      }
    }
    endTour() {
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
        void this.updateNarrator(this.currentSymbol);
        return;
      }
      this.renderStoryArcEmpty();
    }
    getActiveTourArcId() {
      var _a;
      if ((_a = this.activeStoryArc) == null ? void 0 : _a.id) {
        return this.activeStoryArc.id;
      }
      if (this.tocMode === "routes" && this.currentChapterId) {
        return this.currentChapterId;
      }
      if (this.routeSelect.value) {
        return this.routeSelect.value;
      }
      return null;
    }
    async syncTourFocus(step) {
      var _a, _b;
      if (!step) {
        return;
      }
      await this.loadGraphForScope("full");
      const focus = step.focus;
      const nodeId = step.node_id || (focus == null ? void 0 : focus.node_id);
      const node = nodeId ? (_a = this.nodeById.get(nodeId)) != null ? _a : null : null;
      const focusPath = (focus == null ? void 0 : focus.file_path) ? this.normalizePath(focus.file_path) : "";
      const fileNode = focusPath ? (_b = this.fileNodesByPath.get(focusPath)) != null ? _b : null : null;
      const targetNode = node || fileNode;
      if (!targetNode) {
        return;
      }
      if (this.tourActive && (!this.graphInstance || this.graphInstance.$id(targetNode.id).empty())) {
        const nodes = this.graphNodes;
        const edges = this.filterEdgesForNodes(nodes);
        const graphView = {
          nodes,
          edges,
          totalNodes: nodes.length,
          visibleNodes: nodes.length,
          isCapped: false
        };
        this.resetLabelVisibilityCache();
        this.graphView.render({
          nodes: graphView.nodes,
          edges: graphView.edges,
          layoutMode: this.graphLayoutMode
        });
        this.graphView.updateNodeStatus(graphView);
      }
      if (this.graphInstance) {
        this.graphInstance.$("node:selected").unselect();
        const element = this.graphInstance.$id(targetNode.id);
        if (element && typeof element.select === "function") {
          element.select();
        }
      }
      try {
        await this.loadSymbolSnippet(targetNode, false);
      } catch {
        this.readerController.render(targetNode);
      }
      if (focus == null ? void 0 : focus.start_line) {
        this.jumpToLine(focus.start_line);
      }
    }
    handleContextLink(nodeId, filePath, line) {
      var _a, _b, _c;
      if (nodeId) {
        if (this.tourActive) {
          if (!this.isGuidedNodeAllowed(nodeId)) {
            this.flashGuidedMessage("Follow the guide to unlock this step.");
            return;
          }
          void this.advanceTour("jump", nodeId);
          return;
        }
        const node = this.nodeById.get(nodeId);
        if (node) {
          void this.loadSymbolSnippet(node, false).catch(() => {
            this.readerController.render(node);
          }).then(() => {
            if (line) {
              this.jumpToLine(line);
            }
          });
        }
        return;
      }
      if (!filePath) {
        return;
      }
      const normalized = this.normalizePath(filePath);
      const fileNode = (_a = this.fileNodesByPath.get(normalized)) != null ? _a : null;
      if (fileNode) {
        void this.loadSymbolSnippet(fileNode, false).catch(() => {
          this.readerController.render(fileNode);
        }).then(() => {
          if (line) {
            this.jumpToLine(line);
          }
        });
        return;
      }
      if (line && ((_c = (_b = this.currentSymbol) == null ? void 0 : _b.location) == null ? void 0 : _c.path) && this.normalizePath(this.currentSymbol.location.path) === normalized) {
        this.jumpToLine(line);
      }
    }
    flashGuidedMessage(message) {
      this.setCanvasOverlay(message, true);
      window.setTimeout(() => this.setCanvasOverlay("", false), 1400);
    }
    isGuidedNodeAllowed(nodeId) {
      if (!this.tourActive || !this.guidedAllowedNodeIds) {
        return true;
      }
      return this.guidedAllowedNodeIds.has(nodeId);
    }
    renderTourStep(step) {
      var _a, _b, _c, _d, _e, _f;
      const explanation = ((_a = step.explanation) != null ? _a : []).map((item) => `<li>${this.escapeHtml(item)}</li>`).join("");
      const relatedNodes = (_b = step.related_nodes) != null ? _b : [];
      const relatedNodeButtons = relatedNodes.map((item) => `<button class="ghost-btn arc-jump" data-tour-node="${this.escapeHtml(item.node_id)}">${this.escapeHtml(item.label)}</button>`);
      const relatedArcs = (_c = step.related_arcs) != null ? _c : [];
      const relatedArcButtons = relatedArcs.map((item) => `<button class="ghost-btn arc-jump" data-tour-arc="${this.escapeHtml(item.arc_id)}">${this.escapeHtml(item.title)}</button>`);
      const concept = step.concept ? `<p><strong>Concept:</strong> ${this.escapeHtml(step.concept)}</p>` : "";
      const whyHere = step.why_here ? `<p><strong>Why here:</strong> ${this.escapeHtml(step.why_here)}</p>` : "";
      const remember = step.remember ? `<p><strong>Remember:</strong> ${this.escapeHtml(step.remember)}</p>` : "";
      const focus = ((_d = step.focus) == null ? void 0 : _d.file_path) ? (() => {
        var _a2, _b2;
        const start = (_a2 = step.focus) == null ? void 0 : _a2.start_line;
        const end = (_b2 = step.focus) == null ? void 0 : _b2.end_line;
        const range = start ? `${start}${end && end !== start ? `-${end}` : ""}` : "";
        return `<p class="tour-focus">Focus: ${this.escapeHtml(step.focus.file_path)}${range ? `:${range}` : ""}</p>`;
      })() : "";
      const pitfall = step.pitfall ? `<p class="tour-pitfall">${this.escapeHtml(step.pitfall)}</p>` : "";
      const contextLinks = (_e = step.context_links) != null ? _e : [];
      const contextButtons = contextLinks.map((link) => {
        const attrs = [
          "data-context-link",
          link.node_id ? `data-context-node="${this.escapeHtml(link.node_id)}"` : "",
          link.file_path ? `data-context-file="${this.escapeHtml(link.file_path)}"` : "",
          typeof link.line === "number" ? `data-context-line="${link.line}"` : ""
        ].filter(Boolean).join(" ");
        return `<button class="ghost-btn context-link" ${attrs}>${this.escapeHtml(link.label)}</button>`;
      });
      const storySoFarItems = ((_f = step.story_so_far) != null ? _f : []).map((item) => `<li>${this.escapeHtml(item)}</li>`).join("");
      const storySoFar = storySoFarItems ? `<div class="tour-story"><p class="eyebrow">Story so far</p><ul>${storySoFarItems}</ul></div>` : "";
      this.narratorOutput.innerHTML = `
            <p class="eyebrow">Tour: ${this.escapeHtml(this.tourMode)}</p>
            <h3>${this.escapeHtml(step.title)}</h3>
            <p>${this.escapeHtml(step.hook)}</p>
            ${focus}
            ${concept}
            ${whyHere}
            ${remember}
            ${explanation ? `<ul>${explanation}</ul>` : ""}
            <p><strong>Why it matters:</strong> ${this.escapeHtml(step.why_it_matters)}</p>
            <p><strong>Next:</strong> ${this.escapeHtml(step.next_click)}</p>
            ${pitfall}
            ${contextButtons.length > 0 ? `<div class="context-link-list">${contextButtons.join("")}</div>` : ""}
            ${storySoFar}
            ${relatedNodeButtons.length > 0 || relatedArcButtons.length > 0 ? `
                <div class="arc-jump-list">
                    ${relatedNodeButtons.join("")}
                    ${relatedArcButtons.join("")}
                </div>
            ` : ""}
        `;
    }
    renderTourError(message) {
      this.narratorOutput.innerHTML = `
            <p class="eyebrow">Tour</p>
            <h3>Tour unavailable</h3>
            <p>${this.escapeHtml(message)}</p>
        `;
    }
    applyGuidedState() {
      var _a, _b, _c, _d;
      if (!this.tourActive || !this.tourStep) {
        this.guidedAllowedNodeIds = null;
        this.applyGuidedToc();
        this.applyGuidedCodeFocus();
        this.graphView.applyFilters({ forceVisibility: true });
        this.fileTreeController.render(null);
        return;
      }
      const allowed = new Set((_a = this.tourStep.allowed_node_ids) != null ? _a : []);
      const focusPath = (_b = this.tourStep.focus) == null ? void 0 : _b.file_path;
      if (focusPath) {
        const normalized = this.normalizePath(focusPath);
        const fileNode = this.fileNodesByPath.get(normalized);
        if (fileNode) {
          allowed.add(fileNode.id);
        }
      }
      this.guidedAllowedNodeIds = allowed.size > 0 ? allowed : null;
      this.applyGuidedToc();
      this.graphView.applyFilters({ forceVisibility: true });
      this.applyGuidedCodeFocus();
      this.fileTreeController.render((_d = (_c = this.tourStep.focus) == null ? void 0 : _c.file_path) != null ? _d : null);
    }
    applyGuidedToc() {
      const items = Array.from(this.tocList.querySelectorAll(".toc-item"));
      if (!this.tourActive || !this.tourStep || this.tocMode !== "story") {
        items.forEach((item) => item.classList.remove("is-guided-hidden"));
        return;
      }
      items.forEach((item) => {
        const isActive = item.dataset.chapterId === this.currentChapterId;
        item.classList.toggle("is-guided-hidden", !isActive);
      });
    }
    applyGuidedGraphFilter() {
      if (!this.graphInstance) {
        return;
      }
      const cy = this.graphInstance;
      cy.elements().removeClass("is-guided-hidden");
      cy.nodes().removeClass("is-guided-focus");
      if (!this.tourActive || !this.guidedAllowedNodeIds || !this.tourStep) {
        return;
      }
      const allowed = this.guidedAllowedNodeIds;
      cy.nodes().forEach((node) => {
        var _a;
        const isAllowed = allowed.has(node.id());
        node.toggleClass("is-guided-hidden", !isAllowed);
        node.toggleClass("is-guided-focus", node.id() === ((_a = this.tourStep) == null ? void 0 : _a.node_id));
      });
      cy.edges().forEach((edge) => {
        const sourceId = edge.data("source");
        const targetId = edge.data("target");
        const isAllowed = allowed.has(sourceId) && allowed.has(targetId);
        edge.toggleClass("is-guided-hidden", !isAllowed);
      });
      cy.elements(".is-guided-hidden").hide();
    }
    applyGuidedCodeFocus() {
      var _a, _b, _c;
      const lines = Array.from(this.codeSurface.querySelectorAll(".code-line"));
      lines.forEach((line) => line.classList.remove("is-guided-dim", "is-guided-focus"));
      if (!this.tourActive || !((_a = this.tourStep) == null ? void 0 : _a.focus)) {
        return;
      }
      const focus = this.tourStep.focus;
      if (!(focus == null ? void 0 : focus.start_line)) {
        return;
      }
      if (focus.file_path && ((_c = (_b = this.currentSymbol) == null ? void 0 : _b.location) == null ? void 0 : _c.path)) {
        const currentPath = this.normalizePath(this.currentSymbol.location.path);
        const focusPath = this.normalizePath(focus.file_path);
        if (currentPath !== focusPath) {
          return;
        }
      }
      const start = focus.start_line;
      const end = focus.end_line && focus.end_line >= start ? focus.end_line : start;
      lines.forEach((line) => {
        const lineNumber = Number(line.dataset.line);
        if (!Number.isFinite(lineNumber)) {
          return;
        }
        if (lineNumber >= start && lineNumber <= end) {
          line.classList.add("is-guided-focus");
        } else {
          line.classList.add("is-guided-dim");
        }
      });
    }
    setCanvasOverlay(message, visible) {
      this.canvasOverlay.textContent = message;
      this.canvasOverlay.classList.toggle("is-visible", visible);
    }
    refreshGraphViewport() {
      if (!this.graphInstance) {
        return;
      }
      this.graphInstance.resize();
      this.graphInstance.fit();
      this.updateLabelVisibility();
    }
    hasHighlightSupport() {
      return hasHighlightSupport();
    }
    getHighlightLanguage(path) {
      if (!path) {
        return void 0;
      }
      const lower = path.toLowerCase();
      if (lower.endsWith(".py")) {
        return "python";
      }
      if (lower.endsWith(".js") || lower.endsWith(".jsx")) {
        return "javascript";
      }
      if (lower.endsWith(".ts")) {
        return "typescript";
      }
      if (lower.endsWith(".tsx")) {
        return "tsx";
      }
      if (lower.endsWith(".swift")) {
        return "swift";
      }
      return void 0;
    }
    copySnippet() {
      const text = this.currentSnippetText;
      if (!text) {
        this.setCodeStatus("Nothing to copy.");
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => this.setCodeStatus("Snippet copied.")).catch(() => this.setCodeStatus("Copy failed."));
        return;
      }
      this.setCodeStatus("Copy not supported.");
    }
    jumpToInputLine() {
      var _a;
      const input = (_a = this.readerMeta.querySelector("[data-line-input]")) != null ? _a : this.codeSurface.querySelector("[data-line-input]");
      if (!input) {
        return;
      }
      const value = Number(input.value);
      if (!Number.isFinite(value) || value <= 0) {
        this.setCodeStatus("Enter a valid line number.");
        return;
      }
      this.jumpToLine(value);
    }
    jumpToLine(line) {
      const lineEl = this.codeSurface.querySelector(`[data-line="${line}"]`);
      if (!lineEl) {
        this.setCodeStatus("Line not in snippet.");
        return;
      }
      this.setCodeStatus("");
      lineEl.classList.add("is-jump");
      lineEl.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => lineEl.classList.remove("is-jump"), 1200);
    }
    setCodeStatus(message) {
      var _a;
      const status = (_a = this.readerMeta.querySelector("[data-code-status]")) != null ? _a : this.codeSurface.querySelector("[data-code-status]");
      if (status) {
        status.textContent = message;
      }
    }
    loadGraphPreferences() {
      const storedLayout = window.localStorage.getItem("gitreader.graphLayoutMode");
      if (storedLayout && ["cluster", "layer", "free"].includes(storedLayout)) {
        this.graphLayoutMode = storedLayout;
      }
    }
    setGraphLayoutMode(mode) {
      if (this.graphLayoutMode === mode) {
        return;
      }
      const wasCluster = this.graphLayoutMode === "cluster";
      this.graphLayoutMode = mode;
      window.localStorage.setItem("gitreader.graphLayoutMode", mode);
      this.updateGraphControls();
      if (mode !== "cluster") {
        this.graphView.setClusterManualLayout(false);
      }
      if (mode !== "cluster") {
        this.clearOrganizedCircleOverlay();
      }
      if (wasCluster || mode === "cluster") {
        this.refreshGraphView();
        return;
      }
      this.graphView.setLayout(mode);
    }
    updateGraphControls() {
      const { edgeFilters, showExternalNodes } = this.graphView.getFilterState();
      this.graphLayoutButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.layoutAction === this.graphLayoutMode);
      });
      this.edgeFilterButtons.forEach((button) => {
        const filter = button.dataset.edgeFilter;
        if (!filter) {
          return;
        }
        button.classList.toggle("is-active", edgeFilters.has(filter));
      });
      this.nodeFilterButtons.forEach((button) => {
        if (button.dataset.nodeFilter === "external") {
          button.classList.toggle("is-active", showExternalNodes);
        }
      });
    }
  };
  document.addEventListener("DOMContentLoaded", () => {
    const app = new GitReaderApp();
    app.init();
    window.graphApp = app;
  });
})();
