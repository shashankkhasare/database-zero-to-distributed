use std::fmt;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Value {
    Integer(i64),
    Text(String),
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

    pub fn get(&self, column: &str) -> Option<&Value> {
        for (name, value) in &self.values {
            if name == column {
                return Some(value);
            }
        }

        None
    }

    pub fn project(&self, columns: &[String]) -> Self {
        let mut values = Vec::new();

        for column in columns {
            let value = match self.get(column) {
                Some(value) => value,
                None => panic!("unknown column: {column}"),
            };

            values.push((column.clone(), value.clone()));
        }

        Self { values }
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
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{Row, Value};

    #[test]
    fn project_keeps_only_requested_columns() {
        let row = Row::new(vec![
            ("id", Value::Integer(1)),
            ("name", Value::Text("Ada".to_string())),
            ("salary", Value::Integer(70_000)),
        ]);

        let projected = row.project(&["name".to_string()]);

        assert_eq!(
            projected,
            Row::new(vec![("name", Value::Text("Ada".to_string()))])
        );
    }
}
