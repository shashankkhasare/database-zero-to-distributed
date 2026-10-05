use std::fmt;

use crate::expression::{BinaryOp, Expr, UnaryOp};
use crate::lexer::{Token, tokenize};
use crate::row::Value;

#[derive(Debug, PartialEq, Eq)]
pub struct Query {
    pub projections: Vec<SelectItem>,
    pub tables: Vec<TableReference>,
    pub filter: Option<Expr>,
}

#[derive(Debug, PartialEq, Eq)]
pub struct TableReference {
    pub first: TablePrimary,
    pub joins: Vec<JoinClause>,
}

#[derive(Debug, PartialEq, Eq)]
pub struct TablePrimary {
    pub name: String,
    pub alias: Option<String>,
}

#[derive(Debug, PartialEq, Eq)]
pub struct JoinClause {
    pub kind: JoinKind,
    pub right: TablePrimary,
    pub condition: Expr,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum JoinKind {
    Inner,
    Left,
    Right,
    Full,
}

#[derive(Debug, PartialEq, Eq)]
pub enum SelectItem {
    Wildcard {
        qualifier: Option<String>,
    },
    Expression {
        expression: Expr,
        alias: Option<String>,
    },
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
    fn peek(&self) -> Option<&Token> {
        self.tokens.get(self.current)
    }

    fn peek_at(&self, offset: usize) -> Option<&Token> {
        self.tokens.get(self.current + offset)
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
            Err(ParseError(message.to_string()))
        }
    }

    fn identifier(&mut self, message: &str) -> Result<String, ParseError> {
        match self.peek().cloned() {
            Some(Token::Identifier(value)) => {
                self.current += 1;
                Ok(value)
            }
            _ => Err(ParseError(message.to_string())),
        }
    }

    fn parse_query(&mut self) -> Result<Query, ParseError> {
        self.expect(Token::Select, "expected SELECT at start of query")?;
        let projections = self.parse_select_list()?;
        self.expect(Token::From, "expected FROM after select list")?;
        let tables = self.parse_table_list()?;
        let filter = if self.consume(&Token::Where) {
            Some(self.parse_expression()?)
        } else {
            None
        };
        self.expect(Token::Semicolon, "expected ; after query")?;
        if self.current != self.tokens.len() {
            return Err(ParseError("unexpected token after ;".to_string()));
        }
        Ok(Query {
            projections,
            tables,
            filter,
        })
    }

    fn parse_select_list(&mut self) -> Result<Vec<SelectItem>, ParseError> {
        let mut expressions = vec![self.parse_select_item()?];
        while self.consume(&Token::Comma) {
            expressions.push(self.parse_select_item()?);
        }
        Ok(expressions)
    }

    fn parse_select_item(&mut self) -> Result<SelectItem, ParseError> {
        if self.consume(&Token::Star) {
            return Ok(SelectItem::Wildcard { qualifier: None });
        }
        if let (Some(Token::Identifier(qualifier)), Some(Token::Dot), Some(Token::Star)) =
            (self.peek_at(0), self.peek_at(1), self.peek_at(2))
        {
            let qualifier = qualifier.clone();
            self.current += 3;
            return Ok(SelectItem::Wildcard {
                qualifier: Some(qualifier),
            });
        }
        Ok(SelectItem::Expression {
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
        let first = self.parse_table_primary()?;
        let mut joins = Vec::new();
        while matches!(
            self.peek(),
            Some(Token::Inner | Token::Left | Token::Right | Token::Full | Token::Join)
        ) {
            joins.push(self.parse_join_clause()?);
        }
        Ok(TableReference { first, joins })
    }

    fn parse_table_primary(&mut self) -> Result<TablePrimary, ParseError> {
        Ok(TablePrimary {
            name: self.identifier("expected a table name")?,
            alias: self.parse_alias()?,
        })
    }

    fn parse_join_clause(&mut self) -> Result<JoinClause, ParseError> {
        let kind = if self.consume(&Token::Inner) {
            JoinKind::Inner
        } else if self.consume(&Token::Left) {
            self.consume(&Token::Outer);
            JoinKind::Left
        } else if self.consume(&Token::Right) {
            self.consume(&Token::Outer);
            JoinKind::Right
        } else if self.consume(&Token::Full) {
            self.consume(&Token::Outer);
            JoinKind::Full
        } else {
            JoinKind::Inner
        };
        self.expect(Token::Join, "expected JOIN")?;
        let right = self.parse_table_primary()?;
        self.expect(Token::On, "expected ON after joined table")?;
        let condition = self.parse_expression()?;
        Ok(JoinClause {
            kind,
            right,
            condition,
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
            _ => Err(ParseError("expected an expression".to_string())),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{JoinKind, SelectItem, parse};
    use crate::expression::{BinaryOp, Expr};

    #[test]
    fn multiplication_binds_more_tightly_than_addition() {
        let query = parse("SELECT salary + 2 * 3 FROM employees WHERE salary > 0;").unwrap();
        let SelectItem::Expression { expression, .. } = &query.projections[0] else {
            panic!("expected a selected expression")
        };
        let Expr::Binary {
            op: BinaryOp::Add,
            right,
            ..
        } = expression
        else {
            panic!("expected addition")
        };
        assert!(matches!(
            **right,
            Expr::Binary {
                op: BinaryOp::Multiply,
                ..
            }
        ));
    }

    #[test]
    fn parses_aliases_qualified_columns_and_null_predicates() {
        let query = parse("SELECT e.name FROM employees AS e WHERE e.name IS NOT NULL;").unwrap();
        assert_eq!(query.tables[0].first.name, "employees");
        assert_eq!(query.tables[0].first.alias.as_deref(), Some("e"));
        assert!(matches!(
            query.filter,
            Some(Expr::IsNull { negated: true, .. })
        ));
    }

    #[test]
    fn parses_boolean_literals() {
        let query = parse("SELECT TRUE FROM employees WHERE FALSE;").unwrap();
        let SelectItem::Expression { expression, .. } = &query.projections[0] else {
            panic!("expected a selected expression")
        };
        assert_eq!(expression, &Expr::Literal(crate::row::Value::Boolean(true)));
        assert_eq!(
            query.filter,
            Some(Expr::Literal(crate::row::Value::Boolean(false)))
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
        assert!(matches!(
            &query.projections[0],
            SelectItem::Expression { alias: Some(alias), .. } if alias == "employee_name"
        ));
        assert!(matches!(
            &query.projections[1],
            SelectItem::Expression { alias: Some(alias), .. } if alias == "department_name"
        ));
        assert_eq!(query.tables.len(), 2);
        assert_eq!(query.tables[0].first.alias.as_deref(), Some("e"));
        assert_eq!(query.tables[1].first.alias.as_deref(), Some("d"));
    }

    #[test]
    fn parses_a_query_without_where() {
        let query = parse(
            "SELECT e.name, d.name AS department_name \
             FROM employees AS e, departments AS d;",
        )
        .unwrap();

        assert_eq!(query.tables.len(), 2);
        assert_eq!(query.filter, None);
    }

    #[test]
    fn parses_unqualified_and_qualified_wildcards() {
        let query = parse("SELECT *, e.* FROM employees AS e WHERE TRUE;").unwrap();

        assert_eq!(
            query.projections,
            vec![
                SelectItem::Wildcard { qualifier: None },
                SelectItem::Wildcard {
                    qualifier: Some("e".into()),
                },
            ]
        );
    }

    #[test]
    fn parses_explicit_join_kinds_and_conditions() {
        let query = parse(
            "SELECT e.name, d.name FROM employees AS e \
             FULL OUTER JOIN departments AS d ON e.department_id = d.id;",
        )
        .unwrap();

        assert_eq!(query.tables.len(), 1);
        assert_eq!(query.tables[0].first.name, "employees");
        assert_eq!(query.tables[0].joins.len(), 1);
        assert_eq!(query.tables[0].joins[0].kind, JoinKind::Full);
        assert_eq!(query.tables[0].joins[0].right.name, "departments");
        assert!(matches!(
            query.tables[0].joins[0].condition,
            Expr::Binary {
                op: BinaryOp::Equal,
                ..
            }
        ));
    }

    #[test]
    fn bare_join_means_inner_join() {
        let query = parse(
            "SELECT e.name FROM employees AS e \
             JOIN departments AS d ON e.department_id = d.id;",
        )
        .unwrap();

        assert_eq!(query.tables[0].joins[0].kind, JoinKind::Inner);
    }
}
