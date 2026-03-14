'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert } from '../atoms';
import { FormField } from '../molecules';
import { MarketplaceCategory, Complex } from '../../types';
import { useState, useEffect } from 'react';
import { useTranslation } from '../../locales';

const categorySchema = (t: any) => z.object({
  name: z
    .string()
    .min(1, t('marketplace.categories.form.nameRequired') || 'Name is required')
    .max(100, t('marketplace.categories.form.nameMaxLength') || 'Name must be less than 100 characters'),
  complexId: z
    .string()
    .min(1, t('marketplace.categories.form.complexRequired') || 'Please select a complex'),
});

type CategoryFormData = {
  name: string;
  complexId: string;
};

interface MarketplaceCategoryFormProps {
  complexes: Complex[];
  initialData?: MarketplaceCategory | null;
  onSubmit: (data: { name: string; complex_id: number }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

const MarketplaceCategoryForm: React.FC<MarketplaceCategoryFormProps> = ({
  complexes,
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
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema(t)),
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

  const handleFormSubmit = async (data: CategoryFormData) => {
    try {
      setError(null);
      await onSubmit({
        name: data.name,
        complex_id: Number(data.complexId),
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
        label={t('marketplace.categories.form.categoryName')}
        type="text"
        placeholder={t('marketplace.categories.form.categoryNamePlaceholder')}
        error={errors.name?.message}
        required
        {...register('name')}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('common.complex') || 'Complex'}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          {...register('complexId')}
          className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.complexId ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">{t('payments.form.selectComplex')}</option>
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
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading || isSubmitting}
        >
          {isEdit ? t('marketplace.categories.form.updateCategory') : t('marketplace.categories.form.createCategory')}
        </Button>
      </div>
    </form>
  );
};

export default MarketplaceCategoryForm;
