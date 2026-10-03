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

fn employee(id: i64, name: &str, salary: i64) -> Row {
    Row::new(vec![
        ("id", Value::Integer(id)),
        ("name", Value::Text(name.into())),
        ("salary", Value::Integer(salary)),
    ])
}

fn employee_catalog() -> Catalog {
    Catalog::new(vec![Table {
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
        ],
        rows: vec![
            employee(1, "Ada", 70_000),
            employee(2, "Linus", 50_000),
            employee(3, "Grace", 72_000),
        ],
    }])
}

fn execute_sql(sql: &str, catalog: &Catalog) -> Result<Vec<Row>, String> {
    let query = parse(sql).map_err(|error| error.to_string())?;
    catalog.bind(query)?.execute()
}

fn run_demo(catalog: &Catalog) {
    let sql = "SELECT e.name AS employee_name, \
        e.salary + 1000 AS raised_salary \
        FROM employees AS e \
        WHERE e.salary > 50000;";
    let rows = execute_sql(sql, catalog).expect("the lesson query should execute");
    println!("Employees with projected raises:");
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
    fn multiple_outputs_have_explicit_names() {
        assert_eq!(
            execute_sql(
                "SELECT name AS employee_name, salary + 1000 AS raised_salary \
                 FROM employees WHERE salary > 50000;",
                &employee_catalog(),
            )
            .unwrap(),
            vec![
                Row::new(vec![
                    ("employee_name", Value::Text("Ada".into())),
                    ("raised_salary", Value::Integer(71_000)),
                ]),
                Row::new(vec![
                    ("employee_name", Value::Text("Grace".into())),
                    ("raised_salary", Value::Integer(73_000)),
                ]),
            ]
        );
    }

    #[test]
    fn unnamed_computations_may_share_a_display_label() {
        assert_eq!(
            execute_sql(
                "SELECT salary + 1, salary + 1000 FROM employees WHERE id = 1;",
                &employee_catalog(),
            )
            .unwrap(),
            vec![Row::new(vec![
                ("expression", Value::Integer(70_001)),
                ("expression", Value::Integer(71_000)),
            ])]
        );
    }

    #[test]
    fn prompt_collects_lines_until_the_statement_ends() {
        let mut sql = String::new();

        assert!(!append_sql_line(
            &mut sql,
            "SELECT name AS employee_name, salary + 1000 AS raised_salary\n"
        ));
        assert!(!append_sql_line(&mut sql, "FROM employees\n"));
        assert!(append_sql_line(&mut sql, "WHERE salary > 50000;\n"));
        assert_eq!(execute_sql(&sql, &employee_catalog()).unwrap().len(), 2);
    }

    #[test]
    fn wildcard_projection_uses_catalog_column_order() {
        assert_eq!(
            execute_sql(
                "SELECT e.* FROM employees AS e WHERE e.id = 1;",
                &employee_catalog(),
            )
            .unwrap(),
            vec![Row::new(vec![
                ("id", Value::Integer(1)),
                ("name", Value::Text("Ada".into())),
                ("salary", Value::Integer(70_000)),
            ])]
        );
    }
}
