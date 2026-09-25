use std::fmt;

use crate::expression::{BinaryOp, Expr, UnaryOp};
use crate::lexer::{Token, tokenize};
use crate::row::Value;

#[derive(Debug, PartialEq, Eq)]
pub struct Query {
    pub projection: Expr,
    pub table: String,
    pub table_alias: Option<String>,
    pub filter: Expr,
}

#[derive(Debug, PartialEq, Eq)]
pub struct ParseError(String);

impl fmt::Display for ParseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

pub fn parse(sql: &str) -> Result<Query, ParseError> {
    let tokens = tokenize(sql).map_err(|error| ParseError(error.to_string()))?;
    Parser { tokens, current: 0 }.parse_query()
}

struct Parser {
    tokens: Vec<Token>,
    current: usize,
}

impl Parser {
    fn parse_query(&mut self) -> Result<Query, ParseError> {
        self.expect(Token::Select, "expected SELECT at start of query")?;
        let projection = self.parse_expression()?;
        self.expect(Token::From, "expected FROM after selected expression")?;
        let table = self.identifier("expected a table name after FROM")?;
        let table_alias = if self.consume(&Token::As) {
            Some(self.identifier("expected an alias after AS")?)
        } else if matches!(self.peek(), Some(Token::Identifier(_))) {
            Some(self.identifier("expected a table alias")?)
        } else {
            None
        };
        self.expect(Token::Where, "expected WHERE after table name")?;
        let filter = self.parse_expression()?;
        self.expect(Token::Semicolon, "expected ; after query")?;
        if self.current != self.tokens.len() {
            return Err(ParseError("unexpected token after ;".into()));
        }
        Ok(Query {
            projection,
            table,
            table_alias,
            filter,
        })
    }

    fn parse_expression(&mut self) -> Result<Expr, ParseError> {
        self.parse_or_expression()
    }

    fn parse_or_expression(&mut self) -> Result<Expr, ParseError> {
        let mut expression = self.parse_and_expression()?;
        while self.consume(&Token::Or) {
            expression = binary(expression, BinaryOp::Or, self.parse_and_expression()?);
        }
        Ok(expression)
    }

    fn parse_and_expression(&mut self) -> Result<Expr, ParseError> {
        let mut expression = self.parse_not_expression()?;
        while self.consume(&Token::And) {
            expression = binary(expression, BinaryOp::And, self.parse_not_expression()?);
        }
        Ok(expression)
    }

    fn parse_not_expression(&mut self) -> Result<Expr, ParseError> {
        if self.consume(&Token::Not) {
            return Ok(Expr::Unary {
                op: UnaryOp::Not,
                expression: Box::new(self.parse_not_expression()?),
            });
        }
        self.parse_predicate()
    }

    fn parse_predicate(&mut self) -> Result<Expr, ParseError> {
        let left = self.parse_additive()?;
        let op = if self.consume(&Token::Equal) {
            Some(BinaryOp::Equal)
        } else if self.consume(&Token::NotEqual) {
            Some(BinaryOp::NotEqual)
        } else if self.consume(&Token::Less) {
            Some(BinaryOp::Less)
        } else if self.consume(&Token::LessOrEqual) {
            Some(BinaryOp::LessOrEqual)
        } else if self.consume(&Token::Greater) {
            Some(BinaryOp::Greater)
        } else if self.consume(&Token::GreaterOrEqual) {
            Some(BinaryOp::GreaterOrEqual)
        } else {
            None
        };
        if let Some(op) = op {
            return Ok(binary(left, op, self.parse_additive()?));
        }

        if self.consume(&Token::Is) {
            let negated = self.consume(&Token::Not);
            self.expect(Token::Null, "expected NULL after IS")?;
            return Ok(Expr::IsNull {
                expression: Box::new(left),
                negated,
            });
        }

        Ok(left)
    }

    fn parse_additive(&mut self) -> Result<Expr, ParseError> {
        let mut expression = self.parse_term()?;
        loop {
            let op = if self.consume(&Token::Plus) {
                Some(BinaryOp::Add)
            } else if self.consume(&Token::Minus) {
                Some(BinaryOp::Subtract)
            } else {
                None
            };
            match op {
                Some(op) => expression = binary(expression, op, self.parse_term()?),
                None => break,
            }
        }
        Ok(expression)
    }

    fn parse_term(&mut self) -> Result<Expr, ParseError> {
        let mut expression = self.parse_factor()?;
        loop {
            let op = if self.consume(&Token::Star) {
                Some(BinaryOp::Multiply)
            } else if self.consume(&Token::Slash) {
                Some(BinaryOp::Divide)
            } else {
                None
            };
            match op {
                Some(op) => expression = binary(expression, op, self.parse_factor()?),
                None => break,
            }
        }
        Ok(expression)
    }

    fn parse_factor(&mut self) -> Result<Expr, ParseError> {
        if self.consume(&Token::Plus) {
            return Ok(Expr::Unary {
                op: UnaryOp::Plus,
                expression: Box::new(self.parse_factor()?),
            });
        }
        if self.consume(&Token::Minus) {
            return Ok(Expr::Unary {
                op: UnaryOp::Minus,
                expression: Box::new(self.parse_factor()?),
            });
        }
        self.parse_primary()
    }

    fn parse_primary(&mut self) -> Result<Expr, ParseError> {
        match self.peek().cloned() {
            Some(Token::Identifier(first)) => {
                self.current += 1;
                if self.consume(&Token::Dot) {
                    let name = self.identifier("expected a column name after .")?;
                    Ok(Expr::Column {
                        qualifier: Some(first),
                        name,
                    })
                } else {
                    Ok(Expr::Column {
                        qualifier: None,
                        name: first,
                    })
                }
            }
            Some(Token::Integer(value)) => {
                self.current += 1;
                Ok(Expr::Literal(Value::Integer(value)))
            }
            Some(Token::String(value)) => {
                self.current += 1;
                Ok(Expr::Literal(Value::Text(value)))
            }
            Some(Token::Null) => {
                self.current += 1;
                Ok(Expr::Literal(Value::Null))
            }
            Some(Token::True) => {
                self.current += 1;
                Ok(Expr::Literal(Value::Boolean(true)))
            }
            Some(Token::False) => {
                self.current += 1;
                Ok(Expr::Literal(Value::Boolean(false)))
            }
            Some(Token::LeftParen) => {
                self.current += 1;
                let expression = self.parse_expression()?;
                self.expect(Token::RightParen, "expected ) after expression")?;
                Ok(expression)
            }
            _ => Err(ParseError("expected an expression".into())),
        }
    }

    fn peek(&self) -> Option<&Token> {
        self.tokens.get(self.current)
    }
    fn consume(&mut self, token: &Token) -> bool {
        if self.peek() == Some(token) {
            self.current += 1;
            true
        } else {
            false
        }
    }
    fn expect(&mut self, token: Token, message: &str) -> Result<(), ParseError> {
        if self.consume(&token) {
            Ok(())
        } else {
            Err(ParseError(message.into()))
        }
    }
    fn identifier(&mut self, message: &str) -> Result<String, ParseError> {
        match self.peek().cloned() {
            Some(Token::Identifier(value)) => {
                self.current += 1;
                Ok(value)
            }
            _ => Err(ParseError(message.into())),
        }
    }
}

fn binary(left: Expr, op: BinaryOp, right: Expr) -> Expr {
    Expr::Binary {
        left: Box::new(left),
        op,
        right: Box::new(right),
    }
}

#[cfg(test)]
mod tests {
    use super::parse;
    use crate::expression::{BinaryOp, Expr};

    #[test]
    fn multiplication_binds_more_tightly_than_addition() {
        let query = parse("SELECT salary + 2 * 3 FROM employees WHERE salary > 0;").unwrap();
        let Expr::Binary {
            op: BinaryOp::Add,
            right,
            ..
        } = query.projection
        else {
            panic!("expected addition")
        };
        assert!(matches!(
            *right,
            Expr::Binary {
                op: BinaryOp::Multiply,
                ..
            }
        ));
    }

    #[test]
    fn parses_aliases_qualified_columns_and_null_predicates() {
        let query = parse("SELECT e.name FROM employees AS e WHERE e.name IS NOT NULL;").unwrap();
        assert_eq!(query.table, "employees");
        assert_eq!(query.table_alias.as_deref(), Some("e"));
        assert!(matches!(query.filter, Expr::IsNull { negated: true, .. }));
    }

    #[test]
    fn parses_boolean_literals() {
        let query = parse("SELECT TRUE FROM employees WHERE FALSE;").unwrap();
        assert_eq!(
            query.projection,
            Expr::Literal(crate::row::Value::Boolean(true))
        );
        assert_eq!(
            query.filter,
            Expr::Literal(crate::row::Value::Boolean(false))
        );
    }
}
