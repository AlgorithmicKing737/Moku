use crate::FlareSolverrState;
use tauri::Manager;

#[tauri::command]
pub fn spawn_flaresolverr(
    binary: String,
    binary_args: Option<String>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    {
        let state = app.state::<FlareSolverrState>();
        if state.0.lock().unwrap().is_some() {
            return Ok(());
        }
    }

    if binary.trim().is_empty() {
        return Err("No FlareSolverr binary configured".into());
    }

    let binary_args = binary_args.unwrap_or_default();
    let args: Vec<String> = binary_args
        .split_whitespace()
        .map(|s| s.to_string())
        .collect();

    use tauri_plugin_shell::ShellExt;
    let cmd = app.shell().command(&binary).args(&args);

    match cmd.spawn() {
        Ok((_rx, child)) => {
            *app.state::<FlareSolverrState>().0.lock().unwrap() = Some(child);
            Ok(())
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn kill_flaresolverr(app: tauri::AppHandle) -> Result<(), String> {
    kill_flaresolverr_internal(&app);
    Ok(())
}

pub fn kill_flaresolverr_internal(app: &tauri::AppHandle) {
    if let Some(child) = app.state::<FlareSolverrState>().0.lock().unwrap().take() {
        let _ = child.kill();
    }
}