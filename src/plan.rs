use crate::expression::BoundExpr;
use crate::row::{Row, Value};

#[derive(Debug)]
pub struct ProjectExpression {
    pub name: String,
    pub expression: BoundExpr,
}

#[derive(Debug)]
pub enum Plan {
    Scan {
        rows: Vec<Row>,
    },
    Join {
        left: Box<Plan>,
        right: Box<Plan>,
    },
    Filter {
        predicate: BoundExpr,
        input: Box<Plan>,
    },
    Project {
        expressions: Vec<ProjectExpression>,
        input: Box<Plan>,
    },
}

impl Plan {
    pub fn execute(&self) -> Result<Vec<Row>, String> {
        match self {
            Plan::Scan { rows } => Ok(rows.clone()),
            Plan::Join { left, right } => {
                let left_rows = left.execute()?;
                let right_rows = right.execute()?;
                let mut output = Vec::new();

                for left_row in &left_rows {
                    for right_row in &right_rows {
                        output.push(left_row.combine(right_row));
                    }
                }

                Ok(output)
            }
            Plan::Filter { predicate, input } => {
                let mut output = Vec::new();
                for row in input.execute()? {
                    match predicate.evaluate(&row)? {
                        Value::Boolean(true) => output.push(row),
                        Value::Boolean(false) | Value::Null => {}
                        _ => return Err("WHERE expression did not produce a Boolean".into()),
                    }
                }
                Ok(output)
            }
            Plan::Project { expressions, input } => {
                let mut output = Vec::new();
                for row in input.execute()? {
                    let mut values = Vec::new();
                    for expression in expressions {
                        values.push((
                            expression.name.clone(),
                            expression.expression.evaluate(&row)?,
                        ));
                    }
                    output.push(Row::from_owned(values));
                }
                Ok(output)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Plan;
    use crate::expression::{BinaryOp, BoundExpr};
    use crate::row::{Row, Value};

    #[test]
    fn unknown_predicates_remove_rows() {
        let plan = Plan::Filter {
            predicate: BoundExpr::Binary {
                left: Box::new(BoundExpr::Literal(Value::Null)),
                op: BinaryOp::Equal,
                right: Box::new(BoundExpr::Literal(Value::Integer(1))),
            },
            input: Box::new(Plan::Scan {
                rows: vec![Row::new(vec![("id", Value::Integer(1))])],
            }),
        };
        assert!(plan.execute().unwrap().is_empty());
    }

    #[test]
    fn join_pairs_every_left_row_with_every_right_row() {
        let plan = Plan::Join {
            left: Box::new(Plan::Scan {
                rows: vec![
                    Row::new(vec![("employee", Value::Text("Ada".into()))]),
                    Row::new(vec![("employee", Value::Text("Grace".into()))]),
                ],
            }),
            right: Box::new(Plan::Scan {
                rows: vec![
                    Row::new(vec![("department", Value::Text("Engineering".into()))]),
                    Row::new(vec![("department", Value::Text("Research".into()))]),
                ],
            }),
        };

        let rows = plan.execute().unwrap();

        assert_eq!(rows.len(), 4);
        assert_eq!(
            rows[0].value_at(0, "employee").cloned(),
            Ok(Value::Text("Ada".into()))
        );
        assert_eq!(
            rows[0].value_at(1, "department").cloned(),
            Ok(Value::Text("Engineering".into()))
        );
    }
}
