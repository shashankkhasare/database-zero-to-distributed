mod plan;
mod row;

use plan::Plan;
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

    let plan = Plan::Project {
        columns: vec!["name".to_string()],
        input: Box::new(Plan::Filter {
            column: "salary".to_string(),
            greater_than: 50_000,
            input: Box::new(Plan::Scan { rows: employees }),
        }),
    };

    println!("Employees earning more than 50,000:");
    for row in plan.execute() {
        println!("{row}");
    }
}
