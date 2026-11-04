begin;

update public.shelter_forge_swords set sharpness_bonus=0 where sharpness_bonus<>0;
update public.shelter_forge_best b set appraisal=(select v.appraisal from public.forge_level_value(b.sword_level)v);
update public.shelter_forge_graveyard g set appraisal=(select v.appraisal from public.forge_level_value(g.sword_level)v);
update public.publications p
set meta=jsonb_set(
  p.meta,
  '{appraisal}',
  to_jsonb((select v.appraisal from public.forge_level_value((p.meta->>'sword_level')::int)v)),
  true
),updated_at=now()
where p.source_type='forge'
  and p.meta?'sword_level'
  and (p.meta->>'sword_level')~'^[0-9]+$'
  and (p.meta->>'sword_level')::int between 0 and 30;

commit;
