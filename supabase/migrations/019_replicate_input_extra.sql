-- 019: Imagen-4 ek parametreleri (aspect_ratio vb.) admin panelden düzenlenebilir
ALTER TABLE replicate_models ADD COLUMN IF NOT EXISTS input_extra JSONB DEFAULT NULL;

COMMENT ON COLUMN replicate_models.input_extra IS 'Preset dışı ek parametreler (örn. aspect_ratio, output_format). Imagen için: {"aspect_ratio":"16:9"}';
