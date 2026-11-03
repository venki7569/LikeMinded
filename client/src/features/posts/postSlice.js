import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toApiError } from '@/services/apiClient';
import postApi from './postApi';

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

export const fetchHomeFeed = createAsyncThunk(
  'posts/fetchHomeFeed',
  unwrap((params) => postApi.getHomeFeed(params))
);

export const fetchProfileFeed = createAsyncThunk(
  'posts/fetchProfileFeed',
  unwrap(({ username, ...params }) => postApi.getProfileFeed(username, params))
);

export const fetchCommunityFeed = createAsyncThunk(
  'posts/fetchCommunityFeed',
  unwrap(({ slug, ...params }) => postApi.getCommunityFeed(slug, params))
);

export const createNewPost = createAsyncThunk(
  'posts/create',
  unwrap((payload) => postApi.createPost(payload))
);

export const removePost = createAsyncThunk(
  'posts/delete',
  unwrap((postId) => postApi.deletePost(postId))
);

export const toggleLike = createAsyncThunk(
  'posts/toggleLike',
  async ({ postId, isLiked }, { rejectWithValue }) => {
    try {
      if (isLiked) {
        const response = await postApi.unlikePost(postId);
        return { postId, ...response.data };
      } else {
        const response = await postApi.likePost(postId);
        return { postId, ...response.data };
      }
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  }
);

export const fetchPostComments = createAsyncThunk(
  'posts/comments/fetch',
  unwrap(({ postId, ...params }) => postApi.listComments(postId, params))
);

export const createPostComment = createAsyncThunk(
  'posts/comments/create',
  unwrap(({ postId, ...payload }) => postApi.createComment(postId, payload))
);

export const removePostComment = createAsyncThunk(
  'posts/comments/delete',
  unwrap(({ postId, commentId }) => postApi.deleteComment(postId, commentId))
);

const initialState = {
  feed: {
    items: [],
    nextCursor: null,
    hasMore: false,
    status: 'idle',
    error: null,
  },
  commentsByPost: {},
  creationStatus: 'idle',
  creationError: null,
};

const postSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    clearFeed(state) {
      state.feed = {
        items: [],
        nextCursor: null,
        hasMore: false,
        status: 'idle',
        error: null,
      };
    },
  },
  extraReducers: (builder) => {
    // Home Feed
    builder
      .addCase(fetchHomeFeed.pending, (state, action) => {
        if (!action.meta.arg?.cursor) {
          state.feed.status = 'loading';
          state.feed.error = null;
        }
      })
      .addCase(fetchHomeFeed.fulfilled, (state, action) => {
        state.feed.status = 'succeeded';
        const { posts = [], nextCursor = null, hasMore = false } = action.payload;
        if (action.meta.arg?.cursor) {
          state.feed.items.push(...posts);
        } else {
          state.feed.items = posts;
        }
        state.feed.nextCursor = nextCursor;
        state.feed.hasMore = hasMore;
      })
      .addCase(fetchHomeFeed.rejected, (state, action) => {
        state.feed.status = 'failed';
        state.feed.error = action.payload?.message || 'Failed to load feed';
      });

    // Profile Feed
    builder
      .addCase(fetchProfileFeed.pending, (state, action) => {
        if (!action.meta.arg?.cursor) {
          state.feed.status = 'loading';
        }
      })
      .addCase(fetchProfileFeed.fulfilled, (state, action) => {
        state.feed.status = 'succeeded';
        const { posts = [], nextCursor = null, hasMore = false } = action.payload;
        if (action.meta.arg?.cursor) {
          state.feed.items.push(...posts);
        } else {
          state.feed.items = posts;
        }
        state.feed.nextCursor = nextCursor;
        state.feed.hasMore = hasMore;
      })
      .addCase(fetchProfileFeed.rejected, (state, action) => {
        state.feed.status = 'failed';
        state.feed.error = action.payload?.message;
      });

    // Community Feed
    builder
      .addCase(fetchCommunityFeed.pending, (state, action) => {
        if (!action.meta.arg?.cursor) {
          state.feed.status = 'loading';
        }
      })
      .addCase(fetchCommunityFeed.fulfilled, (state, action) => {
        state.feed.status = 'succeeded';
        const { posts = [], nextCursor = null, hasMore = false } = action.payload;
        if (action.meta.arg?.cursor) {
          state.feed.items.push(...posts);
        } else {
          state.feed.items = posts;
        }
        state.feed.nextCursor = nextCursor;
        state.feed.hasMore = hasMore;
      })
      .addCase(fetchCommunityFeed.rejected, (state, action) => {
        state.feed.status = 'failed';
        state.feed.error = action.payload?.message;
      });

    // Create Post
    builder
      .addCase(createNewPost.pending, (state) => {
        state.creationStatus = 'loading';
        state.creationError = null;
      })
      .addCase(createNewPost.fulfilled, (state, action) => {
        state.creationStatus = 'succeeded';
        if (action.payload?.post) {
          state.feed.items.unshift(action.payload.post);
        }
      })
      .addCase(createNewPost.rejected, (state, action) => {
        state.creationStatus = 'failed';
        state.creationError = action.payload?.message;
      });

    // Delete Post
    builder.addCase(removePost.fulfilled, (state, action) => {
      const postId = action.meta.arg;
      state.feed.items = state.feed.items.filter((p) => (p.id || p._id) !== postId);
    });

    // Toggle Like
    builder.addCase(toggleLike.fulfilled, (state, action) => {
      const { postId, likeCount, isLiked } = action.payload;
      const post = state.feed.items.find((p) => (p.id || p._id) === postId);
      if (post) {
        post.likeCount = likeCount;
        post.isLiked = isLiked;
      }
    });

    // Comments
    builder
      .addCase(fetchPostComments.fulfilled, (state, action) => {
        const { postId } = action.meta.arg;
        state.commentsByPost[postId] = {
          items: action.payload.comments || [],
          pagination: action.payload.pagination,
        };
      })
      .addCase(createPostComment.fulfilled, (state, action) => {
        const { postId } = action.meta.arg;
        if (!state.commentsByPost[postId]) {
          state.commentsByPost[postId] = { items: [] };
        }
        if (action.payload.comment) {
          state.commentsByPost[postId].items.push(action.payload.comment);
        }
        const post = state.feed.items.find((p) => (p.id || p._id) === postId);
        if (post) {
          post.commentCount = (post.commentCount || 0) + 1;
        }
      })
      .addCase(removePostComment.fulfilled, (state, action) => {
        const { postId, commentId } = action.meta.arg;
        if (state.commentsByPost[postId]) {
          state.commentsByPost[postId].items = state.commentsByPost[postId].items.filter(
            (c) => (c.id || c._id) !== commentId
          );
        }
        const post = state.feed.items.find((p) => (p.id || p._id) === postId);
        if (post && post.commentCount > 0) {
          post.commentCount -= 1;
        }
      });
  },
});

export const { clearFeed } = postSlice.actions;
export const selectFeed = (state) => state.posts.feed;
export const selectCommentsForPost = (postId) => (state) =>
  state.posts.commentsByPost[postId]?.items || [];
export const selectPostCreation = (state) => ({
  status: state.posts.creationStatus,
  error: state.posts.creationError,
});

export default postSlice.reducer;
