import React, { forwardRef } from 'react';
import TextareaAutosize, { TextareaAutosizeProps } from 'react-textarea-autosize';
import { cn } from '../../lib/utils';

export interface ChatInputProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'style'> {
  /**
   * Additional class names to apply to the input
   */
  className?: string;

  /**
   * Minimum height of the textarea in pixels
   */
  minRows?: number;

  /**
   * Maximum height of the textarea before scrolling in pixels
   */
  maxRows?: number;
}

const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ className, minRows = 1, maxRows = 5, ...props }, ref) => {
    // Extract props that are safe to pass to TextareaAutosize
    const textareaProps: TextareaAutosizeProps = {
      minRows,
      maxRows,
      className: cn(
        'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
        className
      ),
      ...props,
    };

    return <TextareaAutosize ref={ref} {...textareaProps} />;
  }
);

ChatInput.displayName = 'ChatInput';

export { ChatInput };
