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

    pub fn value_at(&self, index: usize, expected_name: &str) -> Result<&Value, String> {
        let (name, value) = self
            .values
            .get(index)
            .ok_or_else(|| format!("bound column is missing at execution: {expected_name}"))?;

        if name != expected_name {
            return Err(format!(
                "bound column mismatch at position {index}: expected {expected_name}, found {name}"
            ));
        }

        Ok(value)
    }

    pub fn combine(&self, right: &Row) -> Row {
        let mut values = self.values.clone();
        values.extend(right.values.iter().cloned());
        Row { values }
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

#[cfg(test)]
mod tests {
    use super::{Row, Value};

    #[test]
    fn combined_rows_keep_values_in_left_then_right_order() {
        let left = Row::new(vec![
            ("id", Value::Integer(1)),
            ("name", Value::Text("Ada".into())),
        ]);
        let right = Row::new(vec![
            ("id", Value::Integer(10)),
            ("name", Value::Text("Engineering".into())),
        ]);

        let combined = left.combine(&right);

        assert_eq!(
            combined.value_at(1, "name").cloned(),
            Ok(Value::Text("Ada".into()))
        );
        assert_eq!(
            combined.value_at(3, "name").cloned(),
            Ok(Value::Text("Engineering".into()))
        );
    }

    #[test]
    fn positional_lookup_detects_catalog_and_row_disagreement() {
        let row = Row::new(vec![("name", Value::Text("Ada".into()))]);

        assert_eq!(
            row.value_at(0, "salary").unwrap_err(),
            "bound column mismatch at position 0: expected salary, found name"
        );
    }
}
