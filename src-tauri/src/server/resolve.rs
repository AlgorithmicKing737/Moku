use crate::server::do_log;
use serde::Serialize;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize, Debug)]
#[serde(tag = "kind", content = "message")]
pub enum SpawnError {
    NotConfigured(String),
    SpawnFailed(String),
}

pub struct ServerInvocation {
    pub bin: String,
    pub args: Vec<String>,
    pub working_dir: Option<PathBuf>,
}

pub fn suwayomi_data_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("C:\\ProgramData"))
            .join("Tachidesk")
    }
    #[cfg(target_os = "macos")]
    {
        dirs::data_dir()
            .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from("~")))
            .join("Tachidesk")
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let base = std::env::var("XDG_DATA_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| dirs::data_dir().unwrap_or_else(|| PathBuf::from("/tmp")));
        base.join("Tachidesk")
    }
}

pub fn strip_unc(path: PathBuf) -> PathBuf {
    let s = path.to_string_lossy();
    if let Some(stripped) = s.strip_prefix(r"\\?\") {
        PathBuf::from(stripped)
    } else {
        path
    }
}

fn java_bin_name() -> &'static str {
    if cfg!(target_os = "windows") { "java.exe" } else { "java" }
}

fn find_java_in_bundle(bundle_dir: &PathBuf, log: &mut Option<std::fs::File>) -> Option<PathBuf> {
    let java = bundle_dir.join("jre").join("bin").join(java_bin_name());
    do_log(log, &format!("[find_java] {:?} exists={}", java, java.exists()));
    if java.exists() { Some(java) } else { None }
}

fn data_root_args() -> Vec<String> {
    vec!["--dataRoot".to_string(), suwayomi_data_dir().to_string_lossy().into_owned()]
}

fn jar_data_root_flag() -> String {
    format!("-Dsuwayomi.server.rootDir={}", suwayomi_data_dir().to_string_lossy())
}

fn jar_invocation(java: PathBuf, jar: PathBuf, working_dir: PathBuf) -> ServerInvocation {
    ServerInvocation {
        bin: java.to_string_lossy().into_owned(),
        args: vec![
            jar_data_root_flag(),
            "-jar".to_string(),
            jar.to_string_lossy().into_owned(),
        ],
        working_dir: Some(working_dir),
    }
}

pub fn resolve_server_binary(
    binary: &str,
    app: &tauri::AppHandle,
    log: &mut Option<std::fs::File>,
) -> Result<ServerInvocation, SpawnError> {
    do_log(log, &format!("[resolve] binary={:?}", binary));

    if !binary.trim().is_empty() {
        let path = strip_unc(PathBuf::from(binary.trim()));
        do_log(log, &format!("[resolve] user path={:?} exists={}", path, path.exists()));
        if path.exists() {
            let working_dir = path.parent().map(|p| p.to_path_buf());
            return Ok(ServerInvocation {
                bin: path.to_string_lossy().into_owned(),
                args: data_root_args(),
                working_dir,
            });
        }
        do_log(log, "[resolve] user path not found, falling through");
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(bin_dir) = exe.parent() {
            for name in &["tachidesk-server", "suwayomi-launcher"] {
                let p = bin_dir.join(name);
                do_log(log, &format!("[resolve] sibling={:?} exists={}", p, p.exists()));
                if p.exists() {
                    return Ok(ServerInvocation {
                        bin: p.to_string_lossy().into_owned(),
                        args: data_root_args(),
                        working_dir: Some(bin_dir.to_path_buf()),
                    });
                }
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let resource_dir = {
            let raw = app.path().resource_dir().unwrap_or_default();
            let stripped = strip_unc(raw);
            do_log(log, &format!("[resolve] resource_dir={:?}", stripped));
            stripped
        };

        let bundle_dir = resource_dir.join("binaries").join("suwayomi-bundle");
        let jar = bundle_dir.join("bin").join("Suwayomi-Server.jar");

        do_log(log, &format!("[resolve] bundle_dir={:?} exists={}", bundle_dir, bundle_dir.exists()));
        do_log(log, &format!("[resolve] jar={:?} exists={}", jar, jar.exists()));

        if let Some(java) = find_java_in_bundle(&bundle_dir, log) {
            if jar.exists() {
                do_log(log, "[resolve] using bundled JRE + jar");
                return Ok(jar_invocation(java, jar, bundle_dir));
            }
        }

        for name in &["suwayomi-launcher", "suwayomi-launcher.sh", "tachidesk-server"] {
            let p = resource_dir.join(name);
            do_log(log, &format!("[resolve] sidecar={:?} exists={}", p, p.exists()));
            if p.exists() {
                return Ok(ServerInvocation {
                    bin: p.to_string_lossy().into_owned(),
                    args: data_root_args(),
                    working_dir: Some(resource_dir.clone()),
                });
            }
        }

        if let Some(java) = find_java_in_bundle(&resource_dir, log) {
            let jar = std::fs::read_dir(&resource_dir)
                .ok()
                .and_then(|mut rd| {
                    rd.find(|e| e.as_ref().map(|e| e.file_name().to_string_lossy().ends_with(".jar")).unwrap_or(false))
                        .and_then(|e| e.ok())
                        .map(|e| e.path())
                });
            if let Some(jar_path) = jar {
                do_log(log, &format!("[resolve] generic JRE java={:?} jar={:?}", java, jar_path));
                return Ok(jar_invocation(java, jar_path, resource_dir));
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let resource_dir = app.path().resource_dir().unwrap_or_default();
        let bundle_dir = resource_dir.join("suwayomi-bundle");

        do_log(log, &format!("[resolve] macOS resource_dir={:?}", resource_dir));
        do_log(log, &format!("[resolve] macOS bundle_dir={:?} exists={}", bundle_dir, bundle_dir.exists()));

        let java        = bundle_dir.join("jre").join("bin").join("java");
        let jar         = bundle_dir.join("bin").join("Suwayomi-Server.jar");
        let launcher_sh = bundle_dir.join("Suwayomi Launcher.command");
        let launcher_jar = bundle_dir.join("Suwayomi-Launcher.jar");

        do_log(log, &format!("[resolve] java={:?} exists={}", java, java.exists()));
        do_log(log, &format!("[resolve] jar={:?} exists={}", jar, jar.exists()));
        do_log(log, &format!("[resolve] launcher.command={:?} exists={}", launcher_sh, launcher_sh.exists()));
        do_log(log, &format!("[resolve] launcher.jar={:?} exists={}", launcher_jar, launcher_jar.exists()));

        if java.exists() && jar.exists() {
            do_log(log, "[resolve] macOS using bundled JRE + Suwayomi-Server.jar");
            return Ok(jar_invocation(java, jar, bundle_dir));
        }

        if launcher_sh.exists() {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&launcher_sh, std::fs::Permissions::from_mode(0o755));
            do_log(log, "[resolve] macOS using Suwayomi Launcher.command");
            return Ok(ServerInvocation {
                bin: launcher_sh.to_string_lossy().into_owned(),
                args: vec![],
                working_dir: Some(bundle_dir),
            });
        }

        if java.exists() && launcher_jar.exists() {
            do_log(log, "[resolve] macOS using bundled JRE + Suwayomi-Launcher.jar");
            return Ok(jar_invocation(java, launcher_jar, bundle_dir));
        }

        do_log(log, "[resolve] macOS bundle not found, falling through to PATH");
    }

    for name in &["suwayomi-server", "tachidesk-server"] {
        #[cfg(target_os = "windows")]
        let resolved = std::process::Command::new("where")
            .arg(name)
            .output()
            .ok()
            .filter(|o| o.status.success())
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .and_then(|s| s.lines().next().map(|l| l.trim().to_string()));

        #[cfg(not(target_os = "windows"))]
        let resolved = std::process::Command::new("which")
            .arg(name)
            .output()
            .ok()
            .filter(|o| o.status.success())
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .and_then(|s| s.lines().next().map(|l| l.trim().to_string()));

        if let Some(bin_path) = resolved {
            do_log(log, &format!("[resolve] found on PATH: {:?}", bin_path));
            return Ok(ServerInvocation {
                bin: bin_path,
                args: vec![],
                working_dir: None,
            });
        }
    }

    Err(SpawnError::NotConfigured(
        "Server binary not found. Install Suwayomi-Server or set the path in Settings.".to_string(),
    ))
}