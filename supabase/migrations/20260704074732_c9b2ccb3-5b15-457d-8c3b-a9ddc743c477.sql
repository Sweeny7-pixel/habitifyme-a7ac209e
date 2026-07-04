WITH anchors AS (
  SELECT
    user_id,
    MIN(week_number) FILTER (WHERE status <> 'completed') AS min_wn,
    MIN(start_date)  FILTER (WHERE status <> 'completed') AS anchor_date
  FROM public.weeks
  WHERE status <> 'completed'
  GROUP BY user_id
)
UPDATE public.weeks w
SET start_date = (a.anchor_date + ((w.week_number - a.min_wn) * 7))::date
FROM anchors a
WHERE w.user_id = a.user_id
  AND w.status <> 'completed'
  AND a.anchor_date IS NOT NULL;

UPDATE public.workout_days wd
SET workout_date = (w.start_date + (wd.day_index - 1))::date
FROM public.weeks w
WHERE wd.week_id = w.id
  AND w.status <> 'completed';