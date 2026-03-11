import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Complex, ComplexCreate, ComplexUpdate, Building, BuildingCreate, BuildingUpdate, User, AdminComplexAssignment, IssueStatusSummary, VisitorCountByBuilding, VehicleStats, PaymentStatsByBuilding, Announcement, AnnouncementCreate, AnnouncementUpdate, AnnouncementEmotion, Comment } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any).auth?.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Complex', 'Building', 'Announcement', 'Issue', 'Reservation', 'Payment', 'Visitor', 'Vehicle'],
  endpoints: () => ({}),
});

// Export enhanced api with auth and dashboard endpoints
export const enhancedApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation({
      query: (credentials: { username: string; password: string }) => ({
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
    }),

    // Dashboard endpoints
    getComplexes: builder.query<Complex[], { skip?: number; limit?: number }>({
      query: ({ skip = 0, limit = 50 } = {}) => `/complexes?skip=${skip}&limit=${limit}`,
      providesTags: ['Complex'],
    }),

    getIssueStatusSummary: builder.query<IssueStatusSummary, number>({
      query: (complexId) => `/issues/stats/status/admin?complex_id=${complexId}`,
      providesTags: ['Issue'],
    }),

    getVisitorStatsByBuilding: builder.query<VisitorCountByBuilding[], number>({
      query: (complexId) => `/visitors/stats/by-building/admin?complex_id=${complexId}`,
      providesTags: ['Visitor'],
    }),

    getVehicleStats: builder.query<VehicleStats, number>({
      query: (complexId) => `/vehicles/stats/admin?complex_id=${complexId}`,
      providesTags: ['Vehicle'],
    }),

    getPaymentStatsByBuilding: builder.query<PaymentStatsByBuilding[], number>({
      query: (complexId) => `/payments/admin/stats/by-building?complex_id=${complexId}`,
      providesTags: ['Payment'],
    }),

    // Complex CRUD endpoints
    createComplex: builder.mutation<Complex, ComplexCreate>({
      query: (complex) => ({
        url: '/complexes',
        method: 'POST',
        body: complex,
      }),
      invalidatesTags: ['Complex'],
    }),

    getComplexById: builder.query<Complex, number>({
      query: (id) => `/complexes/${id}`,
      providesTags: (_, __, id) => [{ type: 'Complex', id }],
    }),

    updateComplex: builder.mutation<Complex, { id: number; data: ComplexUpdate }>({
      query: ({ id, data }) => ({
        url: `/complexes/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Complex', id }, 'Complex'],
    }),

    deleteComplex: builder.mutation<void, number>({
      query: (id) => ({
        url: `/complexes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Complex'],
    }),

    // Complex users endpoint
    getComplexUsers: builder.query<User[], { complexId: number; skip?: number; limit?: number }>({
      query: ({ complexId, skip = 0, limit = 50 }) => 
        `/complexes/${complexId}/users?skip=${skip}&limit=${limit}`,
      providesTags: (_, __, { complexId }) => [{ type: 'User', id: `complex-${complexId}` }],
    }),

    // Admin assign user to complex
    assignUserToComplex: builder.mutation<void, AdminComplexAssignment>({
      query: (assignment) => ({
        url: '/complexes/assign/admin',
        method: 'POST',
        body: assignment,
      }),
      invalidatesTags: ['User', 'Complex'],
    }),

    // Users list for assignment dropdown
    getUsers: builder.query<User[], { skip?: number; limit?: number }>({
      query: ({ skip = 0, limit = 100 } = {}) => `/users?skip=${skip}&limit=${limit}`,
      providesTags: ['User'],
    }),

    // Building endpoints
    getBuildings: builder.query<Building[], { complexId?: number; skip?: number; limit?: number }>({
      query: ({ complexId, skip = 0, limit = 50 } = {}) => {
        const params = new URLSearchParams({
          skip: String(skip),
          limit: String(limit),
        });
        if (complexId) {
          params.append('complex_id', String(complexId));
        }
        return `/buildings?${params.toString()}`;
      },
      providesTags: ['Building'],
    }),

    createBuilding: builder.mutation<Building, BuildingCreate>({
      query: (building) => ({
        url: '/buildings/admin',
        method: 'POST',
        body: building,
      }),
      invalidatesTags: ['Building'],
    }),

    updateBuilding: builder.mutation<Building, { id: number; data: BuildingUpdate }>({
      query: ({ id, data }) => ({
        url: `/buildings/admin/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Building', id }, 'Building'],
    }),

    deleteBuilding: builder.mutation<void, number>({
      query: (id) => ({
        url: `/buildings/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Building'],
    }),

    // Announcement endpoints
    getAnnouncements: builder.query<Announcement[], { skip?: number; limit?: number; complexId?: number }>({
      query: ({ skip = 0, limit = 50, complexId } = {}) => {
        const params = new URLSearchParams({
          skip: String(skip),
          limit: String(limit),
        });
        if (complexId) {
          params.append('complex_id', String(complexId));
        }
        return `/announcements?${params.toString()}`;
      },
      providesTags: ['Announcement'],
    }),

    getAnnouncementById: builder.query<Announcement, number>({
      query: (id) => `/announcements/${id}`,
      providesTags: (_, __, id) => [{ type: 'Announcement', id }],
    }),

    createAnnouncement: builder.mutation<Announcement, AnnouncementCreate>({
      query: (announcement) => ({
        url: '/announcements/admin',
        method: 'POST',
        body: announcement,
      }),
      invalidatesTags: ['Announcement'],
    }),

    updateAnnouncement: builder.mutation<Announcement, { id: number; data: AnnouncementUpdate }>({
      query: ({ id, data }) => ({
        url: `/announcements/admin/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Announcement', id }, 'Announcement'],
    }),

    deleteAnnouncement: builder.mutation<void, number>({
      query: (id) => ({
        url: `/announcements/admin/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Announcement'],
    }),

    getAnnouncementEmotions: builder.query<AnnouncementEmotion[], number>({
      query: (announcementId) => `/announcements/${announcementId}/emotions`,
      providesTags: (_, __, id) => [{ type: 'Announcement', id }],
    }),

    addAnnouncementEmotion: builder.mutation<AnnouncementEmotion, { announcementId: number; emoji: string }>({
      query: ({ announcementId, emoji }) => ({
        url: `/announcements/${announcementId}/emotions`,
        method: 'POST',
        body: { emoji },
      }),
      invalidatesTags: (_, __, { announcementId }) => [{ type: 'Announcement', id: announcementId }],
    }),

    getAnnouncementComments: builder.query<Comment[], number>({
      query: (announcementId) => `/announcements/${announcementId}/comments`,
      providesTags: (_, __, id) => [{ type: 'Announcement', id }],
    }),

    addAnnouncementComment: builder.mutation<Comment, { announcementId: number; content: string; parentId?: number }>({
      query: ({ announcementId, content, parentId }) => ({
        url: `/announcements/${announcementId}/comments`,
        method: 'POST',
        body: { content, parent_id: parentId },
      }),
      invalidatesTags: (_, __, { announcementId }) => [{ type: 'Announcement', id: announcementId }],
    }),
  }),
});

export const { 
  useLoginMutation,
  useGetComplexesQuery,
  useGetIssueStatusSummaryQuery,
  useGetVisitorStatsByBuildingQuery,
  useGetVehicleStatsQuery,
  useGetPaymentStatsByBuildingQuery,
  useCreateComplexMutation,
  useGetComplexByIdQuery,
  useUpdateComplexMutation,
  useDeleteComplexMutation,
  useGetComplexUsersQuery,
  useAssignUserToComplexMutation,
  useGetUsersQuery,
  useGetBuildingsQuery,
  useCreateBuildingMutation,
  useUpdateBuildingMutation,
  useDeleteBuildingMutation,
  useGetAnnouncementsQuery,
  useGetAnnouncementByIdQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useGetAnnouncementEmotionsQuery,
  useAddAnnouncementEmotionMutation,
  useGetAnnouncementCommentsQuery,
  useAddAnnouncementCommentMutation,
} = enhancedApi;
