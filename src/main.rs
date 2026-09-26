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
        print!("sql> ");
        io::stdout().flush()?;

        let mut sql = String::new();
        if io::stdin().read_line(&mut sql)? == 0 {
            println!();
            return Ok(());
        }

        if !sql.trim().is_empty() {
            inspect_sql(&sql);
        }
    }
}
