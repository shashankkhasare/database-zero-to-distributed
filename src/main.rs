mod plan;
mod row;

use plan::Plan;
use row::{Row, Value};

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

fn main() {
    let plan = Plan::Project {
        columns: vec!["name".to_string()],
        input: Box::new(Plan::Filter {
            column: "salary".to_string(),
            greater_than: 50_000,
            input: Box::new(Plan::Scan {
                rows: employee_rows(),
            }),
        }),
    };

    println!("Employees earning more than 50,000:");
    for row in plan.execute() {
        println!("{row}");
    }
}
