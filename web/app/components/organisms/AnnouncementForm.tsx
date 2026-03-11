'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert } from '../atoms';
import { FormField } from '../molecules';
import { Announcement, Complex } from '../../types';
import { useState, useEffect } from 'react';

const announcementSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  complexId: z
    .string()
    .min(1, 'Please select a complex'),
  imgPath: z.string().optional(),
  commentsEnabled: z.boolean(),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

interface AnnouncementFormProps {
  complexes: Complex[];
  initialData?: Announcement | null;
  onSubmit: (data: { title: string; description: string; complex_id: number; img_path?: string; comments_enabled: boolean }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
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
  } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      complexId: initialData?.complex_id?.toString() || '',
      imgPath: initialData?.img_path || '',
      commentsEnabled: initialData?.comments_enabled ?? true,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        description: initialData.description,
        complexId: initialData.complex_id.toString(),
        imgPath: initialData.img_path || '',
        commentsEnabled: initialData.comments_enabled,
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: AnnouncementFormData) => {
    try {
      setError(null);
      await onSubmit({
        title: data.title,
        description: data.description,
        complex_id: Number(data.complexId),
        img_path: data.imgPath,
        comments_enabled: data.commentsEnabled,
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
        label="Title"
        type="text"
        placeholder="Enter announcement title"
        error={errors.title?.message}
        required
        {...register('title')}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
          <span className="text-red-500 ml-1">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={5}
          className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter announcement description"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      <FormField
        label="Image URL (Optional)"
        type="text"
        placeholder="Enter image URL"
        error={errors.imgPath?.message}
        {...register('imgPath')}
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

      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            {...register('commentsEnabled')}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Enable Comments</span>
        </label>
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
          {initialData ? 'Update Announcement' : 'Create Announcement'}
        </Button>
      </div>
    </form>
  );
};

export default AnnouncementForm;
