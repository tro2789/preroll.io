-- Enable full row data in realtime change events
ALTER TABLE episodes REPLICA IDENTITY FULL;

-- Add episodes to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE episodes;
