mod catalog;
mod expression;
mod lexer;
mod parser;
mod plan;
mod row;

use std::io::{self, Write};

use catalog::{Catalog, Column, Table};
use expression::DataType;
use parser::parse;
use row::{Row, Value};

fn main() {
    let catalog = employee_catalog();
    if std::env::args().nth(1).as_deref() == Some("--prompt") {
        run_prompt(&catalog).expect("failed to read SQL from the terminal");
    } else {
        run_demo(&catalog);
    }
}

fn employee(id: i64, name: &str, salary: i64, department_id: i64) -> Row {
    Row::new(vec![
        ("id", Value::Integer(id)),
        ("name", Value::Text(name.into())),
        ("salary", Value::Integer(salary)),
        ("department_id", Value::Integer(department_id)),
    ])
}

fn department(id: i64, name: &str) -> Row {
    Row::new(vec![
        ("id", Value::Integer(id)),
        ("name", Value::Text(name.into())),
    ])
}

fn employee_catalog() -> Catalog {
    Catalog::new(vec![
        Table {
            name: "employees".into(),
            columns: vec![
                Column {
                    name: "id".into(),
                    data_type: DataType::Integer,
                },
                Column {
                    name: "name".into(),
                    data_type: DataType::Text,
                },
                Column {
                    name: "salary".into(),
                    data_type: DataType::Integer,
                },
                Column {
                    name: "department_id".into(),
                    data_type: DataType::Integer,
                },
            ],
            rows: vec![
                employee(1, "Ada", 70_000, 10),
                employee(2, "Linus", 50_000, 20),
                employee(3, "Grace", 72_000, 30),
            ],
        },
        Table {
            name: "departments".into(),
            columns: vec![
                Column {
                    name: "id".into(),
                    data_type: DataType::Integer,
                },
                Column {
                    name: "name".into(),
                    data_type: DataType::Text,
                },
            ],
            rows: vec![
                department(10, "Engineering"),
                department(20, "Systems"),
                department(30, "Research"),
            ],
        },
    ])
}

fn execute_sql(sql: &str, catalog: &Catalog) -> Result<Vec<Row>, String> {
    let query = parse(sql).map_err(|error| error.to_string())?;
    catalog.bind(query)?.execute()
}

fn run_demo(catalog: &Catalog) {
    let sql = "SELECT e.name AS employee_name, d.name AS department_name \
        FROM employees AS e, departments AS d \
        WHERE e.department_id = d.id;";
    let rows = execute_sql(sql, catalog).expect("the lesson query should execute");
    println!("Employees and their departments:");
    for row in rows {
        println!("{row}");
    }
}

fn run_prompt(catalog: &Catalog) -> io::Result<()> {
    loop {
        let mut sql = String::new();

        loop {
            if sql.is_empty() {
                print!("sql> ");
            } else {
                print!("...> ");
            }
            io::stdout().flush()?;

            let mut line = String::new();
            if io::stdin().read_line(&mut line)? == 0 {
                println!();
                if !sql.trim().is_empty() {
                    eprintln!("error: incomplete query at end of input");
                }
                return Ok(());
            }
            if sql.is_empty() && line.trim().is_empty() {
                break;
            }
            if append_sql_line(&mut sql, &line) {
                break;
            }
        }

        if !sql.trim().is_empty() {
            print_query_result(&sql, catalog);
        }
    }
}

fn append_sql_line(sql: &mut String, line: &str) -> bool {
    sql.push_str(line);
    line.trim_end().ends_with(';')
}

fn print_query_result(sql: &str, catalog: &Catalog) {
    match execute_sql(sql, catalog) {
        Ok(rows) => {
            for row in rows {
                println!("{row}");
            }
        }
        Err(error) => eprintln!("error: {error}"),
    }
}

#[cfg(test)]
mod tests {
    use super::{append_sql_line, employee_catalog, execute_sql};
    use crate::row::{Row, Value};

    #[test]
    fn bound_expression_query_returns_ada_and_grace() {
        assert_eq!(
            execute_sql("SELECT e.name FROM employees AS e WHERE e.salary + 5000 > 70000 AND e.name IS NOT NULL;", &employee_catalog()).unwrap(),
            vec![Row::new(vec![("name", Value::Text("Ada".into()))]), Row::new(vec![("name", Value::Text("Grace".into()))])]
        );
    }

    #[test]
    fn missing_table_is_no_longer_a_false_success() {
        assert_eq!(
            execute_sql(
                "SELECT name FROM missing_table WHERE salary > 50000;",
                &employee_catalog()
            )
            .unwrap_err(),
            "unknown table: missing_table"
        );
    }

    #[test]
    fn a_binding_error_does_not_prevent_the_next_query() {
        let catalog = employee_catalog();
        assert!(execute_sql("SELECT name FROM missing WHERE salary > 0;", &catalog).is_err());
        assert_eq!(
            execute_sql("SELECT name FROM employees WHERE salary > 70000;", &catalog)
                .unwrap()
                .len(),
            1
        );
    }

    #[test]
    fn join_query_returns_employee_and_department_names() {
        assert_eq!(
            execute_sql(
                "SELECT e.name AS employee_name, d.name AS department_name \
                 FROM employees AS e, departments AS d \
                 WHERE e.department_id = d.id;",
                &employee_catalog(),
            )
            .unwrap(),
            vec![
                Row::new(vec![
                    ("employee_name", Value::Text("Ada".into())),
                    ("department_name", Value::Text("Engineering".into())),
                ]),
                Row::new(vec![
                    ("employee_name", Value::Text("Linus".into())),
                    ("department_name", Value::Text("Systems".into())),
                ]),
                Row::new(vec![
                    ("employee_name", Value::Text("Grace".into())),
                    ("department_name", Value::Text("Research".into())),
                ]),
            ]
        );
    }

    #[test]
    fn unqualified_column_is_rejected_when_multiple_inputs_define_it() {
        assert_eq!(
            execute_sql(
                "SELECT name FROM employees AS e, departments AS d WHERE e.department_id = d.id;",
                &employee_catalog(),
            )
            .unwrap_err(),
            "ambiguous column: name"
        );
    }

    #[test]
    fn prompt_collects_lines_until_the_statement_ends() {
        let mut sql = String::new();

        assert!(!append_sql_line(
            &mut sql,
            "SELECT e.name AS employee_name, d.name AS department_name\n"
        ));
        assert!(!append_sql_line(
            &mut sql,
            "FROM employees AS e, departments AS d\n"
        ));
        assert!(append_sql_line(&mut sql, "WHERE e.department_id = d.id;\n"));
        assert_eq!(execute_sql(&sql, &employee_catalog()).unwrap().len(), 3);
    }

    #[test]
    fn duplicate_input_aliases_are_rejected() {
        assert_eq!(
            execute_sql(
                "SELECT e.name FROM employees AS e, departments AS e WHERE TRUE;",
                &employee_catalog(),
            )
            .unwrap_err(),
            "duplicate table or alias: e"
        );
    }

    #[test]
    fn duplicate_output_names_are_rejected() {
        assert_eq!(
            execute_sql(
                "SELECT e.name, d.name FROM employees AS e, departments AS d WHERE TRUE;",
                &employee_catalog(),
            )
            .unwrap_err(),
            "duplicate output column: name"
        );
    }
}
