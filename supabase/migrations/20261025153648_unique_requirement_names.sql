-- The importer upserts requirements by name, and an upsert needs a unique constraint to match on.
-- Without it, re-running the import would insert every requirement again.
alter table requirements
  add constraint requirements_owner_id_name_key unique (owner_id, name);
