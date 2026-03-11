'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert } from '../atoms';
import { FormField } from '../molecules';
import { Building, Complex } from '../../types';
import { useState, useEffect } from 'react';

const buildingSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  complexId: z
    .string()
    .min(1, 'Please select a complex'),
});

type BuildingFormData = z.infer<typeof buildingSchema>;

interface BuildingFormProps {
  complexes: Complex[];
  initialData?: Building | null;
  onSubmit: (data: { name: string; complex_id: number }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const BuildingForm: React.FC<BuildingFormProps> = ({
  complexes,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: initialData?.name || '',
      complexId: initialData?.complex_id?.toString() || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        complexId: initialData.complex_id.toString(),
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: BuildingFormData) => {
    try {
      setError(null);
      await onSubmit({
        name: data.name,
        complex_id: Number(data.complexId),
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
        label="Building Name"
        type="text"
        placeholder="Enter building name"
        error={errors.name?.message}
        required
        {...register('name')}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Complex
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          {...register('complexId')}
          className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.complexId ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select a complex</option>
          {complexes.map((complex) => (
            <option key={complex.id} value={complex.id}>
              {complex.name}
            </option>
          ))}
        </select>
        {errors.complexId && (
          <p className="mt-1 text-sm text-red-600">
            {errors.complexId.message}
          </p>
        )}
      </div>

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
          {initialData ? 'Update Building' : 'Create Building'}
        </Button>
      </div>
    </form>
  );
};

export default BuildingForm;
