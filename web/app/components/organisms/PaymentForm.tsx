'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert } from '../atoms';
import { FormField } from '../molecules';
import { Complex } from '../../types';
import { useState } from 'react';
import { useTranslation } from '../../locales';

interface PaymentFormProps {
  complexes: Complex[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  complexes,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  // Create schema with translated error messages
  const paymentSchema = z.object({
    title: z
      .string()
      .min(3, t('payments.form.titleMinLength') || 'Title must be at least 3 characters')
      .max(100, t('payments.form.titleMaxLength') || 'Title must be less than 100 characters'),
    amount: z
      .number()
      .positive(t('payments.form.amountPositive') || 'Amount must be positive'),
    complexId: z
      .string()
      .min(1, t('payments.form.complexRequired') || 'Please select a complex'),
    targetType: z.enum(['ALL', 'SPECIFIC']),
    unitNumbers: z.string().optional(),
    dueDate: z.string().optional(),
  });

  type PaymentFormData = z.infer<typeof paymentSchema>;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      title: '',
      amount: 0,
      complexId: '',
      targetType: 'ALL',
      unitNumbers: '',
      dueDate: '',
    },
  });

  const targetType = watch('targetType');

  const handleFormSubmit = async (data: PaymentFormData) => {
    try {
      setError(null);
      const payload: any = {
        title: data.title,
        amount: Number(data.amount),
        complex_id: Number(data.complexId),
      };

      if (data.dueDate) {
        payload.due_date = new Date(data.dueDate).toISOString();
      }

      if (data.targetType === 'SPECIFIC') {
        payload.unit_numbers = data.unitNumbers?.split(',').map(u => u.trim()).filter(u => u !== '') || [];
      }

      await onSubmit({ payload, targetType: data.targetType });
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
        label={t('payments.form.titleLabel')}
        type="text"
        placeholder={t('payments.form.titlePlaceholder')}
        error={errors.title?.message}
        required
        {...register('title')}
      />

      <FormField
        label={t('payments.form.amountLabel')}
        type="number"
        placeholder={t('payments.form.amountPlaceholder')}
        error={errors.amount?.message}
        required
        step="0.01"
        min="0"
        {...register('amount', { valueAsNumber: true })}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('payments.form.complexLabel')}
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

      <FormField
        label={t('payments.form.dueDateLabel')}
        type="date"
        error={errors.dueDate?.message}
        {...register('dueDate')}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('payments.form.targetUnits')}
        </label>
        <div className="flex gap-4 mb-2">
          <label className="flex items-center">
            <input
              type="radio"
              value="ALL"
              {...register('targetType')}
              className="mr-2"
            />
            {t('payments.allUnits')}
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="SPECIFIC"
              {...register('targetType')}
              className="mr-2"
            />
            {t('payments.specificUnits')}
          </label>
        </div>
      </div>

      {targetType === 'SPECIFIC' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('payments.form.unitNumbersLabel')}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            {...register('unitNumbers')}
            rows={2}
            placeholder={t('payments.form.unitNumbersPlaceholder')}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.unitNumbers ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('payments.form.unitNumbersNote')}
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
          {t('payments.form.issuePayment')}
        </Button>
      </div>
    </form>
  );
};

export default PaymentForm;
