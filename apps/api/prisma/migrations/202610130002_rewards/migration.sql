CREATE TABLE client_rewards(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),client_id uuid NOT NULL,description text NOT NULL CHECK(length(description) BETWEEN 2 AND 200),delivered boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,client_id) REFERENCES clients(tenant_id,id));
ALTER TABLE client_rewards ENABLE ROW LEVEL SECURITY; ALTER TABLE client_rewards FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON client_rewards USING(tenant_id=NULLIF(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.tenant_id',true),'')::uuid);
GRANT SELECT,INSERT,UPDATE ON client_rewards TO barberhub_app;
