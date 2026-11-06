// This projection follows the HOSxP query supplied by the hospital. It includes
// identifiable and clinical data and must only be used by authorized server code.
export const operationsForDaySql = `
SELECT
  o.*,
  oi.bw,
  CONCAT(pt.pname, pt.fname, '  ', pt.lname) AS ptname,
  s.status_name,
  e.emergency_name,
  r.room_name,
  i.NAME AS provision_name,
  d.NAME AS request_doctor_name,
  w.NAME AS ward_name,
  sp.NAME AS spclty_name,
  ot.NAME AS operation_type_name,
  otn.operation_time_type_name,
  IF(o.patient_department = 'OPD', py1.NAME, py2.NAME) AS pttype_name,
  IF(o.patient_department = 'OPD', vns.paid_money, ans.paid_money) AS paid_money,
  IF(o.patient_department = 'OPD', vns.uc_money, ans.uc_money) AS uc_money,
  IF(o.patient_department = 'OPD', vns.rcpt_money, ans.rcpt_money) AS rcpt_money
FROM operation_list o
  LEFT JOIN patient pt ON pt.hn = o.hn
  LEFT JOIN operation_status s ON s.status_id = o.status_id
  LEFT JOIN operation_emergency e ON e.emergency_id = o.emergency_id
  LEFT JOIN operation_room r ON r.room_id = o.room_id
  LEFT JOIN operation_screen_in oi ON oi.operation_id = o.operation_id
  LEFT JOIN icd101 i ON i.CODE = SUBSTRING(o.provision_diagnosis, 1, 3)
  LEFT JOIN doctor d ON d.CODE = o.request_doctor
  LEFT JOIN ipt t ON t.an = o.an
  LEFT JOIN ward w ON w.ward = t.ward
  LEFT JOIN spclty sp ON sp.spclty = o.spclty
  LEFT JOIN operation_type ot ON ot.operation_type_id = o.operation_type_id
  LEFT JOIN operation_time_type otn ON otn.operation_time_type_id = o.operation_time_type_id
  LEFT JOIN vn_stat vns ON vns.vn = o.vn
  LEFT JOIN pttype py1 ON py1.pttype = vns.pttype
  LEFT JOIN an_stat ans ON ans.an = o.an
  LEFT JOIN pttype py2 ON py2.pttype = ans.pttype
WHERE o.request_operation_date >= ? AND o.request_operation_date < ?
ORDER BY o.operation_id`;
