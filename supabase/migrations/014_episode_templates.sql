-- Per-show episode template: default values auto-populated on episode creation
alter table shows add column episode_template jsonb;

comment on column shows.episode_template is 'Default values for new episodes: { description, notes, scheduled_publish_offset_days }';
