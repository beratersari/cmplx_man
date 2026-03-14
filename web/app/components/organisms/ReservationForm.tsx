'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert } from '../atoms';
import { FormField } from '../molecules';
import { Reservation, Complex, ReservationCategory, User } from '../../types';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../locales';

const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;

const reservationSchema = (t: any) => z.object({
  categoryId: z
    .string()
    .min(1, t('reservations.form.categoryRequired') || 'Please select a category'),
  userId: z
    .string()
    .min(1, t('reservations.form.userRequired') || 'Please select a user'),
  complexId: z
    .string()
    .min(1, t('reservations.form.complexRequired') || 'Please select a complex'),
  reservationDate: z
    .string()
    .min(1, t('reservations.form.dateRequired') || 'Please select a date'),
  startHour: z
    .string()
    .regex(timeRegex, t('reservations.form.invalidTimeFormat') || 'Invalid time format (HH:MM)'),
  endHour: z
    .string()
    .regex(timeRegex, t('reservations.form.invalidTimeFormat') || 'Invalid time format (HH:MM)'),
  personCount: z
    .number()
    .min(1, t('reservations.form.personCountMin') || 'At least 1 person required'),
  notes: z
    .string()
    .optional(),
});

type ReservationFormData = {
  categoryId: string;
  userId: string;
  complexId: string;
  reservationDate: string;
  startHour: string;
  endHour: string;
  personCount: number;
  notes?: string;
};

interface ReservationFormProps {
  complexes: Complex[];
  categories: ReservationCategory[];
  users: User[];
  initialData?: Reservation | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

const ReservationForm: React.FC<ReservationFormProps> = ({
  complexes,
  categories,
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema(t)),
    defaultValues: {
      categoryId: initialData?.category_id?.toString() || '',
      userId: initialData?.user_id?.toString() || '',
      complexId: initialData?.complex_id?.toString() || '',
      reservationDate: initialData?.reservation_date
        ? new Date(initialData.reservation_date).toISOString().split('T')[0]
        : '',
      startHour: initialData?.start_hour || '',
      endHour: initialData?.end_hour || '',
      personCount: initialData?.person_count || 1,
      notes: initialData?.notes || '',
    },
  });

  const selectedComplexId = watch('complexId');

  useEffect(() => {
    if (initialData) {
      reset({
        categoryId: initialData.category_id.toString(),
        userId: initialData.user_id.toString(),
        complexId: initialData.complex_id.toString(),
        reservationDate: new Date(initialData.reservation_date).toISOString().split('T')[0],
        startHour: initialData.start_hour,
        endHour: initialData.end_hour,
        personCount: initialData.person_count,
        notes: initialData.notes || '',
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: ReservationFormData) => {
    try {
      setError(null);
      const submitData: any = {};

      if (isEdit) {
        // For edit, only include changed fields
        if (data.categoryId !== initialData?.category_id?.toString()) submitData.category_id = Number(data.categoryId);
        if (data.reservationDate !== new Date(initialData?.reservation_date || '').toISOString().split('T')[0]) {
          submitData.reservation_date = new Date(data.reservationDate).toISOString();
        }
        if (data.startHour !== initialData?.start_hour) submitData.start_hour = data.startHour;
        if (data.endHour !== initialData?.end_hour) submitData.end_hour = data.endHour;
        if (data.personCount !== initialData?.person_count) submitData.person_count = data.personCount;
        if (data.notes !== initialData?.notes) submitData.notes = data.notes;
      } else {
        // For create, include all required fields
        submitData.category_id = Number(data.categoryId);
        submitData.user_id = Number(data.userId);
        submitData.complex_id = Number(data.complexId);
        submitData.reservation_date = new Date(data.reservationDate).toISOString();
        submitData.start_hour = data.startHour;
        submitData.end_hour = data.endHour;
        submitData.person_count = data.personCount;
        submitData.notes = data.notes;
      }

      await onSubmit(submitData);
    } catch (err: any) {
      setError(err?.data?.detail || t('common.errorOccurred') || 'An error occurred. Please try again.');
    }
  };

  // Filter categories by selected complex
  const filteredCategories = useMemo(() => {
    return selectedComplexId
      ? categories.filter(c => c.complex_id.toString() === selectedComplexId)
      : categories;
  }, [categories, selectedComplexId]);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
      {error && (
        <Alert variant="error" title={t('common.error')}>
          {error}
        </Alert>
      )}

      {!isEdit && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('reservations.form.complex')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              {...register('complexId')}
              className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.complexId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">{t('reservations.form.selectComplex')}</option>
              {complexes.map((complex) => (
                <option key={complex.id} value={complex.id}>
                  {complex.name}
                </option>
              ))}
            </select>
            {errors.complexId && (
              <p className="mt-1 text-sm text-red-600">{errors.complexId.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('reservations.form.user')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              {...register('userId')}
              className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.userId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">{t('reservations.form.selectUser')}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
            {errors.userId && (
              <p className="mt-1 text-sm text-red-600">{errors.userId.message}</p>
            )}
          </div>
        </>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('reservations.form.category')}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          {...register('categoryId')}
          className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.categoryId ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">{t('reservations.form.selectCategory')}</option>
          {filteredCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
        )}
        {selectedComplexId && filteredCategories.length === 0 && (
          <p className="mt-1 text-sm text-yellow-600">
            {t('issues.form.noCategoriesAvailable')}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('reservations.form.reservationDate')}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="date"
          {...register('reservationDate')}
          className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.reservationDate ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.reservationDate && (
          <p className="mt-1 text-sm text-red-600">{errors.reservationDate.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label={t('reservations.form.startHour')}
          type="text"
          placeholder="HH:MM"
          error={errors.startHour?.message}
          required
          {...register('startHour')}
        />

        <FormField
          label={t('reservations.form.endHour')}
          type="text"
          placeholder="HH:MM"
          error={errors.endHour?.message}
          required
          {...register('endHour')}
        />
      </div>

      <FormField
        label={t('reservations.form.personCount')}
        type="number"
        error={errors.personCount?.message}
        required
        {...register('personCount', { valueAsNumber: true })}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('reservations.form.notes')}
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('reservations.form.notesPlaceholder')}
        />
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
          {isEdit ? t('reservations.form.updateReservation') : t('reservations.form.createReservation')}
        </Button>
      </div>
    </form>
  );
};

export default ReservationForm;
