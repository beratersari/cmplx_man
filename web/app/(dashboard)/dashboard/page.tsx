'use client';

import { useState } from 'react';
import DashboardTemplate from '../../components/templates/DashboardTemplate';
import { ComplexManagement, BuildingManagement, UserManagement, AnnouncementManagement, VisitorManagement, VehicleManagement, IssueCategoryManagement, IssueManagement, ReservationCategoryManagement, ReservationManagement } from '../../components/organisms';
import { SummaryCard } from '../../components/atoms';
import { Spinner } from '../../components/atoms';
import {
  useGetComplexesQuery,
  useGetIssueStatusSummaryQuery,
  useGetVisitorStatsByBuildingQuery,
  useGetVehicleStatsQuery,
  useGetPaymentStatsByBuildingQuery,
  useGetUsersQuery,
  useGetAnnouncementsQuery,
} from '../../store/apiSlice';

// Icons for the summary cards
const ComplexesIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const IssuesIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const VisitorsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const VehiclesIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const PaymentsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface MainTabContentProps {
  onNavigateToUsers?: () => void;
  onNavigateToAnnouncements?: () => void;
}

const MainTabContent: React.FC<MainTabContentProps> = ({ onNavigateToUsers, onNavigateToAnnouncements }) => {
  // TODO: Implement complex selection dropdown to allow admin to select which complex to view stats for
  // For now, we'll use the first complex from the list
  const { data: complexes, isLoading: complexesLoading } = useGetComplexesQuery({});
  
  // Get the first complex ID for stats queries
  const firstComplexId = complexes?.[0]?.id;
  
  // Fetch stats for the selected complex
  // TODO: These queries should be conditional based on complex selection
  const { data: issueStats, isLoading: issuesLoading } = useGetIssueStatusSummaryQuery(firstComplexId!, {
    skip: !firstComplexId,
  });
  const { data: visitorStats, isLoading: visitorsLoading } = useGetVisitorStatsByBuildingQuery(firstComplexId!, {
    skip: !firstComplexId,
  });
  const { data: vehicleStats, isLoading: vehiclesLoading } = useGetVehicleStatsQuery(firstComplexId!, {
    skip: !firstComplexId,
  });
  const { data: paymentStats, isLoading: paymentsLoading } = useGetPaymentStatsByBuildingQuery(firstComplexId!, {
    skip: !firstComplexId,
  });
  const { data: users, isLoading: usersLoading } = useGetUsersQuery({});
  const { data: announcements, isLoading: announcementsLoading } = useGetAnnouncementsQuery({ limit: 10 });

  // Calculate totals from the stats
  // TODO: Implement proper data aggregation based on selected complex
  const totalVisitors = visitorStats?.reduce((sum, b) => sum + b.visitor_count, 0) || 0;
  const totalVehicles = vehicleStats?.total_vehicles || 0;
  const outstandingIssues = issueStats ? issueStats.open + issueStats.in_progress : 0;
  const totalPendingPayments = paymentStats?.reduce((sum, b) => sum + b.pending_count, 0) || 0;
  const pendingAmount = paymentStats?.reduce((sum, b) => sum + b.pending_amount, 0) || 0;
  const totalUsers = users?.length || 0;

  // Get last 3 announcements
  const recentAnnouncements = announcements?.slice(0, 3) || [];

  const isLoading = complexesLoading || issuesLoading || visitorsLoading || vehiclesLoading || paymentsLoading || usersLoading || announcementsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Main Dashboard</h2>
        <p className="text-gray-600 mt-1">
          Welcome to the apartment management admin panel. Here you can view overall statistics and manage your properties.
        </p>
      </div>

      {/* TODO: Add complex selector dropdown here */}
      {/* TODO: Implement complex selection UI with dropdown to filter stats by complex */}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Complexes Count Card */}
          {/* TODO: Integrate with complex management CRUD flow - link to complex list page */}
          <SummaryCard
            title="Total Complexes"
            value={complexes?.length || 0}
            subtitle="Active residential complexes"
            icon={<ComplexesIcon />}
            color="blue"
          />

          {/* Outstanding Issues Card */}
          {/* TODO: Integrate with issues management CRUD flow - link to issues list page */}
          <SummaryCard
            title="Outstanding Issues"
            value={outstandingIssues}
            subtitle={`${issueStats?.open || 0} open, ${issueStats?.in_progress || 0} in progress`}
            icon={<IssuesIcon />}
            color="orange"
          />

          {/* Visitor Statistics Card */}
          {/* TODO: Integrate with visitors management CRUD flow - link to visitors list page */}
          <SummaryCard
            title="Total Visitors"
            value={totalVisitors}
            subtitle="Recent visitor registrations"
            icon={<VisitorsIcon />}
            color="purple"
          />

          {/* Vehicle Statistics Card */}
          {/* TODO: Integrate with vehicles management CRUD flow - link to vehicles list page */}
          <SummaryCard
            title="Registered Vehicles"
            value={totalVehicles}
            subtitle="Total vehicles in complex"
            icon={<VehiclesIcon />}
            color="teal"
          />

          {/* Payments Overview Card */}
          {/* TODO: Integrate with payments management CRUD flow - link to payments list page */}
          <SummaryCard
            title="Pending Payments"
            value={totalPendingPayments}
            subtitle={`$${pendingAmount.toFixed(2)} pending`}
            icon={<PaymentsIcon />}
            color="red"
          />

          {/* Total Users Card - Clickable */}
          <div 
            onClick={onNavigateToUsers}
            className="cursor-pointer transition-transform hover:scale-105"
            role="button"
            tabIndex={0}
          >
            <SummaryCard
              title="Total Users"
              value={totalUsers}
              subtitle="Click to manage users"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              }
              color="green"
            />
          </div>
        </div>
      )}

      {/* TODO: Add recent activity section */}
      {/* TODO: Add quick actions section for common admin tasks */}

      {/* Recent Announcements Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Announcements</h3>
          <button
            onClick={onNavigateToAnnouncements}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View All →
          </button>
        </div>
        
        {announcementsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : recentAnnouncements.length > 0 ? (
          <div className="space-y-4">
            {recentAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                onClick={onNavigateToAnnouncements}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-4">
                  {announcement.img_path && (
                    <img
                      src={announcement.img_path}
                      alt={announcement.title}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{announcement.title}</h4>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{announcement.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <span>{new Date(announcement.created_date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{announcement.comments_enabled ? 'Comments enabled' : 'Comments disabled'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            No announcements yet
          </div>
        )}
      </div>
    </div>
  );
};

const ComplexManagementContent = () => <ComplexManagement />;

const BuildingManagementContent = () => <BuildingManagement />;

const UserManagementContent = () => <UserManagement />;

const AnnouncementManagementContent = () => <AnnouncementManagement />;

const VisitorManagementContent = () => <VisitorManagement />;

const VehicleManagementContent = () => <VehicleManagement />;

const IssueCategoryManagementContent = () => <IssueCategoryManagement />;

const IssueManagementContent = () => <IssueManagement />;

const ReservationCategoryManagementContent = () => <ReservationCategoryManagement />;

const ReservationManagementContent = () => <ReservationManagement />;

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('main');

  const dashboardTabs = [
    { id: 'main', label: 'Main', content: <MainTabContent onNavigateToUsers={() => setActiveTab('users')} onNavigateToAnnouncements={() => setActiveTab('announcements')} /> },
    { id: 'complexes', label: 'Complex Management', content: <ComplexManagementContent /> },
    { id: 'buildings', label: 'Building Management', content: <BuildingManagementContent /> },
    { id: 'users', label: 'User Management', content: <UserManagementContent /> },
    { id: 'announcements', label: 'Announcements', content: <AnnouncementManagementContent /> },
    { id: 'visitors', label: 'Visitor Registry', content: <VisitorManagementContent /> },
    { id: 'vehicles', label: 'Vehicles', content: <VehicleManagementContent /> },
    { id: 'issue-categories', label: 'Issue Categories', content: <IssueCategoryManagementContent /> },
    { id: 'issues', label: 'Issues', content: <IssueManagementContent /> },
    { id: 'reservation-categories', label: 'Reservation Categories', content: <ReservationCategoryManagementContent /> },
    { id: 'reservations', label: 'Reservations', content: <ReservationManagementContent /> },
  ];

  const activeTabContent = dashboardTabs.find(tab => tab.id === activeTab)?.content || dashboardTabs[0].content;

  return (
    <DashboardTemplate 
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {activeTabContent}
    </DashboardTemplate>
  );
}
