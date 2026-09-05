use crate::row::{Row, Value};

pub enum Plan {
    Scan {
        rows: Vec<Row>,
    },
    Filter {
        column: String,
        greater_than: i64,
        input: Box<Plan>,
    },
    Project {
        columns: Vec<String>,
        input: Box<Plan>,
    },
}

impl Plan {
    pub fn execute(&self) -> Vec<Row> {
        match self {
            Plan::Scan { rows } => rows.clone(),
            Plan::Filter {
                column,
                greater_than,
                input,
            } => {
                let input_rows = input.execute();
                let mut output_rows = Vec::new();

                for row in input_rows {
                    let value = match row.get(column) {
                        Some(Value::Integer(value)) => value,
                        Some(Value::Text(_)) => panic!("column is not an integer: {column}"),
                        None => panic!("unknown column: {column}"),
                    };

                    if value > greater_than {
                        output_rows.push(row);
                    }
                }

                output_rows
            }
            Plan::Project { columns, input } => {
                let input_rows = input.execute();
                let mut output_rows = Vec::new();

                for row in input_rows {
                    output_rows.push(row.project(columns));
                }

                output_rows
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Plan;
    use crate::row::{Row, Value};

    fn employees() -> Vec<Row> {
        vec![
            Row::new(vec![
                ("id", Value::Integer(1)),
                ("name", Value::Text("Ada".to_string())),
                ("salary", Value::Integer(70_000)),
            ]),
            Row::new(vec![
                ("id", Value::Integer(2)),
                ("name", Value::Text("Linus".to_string())),
                ("salary", Value::Integer(50_000)),
            ]),
            Row::new(vec![
                ("id", Value::Integer(3)),
                ("name", Value::Text("Grace".to_string())),
                ("salary", Value::Integer(72_000)),
            ]),
        ]
    }

    #[test]
    fn scan_returns_source_rows() {
        let rows = employees();
        let plan = Plan::Scan { rows: rows.clone() };

        assert_eq!(plan.execute(), rows);
    }

    #[test]
    fn filter_removes_non_matching_rows() {
        let plan = Plan::Filter {
            column: "salary".to_string(),
            greater_than: 50_000,
            input: Box::new(Plan::Scan { rows: employees() }),
        };

        assert_eq!(
            plan.execute(),
            vec![employees()[0].clone(), employees()[2].clone()]
        );
    }

    #[test]
    fn complete_plan_filters_then_projects_rows() {
        let plan = Plan::Project {
            columns: vec!["name".to_string()],
            input: Box::new(Plan::Filter {
                column: "salary".to_string(),
                greater_than: 50_000,
                input: Box::new(Plan::Scan { rows: employees() }),
            }),
        };

        assert_eq!(
            plan.execute(),
            vec![
                Row::new(vec![("name", Value::Text("Ada".to_string()))]),
                Row::new(vec![("name", Value::Text("Grace".to_string()))]),
            ]
        );
    }
}
