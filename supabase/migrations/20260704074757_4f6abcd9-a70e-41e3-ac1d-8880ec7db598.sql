WITH completed_last AS (
  SELECT user_id, MAX(start_date) AS last_completed_start
  FROM public.weeks
  WHERE status = 'completed'
  GROUP BY user_id
),
upcoming_first AS (
  SELECT user_id,
         MIN(week_number) AS min_wn,
         MIN(start_date)  AS min_start
  FROM public.weeks
  WHERE status <> 'completed'
  GROUP BY user_id
),
anchors AS (
  SELECT
    u.user_id,
    u.min_wn,
    CASE
      WHEN c.last_completed_start IS NOT NULL
        THEN (c.last_completed_start + 7)
      ELSE u.min_start
    END AS anchor_date
  FROM upcoming_first u
  LEFT JOIN completed_last c ON c.user_id = u.user_id
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