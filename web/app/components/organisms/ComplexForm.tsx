'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert } from '../atoms';
import { FormField } from '../molecules';
import { Complex } from '../../types';
import { useState } from 'react';

const complexSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must be less than 200 characters'),
});

type ComplexFormData = z.infer<typeof complexSchema>;

interface ComplexFormProps {
  initialData?: Complex | null;
  onSubmit: (data: ComplexFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const ComplexForm: React.FC<ComplexFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ComplexFormData>({
    resolver: zodResolver(complexSchema),
    defaultValues: {
      name: initialData?.name || '',
      address: initialData?.address || '',
    },
  });

  const handleFormSubmit = async (data: ComplexFormData) => {
    try {
      setError(null);
      await onSubmit(data);
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
        label="Complex Name"
        type="text"
        placeholder="Enter complex name"
        error={errors.name?.message}
        required
        {...register('name')}
      />

      <FormField
        label="Address"
        type="text"
        placeholder="Enter address"
        error={errors.address?.message}
        required
        {...register('address')}
      />

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
          {initialData ? 'Update Complex' : 'Create Complex'}
        </Button>
      </div>
    </form>
  );
};

export default ComplexForm;
