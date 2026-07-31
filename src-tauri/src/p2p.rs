// src-tauri/src/p2p.rs
use futures_util::{SinkExt, StreamExt};
use mdns_sd::{ServiceDaemon, ServiceInfo};
use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use warp::ws::{Message, WebSocket};
use warp::Filter;

// Shared memory to track all connected devices (desktop, mobile, tablet, etc.)
type Users = Arc<Mutex<HashMap<usize, mpsc::UnboundedSender<Result<Message, warp::Error>>>>>;
static NEXT_USER_ID: AtomicUsize = AtomicUsize::new(1);

pub async fn start_p2p_server() {
    // Initialize the shared user list
    let users = Users::default();
    let users_filter = warp::any().map(move || users.clone());

    // 1. Initialize the mDNS Broadcaster
    let mdns = ServiceDaemon::new().expect("Failed to create mDNS daemon");
    let service_info = ServiceInfo::new(
        "_dfin-sync._tcp.local.",
        "dfin-desktop",
        "dfin-desktop.local.",
        "0.0.0.0",
        3030,
        HashMap::new(),
    ).unwrap();

    mdns.register(service_info).expect("Failed to register mDNS");
    println!("\n[P2P] mDNS Broadcaster online. DFIN is discoverable.");

    // 2. Initialize the WebSocket Router
    let ws_route = warp::path("sync")
        .and(warp::ws())
        .and(users_filter)
        .map(|ws: warp::ws::Ws, users| {
            ws.on_upgrade(move |socket| client_connected(socket, users))
        });

    println!("[P2P] WebSocket Router listening on port 3030");
    warp::serve(ws_route).run(([0, 0, 0, 0], 3030)).await;
}

// Handles the logic for every new device that connects
async fn client_connected(ws: WebSocket, users: Users) {
    // Assign a unique ID to this device
    let my_id = NEXT_USER_ID.fetch_add(1, Ordering::Relaxed);
    println!("[P2P] SUCCESS: Device #{} connected to the matrix!", my_id);

    // Split the socket into a sender and receiver
    let (mut user_ws_tx, mut user_ws_rx) = ws.split();
    
    // Create a channel to forward messages to this specific device
    let (tx, mut rx) = mpsc::unbounded_channel();
    users.lock().await.insert(my_id, tx);

    // Background task: Send incoming routed messages to this device's actual websocket
    tokio::task::spawn(async move {
        while let Some(message) = rx.recv().await {
            let _ = user_ws_tx.send(message.expect("Failed to frame message")).await;
        }
    });

    // Main task: Listen for changes from this device, and broadcast to everyone else
    while let Some(result) = user_ws_rx.next().await {
        match result {
            Ok(msg) => {
                // We only care about binary CRDT chunks
                if msg.is_binary() {
                    println!("[P2P] Device #{} mutated state. Broadcasting to matrix...", my_id);
                    
                    for (&uid, tx) in users.lock().await.iter() {
                        // Send to everyone EXCEPT the device that originated the change
                        if my_id != uid {
                            let _ = tx.send(Ok(msg.clone()));
                        }
                    }
                }
            }
            Err(e) => {
                eprintln!("[P2P] Device #{} encountered an error: {}", my_id, e);
                break;
            }
        }
    }

    // Cleanup when a device disconnects (e.g. mobile app closes)
    println!("[P2P] Device #{} disconnected.", my_id);
    users.lock().await.remove(&my_id);
}