import { describe, it, expect } from "vitest";
import { facultySchema, subjectSchema, roomSchema, divisionSchema } from "./admin";

describe("facultySchema", () => {
  it("accepts a valid faculty payload", () => {
    const result = facultySchema.safeParse({
      name: "Prof. Test",
      email: "test@college.edu",
      department_id: 1,
      designation: "Lecturer",
      max_weekly_hours: 18,
    });
    expect(result.success).toBe(true);
  });

  it("allows designation to be omitted (optional)", () => {
    const result = facultySchema.safeParse({
      name: "Prof. Test",
      email: "test@college.edu",
      department_id: 1,
      max_weekly_hours: 18,
    });
    expect(result.success).toBe(true);
  });

  it("rejects department_id of 0 — this is the sentinel 'nothing selected' value used by every <MenuItem value={0} disabled> in the admin forms", () => {
    const result = facultySchema.safeParse({
      name: "Prof. Test",
      email: "test@college.edu",
      department_id: 0,
      max_weekly_hours: 18,
    });
    expect(result.success).toBe(false);
  });

  it("rejects max_weekly_hours above 40", () => {
    const result = facultySchema.safeParse({
      name: "Prof. Test",
      email: "test@college.edu",
      department_id: 1,
      max_weekly_hours: 41,
    });
    expect(result.success).toBe(false);
  });

  it("coerces string-typed numeric input (as MUI TextField type='number' produces) into a real number", () => {
    // z.coerce.number() is exactly what fixed the Resolver<T> typing
    // friction documented across the admin pages — this test proves
    // the coercion itself behaves as expected at runtime, independent
    // of that TypeScript-only concern.
    const result = facultySchema.safeParse({
      name: "Prof. Test",
      email: "test@college.edu",
      department_id: "1",
      max_weekly_hours: "18",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.department_id).toBe(1);
      expect(typeof result.data.department_id).toBe("number");
    }
  });
});

describe("subjectSchema", () => {
  it("accepts a valid subject payload", () => {
    const result = subjectSchema.safeParse({
      name: "Database Management Systems",
      code: "CS301",
      academic_year_id: 3,
      department_id: 1,
      credits: 4,
      lectures_per_week: 3,
      tutorials_per_week: 1,
      lab_hours_per_week: 2,
      is_online: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing subject code", () => {
    const result = subjectSchema.safeParse({
      name: "Database Management Systems",
      code: "",
      academic_year_id: 3,
      department_id: 1,
      credits: 4,
      lectures_per_week: 3,
      tutorials_per_week: 1,
      lab_hours_per_week: 2,
      is_online: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative lecture counts", () => {
    const result = subjectSchema.safeParse({
      name: "X",
      code: "X1",
      academic_year_id: 1,
      department_id: 1,
      credits: 0,
      lectures_per_week: -1,
      tutorials_per_week: 0,
      lab_hours_per_week: 0,
      is_online: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("roomSchema", () => {
  it("only accepts 'classroom' or 'laboratory' as room_type", () => {
    const valid = roomSchema.safeParse({ name: "C-304", capacity: 70, room_type: "classroom" });
    expect(valid.success).toBe(true);

    const invalid = roomSchema.safeParse({ name: "C-304", capacity: 70, room_type: "lecture_hall" });
    expect(invalid.success).toBe(false);
  });

  it("rejects capacity of 0 (must be at least 1)", () => {
    const result = roomSchema.safeParse({ name: "C-304", capacity: 0, room_type: "classroom" });
    expect(result.success).toBe(false);
  });

  it("allows building to be an empty string (optional field pattern used across every admin form)", () => {
    const result = roomSchema.safeParse({ name: "C-304", building: "", capacity: 70, room_type: "classroom" });
    expect(result.success).toBe(true);
  });
});

describe("divisionSchema", () => {
  it("accepts a valid division without strength (optional)", () => {
    const result = divisionSchema.safeParse({
      academic_year_id: 3,
      department_id: 1,
      name: "A",
      is_online: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a division name longer than 10 characters", () => {
    const result = divisionSchema.safeParse({
      academic_year_id: 3,
      department_id: 1,
      name: "WayTooLongDivisionName",
      is_online: false,
    });
    expect(result.success).toBe(false);
  });
});
