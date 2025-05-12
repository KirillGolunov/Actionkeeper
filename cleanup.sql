-- Delete duplicate time entries, keeping the one with the lowest id
DELETE FROM time_entries
WHERE id NOT IN (
  SELECT MIN(id)
  FROM time_entries
  GROUP BY user_id, project_id, date(start_time)
);

-- Add a unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_time_entry
ON time_entries (user_id, project_id, start_time); 