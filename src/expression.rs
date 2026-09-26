use crate::row::{Row, Value};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DataType {
    Integer,
    Text,
    Boolean,
    Null,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum UnaryOp {
    Plus,
    Minus,
    Not,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum BinaryOp {
    Add,
    Subtract,
    Multiply,
    Divide,
    Equal,
    NotEqual,
    Less,
    LessOrEqual,
    Greater,
    GreaterOrEqual,
    And,
    Or,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Expr {
    Column {
        qualifier: Option<String>,
        name: String,
    },
    Literal(Value),
    Unary {
        op: UnaryOp,
        expression: Box<Expr>,
    },
    Binary {
        left: Box<Expr>,
        op: BinaryOp,
        right: Box<Expr>,
    },
    IsNull {
        expression: Box<Expr>,
        negated: bool,
    },
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum BoundExpr {
    Column(String),
    Literal(Value),
    Unary {
        op: UnaryOp,
        expression: Box<BoundExpr>,
    },
    Binary {
        left: Box<BoundExpr>,
        op: BinaryOp,
        right: Box<BoundExpr>,
    },
    IsNull {
        expression: Box<BoundExpr>,
        negated: bool,
    },
}

impl BoundExpr {
    pub fn evaluate(&self, row: &Row) -> Result<Value, String> {
        match self {
            BoundExpr::Column(name) => row
                .get(name)
                .cloned()
                .ok_or_else(|| format!("bound column is missing at execution: {name}")),
            BoundExpr::Literal(value) => Ok(value.clone()),
            BoundExpr::Unary { op, expression } => {
                let value = expression.evaluate(row)?;
                evaluate_unary(op, value)
            }
            BoundExpr::Binary { left, op, right } => {
                let left = left.evaluate(row)?;
                let right = right.evaluate(row)?;
                evaluate_binary(left, op, right)
            }
            BoundExpr::IsNull {
                expression,
                negated,
            } => {
                let is_null = expression.evaluate(row)? == Value::Null;
                Ok(Value::Boolean(if *negated { !is_null } else { is_null }))
            }
        }
    }
}

fn evaluate_unary(op: &UnaryOp, value: Value) -> Result<Value, String> {
    match (op, value) {
        (_, Value::Null) => Ok(Value::Null),
        (UnaryOp::Plus, Value::Integer(value)) => Ok(Value::Integer(value)),
        (UnaryOp::Minus, Value::Integer(value)) => Ok(Value::Integer(-value)),
        (UnaryOp::Not, Value::Boolean(value)) => Ok(Value::Boolean(!value)),
        _ => Err("bound unary expression received an invalid value".to_string()),
    }
}

fn evaluate_binary(left: Value, op: &BinaryOp, right: Value) -> Result<Value, String> {
    if left == Value::Null || right == Value::Null {
        return match op {
            BinaryOp::And => and(left, right),
            BinaryOp::Or => or(left, right),
            _ => Ok(Value::Null),
        };
    }

    match (left, op, right) {
        (Value::Integer(left), BinaryOp::Add, Value::Integer(right)) => {
            Ok(Value::Integer(left + right))
        }
        (Value::Integer(left), BinaryOp::Subtract, Value::Integer(right)) => {
            Ok(Value::Integer(left - right))
        }
        (Value::Integer(left), BinaryOp::Multiply, Value::Integer(right)) => {
            Ok(Value::Integer(left * right))
        }
        (Value::Integer(_), BinaryOp::Divide, Value::Integer(0)) => {
            Err("division by zero".to_string())
        }
        (Value::Integer(left), BinaryOp::Divide, Value::Integer(right)) => {
            Ok(Value::Integer(left / right))
        }
        (Value::Integer(left), op, Value::Integer(right)) => compare(left, op, right),
        (Value::Text(left), op, Value::Text(right)) => compare(left, op, right),
        (Value::Boolean(left), BinaryOp::Equal, Value::Boolean(right)) => {
            Ok(Value::Boolean(left == right))
        }
        (Value::Boolean(left), BinaryOp::NotEqual, Value::Boolean(right)) => {
            Ok(Value::Boolean(left != right))
        }
        (Value::Boolean(left), BinaryOp::And, Value::Boolean(right)) => {
            Ok(Value::Boolean(left && right))
        }
        (Value::Boolean(left), BinaryOp::Or, Value::Boolean(right)) => {
            Ok(Value::Boolean(left || right))
        }
        _ => Err("bound binary expression received invalid values".to_string()),
    }
}

fn compare<T: PartialEq + PartialOrd>(left: T, op: &BinaryOp, right: T) -> Result<Value, String> {
    let result = match op {
        BinaryOp::Equal => left == right,
        BinaryOp::NotEqual => left != right,
        BinaryOp::Less => left < right,
        BinaryOp::LessOrEqual => left <= right,
        BinaryOp::Greater => left > right,
        BinaryOp::GreaterOrEqual => left >= right,
        _ => return Err("bound comparison received an invalid operator".to_string()),
    };
    Ok(Value::Boolean(result))
}

fn and(left: Value, right: Value) -> Result<Value, String> {
    match (left, right) {
        (Value::Boolean(false), _) | (_, Value::Boolean(false)) => Ok(Value::Boolean(false)),
        (Value::Boolean(true), Value::Boolean(true)) => Ok(Value::Boolean(true)),
        (Value::Boolean(true), Value::Null)
        | (Value::Null, Value::Boolean(true))
        | (Value::Null, Value::Null) => Ok(Value::Null),
        _ => Err("AND received a non-Boolean value".to_string()),
    }
}

fn or(left: Value, right: Value) -> Result<Value, String> {
    match (left, right) {
        (Value::Boolean(true), _) | (_, Value::Boolean(true)) => Ok(Value::Boolean(true)),
        (Value::Boolean(false), Value::Boolean(false)) => Ok(Value::Boolean(false)),
        (Value::Boolean(false), Value::Null)
        | (Value::Null, Value::Boolean(false))
        | (Value::Null, Value::Null) => Ok(Value::Null),
        _ => Err("OR received a non-Boolean value".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::{BinaryOp, BoundExpr};
    use crate::row::{Row, Value};

    fn evaluate(left: Value, op: BinaryOp, right: Value) -> Value {
        BoundExpr::Binary {
            left: Box::new(BoundExpr::Literal(left)),
            op,
            right: Box::new(BoundExpr::Literal(right)),
        }
        .evaluate(&Row::new(vec![]))
        .unwrap()
    }

    #[test]
    fn three_valued_and_and_or_follow_sql_rules() {
        assert_eq!(
            evaluate(Value::Boolean(false), BinaryOp::And, Value::Null),
            Value::Boolean(false)
        );
        assert_eq!(
            evaluate(Value::Boolean(true), BinaryOp::And, Value::Null),
            Value::Null
        );
        assert_eq!(
            evaluate(Value::Boolean(true), BinaryOp::Or, Value::Null),
            Value::Boolean(true)
        );
        assert_eq!(
            evaluate(Value::Boolean(false), BinaryOp::Or, Value::Null),
            Value::Null
        );
    }

    #[test]
    fn comparisons_with_null_are_unknown() {
        assert_eq!(
            evaluate(Value::Integer(1), BinaryOp::Equal, Value::Null),
            Value::Null
        );
    }

    #[test]
    fn boolean_equality_produces_a_boolean() {
        assert_eq!(
            evaluate(Value::Boolean(true), BinaryOp::Equal, Value::Boolean(false)),
            Value::Boolean(false)
        );
    }
}
