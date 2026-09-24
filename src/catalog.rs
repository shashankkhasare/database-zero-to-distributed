use crate::expression::{BinaryOp, BoundExpr, DataType, Expr, UnaryOp};
use crate::parser::Query;
use crate::plan::{Plan, ProjectExpression};
use crate::row::Row;

#[derive(Clone)]
pub struct Column {
    pub name: String,
    pub data_type: DataType,
}

#[derive(Clone)]
pub struct Table {
    pub name: String,
    pub columns: Vec<Column>,
    pub rows: Vec<Row>,
}

pub struct Catalog {
    tables: Vec<Table>,
}

impl Catalog {
    pub fn new(tables: Vec<Table>) -> Self {
        Self { tables }
    }

    pub fn bind(&self, query: Query) -> Result<Plan, String> {
        let table = self
            .tables
            .iter()
            .find(|table| table.name == query.table)
            .ok_or_else(|| format!("unknown table: {}", query.table))?;
        let scope = Scope {
            table_name: &table.name,
            alias: query.table_alias.as_deref(),
            columns: &table.columns,
        };
        let (projection, _) = bind_expression(query.projection, &scope)?;
        let projection_name = match &projection {
            BoundExpr::Column(name) => name.clone(),
            _ => "expression".into(),
        };
        let (predicate, predicate_type) = bind_expression(query.filter, &scope)?;
        if predicate_type != DataType::Boolean && predicate_type != DataType::Null {
            return Err("WHERE expression must be Boolean".into());
        }
        Ok(Plan::Project {
            expressions: vec![ProjectExpression {
                name: projection_name,
                expression: projection,
            }],
            input: Box::new(Plan::Filter {
                predicate,
                input: Box::new(Plan::Scan {
                    rows: table.rows.clone(),
                }),
            }),
        })
    }
}

struct Scope<'a> {
    table_name: &'a str,
    alias: Option<&'a str>,
    columns: &'a [Column],
}

fn bind_expression(expression: Expr, scope: &Scope<'_>) -> Result<(BoundExpr, DataType), String> {
    match expression {
        Expr::Column { qualifier, name } => {
            if let Some(qualifier) = qualifier {
                let expected = scope.alias.unwrap_or(scope.table_name);
                if qualifier != expected {
                    return Err(format!("unknown table or alias: {qualifier}"));
                }
            }
            let column = scope
                .columns
                .iter()
                .find(|column| column.name == name)
                .ok_or_else(|| format!("unknown column: {name}"))?;
            Ok((BoundExpr::Column(name), column.data_type.clone()))
        }
        Expr::Literal(value) => {
            let data_type = match &value {
                crate::row::Value::Integer(_) => DataType::Integer,
                crate::row::Value::Text(_) => DataType::Text,
                crate::row::Value::Boolean(_) => DataType::Boolean,
                crate::row::Value::Null => DataType::Null,
            };
            Ok((BoundExpr::Literal(value), data_type))
        }
        Expr::Unary { op, expression } => {
            let (expression, data_type) = bind_expression(*expression, scope)?;
            let expected = match op {
                UnaryOp::Not => DataType::Boolean,
                _ => DataType::Integer,
            };
            require_type(&data_type, &expected, "invalid unary operand")?;
            Ok((
                BoundExpr::Unary {
                    op,
                    expression: Box::new(expression),
                },
                expected,
            ))
        }
        Expr::Binary { left, op, right } => {
            let (left, left_type) = bind_expression(*left, scope)?;
            let (right, right_type) = bind_expression(*right, scope)?;
            let result_type = match op {
                BinaryOp::Add | BinaryOp::Subtract | BinaryOp::Multiply | BinaryOp::Divide => {
                    require_type(
                        &left_type,
                        &DataType::Integer,
                        "arithmetic requires integers",
                    )?;
                    require_type(
                        &right_type,
                        &DataType::Integer,
                        "arithmetic requires integers",
                    )?;
                    DataType::Integer
                }
                BinaryOp::And | BinaryOp::Or => {
                    require_type(
                        &left_type,
                        &DataType::Boolean,
                        "AND and OR require Boolean expressions",
                    )?;
                    require_type(
                        &right_type,
                        &DataType::Boolean,
                        "AND and OR require Boolean expressions",
                    )?;
                    DataType::Boolean
                }
                _ => {
                    if left_type != DataType::Null
                        && right_type != DataType::Null
                        && left_type != right_type
                    {
                        return Err(format!("cannot compare {left_type:?} with {right_type:?}"));
                    }
                    DataType::Boolean
                }
            };
            Ok((
                BoundExpr::Binary {
                    left: Box::new(left),
                    op,
                    right: Box::new(right),
                },
                result_type,
            ))
        }
        Expr::IsNull {
            expression,
            negated,
        } => {
            let (expression, _) = bind_expression(*expression, scope)?;
            Ok((
                BoundExpr::IsNull {
                    expression: Box::new(expression),
                    negated,
                },
                DataType::Boolean,
            ))
        }
    }
}

fn require_type(actual: &DataType, expected: &DataType, message: &str) -> Result<(), String> {
    if actual == expected || actual == &DataType::Null {
        Ok(())
    } else {
        Err(format!("{message}: found {actual:?}"))
    }
}

#[cfg(test)]
mod tests {
    use super::{Catalog, Column, Table};
    use crate::expression::DataType;
    use crate::parser::parse;
    use crate::row::{Row, Value};

    fn catalog() -> Catalog {
        Catalog::new(vec![Table {
            name: "employees".into(),
            columns: vec![
                Column {
                    name: "name".into(),
                    data_type: DataType::Text,
                },
                Column {
                    name: "salary".into(),
                    data_type: DataType::Integer,
                },
            ],
            rows: vec![Row::new(vec![
                ("name", Value::Text("Ada".into())),
                ("salary", Value::Integer(70_000)),
            ])],
        }])
    }

    #[test]
    fn rejects_unknown_names_and_invalid_types() {
        assert_eq!(
            catalog()
                .bind(parse("SELECT name FROM missing WHERE salary > 0;").unwrap())
                .unwrap_err(),
            "unknown table: missing"
        );
        assert_eq!(
            catalog()
                .bind(parse("SELECT e.name FROM employees AS e WHERE x.salary > 0;").unwrap())
                .unwrap_err(),
            "unknown table or alias: x"
        );
        assert_eq!(
            catalog()
                .bind(parse("SELECT missing FROM employees WHERE salary > 0;").unwrap())
                .unwrap_err(),
            "unknown column: missing"
        );
        assert_eq!(
            catalog()
                .bind(parse("SELECT name FROM employees WHERE name + 1 > 0;").unwrap())
                .unwrap_err(),
            "arithmetic requires integers: found Text"
        );
    }
}
