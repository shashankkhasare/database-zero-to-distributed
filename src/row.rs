use std::fmt;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Value {
    Integer(i64),
    Text(String),
    Boolean(bool),
    Null,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Row {
    values: Vec<(String, Value)>,
}

impl Row {
    pub fn new(values: Vec<(&str, Value)>) -> Self {
        let mut owned_values = Vec::new();

        for (column, value) in values {
            owned_values.push((column.to_string(), value));
        }

        Self {
            values: owned_values,
        }
    }

    pub fn from_owned(values: Vec<(String, Value)>) -> Self {
        Self { values }
    }
}

impl Row {
    pub fn get(&self, column: &str) -> Option<&Value> {
        for (name, value) in &self.values {
            if name == column {
                return Some(value);
            }
        }

        None
    }
}

impl fmt::Display for Row {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{{")?;

        for (index, (column, value)) in self.values.iter().enumerate() {
            if index > 0 {
                write!(formatter, ", ")?;
            }

            write!(formatter, "{column}: {value}")?;
        }

        write!(formatter, "}}")
    }
}

impl fmt::Display for Value {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Value::Integer(value) => write!(formatter, "{value}"),
            Value::Text(value) => write!(formatter, "\"{value}\""),
            Value::Boolean(value) => write!(formatter, "{value}"),
            Value::Null => write!(formatter, "NULL"),
        }
    }
}
