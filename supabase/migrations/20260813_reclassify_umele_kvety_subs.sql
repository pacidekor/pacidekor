-- Heuristic re-sort of Umelé kvety from default stopkove-kvety
-- into kytice / listy / doplnky / vencovky by name + druh.

update public.products
set subcategory_id = 'kytice'
where category = 'Umelé kvety'
  and lower(name) like '%kytic%';

update public.products
set subcategory_id = 'listy'
where category = 'Umelé kvety'
  and subcategory_id is distinct from 'kytice'
  and (
    druh_id in ('zelen', 'eukalyptus', 'paprad', 'monstera', 'ruskus', 'tuja', 'ginkgo', 'vinic')
    or lower(name) like '%brečtan%'
    or lower(name) like '%asparág%'
    or lower(name) like '%asparag%'
    or lower(name) like 'list %'
    or lower(name) like '% list %'
    or lower(name) like '%listov%'
    or lower(name) like '%listová%'
    or lower(name) like '%listovy%'
    or lower(name) like '%listový%'
    or lower(name) like 'zeleň%'
    or lower(name) like 'zelen %'
  );

update public.products
set subcategory_id = 'listy'
where category = 'Umelé kvety'
  and subcategory_id = 'stopkove-kvety'
  and (
    lower(name) like '%dubov%'
    or lower(name) like '%ihličnat%'
    or lower(name) like '%ihlicnat%'
    or lower(name) like 'listov%'
    or (druh_id = 'vetva' and lower(name) like '%list%')
  );

update public.products
set subcategory_id = 'doplnky'
where category = 'Umelé kvety'
  and subcategory_id = 'stopkove-kvety'
  and (
    druh_id in ('bobule', 'drobnokvet')
    or lower(name) like '%bobul%'
    or lower(name) like '%filler%'
    or lower(name) like '%výplň%'
    or lower(name) like '%vypln%'
    or lower(name) like 'drobné %'
    or lower(name) like 'drobny %'
    or lower(name) like 'drobný %'
  );

update public.products
set subcategory_id = 'vencovky'
where category = 'Umelé kvety'
  and subcategory_id is distinct from 'kytice'
  and (
    lower(name) like '%venč%'
    or lower(name) like '%vencov%'
    or lower(name) like '%veniec%'
    or lower(name) like '%venček%'
    or lower(name) like '%vencek%'
  );
