-- Replicate model config (admin-editable: which Replicate models to use for image + interpretation)
-- See https://replicate.com/docs

CREATE TABLE replicate_models (
  key TEXT PRIMARY KEY,
  model_identifier TEXT NOT NULL,
  input_preset TEXT NOT NULL DEFAULT 'default' CHECK (input_preset IN ('imagen', 'flux', 'llm', 'default')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

ALTER TABLE replicate_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read replicate_models" ON replicate_models FOR SELECT USING (TRUE);
CREATE POLICY "Admins can update replicate_models" ON replicate_models FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can insert replicate_models" ON replicate_models FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE replicate_models IS 'Replicate model identifiers for image generation and dream interpretation (admin-editable)';

-- Seed: current defaults (Imagen-4 for image, Claude 3.5 Sonnet for interpretation)
INSERT INTO replicate_models (key, model_identifier, input_preset) VALUES
  ('image_generation', 'google/imagen-4', 'imagen'),
  ('interpretation', 'anthropic/claude-3.5-sonnet', 'llm')
ON CONFLICT (key) DO NOTHING;
