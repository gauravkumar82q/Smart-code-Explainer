

import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import './App.css';


// Removed CONFIG as we no longer need API_KEY and API_ENDPOINT


function App() {
  const [code, setCode] = useState('// Paste your code here\nfunction helloWorld() {\n  console.log("Hello, World!");\n}\n');
  const [language, setLanguage] = useState('javascript');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [snippets, setSnippets] = useState([]);
  const [copyStatus, setCopyStatus] = useState('Copy Explanation');
  const editorRef = useRef(null);

  useEffect(() => {
    // Load saved snippets from localStorage
    const saved = JSON.parse(localStorage.getItem('codeSnippets')) || [];
    setSnippets(saved);
  }, []);

  const handleEditorChange = (value) => {
    setCode(value);
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const explainCode = async () => {
    if (!code.trim()) {
      alert('Please paste some code first!');
      return;
    }
    setLoading(true);
    setExplanation('');
    try {
        const response = await fetch('/api/explain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, language }),
        });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API Error');
      }
      const data = await response.json();
      setExplanation(data.choices[0].message.content);
    } catch (error) {
      setExplanation(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearEditor = () => {
    setCode('');
    setExplanation('Your AI-powered explanation will appear here...');
    setCopyStatus('Copy Explanation');
  };

  const saveSnippet = () => {
    if (!code.trim()) {
      alert('Please paste some code first!');
      return;
    }
    const timestamp = new Date().toLocaleString();
    const title = prompt('Enter a title for this snippet:', `${language} - ${timestamp}`);
    if (title) {
      const newSnippet = {
        id: Date.now(),
        title,
        code,
        language,
        timestamp,
      };
      const updatedSnippets = [newSnippet, ...snippets];
      setSnippets(updatedSnippets);
      localStorage.setItem('codeSnippets', JSON.stringify(updatedSnippets));
      alert('✅ Snippet saved!');
    }
  };

  const copyExplanation = () => {
    navigator.clipboard.writeText(explanation).then(() => {
      setCopyStatus('✅ Copied!');
      setTimeout(() => setCopyStatus('Copy Explanation'), 2000);
    });
  };

  const loadSnippet = (id) => {
    const snippet = snippets.find(s => s.id === id);
    if (snippet) {
      setCode(snippet.code);
      setLanguage(snippet.language);
    }
  };

  const deleteSnippet = (id) => {
    if (window.confirm('Are you sure you want to delete this snippet?')) {
      const updatedSnippets = snippets.filter(s => s.id !== id);
      setSnippets(updatedSnippets);
      localStorage.setItem('codeSnippets', JSON.stringify(updatedSnippets));
    }
  };

  return (
    <div className="container">
      <header>
        <h1>🧠 Smart Code Explainer</h1>
        <p>Paste your code and get AI-powered explanations</p>
      </header>

      <div className="main-content">
        {/* Code Input Section */}
        <div className="code-section">
          <div className="section-header">
            <h2>Code Input</h2>
            <select value={language} onChange={handleLanguageChange} id="languageSelect">
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="csharp">C#</option>
              <option value="typescript">TypeScript</option>
              <option value="sql">SQL</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
            </select>
          </div>
          <Editor
            height="400px"
            defaultLanguage="javascript"
            language={language}
            value={code}
            onChange={handleEditorChange}
            theme="light"
            options={{
              wordWrap: 'on',
              fontSize: 14,
              fontFamily: 'Courier New',
              automaticLayout: true,
            }}
          />
          <div className="button-group">
            <button onClick={explainCode} className="btn btn-primary" disabled={loading}>
              {loading ? 'Explaining...' : 'Explain Code'}
            </button>
            <button onClick={clearEditor} className="btn btn-secondary">Clear</button>
            <button onClick={saveSnippet} className="btn btn-secondary">Save Snippet</button>
          </div>
        </div>

        {/* Explanation Output Section */}
        <div className="explanation-section">
          <div className="section-header">
            <h2>AI Explanation</h2>
            {loading && <div className="loading-spinner" />}
          </div>
          <div className="explanation-output">
            {explanation ? (
              explanation.startsWith('❌') ? (
                <p style={{ color: 'red' }}>{explanation}</p>
              ) : (
                <MarkdownRenderer markdown={explanation} />
              )
            ) : (
              <p style={{ color: '#999' }}>Your AI-powered explanation will appear here...</p>
            )}
          </div>
          {explanation && !explanation.startsWith('❌') && (
            <button onClick={copyExplanation} className="btn btn-secondary">{copyStatus}</button>
          )}
        </div>
      </div>

      {/* Saved Snippets Section */}
      <div className="saved-snippets">
        <h2>📚 Saved Snippets</h2>
        <div className="snippets-list">
          {snippets.length === 0 ? (
            <p style={{ color: '#999' }}>No saved snippets yet. Save your first snippet!</p>
          ) : (
            snippets.map(snippet => (
              <div className="snippet-card" key={snippet.id}>
                <div className="snippet-card-title">{snippet.title}</div>
                <div className="snippet-card-language">{snippet.language}</div>
                <div className="snippet-card-code">{snippet.code.substring(0, 100)}...</div>
                <div className="snippet-card-actions">
                  <button className="load-btn" onClick={() => loadSnippet(snippet.id)}>Load</button>
                  <button className="delete-btn" onClick={() => deleteSnippet(snippet.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Simple markdown renderer for explanation output
function MarkdownRenderer({ markdown }) {
  // Basic markdown to HTML conversion (headings, lists, paragraphs)
  const html = markdown
    .split('\n')
    .map(line => {
      if (line.startsWith('### ')) {
        return `<h3>${line.replace('### ', '')}</h3>`;
      } else if (line.startsWith('## ')) {
        return `<h2>${line.replace('## ', '')}</h2>`;
      } else if (line.startsWith('# ')) {
        return `<h1>${line.replace('# ', '')}</h1>`;
      } else if (line.startsWith('- ')) {
        return `<li>${line.replace('- ', '')}</li>`;
      } else if (line.trim() === '') {
        return '<br>';
      }
      return `<p>${line}</p>`;
    })
    .join('');
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export default App;
