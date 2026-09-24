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
    let sql =
        "SELECT e.name FROM employees AS e WHERE e.salary + 5000 > 70000 AND e.name IS NOT NULL;";
    let rows = execute_sql(sql, catalog).expect("the lesson query should execute");
    println!("Employees matching the bound expression:");
    for row in rows {
        println!("{row}");
    }
}

fn run_prompt(catalog: &Catalog) -> io::Result<()> {
    loop {
        print!("sql> ");
        io::stdout().flush()?;
        let mut sql = String::new();
        if io::stdin().read_line(&mut sql)? == 0 {
            println!();
            return Ok(());
        }
        if !sql.trim().is_empty() {
            print_query_result(&sql, catalog);
        }
    }
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
    use super::{employee_catalog, execute_sql};
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
}
