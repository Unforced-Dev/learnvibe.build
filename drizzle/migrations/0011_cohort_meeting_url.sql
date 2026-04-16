-- Add meeting URL to cohorts (the Zoom/Meet/etc link for the live session)
ALTER TABLE cohorts ADD COLUMN meeting_url TEXT;
