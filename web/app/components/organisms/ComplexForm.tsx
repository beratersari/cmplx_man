'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert } from '../atoms';
import { FormField } from '../molecules';
import { Complex } from '../../types';
import { useState } from 'react';
import { useTranslation } from '../../locales';

const complexSchema = (t: any) => z.object({
  name: z
    .string()
    .min(3, t('complexes.form.nameMinLength') || 'Name must be at least 3 characters')
    .max(100, t('complexes.form.nameMaxLength') || 'Name must be less than 100 characters'),
  address: z
    .string()
    .min(5, t('complexes.form.addressMinLength') || 'Address must be at least 5 characters')
    .max(200, t('complexes.form.addressMaxLength') || 'Address must be less than 200 characters'),
});

type ComplexFormData = {
  name: string;
  address: string;
};

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
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ComplexFormData>({
    resolver: zodResolver(complexSchema(t)),
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
        label={t('complexes.form.name')}
        type="text"
        placeholder={t('complexes.form.namePlaceholder')}
        error={errors.name?.message}
        required
        {...register('name')}
      />

      <FormField
        label={t('complexes.form.address')}
        type="text"
        placeholder={t('complexes.form.addressPlaceholder')}
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
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading || isSubmitting}
        >
          {initialData ? t('complexes.form.updateComplex') : t('complexes.form.createComplex')}
        </Button>
      </div>
    </form>
  );
};

export default ComplexForm;
