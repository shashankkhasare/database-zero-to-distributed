use crate::expression::BoundExpr;
use crate::parser::JoinKind;
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
        kind: JoinKind,
        condition: Option<BoundExpr>,
        left_columns: Vec<String>,
        right_columns: Vec<String>,
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
            Plan::Join {
                kind,
                condition,
                left_columns,
                right_columns,
                left,
                right,
            } => {
                let left_rows = left.execute()?;
                let right_rows = right.execute()?;
                let mut output = Vec::new();
                let mut matched_right = vec![false; right_rows.len()];

                for left_row in &left_rows {
                    let mut matched_left = false;
                    for (right_index, right_row) in right_rows.iter().enumerate() {
                        let row = left_row.combine(right_row);
                        let matches = match condition {
                            Some(condition) => match condition.evaluate(&row)? {
                                Value::Boolean(value) => value,
                                Value::Null => false,
                                _ => return Err("ON expression did not produce a Boolean".into()),
                            },
                            None => true,
                        };
                        if matches {
                            matched_left = true;
                            matched_right[right_index] = true;
                            output.push(row);
                        }
                    }
                    if !matched_left && matches!(kind, JoinKind::Left | JoinKind::Full) {
                        output.push(left_row.combine(&Row::nulls(right_columns)));
                    }
                }

                if matches!(kind, JoinKind::Right | JoinKind::Full) {
                    let null_left = Row::nulls(left_columns);
                    for (matched, right_row) in matched_right.iter().zip(&right_rows) {
                        if !matched {
                            output.push(null_left.combine(right_row));
                        }
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
    use crate::parser::JoinKind;
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
            kind: JoinKind::Inner,
            condition: None,
            left_columns: vec!["employee".into()],
            right_columns: vec!["department".into()],
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

    #[test]
    fn full_join_preserves_unmatched_rows_on_both_sides() {
        let plan = Plan::Join {
            kind: JoinKind::Full,
            condition: Some(BoundExpr::Literal(Value::Boolean(false))),
            left_columns: vec!["employee".into()],
            right_columns: vec!["department".into()],
            left: Box::new(Plan::Scan {
                rows: vec![Row::new(vec![("employee", Value::Text("Edsger".into()))])],
            }),
            right: Box::new(Plan::Scan {
                rows: vec![Row::new(vec![(
                    "department",
                    Value::Text("Operations".into()),
                )])],
            }),
        };

        assert_eq!(
            plan.execute().unwrap(),
            vec![
                Row::new(vec![
                    ("employee", Value::Text("Edsger".into())),
                    ("department", Value::Null),
                ]),
                Row::new(vec![
                    ("employee", Value::Null),
                    ("department", Value::Text("Operations".into())),
                ]),
            ]
        );
    }

    #[test]
    fn left_join_preserves_rows_when_the_right_input_is_empty() {
        let plan = Plan::Join {
            kind: JoinKind::Left,
            condition: Some(BoundExpr::Literal(Value::Boolean(true))),
            left_columns: vec!["employee".into()],
            right_columns: vec!["department".into()],
            left: Box::new(Plan::Scan {
                rows: vec![Row::new(vec![("employee", Value::Text("Ada".into()))])],
            }),
            right: Box::new(Plan::Scan { rows: vec![] }),
        };

        assert_eq!(
            plan.execute().unwrap(),
            vec![Row::new(vec![
                ("employee", Value::Text("Ada".into())),
                ("department", Value::Null),
            ])]
        );
    }
}
