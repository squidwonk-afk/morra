import { MessageCircle } from "lucide-react";
import { useState } from "react";

interface FloatingChatButtonProps {
  onClick: () => void;
}

export function FloatingChatButton({ onClick }: FloatingChatButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-gradient-to-br from-[#00FF94] to-[#9BFF00] flex items-center justify-center shadow-[0_0_40px_rgba(0,255,148,0.5)] hover:shadow-[0_0_60px_rgba(0,255,148,0.7)] transition-all hover:scale-110 group"
      style={{
        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
      }}
      aria-label="Open MORRA Assistant"
    >
      <MessageCircle 
        className="text-[#0A0A0A] transition-transform group-hover:rotate-12" 
        size={28}
      />
      
      {/* Pulse ring effect */}
      <div 
        className="absolute inset-0 rounded-full bg-[#00FF94]/30 animate-ping"
        style={{
          animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite"
        }}
      />

      {/* Tooltip */}
      {isHovered && (
        <div 
          className="absolute bottom-full right-0 mb-3 px-4 py-2 rounded-lg bg-[#121212] border border-[#00FF94]/30 text-white text-sm whitespace-nowrap shadow-[0_0_20px_rgba(0,255,148,0.3)]"
          style={{
            animation: "tooltipFadeIn 0.2s ease-out"
          }}
        >
          Need help? Ask MORRA
          <div className="absolute top-full right-6 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-[#00FF94]/30" />
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 40px rgba(0, 255, 148, 0.5);
          }
          50% {
            box-shadow: 0 0 60px rgba(0, 255, 148, 0.8);
          }
        }

        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </button>
  );
}
