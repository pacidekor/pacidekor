-- Product kinds (druhy) + restructure Umelé kvety subcategories
-- Flower-name subcategories become druhy; new structural subcategories replace them.

create table if not exists public.druhy (
  id text primary key,
  category_id text not null references public.categories (id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists druhy_category_id_idx on public.druhy (category_id);
create index if not exists druhy_sort_order_idx on public.druhy (sort_order);

drop trigger if exists druhy_set_updated_at on public.druhy;
create trigger druhy_set_updated_at
  before update on public.druhy
  for each row execute function public.set_categories_updated_at();

alter table public.druhy enable row level security;

drop policy if exists "druhy_select_public" on public.druhy;
drop policy if exists "druhy_insert_admin" on public.druhy;
drop policy if exists "druhy_update_admin" on public.druhy;
drop policy if exists "druhy_delete_admin" on public.druhy;

create policy "druhy_select_public"
  on public.druhy for select to anon, authenticated using (true);
create policy "druhy_insert_admin"
  on public.druhy for insert to authenticated with check (public.is_admin());
create policy "druhy_update_admin"
  on public.druhy for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "druhy_delete_admin"
  on public.druhy for delete to authenticated using (public.is_admin());

grant select on table public.druhy to anon, authenticated;
grant insert, update, delete on table public.druhy to authenticated;

alter table public.products
  add column if not exists druh_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_druh_id_fkey'
  ) then
    alter table public.products
      add constraint products_druh_id_fkey
      foreign key (druh_id) references public.druhy (id) on delete set null;
  end if;
end $$;

create index if not exists products_druh_id_idx on public.products (druh_id);

-- Snapshot which products were bouquets (kytica) before we rewrite subcategory_id
create temporary table tmp_kytica_products as
select id from public.products where subcategory_id = 'kytica';

create temporary table tmp_bahniatka2_products as
select id from public.products where subcategory_id = 'bahniatka-2';

-- Flower-name subcategories → druhy (same ids), skip kytica + bahniatka-2 duplicate
insert into public.druhy (id, category_id, label, sort_order)
select s.id, s.category_id, s.label, s.sort_order
from public.subcategories s
where s.category_id = 'umele-kvety'
  and s.id not in ('kytica', 'bahniatka-2')
on conflict (id) do update
  set label = excluded.label,
      sort_order = excluded.sort_order;

-- Ensure bahniatka druh exists for bahniatka-2 merge
insert into public.druhy (id, category_id, label, sort_order)
select 'bahniatka', 'umele-kvety', 'Bahniatka', 9
where not exists (select 1 from public.druhy where id = 'bahniatka')
on conflict (id) do nothing;

-- Map products: old flower subcategory → druh_id
update public.products p
set druh_id = p.subcategory_id
where p.subcategory_id is not null
  and p.subcategory_id not in ('kytica', 'bahniatka-2')
  and exists (select 1 from public.druhy d where d.id = p.subcategory_id);

update public.products p
set druh_id = 'bahniatka'
from tmp_bahniatka2_products t
where p.id = t.id;

-- Remove all Umelé kvety subcategories
update public.products
set subcategory_id = null
where subcategory_id in (
  select id from public.subcategories where category_id = 'umele-kvety'
);

delete from public.subcategories where category_id = 'umele-kvety';

-- New structural subcategories
insert into public.subcategories (id, category_id, label, sort_order) values
  ('kytice', 'umele-kvety', 'Kytice', 0),
  ('stopkove-kvety', 'umele-kvety', 'Stopkové kvety', 1),
  ('vencovky', 'umele-kvety', 'Venčovky', 2),
  ('listy', 'umele-kvety', 'Listy', 3),
  ('doplnky', 'umele-kvety', 'Doplnky', 4)
on conflict (id) do update
  set label = excluded.label,
      sort_order = excluded.sort_order;

-- Former kytica products → Kytice
update public.products p
set subcategory_id = 'kytice', druh_id = null
from tmp_kytica_products t
where p.id = t.id;

-- Everything else with a druh → Stopkové kvety (default; re-sort manually later)
update public.products
set subcategory_id = 'stopkove-kvety'
where category = 'Umelé kvety'
  and subcategory_id is null;

-- Stuhy
insert into public.subcategories (id, category_id, label, sort_order) values
  ('ozdobne-stuhy', 'stuhy', 'Ozdobné stuhy', 0),
  ('satinove-stuhy', 'stuhy', 'Saténové stuhy', 1),
  ('pohrebne-stuhy', 'stuhy', 'Pohrebné stuhy', 2),
  ('latkove-pohrebne-stuhy', 'stuhy', 'Látkové pohrebné stuhy', 3),
  ('jutove-stuhy', 'stuhy', 'Jutové stuhy', 4),
  ('sametove-stuhy', 'stuhy', 'Sametové stuhy', 5),
  ('viazacky', 'stuhy', 'Viazačky', 6)
on conflict (id) do update
  set label = excluded.label,
      sort_order = excluded.sort_order;

-- Obalový materiál
insert into public.subcategories (id, category_id, label, sort_order) values
  ('folie', 'obalovy-material', 'Fólie', 0),
  ('folie-harky', 'obalovy-material', 'Fólie hárky', 1),
  ('sietka-plastova', 'obalovy-material', 'Sieťka plastová', 2),
  ('sietka-hackovana', 'obalovy-material', 'Sieťka hačkovaná', 3),
  ('sisalova-sietka', 'obalovy-material', 'Sisalová sieťka', 4),
  ('jutova-sietka', 'obalovy-material', 'Jutová sieťka', 5),
  ('papierova-rolka', 'obalovy-material', 'Papierová rolka', 6),
  ('papierova-rolka-roztahovacia', 'obalovy-material', 'Papierová rolka rozťahovacia', 7),
  ('papier-harky', 'obalovy-material', 'Papier hárky', 8),
  ('cipkova-rolka', 'obalovy-material', 'Čipková rolka', 9)
on conflict (id) do update
  set label = excluded.label,
      sort_order = excluded.sort_order;

-- Push unused empty categories to the end (still removable later in admin)
update public.categories set sort_order = 100 where id = 'plechy';
update public.categories set sort_order = 101 where id = 'dekoracie';
