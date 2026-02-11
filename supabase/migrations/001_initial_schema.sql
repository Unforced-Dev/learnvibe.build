-- ============================================
-- Learn Vibe Build - Initial Database Schema
-- ============================================

-- Courses
CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  tier VARCHAR(10) NOT NULL CHECK (tier IN ('LEARN', 'VIBE', 'BUILD')),
  tier_level INT NOT NULL CHECK (tier_level IN (100, 200, 300)),
  color VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'coming-soon' CHECK (status IN ('active', 'coming-soon', 'future')),
  description TEXT,
  long_description TEXT,
  price_cents INT,
  duration VARCHAR(50),
  launch_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Course weeks
CREATE TABLE course_weeks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  content_html TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, week_number)
);

-- Course prerequisites
CREATE TABLE course_prerequisites (
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, prerequisite_id)
);

-- Cohorts (instances of a course)
CREATE TABLE cohorts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'enrolling', 'active', 'completed')),
  start_date DATE,
  end_date DATE,
  max_students INT DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'facilitator')),
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enrollments
CREATE TABLE enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, cohort_id)
);

-- Week progress tracking
CREATE TABLE progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_week_id UUID REFERENCES course_weeks(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'completed')),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_week_id)
);

-- ============================================
-- Row Level Security
-- ============================================

-- Courses: publicly readable
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Courses are publicly readable"
  ON courses FOR SELECT
  TO anon, authenticated
  USING (true);

-- Course weeks: publicly readable
ALTER TABLE course_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Course weeks are publicly readable"
  ON course_weeks FOR SELECT
  TO anon, authenticated
  USING (true);

-- Course prerequisites: publicly readable
ALTER TABLE course_prerequisites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prerequisites are publicly readable"
  ON course_prerequisites FOR SELECT
  TO anon, authenticated
  USING (true);

-- Cohorts: publicly readable
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cohorts are publicly readable"
  ON cohorts FOR SELECT
  TO anon, authenticated
  USING (true);

-- Profiles: users can read their own, admins can read all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Enrollments: users see their own
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own enrollments"
  ON enrollments FOR SELECT
  USING (auth.uid() = user_id);

-- Progress: users see/update their own
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress"
  ON progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON progress FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- Trigger: auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER progress_updated_at
  BEFORE UPDATE ON progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
