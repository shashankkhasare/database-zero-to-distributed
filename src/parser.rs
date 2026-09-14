use std::fmt;

use crate::lexer::{Token, tokenize};
use crate::plan::Plan;
use crate::row::Row;

#[derive(Debug, PartialEq, Eq)]
pub struct Query {
    pub selected_column: String,
    pub table: String,
    pub filter_column: String,
    pub greater_than: i64,
}

impl Query {
    pub fn into_plan(self, rows: Vec<Row>) -> Plan {
        // The parser records the table name, but cannot resolve it yet.
        // Lesson 004 introduces binding. For now the caller supplies the rows.
        Plan::Project {
            columns: vec![self.selected_column],
            input: Box::new(Plan::Filter {
                column: self.filter_column,
                greater_than: self.greater_than,
                input: Box::new(Plan::Scan { rows }),
            }),
        }
    }
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
    let mut parser = Parser { tokens, current: 0 };
    parser.query()
}

struct Parser {
    tokens: Vec<Token>,
    current: usize,
}

impl Parser {
    fn query(&mut self) -> Result<Query, ParseError> {
        let selected_column = self.parse_select_clause()?;
        let table = self.parse_from_clause()?;
        let (filter_column, greater_than) = self.parse_where_clause()?;
        self.expect(Token::Semicolon, "expected ; after query")?;

        if self.current != self.tokens.len() {
            return Err(ParseError("unexpected token after ;".to_string()));
        }

        Ok(Query {
            selected_column,
            table,
            filter_column,
            greater_than,
        })
    }

    fn parse_select_clause(&mut self) -> Result<String, ParseError> {
        self.expect(Token::Select, "expected SELECT")?;
        self.identifier("expected a column name after SELECT")
    }

    fn parse_from_clause(&mut self) -> Result<String, ParseError> {
        self.expect(Token::From, "expected FROM after selected column")?;
        self.identifier("expected a table name after FROM")
    }

    fn parse_where_clause(&mut self) -> Result<(String, i64), ParseError> {
        self.expect(Token::Where, "expected WHERE after table name")?;
        let column = self.identifier("expected a column name after WHERE")?;
        self.expect(Token::GreaterThan, "expected > after filter column")?;
        let value = self.integer("expected an integer after >")?;
        Ok((column, value))
    }

    fn expect(&mut self, expected: Token, message: &str) -> Result<(), ParseError> {
        if self.tokens.get(self.current) == Some(&expected) {
            self.current += 1;
            Ok(())
        } else {
            Err(ParseError(message.to_string()))
        }
    }

    fn identifier(&mut self, message: &str) -> Result<String, ParseError> {
        match self.tokens.get(self.current) {
            Some(Token::Identifier(value)) => {
                self.current += 1;
                Ok(value.clone())
            }
            _ => Err(ParseError(message.to_string())),
        }
    }

    fn integer(&mut self, message: &str) -> Result<i64, ParseError> {
        match self.tokens.get(self.current) {
            Some(Token::Integer(value)) => {
                self.current += 1;
                Ok(*value)
            }
            _ => Err(ParseError(message.to_string())),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{Query, parse};
    use crate::row::{Row, Value};

    #[test]
    fn parses_the_supported_query_shape() {
        assert_eq!(
            parse("SELECT name FROM employees WHERE salary > 50000;").unwrap(),
            Query {
                selected_column: "name".to_string(),
                table: "employees".to_string(),
                filter_column: "salary".to_string(),
                greater_than: 50_000,
            }
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
    fn parsed_sql_executes_the_employee_query() {
        let employees = vec![
            Row::new(vec![
                ("name", Value::Text("Ada".to_string())),
                ("salary", Value::Integer(70_000)),
            ]),
            Row::new(vec![
                ("name", Value::Text("Linus".to_string())),
                ("salary", Value::Integer(50_000)),
            ]),
            Row::new(vec![
                ("name", Value::Text("Grace".to_string())),
                ("salary", Value::Integer(72_000)),
            ]),
        ];

        let result = parse("SELECT name FROM employees WHERE salary > 50000;")
            .unwrap()
            .into_plan(employees)
            .execute();

        assert_eq!(
            result,
            vec![
                Row::new(vec![("name", Value::Text("Ada".to_string()))]),
                Row::new(vec![("name", Value::Text("Grace".to_string()))]),
            ]
        );
    }
}
