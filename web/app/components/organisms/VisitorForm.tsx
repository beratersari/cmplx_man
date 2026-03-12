'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert } from '../atoms';
import { FormField } from '../molecules';
import { Visitor, Complex } from '../../types';
import { useState, useEffect } from 'react';

const createVisitorSchema = (showComplexSelect: boolean) => z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  plate_number: z
    .string()
    .max(20, 'Plate number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  complexId: showComplexSelect
    ? z.string().min(1, 'Please select a complex')
    : z.string().optional(),
});

type VisitorFormData = {
  name: string;
  plate_number?: string;
  complexId: string | undefined;
};

interface VisitorFormProps {
  complexes: Complex[];
  initialData?: Visitor | null;
  onSubmit: (data: { name: string; plate_number?: string; complex_id: number }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
  showComplexSelect?: boolean;
}

const VisitorForm: React.FC<VisitorFormProps> = ({
  complexes,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  isEdit = false,
  showComplexSelect = true,
}) => {
  const [error, setError] = useState<string | null>(null);

  const visitorSchema = createVisitorSchema(showComplexSelect);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VisitorFormData>({
    resolver: zodResolver(visitorSchema),
    defaultValues: {
      name: initialData?.name || '',
      plate_number: initialData?.plate_number || '',
      complexId: initialData?.complex_id?.toString() || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        plate_number: initialData.plate_number || '',
        complexId: initialData.complex_id.toString(),
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: VisitorFormData) => {
    try {
      setError(null);
      const submitData: { name: string; plate_number?: string; complex_id: number } = {
        name: data.name,
        complex_id: Number(data.complexId || 0),
      };
      if (data.plate_number && data.plate_number.trim() !== '') {
        submitData.plate_number = data.plate_number;
      }
      await onSubmit(submitData);
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
        label="Visitor Name"
        type="text"
        placeholder="Enter visitor name"
        error={errors.name?.message}
        required
        {...register('name')}
      />

      <FormField
        label="Plate Number"
        type="text"
        placeholder="Enter vehicle plate number (optional)"
        error={errors.plate_number?.message}
        {...register('plate_number')}
      />

      {showComplexSelect && !isEdit && (
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
          {isEdit ? 'Update Visitor' : 'Register Visitor'}
        </Button>
      </div>
    </form>
  );
};

export default VisitorForm;
