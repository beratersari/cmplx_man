'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert } from '../atoms';
import { FormField } from '../molecules';
import { Vehicle, User } from '../../types';
import { useState, useEffect } from 'react';
import { useTranslation } from '../../locales';

const vehicleSchema = (t: any) => z.object({
  plate_number: z
    .string()
    .min(3, t('vehicles.form.plateNumberMinLength') || 'Plate number must be at least 3 characters')
    .max(20, t('vehicles.form.plateNumberMaxLength') || 'Plate number must be less than 20 characters'),
  userId: z
    .string()
    .min(1, t('vehicles.form.ownerRequired') || 'Please select an owner'),
});

type VehicleFormData = {
  plate_number: string;
  userId: string;
};

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
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema(t)),
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
      setError(err?.data?.detail || t('common.errorOccurred') || 'An error occurred. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
      {error && (
        <Alert variant="error" title={t('common.error')}>
          {error}
        </Alert>
      )}

      <FormField
        label={t('vehicles.form.plateNumber')}
        type="text"
        placeholder={t('vehicles.form.plateNumberPlaceholder')}
        error={errors.plate_number?.message}
        required
        {...register('plate_number')}
      />

      {!isEdit && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('vehicles.form.user')}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            {...register('userId')}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.userId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">{t('vehicles.form.selectUser')}</option>
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
            {t('vehicles.owner')}
          </label>
          <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">
            {users.find(u => u.id === initialData.user_id)?.username || `${t('users.user')} ${initialData.user_id}`}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {t('vehicles.form.ownerCannotBeChanged') || 'Owner cannot be changed after registration'}
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
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading || isSubmitting}
        >
          {isEdit ? t('vehicles.form.updateVehicle') : t('vehicles.form.registerVehicle')}
        </Button>
      </div>
    </form>
  );
};

export default VehicleForm;
