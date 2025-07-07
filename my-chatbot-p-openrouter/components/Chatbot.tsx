"use client";
import { useState, useRef, useEffect, FC } from "react";
import Image from "next/image";
import styles from "../styles/chatbot.module.css";

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
  const [messages, setMessages] = useState<Message[]>([]);
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
      }, 10000); // after 10 seconds
    }
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <div className={styles.chatbotContainer}>
      <Image src="/logo.png" alt="Scott Law Firm Logo" width={150} height={150} />
      <div className={styles.messages}>
        {messages.map((msg, i) => {
          const isBilingual = msg.role === 'bot' && msg.text.includes('English:') && msg.text.includes('Spanish:');

          return (
            <div key={i} className={`${msg.role === "user" ? styles.user : styles.bot} flex flex-col items-start gap-2`}>
              <div className="flex items-center gap-2">
                <span>{msg.role === "user" ? "🧑" : "🤖"}</span>
                <span>
                  <b>{msg.role === "user" ? "You" : "SLF Bot"}:</b> {msg.text}
                </span>
              </div>

              {msg.role === "bot" && (
                <div className="flex gap-2 ml-8 items-center">
                  <button
                    onClick={() => handleSpeak(msg.text)}
                    disabled={isSpeaking || isDownloading}
                    className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300 disabled:opacity-50"
                    aria-label="Speak this message"
                  >
                    {isSpeaking ? "..." : "🔊 Speak"}
                  </button>

                  {isBilingual && (
                     <button 
                       onClick={() => handleMergeDownload(msg.text)}
                       disabled={isDownloading || isSpeaking}
                       className="text-xs bg-blue-200 px-2 py-1 rounded hover:bg-blue-300 disabled:opacity-50"
                     >
                       {isDownloading ? "..." : "💾 Download Merged"}
                     </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {loading && <div className={`${styles.bot} ${styles.loading}`}>SLF Bot: Thinking</div>}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className={`${styles.inputForm} mt-2`}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className={`${styles.input} border focus:ring-2 focus:ring-blue-300`}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
