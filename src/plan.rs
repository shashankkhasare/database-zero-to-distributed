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
}
