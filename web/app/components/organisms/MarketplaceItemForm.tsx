'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert } from '../atoms';
import { FormField } from '../molecules';
import { MarketplaceItem, MarketplaceCategory, MarketplaceItemStatus, Complex } from '../../types';
import { useState, useEffect } from 'react';
import { useTranslation } from '../../locales';

const itemSchema = (t: any) => z.object({
  title: z
    .string()
    .min(3, t('marketplace.items.form.titleMinLength') || 'Title must be at least 3 characters')
    .max(100, t('marketplace.items.form.titleMaxLength') || 'Title must be less than 100 characters'),
  description: z
    .string()
    .min(5, t('marketplace.items.form.descriptionMinLength') || 'Description must be at least 5 characters')
    .max(1000, t('marketplace.items.form.descriptionMaxLength') || 'Description must be less than 1000 characters'),
  price: z
    .number()
    .positive(t('marketplace.items.form.pricePositive') || 'Price must be positive'),
  categoryId: z
    .string()
    .min(1, t('marketplace.items.form.categoryRequired') || 'Please select a category'),
  complexId: z
    .string()
    .optional(),
  status: z.enum(['AVAILABLE', 'SOLD', 'RESERVED', 'EXPIRED']).optional(),
});

type ItemFormData = {
  title: string;
  description: string;
  price: number;
  categoryId: string;
  complexId?: string;
  status?: 'AVAILABLE' | 'SOLD' | 'RESERVED' | 'EXPIRED';
};

interface MarketplaceItemFormProps {
  categories: MarketplaceCategory[];
  complexes?: Complex[];
  initialData?: MarketplaceItem | null;
  onSubmit: (data: { title: string; description: string; price: number; category_id: number; status?: MarketplaceItemStatus; complex_id?: number }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
  showStatus?: boolean;
  showComplex?: boolean;
}

const MarketplaceItemForm: React.FC<MarketplaceItemFormProps> = ({
  categories,
  complexes = [],
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  isEdit = false,
  showStatus = false,
  showComplex = false,
}) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema(t)),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      categoryId: initialData?.category_id?.toString() || '',
      complexId: initialData?.complex_id?.toString() || '',
      status: initialData?.status || 'AVAILABLE',
    },
  });

  const selectedComplexId = watch('complexId');

  // Filter categories based on selected complex
  const filteredCategories = showComplex && selectedComplexId
    ? categories.filter(c => c.complex_id.toString() === selectedComplexId)
    : categories;

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        description: initialData.description,
        price: initialData.price,
        categoryId: initialData.category_id.toString(),
        complexId: initialData.complex_id?.toString() || '',
        status: initialData.status,
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: ItemFormData) => {
    try {
      setError(null);
      await onSubmit({
        title: data.title,
        description: data.description,
        price: Number(data.price),
        category_id: Number(data.categoryId),
        status: data.status as MarketplaceItemStatus,
        complex_id: data.complexId ? Number(data.complexId) : undefined,
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

      {showComplex && (
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
      )}

      <FormField
        label={t('marketplace.items.form.title')}
        type="text"
        placeholder={t('marketplace.items.form.titlePlaceholder')}
        error={errors.title?.message}
        required
        {...register('title')}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('marketplace.items.form.description')}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={4}
          placeholder={t('marketplace.items.form.descriptionPlaceholder')}
          className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      <FormField
        label={t('marketplace.items.form.price')}
        type="number"
        placeholder={t('marketplace.items.form.pricePlaceholder')}
        error={errors.price?.message}
        required
        step="0.01"
        min="0"
        {...register('price', { valueAsNumber: true })}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('marketplace.items.form.category')}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          {...register('categoryId')}
          className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.categoryId ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={showComplex && !selectedComplexId}
        >
          <option value="">{t('marketplace.items.form.selectCategory')}</option>
          {filteredCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-600">
            {errors.categoryId.message}
          </p>
        )}
        {showComplex && !selectedComplexId && (
          <p className="mt-1 text-sm text-gray-500">
            {t('marketplace.items.form.selectComplexFirst')}
          </p>
        )}
      </div>

      {showStatus && isEdit && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.status')}
          </label>
          <select
            {...register('status')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="AVAILABLE">{t('marketplace.items.status.AVAILABLE')}</option>
            <option value="SOLD">{t('marketplace.items.status.SOLD')}</option>
            <option value="RESERVED">{t('marketplace.items.status.RESERVED')}</option>
            <option value="EXPIRED">{t('marketplace.items.status.EXPIRED')}</option>
          </select>
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
          {isEdit ? t('marketplace.items.form.updateItem') : t('marketplace.items.form.createItem')}
        </Button>
      </div>
    </form>
  );
};

export default MarketplaceItemForm;
