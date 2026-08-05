-- Shared category taxonomy (replaces admin localStorage)

create table public.categories (
  id text primary key,
  label text not null,
  image text,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subcategories (
  id text primary key,
  category_id text not null references public.categories (id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subcategories_category_id_idx on public.subcategories (category_id);
create index categories_sort_order_idx on public.categories (sort_order);

create or replace function public.set_categories_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_categories_updated_at();

create trigger subcategories_set_updated_at
  before update on public.subcategories
  for each row execute function public.set_categories_updated_at();

alter table public.categories enable row level security;
alter table public.subcategories enable row level security;

create policy "categories_select_public"
  on public.categories for select to anon, authenticated using (true);
create policy "categories_insert_admin"
  on public.categories for insert to authenticated with check (public.is_admin());
create policy "categories_update_admin"
  on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "categories_delete_admin"
  on public.categories for delete to authenticated using (public.is_admin());

create policy "subcategories_select_public"
  on public.subcategories for select to anon, authenticated using (true);
create policy "subcategories_insert_admin"
  on public.subcategories for insert to authenticated with check (public.is_admin());
create policy "subcategories_update_admin"
  on public.subcategories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "subcategories_delete_admin"
  on public.subcategories for delete to authenticated using (public.is_admin());

grant select on table public.categories to anon, authenticated;
grant insert, update, delete on table public.categories to authenticated;
grant select on table public.subcategories to anon, authenticated;
grant insert, update, delete on table public.subcategories to authenticated;

-- Seed from MacBook localStorage export (Umelé kvety subcategories expanded)
insert into public.categories (id, label, image, description, sort_order) values
  ('umele-kvety', 'Umelé kvety', '/kategorie/umelekvety.webp', 'Realistické umelé kvety do váz, aranžmánov a celoročných dekorácií.', 0),
  ('susina', 'Sušina', '/kategorie/susina.webp', 'Prírodná sušina a stabilizované rastliny pre rustikálne aj moderné aranžmány.', 1),
  ('stuhy', 'Stuhy', '/kategorie/stuhy.webp', 'Saténové, organzové a dekoračné stuhy na balenie, mašle a floristiku.', 2),
  ('aranz-material', 'Aranž. materiál', '/kategorie/aranzerskymaterial.webp', 'Aranžérsky materiál a pomôcky pre profesionálnu aj domácu tvorbu.', 3),
  ('obalovy-material', 'Obalový materiál', '/kategorie/obalovymaterial.webp', 'Papier, fólie a obaly na kytice, darčeky a sezónne balenie.', 4),
  ('keramika', 'Keramika', '/kategorie/keramika-new.webp', 'Keramické vázy, misky a nádoby, ktoré dotvoria každý aranžmán.', 5),
  ('vencove-zaklady', 'Vencové základy', '/kategorie/vencovezaklady.webp', 'Základy a polotovary na vence - pripravené na vašu dekoráciu.', 6),
  ('kosiky', 'Košíky', '/kategorie/kosiky.webp', 'Prútené a dekoračné košíky na aranžmány, dary aj sezónnu výzdobu.', 7),
  ('plechy', 'Plechy', '/kategorie/plechy.webp', 'Plechové nádoby a dekorácie s industriálnym aj rustikálnym nádychom.', 8),
  ('svietniky', 'Svietniky', '/kategorie/svietniky.webp', 'Svietniky a stojany na sviečky pre atmosféru každého priestoru.', 9),
  ('dekoracie', 'Dekorácie', '/kategorie/dekoracie.webp', 'Doplnky a dekorácie, ktoré oživia domov, predajňu aj event.', 10);

insert into public.subcategories (id, category_id, label, sort_order) values
  ('ruze', 'umele-kvety', 'Ruže', 0),
  ('pivonie', 'umele-kvety', 'Pivónie', 1),
  ('dalie', 'umele-kvety', 'Dálie', 2),
  ('vres', 'umele-kvety', 'Vres', 3),
  ('eukalyptus', 'umele-kvety', 'Eukalyptus', 4),
  ('paprad', 'umele-kvety', 'Papraď', 5),
  ('zelen', 'umele-kvety', 'Zeleň / výplň', 6),
  ('ostatne', 'umele-kvety', 'Ostatné', 7),
  ('hortenzia', 'umele-kvety', 'Hortenzia', 8),
  ('bahniatka', 'umele-kvety', 'Bahniatka', 9),
  ('narcis', 'umele-kvety', 'Narcis', 10),
  ('georgina', 'umele-kvety', 'Georgína', 11),
  ('iskernik', 'umele-kvety', 'Iskerník', 12),
  ('orchidea', 'umele-kvety', 'Orchidea', 13),
  ('klincek', 'umele-kvety', 'Klinček', 14),
  ('gypsofilka', 'umele-kvety', 'Gypsofilka', 15),
  ('monstera', 'umele-kvety', 'Monstera', 16),
  ('vinic', 'umele-kvety', 'Vinič', 17),
  ('haluzka', 'umele-kvety', 'Halúzka', 18),
  ('drobnokvet', 'umele-kvety', 'Drobnokvet', 19),
  ('vetva', 'umele-kvety', 'Vetva', 20),
  ('tuja', 'umele-kvety', 'Tuja', 21),
  ('ruskus', 'umele-kvety', 'Ruskus', 22),
  ('bobule', 'umele-kvety', 'Bobule', 23),
  ('gladiola', 'umele-kvety', 'Gladiola', 24),
  ('amarant', 'umele-kvety', 'Amarant', 25),
  ('skimmia', 'umele-kvety', 'Skimmia', 26),
  ('magnolia', 'umele-kvety', 'Magnólia', 27),
  ('fiala', 'umele-kvety', 'Fiala', 28),
  ('hyacint', 'umele-kvety', 'Hyacint', 29),
  ('rebricek', 'umele-kvety', 'Rebríček', 30),
  ('voskovka', 'umele-kvety', 'Voskovka', 31),
  ('chryzantema', 'umele-kvety', 'Chryzantéma', 32),
  ('krasnoocko', 'umele-kvety', 'Krásnoočko', 33),
  ('ginkgo', 'umele-kvety', 'Ginkgo', 34),
  ('pompony', 'umele-kvety', 'Pompony', 35);
