import * as aiMatchingService from '../services/aiMatching.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getRecommendations = asyncHandler(async (req, res) => {
  const recommendations = await aiMatchingService.getRecommendations(req.user.id, req.query);
  sendSuccess(res, { statusCode: 200, message: 'AI match recommendations retrieved', data: { recommendations } });
});

export const explainMatch = asyncHandler(async (req, res) => {
  const explanation = await aiMatchingService.explainUserMatch(req.user.id, req.params.userId);
  sendSuccess(res, { statusCode: 200, message: 'Match explanation retrieved', data: { explanation } });
});
