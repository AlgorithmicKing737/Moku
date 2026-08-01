use crate::server::{do_log, resolve::suwayomi_data_dir};
use crate::FlareSolverrState;
use tauri::Manager;

fn open_log() -> Option<std::fs::File> {
    let data_dir = suwayomi_data_dir();
    let _ = std::fs::create_dir_all(&data_dir);
    std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(data_dir.join("moku-spawn.log"))
        .ok()
}

#[tauri::command]
pub fn spawn_flaresolverr(
    binary: String,
    binary_args: Option<String>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let mut log = open_log();

    {
        let state = app.state::<FlareSolverrState>();
        let mut guard = state.0.lock().unwrap();
        if guard.is_some() {
            do_log(
                &mut log,
                "[flaresolverr] spawn requested but a handle is already held; \
                 skipping. If FlareSolverr is not actually running, call \
                 kill_flaresolverr first to clear stale state.",
            );
            return Ok(());
        }
        drop(guard);
    }

    if binary.trim().is_empty() {
        do_log(&mut log, "[flaresolverr] spawn requested but no binary configured");
        return Err("No FlareSolverr binary configured".into());
    }

    let binary_args = binary_args.unwrap_or_default();
    let args: Vec<String> = binary_args
        .split_whitespace()
        .map(|s| s.to_string())
        .collect();

    do_log(&mut log, &format!("[flaresolverr] starting: {:?} {:?}", binary, args));

    use tauri_plugin_shell::ShellExt;
    let cmd = app.shell().command(&binary).args(&args);

    match cmd.spawn() {
        Ok((_rx, child)) => {
            do_log(&mut log, &format!("[flaresolverr] spawned successfully, pid={}", child.pid()));
            *app.state::<FlareSolverrState>().0.lock().unwrap() = Some(child);
            Ok(())
        }
        Err(e) => {
            do_log(&mut log, &format!("[flaresolverr] failed to spawn: {}", e));
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn kill_flaresolverr(app: tauri::AppHandle) -> Result<(), String> {
    kill_flaresolverr_internal(&app);
    Ok(())
}

pub fn kill_flaresolverr_internal(app: &tauri::AppHandle) {
    let mut log = open_log();
    if let Some(child) = app.state::<FlareSolverrState>().0.lock().unwrap().take() {
        do_log(&mut log, &format!("[flaresolverr] killing process pid={}", child.pid()));
        let _ = child.kill();
    } else {
        do_log(&mut log, "[flaresolverr] kill requested but no process handle was held");
    }
}