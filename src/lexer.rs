use std::fmt;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Token {
    Select,
    From,
    Where,
    As,
    And,
    Or,
    Not,
    Is,
    Null,
    Identifier(String),
    Integer(i64),
    String(String),
    Plus,
    Minus,
    Star,
    Slash,
    Equal,
    NotEqual,
    Less,
    LessOrEqual,
    Greater,
    GreaterOrEqual,
    Dot,
    LeftParen,
    RightParen,
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
            tokens.push(word_token(characters[start..current].iter().collect()));
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
        } else if character == '\'' {
            let start = current;
            current += 1;
            let mut value = String::new();
            loop {
                if current >= characters.len() {
                    return Err(LexError {
                        position: start + 1,
                        message: "unterminated string".into(),
                    });
                }
                if characters[current] == '\'' {
                    if characters.get(current + 1) == Some(&'\'') {
                        value.push('\'');
                        current += 2;
                    } else {
                        current += 1;
                        break;
                    }
                } else {
                    value.push(characters[current]);
                    current += 1;
                }
            }
            tokens.push(Token::String(value));
        } else {
            let (token, consumed) = punctuation(&characters, current).ok_or_else(|| LexError {
                position: current + 1,
                message: format!("unexpected character '{character}'"),
            })?;
            tokens.push(token);
            current += consumed;
        }
    }
    Ok(tokens)
}

fn punctuation(characters: &[char], current: usize) -> Option<(Token, usize)> {
    match (characters[current], characters.get(current + 1)) {
        ('<', Some('=')) => Some((Token::LessOrEqual, 2)),
        ('<', Some('>')) => Some((Token::NotEqual, 2)),
        ('>', Some('=')) => Some((Token::GreaterOrEqual, 2)),
        ('+', _) => Some((Token::Plus, 1)),
        ('-', _) => Some((Token::Minus, 1)),
        ('*', _) => Some((Token::Star, 1)),
        ('/', _) => Some((Token::Slash, 1)),
        ('=', _) => Some((Token::Equal, 1)),
        ('<', _) => Some((Token::Less, 1)),
        ('>', _) => Some((Token::Greater, 1)),
        ('.', _) => Some((Token::Dot, 1)),
        ('(', _) => Some((Token::LeftParen, 1)),
        (')', _) => Some((Token::RightParen, 1)),
        (';', _) => Some((Token::Semicolon, 1)),
        _ => None,
    }
}

fn word_token(word: String) -> Token {
    match word.to_ascii_uppercase().as_str() {
        "SELECT" => Token::Select,
        "FROM" => Token::From,
        "WHERE" => Token::Where,
        "AS" => Token::As,
        "AND" => Token::And,
        "OR" => Token::Or,
        "NOT" => Token::Not,
        "IS" => Token::Is,
        "NULL" => Token::Null,
        _ => Token::Identifier(word),
    }
}

#[cfg(test)]
mod tests {
    use super::{Token, tokenize};

    #[test]
    fn tokenizes_the_chapter_query() {
        assert_eq!(
            tokenize("SELECT e.name FROM employees AS e WHERE e.salary + 5000 > 70000 AND e.name IS NOT NULL;").unwrap(),
            vec![Token::Select, Token::Identifier("e".into()), Token::Dot,
                Token::Identifier("name".into()), Token::From, Token::Identifier("employees".into()),
                Token::As, Token::Identifier("e".into()), Token::Where, Token::Identifier("e".into()),
                Token::Dot, Token::Identifier("salary".into()), Token::Plus, Token::Integer(5000),
                Token::Greater, Token::Integer(70000), Token::And, Token::Identifier("e".into()),
                Token::Dot, Token::Identifier("name".into()), Token::Is, Token::Not, Token::Null,
                Token::Semicolon]
        );
    }

    #[test]
    fn tokenizes_strings_and_two_character_operators() {
        assert_eq!(
            tokenize("name <> 'Ada''s';").unwrap(),
            vec![
                Token::Identifier("name".into()),
                Token::NotEqual,
                Token::String("Ada's".into()),
                Token::Semicolon
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
