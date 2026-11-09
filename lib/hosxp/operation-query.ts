// This projection follows the HOSxP query supplied by the hospital. It includes
// identifiable and clinical data and must only be used by authorized server code.
export const operationsForDaySql = `
SELECT
  o.operation_id,
  o.spclty,
  o.room_id,
  o.hn,
  o.request_operation_date,
  o.age_text,
  od.operation_started_at,
  od.operation_ended_at,
  od.wound_names,
  CONCAT(pt.pname, pt.fname, '  ', pt.lname) AS ptname,
  s.status_name,
  e.emergency_name,
  w.NAME AS ward_name,
  sp.NAME AS department_name,
  r.room_name
FROM operation_list o
  LEFT JOIN patient pt ON pt.hn = o.hn
  LEFT JOIN operation_status s ON s.status_id = o.status_id
  LEFT JOIN operation_emergency e ON e.emergency_id = o.emergency_id
  LEFT JOIN operation_room r ON r.room_id = o.room_id
  LEFT JOIN (SELECT an, MIN(ward) AS ward FROM ipt GROUP BY an) t ON t.an = o.an
  LEFT JOIN ward w ON w.ward = t.ward
  LEFT JOIN spclty sp ON sp.spclty = o.spclty
  LEFT JOIN (
    SELECT operation_id,
      MIN(begin_datetime) AS operation_started_at,
      MAX(end_datetime) AS operation_ended_at,
      GROUP_CONCAT(DISTINCT NULLIF(TRIM(ow.operation_wound_name), '') ORDER BY ow.operation_wound_name SEPARATOR ', ') AS wound_names
    FROM operation_detail od
      LEFT JOIN operation_wound ow ON ow.operation_wound_id = od.operation_wound_id
    GROUP BY od.operation_id
  ) od ON od.operation_id = o.operation_id
WHERE o.request_operation_date >= ? AND o.request_operation_date < ?
ORDER BY o.request_operation_date ASC, o.operation_id DESC`;

// Aggregate report projection: only operation metadata is returned, never patient identifiers or diagnoses.
export const operationAnalyticsForRangeSql = `
SELECT
  o.operation_id,
  o.room_id,
  o.request_operation_date,
  e.emergency_name,
  s.status_name,
  w.NAME AS ward_name,
  oi.NAME AS operation_item_name,
  detail.operation_started_at,
  detail.operation_ended_at
FROM operation_list o
  LEFT JOIN operation_status s ON s.status_id = o.status_id
  LEFT JOIN operation_emergency e ON e.emergency_id = o.emergency_id
  LEFT JOIN (SELECT an, MIN(ward) AS ward FROM ipt GROUP BY an) t ON t.an = o.an
  LEFT JOIN ward w ON w.ward = t.ward
  LEFT JOIN (
    SELECT operation_id,
      MIN(begin_datetime) AS operation_started_at,
      MAX(end_datetime) AS operation_ended_at
    FROM operation_detail GROUP BY operation_id
  ) detail ON detail.operation_id = o.operation_id
  LEFT JOIN operation_detail d ON d.operation_id = o.operation_id
  LEFT JOIN operation_item oi ON oi.operation_item_id = d.operation_item_id
WHERE o.request_operation_date >= ? AND o.request_operation_date < ?
ORDER BY o.request_operation_date, o.operation_id, d.operation_detail_id`;
