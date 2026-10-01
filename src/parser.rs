use std::fmt;

use crate::expression::{BinaryOp, Expr, UnaryOp};
use crate::lexer::{Token, tokenize};
use crate::row::Value;

#[derive(Debug, PartialEq, Eq)]
pub struct Query {
    pub projections: Vec<SelectExpression>,
    pub tables: Vec<TableReference>,
    pub filter: Expr,
}

#[derive(Debug, PartialEq, Eq)]
pub struct SelectExpression {
    pub expression: Expr,
    pub alias: Option<String>,
}

#[derive(Debug, PartialEq, Eq)]
pub struct TableReference {
    pub name: String,
    pub alias: Option<String>,
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
        let projections = self.parse_select_list()?;
        self.expect(Token::From, "expected FROM after select list")?;
        let tables = self.parse_table_list()?;
        self.expect(Token::Where, "expected WHERE after table list")?;
        let filter = self.parse_expression()?;
        self.expect(Token::Semicolon, "expected ; after query")?;
        if self.current != self.tokens.len() {
            return Err(ParseError("unexpected token after ;".into()));
        }
        Ok(Query {
            projections,
            tables,
            filter,
        })
    }

    fn parse_select_list(&mut self) -> Result<Vec<SelectExpression>, ParseError> {
        let mut expressions = vec![self.parse_select_expression()?];
        while self.consume(&Token::Comma) {
            expressions.push(self.parse_select_expression()?);
        }
        Ok(expressions)
    }

    fn parse_select_expression(&mut self) -> Result<SelectExpression, ParseError> {
        Ok(SelectExpression {
            expression: self.parse_expression()?,
            alias: self.parse_alias()?,
        })
    }

    fn parse_table_list(&mut self) -> Result<Vec<TableReference>, ParseError> {
        let mut tables = vec![self.parse_table_reference()?];
        while self.consume(&Token::Comma) {
            tables.push(self.parse_table_reference()?);
        }
        Ok(tables)
    }

    fn parse_table_reference(&mut self) -> Result<TableReference, ParseError> {
        Ok(TableReference {
            name: self.identifier("expected a table name")?,
            alias: self.parse_alias()?,
        })
    }

    fn parse_alias(&mut self) -> Result<Option<String>, ParseError> {
        let alias = if self.consume(&Token::As) {
            Some(self.identifier("expected an alias after AS")?)
        } else if matches!(self.peek(), Some(Token::Identifier(_))) {
            Some(self.identifier("expected a table alias")?)
        } else {
            None
        };
        Ok(alias)
    }

    fn binary(left: Expr, op: BinaryOp, right: Expr) -> Expr {
        Expr::Binary {
            left: Box::new(left),
            op,
            right: Box::new(right),
        }
    }

    fn parse_expression(&mut self) -> Result<Expr, ParseError> {
        self.parse_or_expression()
    }

    fn parse_or_expression(&mut self) -> Result<Expr, ParseError> {
        let mut expression = self.parse_and_expression()?;
        while self.consume(&Token::Or) {
            expression = Self::binary(expression, BinaryOp::Or, self.parse_and_expression()?);
        }
        Ok(expression)
    }

    fn parse_and_expression(&mut self) -> Result<Expr, ParseError> {
        let mut expression = self.parse_not_expression()?;
        while self.consume(&Token::And) {
            expression = Self::binary(expression, BinaryOp::And, self.parse_not_expression()?);
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
        if let Some(op) = self.parse_comparison_operator() {
            return Ok(Self::binary(left, op, self.parse_additive()?));
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

    fn parse_comparison_operator(&mut self) -> Option<BinaryOp> {
        if self.consume(&Token::Equal) {
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
        }
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
                Some(op) => expression = Self::binary(expression, op, self.parse_term()?),
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
                Some(op) => expression = Self::binary(expression, op, self.parse_factor()?),
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
            Some(Token::Identifier(_)) => self.parse_column_reference(),
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

    fn parse_column_reference(&mut self) -> Result<Expr, ParseError> {
        let first = self.identifier("expected a column name")?;
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
        } = query.projections[0].expression.clone()
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
        assert_eq!(query.tables[0].name, "employees");
        assert_eq!(query.tables[0].alias.as_deref(), Some("e"));
        assert!(matches!(query.filter, Expr::IsNull { negated: true, .. }));
    }

    #[test]
    fn parses_boolean_literals() {
        let query = parse("SELECT TRUE FROM employees WHERE FALSE;").unwrap();
        assert_eq!(
            query.projections[0].expression.clone(),
            Expr::Literal(crate::row::Value::Boolean(true))
        );
        assert_eq!(
            query.filter,
            Expr::Literal(crate::row::Value::Boolean(false))
        );
    }

    #[test]
    fn requires_the_semicolon() {
        assert_eq!(
            parse("SELECT name FROM employees WHERE salary > 50000")
                .unwrap_err()
                .to_string(),
            "expected ; after query"
        );
    }

    #[test]
    fn rejects_tokens_after_the_query() {
        assert_eq!(
            parse("SELECT name FROM employees WHERE salary > 50000; extra")
                .unwrap_err()
                .to_string(),
            "unexpected token after ;"
        );
    }

    #[test]
    fn parses_multiple_projections_and_tables() {
        let query = parse(
            "SELECT e.name AS employee_name, d.name department_name \
             FROM employees AS e, departments d \
             WHERE e.department_id = d.id;",
        )
        .unwrap();

        assert_eq!(query.projections.len(), 2);
        assert_eq!(query.projections[0].alias.as_deref(), Some("employee_name"));
        assert_eq!(
            query.projections[1].alias.as_deref(),
            Some("department_name")
        );
        assert_eq!(query.tables.len(), 2);
        assert_eq!(query.tables[0].alias.as_deref(), Some("e"));
        assert_eq!(query.tables[1].alias.as_deref(), Some("d"));
    }
}
