import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Zap,
  Cpu,
  Compass,
  ArrowRight,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { ChatMessage, ChatModel, ChatRole } from '../types';
import { CHAT_ROLES } from '../utils/sampleData';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  currentChildName: string;
  onApplyTheme: (theme: string, notes?: string) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  currentTheme,
  currentChildName,
  onApplyTheme,
}) => {
  const [selectedRole, setSelectedRole] = useState<ChatRole>(CHAT_ROLES[0]);
  const [selectedModel, setSelectedModel] = useState<ChatModel>('gemini-3.5-flash');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      content: `Hello! I'm your **ColorCraft Assistant**! 🎨\n\nI can help you create amazing coloring books for **${currentChildName || 'your child'}**. Ask me to:\n• Brainstorm fun themes or magical ideas\n• Outline 5 distinct scenes with rhyming captions\n• Suggest ideas tailored to your child's age or hobbies\n\nWhat would you like to explore?`,
      timestamp: Date.now(),
      modelUsed: 'gemini-3.5-flash',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Sync role with recommended model
  const handleSelectRole = (role: ChatRole) => {
    setSelectedRole(role);
    setSelectedModel(role.recommendedModel);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      // Send conversation history to /api/chat
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
          role: selectedRole.id,
          context: {
            theme: currentTheme,
            childName: currentChildName,
          },
        }),
      });

      const data = await res.json();

      if (data.success && data.text) {
        const botMessage: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          content: data.text,
          timestamp: Date.now(),
          modelUsed: data.modelUsed || selectedModel,
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        throw new Error(data.error || 'Failed to receive response');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'system',
        content: `⚠️ Error communicating with Gemini: ${err.message || 'Please check your connection and try again.'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'reset-msg',
        role: 'model',
        content: `Chat history cleared! Ready to brainstorm new themes and coloring ideas for **${currentChildName || 'your child'}**!`,
        timestamp: Date.now(),
        modelUsed: selectedModel,
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-amber-200">
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center ring-2 ring-white/40">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-none" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                ColorCraft Gemini Chat
              </h3>
              <p className="text-[11px] text-white/90 mt-0.5">
                Story planning & coloring assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClearHistory}
              title="Clear chat history"
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Close chat"
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Role & Model Selector Panel */}
        <div className="p-3 bg-amber-50/70 border-b border-amber-200/80 space-y-2 shrink-0">
          {/* Role selector chips */}
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 uppercase tracking-wider">
            <span>Assistant Role</span>
            <span className="text-amber-800 font-semibold">{selectedRole.name}</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {CHAT_ROLES.map((role) => {
              const isSelected = selectedRole.id === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => handleSelectRole(role)}
                  className={`p-1.5 rounded-lg text-left text-[11px] transition-all border ${
                    isSelected
                      ? 'bg-amber-600 text-white font-bold border-amber-600 shadow-2xs'
                      : 'bg-white hover:bg-amber-100/50 text-gray-700 border-gray-200'
                  }`}
                >
                  <div className="truncate">{role.name}</div>
                </button>
              );
            })}
          </div>

          {/* Model Affordance Bar */}
          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="text-gray-500 font-medium">Model:</span>
            <div className="flex items-center gap-1">
              {[
                { id: 'gemini-3.1-flash-lite', label: 'Flash-Lite (Fast)' },
                { id: 'gemini-3.5-flash', label: 'Flash 3.5 (General)' },
                { id: 'gemini-3.1-pro-preview', label: 'Pro 3.1 (Complex)' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id as ChatModel)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                    selectedModel === m.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50" id="chat-messages-thread">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  {msg.content}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed space-y-2 shadow-2xs ${
                  isUser
                    ? 'bg-amber-600 text-white font-medium rounded-tr-xs'
                    : 'bg-white text-gray-800 border border-gray-200/80 rounded-tl-xs'
                }`}>
                  <div className="whitespace-pre-wrap font-sans">
                    {msg.content}
                  </div>

                  {!isUser && msg.modelUsed && (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px] text-gray-400">
                      <span>Model: {msg.modelUsed}</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-gray-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-xs p-3 text-xs text-gray-500 flex items-center gap-2 shadow-2xs">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span>Thinking with {selectedModel}...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Inspiration Prompts */}
        <div className="px-3 py-2 bg-amber-50/40 border-t border-gray-200/60 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Try:</span>
          {[
            `Outline 5 scenes for "${currentTheme || 'Dinosaurs'}"`,
            `Rhyming captions for ${currentChildName || 'Leo'}`,
            'Suggest 3 new creative themes',
          ].map((promptText) => (
            <button
              key={promptText}
              onClick={() => handleSendMessage(promptText)}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-amber-100 border border-amber-200/80 text-[11px] text-gray-700 font-medium transition-colors shrink-0 shadow-2xs"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <div className="p-3 bg-white border-t border-gray-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask for ideas, scenes, or rhymes for ${currentChildName || 'child'}...`}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 text-xs text-gray-900 outline-hidden"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white transition-all shadow-xs"
              id="send-chat-msg-btn"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
