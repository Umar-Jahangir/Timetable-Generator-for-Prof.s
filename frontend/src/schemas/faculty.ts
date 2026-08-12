import { z } from "zod";

export const lectureRequestSchema = z.object({
  subject_id: z.coerce.number().int().positive("Select a subject"),
  division_id: z.coerce.number().int().positive("Select a division"),
  request_type: z.enum(["extra", "replacement"]),
});

export type LectureRequestFormValues = z.infer<typeof lectureRequestSchema>;
