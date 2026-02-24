-- Delete all volunteer data from the database
-- WARNING: This will permanently remove all volunteer records

DELETE FROM volunteers;

-- Optional: Reset the sequence if you want IDs to start from 1 again
-- ALTER SEQUENCE volunteers_id_seq RESTART WITH 1;
