-- Building request form: notes, contact name, dedicated channel.

alter table building_requests
  add column if not exists notes text,
  add column if not exists mgmt_contact_name text;

alter type building_request_channel add value if not exists 'building_request';
