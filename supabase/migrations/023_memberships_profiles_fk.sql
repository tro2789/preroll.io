-- Add FK from memberships.user_id to user_profiles.user_id so PostgREST
-- can detect the relationship for embedded selects (team API join).
ALTER TABLE memberships
ADD CONSTRAINT memberships_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
