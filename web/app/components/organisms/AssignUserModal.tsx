'use client';

import { useState } from 'react';
import { Modal, Button, Alert } from '../atoms';
import { useAssignUserToComplexMutation, useGetUsersQuery } from '../../store/apiSlice';

interface AssignUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  complexId: number;
  complexName: string;
}

const AssignUserModal: React.FC<AssignUserModalProps> = ({
  isOpen,
  onClose,
  complexId,
  complexName,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: users, isLoading: usersLoading } = useGetUsersQuery({});
  const [assignUser, { isLoading: isAssigning }] = useAssignUserToComplexMutation();

  const handleAssign = async () => {
    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }

    try {
      setError(null);
      await assignUser({
        user_id: Number(selectedUserId),
        complex_id: complexId,
      }).unwrap();
      setSuccess('User assigned successfully!');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.data?.detail || 'Failed to assign user');
    }
  };

  const handleClose = () => {
    setSelectedUserId('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Assign User to ${complexName}`}
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" title="Success">
            {success}
          </Alert>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select User
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={usersLoading}
          >
            <option value="">-- Select a user --</option>
            {users?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username} ({user.email}) - {user.role}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleAssign}
            isLoading={isAssigning}
          >
            Assign User
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignUserModal;
