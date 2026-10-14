CREATE TABLE stripe_accounts(tenant_id uuid PRIMARY KEY REFERENCES tenants(id),account_id text NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE stripe_accounts ENABLE ROW LEVEL SECURITY;ALTER TABLE stripe_accounts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON stripe_accounts USING(tenant_id=NULLIF(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK(tenant_id=NULLIF(current_setting('app.tenant_id',true),'')::uuid);
GRANT SELECT,INSERT ON stripe_accounts TO barberhub_app;
