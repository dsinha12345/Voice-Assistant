"use client";
import { useState, useRef, useEffect, FC } from "react";
import { Send, Volume2, Download, User, Bot, Loader2 } from "lucide-react";

interface Message {
  role: string;
  text: string;
}

// Helper function to trigger a file download in the browser
function triggerDownload(base64Audio: string, filename: string) {
  const byteCharacters = atob(base64Audio);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'audio/mpeg' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

const Chatbot: FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hello! I'm SLF Bot. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", text: input };
    setMessages((msgs) => [...msgs, userMessage]);
    const currentInput = input;
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput }),
      });
      const data = await res.json();
      setMessages((msgs) => [
        ...msgs,
        { role: "bot", text: data.reply || "No response." },
      ]);
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        { role: "bot", text: "Error contacting API." },
      ]);
    }
    setLoading(false);
  }

  const handleSpeak = async (text: string) => {
    if (isSpeaking) return;
    
    const englishMatch = text.match(/English:\s*"([^"]*)"/);
    const spanishMatch = text.match(/Spanish:\s*"([^"]*)"/);
    const partsToSpeak: { text: string; lang: string }[] = [];

    if (englishMatch && spanishMatch) {
      partsToSpeak.push({ text: englishMatch[1], lang: 'en-US' });
      partsToSpeak.push({ text: spanishMatch[1], lang: 'es-US' });
    } else {
      partsToSpeak.push({ text: text, lang: 'en-US' });
    }

    setIsSpeaking(true);

    const playInSequence = async (index: number) => {
      if (index >= partsToSpeak.length) {
        setIsSpeaking(false);
        return;
      }
      const part = partsToSpeak[index];
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: part.text, language: part.lang }),
        });
        if (!response.ok) throw new Error('Failed to fetch audio.');
        const { audioContent } = await response.json();
        const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
        audio.onended = () => playInSequence(index + 1);
        audio.play();
      } catch (error) {
        console.error("Error playing audio part:", error);
        setIsSpeaking(false);
      }
    };
    playInSequence(0);
  };

  const handleMergeDownload = async (fullText: string) => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const response = await fetch('/api/tts-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate merged audio.');
      }

      const { audioContent } = await response.json();
      triggerDownload(audioContent, 'voicemail_merged.mp3');

    } catch (error) {
       console.error("Merge download error:", error);
       alert(error instanceof Error ? error.message : "Could not download merged audio file.");
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setTimeout(() => {
        setMessages((msgs) => [
          ...msgs,
          { role: "bot", text: "Still thinking, please wait..." },
        ]);
      }, 10000);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  return (
  <div className="w-full max-w-4xl h-[70vh] bg-white rounded-3xl overflow-hidden shadow-xl flex flex-col">

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-t-3xl shadow-xl border border-white/20 p-6 mb-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SLF Bot
            </h1>
            <p className="text-sm text-gray-500">Online • Ready to help</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-white/60 backdrop-blur-xl shadow-xl border-x border-white/20 overflow-hidden">
        <div className="h-full overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {messages.map((msg, i) => {
            const isBilingual = msg.role === 'bot' && msg.text.includes('English:') && msg.text.includes('Spanish:');

            return (
              <div key={i} className={`flex items-start gap-3 group ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                  msg.role === "user" 
                    ? "bg-gradient-to-r from-green-400 to-blue-500" 
                    : "bg-gradient-to-r from-purple-400 to-pink-500"
                }`}>
                  {msg.role === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`max-w-xs lg:max-w-md ${msg.role === "user" ? "text-right" : ""}`}>
                  <div className={`px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 group-hover:shadow-md ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-md"
                      : "bg-white text-gray-800 rounded-bl-md border border-gray-100"
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>

                  {/* Action Buttons */}
                  {msg.role === "bot" && (
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => handleSpeak(msg.text)}
                        disabled={isSpeaking || isDownloading}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Speak this message"
                      >
                        {isSpeaking ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Volume2 className="w-3 h-3" />
                        )}
                        <span>{isSpeaking ? "Speaking..." : "Speak"}</span>
                      </button>

                      {isBilingual && (
                         <button 
                           onClick={() => handleMergeDownload(msg.text)}
                           disabled={isDownloading || isSpeaking}
                           className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           {isDownloading ? (
                             <Loader2 className="w-3 h-3 animate-spin" />
                           ) : (
                             <Download className="w-3 h-3" />
                           )}
                           <span>{isDownloading ? "Downloading..." : "Download Merged"}</span>
                         </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Loading indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center shadow-md">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                  <span className="text-sm text-gray-500">SLF Bot is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white/80 backdrop-blur-xl rounded-b-3xl shadow-xl border border-white/20 p-6 mt-0">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12 text-black"
              disabled={loading}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(e)}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
      </div>
  );
};

export default Chatbot;