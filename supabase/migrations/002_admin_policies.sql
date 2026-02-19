-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Allow admins to update any profile (for moderation)
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Allow admins to insert credit_transactions (e.g. manual credit adjustment)
CREATE POLICY "Admins can insert credit_transactions" ON credit_transactions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
