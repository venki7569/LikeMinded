import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toApiError } from '@/services/apiClient';
import chatApi from './chatApi';

function unwrap(request) {
  return async (arg, { rejectWithValue }) => {
    try {
      const response = await request(arg);
      return response.data ?? {};
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  };
}

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  unwrap(() => chatApi.listConversations())
);

export const startConversation = createAsyncThunk(
  'chat/startConversation',
  unwrap((recipientId) => chatApi.startConversation(recipientId))
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  unwrap(({ conversationId, ...params }) => chatApi.getMessages(conversationId, params))
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  unwrap(({ conversationId, ...payload }) => chatApi.sendMessage(conversationId, payload))
);

export const markRead = createAsyncThunk(
  'chat/markRead',
  unwrap((conversationId) => chatApi.markRead(conversationId))
);

const initialState = {
  conversations: [],
  activeConversationId: null,
  messagesByConversation: {},
  status: 'idle',
  error: null,
  sending: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveConversation(state, action) {
      state.activeConversationId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.conversations = action.payload.conversations || [];
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message;
      })
      .addCase(startConversation.fulfilled, (state, action) => {
        const conv = action.payload.conversation;
        if (conv) {
          const exists = state.conversations.some(
            (c) => (c.id || c._id) === (conv.id || conv._id)
          );
          if (!exists) {
            state.conversations.unshift(conv);
          }
          state.activeConversationId = conv.id || conv._id;
        }
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { conversationId } = action.meta.arg;
        state.messagesByConversation[conversationId] = action.payload.messages || [];
      })
      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false;
        const msg = action.payload.message;
        if (msg) {
          const convId = msg.conversation;
          if (!state.messagesByConversation[convId]) {
            state.messagesByConversation[convId] = [];
          }
          // Avoid duplicate
          const already = state.messagesByConversation[convId].some(
            (m) => (m.id || m._id) === (msg.id || msg._id)
          );
          if (!already) {
            state.messagesByConversation[convId].push(msg);
          }
          // Update lastMessage on conversation
          const conv = state.conversations.find((c) => (c.id || c._id) === convId);
          if (conv) {
            conv.lastMessage = {
              body: msg.body,
              sender: msg.sender?.id || msg.sender?._id || msg.sender,
              createdAt: msg.createdAt,
            };
          }
        }
      })
      .addCase(sendMessage.rejected, (state) => {
        state.sending = false;
      });
  },
});

export const { setActiveConversation } = chatSlice.actions;

export const selectConversations = (state) => state.chat.conversations;
export const selectActiveConversationId = (state) => state.chat.activeConversationId;
export const selectActiveConversation = (state) =>
  state.chat.conversations.find(
    (c) => (c.id || c._id) === state.chat.activeConversationId
  );
export const selectMessagesForActive = (state) =>
  state.chat.messagesByConversation[state.chat.activeConversationId] || [];
export const selectChatSending = (state) => state.chat.sending;

export default chatSlice.reducer;
