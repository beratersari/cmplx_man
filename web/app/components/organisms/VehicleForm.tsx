'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert } from '../atoms';
import { FormField } from '../molecules';
import { Vehicle, User } from '../../types';
import { useState, useEffect } from 'react';

const vehicleSchema = z.object({
  plate_number: z
    .string()
    .min(3, 'Plate number must be at least 3 characters')
    .max(20, 'Plate number must be less than 20 characters'),
  userId: z
    .string()
    .min(1, 'Please select an owner'),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehicleFormProps {
  users: User[];
  initialData?: Vehicle | null;
  onSubmit: (data: { user_id: number; plate_number: string }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

const VehicleForm: React.FC<VehicleFormProps> = ({
  users,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  isEdit = false,
}) => {
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate_number: initialData?.plate_number || '',
      userId: initialData?.user_id?.toString() || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        plate_number: initialData.plate_number,
        userId: initialData.user_id.toString(),
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: VehicleFormData) => {
    try {
      setError(null);
      await onSubmit({
        user_id: Number(data.userId),
        plate_number: data.plate_number,
      });
    } catch (err: any) {
      setError(err?.data?.detail || 'An error occurred. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      <FormField
        label="Plate Number"
        type="text"
        placeholder="Enter vehicle plate number"
        error={errors.plate_number?.message}
        required
        {...register('plate_number')}
      />

      {!isEdit && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Owner
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            {...register('userId')}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.userId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select an owner</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username} ({user.email})
              </option>
            ))}
          </select>
          {errors.userId && (
            <p className="mt-1 text-sm text-red-600">
              {errors.userId.message}
            </p>
          )}
        </div>
      )}

      {isEdit && initialData && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Owner
          </label>
          <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">
            {users.find(u => u.id === initialData.user_id)?.username || `User ${initialData.user_id}`}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Owner cannot be changed after registration
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading || isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading || isSubmitting}
        >
          {isEdit ? 'Update Vehicle' : 'Register Vehicle'}
        </Button>
      </div>
    </form>
  );
};

export default VehicleForm;
