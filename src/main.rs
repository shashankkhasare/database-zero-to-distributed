mod expression;
mod lexer;
mod parser;
#[allow(dead_code)] // Row execution reconnects in Chapter 5.
mod row;

use std::io::{self, Write};

use parser::parse;

fn main() -> io::Result<()> {
    run_prompt()
}

fn inspect_sql(sql: &str) {
    match parse(sql) {
        Ok(query) => println!("{query:#?}"),
        Err(error) => eprintln!("error: {error}"),
    }
}

fn run_prompt() -> io::Result<()> {
    loop {
        let mut sql = String::new();

        loop {
            if sql.is_empty() {
                print!("sql> ");
            } else {
                print!("...> ");
            }
            io::stdout().flush()?;

            let mut line = String::new();
            if io::stdin().read_line(&mut line)? == 0 {
                println!();
                if !sql.trim().is_empty() {
                    eprintln!("error: incomplete query at end of input");
                }
                return Ok(());
            }
            if sql.is_empty() && line.trim().is_empty() {
                break;
            }
            if append_sql_line(&mut sql, &line) {
                break;
            }
        }

        if !sql.trim().is_empty() {
            inspect_sql(&sql);
        }
    }
}

fn append_sql_line(sql: &mut String, line: &str) -> bool {
    sql.push_str(line);
    line.trim_end().ends_with(';')
}

#[cfg(test)]
mod tests {
    use super::append_sql_line;

    #[test]
    fn prompt_collects_lines_until_the_statement_ends() {
        let mut sql = String::new();

        assert!(!append_sql_line(&mut sql, "SELECT name\n"));
        assert!(!append_sql_line(&mut sql, "FROM employees\n"));
        assert!(append_sql_line(&mut sql, "WHERE TRUE;\n"));
    }
}
