-- Term names were unique across every owner, so two students on one database (you and the
-- example student locally, say) couldn't both have a "Fall 2026". Unique per owner instead.
alter table terms drop constraint terms_name_key;
alter table terms add constraint terms_owner_id_name_key unique (owner_id, name);
