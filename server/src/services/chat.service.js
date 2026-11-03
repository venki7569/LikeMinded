import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import ApiError from '../utils/ApiError.js';
import { pairKey } from '../utils/pair.js';

export async function getOrCreateConversation(userId, targetUserId) {
  if (String(userId) === String(targetUserId)) {
    throw ApiError.badRequest('Cannot start a conversation with yourself');
  }

  const key = pairKey(userId, targetUserId);

  let conversation = await Conversation.findOne({ pairKey: key })
    .populate('participants', 'name username avatar role')
    .lean();

  if (!conversation) {
    const created = await Conversation.create({
      participants: [userId, targetUserId],
      pairKey: key,
    });
    conversation = await Conversation.findById(created._id)
      .populate('participants', 'name username avatar role')
      .lean();
  }

  return conversation;
}

export async function listConversations(userId) {
  const conversations = await Conversation.find({ participants: userId })
    .populate('participants', 'name username avatar role')
    .sort({ updatedAt: -1 })
    .lean();

  return conversations;
}

export async function getMessages(userId, conversationId, { limit = 50 } = {}) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw ApiError.notFound('Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    (p) => String(p) === String(userId)
  );
  if (!isParticipant) {
    throw ApiError.forbidden('You are not a participant in this conversation');
  }

  const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  const messages = await Message.find({ conversation: conversationId })
    .sort({ createdAt: 1 })
    .limit(numericLimit)
    .populate('sender', 'name username avatar')
    .lean();

  return messages;
}

export async function sendMessage(userId, conversationId, { body, attachments = [] }) {
  if (!body?.trim() && (!attachments || attachments.length === 0)) {
    throw ApiError.badRequest('Message body or attachment is required');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw ApiError.notFound('Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    (p) => String(p) === String(userId)
  );
  if (!isParticipant) {
    throw ApiError.forbidden('You are not a participant in this conversation');
  }

  const message = await Message.create({
    conversation: conversationId,
    sender: userId,
    body: body ? body.trim() : '',
    attachments,
    readBy: [userId],
  });

  // Update conversation lastMessage
  conversation.lastMessage = {
    sender: userId,
    body: message.body,
    createdAt: message.createdAt,
  };
  await conversation.save();

  const populated = await Message.findById(message._id)
    .populate('sender', 'name username avatar')
    .lean();

  return populated;
}

export async function markConversationRead(userId, conversationId) {
  await Message.updateMany(
    { conversation: conversationId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

  return { success: true };
}

export default {
  getOrCreateConversation,
  listConversations,
  getMessages,
  sendMessage,
  markConversationRead,
};
