use shared::models::{
    DeletableModel, EventEmittingModel, ListenerPriority, server::Server, server::ServerEvent,
};

use super::manager;

pub fn register_handlers() {
    Server::register_delete_handler(ListenerPriority::Low, |server, _options, state, _tx| {
        Box::pin(async move {
            if let Err(err) = manager::cleanup_managed_records_for_server(state, server.uuid).await {
                tracing::error!(server = %server.uuid, "subdomain cleanup failed on delete: {err:#}");
            }

            if let Err(err) = manager::clear_server_assignment(state, server.uuid).await {
                tracing::error!(server = %server.uuid, "subdomain assignment delete failed: {err:#}");
            }

            Ok(())
        })
    });

    Server::register_event_handler(|state, event| {
        Box::pin(async move {
            match &*event {
                ServerEvent::TransferStarted { server, .. } => {
                    manager::mark_assignment_unknown(
                        &state,
                        server.uuid,
                        "transfer_started",
                    )
                    .await?;
                }
                ServerEvent::TransferCompleted {
                    server,
                    successful,
                    ..
                } => {
                    if *successful {
                        manager::mark_assignment_unknown(
                            &state,
                            server.uuid,
                            "transfer_completed_requires_reassignment",
                        )
                        .await?;
                    } else {
                        manager::mark_assignment_unknown(
                            &state,
                            server.uuid,
                            "transfer_failed",
                        )
                        .await?;
                    }
                }
                ServerEvent::InstallCompleted { server, successful } => {
                    if *successful {
                        let _ = manager::reconcile_server_assignment(&state, server.uuid, false).await;
                    }
                }
                _ => {}
            }

            Ok(())
        })
    });
}
