'use client';

import { useState } from 'react';
import { Modal, Spinner, Button } from '../atoms';
import { Building, Complex, User } from '../../types';

interface BuildingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  building: Building | null;
  complex?: Complex;
  users: User[];
  isLoading: boolean;
  onAssignUser?: (userId: number) => void;
}

const BuildingDetailModal: React.FC<BuildingDetailModalProps> = ({
  isOpen,
  onClose,
  building,
  complex,
  users,
  isLoading,
  onAssignUser,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  if (!building) return null;

  const handleAssign = () => {
    if (selectedUserId && onAssignUser) {
      onAssignUser(Number(selectedUserId));
      setSelectedUserId('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={building.name}
      size="lg"
    >
      <div className="space-y-6">
        {/* Building Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Building Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">ID</p>
              <p className="font-medium">{building.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Complex</p>
              <p className="font-medium">{complex?.name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created Date</p>
              <p className="font-medium">
                {new Date(building.created_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-medium">
                {building.updated_date
                  ? new Date(building.updated_date).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Assign User Section */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-500 mb-3">Assign User to Building</h4>
          <div className="flex gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a user to assign</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.email}) - {user.role}
                </option>
              ))}
            </select>
            <Button
              onClick={handleAssign}
              disabled={!selectedUserId}
              variant="primary"
            >
              Assign
            </Button>
          </div>
        </div>

        {/* Users Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3">
            Assigned Users ({users?.length || 0})
          </h4>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : users && users.length > 0 ? (
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-200">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{user.username}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {user.role}
                    </span>
                    {user.is_active ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              No users assigned to this building
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default BuildingDetailModal;
