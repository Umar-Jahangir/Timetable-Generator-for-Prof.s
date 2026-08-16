import { z } from "zod";

export const facultySchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  department_id: z.coerce.number({ message: "Select a department" }).int().positive(),
  designation: z.string().max(100).optional().or(z.literal("")),
  max_weekly_hours: z.coerce.number().int().min(1).max(40),
});
export type FacultyFormValues = z.infer<typeof facultySchema>;

export const subjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  code: z.string().min(1, "Code is required").max(20),
  academic_year_id: z.coerce.number({ message: "Select an academic year" }).int().positive(),
  department_id: z.coerce.number({ message: "Select a department" }).int().positive(),
  credits: z.coerce.number().int().min(0).max(20),
  lectures_per_week: z.coerce.number().int().min(0).max(20),
  tutorials_per_week: z.coerce.number().int().min(0).max(20),
  lab_hours_per_week: z.coerce.number().int().min(0).max(20),
  is_industrial_elective: z.boolean(),
  is_online: z.boolean(),
});
export type SubjectFormValues = z.infer<typeof subjectSchema>;

export const roomSchema = z.object({
  name: z.string().min(1, "Name is required").max(20),
  building: z.string().max(50).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1).max(500),
  room_type: z.enum(["classroom", "laboratory", "tutorial"]),
});
export type RoomFormValues = z.infer<typeof roomSchema>;

export const divisionSchema = z.object({
  academic_year_id: z.coerce.number({ message: "Select an academic year" }).int().positive(),
  department_id: z.coerce.number({ message: "Select a department" }).int().positive(),
  name: z.string().min(1, "Name is required").max(10),
  strength: z.coerce.number().int().min(1).max(500).optional(),
  is_online: z.boolean(),
});
export type DivisionFormValues = z.infer<typeof divisionSchema>;

export const constraintSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  constraint_type: z.enum([
    "faculty_free_hour",
    "max_continuous_hours",
    "lab_continuous_hours",
    "online_year",
    "division_day_off",
    "division_blackout",
    "custom",
  ]),
  config_json: z.string().min(1, "Config JSON is required").refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Must be valid JSON, e.g. {\"day\":\"Friday\",\"start\":\"13:00\",\"end\":\"14:00\"}" }
  ),
  is_active: z.boolean(),
});
export type ConstraintFormValues = z.infer<typeof constraintSchema>;

export const assignmentSchema = z.object({
  subject_id: z.coerce.number().int().positive("Select a subject"),
  faculty_id: z.coerce.number().int().positive("Select a faculty member"),
  division_id: z.coerce.number().int().positive("Select a division"),
  delivery_type: z.enum(["theory", "lab", "tutorial"]),
  batch_id: z.preprocess(
    (value) => (value === "" || value === 0 || value === null || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable().optional()
  ),
}).superRefine((values, context) => {
  if (values.delivery_type === "theory" && values.batch_id) {
    context.addIssue({ code: "custom", path: ["batch_id"], message: "Theory applies to the full division." });
  }
  if (values.delivery_type !== "theory" && !values.batch_id) {
    context.addIssue({ code: "custom", path: ["batch_id"], message: "Select a batch for a lab or tutorial." });
  }
});
export type AssignmentFormValues = z.infer<typeof assignmentSchema>;
