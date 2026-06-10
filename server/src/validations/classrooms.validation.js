import { z } from 'zod';

export const createClassroomSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  subject: z.string().min(2, 'Subject is required'),
  maxParticipants: z.number().int().min(2).max(50).optional(),
});

export const updateClassroomSchema = createClassroomSchema.partial();
