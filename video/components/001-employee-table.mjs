const EMPLOYEES = [
  { id: "1", name: "Ada", salary: "70,000" },
  { id: "2", name: "Linus", salary: "50,000" },
  { id: "3", name: "Grace", salary: "72,000" },
];

const COLUMN_LABELS = {
  id: "id",
  name: "name",
  salary: "salary",
};

export function employeeRows() {
  return EMPLOYEES.map((row) => ({ ...row }));
}

export function createEmployeeTable({
  columns = ["id", "name", "salary"],
  rows = EMPLOYEES,
  linusState = "normal",
  compact = false,
} = {}) {
  const table = document.createElement("div");
  table.className = `employee-table${compact ? " employee-table--compact" : ""}`;
  table.style.setProperty("--column-count", columns.length);

  const header = document.createElement("div");
  header.className = "employee-table__row employee-table__header";
  for (const column of columns) {
    header.append(createCell(COLUMN_LABELS[column], column));
  }
  table.append(header);

  for (const row of rows) {
    const rowElement = document.createElement("div");
    rowElement.className = "employee-table__row";
    rowElement.dataset.employee = row.name.toLowerCase();
    if (row.name === "Linus") {
      rowElement.classList.add(`employee-table__row--${linusState}`);
    }

    for (const column of columns) {
      rowElement.append(createCell(row[column], column));
    }
    table.append(rowElement);
  }

  return table;
}

export function createEmployeeRowCard(row = EMPLOYEES[0]) {
  const card = document.createElement("div");
  card.className = "employee-row-card";
  for (const column of ["id", "name", "salary"]) {
    const cell = document.createElement("div");
    cell.className = "employee-row-card__cell";

    const label = document.createElement("span");
    label.className = "employee-row-card__label";
    label.textContent = COLUMN_LABELS[column];

    const value = document.createElement("strong");
    value.textContent = row[column];
    cell.append(label, value);
    card.append(cell);
  }
  return card;
}

function createCell(value, column) {
  const cell = document.createElement("div");
  cell.className = "employee-table__cell";
  cell.dataset.column = column;
  cell.textContent = value;
  return cell;
}
