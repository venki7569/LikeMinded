import * as peopleService from '../services/people.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const discover = asyncHandler(async (req, res) => {
  const { people, meta } = await peopleService.discoverPeople(req.user.id, req.query);
  return sendSuccess(res, { message: 'People', data: { people }, meta });
});
