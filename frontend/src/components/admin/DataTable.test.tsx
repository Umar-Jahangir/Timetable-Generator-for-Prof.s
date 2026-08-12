import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DataTable, { DataTableColumn } from "./DataTable";

interface Row {
  id: number;
  name: string;
  email: string;
}

const rows: Row[] = [
  { id: 1, name: "Prof. John Smith", email: "jsmith@college.edu" },
  { id: 2, name: "Prof. Anita Rao", email: "arao@college.edu" },
];

const columns: DataTableColumn<Row>[] = [
  { key: "name", label: "Name", render: (r) => r.name },
  { key: "email", label: "Email", render: (r) => r.email },
];

describe("DataTable", () => {
  it("shows a loading message and nothing else while isLoading is true", () => {
    render(<DataTable columns={columns} rows={[]} getRowId={(r) => r.id} onDelete={vi.fn()} isLoading />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the emptyMessage when there are no rows", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowId={(r) => r.id}
        onDelete={vi.fn()}
        emptyMessage="No faculty members yet — add one to get started."
      />
    );
    expect(screen.getByText("No faculty members yet — add one to get started.")).toBeInTheDocument();
  });

  it("falls back to the default empty message when none is supplied", () => {
    render(<DataTable columns={columns} rows={[]} getRowId={(r) => r.id} onDelete={vi.fn()} />);
    expect(screen.getByText("No records yet.")).toBeInTheDocument();
  });

  it("renders every row and column, including each column's custom render function", () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} onDelete={vi.fn()} />);
    expect(screen.getByText("Prof. John Smith")).toBeInTheDocument();
    expect(screen.getByText("jsmith@college.edu")).toBeInTheDocument();
    expect(screen.getByText("Prof. Anita Rao")).toBeInTheDocument();
    expect(screen.getByText("arao@college.edu")).toBeInTheDocument();
  });

  it("calls onDelete with the correct row when its delete icon is clicked", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole("button");
    // Two icon buttons per row (edit + delete) when onEdit is provided,
    // but this render call has no onEdit — so exactly one button per row.
    expect(deleteButtons).toHaveLength(2);

    await user.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith(rows[0]);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("only renders the edit icon when onEdit is provided (Assignments page passes no onEdit — create/delete only, by design)", () => {
    const { rerender } = render(
      <DataTable columns={columns} rows={rows.slice(0, 1)} getRowId={(r) => r.id} onDelete={vi.fn()} />
    );
    // No onEdit: 1 row x 1 button (delete only)
    expect(screen.getAllByRole("button")).toHaveLength(1);

    rerender(
      <DataTable columns={columns} rows={rows.slice(0, 1)} getRowId={(r) => r.id} onDelete={vi.fn()} onEdit={vi.fn()} />
    );
    // With onEdit: 1 row x 2 buttons (edit + delete)
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("calls onEdit with the correct row when its edit icon is clicked", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} onDelete={vi.fn()} onEdit={onEdit} />);

    // Row order: [edit0, delete0, edit1, delete1]
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);
    expect(onEdit).toHaveBeenCalledWith(rows[0]);
  });
});
