"use client";
import { useState } from "react";
import styles from "../styles/chatbot.module.css";

export default function Chatbot() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages((msgs) => [...msgs, userMessage]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
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
    setInput("");
    setLoading(false);
  }

  return (
    <div className={styles.chatbotContainer}>
      <div className={styles.messages}>
        {messages.map((msg, i) => (
  <div
    key={i}
    className={
      (msg.role === "user" ? styles.user : styles.bot) +
      " flex items-center gap-2"
    }
  >
    <span>
      {msg.role === "user" ? "🧑" : "🤖"}
    </span>
    <span>
      <b>{msg.role === "user" ? "You" : "Bot"}:</b> {msg.text}
    </span>
  </div>
))}
        {loading && <div className={styles.bot}>Bot: Lemme think...</div>}
      </div>
      <form onSubmit={sendMessage} className={styles.inputForm + " mt-2"}>
  <input
    value={input}
    onChange={(e) => setInput(e.target.value)}
    placeholder="Type your message..."
    className={styles.input + " border focus:ring-2 focus:ring-blue-300"}
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
}