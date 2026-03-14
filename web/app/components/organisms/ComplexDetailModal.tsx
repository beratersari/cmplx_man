'use client';

import { Modal, Spinner } from '../atoms';
import { useGetComplexUsersQuery } from '../../store/apiSlice';
import { Complex } from '../../types';
import { useTranslation } from '../../locales';

interface ComplexDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  complex: Complex | null;
}

const ComplexDetailModal: React.FC<ComplexDetailModalProps> = ({
  isOpen,
  onClose,
  complex,
}) => {
  const { t } = useTranslation();
  const { data: users, isLoading } = useGetComplexUsersQuery(
    { complexId: complex?.id || 0 },
    { skip: !complex?.id }
  );

  if (!complex) return null;

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-800',
    SITE_MANAGER: 'bg-blue-100 text-blue-800',
    SITE_ATTENDANT: 'bg-green-100 text-green-800',
    RESIDENT: 'bg-gray-100 text-gray-800',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={complex.name}
      size="lg"
    >
      <div className="space-y-6">
        {/* Complex Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">{t('complexes.details') || 'Complex Details'}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">ID</p>
              <p className="font-medium">{complex.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('common.address')}</p>
              <p className="font-medium">{complex.address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('common.created')}</p>
              <p className="font-medium">
                {new Date(complex.created_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('common.lastUpdated')}</p>
              <p className="font-medium">
                {complex.updated_date
                  ? new Date(complex.updated_date).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Users Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3">
            {t('modals.building.assignedUsers')} ({users?.length || 0})
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
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        roleColors[user.role] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {t(`users.roles.${user.role}`) || user.role}
                    </span>
                    {user.is_active ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {t('common.active') || 'Active'}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        {t('common.inactive') || 'Inactive'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              {t('complexes.noAssignedUsers') || 'No users assigned to this complex'}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ComplexDetailModal;
