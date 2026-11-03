import { describe, expect, it } from 'vitest';
import chatReducer, {
  fetchConversations,
  sendMessage,
  setActiveConversation,
} from './chatSlice';

describe('chatSlice', () => {
  it('initializes with empty conversations and null active conversation', () => {
    const state = chatReducer(undefined, { type: '@@INIT' });
    expect(state.conversations).toEqual([]);
    expect(state.activeConversationId).toBeNull();
  });

  it('sets active conversation id', () => {
    const state = chatReducer(undefined, setActiveConversation('conv-123'));
    expect(state.activeConversationId).toBe('conv-123');
  });

  it('stores conversations list on fetchConversations.fulfilled', () => {
    const conversations = [{ id: 'c1', participants: [] }];
    const state = chatReducer(
      undefined,
      fetchConversations.fulfilled({ conversations }, 'req')
    );
    expect(state.status).toBe('succeeded');
    expect(state.conversations).toEqual(conversations);
  });

  it('appends message on sendMessage.fulfilled', () => {
    const message = { id: 'm1', conversation: 'c1', body: 'Hello world' };
    const state = chatReducer(
      {
        conversations: [{ id: 'c1', lastMessage: null }],
        activeConversationId: 'c1',
        messagesByConversation: {},
        status: 'idle',
        error: null,
        sending: false,
      },
      sendMessage.fulfilled({ message }, 'req', { conversationId: 'c1', body: 'Hello world' })
    );
    expect(state.messagesByConversation['c1']).toHaveLength(1);
    expect(state.messagesByConversation['c1'][0].body).toBe('Hello world');
    expect(state.conversations[0].lastMessage.body).toBe('Hello world');
  });
});
