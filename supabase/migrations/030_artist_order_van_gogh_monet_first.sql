-- Van Gogh ve Monet ücretsiz kullanılabilir olsun diye ilk iki sıraya taşı
UPDATE artists SET sort_order = 0 WHERE slug = 'vangogh';
UPDATE artists SET sort_order = 1 WHERE slug = 'monet';
UPDATE artists SET sort_order = sort_order - 1 WHERE slug NOT IN ('vangogh', 'monet') AND sort_order > 2;
