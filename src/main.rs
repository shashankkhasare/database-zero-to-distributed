mod lexer;
mod parser;
mod plan;
mod row;

use parser::parse;
use row::{Row, Value};

fn main() {
    let employees = vec![
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
    ];

    let sql = "SELECT name FROM employees WHERE salary > 50000;";
    let plan = parse(sql)
        .expect("the lesson query should parse")
        .into_plan(employees);

    println!("Employees earning more than 50,000:");
    for row in plan.execute() {
        println!("{row}");
    }
}
