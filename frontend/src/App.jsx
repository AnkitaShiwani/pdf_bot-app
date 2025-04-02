import { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:8000"; // FastAPI Backend URL

const SUPPORTED_LANGUAGES = {
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  hi: "Hindi",
  kn: "Kannada",
  te: "Telugu",
  ta: "Tamil",
  ar: "Arabic",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
};

function App() {
  const [message, setMessage] = useState("Loading...");
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState("");
  const [selectedLang, setSelectedLang] = useState("fr");
  const [translatedText, setTranslatedText] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/`)
      .then((response) => response.json())
      .then((data) => setMessage(data.message))
      .catch((error) => console.error("Error fetching API:", error));
  }, []);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      console.log("File selected:", uploadedFile);
    }
  };

  const handleSummarize = async () => {
    if (!file) {
      alert("Please upload a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    console.log("Uploading file:", file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload_pdf/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Summarization failed!");

      const data = await response.json();
      console.log("Summary Response:", data);
      const extracted_data = data.extracted_text;

      const summaryResponse = await fetch(`${API_BASE_URL}/summarize/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: extracted_data
        })
      });

      const summaryData = await summaryResponse.json();
      setSummary(summaryData.summary || "No summary generated.");
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  const handleTranslate = async () => {
    if (!summary) {
      alert("Summarize the PDF first!");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/translate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summary, target_lang: selectedLang }),
      });

      if (!response.ok) throw new Error("Translation failed!");

      const data = await response.json();
      setTranslatedText(data.translated_text || "No translation available.");
    } catch (error) {
      console.error("Error fetching translation:", error);
    }
  };

  const handleAskQuestion = async () => {
    if (!question) {
      alert("Enter a question!");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ask_question/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context: summary }),
      });

      if (!response.ok) throw new Error("Failed to fetch answer!");

      const data = await response.json();
      setAnswer(data.answer || "No answer found.");
    } catch (error) {
      console.error("Error fetching answer:", error);
    }
  };

  const speakText = (text) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selectedLang;
      speechSynthesis.speak(utterance);
    } else {
      alert("Your browser does not support text-to-speech.");
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="text-center">Welcome to My AI PDF Chatbot! 🚀</h1>
      <h3 className="text-center text-primary mt-3">FastAPI says: {message}</h3>

      <div className="card text-center p-4 shadow mt-4">
        <input type="file" className="form-control" onChange={handleFileUpload} />
        {file && <p className="mt-2 text-success">Uploaded: {file.name}</p>}
        <button className="btn btn-success mt-3" onClick={handleSummarize}>
          Summarize PDF
        </button>
      </div>

      {summary && (
        <div className="alert alert-info mt-3">
          <strong>Summary:</strong> {summary}
          <button className="btn btn-sm btn-warning ms-2" onClick={() => speakText(summary)}>🔊</button>
        </div>
      )}

      <div className="mt-4">
        <label>Select Language:</label>
        <select
          className="form-select"
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
        >
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
            <option key={code} value={code}>{lang}</option>
          ))}
        </select>
        <button className="btn btn-primary mt-3" onClick={handleTranslate}>
          Translate
        </button>
      </div>

      {translatedText && (
        <div className="alert alert-secondary mt-3">
          <strong>Translated Text:</strong> {translatedText}
          <button className="btn btn-sm btn-warning ms-2" onClick={() => speakText(translatedText)}>🔊</button>
        </div>
      )}

      <div className="mt-4">
        <label>Ask a Question:</label>
        <input
          type="text"
          className="form-control"
          placeholder="Type your question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button className="btn btn-dark mt-3" onClick={handleAskQuestion}>
          Get Answer
        </button>
      </div>

      {answer && (
        <div className="alert alert-success mt-3">
          <strong>Answer:</strong> {answer}
          <button className="btn btn-sm btn-warning ms-2" onClick={() => speakText(answer)}>🔊</button>
        </div>
      )}
    </div>
  );
}

export default App;
