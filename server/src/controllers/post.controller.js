import * as postService from '../services/post.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const createPost = asyncHandler(async (req, res) => {
  const post = await postService.createPost(req.user.id, req.body);
  return sendSuccess(res, { statusCode: 201, message: 'Post created', data: { post } });
});

export const getPost = asyncHandler(async (req, res) => {
  const post = await postService.getPost(req.params.postId, req.user?.id);
  return sendSuccess(res, { message: 'Post', data: { post } });
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await postService.updatePost(req.params.postId, req.user.id, req.body);
  return sendSuccess(res, { message: 'Post updated', data: { post } });
});

export const deletePost = asyncHandler(async (req, res) => {
  const result = await postService.deletePost(req.params.postId, req.user.id, req.user.role);
  return sendSuccess(res, { message: 'Post deleted', data: result });
});

export const likePost = asyncHandler(async (req, res) => {
  const result = await postService.likePost(req.params.postId, req.user.id);
  return sendSuccess(res, { message: 'Post liked', data: result });
});

export const unlikePost = asyncHandler(async (req, res) => {
  const result = await postService.unlikePost(req.params.postId, req.user.id);
  return sendSuccess(res, { message: 'Post unliked', data: result });
});

export const getHomeFeed = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;
  const result = await postService.getHomeFeed(req.user.id, { cursor, limit });
  return sendSuccess(res, { message: 'Home feed', data: result });
});

export const getProfileFeed = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;
  const result = await postService.getProfileFeed(req.params.username, req.user?.id, {
    cursor,
    limit,
  });
  return sendSuccess(res, { message: 'Profile feed', data: result });
});

export const getCommunityFeed = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;
  const result = await postService.getCommunityFeed(req.params.slug, req.user?.id, {
    cursor,
    limit,
  });
  return sendSuccess(res, { message: 'Community feed', data: result });
});

export const createComment = asyncHandler(async (req, res) => {
  const comment = await postService.createComment(
    req.params.postId,
    req.user.id,
    req.body.content
  );
  return sendSuccess(res, { statusCode: 201, message: 'Comment created', data: { comment } });
});

export const listComments = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const { comments, meta } = await postService.listComments(req.params.postId, req.user?.id, {
    page,
    limit,
  });
  return sendSuccess(res, { message: 'Comments', data: { comments }, meta });
});

export const updateComment = asyncHandler(async (req, res) => {
  const comment = await postService.updateComment(
    req.params.postId,
    req.params.commentId,
    req.user.id,
    req.body.content
  );
  return sendSuccess(res, { message: 'Comment updated', data: { comment } });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const result = await postService.deleteComment(
    req.params.postId,
    req.params.commentId,
    req.user.id,
    req.user.role
  );
  return sendSuccess(res, { message: 'Comment deleted', data: result });
});
