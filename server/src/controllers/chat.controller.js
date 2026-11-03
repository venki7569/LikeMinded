import * as chatService from '../services/chat.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const startConversation = asyncHandler(async (req, res) => {
  const { recipientId } = req.body;
  const conversation = await chatService.getOrCreateConversation(req.user.id, recipientId);
  sendSuccess(res, { statusCode: 201, message: 'Conversation retrieved', data: { conversation } });
});

export const getConversations = asyncHandler(async (req, res) => {
  const conversations = await chatService.listConversations(req.user.id);
  sendSuccess(res, { statusCode: 200, message: 'Conversations retrieved', data: { conversations } });
});

export const getMessages = asyncHandler(async (req, res) => {
  const messages = await chatService.getMessages(req.user.id, req.params.id, req.query);
  sendSuccess(res, { statusCode: 200, message: 'Messages retrieved', data: { messages } });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await chatService.sendMessage(req.user.id, req.params.id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Message sent', data: { message } });
});

export const markRead = asyncHandler(async (req, res) => {
  const result = await chatService.markConversationRead(req.user.id, req.params.id);
  sendSuccess(res, { statusCode: 200, message: 'Conversation marked as read', data: result });
});
