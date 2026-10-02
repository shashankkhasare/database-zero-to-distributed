use crate::expression::{BinaryOp, BoundExpr, DataType, Expr, UnaryOp};
use crate::parser::{Query, SelectItem};
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
}

fn require_type(actual: &DataType, expected: &DataType, message: &str) -> Result<(), String> {
    if actual == expected || actual == &DataType::Null {
        Ok(())
    } else {
        Err(format!("{message}: found {actual:?}"))
    }
}

fn require_matching_types(left: &DataType, right: &DataType) -> Result<(), String> {
    if left == &DataType::Null || right == &DataType::Null || left == right {
        Ok(())
    } else {
        Err(format!("cannot compare {left:?} with {right:?}"))
    }
}

fn require_ordered_type(data_type: &DataType) -> Result<(), String> {
    match data_type {
        DataType::Integer | DataType::Text | DataType::Null => Ok(()),
        _ => Err(format!(
            "ordered comparison requires integers or text: found {data_type:?}"
        )),
    }
}

struct Scope<'a> {
    table_name: &'a str,
    alias: Option<&'a str>,
    columns: &'a [Column],
}

fn require_qualifier(qualifier: Option<&str>, scope: &Scope<'_>) -> Result<(), String> {
    if let Some(qualifier) = qualifier {
        let expected = scope.alias.unwrap_or(scope.table_name);
        if qualifier != expected {
            return Err(format!("unknown table or alias: {qualifier}"));
        }
    }
    Ok(())
}

fn bind_expression(expression: Expr, scope: &Scope<'_>) -> Result<(BoundExpr, DataType), String> {
    match expression {
        Expr::Column { qualifier, name } => {
            require_qualifier(qualifier.as_deref(), scope)?;

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
                BinaryOp::Equal | BinaryOp::NotEqual => {
                    require_matching_types(&left_type, &right_type)?;
                    DataType::Boolean
                }
                BinaryOp::Less
                | BinaryOp::LessOrEqual
                | BinaryOp::Greater
                | BinaryOp::GreaterOrEqual => {
                    require_matching_types(&left_type, &right_type)?;
                    require_ordered_type(&left_type)?;
                    require_ordered_type(&right_type)?;
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

fn push_output(
    expressions: &mut Vec<ProjectExpression>,
    name: String,
    expression: BoundExpr,
) -> Result<(), String> {
    if expressions.iter().any(|existing| existing.name == name) {
        return Err(format!("duplicate output column: {name}"));
    }
    expressions.push(ProjectExpression { name, expression });
    Ok(())
}

impl Catalog {
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
        let mut expressions = Vec::new();
        for selected in query.projections {
            match selected {
                SelectItem::Expression { expression, alias } => {
                    let (expression, _) = bind_expression(expression, &scope)?;
                    let name = alias.unwrap_or_else(|| match &expression {
                        BoundExpr::Column(name) => name.clone(),
                        _ => "expression".into(),
                    });
                    push_output(&mut expressions, name, expression)?;
                }
                SelectItem::Wildcard { qualifier } => {
                    require_qualifier(qualifier.as_deref(), &scope)?;
                    for column in scope.columns {
                        push_output(
                            &mut expressions,
                            column.name.clone(),
                            BoundExpr::Column(column.name.clone()),
                        )?;
                    }
                }
            }
        }
        let (predicate, predicate_type) = bind_expression(query.filter, &scope)?;
        if !matches!(predicate_type, DataType::Boolean | DataType::Null) {
            return Err("WHERE expression must be Boolean".to_string());
        }

        Ok(Plan::Project {
            expressions,
            input: Box::new(Plan::Filter {
                predicate,
                input: Box::new(Plan::Scan {
                    rows: table.rows.clone(),
                }),
            }),
        })
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
        assert_eq!(
            catalog()
                .bind(parse("SELECT name FROM employees WHERE TRUE < FALSE;").unwrap())
                .unwrap_err(),
            "ordered comparison requires integers or text: found Boolean"
        );
    }

    #[test]
    fn binds_multiple_named_outputs() {
        let rows = catalog()
            .bind(
                parse(
                    "SELECT name AS employee_name, salary + 1000 AS raised_salary \
                     FROM employees WHERE TRUE;",
                )
                .unwrap(),
            )
            .unwrap()
            .execute()
            .unwrap();

        assert_eq!(
            rows,
            vec![Row::new(vec![
                ("employee_name", Value::Text("Ada".into())),
                ("raised_salary", Value::Integer(71_000)),
            ])]
        );
    }

    #[test]
    fn rejects_duplicate_output_names() {
        assert_eq!(
            catalog()
                .bind(parse("SELECT name, name FROM employees WHERE TRUE;").unwrap())
                .unwrap_err(),
            "duplicate output column: name"
        );
        assert_eq!(
            catalog()
                .bind(parse("SELECT *, name FROM employees WHERE TRUE;").unwrap())
                .unwrap_err(),
            "duplicate output column: name"
        );
    }

    #[test]
    fn expands_wildcards_in_catalog_order() {
        let rows = catalog()
            .bind(parse("SELECT * FROM employees WHERE TRUE;").unwrap())
            .unwrap()
            .execute()
            .unwrap();

        assert_eq!(
            rows,
            vec![Row::new(vec![
                ("name", Value::Text("Ada".into())),
                ("salary", Value::Integer(70_000)),
            ])]
        );
    }

    #[test]
    fn validates_a_qualified_wildcard() {
        assert!(
            catalog()
                .bind(parse("SELECT e.* FROM employees AS e WHERE TRUE;").unwrap())
                .is_ok()
        );
        assert_eq!(
            catalog()
                .bind(parse("SELECT x.* FROM employees AS e WHERE TRUE;").unwrap())
                .unwrap_err(),
            "unknown table or alias: x"
        );
    }
}
