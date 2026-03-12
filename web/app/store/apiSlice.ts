import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Complex, ComplexCreate, ComplexUpdate, Building, BuildingCreate, BuildingUpdate, User, AdminComplexAssignment, IssueStatusSummary, VisitorCountByBuilding, VehicleStats, PaymentStatsByBuilding, Announcement, AnnouncementCreate, AnnouncementUpdate, AnnouncementEmotion, Comment, Visitor, VisitorCreate, VisitorUpdate, VisitorStatusUpdate, Vehicle, VehicleCreate, VehicleUpdate, Issue, IssueCreate, AdminIssueCreate, IssueUpdate, IssueCategory, IssueCategoryCreate, AdminIssueCategoryCreate, IssueCategoryUpdate, IssueCountByCategory, ReservationCategory, ReservationCategoryCreate, AdminReservationCategoryCreate, ReservationCategoryUpdate, Reservation, ReservationCreate, AdminReservationCreate, ReservationUpdate, ReservationStatusUpdate, ReservationOverlapStats, ReservationOverlapStatsById } from '../types';

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

    // Visitor endpoints
    getVisitors: builder.query<Visitor[], { complexId?: number; visitDate?: string }>({
      query: ({ complexId, visitDate } = {}) => {
        if (complexId && visitDate) {
          return `/visitors/admin/list?complex_id=${complexId}&visit_date=${visitDate}`;
        } else if (complexId) {
          return `/visitors/admin/list?complex_id=${complexId}`;
        }
        return '/visitors';
      },
      providesTags: ['Visitor'],
    }),

    createVisitor: builder.mutation<Visitor, { name: string; plate_number?: string; complex_id?: number }>({
      query: (visitor) => ({
        url: '/visitors',
        method: 'POST',
        body: visitor,
      }),
      invalidatesTags: ['Visitor'],
    }),

    updateVisitor: builder.mutation<Visitor, { id: number; data: VisitorUpdate }>({
      query: ({ id, data }) => ({
        url: `/visitors/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Visitor', id }, 'Visitor'],
    }),

    updateVisitorStatus: builder.mutation<Visitor, { id: number; data: VisitorStatusUpdate }>({
      query: ({ id, data }) => ({
        url: `/visitors/${id}/status`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Visitor', id }, 'Visitor'],
    }),

    deleteVisitor: builder.mutation<void, number>({
      query: (id) => ({
        url: `/visitors/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Visitor'],
    }),

    // Vehicle endpoints
    getVehicles: builder.query<Vehicle[], { userId?: number; skip?: number; limit?: number }>({
      query: ({ userId, skip = 0, limit = 100 } = {}) => {
        const params = new URLSearchParams({
          skip: String(skip),
          limit: String(limit),
        });
        if (userId) {
          params.append('user_id', String(userId));
        }
        return `/vehicles?${params.toString()}`;
      },
      providesTags: ['Vehicle'],
    }),

    createVehicle: builder.mutation<Vehicle, VehicleCreate>({
      query: (vehicle) => ({
        url: '/vehicles',
        method: 'POST',
        body: vehicle,
      }),
      invalidatesTags: ['Vehicle'],
    }),

    updateVehicle: builder.mutation<Vehicle, { id: number; data: VehicleUpdate }>({
      query: ({ id, data }) => ({
        url: `/vehicles/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Vehicle', id }, 'Vehicle'],
    }),

    deleteVehicle: builder.mutation<void, number>({
      query: (id) => ({
        url: `/vehicles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Vehicle'],
    }),

    // Issue Category endpoints
    getIssueCategories: builder.query<IssueCategory[], { complexId?: number; skip?: number; limit?: number }>({
      query: ({ complexId, skip = 0, limit = 100 } = {}) => {
        const params = new URLSearchParams({
          skip: String(skip),
          limit: String(limit),
        });
        if (complexId) {
          params.append('complex_id', String(complexId));
        }
        return `/issue-categories?${params.toString()}`;
      },
      providesTags: ['Issue'],
    }),

    createIssueCategory: builder.mutation<IssueCategory, IssueCategoryCreate>({
      query: (category) => ({
        url: '/issue-categories',
        method: 'POST',
        body: category,
      }),
      invalidatesTags: ['Issue'],
    }),

    adminCreateIssueCategory: builder.mutation<IssueCategory, AdminIssueCategoryCreate>({
      query: (category) => ({
        url: '/issue-categories/admin',
        method: 'POST',
        body: category,
      }),
      invalidatesTags: ['Issue'],
    }),

    adminUpdateIssueCategory: builder.mutation<IssueCategory, { id: number; data: AdminIssueCategoryCreate }>({
      query: ({ id, data }) => ({
        url: `/issue-categories/admin/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Issue', id }, 'Issue'],
    }),

    deleteIssueCategory: builder.mutation<void, number>({
      query: (id) => ({
        url: `/issue-categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Issue'],
    }),

    // Issue endpoints
    getIssues: builder.query<Issue[], { complexId?: number; skip?: number; limit?: number }>({
      query: ({ complexId, skip = 0, limit = 100 } = {}) => {
        const params = new URLSearchParams({
          skip: String(skip),
          limit: String(limit),
        });
        if (complexId) {
          params.append('complex_id', String(complexId));
        }
        return `/issues?${params.toString()}`;
      },
      providesTags: ['Issue'],
    }),

    adminCreateIssue: builder.mutation<Issue, AdminIssueCreate>({
      query: (issue) => ({
        url: '/issues/admin',
        method: 'POST',
        body: issue,
      }),
      invalidatesTags: ['Issue'],
    }),

    updateIssue: builder.mutation<Issue, { id: number; data: IssueUpdate }>({
      query: ({ id, data }) => ({
        url: `/issues/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Issue', id }, 'Issue'],
    }),

    deleteIssue: builder.mutation<void, number>({
      query: (id) => ({
        url: `/issues/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Issue'],
    }),

    getIssueCountsByCategory: builder.query<IssueCountByCategory[], number>({
      query: (complexId) => `/issues/stats/by-category/admin?complex_id=${complexId}`,
      providesTags: ['Issue'],
    }),

    // Reservation Category endpoints
    getReservationCategories: builder.query<ReservationCategory[], { complexId?: number; skip?: number; limit?: number }>({
      query: ({ complexId, skip = 0, limit = 100 } = {}) => {
        const params = new URLSearchParams({
          skip: String(skip),
          limit: String(limit),
        });
        if (complexId) {
          params.append('complex_id', String(complexId));
        }
        return `/reservation-categories?${params.toString()}`;
      },
      providesTags: ['Reservation'],
    }),

    createReservationCategory: builder.mutation<ReservationCategory, ReservationCategoryCreate>({
      query: (category) => ({
        url: '/reservation-categories',
        method: 'POST',
        body: category,
      }),
      invalidatesTags: ['Reservation'],
    }),

    adminCreateReservationCategory: builder.mutation<ReservationCategory, AdminReservationCategoryCreate>({
      query: (category) => ({
        url: '/reservation-categories/admin',
        method: 'POST',
        body: category,
      }),
      invalidatesTags: ['Reservation'],
    }),

    adminUpdateReservationCategory: builder.mutation<ReservationCategory, { id: number; data: AdminReservationCategoryCreate }>({
      query: ({ id, data }) => ({
        url: `/reservation-categories/admin/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Reservation', id }, 'Reservation'],
    }),

    deleteReservationCategory: builder.mutation<void, number>({
      query: (id) => ({
        url: `/reservation-categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Reservation'],
    }),

    // Reservation endpoints
    getReservations: builder.query<Reservation[], { complexId?: number; date?: string; status?: string; skip?: number; limit?: number }>({
      query: ({ complexId, date, status, skip = 0, limit = 100 } = {}) => {
        const params = new URLSearchParams({
          skip: String(skip),
          limit: String(limit),
        });
        if (complexId) {
          params.append('complex_id', String(complexId));
        }
        if (date) {
          params.append('date', date);
        }
        if (status) {
          params.append('status', status);
        }
        return `/reservations?${params.toString()}`;
      },
      providesTags: ['Reservation'],
    }),

    adminCreateReservation: builder.mutation<Reservation, AdminReservationCreate>({
      query: (reservation) => ({
        url: '/reservations/admin',
        method: 'POST',
        body: reservation,
      }),
      invalidatesTags: ['Reservation'],
    }),

    updateReservation: builder.mutation<Reservation, { id: number; data: ReservationUpdate }>({
      query: ({ id, data }) => ({
        url: `/reservations/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Reservation', id }, 'Reservation'],
    }),

    updateReservationStatus: builder.mutation<Reservation, { id: number; data: ReservationStatusUpdate }>({
      query: ({ id, data }) => ({
        url: `/reservations/${id}/status`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Reservation', id }, 'Reservation'],
    }),

    deleteReservation: builder.mutation<void, number>({
      query: (id) => ({
        url: `/reservations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Reservation'],
    }),

    getReservationOverlapStats: builder.query<ReservationOverlapStats, { categoryId: number; date: string; startHour: string; endHour: string }>({
      query: ({ categoryId, date, startHour, endHour }) =>
        `/reservations/overlap-stats?category_id=${categoryId}&date=${date}&start_hour=${startHour}&end_hour=${endHour}`,
      providesTags: ['Reservation'],
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
  useGetVisitorsQuery,
  useCreateVisitorMutation,
  useUpdateVisitorMutation,
  useUpdateVisitorStatusMutation,
  useDeleteVisitorMutation,
  useGetVehiclesQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useDeleteVehicleMutation,
  useGetIssueCategoriesQuery,
  useCreateIssueCategoryMutation,
  useAdminCreateIssueCategoryMutation,
  useAdminUpdateIssueCategoryMutation,
  useDeleteIssueCategoryMutation,
  useGetIssuesQuery,
  useAdminCreateIssueMutation,
  useUpdateIssueMutation,
  useDeleteIssueMutation,
  useGetIssueCountsByCategoryQuery,
  useGetReservationCategoriesQuery,
  useCreateReservationCategoryMutation,
  useAdminCreateReservationCategoryMutation,
  useAdminUpdateReservationCategoryMutation,
  useDeleteReservationCategoryMutation,
  useGetReservationsQuery,
  useAdminCreateReservationMutation,
  useUpdateReservationMutation,
  useUpdateReservationStatusMutation,
  useDeleteReservationMutation,
  useGetReservationOverlapStatsQuery,
} = enhancedApi;
