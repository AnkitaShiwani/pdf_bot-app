import { useState, useEffect, useRef } from "react";
import "./App.css";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardFooter, CardDescription } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Select } from "./components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faStop, faHistory } from "@fortawesome/free-solid-svg-icons";

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
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTranslationSpeaking, setIsTranslationSpeaking] = useState(false);
  const utteranceRef = useRef(null);
  const translationUtteranceRef = useRef(null);
  const [voices, setVoices] = useState([]);
  const [isSpeechSynthesisReady, setSpeechSynthesisReady] = useState(false);
  
  // Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [summaryHistory, setSummaryHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/`)
      .then((response) => response.json())
      .then((data) => setMessage(data.message))
      .catch((error) => console.error("Error fetching API:", error));
    
    // Check if user is already logged in from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userObj = JSON.parse(storedUser);
        setIsLoggedIn(true);
        setUserId(userObj.id);
        setUsername(userObj.username);
        // Fetch user's summary history
        fetchSummaryHistory(userObj.id);
      } catch (error) {
        console.error("Error restoring session:", error);
        localStorage.removeItem('user');
      }
    }
    
    // Set up speech synthesis
    if ("speechSynthesis" in window) {
      // Initialize voices
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);
          setSpeechSynthesisReady(true);
          console.log("Speech synthesis ready with", availableVoices.length, "voices");
        }
      };

      // Chrome loads voices asynchronously
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      // Try loading voices immediately for Firefox/Safari
      loadVoices();

      // Ensure any ongoing speech is cancelled when component unmounts
      return () => {
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
        }
      };
    } else {
      console.error("Speech synthesis not supported");
    }
  }, []);
  
  const fetchSummaryHistory = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/${userId}/summaries`);
      if (response.ok) {
        const data = await response.json();
        setSummaryHistory(data);
      } else {
        console.error("Failed to fetch summary history");
      }
    } catch (error) {
      console.error("Error fetching summary history:", error);
    }
  };
  
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      alert("Please enter both username and password");
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsLoggedIn(true);
        setUserId(data.id);
        setPassword(''); // Clear password for security
        setShowAuthDialog(false); // Close the dialog
        
        // Save to localStorage
        localStorage.setItem('user', JSON.stringify(data));
        
        // Fetch user's summary history
        fetchSummaryHistory(data.id);
      } else {
        const errorData = await response.json();
        alert(errorData.detail || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Error during login. Please try again.");
    }
  };
  
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      alert("Please enter both username and password");
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert("Registration successful. Please log in.");
        setShowRegister(false);
        setPassword(''); // Clear password for security
      } else {
        const errorData = await response.json();
        alert(errorData.detail || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Error during registration. Please try again.");
    }
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserId(null);
    setUsername("");
    setSummaryHistory([]);
    localStorage.removeItem('user');
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

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

    setLoading(true);
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

      const summaryUrl = isLoggedIn 
        ? `${API_BASE_URL}/summarize/?user_id=${userId}` 
        : `${API_BASE_URL}/summarize/`;
        
      const summaryResponse = await fetch(summaryUrl, {
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
      
      // If logged in, refresh history
      if (isLoggedIn) {
        fetchSummaryHistory(userId);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!summary) {
      alert("Summarize the PDF first!");
      return;
    }

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question) {
      alert("Enter a question!");
      return;
    }

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const playSpeech = (text) => {
    if (!isSpeechSynthesisReady) {
      console.warn("Speech synthesis not ready yet");
      alert("Speech synthesis is initializing. Please try again in a moment.");
      return;
    }

    try {
      // Cancel any ongoing speech
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      
      console.log("Starting speech for summary");
      
      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a voice for the selected language
      const voiceForLang = voices.find(voice => voice.lang.startsWith('en'));
      if (voiceForLang) {
        console.log("Using voice:", voiceForLang.name);
        utterance.voice = voiceForLang;
      }
      
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      // Add event listeners
      utterance.onstart = () => {
        console.log("Speech started");
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        console.log("Speech ended");
        setIsSpeaking(false);
      };
      
      utterance.onerror = (event) => {
        console.error("Speech error:", event);
        setIsSpeaking(false);
      };
      
      // Store for pause/resume control
      utteranceRef.current = utterance;
      
      // Start speaking
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error in speech synthesis:", error);
      alert("There was an error with the speech synthesis. Please try again.");
    }
  };

  const pauseSpeech = () => {
    try {
      if (speechSynthesis.speaking) {
        console.log("Pausing speech");
        speechSynthesis.pause();
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("Error pausing speech:", error);
    }
  };

  const resumeSpeech = () => {
    try {
      if (speechSynthesis.paused) {
        console.log("Resuming speech");
        speechSynthesis.resume();
        setIsSpeaking(true);
      }
    } catch (error) {
      console.error("Error resuming speech:", error);
    }
  };

  const stopSpeech = () => {
    try {
      if (speechSynthesis.speaking) {
        console.log("Stopping speech");
        speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("Error stopping speech:", error);
    }
  };

  // Translation-specific speech controls
  const playTranslationSpeech = (text) => {
    if (!isSpeechSynthesisReady) {
      console.warn("Speech synthesis not ready yet");
      alert("Speech synthesis is initializing. Please try again in a moment.");
      return;
    }

    try {
      // Cancel any ongoing speech
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      
      console.log("Starting speech for translation in", selectedLang);
      
      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a voice for the selected language
      const langPrefix = selectedLang.split('-')[0];
      const voiceForLang = voices.find(voice => voice.lang.startsWith(langPrefix));
      if (voiceForLang) {
        console.log("Using voice:", voiceForLang.name);
        utterance.voice = voiceForLang;
      }
      
      utterance.lang = selectedLang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      // Add event listeners
      utterance.onstart = () => {
        console.log("Translation speech started");
        setIsTranslationSpeaking(true);
      };
      
      utterance.onend = () => {
        console.log("Translation speech ended");
        setIsTranslationSpeaking(false);
      };
      
      utterance.onerror = (event) => {
        console.error("Translation speech error:", event);
        setIsTranslationSpeaking(false);
      };
      
      // Store for pause/resume control
      translationUtteranceRef.current = utterance;
      
      // Start speaking
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error in translation speech synthesis:", error);
      alert("There was an error with the speech synthesis. Please try again.");
    }
  };

  const pauseTranslationSpeech = () => {
    try {
      if (speechSynthesis.speaking) {
        console.log("Pausing translation speech");
        speechSynthesis.pause();
        setIsTranslationSpeaking(false);
      }
    } catch (error) {
      console.error("Error pausing translation speech:", error);
    }
  };

  const resumeTranslationSpeech = () => {
    try {
      if (speechSynthesis.paused) {
        console.log("Resuming translation speech");
        speechSynthesis.resume();
        setIsTranslationSpeaking(true);
      }
    } catch (error) {
      console.error("Error resuming translation speech:", error);
    }
  };

  const stopTranslationSpeech = () => {
    try {
      if (speechSynthesis.speaking) {
        console.log("Stopping translation speech");
        speechSynthesis.cancel();
        setIsTranslationSpeaking(false);
      }
    } catch (error) {
      console.error("Error stopping translation speech:", error);
    }
  };

  const speakText = (text) => {
    if (!isSpeechSynthesisReady) {
      console.warn("Speech synthesis not ready yet");
      alert("Speech synthesis is initializing. Please try again in a moment.");
      return;
    }

    try {
      // Cancel any ongoing speech
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selectedLang;
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error in answer speech synthesis:", error);
    }
  };

  // Load summary from history
  const loadSummaryFromHistory = (historySummary) => {
    setSummary(historySummary.summary);
    setShowHistory(false);
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gradient">
            AI PDF Chatbot
          </h1>
          
          {/* User Authentication */}
          {isLoggedIn ? (
            <div className="flex gap-4 items-center">
              <span className="text-sm text-muted-foreground">
                Hello, {username}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowHistory(!showHistory)}
              >
                <FontAwesomeIcon icon={faHistory} className="mr-2" />
                History
              </Button>
              <Button 
                variant="destructive"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          ) : (
            <div>
              {showAuthDialog && (
                showRegister ? (
                  <Card className="w-[350px] absolute right-4 top-20 z-10">
                    <CardHeader>
                      <CardTitle>Register</CardTitle>
                      <CardDescription>Create a new account</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Username</label>
                          <Input 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Password</label>
                          <Input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required
                          />
                        </div>
                        <div className="flex justify-between">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowRegister(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">Register</Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="w-[350px] absolute right-4 top-20 z-10">
                    <CardHeader>
                      <CardTitle>Login</CardTitle>
                      <CardDescription>Sign in to your account</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Username</label>
                          <Input 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Password</label>
                          <Input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required
                          />
                        </div>
                        <div className="flex justify-between">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowRegister(true)}
                          >
                            Register
                          </Button>
                          <Button type="submit">Login</Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )
              )}
              <Button onClick={() => {
                setShowAuthDialog(!showAuthDialog);
                if (!showAuthDialog) {
                  setShowRegister(false);
                }
              }}>
                {showAuthDialog ? "Cancel" : "Login / Register"}
              </Button>
            </div>
          )}
      </div>

        <p className="text-center text-muted-foreground mb-8">
          {message}
        </p>
        
        {/* Summary History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <Card className="w-[800px] max-h-[80vh] overflow-auto">
              <CardHeader>
                <CardTitle>Your Summary History</CardTitle>
                <CardDescription>Click on any summary to load it</CardDescription>
              </CardHeader>
              <CardContent>
                {summaryHistory.length === 0 ? (
                  <p className="text-muted-foreground">No summary history yet.</p>
                ) : (
                  <div className="space-y-4">
                    {summaryHistory.map(item => (
                      <div 
                        key={item._id} 
                        className="p-4 border rounded-md hover:bg-accent cursor-pointer"
                        onClick={() => loadSummaryFromHistory(item)}
                      >
                        <p className="text-sm text-muted-foreground">
                          {formatDate(item.created_at)}
                        </p>
                        <p className="line-clamp-2 mt-1">
                          {item.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowHistory(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mb-8">
          {/* File Upload Card */}
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>Select a PDF file to analyze</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <label className="w-full flex flex-col items-center px-4 py-6 bg-primary/10 text-primary rounded-lg border-2 border-dashed border-primary/40 cursor-pointer hover:bg-primary/20 transition-colors">
                  <svg className="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
                  </svg>
                  <span className="mt-2 text-base">Select a PDF file</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf" />
                </label>
                {file && <p className="mt-3 text-sm text-primary">Selected: {file.name}</p>}
              </div>
            </CardContent>
            <CardFooter className="flex-col">
              <Button
                className="w-full"
                onClick={handleSummarize}
                disabled={loading || !file}
              >
                {loading ? 'Processing...' : 'Summarize PDF'}
              </Button>
            </CardFooter>
          </Card>

          {/* Summary Section */}
      {summary && (
            <Card className="col-span-full">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Summary</CardTitle>
                  <CardDescription>AI-generated summary of your document</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted text-muted-foreground p-4 rounded-md text-sm">
                  {summary}
                </div>
                
                {/* Audio Control Buttons */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => playSpeech(summary)}
                    className="rounded-full h-10 w-10 flex items-center justify-center"
                    title="Play"
                  >
                    <FontAwesomeIcon icon={faPlay} className="h-4 w-4" />
                    <span className="sr-only">Play</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={speechSynthesis.paused ? resumeSpeech : pauseSpeech}
                    className="rounded-full h-10 w-10 flex items-center justify-center"
                    disabled={!speechSynthesis.speaking}
                    title={speechSynthesis.paused ? "Resume" : "Pause"}
                  >
                    <FontAwesomeIcon icon={faPause} className="h-4 w-4" />
                    <span className="sr-only">{speechSynthesis.paused ? "Resume" : "Pause"}</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stopSpeech}
                    className="rounded-full h-10 w-10 flex items-center justify-center"
                    disabled={!speechSynthesis.speaking}
                    title="Stop"
                  >
                    <FontAwesomeIcon icon={faStop} className="h-4 w-4" />
                    <span className="sr-only">Stop</span>
                  </Button>
        </div>
              </CardContent>
            </Card>
          )}

          {/* Translation Section */}
          <Card>
            <CardHeader>
              <CardTitle>Translation</CardTitle>
              <CardDescription>Translate the summary to other languages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium" htmlFor="language">Select Language</label>
                <Select
                  id="language"
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
                  disabled={loading || !summary}
        >
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
            <option key={code} value={code}>{lang}</option>
          ))}
                </Select>
      </div>
              
              <Button 
                onClick={handleTranslate}
                disabled={loading || !summary}
                className="w-full"
                variant="secondary"
              >
                {loading ? 'Translating...' : 'Translate'}
              </Button>

      {translatedText && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">Translated Text</h3>
                  </div>
                  <div className="bg-muted text-muted-foreground p-4 rounded-md text-sm">
                    {translatedText}
                  </div>
                  
                  {/* Translation Audio Control Buttons */}
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playTranslationSpeech(translatedText)}
                      className="rounded-full h-10 w-10 flex items-center justify-center"
                      title="Play"
                    >
                      <FontAwesomeIcon icon={faPlay} className="h-4 w-4" />
                      <span className="sr-only">Play</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={speechSynthesis.paused ? resumeTranslationSpeech : pauseTranslationSpeech}
                      className="rounded-full h-10 w-10 flex items-center justify-center"
                      disabled={!speechSynthesis.speaking}
                      title={speechSynthesis.paused ? "Resume" : "Pause"}
                    >
                      <FontAwesomeIcon icon={faPause} className="h-4 w-4" />
                      <span className="sr-only">{speechSynthesis.paused ? "Resume" : "Pause"}</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopTranslationSpeech}
                      className="rounded-full h-10 w-10 flex items-center justify-center"
                      disabled={!speechSynthesis.speaking}
                      title="Stop"
                    >
                      <FontAwesomeIcon icon={faStop} className="h-4 w-4" />
                      <span className="sr-only">Stop</span>
                    </Button>
                  </div>
        </div>
      )}
            </CardContent>
          </Card>

          {/* Question and Answer Section */}
          <Card>
            <CardHeader>
              <CardTitle>Ask a Question</CardTitle>
              <CardDescription>Ask questions about the document</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium" htmlFor="question">Your Question</label>
                <Input
                  id="question"
                  placeholder="What would you like to know about this document?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
                  disabled={loading || !summary}
        />
      </div>
              
              <Button 
                onClick={handleAskQuestion}
                disabled={loading || !summary || !question}
                className="w-full"
                variant="accent"
              >
                {loading ? 'Thinking...' : 'Get Answer'}
              </Button>

      {answer && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">Answer</h3>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => speakText(answer)}
                      className="h-6 w-6 rounded-full"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071a1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243a1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
                      </svg>
                      <span className="sr-only">Read aloud</span>
                    </Button>
                  </div>
                  <div className="bg-muted text-muted-foreground p-4 rounded-md text-sm">
                    {answer}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-muted-foreground text-sm">
          Powered by Gemini AI
        </p>
      </div>
    </div>
  );
}

export default App;
