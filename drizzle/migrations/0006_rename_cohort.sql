-- Step 1: Rename the pilot cohort from cohort-1 → cohort-0
UPDATE cohorts SET slug = 'cohort-0', title = 'Pilot Cohort: Foundations' WHERE slug = 'cohort-1';

-- Step 2: Rename the upcoming cohort from cohort-2 → cohort-1
UPDATE cohorts SET slug = 'cohort-1', title = 'Cohort 1: Practice' WHERE slug = 'cohort-2';

-- Step 3: Update any applications referencing the old slug
UPDATE applications SET cohort_slug = 'cohort-1' WHERE cohort_slug = 'cohort-2';

-- Step 4: Update enrollments if any reference the old pilot cohort
-- (enrollments reference cohort by ID, not slug, so no change needed there)
