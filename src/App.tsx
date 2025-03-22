import React, { useState, useEffect, useRef } from "react";
import { gql, useQuery } from "@apollo/client";
import {
  Send,
  RotateCw,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  MessageSquare,
} from "lucide-react";
import "./App.css";

// Define TypeScript interface for a suggestion
interface Suggestion {
  snippet: string;
  category: string;
  comment: string;
}

// Define the GraphQL query
const GET_SUGGESTIONS = gql`
  query GetSuggestions($text: String!) {
    suggestions(text: $text) {
      snippet
      category
      comment
    }
  }
`;

const App = () => {
  const [text, setText] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [highlightRange, setHighlightRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use Apollo's useQuery hook with skip option to control when the query runs
  const { loading, error, data, refetch } = useQuery(GET_SUGGESTIONS, {
    variables: { text },
    skip: !shouldFetch, // Skip the query until the user clicks the button
    fetchPolicy: "network-only", // Don't use cache, always get fresh data
    onCompleted: (data) => {
      // When query completes successfully
      setShowSuggestions(true);

      // Reset expanded state when new suggestions arrive
      setExpandedIndex(null);

      setSuggestions(data.suggestions);

      // Set that we have suggestions available
      setHasSuggestions(data.suggestions && data.suggestions.length > 0);

      // Reset shouldFetch to prevent continuous polling
      setShouldFetch(false);

      // Clear any highlight
      setHighlightRange(null);
    },
  });

  // Effect to log data changes
  useEffect(() => {
    if (data) {
      console.log("Data updated:", data);
      console.log("Suggestions array:", data?.suggestions);
    }
  }, [data]);

  // Handler for the Get Suggestions button
  const handleGetSuggestions = () => {
    if (text.trim()) {
      setShouldFetch(true);
    }
  };

  // Effect to trigger refetch when shouldFetch changes to true
  useEffect(() => {
    if (shouldFetch) {
      refetch();
    }
  }, [shouldFetch, refetch]);

  // Effect to highlight the snippet in the textarea when expandedIndex changes
  useEffect(() => {
    if (
      expandedIndex !== null &&
      textareaRef.current &&
      suggestions[expandedIndex]
    ) {
      const snippet = suggestions[expandedIndex].snippet;
      const start = text.indexOf(snippet);

      if (start !== -1) {
        const end = start + snippet.length;
        setHighlightRange({ start, end });

        // Set selection in the textarea
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start, end);
      } else {
        setHighlightRange(null);
      }
    } else {
      setHighlightRange(null);

      // Clear selection if textarea is available
      if (textareaRef.current) {
        const cursorPos = textareaRef.current.selectionStart;
        textareaRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    }
  }, [expandedIndex, suggestions, text]);

  const toggleExpand = (index: number) => {
    // If clicking on the currently expanded index, collapse it
    // Otherwise, expand the clicked index
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Toggle the sidebar visibility
  const toggleSidebar = () => {
    setShowSuggestions(!showSuggestions);
  };

  // Handle changes to the textarea while maintaining highlight if needed
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    // If we currently have a highlight and the text changes, we need to check
    // if the snippet is still present at the same position
    if (
      expandedIndex !== null &&
      highlightRange &&
      suggestions[expandedIndex]
    ) {
      const snippet = suggestions[expandedIndex].snippet;
      const start = newText.indexOf(snippet);

      if (start !== -1) {
        const end = start + snippet.length;
        setHighlightRange({ start, end });
      } else {
        // Snippet no longer exists in the text, remove highlight
        setHighlightRange(null);
      }
    }
  };

  // Helper function to create a styled textarea with highlighted text
  const renderTextareaWithHighlight = () => {
    if (!highlightRange) {
      return (
        <textarea
          ref={textareaRef}
          className={`editor-textarea ${showSuggestions ? "sidebar-open" : ""}`}
          placeholder="Start writing your content here..."
          value={text}
          onChange={handleTextChange}
        />
      );
    }

    return (
      <div className="highlighted-textarea-container">
        <div
          className={`highlighted-backdrop ${showSuggestions ? "sidebar-open" : ""}`}
          aria-hidden="true"
        >
          <span>{text.substring(0, highlightRange.start)}</span>
          <span className="highlighted-text">
            {text.substring(highlightRange.start, highlightRange.end)}
          </span>
          <span>{text.substring(highlightRange.end)}</span>
        </div>
        <textarea
          ref={textareaRef}
          className={`editor-textarea highlighted ${showSuggestions ? "sidebar-open" : ""}`}
          placeholder="Start writing your content here..."
          value={text}
          onChange={handleTextChange}
          style={{ caretColor: "var(--accent)" }}
        />
      </div>
    );
  };

  // Extract suggestions directly from data when rendering
  const renderSuggestions = () => {
    const suggestionsData = suggestions;
    console.log("Rendering suggestions:", suggestionsData);

    if (suggestionsData.length === 0) {
      return <p className="no-suggestions">No suggestions available</p>;
    }

    return (
      <div className="space-y-3">
        {suggestionsData.map((suggestion: Suggestion, index: number) => (
          <div key={index} className="suggestion-card">
            <div
              onClick={() => toggleExpand(index)}
              className="suggestion-header"
            >
              <div className="suggestion-meta">
                <span className="suggestion-category">
                  {suggestion.category}
                </span>
                <h3 className="suggestion-title" title={suggestion.snippet}>
                  {suggestion.snippet}
                </h3>
              </div>
              {expandedIndex === index ? (
                <ChevronUp
                  className="w-4 h-4"
                  style={{ color: "var(--text-secondary)", flexShrink: 0 }}
                />
              ) : (
                <ChevronDown
                  className="w-4 h-4"
                  style={{ color: "var(--text-secondary)", flexShrink: 0 }}
                />
              )}
            </div>

            <div
              className="suggestion-content"
              style={{
                padding:
                  expandedIndex === index ? "0 12px 12px 12px" : "0 12px",
                maxHeight: expandedIndex === index ? "300px" : "0",
                opacity: expandedIndex === index ? 1 : 0,
                overflow: expandedIndex === index ? "auto" : "hidden",
              }}
            >
              <p className="suggestion-text">{suggestion.comment}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="App">
      {/* App Toolbar */}
      <div className="app-toolbar">
        <div className="app-title">InkSight</div>

        <button
          onClick={handleGetSuggestions}
          disabled={!text.trim() || loading}
          className="suggestion-button"
        >
          {loading ? (
            <RotateCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Get Suggestions
        </button>
      </div>

      {/* Main Content Area with Sidebar */}
      <div className="content-container">
        {/* Main Editor */}
        <div className="editor-container">
          {renderTextareaWithHighlight()}

          {/* Error message overlay */}
          {error && (
            <div className="error-message">
              <Info className="w-5 h-5" />
              <p>
                {error.message ||
                  "An error occurred while fetching suggestions"}
              </p>
              <button className="error-close-button">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Suggestions Sidebar */}
        <div className={`suggestions-sidebar ${showSuggestions ? "open" : ""}`}>
          <div className="sidebar-content">
            <div className="sidebar-header">
              <h2 className="sidebar-title">Suggestions</h2>
              <button
                onClick={() => setShowSuggestions(false)}
                className="close-button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="suggestions-container">{renderSuggestions()}</div>
          </div>
        </div>

        {/* Floating button to reopen sidebar */}
        <button
          className={`open-sidebar-button ${!showSuggestions && hasSuggestions ? "visible" : ""}`}
          onClick={toggleSidebar}
          aria-label="Open suggestions"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div>{text.length} characters</div>
        <div>InkSight © {new Date().getFullYear()}</div>
      </div>
    </div>
  );
};

export default App;
