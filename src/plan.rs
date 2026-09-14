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

    #[test]
    fn project_preserves_duplicate_rows() {
        let rows = vec![
            Row::new(vec![("name", Value::Text("Ada".to_string()))]),
            Row::new(vec![("name", Value::Text("Ada".to_string()))]),
        ];
        let plan = Plan::Project {
            columns: vec!["name".to_string()],
            input: Box::new(Plan::Scan { rows }),
        };

        let result = plan.execute();

        assert_eq!(result.len(), 2);
        assert_eq!(result[0], result[1]);
    }

    #[test]
    fn removing_an_unused_column_early_preserves_the_result() {
        let inputs = vec![
            employees(),
            vec![
                Row::new(vec![
                    ("id", Value::Integer(4)),
                    ("name", Value::Text("Edsger".to_string())),
                    ("salary", Value::Integer(55_000)),
                ]),
                Row::new(vec![
                    ("id", Value::Integer(5)),
                    ("name", Value::Text("Barbara".to_string())),
                    ("salary", Value::Integer(48_000)),
                ]),
            ],
        ];

        for rows in inputs {
            let original = employee_name_plan(rows.clone());
            let remove_id_early = Plan::Project {
                columns: vec!["name".to_string()],
                input: Box::new(Plan::Filter {
                    column: "salary".to_string(),
                    greater_than: 50_000,
                    input: Box::new(Plan::Project {
                        columns: vec!["name".to_string(), "salary".to_string()],
                        input: Box::new(Plan::Scan { rows }),
                    }),
                }),
            };

            assert_eq!(original.execute(), remove_id_early.execute());
        }
    }

    #[test]
    fn dropping_a_filter_based_on_one_input_changes_other_results() {
        let original_rows = employees();
        assert_eq!(
            strict_and_weak_salary_filters(original_rows.clone()).execute(),
            salary_filter(original_rows, 50_000).execute()
        );

        let revealing_rows = vec![Row::new(vec![
            ("id", Value::Integer(4)),
            ("name", Value::Text("Edsger".to_string())),
            ("salary", Value::Integer(55_000)),
        ])];
        assert_ne!(
            strict_and_weak_salary_filters(revealing_rows.clone()).execute(),
            salary_filter(revealing_rows, 50_000).execute()
        );
    }

    fn employee_name_plan(rows: Vec<Row>) -> Plan {
        Plan::Project {
            columns: vec!["name".to_string()],
            input: Box::new(salary_filter(rows, 50_000)),
        }
    }

    fn salary_filter(rows: Vec<Row>, greater_than: i64) -> Plan {
        Plan::Filter {
            column: "salary".to_string(),
            greater_than,
            input: Box::new(Plan::Scan { rows }),
        }
    }

    fn strict_and_weak_salary_filters(rows: Vec<Row>) -> Plan {
        Plan::Filter {
            column: "salary".to_string(),
            greater_than: 60_000,
            input: Box::new(salary_filter(rows, 50_000)),
        }
    }
}
