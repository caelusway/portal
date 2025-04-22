import React, { useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { ChatInput } from '../../components/ui/chat/chat-input';

interface CoreAgentInputProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  suggestedMessages: string[];
}

export function CoreAgentInput({
  isAuthenticated,
  isLoading,
  onSendMessage,
  suggestedMessages,
}: CoreAgentInputProps) {
  const [inputValue, setInputValue] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        onSendMessage(inputValue);
        setInputValue('');
      }
    }
  };

  return (
    <div className="px-4 py-2 border-t">
      {/* Suggested messages */}
      <div className="flex flex-wrap gap-2 mb-4">
        {suggestedMessages.map((message, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              setInputValue(message);
              onSendMessage(message);
            }}
            disabled={isLoading || !isAuthenticated}
          >
            {message}
          </Button>
        ))}
      </div>

      {/* Chat input */}
      <form ref={formRef} onSubmit={handleSubmit} className="relative rounded-md border bg-card">
        <ChatInput
          ref={inputRef}
          onKeyDown={handleKeyDown}
          value={inputValue}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
          placeholder={isLoading ? 'CoreAgent is typing...' : 'Type your message here...'}
          className="min-h-12 resize-none rounded-md bg-card border-0 p-3 shadow-none focus-visible:ring-0"
          disabled={isLoading || !isAuthenticated}
        />
        <div className="flex items-center p-3 pt-0">
          <Button
            disabled={isLoading || !isAuthenticated || !inputValue.trim()}
            type="submit"
            size="sm"
            className="ml-auto gap-1.5 h-[30px]"
          >
            {isLoading ? (
              <div className="flex gap-0.5 items-center justify-center">
                <Loader2 className="size-3.5 mr-1 animate-spin" />
              </div>
            ) : (
              <Send className="size-3.5" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
