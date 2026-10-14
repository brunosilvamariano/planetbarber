CREATE TABLE chat_messages (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), appointment_id uuid NOT NULL,
 sender_id uuid NOT NULL, sender_role text NOT NULL CHECK(sender_role IN ('EMPRESA','BARBEIRO','CLIENTE')),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,appointment_id) REFERENCES appointments(tenant_id,id),
 FOREIGN KEY(tenant_id,sender_id) REFERENCES users(tenant_id,id)
);
CREATE INDEX chat_messages_conversation ON chat_messages(tenant_id,appointment_id,created_at);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON chat_messages USING(tenant_id=NULLIF(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.tenant_id',true),'')::uuid);
GRANT SELECT, INSERT ON chat_messages TO barberhub_app;
