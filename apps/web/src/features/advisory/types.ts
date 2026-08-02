export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl: string | null;
  createdAt: string;
}

export interface SendMessageResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}
