import Chatbot from "../components/Chatbot";
import Image from 'next/image'; // If you're using Next.js
import logo from '../public/logo.png';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-green-100">
      {/* Flex container for logo and heading */}
      <div className="flex items-center mb-6">
        <Image src={logo} alt="Logo" width={50} height={50} className="mr-3" />
        <h1 className="text-3xl font-bold text-gray-800">SLF Voice Bot</h1>
      </div>
      
      <Chatbot />
    </main>
  );
}