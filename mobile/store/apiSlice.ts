import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { RootState } from './index';
import { TagType } from './enums';
import { updateToken, logout } from './slices/authSlice';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Custom base query with token refresh logic
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Try to refresh the token
    const refreshToken = (api.getState() as RootState).auth.refreshToken;
    const currentToken = (api.getState() as RootState).auth.token;

    if (currentToken) {
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        // Store the new token
        const newToken = (refreshResult.data as { access_token: string }).access_token;
        api.dispatch(updateToken(newToken));

        // Retry the original query with the new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed, logout user
        api.dispatch(logout());
      }
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: Object.values(TagType),
  endpoints: () => ({}),
});

// Inject auth endpoints
export const enhancedApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation<
      { access_token: string; token_type: string },
      { username: string; password: string }
    >({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: new URLSearchParams({
          username: credentials.username,
          password: credentials.password,
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
      invalidatesTags: [TagType.Auth],
    }),

    refreshToken: builder.mutation<
      { access_token: string; token_type: string },
      void
    >({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      invalidatesTags: [TagType.Auth],
    }),

    // User endpoints
    getCurrentUser: builder.query<any, void>({
      query: () => '/users/me',
      providesTags: [TagType.UserProfile],
    }),

    // Complex endpoints
    getComplexes: builder.query<any[], { skip?: number; limit?: number }>({
      query: ({ skip = 0, limit = 50 } = {}) => `/complexes?skip=${skip}&limit=${limit}`,
      providesTags: [TagType.Complex],
    }),

    getComplexById: builder.query<any, number>({
      query: (id) => `/complexes/${id}`,
      providesTags: (_, __, id) => [{ type: TagType.Complex, id }],
    }),

    // Building endpoints
    getBuildings: builder.query<any[], { complexId?: number; skip?: number; limit?: number }>({
      query: ({ complexId, skip = 0, limit = 50 } = {}) => {
        const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
        if (complexId) params.append('complex_id', String(complexId));
        return `/buildings?${params.toString()}`;
      },
      providesTags: [TagType.Building],
    }),

    // Announcement discussion endpoints
    createAnnouncementComment: builder.mutation<any, { announcementId: number; content: string }>({
      query: ({ announcementId, content }) => ({
        url: `/announcements/${announcementId}/comments`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: [TagType.Announcement],
    }),

    addAnnouncementCommentReaction: builder.mutation<any, { commentId: number; emoji: string }>({
      query: ({ commentId, emoji }) => ({
        url: `/announcements/comments/${commentId}/emotions`,
        method: 'POST',
        body: { emoji },
      }),
      invalidatesTags: [TagType.Announcement],
    }),

    // Announcement endpoints
    getAnnouncements: builder.query<any[], { skip?: number; limit?: number; complexId?: number }>({
      query: ({ skip = 0, limit = 50, complexId } = {}) => {
        const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
        if (complexId) params.append('complex_id', String(complexId));
        return `/announcements?${params.toString()}`;
      },
      providesTags: [TagType.Announcement],
      serializeQueryArgs: ({ queryArgs }) => {
        return { complexId: queryArgs.complexId };
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg?.skip === 0) {
          return newItems;
        }
        const existingIds = new Set(currentCache.map((item: any) => item.id));
        const merged = [...currentCache];
        newItems.forEach((item: any) => {
          if (!existingIds.has(item.id)) {
            merged.push(item);
          }
        });
        return merged;
      },
      forceRefetch: ({ currentArg, previousArg }) => {
        return currentArg?.skip !== previousArg?.skip;
      },
    }),

    // Issue endpoints
    getIssueCategories: builder.query<any[], { complexId?: number; skip?: number; limit?: number }>({
      query: ({ complexId, skip = 0, limit = 100 } = {}) => {
        const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
        if (complexId) params.append('complex_id', String(complexId));
        return `/issue-categories?${params.toString()}`;
      },
      providesTags: [TagType.IssueCategory],
    }),

    getIssues: builder.query<any[], { complexId?: number; skip?: number; limit?: number }>({
      query: ({ complexId, skip = 0, limit = 20 } = {}) => {
        const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
        if (complexId) params.append('complex_id', String(complexId));
        return `/issues?${params.toString()}`;
      },
      providesTags: [TagType.Issue],
      serializeQueryArgs: ({ queryArgs }) => {
        return { complexId: queryArgs.complexId };
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg?.skip === 0) {
          return newItems;
        }
        const existingIds = new Set(currentCache.map((item: any) => item.id));
        const merged = [...currentCache];
        newItems.forEach((item: any) => {
          if (!existingIds.has(item.id)) {
            merged.push(item);
          }
        });
        return merged;
      },
      forceRefetch: ({ currentArg, previousArg }) => {
        return currentArg?.skip !== previousArg?.skip;
      },
    }),

    createIssue: builder.mutation<any, any>({
      query: (issue) => ({
        url: '/issues',
        method: 'POST',
        body: issue,
      }),
      invalidatesTags: [TagType.Issue],
    }),

    // Reservation endpoints
    getReservationCategories: builder.query<any[], { complexId?: number; skip?: number; limit?: number }>({
      query: ({ complexId, skip = 0, limit = 100 } = {}) => {
        const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
        if (complexId) params.append('complex_id', String(complexId));
        return `/reservation-categories?${params.toString()}`;
      },
      providesTags: [TagType.ReservationCategory],
    }),

    getReservations: builder.query<any[], { complexId?: number; date?: string; status?: string; skip?: number; limit?: number }>({
      query: ({ complexId, date, status, skip = 0, limit = 100 } = {}) => {
        const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
        if (complexId) params.append('complex_id', String(complexId));
        if (date) params.append('date', date);
        if (status) params.append('status', status);
        return `/reservations?${params.toString()}`;
      },
      providesTags: [TagType.Reservation],
    }),

    createReservation: builder.mutation<any, any>({
      query: (reservation) => ({
        url: '/reservations',
        method: 'POST',
        body: reservation,
      }),
      invalidatesTags: [TagType.Reservation],
    }),

    // Visitor endpoints
    getVisitors: builder.query<any[], { complexId?: number; visitDate?: string }>({
      query: ({ complexId, visitDate } = {}) => {
        if (complexId && visitDate) {
          return `/visitors/admin/list?complex_id=${complexId}&visit_date=${visitDate}`;
        } else if (complexId) {
          return `/visitors/admin/list?complex_id=${complexId}`;
        }
        return '/visitors';
      },
      providesTags: [TagType.Visitor],
    }),

    createVisitor: builder.mutation<any, any>({
      query: (visitor) => ({
        url: '/visitors',
        method: 'POST',
        body: visitor,
      }),
      invalidatesTags: [TagType.Visitor],
    }),

    // Vehicle endpoints
    getVehicles: builder.query<any[], { userId?: number; skip?: number; limit?: number }>({
      query: ({ userId, skip = 0, limit = 100 } = {}) => {
        const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
        if (userId) params.append('user_id', String(userId));
        return `/vehicles?${params.toString()}`;
      },
      providesTags: [TagType.Vehicle],
    }),

    createVehicle: builder.mutation<any, any>({
      query: (vehicle) => ({
        url: '/vehicles',
        method: 'POST',
        body: vehicle,
      }),
      invalidatesTags: [TagType.Vehicle],
    }),

    // Marketplace endpoints
    getMarketplaceCategories: builder.query<any[], { complexId?: number; skip?: number; limit?: number }>({
      query: ({ complexId, skip = 0, limit = 100 } = {}) => {
        const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
        if (complexId) params.append('complex_id', String(complexId));
        return `/marketplace-categories?${params.toString()}`;
      },
      providesTags: [TagType.MarketplaceCategory],
    }),

    getMarketplaceItems: builder.query<any[], { complexId?: number; categoryId?: number; status?: string; skip?: number; limit?: number }>({
      query: ({ complexId, categoryId, status, skip = 0, limit = 100 } = {}) => {
        const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
        if (complexId) params.append('complex_id', String(complexId));
        if (categoryId) params.append('category_id', String(categoryId));
        if (status) params.append('status', status);
        return `/marketplace-items?${params.toString()}`;
      },
      providesTags: [TagType.Marketplace],
    }),

    createMarketplaceItem: builder.mutation<any, any>({
      query: (item) => ({
        url: '/marketplace-items',
        method: 'POST',
        body: item,
      }),
      invalidatesTags: [TagType.Marketplace],
    }),

    // Payment endpoints
    getPayments: builder.query<any[], { complexId?: number; skip?: number; limit?: number }>({
      query: ({ complexId, skip = 0, limit = 50 } = {}) => {
        const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
        if (complexId) params.append('complex_id', String(complexId));
        return `/payments?${params.toString()}`;
      },
      providesTags: [TagType.Payment],
    }),

    // Get current user's payment records
    getMyUnitPayments: builder.query<any[], { skip?: number; limit?: number }>({
      query: ({ skip = 0, limit = 50 } = {}) => {
        const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
        return `/payments/my/unit-payments?${params.toString()}`;
      },
      providesTags: [TagType.Payment],
    }),

    // Generate QR payment payload
    generateQrPayment: builder.mutation<any, { paymentRecordId: number }>({
      query: ({ paymentRecordId }) => ({
        url: `/payments/my/qr-payment?payment_record_id=${paymentRecordId}`,
        method: 'POST',
      }),
      invalidatesTags: [TagType.Payment],
    }),

    // Notification endpoints
    getMyNotifications: builder.query<any[], { skip?: number; limit?: number; unreadOnly?: boolean }>({
      query: ({ skip = 0, limit = 20, unreadOnly = false } = {}) => {
        const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
        if (unreadOnly) params.append('unread_only', 'true');
        return `/notifications?${params.toString()}`;
      },
      providesTags: ['Notification'],
    }),

    markNotificationRead: builder.mutation<void, number>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notification'],
    }),

    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PUT',
      }),
      invalidatesTags: ['Notification'],
    }),

    getNotificationPreferences: builder.query<any, void>({
      query: () => '/notifications/preferences',
      providesTags: ['Notification'],
    }),

    updateNotificationPreferences: builder.mutation<any, Record<string, any>>({
      query: (preferences) => ({
        url: '/notifications/preferences',
        method: 'PUT',
        body: preferences,
      }),
      invalidatesTags: ['Notification'],
    }),

    // Check overlap stats for reservations
    getReservationOverlapStats: builder.query<any, { categoryId: number; date: string; startHour: string; endHour: string }>({
      query: ({ categoryId, date, startHour, endHour }) =>
        `/reservations/overlap-stats?category_id=${categoryId}&date=${date}&start_hour=${startHour}&end_hour=${endHour}`,
      providesTags: [TagType.Reservation],
    }),
  }),
});

// Export hooks
export const {
  useLoginMutation,
  useRefreshTokenMutation,
  useGetCurrentUserQuery,
  useGetComplexesQuery,
  useGetComplexByIdQuery,
  useGetBuildingsQuery,
  useGetAnnouncementsQuery,
  useGetIssueCategoriesQuery,
  useGetIssuesQuery,
  useCreateIssueMutation,
  useCreateAnnouncementCommentMutation,
  useAddAnnouncementCommentReactionMutation,
  useGetReservationCategoriesQuery,
  useGetReservationsQuery,
  useCreateReservationMutation,
  useGetVisitorsQuery,
  useCreateVisitorMutation,
  useGetVehiclesQuery,
  useCreateVehicleMutation,
  useGetMarketplaceCategoriesQuery,
  useGetMarketplaceItemsQuery,
  useCreateMarketplaceItemMutation,
  useGetPaymentsQuery,
  useGetMyUnitPaymentsQuery,
  useGenerateQrPaymentMutation,
  useGetMyNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
  useGetReservationOverlapStatsQuery,
} = enhancedApi;

export default apiSlice;
