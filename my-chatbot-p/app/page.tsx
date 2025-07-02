import Chatbot from "../components/Chatbot";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-green-100">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Chatbot Demo</h1>
      <Chatbot />
    </main>
  );
}