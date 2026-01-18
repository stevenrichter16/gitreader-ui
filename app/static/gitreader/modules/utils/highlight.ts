import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import swift from 'highlight.js/lib/languages/swift';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('swift', swift);

if (hljs.registerAliases) {
    hljs.registerAliases(['js', 'jsx'], { languageName: 'javascript' });
    hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' });
}

const hasHighlightSupport = (): boolean => typeof hljs.highlight === 'function';

export { hljs, hasHighlightSupport };
