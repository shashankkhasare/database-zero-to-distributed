mod lexer;
mod parser;
mod plan;
mod row;

use std::io::{self, Write};

use parser::parse;
use row::{Row, Value};

fn main() {
    let employees = employee_rows();

    if std::env::args().nth(1).as_deref() == Some("--prompt") {
        run_prompt(&employees).expect("failed to read SQL from the terminal");
    } else {
        run_demo(&employees);
    }
}

fn employee(id: i64, name: &str, salary: i64) -> Row {
    Row::new(vec![
        ("id", Value::Integer(id)),
        ("name", Value::Text(name.to_string())),
        ("salary", Value::Integer(salary)),
    ])
}

fn employee_rows() -> Vec<Row> {
    vec![
        employee(1, "Ada", 70_000),
        employee(2, "Linus", 50_000),
        employee(3, "Grace", 72_000),
    ]
}

fn execute_sql(sql: &str, rows: &[Row]) -> Result<Vec<Row>, String> {
    let query = parse(sql).map_err(|error| error.to_string())?;
    Ok(query.into_plan(rows.to_vec()).execute())
}

fn run_demo(employees: &[Row]) {
    let sql = "SELECT name FROM employees WHERE salary > 50000;";
    let result = execute_sql(sql, employees).expect("the lesson query should execute");

    println!("Employees earning more than 50,000:");
    for row in result {
        println!("{row}");
    }
}

fn run_prompt(employees: &[Row]) -> io::Result<()> {
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
            print_query_result(&sql, employees);
        }
    }
}

fn append_sql_line(sql: &mut String, line: &str) -> bool {
    sql.push_str(line);
    line.trim_end().ends_with(';')
}

fn print_query_result(sql: &str, employees: &[Row]) {
    match execute_sql(sql, employees) {
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
    use super::{append_sql_line, employee_rows, execute_sql};
    use crate::row::{Row, Value};

    #[test]
    fn sql_entry_point_executes_repeated_queries_without_consuming_the_table() {
        let employees = employee_rows();

        let first = execute_sql(
            "SELECT name FROM employees WHERE salary > 50000;",
            &employees,
        )
        .unwrap();
        let second = execute_sql(
            "SELECT name FROM employees WHERE salary > 70000;",
            &employees,
        )
        .unwrap();

        assert_eq!(first.len(), 2);
        assert_eq!(second.len(), 1);
        assert_eq!(employees.len(), 3);
    }

    #[test]
    fn unresolved_table_name_still_uses_supplied_rows() {
        let employees = employee_rows();

        let result = execute_sql(
            "SELECT name FROM missing_table WHERE salary > 50000;",
            &employees,
        )
        .unwrap();

        assert_eq!(
            result,
            vec![
                Row::new(vec![("name", Value::Text("Ada".to_string()))]),
                Row::new(vec![("name", Value::Text("Grace".to_string()))]),
            ]
        );
    }

    #[test]
    fn prompt_collects_lines_until_the_statement_ends() {
        let mut sql = String::new();

        assert!(!append_sql_line(&mut sql, "SELECT name\n"));
        assert!(!append_sql_line(&mut sql, "FROM employees\n"));
        assert!(append_sql_line(&mut sql, "WHERE salary > 50000;\n"));
        assert_eq!(execute_sql(&sql, &employee_rows()).unwrap().len(), 2);
    }
}
