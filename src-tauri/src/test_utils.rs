use std::panic::{catch_unwind, resume_unwind, AssertUnwindSafe};
use std::path::Path;
use std::sync::{Mutex, OnceLock};

fn env_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

pub(crate) fn with_loadout_home<T>(home: &Path, f: impl FnOnce() -> T) -> T {
    let _guard = env_lock().lock().unwrap_or_else(|poisoned| poisoned.into_inner());

    let previous = std::env::var("LOADOUT_HOME").ok();
    std::env::set_var("LOADOUT_HOME", home);

    let result = catch_unwind(AssertUnwindSafe(f));

    if let Some(prev) = previous {
        std::env::set_var("LOADOUT_HOME", prev);
    } else {
        std::env::remove_var("LOADOUT_HOME");
    }

    match result {
        Ok(value) => value,
        Err(payload) => resume_unwind(payload),
    }
}
