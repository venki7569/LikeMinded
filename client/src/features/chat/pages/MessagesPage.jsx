import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { HiOutlineChatBubbleLeftRight, HiOutlinePaperAirplane } from 'react-icons/hi2';
import Avatar from '@/components/atoms/Avatar';
import Button from '@/components/atoms/Button';
import Spinner from '@/components/atoms/Spinner';
import {
  fetchConversations,
  fetchMessages,
  markRead,
  sendMessage,
  setActiveConversation,
  selectActiveConversation,
  selectActiveConversationId,
  selectChatSending,
  selectConversations,
  selectMessagesForActive,
  startConversation,
} from '../chatSlice';
import { selectCurrentUser } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';

export function MessagesPage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const user = useSelector(selectCurrentUser);
  const conversations = useSelector(selectConversations);
  const activeId = useSelector(selectActiveConversationId);
  const activeConversation = useSelector(selectActiveConversation);
  const messages = useSelector(selectMessagesForActive);
  const isSending = useSelector(selectChatSending);

  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  // If URL has ?user=userId, open or start conversation with them
  useEffect(() => {
    const targetUserId = searchParams.get('user');
    if (targetUserId) {
      dispatch(startConversation(targetUserId));
    }
  }, [dispatch, searchParams]);

  // Initial load of conversations
  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  // Select first conversation if none selected
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      dispatch(setActiveConversation(conversations[0].id || conversations[0]._id));
    }
  }, [activeId, conversations, dispatch]);

  // Fetch messages for active conversation & poll periodically
  useEffect(() => {
    if (activeId) {
      dispatch(fetchMessages({ conversationId: activeId }));
      dispatch(markRead(activeId));

      const interval = setInterval(() => {
        dispatch(fetchMessages({ conversationId: activeId }));
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeId, dispatch]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || isSending || !activeId) return;

    const body = text.trim();
    setText('');
    try {
      await dispatch(sendMessage({ conversationId: activeId, body })).unwrap();
    } catch (err) {
      dispatch(pushToast({ message: err?.message || 'Failed to send message', tone: 'error' }));
      setText(body);
    }
  };

  const getOtherParticipant = (conv) => {
    if (!conv?.participants || !user) return null;
    return conv.participants.find(
      (p) => (p.id || p._id) !== (user.id || user._id)
    ) || conv.participants[0];
  };

  const otherUser = getOtherParticipant(activeConversation);

  return (
    <div className="card-surface flex h-[calc(100vh-8.5rem)] overflow-hidden shadow-sm">
      {/* Left: Conversations Sidebar */}
      <aside className="w-80 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <header className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Messages</h2>
          <p className="text-xs text-slate-400">Direct conversations</p>
        </header>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <HiOutlineChatBubbleLeftRight className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
              <p>No conversations yet.</p>
              <p className="mt-1">Connect with someone and send a message!</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const convId = conv.id || conv._id;
              const other = getOtherParticipant(conv);
              const isSelected = convId === activeId;

              return (
                <button
                  key={convId}
                  type="button"
                  onClick={() => dispatch(setActiveConversation(convId))}
                  className={`w-full flex items-center gap-3 p-3.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-brand-50 dark:bg-brand-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <Avatar name={other?.name} src={other?.avatar?.url} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {other?.name || 'Unknown'}
                      </p>
                      {conv.lastMessage?.createdAt && (
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {conv.lastMessage?.body || 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Right: Active Chat View */}
      <main className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/20">
        {activeConversation && otherUser ? (
          <>
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <Avatar name={otherUser.name} src={otherUser.avatar?.url} size="sm" />
                <div>
                  <Link
                    to={`/u/${otherUser.username}`}
                    className="font-bold text-sm text-slate-900 hover:underline dark:text-slate-100"
                  >
                    {otherUser.name}
                  </Link>
                  <p className="text-xs text-slate-400">@{otherUser.username}</p>
                </div>
              </div>

              <Link to={`/u/${otherUser.username}`}>
                <Button variant="secondary" size="xs">
                  View Profile
                </Button>
              </Link>
            </header>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  Say hi to {otherUser.name.split(' ')[0]} to start the conversation!
                </div>
              ) : (
                messages.map((msg) => {
                  const msgId = msg.id || msg._id;
                  const senderId = msg.sender?.id || msg.sender?._id || msg.sender;
                  const isMe = String(senderId) === String(user?.id || user?._id);

                  return (
                    <div
                      key={msgId}
                      className={`flex flex-col max-w-[70%] ${
                        isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMe
                            ? 'bg-brand-600 text-white rounded-br-xs shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                        }`}
                      >
                        {msg.body}
                      </div>
                      <time className="text-[10px] text-slate-400 mt-1 px-1">
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </time>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSend}
              className="p-4 bg-white border-t border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Message ${otherUser.name}...`}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-900 transition-colors"
              />
              <Button
                type="submit"
                disabled={!text.trim() || isSending}
                leftIcon={isSending ? <Spinner size="xs" /> : <HiOutlinePaperAirplane className="h-4 w-4" />}
              >
                Send
              </Button>
            </form>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
            <HiOutlineChatBubbleLeftRight className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300">Select a conversation</h3>
            <p className="text-xs text-slate-400 mt-1">
              Choose from your existing messages or start a new conversation with a connection.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default MessagesPage;
