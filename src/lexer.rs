use std::fmt;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Token {
    Select,
    From,
    Where,
    Identifier(String),
    GreaterThan,
    Integer(i64),
    Semicolon,
}

#[derive(Debug, PartialEq, Eq)]
pub struct LexError {
    position: usize,
    message: String,
}

impl fmt::Display for LexError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "at character {}: {}",
            self.position, self.message
        )
    }
}

pub fn tokenize(sql: &str) -> Result<Vec<Token>, LexError> {
    let characters: Vec<char> = sql.chars().collect();
    let mut tokens = Vec::new();
    let mut current = 0;

    while current < characters.len() {
        let character = characters[current];

        if character.is_whitespace() {
            current += 1;
        } else if character.is_ascii_alphabetic() || character == '_' {
            let start = current;
            current += 1;
            while current < characters.len()
                && (characters[current].is_ascii_alphanumeric() || characters[current] == '_')
            {
                current += 1;
            }

            let word: String = characters[start..current].iter().collect();
            let token = if word.eq_ignore_ascii_case("SELECT") {
                Token::Select
            } else if word.eq_ignore_ascii_case("FROM") {
                Token::From
            } else if word.eq_ignore_ascii_case("WHERE") {
                Token::Where
            } else {
                Token::Identifier(word)
            };
            tokens.push(token);
        } else if character.is_ascii_digit() {
            let start = current;
            current += 1;
            while current < characters.len() && characters[current].is_ascii_digit() {
                current += 1;
            }

            let digits: String = characters[start..current].iter().collect();
            let value = digits.parse().map_err(|_| LexError {
                position: start + 1,
                message: format!("integer is too large: {digits}"),
            })?;
            tokens.push(Token::Integer(value));
        } else {
            let token = match character {
                '>' => Token::GreaterThan,
                ';' => Token::Semicolon,
                _ => {
                    return Err(LexError {
                        position: current + 1,
                        message: format!("unexpected character '{character}'"),
                    });
                }
            };
            tokens.push(token);
            current += 1;
        }
    }

    Ok(tokens)
}

#[cfg(test)]
mod tests {
    use super::{Token, tokenize};

    #[test]
    fn tokenizes_the_employee_query() {
        assert_eq!(
            tokenize("SELECT name FROM employees WHERE salary > 50000;").unwrap(),
            vec![
                Token::Select,
                Token::Identifier("name".to_string()),
                Token::From,
                Token::Identifier("employees".to_string()),
                Token::Where,
                Token::Identifier("salary".to_string()),
                Token::GreaterThan,
                Token::Integer(50_000),
                Token::Semicolon,
            ]
        );
    }

    #[test]
    fn keywords_ignore_case_but_identifiers_keep_their_spelling() {
        assert_eq!(
            tokenize("select Name FrOm Employees WhErE Salary > 50000;").unwrap(),
            vec![
                Token::Select,
                Token::Identifier("Name".to_string()),
                Token::From,
                Token::Identifier("Employees".to_string()),
                Token::Where,
                Token::Identifier("Salary".to_string()),
                Token::GreaterThan,
                Token::Integer(50_000),
                Token::Semicolon,
            ]
        );
    }

    #[test]
    fn rejects_an_unknown_character_at_its_position() {
        assert_eq!(
            tokenize("SELECT @;").unwrap_err().to_string(),
            "at character 8: unexpected character '@'"
        );
    }
}
