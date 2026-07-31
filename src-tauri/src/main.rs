// src-tauri/src/main.rs
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod p2p;

fn main() {
    tauri::Builder::default()
        // 1. Restore all frontend-required plugins here
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        // 2. Setup our custom P2P backend
        .setup(|_app| {
            tauri::async_runtime::spawn(async {
                p2p::start_p2p_server().await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}