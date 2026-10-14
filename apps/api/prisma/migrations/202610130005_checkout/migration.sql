ALTER TABLE client_memberships ADD COLUMN stripe_subscription_id text; ALTER TABLE client_memberships ADD COLUMN paid_until timestamptz;
CREATE UNIQUE INDEX membership_subscription ON client_memberships(stripe_subscription_id);
CREATE TABLE stripe_checkouts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),client_id uuid NOT NULL,plan_id uuid NOT NULL REFERENCES monthly_plans(id),account_id text NOT NULL,session_id text,subscription_id text,status text NOT NULL DEFAULT 'PENDING',created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,client_id) REFERENCES clients(tenant_id,id));
ALTER TABLE stripe_checkouts ENABLE ROW LEVEL SECURITY; ALTER TABLE stripe_checkouts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON stripe_checkouts USING(tenant_id=NULLIF(current_setting('app.tenant_id',true),'')::uuid OR current_setting('app.is_master',true)='true') WITH CHECK(tenant_id=NULLIF(current_setting('app.tenant_id',true),'')::uuid OR current_setting('app.is_master',true)='true');
CREATE TABLE stripe_processed_events(event_id text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE ON stripe_checkouts TO barberhub_app;GRANT SELECT,INSERT ON stripe_processed_events TO barberhub_app; GRANT UPDATE ON client_memberships TO barberhub_app;
